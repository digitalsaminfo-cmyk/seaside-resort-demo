/* Movimento delle sezioni: titoli parola per parola, contatori, maschere sulle immagini, fascia scorrevole, video drone che si espande, onde, magnetismo */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  /* ---- titoli spezzati in parole che salgono da una maschera */
  document.querySelectorAll('.split').forEach(function (h) {
    var n = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (t) {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            var i = document.createElement('span'); i.style.setProperty('--i', n++); i.textContent = t; w.appendChild(i); frag.appendChild(w);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    })(h);
  });
  if (reduced || !('IntersectionObserver' in window)) document.querySelectorAll('.split').forEach(function (e) { e.classList.add('in'); });
  else {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .25 });
    document.querySelectorAll('.split').forEach(function (e) { io.observe(e); });
  }

  /* ---- contatori */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var to = parseFloat(el.getAttribute('data-count')); if (reduced) { el.textContent = to; return; }
    el.textContent = '0';
    new IntersectionObserver(function (es, o) {
      var e = es[0];
      if (!e.isIntersecting) { if (e.boundingClientRect.top < 0) { el.textContent = to; o.disconnect(); } return; }   // sezione già superata (ancora): valore finale
      if (e.intersectionRatio < .6) return; o.disconnect();
      var t0 = performance.now(), d = 1400;
      (function f(now) { var t = clamp((now - t0) / d, 0, 1); el.textContent = Math.round(to * ease(t)); if (t < 1) requestAnimationFrame(f); })(t0);
    }, { threshold: [0, .6] }).observe(el);
    var past = function () { if (el.getBoundingClientRect().bottom < 0 && el.textContent !== String(to) && !el.dataset.run) { el.textContent = to; removeEventListener('scroll', past); } };
    addEventListener('scroll', past, { passive: true });
  });

  /* ---- fascia scorrevole: la velocità segue lo scroll */
  var mq = document.querySelector('.marq-track');
  if (mq && !reduced) {
    var x = 0, vel = 0, lastY = scrollY, half = 0;
    var measure = function () { half = mq.scrollWidth / 2; };
    measure(); addEventListener('resize', measure);
    (function loop() {
      var y = scrollY, dv = y - lastY; lastY = y; vel += (dv * .35 - vel) * .1;
      x -= .6 + Math.abs(vel); if (half && x <= -half) x += half;
      mq.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0) skewX(' + clamp(-vel * .5, -9, 9).toFixed(2) + 'deg)';
      requestAnimationFrame(loop);
    })();
  }

  /* ---- video drone: la finestra si allarga fino a tutto schermo mentre si scorre */
  var dr = document.getElementById('video');
  if (dr) {
    var frame = dr.querySelector('.drone-frame'), vid = dr.querySelector('video'), txt = dr.querySelector('.drone-text'), btn = dr.querySelector('.drone-play');
    var playing = false, want = false, ticking = false;
    var upd = function () {
      ticking = false;
      var r = dr.getBoundingClientRect(), p = clamp(-r.top / (r.height - innerHeight), 0, 1);
      var open = reduced ? 1 : ease(clamp(p / .38, 0, 1));
      var inset = (1 - open), ix = (innerWidth < 760 ? 6 : 24) * inset, iy = (innerWidth < 760 ? 22 : 16) * inset;
      frame.style.clipPath = 'inset(' + iy.toFixed(2) + '% ' + ix.toFixed(2) + '% ' + iy.toFixed(2) + '% ' + ix.toFixed(2) + '% round ' + (28 * inset).toFixed(1) + 'px)';
      vid.style.transform = 'scale(' + (1.18 - .18 * open).toFixed(3) + ')';
      var tOp = reduced ? 1 : clamp((p - .3) / .18, 0, 1) * (1 - clamp((p - .92) / .08, 0, 1));
      txt.style.opacity = tOp; txt.style.transform = 'translate3d(0,' + ((1 - tOp) * 30).toFixed(1) + 'px,0)';
    };
    var kick = function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } };
    addEventListener('scroll', kick, { passive: true }); addEventListener('resize', kick); upd();
    var setPlay = function (on) { playing = on; btn.setAttribute('aria-pressed', on); btn.querySelector('span').textContent = on ? 'Pausa' : 'Riproduci'; };
    new IntersectionObserver(function (e) {
      if (reduced) return;
      if (e[0].isIntersecting) { if (!want) { var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {}); setPlay(true); } }
      else { vid.pause(); setPlay(false); want = false; }
    }, { threshold: .15 }).observe(dr);
    btn.addEventListener('click', function () { if (vid.paused) { vid.play(); setPlay(true); want = false; } else { vid.pause(); setPlay(false); want = true; } });
  }

  /* ---- magnetismo dei pulsanti e inclinazione 3D delle card (solo con mouse) */
  if (fine && !reduced) {
    document.querySelectorAll('.btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .22).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * .3).toFixed(1) + 'px)'; });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
    document.querySelectorAll('.card').forEach(function (c) {
      c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5; c.style.transform = 'perspective(900px) rotateY(' + (px * 7).toFixed(2) + 'deg) rotateX(' + (-py * 7).toFixed(2) + 'deg) translateZ(0)'; c.style.transition = 'transform .1s'; });
      c.addEventListener('pointerleave', function () { c.style.transform = ''; c.style.transition = 'transform .7s cubic-bezier(.2,.7,.2,1)'; });
    });
  }
})();
