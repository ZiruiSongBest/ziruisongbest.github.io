/* =====================================================================
   Zirui Song — interactive 3D study
   A low-poly room. Every glowing object opens one chapter of the CV.
   Plain Three.js (CDN, no build step). All content lives in index.html.
   ===================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const ACCENT = 0x46d4b1;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => matchMedia('(max-width: 760px)').matches;

/* ---------------------------------------------------------------- dom */
const canvas   = document.getElementById('scene');
const loader   = document.getElementById('loader');
const loadFill = document.getElementById('loader-fill');
const hotspotLayer = document.getElementById('hotspots');
const tooltip  = document.getElementById('tooltip');
const panel    = document.getElementById('panel');
const panelIcon = document.getElementById('panel-icon');
const panelTitle = document.getElementById('panel-title');
const panelBody = document.getElementById('panel-body');
const scrim    = document.getElementById('scrim');
const hint     = document.getElementById('hud-hint');
const nav      = document.getElementById('hud-nav');
const modeBtn  = document.getElementById('mode-toggle');

/* ------------------------------------------------------- webgl guard */
function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}
if (!webglOK()) {
  document.body.classList.add('flat');
  loader.classList.add('done');
}

/* ------------------------------------------------------------ helpers */
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: opts.rough ?? 0.85, metalness: opts.metal ?? 0.0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    ...(opts.map ? { map: opts.map } : {}),
    ...(opts.flat ? { flatShading: true } : {}),
  });
}
function box(w, h, d, color, opts) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts)); }
function cyl(rt, rb, h, color, seg = 24, opts) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, opts)); }
function sph(r, color, opts, seg = 24) { return new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat(color, opts)); }
function shadowed(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }

/* ------------------------------------------------------ canvas paints */
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* sandstone tiles with small teal inlays — Masdar courtyard floor */
const floorTex = canvasTexture(1024, 1024, (g, w, h) => {
  g.fillStyle = '#d3b487'; g.fillRect(0, 0, w, h);
  const N = 8, s = w / N;
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const tones = ['#d8bb8e', '#cfae7e', '#dcc097', '#d2b283'];
    g.fillStyle = tones[Math.floor(rand() * tones.length)];
    g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
    g.strokeStyle = 'rgba(120,90,55,.16)';
    for (let k = 0; k < 4; k++) {
      const x = i * s + rand() * s, y = j * s + rand() * s;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand() * 26 - 13, y + rand() * 26 - 13); g.stroke();
    }
  }
  g.strokeStyle = 'rgba(110,80,48,.5)'; g.lineWidth = 4;
  for (let i = 0; i <= N; i++) {
    g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke();
    g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke();
  }
  g.fillStyle = '#2e6b5e';                            // teal diamond inlays
  for (let i = 1; i < N; i++) for (let j = 1; j < N; j++) {
    g.save(); g.translate(i * s, j * s); g.rotate(Math.PI / 4); g.fillRect(-7, -7, 14, 14); g.restore();
  }
});
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
floorTex.repeat.set(2, 2);

/* dusk sky dome */
const skyTex = canvasTexture(512, 512, (g, w, h) => {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1c2150'); grad.addColorStop(.5, '#5c3a64');
  grad.addColorStop(.8, '#c96a48'); grad.addColorStop(1, '#f2bd6e');
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    g.globalAlpha = .25 + (i % 6) / 8;
    g.fillStyle = '#fff';
    g.fillRect((i * 131) % w, (i * 59) % (h * .5), 1.6, 1.6);
  }
  g.globalAlpha = 1;
});

/* mashrabiya lattice — drawn as opaque struts on transparent canvas */
const latticeTex = canvasTexture(512, 512, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.strokeStyle = '#4a2f1d'; g.fillStyle = '#4a2f1d';
  const s = 64;
  g.lineWidth = 9;
  for (let x = 0; x <= w; x += s) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 0; y <= h; y += s) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.lineWidth = 6;
  for (let d = -h; d < w + h; d += s) {
    g.beginPath(); g.moveTo(d, 0); g.lineTo(d + h, h); g.stroke();
    g.beginPath(); g.moveTo(d + h, 0); g.lineTo(d, h); g.stroke();
  }
  for (let x = 0; x <= w; x += s) for (let y = 0; y <= h; y += s) {
    g.beginPath(); g.arc(x, y, 11, 0, 7); g.fill();
  }
});

/* warm glow behind the lattice screens */
const glowTex = canvasTexture(128, 256, (g, w, h) => {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#6d3c5e'); grad.addColorStop(.55, '#e07a4f'); grad.addColorStop(1, '#f6c66d');
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
});

/* lit facade for the distant MBZUAI block */
const facadeTex = canvasTexture(512, 256, (g, w, h) => {
  g.fillStyle = '#2c1a36'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(246,198,109,.8)';
  for (let i = 0; i < 12; i++) for (let j = 0; j < 5; j++) {
    if ((i * 7 + j * 5) % 4 === 0) continue;
    g.fillRect(20 + i * 40, 36 + j * 42, 18, 24);
  }
});

/* glowing MBZUAI lettering for the rooftop sign */
const campusSignTex = canvasTexture(512, 96, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.font = '700 56px "Arial"'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#5fe6c3'; g.shadowBlur = 22; g.fillStyle = '#bdfcec';
  g.fillText('M B Z U A I', w / 2, h / 2);
  g.shadowBlur = 8; g.fillText('M B Z U A I', w / 2, h / 2);
});

/* soft radial glow for the setting sun */
const sunGlowTex = canvasTexture(256, 256, (g, w, h) => {
  const r = g.createRadialGradient(128, 128, 10, 128, 128, 126);
  r.addColorStop(0, 'rgba(255,233,173,.9)'); r.addColorStop(.4, 'rgba(255,217,138,.4)'); r.addColorStop(1, 'rgba(255,217,138,0)');
  g.clearRect(0, 0, w, h); g.fillStyle = r; g.fillRect(0, 0, w, h);
});

const screenTex = canvasTexture(512, 330, (g, w, h) => {
  g.fillStyle = '#0b1016'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#10161e'; g.fillRect(0, 0, w, 26);
  for (const [i, c] of ['#ff5f57', '#febc2e', '#28c840'].entries()) {
    g.fillStyle = c; g.beginPath(); g.arc(18 + i * 20, 13, 5.5, 0, 7); g.fill();
  }
  g.font = '600 19px Menlo, monospace';
  const lines = [
    ['$ whoami', '#5fe6c3'],
    ['zirui_song · PhD @ MBZUAI', '#e8eef3'],
    ['$ research --list', '#5fe6c3'],
    ['  › multimodal reasoning', '#9fb2c3'],
    ['  › geolocation', '#9fb2c3'],
    ['  › embodied agents', '#9fb2c3'],
    ['  › trustworthy MLLMs', '#9fb2c3'],
    ['$ status', '#5fe6c3'],
    ['  caffeinated ▌', '#f4b860'],
  ];
  lines.forEach(([t, c], i) => { g.fillStyle = c; g.fillText(t, 16, 58 + i * 30); });
});

