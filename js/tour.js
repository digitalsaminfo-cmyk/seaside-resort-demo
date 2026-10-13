/* Seaside Resort — tour 360° guidato dallo scroll (WebGL2)
   4 panorami: terrazza, soggiorno, camera, bagno. Tra una stanza e l'altra la scena si "arrotola" in un mini-pianeta.
   Il motore deriva dalla tecnica del file di riferimento LAB-3D-TEST/06-bnb-360, esteso da 2 a 4 stanze. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ parametri */
  var ROOMS = [
    { id: 'terrazza',  nome: 'La terrazza',  sotto: 'Terrazza privata sul mare', hi: 'assets/pano2/a2_terrazza.jpg',  lo: 'assets/pano2/a2_terrazza-lo.jpg' },
    { id: 'soggiorno', nome: 'Il soggiorno', sotto: 'Cucina privata',            hi: 'assets/pano2/a2_soggiorno.jpg', lo: 'assets/pano2/a2_soggiorno-lo.jpg' },
    { id: 'camera',    nome: 'La camera',    sotto: 'Porta-finestra sul mare',   hi: 'assets/pano2/a2_camera.jpg',    lo: 'assets/pano2/a2_camera-lo.jpg' },
    { id: 'bagno',     nome: 'Il bagno',     sotto: 'Bagno privato',             hi: 'assets/pano2/a1_bagno.jpg',     lo: 'assets/pano2/a1_bagno-lo.jpg' }
  ];
  var SWAPS = [0.30, 0.56, 0.80];        // punto del percorso in cui avviene lo scambio di panorama (picco del mini-pianeta)
  var CHAPTERS = [0.10, 0.36, 0.62, 0.87]; // dove atterra ogni stanza (per i pulsanti capitolo)

  // percorso: [scroll, direzione (gradi), inclinazione, semi-angolo verticale, pianeta 1 → vista normale 0]
  var K = [
    [0.000, 200, 88, 118, 1],
    [0.040, 230, 88, 118, 1],
    [0.100, 270, 14, 50, 0],
    [0.130, 270, 16, 40, 0],
    [0.170, 326, -8, 48, 0],
    [0.200, 326, -10, 38, 0],
    [0.230, 390, 0, 46, 0],
    [0.260, 477, -4, 44, 0],
    [0.280, 477, -4, 36, 0],
    [0.300, 540, 88, 118, 1],
    [0.350, 266, 16, 48, 0],
    [0.370, 266, 18, 40, 0],
    [0.400, 326, -6, 48, 0],
    [0.440, 353, 6, 42, 0],
    [0.480, 414, -8, 44, 0],
    [0.510, 436, 0, 42, 0],
    [0.540, 472, -6, 36, 0],
    [0.560, 520, 88, 118, 1],
    [0.610, 274, 8, 50, 0],
    [0.640, 274, 10, 42, 0],
    [0.670, 378, -14, 50, 0],
    [0.710, 461, 16, 44, 0],
    [0.750, 461, 16, 38, 0],
    [0.770, 500, 4, 36, 0],
    [0.800, 540, 88, 118, 1],
    [0.850, 284, 22, 48, 0],
    [0.880, 284, 24, 38, 0],
    [0.910, 333, 8, 44, 0],
    [0.940, 398, 14, 42, 0],
    [0.965, 448, 18, 38, 0],
    [1.000, 540, 88, 118, 1]
  ];

  // punti cliccabili: stanza, direzione/inclinazione misurate sul panorama, finestra di visibilità, 'porta' = vai al punto del percorso
  var PIN = [
    { s: 0, t: 'Vista mare', lon: -90, lat: 28, da: 0.08, a: 0.29 },
    { s: 0, t: 'Terrazza privata', lon: -34, lat: -12, da: 0.14, a: 0.29 },
    { s: 0, t: 'Lettini e sdraio', lon: 30, lat: -3, da: 0.2, a: 0.29 },
    { s: 0, t: 'Entra in casa →', lon: 117, lat: -6, da: 0.24, a: 0.295, porta: 0.36 },
    { s: 1, t: 'Aria condizionata', lon: -94, lat: 40, da: 0.33, a: 0.55 },
    { s: 1, t: 'Vista mare', lon: -20, lat: 14, da: 0.42, a: 0.55 },
    { s: 1, t: 'Cucina privata', lon: 54, lat: -14, da: 0.46, a: 0.55 },
    { s: 1, t: 'Alla camera →', lon: 130, lat: 2, da: 0.48, a: 0.555, porta: 0.62 },
    { s: 1, t: '← Alla terrazza', lon: 12, lat: -6, da: 0.38, a: 0.555, porta: 0.11 },
    { s: 2, t: 'Porta-finestra sul mare', lon: -86, lat: 10, da: 0.59, a: 0.79 },
    { s: 2, t: 'Letto matrimoniale', lon: 18, lat: -22, da: 0.65, a: 0.79 },
    { s: 2, t: 'Lampada a corda', lon: 101, lat: 20, da: 0.69, a: 0.79 },
    { s: 2, t: 'Al bagno →', lon: 160, lat: 0, da: 0.72, a: 0.795, porta: 0.87 },
    { s: 3, t: 'Specchio retroilluminato', lon: -76, lat: 38, da: 0.83, a: 0.99 },
    { s: 3, t: 'Doccia', lon: -27, lat: 12, da: 0.88, a: 0.99 },
    { s: 3, t: 'Termoarredo', lon: 38, lat: 20, da: 0.91, a: 0.99 },
    { s: 3, t: '← Torna alla camera', lon: 150, lat: 0, da: 0.93, a: 0.99, porta: 0.62 }
  ];

  /* ------------------------------------------------------------------ riferimenti */
  var D2R = Math.PI / 180;
  var $ = function (id) { return document.getElementById(id); };
  var tela = $('tela'), percorso = $('percorso'), carico = $('carico'), titolo = $('titolo');
  var nomeStanza = $('nomeStanza'), sottoStanza = $('sottoStanza'), guida = $('guida'), intro = $('intro');
  var finale = $('finale'), riprendi = $('riprendi'), giro = $('giro'), capitoli = $('capitoli'), spilli = $('spilli');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!tela) return;

  function smooth(t) { return t * t * (3 - 2 * t); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function wrap180(a) { return ((a + 180) % 360 + 360) % 360 - 180; }

  var gl = tela.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false });
  if (!gl) { document.documentElement.classList.add('no-gl'); if (carico) carico.classList.add('fatto'); return; }

  /* ------------------------------------------------------------------ shader */
  var VS = '#version 300 es\nin vec2 a; out vec2 v; void main(){ v = a; gl_Position = vec4(a, 0.0, 1.0); }';
  var FS = '#version 300 es\n' + [
    'precision highp float;',
    'in vec2 v; out vec4 o;',
    'uniform sampler2D u0, u1, u2, u3;',
    'uniform int uA, uB;',
    'uniform float uAsp, uYaw, uPit, uM, uS, uMix;',
    'const float PI = 3.14159265359;',
    'vec3 smp(int i, vec2 uv, vec2 gX, vec2 gY){',
    '  if (i == 0) return textureGrad(u0, uv, gX, gY).rgb;',
    '  if (i == 1) return textureGrad(u1, uv, gX, gY).rgb;',
    '  if (i == 2) return textureGrad(u2, uv, gX, gY).rgb;',
    '  return textureGrad(u3, uv, gX, gY).rgb;',
    '}',
    'void main(){',
    '  vec2 p = v * vec2(uAsp, 1.0);',
    '  float l = length(p);',
    '  float r = l * uS;',
    '  float th = (uM + 1.0) * atan(r / (uM + 1.0));',
    '  vec2 dir = l > 1e-5 ? p / l : vec2(0.0);',
    '  vec3 c = vec3(sin(th) * dir, -cos(th));',
    '  float cp = cos(uPit), sp = sin(uPit);',
    '  c = vec3(c.x, c.y * cp - c.z * sp, c.y * sp + c.z * cp);',
    '  float cy = cos(uYaw), sy = sin(uYaw);',
    '  c = vec3(c.x * cy - c.z * sy, c.y, c.x * sy + c.z * cy);',
    '  float lon = atan(c.x, -c.z), lat = asin(clamp(c.y, -1.0, 1.0));',
    '  vec2 uv = vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);',
    '  vec2 uv2 = vec2(fract(uv.x + 0.5) - 0.5, uv.y);',
    '  float gx1 = dFdx(uv.x), gx2 = dFdx(uv2.x), gy1 = dFdy(uv.x), gy2 = dFdy(uv2.x);',
    '  vec2 gX = vec2(abs(gx1) < abs(gx2) ? gx1 : gx2, dFdx(uv.y));',
    '  vec2 gY = vec2(abs(gy1) < abs(gy2) ? gy1 : gy2, dFdy(uv.y));',
    '  vec3 ca = uMix < 1.0 ? smp(uA, uv, gX, gY) : vec3(0.0);',
    '  vec3 cb = uMix > 0.0 ? smp(uB, uv, gX, gY) : vec3(0.0);',
    '  o = vec4(mix(ca, cb, uMix), 1.0);',
    '}'
  ].join('\n');

  function sh(t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(x)); return x; }
  var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { document.documentElement.classList.add('no-gl'); carico.classList.add('fatto'); return; }
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var la = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['u0', 'u1', 'u2', 'u3', 'uA', 'uB', 'uAsp', 'uYaw', 'uPit', 'uM', 'uS', 'uMix'].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });

  /* ------------------------------------------------------------------ percorso */
  function guidato(p) {
    var i = 0; while (i < K.length - 2 && p > K[i + 1][0]) i++;
    var a = K[i], b = K[i + 1], t = smooth(clamp((p - a[0]) / (b[0] - a[0]), 0, 1));
    return { yaw: a[1] + (b[1] - a[1]) * t, pit: a[2] + (b[2] - a[2]) * t, half: a[3] + (b[3] - a[3]) * t, m: a[4] + (b[4] - a[4]) * t };
  }
  var W2 = 0.006;   // semi-larghezza dello scambio tra panorami (al picco del pianeta)
  function stanze(p) {
    var k = 0; SWAPS.forEach(function (s) { if (p > s) k++; });
    for (var i = 0; i < SWAPS.length; i++) {
      if (Math.abs(p - SWAPS[i]) < W2) return { a: i, b: i + 1, mix: smooth(clamp((p - (SWAPS[i] - W2)) / (2 * W2), 0, 1)), room: p > SWAPS[i] ? i + 1 : i };
    }
    return { a: k, b: k, mix: 0, room: k };
  }

  PIN.forEach(function (pn) {
    var b = document.createElement('button'); b.type = 'button';
    b.className = 'spillo' + (pn.porta ? ' porta' : ''); b.setAttribute('aria-label', pn.t);
    b.innerHTML = '<i></i><b>' + pn.t + '</b>'; spilli.appendChild(b); pn.el = b;
  });
  var chapBtns = [];
  ROOMS.forEach(function (r, i) {
    var b = document.createElement('button'); b.type = 'button'; b.innerHTML = '<span>' + (i + 1) + '</span><em>' + r.nome.replace(/^(La|Il) /, '') + '</em>';
    b.setAttribute('aria-label', 'Vai a: ' + r.nome);
    b.addEventListener('click', function () { vaiA(CHAPTERS[i], 2600); });
    capitoli.appendChild(b); chapBtns.push(b);
  });

  /* ------------------------------------------------------------------ stato */
  var QS = function (k, d) { var m = new RegExp('[?&]' + k + '=(-?[0-9.]+)').exec(location.search); return m ? parseFloat(m[1]) : d; };
  var corrente = 0, bersaglio = 0, bloccato = false, pronta = 0, animaScroll = null;
  var uYaw = 0, uPit = 0, tYaw = 0, tPit = 0, vYaw = 0, vPit = 0, trascino = false, ultimoX = 0, ultimoY = 0, ultimoMov = 0, mosso = false;
  var gYaw = 0, gPit = 0, giroOn = false, g0 = null;
  var dirty = true, vista = { yaw: 0, pit: 0, half: 40, m: 0, s: 1, room: 0 };
  var stanzaOra = -1, visibile = true;

  /* ------------------------------------------------------------------ texture: 4096 su PC, 2048 su telefono */
  var maxT = gl.getParameter(gl.MAX_TEXTURE_SIZE), touch = window.matchMedia('(pointer: coarse)').matches, hi = (maxT >= 4096 && !touch);
  var tot = ROOMS.length;
  function carica(i) {
    var im = new Image();
    im.onload = function () {
      var t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im); gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var an = gl.getExtension('EXT_texture_filter_anisotropic'); if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      gl.uniform1i(U['u' + i], i);
      pronta++; var f = $('caricoBarra'); if (f) f.style.transform = 'scaleX(' + (pronta / tot) + ')';
      if (pronta === tot) { carico.classList.add('fatto'); document.documentElement.classList.add('tour-pronto'); misura(); }
    };
    im.onerror = function () { console.error('panorama non caricato', ROOMS[i].id); pronta++; if (pronta === tot) carico.classList.add('fatto'); };
    im.src = hi ? ROOMS[i].hi : ROOMS[i].lo;
  }
  ROOMS.forEach(function (r, i) { carica(i); });

  function misura() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    tela.width = Math.round(tela.clientWidth * dpr); tela.height = Math.round(tela.clientHeight * dpr);
    gl.viewport(0, 0, tela.width, tela.height); dirty = true;
  }

  /* ------------------------------------------------------------------ disegno */
  function disegna() {
    if (pronta < tot) return;
    var g = guidato(corrente), st = stanze(corrente);
    var yaw = g.yaw + uYaw + gYaw, pit = clamp(g.pit + uPit + gPit, -86, 88);
    var m = g.m, half = g.half * D2R, s = (m + 1) * Math.tan(half / (m + 1));
    vista = { yaw: yaw, pit: pit, half: g.half, m: m, s: s, room: st.room };
    gl.uniform1f(U.uAsp, tela.width / tela.height); gl.uniform1f(U.uYaw, yaw * D2R); gl.uniform1f(U.uPit, pit * D2R);
    gl.uniform1f(U.uM, m); gl.uniform1f(U.uS, s); gl.uniform1f(U.uMix, st.mix); gl.uniform1i(U.uA, st.a); gl.uniform1i(U.uB, st.b);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    var W = tela.clientWidth, H = tela.clientHeight, asp = W / H, stanza = st.room;
    PIN.forEach(function (pn) {
      var op = 0, tx = 0, ty = 0;
      if (pn.s === stanza && m < 0.35) {
        var lon = pn.lon * D2R, lat = pn.lat * D2R, d = [Math.cos(lat) * Math.sin(lon), Math.sin(lat), -Math.cos(lat) * Math.cos(lon)];
        var cy = Math.cos(yaw * D2R), sy = Math.sin(yaw * D2R), cp = Math.cos(pit * D2R), sp = Math.sin(pit * D2R);
        var x1 = d[0] * cy + d[2] * sy, z1 = -d[0] * sy + d[2] * cy, y2 = d[1] * cp + z1 * sp, z2 = -d[1] * sp + z1 * cp;
        var th = Math.acos(clamp(-z2, -1, 1)), lim = (m + 1) * Math.PI / 2 * 0.98;
        if (th < lim && th < half * 1.15) {
          var r = (m + 1) * Math.tan(th / (m + 1)), l = Math.hypot(x1, y2) || 1, px = (r / s) * x1 / l, py = (r / s) * y2 / l;
          tx = ((px / asp) + 1) / 2 * W; ty = (1 - (py + 1) / 2) * H;
          if (tx > 30 && tx < W - 30 && ty > 80 && ty < H - 60) op = Math.min(1, (corrente - pn.da) / 0.03) * Math.min(1, (pn.a - corrente) / 0.02);
          pn.el.classList.toggle('sx', tx > W - 260);
        }
      }
      pn.el.style.opacity = Math.max(0, op); pn.el.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)'; pn.el.style.pointerEvents = op > 0.4 ? 'auto' : 'none';
    });

    if (stanza !== stanzaOra) {
      stanzaOra = stanza; nomeStanza.textContent = ROOMS[stanza].nome; sottoStanza.textContent = 'Seaside Resort · Trieste — ' + (stanza + 1) + ' di ' + tot;
      chapBtns.forEach(function (b, i) { b.classList.toggle('on', i === stanza); });
    }
    var introO = 1 - smooth(clamp((corrente - 0.012) / 0.05, 0, 1));
    titolo.style.opacity = (m > 0.5 || introO > 0.12) ? 0 : 1;
    intro.style.opacity = introO; intro.style.transform = 'translate3d(0,' + (-(1 - introO) * 30) + 'px,0)'; intro.style.pointerEvents = introO > 0.5 ? 'auto' : 'none';
    var n = smooth(clamp((corrente - 0.965) / 0.03, 0, 1));
    finale.style.opacity = n; finale.style.transform = 'translate3d(0,' + ((1 - n) * 24) + 'px,0)'; finale.style.pointerEvents = n > 0.6 ? 'auto' : 'none';
    guida.style.opacity = (mosso || corrente > 0.12) ? 0 : 1;
    riprendi.classList.toggle('si', corrente > 0.08 && Math.abs(uYaw) + Math.abs(uPit) > 6);
    disegnaRadar(yaw, g.half, m, stanza);
  }

  /* bussola */
  var radar = $('radar'), rc = radar.getContext('2d');
  function disegnaRadar(yaw, half, m, stanza) {
    var S = radar.width, c = S / 2, R = c - 6; rc.clearRect(0, 0, S, S);
    radar.style.opacity = m > 0.4 ? 0 : 1; if (m > 0.4) return;
    rc.lineWidth = 2; rc.strokeStyle = 'rgba(243,237,226,.85)'; rc.beginPath(); rc.arc(c, c, R, 0, Math.PI * 2); rc.stroke();
    var asp = tela.clientWidth / tela.clientHeight, halfH = Math.atan(Math.tan(half * D2R) * asp), a0 = (yaw - 90) * D2R;
    rc.fillStyle = 'rgba(243,237,226,.38)'; rc.beginPath(); rc.moveTo(c, c); rc.arc(c, c, R, a0 - halfH, a0 + halfH); rc.closePath(); rc.fill();
    PIN.forEach(function (pn) { if (pn.s !== stanza) return; var a = (pn.lon - 90) * D2R; rc.fillStyle = '#f3ede2'; rc.beginPath(); rc.arc(c + Math.cos(a) * R * 0.72, c + Math.sin(a) * R * 0.72, pn.porta ? 11 : 8, 0, Math.PI * 2); rc.fill(); });
    rc.fillStyle = '#f3ede2'; rc.beginPath(); rc.arc(c, c, 6, 0, Math.PI * 2); rc.fill();
  }
  radar.addEventListener('click', function (e) {
    var b = radar.getBoundingClientRect(), dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
    var lon = Math.atan2(dx, -dy) / D2R, g = guidato(corrente); tYaw = wrap180(lon - g.yaw - gYaw); mosso = true;
  });
  window.addEventListener('keydown', function (e) {
    if (!visibile) return;
    var k = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 6], ArrowDown: [0, -6] }[e.key]; if (!k) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') return;   // su/giù restano allo scroll normale
    tYaw += k[0]; tPit += k[1]; mosso = true; e.preventDefault();
  });

  /* scroll animato: i pulsanti capitolo e le porte fanno percorrere alla scena il tragitto completo */
  function vaiA(pFine, durata) {
    var totPx = percorso.offsetHeight - window.innerHeight, y0 = window.scrollY, y1 = percorso.offsetTop + pFine * totPx, t0 = performance.now();
    if (bloccato) { corrente = bersaglio = pFine; tYaw = tPit = uYaw = uPit = 0; dirty = true; return; }
    animaScroll = function (now) {
      var t = clamp((now - t0) / durata, 0, 1); window.scrollTo(0, y0 + (y1 - y0) * smooth(t));
      if (t < 1) requestAnimationFrame(animaScroll); else animaScroll = null;
    }; requestAnimationFrame(animaScroll);
  }
  PIN.forEach(function (pn) {
    pn.el.addEventListener('click', function () {
      mosso = true;
      if (pn.porta !== undefined) { tYaw = tPit = 0; vaiA(pn.porta, 3400); return; }
      var g = guidato(corrente); tYaw = wrap180(pn.lon - g.yaw - gYaw); tPit = pn.lat - g.pit - gPit;
    });
  });
  riprendi.addEventListener('click', function () { tYaw = 0; tPit = 0; });
  var vai = document.querySelectorAll('[data-vai-tour]');
  Array.prototype.forEach.call(vai, function (a) { a.addEventListener('click', function (e) { e.preventDefault(); vaiA(parseFloat(a.getAttribute('data-vai-tour')), 2600); }); });

  /* giroscopio (telefono) */
  function orientamento(e) {
    if (e.alpha == null || e.beta == null) return;
    if (!g0) g0 = { a: e.alpha, b: e.beta };
    var ty = wrap180(g0.a - e.alpha), tp = clamp(e.beta - g0.b, -80, 80);
    gYaw += wrap180(ty - gYaw) * 0.35; gPit += (tp - gPit) * 0.35; dirty = true;
  }
  function accendiGiro() {
    function parti() { g0 = null; window.addEventListener('deviceorientation', orientamento); giroOn = true; giro.classList.add('on'); giro.textContent = 'Giroscopio attivo · tocca per spegnere'; }
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(function (r) { if (r === 'granted') parti(); }).catch(function () {});
    } else parti();
  }
  function spegniGiro() { window.removeEventListener('deviceorientation', orientamento); giroOn = false; gYaw = gPit = 0; giro.classList.remove('on'); giro.textContent = 'Muovi il telefono per guardarti intorno'; dirty = true; }
  if (touch && typeof DeviceOrientationEvent !== 'undefined') giro.classList.add('si');
  giro.addEventListener('click', function () { giroOn ? spegniGiro() : accendiGiro(); });

  /* ------------------------------------------------------------------ ciclo */
  function progresso() { var r = percorso.getBoundingClientRect(); return clamp(-r.top / (r.height - window.innerHeight), 0, 1); }
  function passo() {
    if (!bloccato) {
      bersaglio = progresso(); var vecchio = corrente; corrente += (bersaglio - corrente) * 0.12;
      if (Math.abs(corrente - bersaglio) < 0.0003) corrente = bersaglio;
      if (Math.abs(corrente - vecchio) > 1e-5) dirty = true;
      if (Math.abs(corrente - vecchio) > 0.0004 && !trascino) { tYaw *= 0.94; tPit *= 0.94; }
    }
    if (!bloccato && !trascino && !mosso && corrente < 0.02 && !reduced) { tYaw += 0.10; dirty = true; }   // il pianeta gira piano da solo
    if (!trascino) { vYaw *= 0.90; vPit *= 0.90; if (Math.abs(vYaw) > 0.02 || Math.abs(vPit) > 0.02) { tYaw += vYaw; tPit += vPit; } }
    var dy = tYaw - uYaw, dp = tPit - uPit;
    if (Math.abs(dy) > 0.01 || Math.abs(dp) > 0.01) { uYaw += dy * 0.22; uPit += dp * 0.22; dirty = true; }
    if (dirty) { dirty = false; disegna(); }
  }
  function ciclo() { if (visibile) passo(); requestAnimationFrame(ciclo); }
  new IntersectionObserver(function (e) { visibile = e[0].isIntersecting; if (visibile) dirty = true; }, { rootMargin: '100px' }).observe(percorso);

  /* trascinare con mouse o dito */
  function gradiPerPixel() { return (2 * vista.half) / tela.clientHeight; }
  tela.addEventListener('pointerdown', function (e) { trascino = true; ultimoX = e.clientX; ultimoY = e.clientY; vYaw = vPit = 0; try { tela.setPointerCapture(e.pointerId); } catch (x) {} tela.classList.add('trascino'); });
  tela.addEventListener('pointermove', function (e) {
    if (!trascino || vista.m > 0.6) return; var dx = e.clientX - ultimoX, dy = e.clientY - ultimoY; ultimoX = e.clientX; ultimoY = e.clientY;
    var k = gradiPerPixel(); vYaw = -dx * k; vPit = dy * k; tYaw += vYaw; tPit += vPit; uYaw = tYaw; uPit = tPit; mosso = true; dirty = true; ultimoMov = performance.now();
  });
  function fine() { trascino = false; tela.classList.remove('trascino'); if (performance.now() - ultimoMov > 90) { vYaw = vPit = 0; } }
  tela.addEventListener('pointerup', fine); tela.addEventListener('pointercancel', fine);
  window.addEventListener('resize', misura);

  /* ?p=0.4 blocca il tour a quel punto (per anteprime); riduzione del movimento: una sola vista, trascinabile */
  var qp = QS('p', null);
  if (qp !== null) { bloccato = true; corrente = bersaglio = qp; document.body.classList.add('foto'); carico.style.display = 'none'; }
  else if (reduced) { bloccato = true; corrente = bersaglio = 0.12; document.body.classList.add('foto'); }
  requestAnimationFrame(ciclo);
  window.__setP = function (p) { corrente = bersaglio = p; dirty = true; if (!bloccato) window.scrollTo(0, percorso.offsetTop + p * (percorso.offsetHeight - window.innerHeight)); return p; };
  window.__tour = { vaiA: vaiA, get p() { return corrente; } };
})();
