// Cart module (S-11): localStorage for guests, cart_items table when signed in. Merge rule D-6.
(function () {
  const KEY = 'aura_cart_v1'; let items = [], user = null; const subs = [], cache = {};
  const rl = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const wl = a => { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} };
  const emit = () => subs.forEach(f => f());
  async function load(ids) {
    const miss = ids.filter(i => !cache[i]);
    if (miss.length) {
      const { data, error } = await auraDb.from('products').select('id,slug,name,price,stock_qty,image_urls').in('id', miss);
      if (error) throw error; data.forEach(p => cache[p.id] = p);
    }
    return ids.map(i => cache[i]).filter(Boolean);
  }
  async function save() {
    if (!user) { wl(items); return true; }
    try {
      const ids = items.map(i => i.id);
      let q = auraDb.from('cart_items').delete().eq('user_id', user.id);
      if (ids.length) q = q.not('product_id', 'in', '(' + ids.join(',') + ')');
      let r = await q; if (r.error) throw r.error;
      if (items.length) { r = await auraDb.from('cart_items').upsert(items.map(i => ({ user_id: user.id, product_id: i.id, quantity: i.qty, updated_at: new Date().toISOString() }))); if (r.error) throw r.error; }
      return true;
    } catch (e) { console.error('cart save failed', e); return false; }
  }
  async function mergeGuestCart() {
    const local = rl();
    const { data } = await auraDb.from('cart_items').select('product_id,quantity').eq('user_id', user.id);
    const m = new Map((data || []).map(r => [r.product_id, r.quantity]));
    local.forEach(l => m.set(l.id, (m.get(l.id) || 0) + l.qty));
    const ps = await load([...m.keys()]);
    items = ps.filter(p => p.stock_qty > 0).map(p => ({ id: p.id, qty: Math.min(m.get(p.id), p.stock_qty) }));
    if (await save() && local.length) wl([]);   // clear local copy only after the database write worked
  }
  window.Aura.cart = {
    subscribe: f => subs.push(f),
    count: () => items.reduce((s, i) => s + i.qty, 0),
    async getItems() { const ps = await load(items.map(i => i.id)); return items.map(i => ({ product: cache[i.id], quantity: i.qty })).filter(x => x.product); },
    async add(p, n = 1) {
      if (p.stock_qty < 1) return { ok: false };
      cache[p.id] = Object.assign(cache[p.id] || {}, p);
      const cur = items.find(i => i.id === p.id), want = (cur ? cur.qty : 0) + n, qty = Math.min(want, p.stock_qty);
      cur ? cur.qty = qty : items.push({ id: p.id, qty }); emit(); await save();
      return { ok: true, capped: qty < want };
    },
    async setQty(id, q) { const i = items.find(x => x.id === id), p = cache[id]; if (!i || !p) return; i.qty = Math.max(1, Math.min(q, p.stock_qty)); emit(); await save(); },
    async remove(id) { items = items.filter(i => i.id !== id); emit(); await save(); },
    async clear() { items = []; emit(); await save(); },
    mergeGuestCart
  };
  Aura.auth.onChange(async (event, session) => {
    if (session && session.user) {
      if (!user || user.id !== session.user.id) { user = session.user; try { await mergeGuestCart(); } catch (e) { console.error(e); } emit(); }
    } else { user = null; items = event === 'SIGNED_OUT' ? [] : rl(); if (event === 'SIGNED_OUT') wl([]); emit(); }
  });
  items = rl();
})();