/* backlit name plaque above the desk */
function drawPlaque(g, w, h) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#171c26'; g.fillRect(0, 0, w, h);
  const edge = g.createLinearGradient(0, 0, 0, h);                // soft vignette
  edge.addColorStop(0, 'rgba(255,255,255,.07)'); edge.addColorStop(.5, 'rgba(255,255,255,0)'); edge.addColorStop(1, 'rgba(0,0,0,.25)');
  g.fillStyle = edge; g.fillRect(0, 0, w, h);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 118px "Space Grotesk", "Arial", sans-serif';
  g.shadowColor = '#46d4b1'; g.shadowBlur = 30; g.fillStyle = '#d9f7ec';
  g.fillText('ZIRUI SONG', w / 2, 122);
  g.shadowBlur = 10; g.fillText('ZIRUI SONG', w / 2, 122);
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(244,184,96,.55)'; g.lineWidth = 3;        // rule with diamond
  g.beginPath(); g.moveTo(w * .26, 208); g.lineTo(w * .46, 208); g.stroke();
  g.beginPath(); g.moveTo(w * .54, 208); g.lineTo(w * .74, 208); g.stroke();
  g.save(); g.translate(w / 2, 208); g.rotate(Math.PI / 4); g.fillStyle = '#f4b860'; g.fillRect(-7, -7, 14, 14); g.restore();
  g.font = '500 44px "Space Grotesk", "Arial", sans-serif';
  g.fillStyle = '#caa86b';
  g.fillText('N L P   ·   M B Z U A I', w / 2, 268);
}
const signTex = canvasTexture(1024, 320, drawPlaque);
document.fonts?.ready.then(() => {
  drawPlaque(signTex.image.getContext('2d'), signTex.image.width, signTex.image.height);
  signTex.needsUpdate = true;
});

function diplomaTex(title, sub) {
  return canvasTexture(256, 320, (g, w, h) => {
    g.fillStyle = '#f3ecd9'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#b39b62'; g.lineWidth = 6; g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = '#3c3526'; g.textAlign = 'center';
    g.font = '700 26px Georgia, serif'; g.fillText(title, w / 2, 78);
    g.font = '500 17px Georgia, serif'; g.fillStyle = '#6d6248'; g.fillText(sub, w / 2, 110);
    g.strokeStyle = '#c9bda0'; g.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      g.beginPath(); g.moveTo(46, 150 + i * 20); g.lineTo(w - 46, 150 + i * 20); g.stroke();
    }
    g.fillStyle = '#c9a23c'; g.beginPath(); g.arc(w / 2, 272, 20, 0, 7); g.fill();
    g.fillStyle = '#e3c46a'; g.beginPath(); g.arc(w / 2, 272, 13, 0, 7); g.fill();
  });
}

const globeTex = canvasTexture(512, 256, (g, w, h) => {
  g.fillStyle = '#2a5d7c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(150,240,210,.3)'; g.lineWidth = 1.5;
  for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.fillStyle = '#4d9468';
  const blob = pts => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fill(); };
  blob([[60, 60], [120, 44], [150, 70], [128, 108], [90, 122], [56, 96]]);            // americas-ish
  blob([[96, 132], [126, 128], [140, 168], [118, 206], [98, 178]]);
  blob([[226, 52], [292, 40], [330, 64], [300, 92], [252, 88]]);                      // eurasia-ish
  blob([[300, 64], [392, 56], [430, 84], [380, 110], [330, 96]]);
  blob([[252, 100], [300, 104], [312, 150], [276, 186], [244, 150]]);                 // africa-ish
  blob([[396, 150], [444, 144], [458, 174], [420, 188]]);                             // aus-ish
  g.fillStyle = '#5fae7c';
  blob([[70, 70], [110, 58], [128, 80], [100, 100], [72, 92]]);
});

/* ------------------------------------------------------------- scene */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.32;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2b1c33);
scene.fog = new THREE.Fog(0x2b1c33, 34, 85);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 120);
const HOME_TGT = new THREE.Vector3(-0.6, 2.6, -2.6);
function homePos() {
  // pull back further on narrow screens so the room still fits
  const k = camera.aspect < 0.9 ? 1.35 : 1;
  return new THREE.Vector3(11.6 * k, 7.6 * k, 12.4 * k);
}
camera.position.set(22, 15, 25);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(HOME_TGT);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.zoomToCursor = true;            // dolly toward the pointer, not the centre
controls.minDistance = 5;
controls.maxDistance = 26;
controls.minPolarAngle = 0.32;
controls.maxPolarAngle = 1.46;
controls.minAzimuthAngle = -0.30;
controls.maxAzimuthAngle = 1.35;
controls.enabled = false;

/* lights */
scene.add(new THREE.AmbientLight(0xffffff, 0.38));
scene.add(new THREE.HemisphereLight(0xb3a0d8, 0x5a4030, 1.05));

const fill = new THREE.DirectionalLight(0x9db4e0, 0.5);   // cool fill from the open side
fill.position.set(10, 9, 12);
scene.add(fill);

const sun = new THREE.DirectionalLight(0xffb978, 2.2);
sun.position.set(8, 9.0, -15.5);
sun.target.position.set(1, 0, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -6;
sun.shadow.camera.near = 2; sun.shadow.camera.far = 50;
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);

const lampLight = new THREE.PointLight(0xffc87a, 18, 11, 1.8);
lampLight.position.set(1.0, 3.3, -8.0);
scene.add(lampLight);

const signLight = new THREE.PointLight(ACCENT, 5, 7, 1.8);
signLight.position.set(2.5, 5.5, -8.8);
scene.add(signLight);

/* ------------------------------------------------------------- room */
const room = new THREE.Group();
scene.add(room);

/* desert ground beyond the courtyard */
const under = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), mat(0xbf9c66, { rough: 1 }));
under.rotation.x = -Math.PI / 2; under.position.y = -0.02;
under.receiveShadow = true;
room.add(under);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), mat(0xffffff, { map: floorTex, rough: .9 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
room.add(floor);

/* sandstone walls with real arched openings (Masdar style) */
function archedWall(width, height, thickness, color, arches) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height); shape.lineTo(-width / 2, height); shape.closePath();
  for (const a of arches) {
    const r = a.w / 2, top = a.h - r;
    const hole = new THREE.Path();
    hole.moveTo(a.x - r, 0); hole.lineTo(a.x - r, top);
    hole.absarc(a.x, top, r, Math.PI, 0, true);
    hole.lineTo(a.x + r, 0); hole.closePath();
    shape.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  const m = new THREE.Mesh(geo, mat(color, { rough: .95 }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
// back wall: a doorway arch to the desert (NOW) + a lattice arch behind the trophy
const backWall = archedWall(20, 10, 0.35, 0xc9a374, [{ x: 6.5, w: 3.6, h: 6.0 }, { x: -7.6, w: 2.4, h: 5.0 }]);
backWall.position.set(0, 0, -10.1);
// left wall: one lattice arch on the open stretch
const leftWall = archedWall(20, 10, 0.35, 0xc9a374, [{ x: -7.0, w: 2.6, h: 5.5 }]);
leftWall.rotation.y = Math.PI / 2;
leftWall.position.set(-10.1, 0, 0);
room.add(backWall, leftWall);

/* mashrabiya screens inside the lattice arches */
function latticeScreen(wd, ht) {
  const t = latticeTex.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 2);
  t.needsUpdate = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wd, ht),
    new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.45, side: THREE.DoubleSide, roughness: .8 }));
  m.castShadow = true;
  m.userData.noGlow = true;
  return m;
}
const screenBack = latticeScreen(2.5, 5.1); screenBack.position.set(-7.6, 2.5, -9.93);
const screenLeft = latticeScreen(2.7, 5.6); screenLeft.rotation.y = Math.PI / 2; screenLeft.position.set(-9.93, 2.75, 7);
room.add(screenBack, screenLeft);

