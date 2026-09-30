// AuraStore configuration (ticket S-09)
// Safe to publish: the publishable key is designed for browsers and is
// protected by the row-level security rules in schema.sql.
// NEVER put a secret key, service role key, Mailgun key or Google secret here.

window.AURA_CONFIG = {
  SUPABASE_URL: 'https://byhzdpatrtdifkywqcfy.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_ChmUaCSg5d_fzwzH1oUKPg_Dn695V_B',

  // Delivery rule (must match the place_order function in schema.sql)
  DELIVERY_FEE: 2500,
  FREE_DELIVERY_THRESHOLD: 100000,

  // Builds a full address for a page, correct locally and on GitHub Pages
  // e.g. AURA_CONFIG.pageUrl('auth-callback.html')
  pageUrl: function (file) {
    return new URL(file, window.location.href).href;
  }
};
