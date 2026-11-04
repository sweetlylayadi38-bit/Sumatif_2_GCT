const zoom = document.getElementById('zoom'), big = zoom.firstElementChild;
const zcap = zoom.querySelector('.zcap'), znav = zoom.querySelector('.znav');

// Jawaban disimpan per id soal, jadi tetap ada setelah halaman dimuat ulang
const store = (() => { try { return JSON.parse(localStorage.getItem('jawaban')) || {}; } catch { return {}; } })();
const keep = () => { try { localStorage.setItem('jawaban', JSON.stringify(store)); } catch {} };
const answer = op => {  // hijau bila benar; bila salah, pilihan itu merah dan kuncinya hijau
  const q = op.closest('.q');
  op.classList.add(op.hasAttribute('data-ok') ? 'benar' : 'salah');
  q.querySelector('.op[data-ok]').classList.add('benar');
  q.querySelectorAll('.op').forEach(o => o.disabled = true);
  q.querySelector('details').open = true;
  q.classList.add('dijawab');
};
for (const [id, i] of Object.entries(store)) { const op = document.getElementById(id)?.querySelectorAll('.op')[i]; if (op) answer(op); }

document.addEventListener('click', e => {
  if (e.target.closest('dialog')) {
    const soal = e.target.closest('.zsoal');
    if (soal) {  // tutup layar slide dan tampilkan daftar soal slide itu, tanpa membuka slidenya lagi
      e.preventDefault();
      history.replaceState({pos: {id: soal.hash.slice(1), off: pad()}}, '', soal.hash);
      zoom.close(); go(soal.hash.slice(1));
    } else if (!e.target.closest('.znav')) zoom.close();
    return;
  }
  const all = e.target.closest('.openall');
  if (all) {  // buka atau tutup semua jawaban di tahun itu
    const open = all.textContent.startsWith('Buka');
    all.closest('.lec').querySelectorAll('.q > details').forEach(d => d.open = open);  // contoh soal di dalamnya tetap tertutup
    all.textContent = (open ? 'Tutup' : 'Buka') + ' semua jawaban';
    return;
  }
  const op = e.target.closest('.op');
  if (op) {
    answer(op);
    const q = op.closest('.q'); store[q.id] = [...q.querySelectorAll('.op')].indexOf(op); keep();
    return;
  }
  // reset satu soal, atau semua soal di halaman
  const one = e.target.closest('.reset'), every = e.target.closest('.resetall');
  if (one || every) {
    const qs = one ? [one.closest('.q')] : document.querySelectorAll('.q.dijawab');
    if (qs.length > 1 && !confirm(`Reset ${qs.length} jawaban?`)) return;
    qs.forEach(q => {
      q.classList.remove('dijawab');
      q.querySelectorAll('.op').forEach(o => { o.disabled = false; o.classList.remove('benar', 'salah'); });
      q.querySelectorAll('.pilih').forEach(li => li.classList.remove('pilih'));
      q.querySelector('details').open = false;
      delete store[q.id];
    });
    keep();
    if (every) {  // kembali ke keadaan awal: jawaban yang dibuka lewat "Buka semua" ikut tertutup
      document.querySelectorAll('.soal details[open]').forEach(d => d.open = false);
      document.querySelectorAll('.openall').forEach(b => b.textContent = 'Buka semua jawaban');
    }
    return;
  }
  const img = e.target.closest('figure img');  // gambar biasa: tanpa keterangan dan navigasi
  if (img) { big.src = img.src; big.alt = img.alt; zcap.hidden = znav.hidden = true; push({dlg: 'img'}); zoom.showModal(); }
});

const keys = document.getElementById('keys');
const syncKeys = () => document.body.classList.toggle('keys', keys.checked);
keys.onchange = syncKeys; syncKeys();

// tandai kuliah yang sedang dibaca di daftar
const links = Object.fromEntries([...document.querySelectorAll('.side nav a')].map(a => [a.hash.slice(1), a]));
const spy = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  Object.values(links).forEach(a => a.removeAttribute('aria-current'));
  const a = links[e.target.id];
  if (!a) return;
  a.setAttribute('aria-current', 'true');
  if (matchMedia('(max-width:860px)').matches) a.parentNode.scrollTo({left: a.offsetLeft - a.parentNode.offsetLeft - 8});
}), {rootMargin: '-20% 0px -75% 0px'});
const lecs = [...document.querySelectorAll('.lec')];
lecs.forEach(s => spy.observe(s));

