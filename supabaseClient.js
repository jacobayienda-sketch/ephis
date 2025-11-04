const SUPABASE_URL = "https://bjrftqdenzencvranxvz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcmZ0cWRlbnplbmN2cmFueHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mjc1MDMsImV4cCI6MjA3NzUwMzUwM30.W6GYm0urE7Y0NjeaT-NArnjSwWCVzci6nRs6mGIDAww";

// Create a supabase client robustly in browser environments:
// - If the CDN script provides a global `supabase` with createClient, use it.
// - Otherwise dynamically import the ESM module from the CDN and create the client.
// Note: this file is intended to be imported as a module in <script type="module"> so
// top-level await is supported in modern browsers.
// Ensure a single shared client instance on window to avoid multiple clients
let supabase;
if (typeof window !== 'undefined') {
	// Reuse an existing client if created earlier by any script
	if (window.__EPHIS_SUPABASE_CLIENT && typeof window.__EPHIS_SUPABASE_CLIENT.auth?.getSession === 'function') {
		supabase = window.__EPHIS_SUPABASE_CLIENT;
	} else if (window.supabase && typeof window.supabase.createClient === 'function') {
		// If a global UMD bundle created a factory, create a client and store it
		supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
		window.__EPHIS_SUPABASE_CLIENT = supabase;
	} else {
		// Fallback: dynamically import the ESM bundle and create the client
		const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
		supabase = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
		window.__EPHIS_SUPABASE_CLIENT = supabase;
	}
} else {
	// Non-browser environments: dynamic import and create client
	const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
	supabase = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export { supabase };