/* warm dusk glowing through the screens */
function archGlow(wd, ht) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wd, ht),
    new THREE.MeshBasicMaterial({ map: glowTex, fog: false, side: THREE.DoubleSide }));
  m.userData.noGlow = true;
  return m;
}
const glowBack = archGlow(3.0, 5.5); glowBack.position.set(-7.6, 2.6, -10.4);
const glowLeft = archGlow(3.2, 6.0); glowLeft.rotation.y = Math.PI / 2; glowLeft.position.set(-10.42, 2.9, 7);
scene.add(glowBack, glowLeft);

/* dusk sky dome + skyline backdrop past the doorway */
const dome = new THREE.Mesh(
  new THREE.SphereGeometry(46, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.53),
  new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, toneMapped: false }));
scene.add(dome);
/* 3-D desert backdrop past the doorway — landmarks stand free, sky shows through */
const backdrop = new THREE.Group();
{
  const ink = 0x32203e;
  for (const [x, z, sx, sy, sz] of [[3, -19, 9, 1.1, 4], [14, -23, 12, 1.4, 5], [-7, -19, 8, 1.0, 4]]) {
    const dune = sph(1, 0xc9a76e, { rough: 1 }, 24);
    dune.scale.set(sx, sy, sz); dune.position.set(x, -0.15, z);
    backdrop.add(dune);
  }
  // MBZUAI campus block with lit facade + rooftop sign
  const blockA = box(5.2, 3.2, 1.8, ink); blockA.position.set(6.5, 1.6, -16.6);
  const blockB = box(3.6, 0.9, 1.6, ink); blockB.position.set(6.5, 3.65, -16.7);
  const facade = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 2.9),
    new THREE.MeshBasicMaterial({ map: facadeTex, toneMapped: false }));
  facade.position.set(6.5, 1.6, -15.69);
  const campusSign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.6),
    new THREE.MeshBasicMaterial({ map: campusSignTex, transparent: true, toneMapped: false }));
  campusSign.position.set(6.5, 3.67, -15.88);
  backdrop.add(blockA, blockB, facade, campusSign);
  // Masdar wind tower
  const tower = cyl(0.9, 1.5, 6.2, ink, 4);
  tower.rotation.y = Math.PI / 4; tower.position.set(12.6, 3.1, -18.5);
  const crown = box(2.5, 0.5, 2.5, ink); crown.position.set(12.6, 6.5, -18.5);
  backdrop.add(tower, crown);
  // knowledge-centre dome on the horizon
  const farDome = new THREE.Mesh(new THREE.SphereGeometry(2.1, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(ink, { rough: 1 }));
  farDome.position.set(17, 0, -20);
  backdrop.add(farDome);
  // the setting sun
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(2.1, 40),
    new THREE.MeshBasicMaterial({ color: 0xffe9ad, fog: false, toneMapped: false }));
  sunDisc.position.set(9.5, 3.6, -38);
  const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(13, 13),
    new THREE.MeshBasicMaterial({ map: sunGlowTex, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
  sunGlow.position.set(9.5, 3.8, -38.05);
  backdrop.add(sunDisc, sunGlow);
}
scene.add(backdrop);

/* rug */
const rug = new THREE.Group();
const r1 = cyl(3.5, 3.5, 0.04, 0xa75b3e, 40); r1.position.y = 0.02;
const r2 = cyl(2.7, 2.7, 0.045, 0xe8d9bd, 40); r2.position.y = 0.025;
const r3 = cyl(1.8, 1.8, 0.05, 0x2e6b5e, 40); r3.position.y = 0.03;
rug.add(r1, r2, r3); rug.position.set(-1.3, 0, -1.6);
rug.traverse(m => { if (m.isMesh) { m.receiveShadow = true; m.userData.noGlow = true; } });
room.add(rug);

/* ===================================================== furniture ==== */
const WOOD = 0x8a5a36, WOOD_D = 0x6e4527, PAPER = 0xf2ecdd;

/* ---- desk + laptop + lamp (ABOUT) ---- */
function buildDesk() {
  const g = new THREE.Group();
  const top = box(3.8, 0.16, 1.8, WOOD); top.position.y = 2.2;
  g.add(top);
  for (const [dx, dz] of [[-1.72, -.72], [1.72, -.72], [-1.72, .72], [1.72, .72]]) {
    const leg = box(0.16, 2.14, 0.16, WOOD_D); leg.position.set(dx, 1.07, dz); g.add(leg);
  }
  const rail = box(3.4, 0.5, 0.1, WOOD_D); rail.position.set(0, 1.8, -0.7); g.add(rail);

  // laptop
  const lap = new THREE.Group();
  const kbd = box(1.15, 0.06, 0.78, 0x39424e, { rough: .5, metal: .55 }); kbd.position.y = 0.03; lap.add(kbd);
  const lid = new THREE.Group();
  const lidBack = box(1.15, 0.74, 0.05, 0x39424e, { rough: .5, metal: .55 }); lidBack.position.y = 0.37; lid.add(lidBack);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 0.64),
    new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.set(0, 0.37, 0.028); lid.add(screen);
  lid.position.z = -0.36; lid.rotation.x = 0.32;
  lap.add(lid);
  lap.position.set(-0.1, 2.28, 0.06);
  lap.userData.lid = lid;
  g.add(lap);

  // desk lamp
  const lamp = new THREE.Group();
  const lb = cyl(0.22, 0.28, 0.08, 0x2c3340); lb.position.y = 0.04; lamp.add(lb);
  const a1 = cyl(0.035, 0.035, 0.9, 0x2c3340); a1.position.set(0.12, 0.5, 0); a1.rotation.z = -0.35; lamp.add(a1);
  const a2 = cyl(0.035, 0.035, 0.7, 0x2c3340); a2.position.set(0.42, 1.0, 0); a2.rotation.z = 0.9; lamp.add(a2);
  const head = cyl(0.16, 0.26, 0.3, 0x2c3340); head.position.set(0.68, 1.06, 0); head.rotation.z = 2.0; lamp.add(head);
  const bulb = sph(0.1, 0xffe8b0, { emissive: 0xffd98a, emissiveIntensity: 2.4 }); bulb.position.set(0.78, 0.98, 0);
  bulb.userData.noGlow = true; lamp.add(bulb);
  lamp.position.set(-1.5, 2.28, -0.3);
  g.add(lamp);

  // mug + papers
  const mug = cyl(0.13, 0.11, 0.26, 0xc96f4a); mug.position.set(1.3, 2.41, 0.15); g.add(mug);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 10, 18), mat(0xc96f4a));
  handle.position.set(1.45, 2.41, 0.15); handle.rotation.y = Math.PI / 2; g.add(handle);
  for (let i = 0; i < 3; i++) {
    const sheet = box(0.62, 0.012, 0.85, PAPER, { rough: 1 });
    sheet.position.set(0.95 - i * 0.04, 2.3 + i * 0.013, -0.25);
    sheet.rotation.y = -0.2 + i * 0.16; g.add(sheet);
  }
  const bk1 = box(0.7, 0.12, 0.5, 0x3d6b8e); bk1.position.set(-1.45, 2.34, 0.45); bk1.rotation.y = .3;
  const bk2 = box(0.66, 0.1, 0.46, 0x9e4a4a); bk2.position.set(-1.42, 2.45, 0.43); bk2.rotation.y = .18;
  g.add(bk1, bk2);

  g.position.set(2.5, 0, -8.2);
  return shadowed(g);
}
const desk = buildDesk();
room.add(desk);