// Posisi baca disimpan di riwayat sebagai id elemen + jaraknya dari atas layar, bukan piksel halaman:
// bagian di luar layar dirender belakangan (content-visibility), jadi tingginya baru perkiraan dan piksel lama meleset.
history.scrollRestoration = 'manual';
const pad = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
const lastAbove = (els, y) => {  // elemen terakhir yang atasnya sudah lewat y (urutan dokumen = urutan atas ke bawah)
  let lo = 0, hi = els.length - 1, r;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (els[m].getBoundingClientRect().top <= y) { r = els[m]; lo = m + 1; } else hi = m - 1; }
  return r;
};
const here = () => {
  const y = pad() + 1, lec = lastAbove(lecs, y); if (!lec) return;
  const el = lastAbove([...lec.querySelectorAll('h3[id], .q[id], li[id]')], y) || lec;
  return {id: el.id, off: el.getBoundingClientRect().top};
};
const save = () => { const pos = here(); if (pos) try { history.replaceState({...history.state, pos}, ''); } catch {} };
let saveT;
addEventListener('scroll', () => { clearTimeout(saveT); saveT = setTimeout(save, 150); }, {passive: true});
addEventListener('pagehide', save);
const push = (st, url) => { save(); history.pushState({...st, pushed: 1, pos: history.state?.pos}, '', url); };

// Tinggi bagian bisa berubah sesudah lompat, jadi betulkan posisi sampai diam. Hanya satu yang aktif,
// dan berhenti begitu pengguna menggulir, menyentuh, atau menekan tombol.
let run = 0;
['wheel', 'touchstart', 'keydown'].forEach(t => addEventListener(t, () => run++, {passive: true}));
const settle = (id, off) => {
  const el = document.getElementById(id); if (!el) return;
  const lec = el.closest('.lec'), me = ++run; let n = 0, still = 0;
  const step = () => {
    if (me !== run) return;
    // bagian yang belum dirender masih setinggi perkiraannya, jadi target bisa berada di luar kotaknya:
    // tuju dulu awal bagiannya supaya dirender, baru targetnya
    const t = el.getBoundingClientRect().top, b = lec ? lec.getBoundingClientRect() : {bottom: t};
    const y = scrollY, d = (t > b.bottom ? b.top : t) - off;
    if (Math.abs(d) > 1) scrollBy(0, d);
    still = Math.abs(d) <= 1 || scrollY === y ? still + 1 : 0;
    if (still < 5 && ++n < 120) requestAnimationFrame(step);
  };
  step();
};
const go = id => {  // lompat ke #id; rangkuman yang tertutup dibuka dulu
  const el = document.getElementById(id); if (!el) return;
  if (el.matches('details.rk')) el.open = true;
  settle(id, pad());
};
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || e.target.closest('dialog') || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const id = decodeURIComponent(a.hash.slice(1)); if (!document.getElementById(id)) return;
  e.preventDefault(); save();
  if (a.hash !== location.hash) history.pushState(null, '', a.hash);
  go(id);
});

// buka atau tutup semua rangkuman
document.addEventListener('click', e => {
  const b = e.target.closest('.rkall'); if (!b) return;
  const open = b.textContent.startsWith('Buka');
  document.querySelectorAll('details.rk').forEach(d => d.open = open);
  b.textContent = (open ? 'Tutup' : 'Buka') + ' semua rangkuman';
});

