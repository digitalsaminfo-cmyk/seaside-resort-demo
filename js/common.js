/* comune a tutte le pagine: menu, rivelazioni allo scroll, lightbox, parallasse leggera, form demo */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nav = document.querySelector('.nav');
  var burger = document.querySelector('.burger');

  function onScroll() { if (nav) nav.classList.toggle('solid', scrollY > 40); }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (burger) {
    burger.addEventListener('click', function () { var o = nav.classList.toggle('aperto'); burger.setAttribute('aria-expanded', o); });
    document.querySelectorAll('.menu a').forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('aperto'); burger.setAttribute('aria-expanded', 'false'); }); });
  }

  /* rivelazioni */
  var rev = document.querySelectorAll('.rev');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
    rev.forEach(function (r) { io.observe(r); });
  } else rev.forEach(function (r) { r.classList.add('in'); });

  /* parallasse: elementi [data-par="0.2"] */
  var par = Array.prototype.slice.call(document.querySelectorAll('[data-par]'));
  if (par.length && !reduced) {
    var tick = false;
    var run = function () {
      tick = false; var vh = innerHeight;
      par.forEach(function (el) {
        var r = el.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh + 100) return;
        var k = parseFloat(el.getAttribute('data-par')) || .1, c = (r.top + r.height / 2 - vh / 2);
        el.style.transform = 'translate3d(0,' + (-c * k).toFixed(1) + 'px,0)';
      });
    };
    addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(run); } }, { passive: true }); run();
  }

  /* lightbox */
  var lb = document.getElementById('lb');
  if (lb) {
    var img = lb.querySelector('img'), items = [], idx = 0;
    var apri = function (i) { idx = (i + items.length) % items.length; img.src = items[idx].getAttribute('data-full'); img.alt = items[idx].getAttribute('data-alt') || ''; lb.classList.add('on'); };
    document.querySelectorAll('[data-full]').forEach(function (b, i) { items.push(b); b.addEventListener('click', function () { apri(i); }); });
    lb.querySelector('.x').addEventListener('click', function () { lb.classList.remove('on'); });
    lb.querySelector('.p').addEventListener('click', function () { apri(idx - 1); });
    lb.querySelector('.n').addEventListener('click', function () { apri(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.classList.remove('on'); });
    addEventListener('keydown', function (e) { if (!lb.classList.contains('on')) return; if (e.key === 'Escape') lb.classList.remove('on'); if (e.key === 'ArrowLeft') apri(idx - 1); if (e.key === 'ArrowRight') apri(idx + 1); });
  }

  /* striscia galleria: trascinamento col mouse */
  document.querySelectorAll('.striscia').forEach(function (s) {
    var down = false, x0 = 0, s0 = 0, moved = false;
    s.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; x0 = e.clientX; s0 = s.scrollLeft; });
    addEventListener('pointermove', function (e) { if (!down) return; var d = e.clientX - x0; if (Math.abs(d) > 4) { moved = true; s.style.scrollSnapType = 'none'; } s.scrollLeft = s0 - d; });
    addEventListener('pointerup', function () { if (!down) return; down = false; s.style.scrollSnapType = ''; });
    s.addEventListener('click', function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  });

  /* form di contatto: demo, apre il client di posta con i dati inseriti (nessun invio a server) */
  var f = document.getElementById('formContatti');
  if (f) f.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = new FormData(f), body = 'Nome: ' + d.get('nome') + '\nTelefono: ' + d.get('prefisso') + ' ' + d.get('tel') + '\n\n' + d.get('msg');
    location.href = 'mailto:seasideresort.ts@gmail.com?subject=' + encodeURIComponent(d.get('oggetto') || 'Richiesta informazioni') + '&body=' + encodeURIComponent(body);
    document.getElementById('esito').textContent = 'Si apre il tuo programma di posta per completare l\'invio (modulo dimostrativo).';
  });
})();