/* office chair (decor) */
function buildChair() {
  const g = new THREE.Group();
  const seat = box(1.0, 0.12, 0.95, 0x35404e); seat.position.y = 1.18; g.add(seat);
  const back = box(0.95, 1.05, 0.1, 0x35404e); back.position.set(0, 1.85, 0.48); back.rotation.x = 0.1; g.add(back);
  const pole = cyl(0.05, 0.05, 0.65, 0x222831); pole.position.y = 0.85; g.add(pole);
  const baseS = cyl(0.45, 0.5, 0.07, 0x222831, 5); baseS.position.y = 0.5; g.add(baseS);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const wheel = sph(0.07, 0x14181d); wheel.position.set(Math.cos(a) * 0.48, 0.42, Math.sin(a) * 0.48); g.add(wheel);
  }
  g.position.set(2.3, 0, -6.55); g.rotation.y = Math.PI + 0.25;
  return shadowed(g);
}
room.add(buildChair());

/* ---- backlit name plaque above the desk (decor) ---- */
const plaqueFrame = box(3.94, 1.5, 0.16, 0x8a6248);
plaqueFrame.position.set(2.5, 5.62, -9.72);
plaqueFrame.castShadow = true;
const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.66, 1.16),
  new THREE.MeshBasicMaterial({ map: signTex, transparent: true, toneMapped: false }));
sign.position.set(2.5, 5.62, -9.63);
const underglow = box(3.66, 0.05, 0.08, 0x46d4b1, { emissive: 0x46d4b1, emissiveIntensity: 2.2 });
underglow.position.set(2.5, 4.83, -9.66);
underglow.userData.noGlow = true;
room.add(plaqueFrame, sign, underglow);

/* ---- corkboard (NEWS) ---- */
function buildBoard() {
  const g = new THREE.Group();
  const frame = box(3.4, 2.6, 0.1, WOOD_D); g.add(frame);
  const cork = box(3.14, 2.34, 0.12, 0xc89a6b, { rough: 1 }); cork.position.z = 0.02; g.add(cork);
  const noteColors = [0xfff3b0, 0xbde0fe, 0xffc8dd, 0xcaffbf, 0xffd6a5, 0xf1f1f1, 0xa8e6e2];
  const spots = [[-1.05, 0.7], [-0.1, 0.78], [0.95, 0.62], [-0.95, -0.15], [0.15, -0.08], [1.05, -0.3], [-0.25, -0.85]];
  spots.forEach(([x, y], i) => {
    const n = box(0.62, 0.62, 0.02, noteColors[i % noteColors.length], { rough: 1 });
    n.position.set(x, y, 0.09); n.rotation.z = ((i * 47) % 20 - 10) / 70;
    const pin = sph(0.045, [0xd64545, 0x3567b0, 0x2e8b57][i % 3], { rough: .4 });
    pin.position.set(x, y + 0.26, 0.12);
    g.add(n, pin);
  });
  const head = box(1.15, 0.3, 0.025, 0xd64545); head.position.set(-1.0, 0.7, 0.105); head.rotation.z = 0.06;
  g.add(head);
  g.position.set(-3.5, 4.7, -9.66);
  return g;
}
room.add(buildBoard());

/* ---- doorway arch dressing (NOW) ---- */
function buildArchDressing() {
  const g = new THREE.Group();
  const stone = 0xb5905e;
  for (const sgn of [-1, 1]) {
    const pil = box(0.46, 4.2, 0.46, stone); pil.position.set(sgn * 2.04, 2.1, 0); g.add(pil);
    const cap = box(0.66, 0.2, 0.66, 0x8a6248); cap.position.set(sgn * 2.04, 4.3, 0); g.add(cap);
  }
  const key = box(0.46, 0.62, 0.28, 0x8a6248);
  key.position.set(0, 6.08, 0); key.rotation.z = Math.PI / 4; g.add(key);
  const thresh = box(4.3, 0.07, 0.85, stone); thresh.position.set(0, 0.035, 0.05); g.add(thresh);
  g.position.set(6.5, 0, -9.72);
  return shadowed(g);
}
room.add(buildArchDressing());

/* ---- bookshelf (PUBLICATIONS) ---- */
function buildShelf() {
  const g = new THREE.Group();
  const W = 4.6, H = 6.6, D = 1.05;
  const side1 = box(D, H, 0.14, WOOD_D); side1.position.set(0, H / 2, -W / 2);
  const side2 = box(D, H, 0.14, WOOD_D); side2.position.set(0, H / 2, W / 2);
  const backP = box(0.1, H, W, 0x5b3d24); backP.position.set(-D / 2 + 0.05, H / 2, 0);
  const topP = box(D, 0.14, W, WOOD_D); topP.position.set(0, H - 0.07, 0);
  g.add(side1, side2, backP, topP);
  const spineCols = [0x9e4a4a, 0x3d6b8e, 0x2e8b57, 0xc9a23c, 0x7d5ba6, 0xc96f4a, 0x4a8e8b, 0xb05476, 0x6b8e3d, 0x8a6248];
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let s = 0; s < 4; s++) {
    const shelfY = 0.55 + s * 1.62;
    const board = box(D, 0.12, W - 0.2, WOOD); board.position.set(0, shelfY - 0.06, 0); g.add(board);
    let z = -W / 2 + 0.3;
    while (z < W / 2 - 0.45) {
      const bw = 0.16 + rand() * 0.16, bh = 0.9 + rand() * 0.5, bd = 0.62 + rand() * 0.22;
      if (rand() > 0.86) { z += 0.3; continue }                  // gaps
      const b = box(bd, bh, bw, spineCols[Math.floor(rand() * spineCols.length)], { rough: .9 });
      const lean = rand() > 0.88 ? 0.12 : 0;
      b.position.set(0.06, shelfY + bh / 2, z + bw / 2); b.rotation.x = lean;
      g.add(b); z += bw + 0.035;
    }
    if (s === 2) {                                               // a lying stack
      const st = box(0.7, 0.1, 0.5, 0xc9a23c); st.position.set(0.1, shelfY + 0.05, W / 2 - 0.75);
      const st2 = box(0.66, 0.1, 0.46, 0x9e4a4a); st2.position.set(0.1, shelfY + 0.15, W / 2 - 0.77); st2.rotation.y = 0.12;
      g.add(st, st2);
    }
  }
  g.position.set(-9.2, 0, -2.6);
  return shadowed(g);
}
room.add(buildShelf());

/* ---- globe (RESEARCH) ---- */
let globeSphere;
function buildGlobe() {
  const g = new THREE.Group();
  const legBase = cyl(0.75, 0.95, 0.16, WOOD_D); legBase.position.y = 0.08; g.add(legBase);
  const pole = cyl(0.07, 0.07, 1.3, 0x8a6248); pole.position.y = 0.8; g.add(pole);
  const fork = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.05, 10, 40, Math.PI),
    mat(0xc9a23c, { metal: .6, rough: .35 }));
  fork.position.y = 2.6; fork.rotation.z = Math.PI / 2 + 0.42; g.add(fork);
  globeSphere = new THREE.Mesh(new THREE.SphereGeometry(1.05, 40, 40), mat(0xffffff, { map: globeTex, rough: .7 }));
  globeSphere.position.y = 2.6; globeSphere.rotation.z = 0.41;
  // glowing geolocation pins
  for (const [u, v] of [[.22, .42], [.55, .3], [.62, .55], [.8, .68], [.38, .62], [.5, .47]]) {
    const pin = sph(0.045, 0xffe9ad, { emissive: 0xffc34d, emissiveIntensity: 2.6 }, 10);
    pin.userData.noGlow = true;
    const phi = v * Math.PI, theta = u * Math.PI * 2;
    pin.position.setFromSphericalCoords(1.07, phi, theta);
    globeSphere.add(pin);
  }
  g.add(globeSphere);
  g.position.set(-5.6, 0, -6.4);
  return shadowed(g);
}
room.add(buildGlobe());

