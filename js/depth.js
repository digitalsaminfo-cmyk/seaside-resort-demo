/* Parallasse 3D da mappa di profondità: la foto reale si "apre" in profondità seguendo mouse/dito, scroll e una lenta deriva.
   <div class="depth" data-img="assets/img/22.webp" data-depth="assets/depth/22.webp" data-force="1"></div> */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var els = Array.prototype.slice.call(document.querySelectorAll('.depth'));
  if (!els.length) return;

  var VS = 'attribute vec2 a; varying vec2 v; void main(){ v = a * .5 + .5; gl_Position = vec4(a, 0., 1.); }';
  var FS = [
    'precision highp float; varying vec2 v;',
    'uniform sampler2D uC, uD; uniform vec2 uOff, uAsp; uniform float uT, uZoom, uForce;',
    'void main(){',
    '  vec2 uv = vec2(v.x, 1. - v.y);',
    '  vec2 c = (uv - .5) * uAsp / uZoom + .5;',                              // cover + zoom
    '  vec2 off = uOff * uForce;',
    '  float d1 = texture2D(uD, c).r;',
    '  vec2 c1 = c + off * (d1 - .45);',
    '  float d2 = texture2D(uD, c1).r;',
    '  vec2 c2 = c + off * (d2 - .45);',
    '  float far = smoothstep(.34, .0, d2);',                               // il mare e il cielo (lontano) hanno un leggero luccichio
    '  c2.x += far * .0016 * sin(c2.y * 90. + uT * 1.4);',
    '  vec3 col = texture2D(uC, clamp(c2, .002, .998)).rgb;',
    '  col += far * .035 * vec3(.9, .95, 1.) * (.5 + .5 * sin(c2.x * 140. - uT * 2. + c2.y * 60.));',
    '  float vg = smoothstep(1.15, .35, length(v - .5) * 1.25);',
    '  gl_FragColor = vec4(col * mix(.82, 1., vg), 1.);',
    '}'
  ].join('\n');

  function mk(gl, t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(x)); return x; }
  function tex(gl, unit, img) {
    var t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  function load(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }

  els.forEach(function (el) {
    var cv = document.createElement('canvas'); el.appendChild(cv);
    var fb = document.createElement('img'); fb.src = el.getAttribute('data-img'); fb.alt = el.getAttribute('data-alt') || ''; fb.className = 'depth-fb'; el.insertBefore(fb, cv);
    var gl = cv.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return;
    var pr = gl.createProgram(); gl.attachShader(pr, mk(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(pr, mk(gl, gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var la = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 0, 0);
    var u = {}; ['uC', 'uD', 'uOff', 'uAsp', 'uT', 'uZoom', 'uForce'].forEach(function (n) { u[n] = gl.getUniformLocation(pr, n); });
    var force = parseFloat(el.getAttribute('data-force')) || 1;
    var imgAsp = 1.5, ready = false, vis = false, mx = 0, my = 0, sx = 0, sy = 0, t0 = performance.now();

    Promise.all([load(el.getAttribute('data-img')), load(el.getAttribute('data-depth'))]).then(function (r) {
      imgAsp = r[0].width / r[0].height; tex(gl, 0, r[0]); tex(gl, 1, r[1]); gl.uniform1i(u.uC, 0); gl.uniform1i(u.uD, 1);
      ready = true; el.classList.add('pronto'); size(); frame();
    }).catch(function () {});

    function size() {
      var dpr = Math.min(devicePixelRatio || 1, 1.75), w = el.clientWidth, h = el.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); gl.viewport(0, 0, cv.width, cv.height);
      var ca = w / h, k = ca > imgAsp ? [1, imgAsp / ca] : [ca / imgAsp, 1];   // "cover": scala il lato corto
      gl.uniform2f(u.uAsp, k[0], k[1]);
    }
    addEventListener('resize', function () { if (ready) size(); });
    new IntersectionObserver(function (e) { vis = e[0].isIntersecting; if (vis && ready) frame(); }).observe(el);

    var area = el.closest('[data-depth-area]') || el;
    area.addEventListener('pointermove', function (e) { var r = el.getBoundingClientRect(); mx = ((e.clientX - r.left) / r.width - .5) * 2; my = ((e.clientY - r.top) / r.height - .5) * 2; });
    area.addEventListener('pointerleave', function () { mx = my = 0; });
    addEventListener('deviceorientation', function (e) { if (e.gamma == null) return; mx = Math.max(-1, Math.min(1, e.gamma / 25)); my = Math.max(-1, Math.min(1, (e.beta - 45) / 25)); });

    var run = false;
    function frame() {
      if (run) return; run = true;
      (function loop(now) {
        if (!vis) { run = false; return; }
        var t = (now - t0) / 1000, r = el.getBoundingClientRect(), vh = innerHeight;
        var prog = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));            // 0 → 1 mentre la sezione attraversa lo schermo
        var drift = reduced ? 0 : 1;
        var tx = mx * .035 + Math.sin(t * .35) * .012 * drift, ty = my * .02 + Math.cos(t * .27) * .008 * drift - (prog - .5) * .03;
        sx += (tx - sx) * .06; sy += (ty - sy) * .06;
        gl.uniform2f(u.uOff, sx, sy); gl.uniform1f(u.uT, t); gl.uniform1f(u.uForce, force);
        gl.uniform1f(u.uZoom, 1.12 + (reduced ? 0 : (.5 - Math.abs(prog - .5)) * .16));       // lenta "spinta in avanti" mentre scorri
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(loop);
      })(performance.now());
    }
  });
})();
