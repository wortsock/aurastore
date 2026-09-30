// Auth module (S-10)
Aura.auth = {
  async getSession() { const { data } = await auraDb.auth.getSession(); return data.session; },
  async signInWithGoogle(returnTo) {
    if (returnTo) sessionStorage.setItem('aura_return', returnTo);
    await auraDb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: AURA_CONFIG.pageUrl('auth-callback.html') } });
  },
  async signOut() { await auraDb.auth.signOut(); },
  onChange(fn) { return auraDb.auth.onAuthStateChange((event, session) => { setTimeout(() => fn(event, session), 0); }); },
  async requireAuth() {
    const s = await this.getSession();
    if (!s) { sessionStorage.setItem('aura_return', location.pathname.split('/').pop() + location.search); location.href = AURA_CONFIG.pageUrl('login.html'); }
    return s;
  }
};
