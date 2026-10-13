/* "Il mare": sequenza di fotogrammi (video Seedance 2.5 dalla foto reale della terrazza) legata allo scroll */
(function () {
  'use strict';
  var CONFIG = { desktop: { path: 'assets/mare/', n: 48 }, mobile: { path: 'assets/mare-m/', n: 30 }, ease: 0.1, maxDpr: 2 };
  var box = document.getElementById('mare'), cv = document.getElementById('mareCanvas'); if (!box || !cv) return;
  var ctx = cv.getContext('2d'), reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var set = (innerWidth < 768 || (navigator.hardwareConcurrency || 8) <= 4) ? CONFIG.mobile : CONFIG.desktop;
  var frames = new Array(set.n), loaded = 0, cur = 0, target = 0, vis = false, raf = 0, lastI = -1;
  var steps = Array.prototype.slice.call(box.querySelectorAll('.mare-step')), bar = box.querySelector('.mare-bar i');
  var src = function (i) { return set.path + String(i + 1).padStart(3, '0') + '.webp'; };

  function size() {
    var dpr = Math.min(devicePixelRatio || 1, CONFIG.maxDpr), r = cv.getBoundingClientRect();
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); lastI = -1; draw(cur);
  }
  function nearest(i) { for (var d = 1; d < set.n; d++) { if (frames[i - d]) return frames[i - d]; if (frames[i + d]) return frames[i + d]; } return null; }
  function cover(im, a) {
    var cw = cv.width, ch = cv.height, s = Math.max(cw / im.width, ch / im.height), w = im.width * s, h = im.height * s;
    ctx.globalAlpha = a; ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
  }
  // disegna il fotogramma i e, sfumato sopra, il successivo: lo scroll lungo resta fluido anche con pochi fotogrammi
  function draw(f) {
    var i = Math.min(set.n - 1, Math.floor(f)), fr = f - i, a = frames[i] || nearest(i), b = frames[i + 1];
    if (!a) return;
    ctx.globalAlpha = 1; cover(a, 1);
    if (b && fr > .01) cover(b, fr);
    ctx.globalAlpha = 1; lastI = f;
  }
  function progress() { var r = box.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / (r.height - innerHeight))); }
  function tick() {
    raf = 0; var p = progress(); target = p * (set.n - 1); cur += (target - cur) * CONFIG.ease; if (Math.abs(target - cur) < .01) cur = target;
    if (Math.abs(cur - lastI) > .004) draw(cur);
    steps.forEach(function (s) { s.classList.toggle('on', p >= +s.dataset.from && p < +s.dataset.to); });
    if (bar) bar.style.width = (p * 100).toFixed(1) + '%';
    if (vis && cur !== target) raf = requestAnimationFrame(tick);
  }
  function kick() { if (!raf && vis) raf = requestAnimationFrame(tick); }
  function load(i) { return new Promise(function (res) { var im = new Image(); im.onload = function () { frames[i] = im; loaded++; res(); }; im.onerror = res; im.src = src(i); }); }

  new IntersectionObserver(function (e) {
    var was = vis; vis = e[0].isIntersecting; if (vis) kick();
    if (vis && !was && !loaded) { load(reduced ? set.n - 1 : 0).then(function () { size(); if (reduced) { draw(set.n - 1); return; } for (var i = 1; i < set.n; i++) load(i); }); }
  }, { rootMargin: '300px' }).observe(box);
  addEventListener('scroll', kick, { passive: true }); addEventListener('resize', size);
  if (reduced) { steps.forEach(function (s) { s.classList.add('on'); }); }
})();
