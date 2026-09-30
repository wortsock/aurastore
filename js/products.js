// Product data and card (S-05)
Aura.products = {
  map: {},
  FIELDS: 'id,slug,name,brand,price,old_price,stock_qty,rating_avg,rating_count,badge,image_urls,is_featured',
  remember(list) { list.forEach(p => this.map[p.id] = p); return list; },
  async featured(n = 8) {
    const { data, error } = await auraDb.from('products').select(this.FIELDS).eq('is_featured', true).order('rating_count', { ascending: false }).limit(n);
    if (error) throw error; return this.remember(data);
  },
  async deals(n = 4) {
    const { data, error } = await auraDb.from('products').select(this.FIELDS).not('old_price', 'is', null);
    if (error) throw error;
    const off = p => 1 - p.price / p.old_price;
    return this.remember(data.sort((a, b) => off(b) - off(a)).slice(0, n));
  },
  async categories() {
    const { data, error } = await auraDb.from('categories').select('*').order('sort_order');
    if (error) throw error; return data;
  },
  card(p) {
    const e = Aura.esc, out = p.stock_qty < 1;
    const off = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
    const stars = Math.round(p.rating_avg);
    return `<article class="card"><a class="card-link" href="product.html?slug=${encodeURIComponent(p.slug)}">
      <div class="thumb"><img src="${e(p.image_urls[0])}" alt="${e(p.name)}" loading="lazy">
      ${p.badge ? `<span class="tag">${e(p.badge)}</span>` : ''}${off ? `<span class="tag off">-${off}%</span>` : ''}</div>
      <div class="info"><div class="brandline">${e(p.brand)}</div><div class="name">${e(p.name)}</div>
      <div class="price">${Aura.formatNaira(p.price)}${p.old_price ? `<span class="old">${Aura.formatNaira(p.old_price)}</span>` : ''}</div>
      <div class="rate" aria-label="Rated ${p.rating_avg} out of 5">${'★'.repeat(stars)}<i>${'★'.repeat(5 - stars)}</i> <i>(${p.rating_count})</i></div>
      ${out ? '<div class="stock-out">Out of stock</div>' : ''}</div></a>
      <button class="btn add-btn" data-id="${p.id}" ${out ? 'disabled' : ''}>${out ? 'Out of stock' : 'Add to cart'}</button></article>`;
  },
  skeletons: n => Array(n).fill('<div class="sk"></div>').join('')
};
