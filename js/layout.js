// Shared header, footer, cart drawer and toasts (S-02, S-03, S-04, S-06, S-07)
(function () {
  const e = Aura.esc, page = document.body.dataset.page || '';
  const link = (href, label, key) => `<a href="${href}" class="${page === key ? 'active' : ''}" ${page === key ? 'aria-current="page"' : ''}>${label}</a>`;
  document.getElementById('site-header').innerHTML = `<header class="site-header"><div class="wrap bar">
    <a class="brand" href="index.html"><i data-lucide="zap"></i>AuraStore</a>
    <nav class="nav" id="nav" aria-label="Main">${link('index.html', 'Home', 'home')}${link('shop.html', 'Catalog', 'shop')}<a href="orders.html" id="orders-link" class="${page === 'orders' ? 'active' : ''}">Orders</a></nav>
    <form class="search" action="shop.html" role="search"><i data-lucide="search"></i><input name="q" type="search" placeholder="Search products, brands..." aria-label="Search products"></form>
    <div class="acct" id="acct"></div>
    <button class="icon-btn" id="cart-btn" aria-label="Open cart"><i data-lucide="shopping-cart"></i><span class="badge-count" id="cart-count">0</span></button>
    <button class="icon-btn burger" id="burger" aria-label="Menu" aria-expanded="false"><i data-lucide="menu"></i></button></div></header>
    <div class="overlay" id="overlay"></div>
    <aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="Your cart"><div class="d-head"><h2>Your cart</h2><button class="icon-btn" id="d-close" aria-label="Close cart"><i data-lucide="x"></i></button></div><div class="d-body" id="d-body"></div><div class="d-foot" id="d-foot"></div></aside>
    <div id="toasts" aria-live="polite"></div>`;
  document.getElementById('site-footer').innerHTML = `<footer class="foot"><div class="wrap"><div><strong>AuraStore</strong><br>Delivery across Nigeria. Pay when your order arrives.</div><nav><a href="index.html">Home</a><a href="shop.html">Catalog</a><a href="orders.html">Orders</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a></nav><div>&copy; 2026 AuraStore</div></div></footer>`;
  const $ = id => document.getElementById(id), icons = () => window.lucide && lucide.createIcons();

  Aura.toast = (msg, type) => {
    const t = document.createElement('div'); t.className = 'toast ' + (type === 'err' ? 'err' : ''); t.textContent = msg; $('toasts').appendChild(t); setTimeout(() => t.remove(), 3000);
  };
  // mobile menu
  $('burger').onclick = () => { const o = $('nav').classList.toggle('open'); document.querySelector('.search').classList.toggle('open', o); $('burger').setAttribute('aria-expanded', o); };
  // account area
  let signedIn = false;
  function renderAcct(session) {
    signedIn = !!session; const u = session && session.user, box = $('acct');
    if (!u) { box.innerHTML = `<a class="btn ghost" href="login.html" id="signin"><i data-lucide="log-in"></i><span>Sign in</span></a>`; icons(); return; }
    const m = u.user_metadata || {}, first = (m.full_name || m.name || u.email || 'Account').split(' ')[0];
    box.innerHTML = `<button class="acct-btn" id="acct-btn" aria-haspopup="true" aria-expanded="false">${m.avatar_url ? `<img src="${e(m.avatar_url)}" alt="">` : '<i data-lucide="user"></i>'}<span>${e(first)}</span></button>
      <div class="menu" id="menu" hidden><a href="orders.html">My orders</a><button id="signout">Sign out</button></div>`;
    $('acct-btn').onclick = () => { const h = $('menu').hidden = !$('menu').hidden; $('acct-btn').setAttribute('aria-expanded', !h); };
    $('signout').onclick = async () => { await Aura.auth.signOut(); location.href = 'index.html'; };
    icons();
  }
  Aura.auth.getSession().then(renderAcct); Aura.auth.onChange((ev, s) => renderAcct(s));
  document.addEventListener('click', ev => { const m = $('menu'); if (m && !ev.target.closest('#acct')) m.hidden = true; });
  $('orders-link').onclick = ev => { if (!signedIn) { ev.preventDefault(); sessionStorage.setItem('aura_return', 'orders.html'); location.href = 'login.html'; } };
  // cart drawer
  const drawer = $('drawer'); let opener;
  async function renderDrawer() {
    let rows = []; try { rows = await Aura.cart.getItems(); } catch (x) { $('d-body').innerHTML = '<p>Could not load your cart.</p>'; return; }
    if (!rows.length) { $('d-body').innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px 0">Your cart is empty.</p>'; $('d-foot').innerHTML = '<a class="btn" href="shop.html">Start shopping</a>'; return; }
    $('d-body').innerHTML = rows.map(({ product: p, quantity: q }) => `<div class="line"><img src="${e(p.image_urls[0])}" alt=""><div><div>${e(p.name)}</div><div style="color:var(--muted)">${Aura.formatNaira(p.price)}</div>
      <div class="qty"><button data-q="${p.id}" data-d="-1" aria-label="Decrease">-</button><span>${q}</span><button data-q="${p.id}" data-d="1" aria-label="Increase">+</button></div></div>
      <button class="icon-btn" data-rm="${p.id}" aria-label="Remove ${e(p.name)}"><i data-lucide="trash-2"></i></button></div>`).join('');
    const sub = rows.reduce((s, r) => s + r.product.price * r.quantity, 0);
    $('d-foot').innerHTML = `<div class="sub"><span>Subtotal</span><span>${Aura.formatNaira(sub)}</span></div><a class="btn ghost" href="cart.html">View cart</a><a class="btn" href="checkout.html">Checkout</a>`; icons();
  }
  function openCart() { opener = document.activeElement; renderDrawer(); drawer.classList.add('on'); $('overlay').classList.add('on'); $('d-close').focus(); }
  function closeCart() { drawer.classList.remove('on'); $('overlay').classList.remove('on'); opener && opener.focus(); }
  Aura.openCart = openCart;
  $('cart-btn').onclick = openCart; $('d-close').onclick = closeCart; $('overlay').onclick = closeCart;
  document.addEventListener('keydown', ev => {
    if (!drawer.classList.contains('on')) return;
    if (ev.key === 'Escape') closeCart();
    if (ev.key === 'Tab') { const f = [...drawer.querySelectorAll('a,button')]; const a = f[0], z = f[f.length - 1]; if (ev.shiftKey && document.activeElement === a) { ev.preventDefault(); z.focus(); } else if (!ev.shiftKey && document.activeElement === z) { ev.preventDefault(); a.focus(); } }
  });
drawer.addEventListener('click', async ev => {
    const co = ev.target.closest('a[href="checkout.html"]');
    if (co && !signedIn) { ev.preventDefault(); sessionStorage.setItem('aura_return', 'checkout.html'); sessionStorage.setItem('aura_login_reason', 'checkout'); location.href = 'login.html'; return; }
    const q = ev.target.closest('[data-q]'), r = ev.target.closest('[data-rm]');
    if (q) { const it = (await Aura.cart.getItems()).find(x => x.product.id == q.dataset.q); await Aura.cart.setQty(+q.dataset.q, it.quantity + +q.dataset.d); }
    if (r) await Aura.cart.remove(+r.dataset.rm);
  });
  Aura.cart.subscribe(() => { $('cart-count').textContent = Aura.cart.count(); if (drawer.classList.contains('on')) renderDrawer(); });
  $('cart-count').textContent = Aura.cart.count();
  // "Add to cart" buttons on any product card
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('.add-btn'); if (!b) return;
    const p = Aura.products.map[b.dataset.id]; if (!p) return;
    const r = await Aura.cart.add(p);
    r.ok ? Aura.toast(r.capped ? 'Only ' + p.stock_qty + ' in stock. Cart updated.' : 'Added to cart') : Aura.toast('Out of stock', 'err');
  });
  icons();
})();
