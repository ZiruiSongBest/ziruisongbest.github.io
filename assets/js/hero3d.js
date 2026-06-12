/* Cyber HUD 3D hero — neural network scene (Three.js r128) */
(function () {
  'use strict';

  var hero = document.getElementById('hero3d');
  if (!hero) return;
  var canvas = document.getElementById('hero3d-canvas');

  /* ---------- Terminal typing effect ---------- */
  var termEl = document.getElementById('hero-terminal');
  var lines = [
    '> boot neural_interface --user zirui.song',
    '> loading modules: [multimodal] [geolocation] [embodied-agents] [trustworthy-mllm]',
    '> affiliation: MBZUAI · NLP Department · PhD',
    '> status: ONLINE_'
  ];
  function typeLines(i, j) {
    if (!termEl || i >= lines.length) return;
    if (j === 0) {
      var div = document.createElement('div');
      div.className = 'hero-term-line';
      termEl.appendChild(div);
    }
    var cur = termEl.lastChild;
    cur.textContent = lines[i].slice(0, j + 1);
    if (j + 1 < lines[i].length) {
      setTimeout(function () { typeLines(i, j + 1); }, 18 + Math.random() * 30);
    } else {
      setTimeout(function () { typeLines(i + 1, 0); }, 260);
    }
  }
  setTimeout(function () { typeLines(0, 0); }, 600);

  /* ---------- WebGL scene ---------- */
  if (typeof THREE === 'undefined') { hero.classList.add('hero3d--fallback'); return; }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  } catch (e) {
    hero.classList.add('hero3d--fallback');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040111);
  scene.fog = new THREE.FogExp2(0x040111, 0.022);

  var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, 2.2, 19);

  /* Glow sprite texture */
  function glowTexture(r, g, b) {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var ctx = c.getContext('2d');
    var grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',1)');
    grad.addColorStop(0.25, 'rgba(' + r + ',' + g + ',' + b + ',0.6)');
    grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  var texCyan = glowTexture(0, 240, 255);
  var texMagenta = glowTexture(255, 60, 220);
  var texWhite = glowTexture(200, 235, 255);

  /* ----- Neural network ----- */
  var network = new THREE.Group();
  scene.add(network);

  var layerSizes = [6, 10, 13, 10, 6];
  var nodes = [];        // array of layers, each an array of THREE.Vector3
  var li, ni;
  for (li = 0; li < layerSizes.length; li++) {
    var layer = [];
    var x = (li - (layerSizes.length - 1) / 2) * 4.4;
    for (ni = 0; ni < layerSizes[li]; ni++) {
      var y = (ni - (layerSizes[li] - 1) / 2) * 1.7 + (Math.random() - 0.5) * 0.9;
      var z = (Math.random() - 0.5) * 4.5;
      layer.push(new THREE.Vector3(x + (Math.random() - 0.5) * 0.8, y, z));
    }
    nodes.push(layer);
  }

  /* Node sprites */
  var nodeSprites = [];
  nodes.forEach(function (layer, idx) {
    layer.forEach(function (p) {
      var magenta = Math.random() < 0.18;
      var mat = new THREE.SpriteMaterial({
        map: magenta ? texMagenta : texCyan,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.9
      });
      var s = new THREE.Sprite(mat);
      var size = (idx === 0 || idx === nodes.length - 1) ? 0.55 : 0.75;
      size *= 0.8 + Math.random() * 0.6;
      s.scale.set(size, size, 1);
      s.position.copy(p);
      s.userData.phase = Math.random() * Math.PI * 2;
      s.userData.base = size;
      network.add(s);
      nodeSprites.push(s);
    });
  });

  /* Edges */
  var edges = []; // {a: Vector3, b: Vector3}
  var linePositions = [];
  for (li = 0; li < nodes.length - 1; li++) {
    nodes[li].forEach(function (a) {
      var next = nodes[li + 1];
      var k = 2 + Math.floor(Math.random() * 2);
      for (var c = 0; c < k; c++) {
        var b = next[Math.floor(Math.random() * next.length)];
        edges.push({ a: a, b: b });
        linePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    });
  }
  var lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  var lineMat = new THREE.LineBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  network.add(new THREE.LineSegments(lineGeo, lineMat));

  /* Signal pulses traveling along edges */
  var pulses = [];
  var NUM_PULSES = 36;
  for (var pi = 0; pi < NUM_PULSES; pi++) {
    var pm = new THREE.SpriteMaterial({
      map: Math.random() < 0.4 ? texMagenta : texWhite,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    });
    var ps = new THREE.Sprite(pm);
    ps.scale.set(0.35, 0.35, 1);
    network.add(ps);
    pulses.push({
      sprite: ps,
      edge: edges[Math.floor(Math.random() * edges.length)],
      t: Math.random(),
      speed: 0.4 + Math.random() * 0.9
    });
  }

  /* ----- Grid floor ----- */
  var grid = new THREE.GridHelper(160, 80, 0x00f0ff, 0x0a2a3a);
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  grid.position.y = -10.5;
  scene.add(grid);

  /* ----- Particle field ----- */
  var starGeo = new THREE.BufferGeometry();
  var starCount = 550;
  var starPos = new Float32Array(starCount * 3);
  for (var si = 0; si < starCount; si++) {
    starPos[si * 3] = (Math.random() - 0.5) * 120;
    starPos[si * 3 + 1] = (Math.random() - 0.5) * 70;
    starPos[si * 3 + 2] = (Math.random() - 0.5) * 120;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  var stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0x5fbfdf,
    size: 0.12,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  scene.add(stars);

  /* ---------- Interaction & loop ---------- */
  var mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', function (e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  function resize() {
    var w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clock = new THREE.Clock();
  var heroVisible = true;

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
    }, { threshold: 0.01 }).observe(hero);
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!heroVisible) return;
    var dt = clock.getDelta();
    var t = clock.elapsedTime;

    network.rotation.y += dt * 0.08;
    stars.rotation.y -= dt * 0.012;

    camera.position.y += ((mouseY * -1.6 + 2.2) - camera.position.y) * 0.04;
    camera.position.x += ((mouseX * 3.2) - camera.position.x) * 0.04;
    camera.lookAt(0, 0, 0);

    var i;
    for (i = 0; i < nodeSprites.length; i++) {
      var ns = nodeSprites[i];
      var sc = ns.userData.base * (1 + 0.22 * Math.sin(t * 2.1 + ns.userData.phase));
      ns.scale.set(sc, sc, 1);
    }
    for (i = 0; i < pulses.length; i++) {
      var p = pulses[i];
      p.t += dt * p.speed;
      if (p.t >= 1) {
        p.t = 0;
        p.edge = edges[Math.floor(Math.random() * edges.length)];
      }
      p.sprite.position.lerpVectors(p.edge.a, p.edge.b, p.t);
      p.sprite.material.opacity = Math.sin(p.t * Math.PI);
    }

    renderer.render(scene, camera);
  }

  if (reduced) {
    resize();
    renderer.render(scene, camera);
  } else {
    animate();
  }
})();
