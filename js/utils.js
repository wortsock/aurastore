// Helpers (S-08)
window.Aura = window.Aura || {};
Aura.formatNaira = n => '₦' + Number(n).toLocaleString('en-NG');
Aura.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
Aura.qs = k => new URLSearchParams(location.search).get(k);
Aura.debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
Aura.formatDate = d => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
