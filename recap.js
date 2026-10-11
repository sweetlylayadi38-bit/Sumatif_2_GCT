const zoom = document.getElementById('zoom'), big = zoom.firstElementChild;
document.addEventListener('click', e => {
  if (e.target.closest('dialog')) return zoom.close();
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