/* ---- diplomas + cap (EDUCATION) ---- */
function buildEducation() {
  const g = new THREE.Group();
  const f1 = new THREE.Group();
  const fr1 = box(0.08, 1.7, 1.34, 0x6e4a2c); f1.add(fr1);
  const in1 = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 1.54), mat(0xffffff, { map: diplomaTex('Ph.D.', 'MBZUAI · 2029'), rough: .9 }));
  in1.rotation.y = Math.PI / 2; in1.position.x = 0.05; f1.add(in1);
  f1.position.set(0, 0.35, -0.85);
  const f2 = new THREE.Group();
  const fr2 = box(0.08, 1.7, 1.34, 0x6e4a2c); f2.add(fr2);
  const in2 = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 1.54), mat(0xffffff, { map: diplomaTex('B.E. (Hons)', 'UTS · First Class'), rough: .9 }));
  in2.rotation.y = Math.PI / 2; in2.position.x = 0.05; f2.add(in2);
  f2.position.set(0, 0.35, 0.85);
  g.add(f1, f2);
  // shelf + graduation cap
  const shelfB = box(0.7, 0.1, 2.4, WOOD); shelfB.position.set(0.3, -0.95, 0); g.add(shelfB);
  const cap = new THREE.Group();
  const capBase = cyl(0.3, 0.34, 0.26, 0x23262e); capBase.position.y = 0.13;
  const boardT = box(0.95, 0.06, 0.95, 0x23262e); boardT.position.y = 0.3; boardT.rotation.y = 0.5;
  const btn = sph(0.04, 0xc9a23c); btn.position.y = 0.35;
  cap.add(capBase, boardT, btn);
  const tassel = cyl(0.018, 0.018, 0.5, 0xc9a23c); tassel.position.set(0.42, 0.12, 0.18); tassel.rotation.z = 0.18;
  const tEnd = sph(0.045, 0xc9a23c); tEnd.position.set(0.46, -0.14, 0.18);
  cap.add(tassel, tEnd);
  cap.position.set(0.3, -0.9, -0.1);
  g.add(cap);
  g.position.set(-9.7, 4.9, 2.9);
  return g;
}
room.add(buildEducation());

/* ---- wall clock (decor, real time) ---- */
let hourHand, minHand;
function buildClock() {
  const g = new THREE.Group();
  const body = cyl(0.85, 0.85, 0.12, 0x6e4a2c, 36); body.rotation.z = Math.PI / 2; g.add(body);
  const face = cyl(0.74, 0.74, 0.14, 0xf2ecdd, 36); face.rotation.z = Math.PI / 2; face.position.x = 0.01; g.add(face);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const tick = box(0.025, 0.12, 0.02, 0x3c3526);
    tick.position.set(0.09, Math.cos(a) * 0.62, Math.sin(a) * 0.62);
    tick.rotation.x = -a; g.add(tick);
  }
  hourHand = box(0.02, 0.34, 0.035, 0x23262e); hourHand.geometry.translate(0, 0.17, 0); hourHand.position.x = 0.1;
  minHand = box(0.02, 0.5, 0.025, 0x9e4a4a); minHand.geometry.translate(0, 0.25, 0); minHand.position.x = 0.12;
  g.add(hourHand, minHand);
  g.position.set(-9.68, 7.3, -5.6);
  return g;
}
room.add(buildClock());

/* ---- trophy pedestal (AWARDS) ---- */
function buildAwards() {
  const g = new THREE.Group();
  const ped = box(1.5, 2.6, 1.5, 0x8a6248); ped.position.y = 1.3; g.add(ped);
  const pedTop = box(1.7, 0.12, 1.7, WOOD_D); pedTop.position.y = 2.66; g.add(pedTop);
  const gold = { metal: .85, rough: .25 };
  const tr = new THREE.Group();
  const tb = cyl(0.3, 0.38, 0.12, 0xc9a23c, 24, gold); tb.position.y = 0.06; tr.add(tb);
  const stem = cyl(0.06, 0.1, 0.34, 0xc9a23c, 16, gold); stem.position.y = 0.3; tr.add(stem);
  const cup = cyl(0.34, 0.14, 0.45, 0xe3c46a, 24, gold); cup.position.y = 0.68; tr.add(cup);
  for (const sgn of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 10, 22, Math.PI * 1.2), mat(0xe3c46a, gold));
    ear.position.set(sgn * 0.36, 0.72, 0); ear.rotation.z = sgn * -0.5; tr.add(ear);
  }
  tr.position.set(-0.18, 2.72, -0.1); g.add(tr);
  // medal on a small stand
  const medal = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.05, 12, 26), mat(0xd0d4dc, { metal: .9, rough: .3 }));
  medal.position.set(0.45, 2.95, 0.28);
  const ribbon = box(0.12, 0.34, 0.02, 0xd64545); ribbon.position.set(0.45, 3.2, 0.27); ribbon.rotation.x = -0.1;
  const stand = box(0.5, 0.5, 0.07, WOOD_D); stand.position.set(0.45, 2.95, 0.34); stand.rotation.x = -0.12;
  g.add(stand, medal, ribbon);
  g.position.set(-8.3, 0, -8.3);
  return shadowed(g);
}
room.add(buildAwards());

/* ---- briefcase (EXPERIENCE) ---- */
function buildBriefcase() {
  const g = new THREE.Group();
  const bodyB = box(1.5, 1.05, 0.45, 0x8a5230, { rough: .6 }); bodyB.position.y = 0.55; g.add(bodyB);
  const lidLip = box(1.5, 0.1, 0.47, 0x6e4023); lidLip.position.y = 0.78; g.add(lidLip);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 10, 22, Math.PI), mat(0x4a2f18));
  hd.position.y = 1.12; g.add(hd);
  for (const sgn of [-1, 1]) {
    const clasp = box(0.12, 0.1, 0.03, 0xc9a23c, { metal: .8, rough: .3 });
    clasp.position.set(sgn * 0.5, 0.8, 0.24); g.add(clasp);
  }
  const tag = box(0.22, 0.3, 0.02, 0xe8d9bd); tag.position.set(0.62, 0.5, 0.25); tag.rotation.z = -0.15; g.add(tag);
  g.position.set(5.15, 0, -6.9); g.rotation.y = -0.5; g.rotation.z = 0.0;
  return shadowed(g);
}
room.add(buildBriefcase());

/* ---- filing cabinet + review trays (SERVICE) ---- */
function buildService() {
  const g = new THREE.Group();
  const cab = box(1.4, 2.6, 1.2, 0x4a5568, { rough: .6, metal: .25 }); cab.position.y = 1.3; g.add(cab);
  for (let i = 0; i < 3; i++) {
    const drawer = box(1.24, 0.66, 0.06, 0x3b4454); drawer.position.set(0, 0.62 + i * 0.78, 0.61); g.add(drawer);
    const hndl = box(0.5, 0.07, 0.05, 0xc9ccd4, { metal: .7, rough: .3 }); hndl.position.set(0, 0.62 + i * 0.78 + 0.18, 0.65); g.add(hndl);
    const label = box(0.3, 0.18, 0.05, 0xe8d9bd); label.position.set(-0.35, 0.62 + i * 0.78 - 0.1, 0.64); g.add(label);
  }
  // paper trays on top
  for (let t = 0; t < 2; t++) {
    const tray = new THREE.Group();
    const tb = box(0.95, 0.05, 0.7, 0x2c3340); tb.position.y = 0.025; tray.add(tb);
    for (const sgn of [-1, 1]) {
      const side = box(0.05, 0.2, 0.7, 0x2c3340); side.position.set(sgn * 0.45, 0.1, 0); tray.add(side);
    }
    const stack = box(0.78, 0.1 + t * 0.05, 0.6, PAPER); stack.position.y = 0.12; tray.add(stack);
    tray.position.set(-0.15, 2.6 + t * 0.26, 0.05);
    g.add(tray);
  }
  // big red stamp
  const stampH = cyl(0.1, 0.13, 0.22, 0x9e2b2b); stampH.position.set(0.52, 2.74, -0.25);
  const stampK = sph(0.09, 0x6e1f1f); stampK.position.set(0.52, 2.9, -0.25);
  g.add(stampH, stampK);
  g.position.set(8.95, 0, -8.6);
  return shadowed(g);
}
room.add(buildService());

