const zoom = document.getElementById('zoom'), big = zoom.firstElementChild;
document.addEventListener('click', e => {
  if (e.target.closest('dialog')) { if (!e.target.closest('.znav')) zoom.close(); return; }
  const all = e.target.closest('.openall');
  if (all) {  // buka atau tutup semua jawaban di tahun itu
    const open = all.textContent.startsWith('Buka');
    all.closest('.lec').querySelectorAll('details').forEach(d => d.open = open);
    all.textContent = (open ? 'Tutup' : 'Buka') + ' semua jawaban';
    return;
  }
  const op = e.target.closest('.op');
  if (op) {  // hijau bila benar; bila salah, pilihan itu merah dan kuncinya hijau
    const q = op.closest('.q');
    op.classList.add(op.hasAttribute('data-ok') ? 'benar' : 'salah');
    q.querySelector('.op[data-ok]').classList.add('benar');
    q.querySelectorAll('.op').forEach(o => o.disabled = true);
    q.querySelector('details').open = true;
    q.classList.add('dijawab');
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
      q.querySelector('details').open = false;
    });
    if (every) {  // kembali ke keadaan awal: jawaban yang dibuka lewat "Buka semua" ikut tertutup
      document.querySelectorAll('.soal details[open]').forEach(d => d.open = false);
      document.querySelectorAll('.openall').forEach(b => b.textContent = 'Buka semua jawaban');
    }
    return;
  }
  const img = e.target.closest('figure img');
  if (img) { big.src = img.src; big.alt = img.alt; zoom.showModal(); }
});

const keys = document.getElementById('keys');
keys.onchange = () => document.body.classList.toggle('keys', keys.checked);
keys.onchange();

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
document.querySelectorAll('.lec').forEach(s => spy.observe(s));
// Bagian di luar layar dirender belakangan (content-visibility), jadi tingginya baru perkiraan.
// Setelah lompat ke #anchor, betulkan posisi sampai tidak bergeser lagi.
const fixJump=()=>{const t=location.hash&&document.getElementById(decodeURIComponent(location.hash.slice(1)));if(!t)return;
  const h=document.documentElement,sb=h.style.scrollBehavior;h.style.scrollBehavior='auto';let n=0,ok=0,last;
  const go=()=>{t.scrollIntoView();const y=t.getBoundingClientRect().top;ok=y===last?ok+1:0;last=y;if(ok<3&&++n<30)requestAnimationFrame(go);else h.style.scrollBehavior=sb};go()};
addEventListener('hashchange',fixJump);
addEventListener('load',fixJump);
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(a&&a.hash===location.hash)requestAnimationFrame(fixJump)});

// buka atau tutup semua rangkuman
document.addEventListener('click', e => {
  const b = e.target.closest('.rkall'); if (!b) return;
  const open = b.textContent.startsWith('Buka');
  document.querySelectorAll('details.rk').forEach(d => d.open = open);
  b.textContent = (open ? 'Tutup' : 'Buka') + ' semua rangkuman';
});
// tautan ke rangkuman yang tertutup: buka dulu
const openRk = () => { const t = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t && t.matches('details.rk')) t.open = true; };
addEventListener('hashchange', openRk); openRk();

// Slide prioritas: buka di layar penuh, lanjut ke slide berikutnya, tautan #sl-... langsung membuka slidenya
const zcap = zoom.querySelector('.zcap'), znav = zoom.querySelector('.znav');
let sls = [], at = -1;
const slList = () => { const seen = new Set(); return [...document.querySelectorAll('#slide-top .st-g a.sl')].filter(a => !seen.has(a.href) && seen.add(a.href)); };
const showSl = i => {
  sls = sls.length ? sls : slList(); at = (i + sls.length) % sls.length;
  const a = sls[at]; big.src = a.href; big.alt = a.dataset.cap;
  zcap.textContent = `${at + 1}/${sls.length} · ${a.dataset.cap}`;
  zoom.querySelector('.zsoal').href = '#' + a.dataset.id;
  zcap.hidden = znav.hidden = false;
  if (!zoom.open) zoom.showModal();
};
document.addEventListener('click', e => {
  if (!zcap) return;
  const step = e.target.closest('.znav [data-step]');
  if (step) return showSl(at + +step.dataset.step);
  if (e.target.closest('.zsoal')) return zoom.close();
  const a = e.target.closest('a.sl'), go = e.target.closest('.slgo');
  if (a || go) {
    e.preventDefault(); sls = slList();
    return showSl(go ? 0 : sls.findIndex(x => x.href === a.href));
  }
  // gambar biasa: tanpa keterangan dan navigasi
  if (e.target.closest('figure img')) zcap.hidden = znav.hidden = true;
});
addEventListener('keydown', e => {
  if (!zoom.open || znav.hidden) return;
  if (e.key === 'ArrowRight') showSl(at + 1);
  if (e.key === 'ArrowLeft') showSl(at - 1);
});
const openSl = () => {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id.startsWith('sl-') || !document.getElementById(id)) return;
  sls = slList(); const i = sls.findIndex(x => x.dataset.id === id);
  if (i >= 0) showSl(i);
};
addEventListener('hashchange', openSl); addEventListener('load', openSl);
