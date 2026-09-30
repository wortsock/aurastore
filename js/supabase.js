// Single shared Supabase client (S-09). Needs config.js and the Supabase CDN script loaded first.
window.auraDb = window.supabase.createClient(AURA_CONFIG.SUPABASE_URL, AURA_CONFIG.SUPABASE_ANON_KEY);