/* ---- phone table (CONTACT) ---- */
function buildPhone() {
  const g = new THREE.Group();
  const top = cyl(0.75, 0.75, 0.1, WOOD, 28); top.position.y = 1.5; g.add(top);
  const pole = cyl(0.07, 0.07, 1.45, WOOD_D); pole.position.y = 0.75; g.add(pole);
  const foot = cyl(0.45, 0.55, 0.08, WOOD_D, 28); foot.position.y = 0.04; g.add(foot);
  const phone = new THREE.Group();
  const pb = box(0.62, 0.3, 0.5, 0xb33939, { rough: .4 }); pb.position.y = 0.15; phone.add(pb);
  const dial = cyl(0.16, 0.16, 0.05, 0xe8d9bd, 24); dial.position.set(0, 0.31, 0.1); dial.rotation.x = 0.35; phone.add(dial);
  const dialC = cyl(0.05, 0.05, 0.06, 0x23262e, 16); dialC.position.set(0, 0.33, 0.1); dialC.rotation.x = 0.35; phone.add(dialC);
  const hs = new THREE.Group();
  const hbar = box(0.5, 0.07, 0.12, 0x8e2c2c); hbar.position.y = 0.06; hs.add(hbar);
  for (const sgn of [-1, 1]) {
    const cupE = cyl(0.09, 0.07, 0.12, 0x8e2c2c); cupE.position.set(sgn * 0.25, 0.02, 0); hs.add(cupE);
  }
  hs.position.y = 0.38; phone.add(hs);
  const cord = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 20, Math.PI * 1.5), mat(0x8e2c2c));
  cord.position.set(0.34, 0.12, 0.18); cord.rotation.y = 1.2; phone.add(cord);
  phone.position.y = 1.55; phone.rotation.y = -0.7;
  g.add(phone);
  g.position.set(6.6, 0, -4.4);
  return shadowed(g);
}
room.add(buildPhone());

/* ---- coffee table + notebook (BLOG) ---- */
function buildBlogTable() {
  const g = new THREE.Group();
  const top = cyl(1.5, 1.5, 0.12, WOOD, 32); top.position.y = 1.0; g.add(top);
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + 0.5;
    const leg = cyl(0.06, 0.06, 1.0, WOOD_D); leg.position.set(Math.cos(a) * 0.95, 0.5, Math.sin(a) * 0.95);
    leg.rotation.z = Math.cos(a) * 0.12; leg.rotation.x = -Math.sin(a) * 0.12; g.add(leg);
  }
  const nb = new THREE.Group();
  const cover = box(0.85, 0.07, 1.1, 0x2e6b5e, { rough: .6 }); cover.position.y = 0.035; nb.add(cover);
  const pages = box(0.79, 0.055, 1.04, PAPER); pages.position.y = 0.07; nb.add(pages);
  const band = box(0.07, 0.075, 1.1, 0xc9a23c); band.position.set(0.28, 0.04, 0); nb.add(band);
  nb.position.set(-0.3, 1.06, 0.1); nb.rotation.y = 0.45; g.add(nb);
  const pen = cyl(0.022, 0.022, 0.5, 0x23262e, 10); pen.position.set(0.45, 1.09, -0.35);
  pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.6; g.add(pen);
  const mug2 = cyl(0.12, 0.1, 0.24, 0x3d6b8e); mug2.position.set(0.7, 1.18, 0.45); g.add(mug2);
  g.position.set(-1.3, 0, -1.6);
  return shadowed(g);
}
room.add(buildBlogTable());

/* ---- palms (decor) ---- */
function buildPalm(k = 1, potted = true) {
  const g = new THREE.Group();
  let y0 = 0;
  if (potted) {
    const pot = cyl(0.5 * k, 0.38 * k, 0.85 * k, 0xc96f4a); pot.position.y = 0.42 * k; g.add(pot);
    const soil = cyl(0.45 * k, 0.45 * k, 0.06 * k, 0x3a2a20); soil.position.y = 0.83 * k; g.add(soil);
    y0 = 0.85 * k;
  }
  for (let i = 0; i < 5; i++) {
    const seg = cyl(0.1 * k * (1 - i * 0.08), 0.13 * k * (1 - i * 0.08), 0.52 * k, 0x8a6248);
    seg.position.set(Math.sin(i * 0.22) * 0.12 * k, y0 + (i + 0.5) * 0.48 * k, 0);
    seg.rotation.z = 0.05 * i;
    g.add(seg);
  }
  const topY = y0 + 5 * 0.48 * k, topX = Math.sin(4 * 0.22) * 0.12 * k;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const frond = sph(0.95 * k, i % 2 ? 0x3f8f5f : 0x2e7b4e, { rough: .85 });
    frond.scale.set(1, 0.07, 0.2);
    frond.position.set(topX + Math.cos(a) * 0.78 * k, topY + 0.16 * k, Math.sin(a) * 0.78 * k);
    frond.rotation.y = -a;
    frond.rotation.z = -0.3 - (i % 3) * 0.13;
    g.add(frond);
  }
  for (const [dx, dz] of [[0.14, 0.06], [-0.1, 0.12]]) {
    const coco = sph(0.09 * k, 0x6e4a2c); coco.position.set(topX + dx * k, topY - 0.06 * k, dz * k); g.add(coco);
  }
  return shadowed(g);
}
const plant = buildPalm(0.9, true);
plant.position.set(8.7, 0, -2.0);
room.add(plant);
const outdoorPalm = buildPalm(1.6, false);
outdoorPalm.position.set(5.9, -0.02, -12.8);
scene.add(outdoorPalm);
const outdoorPalm2 = buildPalm(1.0, false);
outdoorPalm2.position.set(9.6, -0.02, -13.8);
outdoorPalm2.rotation.y = 2.1;
scene.add(outdoorPalm2);

/* ---- standing lantern (decor) ---- */
function buildLantern() {
  const g = new THREE.Group();
  const base = cyl(0.3, 0.36, 0.1, 0x3c3526); base.position.y = 0.05; g.add(base);
  const body = cyl(0.26, 0.34, 0.78, 0xc9a23c, 6, { metal: .7, rough: .35 }); body.position.y = 0.55; g.add(body);
  const core = cyl(0.18, 0.24, 0.66, 0xffd98a, 6, { emissive: 0xffc34d, emissiveIntensity: 1.6 });
  core.position.y = 0.55; core.userData.noGlow = true; g.add(core);
  const cap = cyl(0.06, 0.3, 0.3, 0xc9a23c, 6, { metal: .7, rough: .35 }); cap.position.y = 1.08; g.add(cap);
  const knob = sph(0.06, 0xc9a23c, { metal: .7, rough: .3 }); knob.position.y = 1.28; g.add(knob);
  g.position.set(8.55, 0, -6.1);
  shadowed(g);
  g.traverse(m => { if (m.isMesh) m.userData.noGlow = true; });
  return g;
}
room.add(buildLantern());
const lanternLight = new THREE.PointLight(0xffc34d, 4, 6, 1.9);
lanternLight.position.set(8.55, 1.0, -6.1);
scene.add(lanternLight);

