/* Sezioni dalla galleria in giù: galleria orizzontale, dotazioni interattive, recensione che si accende, mappa che si disegna, scritta gigante che si riempie */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function onScrollRaf(fn) { var t = false; function r() { t = false; fn(); } addEventListener('scroll', function () { if (!t) { t = true; requestAnimationFrame(r); } }, { passive: true }); addEventListener('resize', fn); fn(); }

  /* ---------- galleria: il verticale muove l'orizzontale */
  var gal = document.getElementById('galleria'), track = document.getElementById('galTrack');
  if (gal && track && !reduced) {
    var figs = Array.prototype.slice.call(track.querySelectorAll('.gf')), nEl = document.getElementById('galN'), bar = document.getElementById('galBar');
    var dist = 0, x = 0, tx = 0, vis = false, running = false;
    var measure = function () {
      dist = Math.max(0, track.scrollWidth - innerWidth);
      gal.style.height = (dist + innerHeight * 1.15) + 'px';     // un po' di respiro a fine corsa
    };
    var progress = function () { var r = gal.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight), 0, 1); };
    var frame = function () {
      running = false; var p = progress(); tx = clamp(p / .94, 0, 1) * dist; x = lerp(x, tx, .12); if (Math.abs(x - tx) < .3) x = tx;
      track.style.transform = 'translate3d(' + (-x).toFixed(1) + 'px,0,0)';
      var best = 0, bd = 1e9;
      figs.forEach(function (f, i) {
        var r = f.getBoundingClientRect(), c = r.left + r.width / 2, off = (c - innerWidth / 2) / innerWidth;
        f.style.setProperty('--px', (-off * r.width * .07).toFixed(1) + 'px');
        var d = Math.abs(c - innerWidth / 2); if (d < bd) { bd = d; best = i; }
      });
      nEl.textContent = String(best + 1).padStart(2, '0'); bar.style.width = (p * 100).toFixed(1) + '%';
      if (vis && Math.abs(x - tx) > .3) { running = true; requestAnimationFrame(frame); }
    };
    var kick = function () { if (!running && vis) { running = true; requestAnimationFrame(frame); } };
    measure(); addEventListener('resize', function () { measure(); kick(); });
    window.addEventListener('load', function () { measure(); kick(); });
    Array.prototype.forEach.call(track.querySelectorAll('img'), function (im) { im.addEventListener('load', function () { measure(); kick(); }); });
    new IntersectionObserver(function (e) { vis = e[0].isIntersecting; if (vis) { measure(); kick(); } }, { rootMargin: '200px' }).observe(gal);
    addEventListener('scroll', kick, { passive: true });
  }

  /* ---------- dotazioni: l'immagine segue la riga attiva (mouse, tastiera o centro schermo) */
  var dz = document.getElementById('dotazioni');
  if (dz) {
    var rows = Array.prototype.slice.call(dz.querySelectorAll('.dotaz-list li')), imgs = Array.prototype.slice.call(dz.querySelectorAll('.dotaz-imgs img')), lab = dz.querySelector('.dotaz-label');
    var cur = -1, hover = 0;
    var set = function (i) { if (i === cur) return; cur = i; rows.forEach(function (r, k) { r.classList.toggle('on', k === i); }); imgs.forEach(function (m, k) { m.classList.toggle('on', k === i); }); lab.textContent = rows[i].querySelector('b').textContent; };
    rows.forEach(function (r, i) {
      r.addEventListener('mouseenter', function () { hover = performance.now(); set(i); });
      r.addEventListener('focus', function () { hover = performance.now(); set(i); });
      r.addEventListener('click', function () { hover = performance.now() + 2500; set(i); });
    });
    set(0);
    onScrollRaf(function () {
      if (performance.now() - hover < 1800) return;
      var r0 = dz.getBoundingClientRect(); if (r0.bottom < 0 || r0.top > innerHeight) return;
      var mid = innerHeight * .5, best = 0, bd = 1e9;
      rows.forEach(function (r, i) { var b = r.getBoundingClientRect(), d = Math.abs(b.top + b.height / 2 - mid); if (d < bd) { bd = d; best = i; } });
      set(best);
    });
  }

  /* ---------- recensione: le parole si accendono con lo scroll */
  var rec = document.getElementById('recensione');
  if (rec && !reduced) {
    var words = Array.prototype.slice.call(rec.querySelectorAll('.qw')), cite = rec.querySelector('cite'), rbar = rec.querySelector('.rec-bar i'), bg = rec.querySelector('.rec-bg');
    onScrollRaf(function () {
      var r = rec.getBoundingClientRect(), p = clamp(-r.top / (r.height - innerHeight), 0, 1), n = Math.ceil(clamp(p / .78, 0, 1) * words.length);
      words.forEach(function (w, i) { w.classList.toggle('lit', i < n); });
      cite.classList.toggle('on', p > .82); rbar.style.width = (p * 100).toFixed(1) + '%';
      bg.style.setProperty('--z', (1.05 + p * .16).toFixed(3)); bg.style.setProperty('--ty', ((.5 - p) * 40).toFixed(1) + 'px');
    });
  }

  /* ---------- mappa: la rotta si disegna, la bussola gira, la costa respira */
  var mp = document.getElementById('mappa');
  if (mp) {
    var rotta = document.getElementById('rotta'), ago = document.getElementById('ago'), terra = mp.querySelector('.terra'), len = rotta.getTotalLength();
    rotta.style.strokeDasharray = len; rotta.style.strokeDashoffset = reduced ? 0 : len;
    onScrollRaf(function () {
      var r = mp.getBoundingClientRect(), p = clamp((innerHeight - r.top) / (innerHeight + r.height * .2), 0, 1);
      if (!reduced) {
        rotta.style.strokeDashoffset = (len * (1 - clamp(p * 1.5 - .1, 0, 1))).toFixed(1);
        ago.style.transform = 'rotate(' + (-40 + p * 80).toFixed(1) + 'deg)';
        terra.style.transform = 'translate3d(0,' + ((p - .5) * 30).toFixed(1) + 'px,0)';
      }
    });
  }

  /* ---------- scritta gigante: il livello dell'acqua sale con lo scroll del footer */
  var mega = document.getElementById('mega');
  if (mega) {
    var ft = mega.parentElement;
    onScrollRaf(function () {
      var r = ft.getBoundingClientRect(), p = reduced ? 1 : clamp((innerHeight - r.top) / (Math.min(r.height, innerHeight) * 1.05), 0, 1);
      mega.style.setProperty('--lvl', p.toFixed(3));
    });
  }
})();
