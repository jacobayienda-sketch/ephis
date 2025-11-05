-- Adds tsvector column + trigger, GIN indexes, a RPC for paginated full-text search, and example RLS policies.

BEGIN;

-- 0) Ensure extensions (pg_trgm optional/recommended)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) Add a tsvector column to store precomputed search vectors
ALTER TABLE IF EXISTS premises
  ADD COLUMN IF NOT EXISTS premises_search tsvector;

-- 2) Populate existing rows' tsvector
UPDATE premises SET premises_search =
  setweight(to_tsvector('english', coalesce(premise_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(premise_type, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(owner_name, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(sub_county, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(ward, '')), 'C');

-- 3) Trigger function to maintain premises_search automatically
CREATE OR REPLACE FUNCTION public.premises_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.premises_search :=
    setweight(to_tsvector('english', coalesce(NEW.premise_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.premise_type, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.owner_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.sub_county, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.ward, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS premises_tsv_update ON premises;
CREATE TRIGGER premises_tsv_update
BEFORE INSERT OR UPDATE ON premises
FOR EACH ROW EXECUTE FUNCTION public.premises_search_trigger();

-- 4) Create indexes for performance
CREATE INDEX IF NOT EXISTS premises_search_idx ON premises USING GIN (premises_search);
-- trigram indexes to speed up any fallback ilike queries (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_premise_name_trgm ON premises USING gin (premise_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_premise_owner_trgm ON premises USING gin (owner_name gin_trgm_ops);

-- B-tree indexes for filters/sort
CREATE INDEX IF NOT EXISTS idx_premises_sub_county ON premises (sub_county);
CREATE INDEX IF NOT EXISTS idx_premises_ward ON premises (ward);
CREATE INDEX IF NOT EXISTS idx_premises_status ON premises (status);
CREATE INDEX IF NOT EXISTS idx_premises_license_expiry ON premises (license_expiry);

-- 5) Create RPC to perform paginated full-text search.
-- This RPC returns a JSON object: { items: [ ..rows.. ], total: n }
-- The RPC uses parameterized queries so it can be called safely from the client.
CREATE OR REPLACE FUNCTION public.search_premises(
  _q text,
  _sub_county text,
  _status text,
  _expiry timestamptz,
  _limit int,
  _offset int
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _items jsonb;
  _total bigint := 0;
BEGIN
  -- Count total matching rows (RLS applies for the calling user).
  EXECUTE format($f$
    SELECT count(*) FROM premises p
    WHERE
      ( ($1 IS NULL) OR (p.premises_search @@ plainto_tsquery('english', $1)) )
      AND ( ($2 IS NULL) OR (p.sub_county = $2) )
      AND ( ($3 IS NULL) OR (p.status = $3) )
      AND ( ($4 IS NULL) OR (p.license_expiry <= $4) )
  $f$)
  USING _q, _sub_county, _status, _expiry
  INTO _total;

  -- Retrieve the page of items
  EXECUTE format($f$
    SELECT jsonb_agg(row_to_json(p)) FROM (
      SELECT
        id,
        premise_name,
        premise_type,
        owner_name,
        contact_phone,
        sub_county,
        ward,
        status,
        license_expiry,
        remarks,
        latitude,
        longitude
      FROM premises p
      WHERE
        ( ($1 IS NULL) OR (p.premises_search @@ plainto_tsquery('english', $1)) )
        AND ( ($2 IS NULL) OR (p.sub_county = $2) )
        AND ( ($3 IS NULL) OR (p.status = $3) )
        AND ( ($4 IS NULL) OR (p.license_expiry <= $4) )
      ORDER BY p.license_expiry DESC
      LIMIT COALESCE($5, 25)
      OFFSET COALESCE($6, 0)
    ) p;
  $f$)
  USING _q, _sub_county, _status, _expiry, _limit, _offset
  INTO _items;

  RETURN jsonb_build_object('items', coalesce(_items, '[]'::jsonb), 'total', coalesce(_total, 0));
END;
$$;

-- 6) Example profiles table (if you don't already have one). Adjust to match your auth users.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,            -- should correspond to auth.uid()
  role text,
  is_admin boolean DEFAULT false,
  sub_county text,
  ward text,
  allowed_subcounties text[],     -- optional array of permitted sub-counties
  allowed_wards text[],           -- optional array of permitted wards
  created_at timestamptz DEFAULT now()
);

-- 7) Row Level Security (RLS) - enable and add policies that enforce profile-based scoping
ALTER TABLE premises ENABLE ROW LEVEL SECURITY;

-- Policy: allow admins (profiles.is_admin = true OR role = 'admin') and
-- allow officers limited to rows matching their allowed_* arrays or their profile ward/sub_county.
CREATE POLICY select_premises_by_profile ON premises
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
      AND (
        p.is_admin = true
        OR p.role = 'admin'
        OR (p.allowed_wards IS NOT NULL AND premises.ward = ANY (p.allowed_wards))
        OR (p.allowed_subcounties IS NOT NULL AND premises.sub_county = ANY (p.allowed_subcounties))
        OR (p.ward IS NOT NULL AND premises.ward = p.ward)
        OR (p.sub_county IS NOT NULL AND premises.sub_county = p.sub_county)
      )
  )
);

-- (Optional) Allow users who created the row to always see/edit their own rows
CREATE POLICY own_rows_full_access ON premises
FOR ALL
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

COMMIT;