// Slide prioritas: buka di layar penuh (satu entri riwayat), lanjut ke slide berikutnya, tautan #sl-... langsung membuka slidenya
let sls = [], at = -1;
const slList = () => { const seen = new Set(); return [...document.querySelectorAll('#slide-top .st-g a.sl')].filter(a => !seen.has(a.href) && seen.add(a.href)); };
const showSl = i => {
  sls = sls.length ? sls : slList(); at = (i + sls.length) % sls.length;
  const a = sls[at]; big.src = a.href; big.alt = a.dataset.cap;
  zcap.textContent = `${at + 1}/${sls.length} · ${a.dataset.cap}`;
  zoom.querySelector('.zsoal').href = '#' + a.dataset.id;
  zcap.hidden = znav.hidden = false;
  history.replaceState({...history.state, dlg: 'sl'}, '', '#' + a.dataset.id);  // Berikutnya/Sebelumnya tidak menambah entri
  if (!zoom.open) zoom.showModal();
};
document.addEventListener('click', e => {
  const step = e.target.closest('.znav [data-step]');
  if (step) return showSl(at + +step.dataset.step);
  const a = e.target.closest('a.sl'), start = e.target.closest('.slgo');
  if (a || start) {
    e.preventDefault(); sls = slList(); push({dlg: 'sl'});
    return showSl(start ? 0 : sls.findIndex(x => x.href === a.href));
  }
});
addEventListener('keydown', e => {
  if (!zoom.open || znav.hidden) return;
  if (e.key === 'ArrowRight') showSl(at + 1);
  if (e.key === 'ArrowLeft') showSl(at - 1);
});
// ditutup pengguna (klik atau Esc): tinggalkan entri riwayat dialognya
zoom.addEventListener('close', () => {
  const st = history.state;
  if (!st?.dlg) return;  // sudah pindah entri (Back, ganti hash, Lihat soalnya)
  if (st.pushed) history.back();
  else history.replaceState({pos: st.pos}, '', location.pathname + location.search);
});
// Back/Forward atau ganti hash: buka slide bila entrinya slide, selain itu tutup dialog lalu pulihkan posisi
const route = () => {
  const st = history.state || {}, id = decodeURIComponent(location.hash.slice(1));
  if (st.dlg === 'sl' || (!st.pos && id.startsWith('sl-'))) {
    sls = slList(); const i = sls.findIndex(a => a.dataset.id === id);
    if (i >= 0) return showSl(i);
  }
  if (zoom.open) zoom.close();
  if (st.pos) settle(st.pos.id, st.pos.off); else if (id) go(id);
};
addEventListener('popstate', route); addEventListener('hashchange', route);
route();
const run0 = run;
addEventListener('pageshow', e => {  // browser memulihkan centang dan font sesudah skrip jalan: selaraskan, lalu ulangi posisi
  syncKeys();
  if (!e.persisted && run === run0) route();
});

// Kenapa jawabannya ini dan contoh soal per pilihan: data per tahun (why/<tahun>.json), dimuat saat pembahasan dibuka
const whyData = {}, whyEsc = t => t.replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
const whyLoad = yr => whyData[yr] ??= fetch(`why/${yr}.json?v=2`).then(r => r.ok ? r.json() : {}).catch(() => ({}));
const whyFill = async d => {
  const q = d.closest('.q'); if (!q || !/^s\d{4}-/.test(q.id) || d.dataset.why) return;  // hanya bank soal Sumatif yang punya why/<tahun>.json
  d.dataset.why = 1;
  const w = (await whyLoad(q.id.slice(1, 5)))[q.id]; if (!w) return;
  const ops = [...q.querySelectorAll('.op')], L = 'abcdefgh';
  let h = '<div class="why"><p class="why-h">Kenapa jawabannya ini, kenapa bukan yang lain</p>';
  if (w.o.inti) h += `<p>${w.o.inti}</p>`;
  else h += '<ul class="why-l">' + ops.map((o, i) => {
    const k = L[i], ok = o.hasAttribute('data-ok'), cs = w.c && w.c[k];
    return `<li class="${ok ? 'ok' : 'no'}" data-k="${k}"><span class="why-m">${ok ? '✓' : '✗'} ${k}.</span> <span class="why-o">${whyEsc(o.textContent)}</span><br>${w.o[k] || ''}` +
      (cs ? `<details class="cs"><summary>Contoh soal yang jawabannya ${k}</summary><p>${cs}</p><p class="note">Pilihan a sampai ${L[ops.length - 1]} sama seperti soal di atas. Jawaban: <b>${k}. ${whyEsc(o.textContent)}</b></p></details>` : '') + '</li>';
  }).join('') + '</ul>';
  (d.querySelector('.mn-q') || d.querySelector('.ans')).insertAdjacentHTML('afterend', h + '</div>');
  whyMark(q);
};
// tandai alasan untuk pilihan yang tadi diklik
const whyMark = q => { const s = q.querySelector('.op.salah'); if (!s) return;
  const k = 'abcdefgh'[[...q.querySelectorAll('.op')].indexOf(s)], li = q.querySelector(`.why-l li[data-k="${k}"]`); if (li) li.classList.add('pilih'); };
document.addEventListener('toggle', e => { if (e.target.matches('.q > details') && e.target.open) whyFill(e.target); }, true);
document.addEventListener('click', e => { const q = e.target.closest('.op') && e.target.closest('.q'); if (q) setTimeout(() => whyMark(q)); });