/* ---------------------------------------------------------- dust ---- */
const dustGeo = new THREE.BufferGeometry();
const DUST = 140;
const dustPos = new Float32Array(DUST * 3);
for (let i = 0; i < DUST; i++) {
  dustPos[i * 3] = Math.random() * 18 - 9;
  dustPos[i * 3 + 1] = Math.random() * 7 + 0.3;
  dustPos[i * 3 + 2] = Math.random() * 18 - 9;
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
  color: 0xffd9a0, size: 0.05, transparent: true, opacity: 0.55, sizeAttenuation: true, depthWrite: false,
}));
scene.add(dust);

/* ====================================================== stations ==== */
/* Each station: an invisible hit volume + an HTML hotspot + camera framing. */
const stations = [
  { id: 'about',        label: 'About Me',        hit: [2.4, 2.6, -8.2, 2.4, 1.8, 1.6], anchor: [2.4, 3.6, -8.2],  cam: [2.4, 3.8, -4.2],  tgt: [2.4, 2.5, -8.3] },
  { id: 'news',         label: 'News',            hit: [-3.5, 4.7, -9.7, 3.5, 2.7, 0.5], anchor: [-3.5, 6.3, -9.55], cam: [-3.5, 4.9, -5.4], tgt: [-3.5, 4.7, -9.7] },
  { id: 'publications', label: 'Publications',    hit: [-9.3, 3.3, -2.6, 1.4, 6.7, 4.7], anchor: [-8.6, 6.9, -2.6], cam: [-4.4, 4.3, -2.6], tgt: [-9.5, 3.7, -2.6] },
  { id: 'research',     label: 'Research · Globe', hit: [-5.6, 1.9, -6.4, 2.4, 4.0, 2.4], anchor: [-5.6, 4.1, -6.4], cam: [-3.0, 3.9, -3.6], tgt: [-5.8, 2.7, -6.6] },
  { id: 'education',    label: 'Education',       hit: [-9.8, 4.7, 2.9, 0.9, 3.3, 2.8], anchor: [-9.5, 6.5, 2.9],  cam: [-5.0, 4.8, 2.9],  tgt: [-9.9, 4.4, 2.9] },
  { id: 'blog',         label: 'Blog & Notes',    hit: [5.15, 0.7, -6.9, 1.9, 1.6, 1.1], anchor: [5.15, 1.7, -6.9], cam: [4.7, 2.7, -3.2],  tgt: [5.15, 0.9, -7.0] },
  { id: 'awards',       label: 'Honors & Awards', hit: [-8.3, 1.7, -8.3, 1.9, 3.6, 1.9], anchor: [-8.3, 3.9, -8.3], cam: [-4.6, 3.9, -4.6], tgt: [-8.4, 2.6, -8.4] },
  { id: 'service',      label: 'Academic Service', hit: [8.95, 1.6, -8.6, 1.7, 3.4, 1.5], anchor: [8.95, 3.5, -8.6], cam: [6.8, 3.9, -4.4],  tgt: [9.0, 2.2, -8.7] },
  { id: 'experience',   label: 'Experience',      hit: [-1.3, 0.7, -1.6, 3.2, 1.5, 3.2], anchor: [-1.3, 1.8, -1.6], cam: [-1.3, 4.9, 1.9],  tgt: [-1.4, 0.9, -1.8] },
  { id: 'now',          label: 'Now · the doorway', hit: [6.5, 3.1, -9.85, 4.0, 6.2, 0.9], anchor: [6.5, 6.7, -9.5],  cam: [6.5, 4.4, -3.4],  tgt: [6.5, 3.7, -9.9] },
  { id: 'contact',      label: 'Contact',         hit: [6.6, 1.2, -4.4, 1.7, 2.6, 1.7], anchor: [6.6, 2.6, -4.4],  cam: [6.0, 3.3, -0.7],  tgt: [6.7, 1.5, -4.5] },
];

const hitMeshes = [];
for (const st of stations) {
  const [x, y, z, w, h, d] = st.hit;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  m.position.set(x, y, z);
  m.userData.station = st;
  scene.add(m);
  hitMeshes.push(m);
  st.hitMesh = m;

  const dot = document.createElement('button');
  dot.className = 'hotspot';
  dot.setAttribute('aria-label', st.label);
  dot.addEventListener('click', e => { e.stopPropagation(); openStation(st.id); });
  dot.addEventListener('pointerenter', () => setHover(st, true));
  dot.addEventListener('pointerleave', () => setHover(st, false));
  hotspotLayer.appendChild(dot);
  st.dot = dot;
  st.anchorV = new THREE.Vector3(...st.anchor);

  // collect glowable meshes near the station for hover highlight
  st.glowMats = [];
  st.glow = 0;
}

/* map station → furniture group for glow + register materials */
const stationGroups = {};
(function assignGlow() {
  const centers = stations.map(s => ({ s, c: new THREE.Vector3(s.hit[0], s.hit[1], s.hit[2]), r: Math.max(s.hit[3], s.hit[4], s.hit[5]) * 0.9 + 0.6 }));
  room.traverse(m => {
    if (!m.isMesh || m.userData.noGlow) return;
    if (m === floor || m === backWall || m === leftWall || m === under) return;
    const p = new THREE.Vector3(); m.getWorldPosition(p);
    let best = null, bd = 1e9;
    for (const { s, c, r } of centers) {
      const d = p.distanceTo(c);
      if (d < r && d < bd) { best = s; bd = d; }
    }
    if (best && m.material && m.material.emissive) {
      best.glowMats.push(m.material);
    }
  });
})();

/* ------------------------------------------------------ interaction */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null;
let panelStation = null;
let freeCam = null;            // camera state to restore on close
let tween = null;
let introDone = false;

function setHover(st, on) {
  if (on) {
    if (hovered && hovered !== st) setHover(hovered, false);
    hovered = st;
    document.body.style.cursor = 'pointer';
    st.dot.classList.add('hot');
    showTooltip(st);
  } else if (hovered === st) {
    hovered = null;
    document.body.style.cursor = '';
    st.dot.classList.remove('hot');
    tooltip.classList.remove('show');
  }
}

function showTooltip(st) {
  const v = st.anchorV.clone().project(camera);
  tooltip.textContent = st.label;
  tooltip.style.left = (v.x * 0.5 + 0.5) * innerWidth + 'px';
  tooltip.style.top = (-v.y * 0.5 + 0.5) * innerHeight + 'px';
  tooltip.classList.add('show');
}

canvas.addEventListener('pointermove', e => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  if (panelStation || !introDone) return;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(hitMeshes, false)[0];
  if (hit) setHover(hit.object.userData.station, true);
  else if (hovered) setHover(hovered, false);
});

let downAt = null;
canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', e => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
  downAt = null;
  if (moved > 7 || panelStation || !introDone) return;
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(hitMeshes, false)[0];
  if (hit) openStation(hit.object.userData.station.id);
});

/* --------------------------------------------------------- camera -- */
function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function flyTo(pos, tgt, dur = 1.25, onDone) {
  if (reduceMotion) dur = 0.001;
  tween = {
    p0: camera.position.clone(), p1: new THREE.Vector3(...pos),
    t0: controls.target.clone(), t1: new THREE.Vector3(...tgt),
    t: 0, dur, onDone,
  };
  controls.enabled = false;
}

