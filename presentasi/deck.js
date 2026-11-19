(() => {
  const $ = (s) => document.querySelector(s);
  const slides = [...document.querySelectorAll('.slide')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [cur, bar, prev, next, notes, nTime, nBody] =
    ['#cur', '#bar', '#prev', '#next', '#notes', '#notes-time', '#notes-body'].map($);
  const fmt = (n, d) => n.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
  let i = -1;

  document.querySelectorAll('[data-weeks]').forEach((el) => {
    el.innerHTML = Array.from({ length: 22 }, (_, k) => `<span>${k + 1}</span>`).join('');
  });

  // Angka naik dari 0 saat slide aktif; teks akhir sudah ada di HTML, jadi tanpa JS tetap benar.
  function count(el) {
    const to = +el.dataset.count, d = +(el.dataset.dec || 0), suf = el.dataset.suf || '';
    const set = (v) => { el.textContent = fmt(v, d) + suf; };
    cancelAnimationFrame(el._raf);
    if (reduce) return set(to);
    set(0);
    const t0 = performance.now() + 300;
    const tick = (now) => {
      const p = Math.min(Math.max((now - t0) / 1100, 0), 1);
      set(to * (1 - (1 - p) ** 4));
      if (p < 1) el._raf = requestAnimationFrame(tick);
    };
    el._raf = requestAnimationFrame(tick);
  }

  function go(n) {
    n = Math.max(0, Math.min(slides.length - 1, n));
    if (n === i) return;
    if (i >= 0) document.body.classList.add('moved');
    i = n;
    slides.forEach((s, k) => {
      s.classList.toggle('is-active', k === n);
      s.classList.toggle('is-past', k < n);
      s.inert = k !== n;
    });
    slides[n].scrollTop = 0;
    cur.textContent = n + 1;
    bar.style.transform = `scaleX(${(n + 1) / slides.length})`;
    prev.disabled = n === 0;
    next.disabled = n === slides.length - 1;
    nTime.textContent = `Slide ${n + 1}, sekitar ${slides[n].dataset.time}`;
    nBody.textContent = slides[n].dataset.notes;
    history.replaceState(null, '', '#' + (n + 1));
    slides[n].querySelectorAll('[data-count]').forEach(count);
  }

  const fromHash = () => go((parseInt(location.hash.slice(1), 10) || 1) - 1);

  prev.onclick = () => go(i - 1);
  next.onclick = () => go(i + 1);
  addEventListener('hashchange', fromHash);

  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const onControl = e.target.closest('button, a');
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || (!onControl && (k === ' ' || k === 'Enter'))) go(i + 1);
    else if (k === 'ArrowLeft' || k === 'PageUp') go(i - 1);
    else if (k === 'Home') go(0);
    else if (k === 'End') go(slides.length - 1);
    else if (k === 'n' || k === 'N') notes.classList.toggle('open');
    else if (k === 'l' || k === 'L') {
      const root = document.documentElement;
      root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    } else if (k === 'f' || k === 'F') {
      document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
    } else return;
    e.preventDefault();
  });

  let x0 = 0, y0 = 0;
  const deck = $('#deck');
  deck.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  deck.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(i + (dx < 0 ? 1 : -1));
  }, { passive: true });

  fromHash();
})();
