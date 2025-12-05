/**
 * locationAccessControl.js
 * 
 * Handles user profile loading and location-based access control (RBAC)
 * for EPHIS modules.
 */

/**
 * Fetches the current authenticated user's profile with location settings.
 * @param {SupabaseClient} supabase - The supabase client instance
 * @returns {Promise<Object>} The user profile object or null
 */
export async function getCurrentUserProfile(supabase) {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return null;

        // Fetch profile data which contains the RBAC rules
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.warn('Error fetching user profile:', error);
            // Fallback object to prevent crashes, but access will be limited by RLS anyway
            return {
                id: user.id,
                role: user.user_metadata?.role || 'user',
                email: user.email,
                ...user.user_metadata
            };
        }

        return profile;
    } catch (err) {
        console.error('Unexpected error in getCurrentUserProfile:', err);
        return null;
    }
}

/**
 * Generates a human-readable description of the user's location filter.
 * @param {Object} profile - The user profile object
 * @returns {string} Description text (e.g., "Kiambu County", "Kilimani Ward")
 */
export function getLocationFilterDescription(profile) {
    if (!profile) return 'Guest';

    if (profile.role === 'admin') return 'All Locations (Admin)';
    if (profile.role === 'supervisor') return 'All Locations (Supervisor)';

    // Prioritize specific jurisdiction levels
    if (profile.ward) {
        return `${profile.ward} Ward`;
    }

    if (profile.sub_county) {
        return `${profile.sub_county} Sub-County`;
    }

    if (profile.county) {
        return `${profile.county} County`;
    }

    // Check for custom array access
    if (profile.allowed_wards && profile.allowed_wards.length > 0) {
        return `${profile.allowed_wards.length} Ward(s) Access`;
    }

    if (profile.allowed_subcounties && profile.allowed_subcounties.length > 0) {
        return `${profile.allowed_subcounties.length} Sub-County(s) Access`;
    }

    return 'All Locations';
}

/**
 * Applies location-based filters to a Supabase query based on the user's profile.
 * @param {SupabaseQueryBuilder} query - The existing query object
 * @param {Object} profile - The user profile object
 * @returns {SupabaseQueryBuilder} The modified query object
 */
export function applyLocationFilters(query, profile) {
    if (!profile) return query; // Fail safe

    // 1. Admin / High-level roles see everything
    if (['admin', 'supervisor', 'director'].includes(profile.role)) {
        return query;
    }

    // 2. Strict Jurisdiction Hierarchy
    // If specific Ward is assigned, strict filter (case-insensitive)
    if (profile.ward) {
        return query.ilike('ward', profile.ward);
    }

    // If specific Sub-county is assigned (case-insensitive)
    if (profile.sub_county) {
        return query.ilike('sub_county', profile.sub_county);
    }

    // If specific County is assigned (case-insensitive)
    if (profile.county) {
        return query.ilike('county', profile.county);
    }

    // 3. Flexible/Multi-jurisdiction Access
    // If no strict single jurisdiction, check for allowed lists

    if (profile.allowed_wards && profile.allowed_wards.length > 0) {
        const wards = profile.allowed_wards;
        return query.in('ward', wards);
    }

    if (profile.allowed_subcounties && profile.allowed_subcounties.length > 0) {
        const subCounties = profile.allowed_subcounties;
        return query.in('sub_county', subCounties);
    }

    // 4. Default Fallback
    // If regular user has no geo-restrictions defined, they might see nothing or everything 
    // depending on business rules. Safe default for "Officer" is usually restrictive if no location set.
    if (profile.role === 'officer' || profile.role === 'inspector') {
        // If an officer has NO location data, maybe return empty or warn. 
        // consistently with strict security:
        console.warn('Officer has no location assigned. Restricting view.');
        return query.eq('id', '00000000-0000-0000-0000-000000000000'); // Return nothing
    }

    return query;
}