function updateTween(dt) {
  if (!tween) return;
  tween.t += dt / tween.dur;
  const k = easeInOut(Math.min(tween.t, 1));
  camera.position.lerpVectors(tween.p0, tween.p1, k);
  controls.target.lerpVectors(tween.t0, tween.t1, k);
  if (tween.t >= 1) {
    const done = tween.onDone; tween = null;
    if (done) done();
  }
}

/* shift the focus framing so the subject is not hidden behind the panel */
function framedFor(st) {
  const pos = new THREE.Vector3(...st.cam);
  const tgt = new THREE.Vector3(...st.tgt);
  if (isMobile()) {
    const down = 2.1;                       // bottom sheet → push subject up
    pos.y -= down * 0.25; tgt.y -= down;
  } else {
    const dir = tgt.clone().sub(pos).normalize();
    const right = dir.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
    pos.addScaledVector(right, 1.25); tgt.addScaledVector(right, 1.25);
  }
  return [pos.toArray(), tgt.toArray()];
}

/* ----------------------------------------------------------- panel -- */
function openStation(id, pushHash = true) {
  const st = stations.find(s => s.id === id);
  const sec = document.getElementById('content-' + id);
  if (!sec) return;
  if (hovered) setHover(hovered, false);

  document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
  sec.classList.add('active');
  panelIcon.textContent = sec.dataset.icon;
  panelTitle.textContent = sec.dataset.title;
  panelBody.scrollTop = 0;

  nav.querySelectorAll('button[data-target]').forEach(b =>
    b.classList.toggle('active', b.dataset.target === id));

  if (document.body.classList.contains('flat')) {
    sec.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    return;
  }

  introDone = true;                       // an early click simply ends the intro
  if (!panelStation && !tween) freeCam = { p: camera.position.clone(), t: controls.target.clone() };
  if (!freeCam) freeCam = { p: homePos(), t: HOME_TGT.clone() };
  panelStation = st;
  document.body.classList.add('panel-open');
  panel.classList.add('open');
  scrim.classList.add('show');
  hint.classList.add('faded');
  if (st) {
    const [pos, tgt] = framedFor(st);
    flyTo(pos, tgt, 1.25);
  }
  if (pushHash) history.replaceState(null, '', '#' + id);
}

function closePanel() {
  if (!panelStation && !panel.classList.contains('open')) return;
  panelStation = null;
  panel.classList.remove('open');
  scrim.classList.remove('show');
  document.body.classList.remove('panel-open');
  nav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  history.replaceState(null, '', location.pathname);
  if (freeCam) flyTo(freeCam.p.toArray(), freeCam.t.toArray(), 1.0, () => { controls.enabled = true; });
  else controls.enabled = true;
}

document.getElementById('panel-close').addEventListener('click', closePanel);
scrim.addEventListener('click', closePanel);
addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

nav.addEventListener('click', e => {
  const b = e.target.closest('button[data-target]');
  if (b) openStation(b.dataset.target);
});

modeBtn.addEventListener('click', () => {
  const flat = document.body.classList.toggle('flat');
  modeBtn.textContent = flat ? '3D' : '2D';
  if (flat) { panel.classList.remove('open'); scrim.classList.remove('show'); panelStation = null; document.body.classList.remove('panel-open'); }
  else { document.querySelectorAll('.content').forEach(c => c.classList.remove('active')); closePanel(); }
});

/* -------------------------------------------------------- hotspots -- */
const occRay = new THREE.Raycaster();
let occFrame = 0;
function updateHotspots() {
  occFrame++;
  for (const st of stations) {
    const v = st.anchorV.clone().project(camera);
    const off = v.z > 1 || panelStation;
    st.dot.classList.toggle('hidden', !!off || !introDone);
    if (off) continue;
    st.dot.style.left = (v.x * 0.5 + 0.5) * innerWidth + 'px';
    st.dot.style.top = (-v.y * 0.5 + 0.5) * innerHeight + 'px';
    if (occFrame % 7 === 0) {                 // cheap occlusion test
      const dir = st.anchorV.clone().sub(camera.position);
      const dist = dir.length();
      occRay.set(camera.position, dir.normalize());
      occRay.far = dist - 0.4;
      const blockers = occRay.intersectObjects([backWall, leftWall, ...room.children], true);
      st.dot.classList.toggle('behind', blockers.length > 0);
    }
  }
  if (hovered) showTooltip(hovered);
}

/* ---------------------------------------------------------- loader -- */
let loadPct = 0;
const loadTimer = setInterval(() => {
  loadPct = Math.min(100, loadPct + 14 + Math.random() * 18);
  loadFill.style.width = loadPct + '%';
  if (loadPct >= 100) {
    clearInterval(loadTimer);
    setTimeout(beginIntro, 250);
  }
}, 110);

function beginIntro() {
  loader.classList.add('done');
  if (document.body.classList.contains('flat')) { introDone = true; return; }
  flyTo(homePos().toArray(), HOME_TGT.toArray(), reduceMotion ? 0.001 : 2.4, () => {
    controls.enabled = true;
    introDone = true;
    const id = location.hash.slice(1);
    if (id && stations.some(s => s.id === id)) openStation(id, false);
    setTimeout(() => hint.classList.add('faded'), 9000);
  });
}

/* ---------------------------------------------------------- render -- */
const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  step();
}
/* dtForce lets tests pump frames while the tab is backgrounded (rAF paused) */
function step(dtForce) {
  if (document.body.classList.contains('flat')) return;
  const dt = dtForce !== undefined ? dtForce : Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  updateTween(dt);
  if (controls.enabled) controls.update();

  if (globeSphere) globeSphere.rotation.y += dt * 0.25;
  sign.material.opacity = 0.92 + Math.sin(t * 2.2) * 0.08;
  lampLight.intensity = 17.4 + Math.sin(t * 7.3) * 0.5 + Math.sin(t * 13.7) * 0.3;
  plant.rotation.z = Math.sin(t * 0.8) * 0.012;

  if (hourHand && minHand) {
    const now = new Date();
    const mins = now.getMinutes() + now.getSeconds() / 60;
    const hrs = (now.getHours() % 12) + mins / 60;
    // hands rotate around X axis (clock faces +x on the left wall)
    minHand.rotation.x = -(mins / 60) * Math.PI * 2;
    hourHand.rotation.x = -(hrs / 12) * Math.PI * 2;
  }

  const dp = dust.geometry.attributes.position;
  for (let i = 0; i < DUST; i++) {
    let y = dp.getY(i) + dt * 0.12;
    if (y > 7.5) y = 0.3;
    dp.setY(i, y);
    dp.setX(i, dp.getX(i) + Math.sin(t * 0.6 + i) * dt * 0.05);
  }
  dp.needsUpdate = true;

  // hover glow
  for (const st of stations) {
    const target = (hovered === st && !panelStation) ? 1 : 0;
    st.glow += (target - st.glow) * Math.min(1, dt * 9);
    if (st.glow > 0.005) {
      for (const m of st.glowMats) { m.emissive.setHex(ACCENT); m.emissiveIntensity = st.glow * 0.17; }
    } else if (st.glow !== 0) {
      for (const m of st.glowMats) m.emissiveIntensity = 0;
    }
  }

  updateHotspots();
  renderer.render(scene, camera);
  window.__dbg = { introDone, tween: !!tween, cam: camera.position.toArray().map(n => +n.toFixed(2)), t: +clock.elapsedTime.toFixed(1) };
}
tick();
window.__step = step;

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
