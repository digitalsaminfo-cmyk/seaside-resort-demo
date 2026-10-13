/* Visore 360° per appartamento: <div class="viewer" data-rooms='[{"id":"terrazza","nome":"Terrazza","hi":"…","lo":"…","yaw":-30,"pit":2}, …]'>
   Trascina per guardarti intorno; cambiando stanza il panorama si arrotola in un mini-pianeta e si srotola nella nuova stanza. */
(function () {
  'use strict';
  var D2R = Math.PI / 180, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches, touch = matchMedia('(pointer: coarse)').matches;
  var els = Array.prototype.slice.call(document.querySelectorAll('.viewer'));
  if (!els.length) return;
  function smooth(t) { return t * t * (3 - 2 * t); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  var VS = '#version 300 es\nin vec2 a; out vec2 v; void main(){ v = a; gl_Position = vec4(a, 0.0, 1.0); }';
  var FS = '#version 300 es\n' + [
    'precision highp float; in vec2 v; out vec4 o;',
    'uniform sampler2D uA, uB; uniform float uAsp, uYaw, uPit, uM, uS, uMix;',
    'const float PI = 3.14159265359;',
    'void main(){',
    '  vec2 p = v * vec2(uAsp, 1.0); float l = length(p); float r = l * uS;',
    '  float th = (uM + 1.0) * atan(r / (uM + 1.0)); vec2 dir = l > 1e-5 ? p / l : vec2(0.0);',
    '  vec3 c = vec3(sin(th) * dir, -cos(th));',
    '  float cp = cos(uPit), sp = sin(uPit); c = vec3(c.x, c.y * cp - c.z * sp, c.y * sp + c.z * cp);',
    '  float cy = cos(uYaw), sy = sin(uYaw); c = vec3(c.x * cy - c.z * sy, c.y, c.x * sy + c.z * cy);',
    '  float lon = atan(c.x, -c.z), lat = asin(clamp(c.y, -1.0, 1.0));',
    '  vec2 uv = vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);',
    '  vec2 uv2 = vec2(fract(uv.x + 0.5) - 0.5, uv.y);',
    '  float gx1 = dFdx(uv.x), gx2 = dFdx(uv2.x), gy1 = dFdy(uv.x), gy2 = dFdy(uv2.x);',
    '  vec2 gX = vec2(abs(gx1) < abs(gx2) ? gx1 : gx2, dFdx(uv.y)); vec2 gY = vec2(abs(gy1) < abs(gy2) ? gy1 : gy2, dFdy(uv.y));',
    '  vec3 ca = uMix < 1.0 ? textureGrad(uA, uv, gX, gY).rgb : vec3(0.0);',
    '  vec3 cb = uMix > 0.0 ? textureGrad(uB, uv, gX, gY).rgb : vec3(0.0);',
    '  o = vec4(mix(ca, cb, uMix), 1.0);',
    '}'
  ].join('\n');

  els.forEach(function (el) {
    var rooms; try { rooms = JSON.parse(el.getAttribute('data-rooms')); } catch (e) { return; }
    var cv = document.createElement('canvas'); cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', el.getAttribute('data-label') || 'Visore a 360 gradi');
    el.insertBefore(cv, el.firstChild);
    var gl = cv.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) { el.classList.add('no-gl'); return; }
    function sh(t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(x)); return x; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { el.classList.add('no-gl'); return; }
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var la = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ['uA', 'uB', 'uAsp', 'uYaw', 'uPit', 'uM', 'uS', 'uMix'].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
    gl.uniform1i(U.uA, 0); gl.uniform1i(U.uB, 1);

    var hiRes = gl.getParameter(gl.MAX_TEXTURE_SIZE) >= 4096 && !touch;
    var tex = {}, loading = {}, cur = 0, nxt = 0, trans = null;
    var yaw = rooms[0].yaw || 0, pit = rooms[0].pit || 0, tYaw = yaw, tPit = pit, vYaw = 0, vPit = 0, drag = false, lx = 0, ly = 0, touched = false, half = 42, vis = false, run = false, last = 0;

    function load(i) {
      if (tex[i] || loading[i]) return loading[i] || Promise.resolve();
      loading[i] = new Promise(function (res) {
        var im = new Image();
        im.onload = function () {
          var t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im); gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          var an = gl.getExtension('EXT_texture_filter_anisotropic'); if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
          tex[i] = t; res();
        };
        im.onerror = function () { res(); };
        im.src = hiRes ? rooms[i].hi : rooms[i].lo;
      });
      return loading[i];
    }

    /* interfaccia */
    var tabs = document.createElement('div'); tabs.className = 'v-tabs'; tabs.setAttribute('role', 'tablist');
    rooms.forEach(function (r, i) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = r.nome; b.setAttribute('aria-selected', i === 0);
      b.addEventListener('click', function () { go(i); }); tabs.appendChild(b);
    });
    el.appendChild(tabs);
    var hint = document.createElement('p'); hint.className = 'v-hint'; hint.innerHTML = '<span>360°</span> Trascina per guardarti intorno'; el.appendChild(hint);
    var tag = document.createElement('p'); tag.className = 'v-tag'; tag.textContent = 'Ricostruzione 3D digitale'; el.appendChild(tag);
    var spin = document.createElement('div'); spin.className = 'v-load'; spin.textContent = 'Carico il panorama…'; el.appendChild(spin);

    function setTab() { Array.prototype.forEach.call(tabs.children, function (b, i) { b.setAttribute('aria-selected', i === (trans ? trans.to : cur)); }); }
    function go(i) {
      if (i === cur || trans) return;
      load(i).then(function () {
        if (!tex[i]) return;
        trans = { to: i, t0: performance.now(), swapped: false, d: reduced ? 200 : 2200 }; setTab(); touched = true; hint.style.opacity = 0; wake();
      });
    }
    function resize() { var dpr = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr); gl.viewport(0, 0, cv.width, cv.height); }
    addEventListener('resize', function () { resize(); wake(); });

    function frame(now) {
      run = false; if (!vis) return;
      var dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
      var m = 0, mix = 0, a = cur, b = cur;
      if (trans) {
        var t = clamp((now - trans.t0) / trans.d, 0, 1);
        // 0–.38 il panorama si arrotola, .38–.62 scambio al picco, .62–1 si srotola
        m = t < .38 ? smooth(t / .38) : t > .62 ? smooth((1 - t) / .38) : 1;
        if (t >= .5 && !trans.swapped) { trans.swapped = true; yaw = tYaw = rooms[trans.to].yaw || 0; pit = tPit = rooms[trans.to].pit || 0; }
        a = cur; b = trans.to; mix = t < .45 ? 0 : t > .55 ? 1 : smooth((t - .45) / .1);
        if (t >= 1) { cur = trans.to; trans = null; a = b = cur; mix = 0; m = 0; }
        yaw += 120 * dt * (m > .2 ? 1 : 0);       // il pianeta gira mentre si muove
        tYaw += 120 * dt * (m > .2 ? 1 : 0);
      } else if (!touched && !reduced) { tYaw += 2.2 * dt; }
      if (!drag) { vYaw *= .92; vPit *= .92; tYaw += vYaw; tPit += vPit; }
      yaw += (tYaw - yaw) * .18; pit += (tPit - pit) * .18; tPit = clamp(tPit, -80, 85);
      var h = (m > 0 ? 42 + (118 - 42) * m : half) * D2R, mm = m, s = (mm + 1) * Math.tan(h / (mm + 1));
      var pp = m > 0 ? clamp(pit + (88 - pit) * m, -86, 88) : pit;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[a]);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[b]);
      gl.uniform1f(U.uAsp, cv.width / cv.height); gl.uniform1f(U.uYaw, yaw * D2R); gl.uniform1f(U.uPit, pp * D2R);
      gl.uniform1f(U.uM, mm); gl.uniform1f(U.uS, s); gl.uniform1f(U.uMix, mix);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (vis) wake();
    }
    function wake() { if (!run && vis && tex[cur]) { run = true; requestAnimationFrame(frame); } }

    cv.addEventListener('pointerdown', function (e) { if (trans) return; drag = true; lx = e.clientX; ly = e.clientY; vYaw = vPit = 0; touched = true; hint.style.opacity = 0; try { cv.setPointerCapture(e.pointerId); } catch (x) {} cv.classList.add('trascino'); });
    cv.addEventListener('pointermove', function (e) {
      if (!drag) return; var k = (2 * half) / cv.clientHeight, dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      vYaw = -dx * k; vPit = dy * k; tYaw += vYaw; tPit += vPit; yaw = tYaw; pit = tPit; wake();
    });
    function up() { drag = false; cv.classList.remove('trascino'); wake(); }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', function (e) { if (!e.ctrlKey && !e.shiftKey) return; e.preventDefault(); half = clamp(half + e.deltaY * .03, 24, 62); wake(); }, { passive: false });
    el.tabIndex = 0;
    el.addEventListener('keydown', function (e) {
      var k = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] }[e.key]; if (!k) return;
      tYaw += k[0]; tPit += k[1]; touched = true; e.preventDefault(); wake();
    });

    new IntersectionObserver(function (e) {
      vis = e[0].isIntersecting;
      if (vis) { load(0).then(function () { spin.style.opacity = 0; resize(); wake(); setTimeout(function () { rooms.forEach(function (r, i) { if (i) load(i); }); }, 1200); }); }
    }, { rootMargin: '200px' }).observe(el);
  });
})();
