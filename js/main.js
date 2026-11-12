import * as THREE from '../vendor/three.module.min.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 4);

/* =========================================================
   UI: nav, reveals, counters, timeline, progress
   ========================================================= */
const nav = document.getElementById('nav');
const navLinks = document.getElementById('navLinks');
const burger = document.getElementById('burger');
const progressBar = document.getElementById('progressBar');
const timeline = document.getElementById('timeline');
document.getElementById('year').textContent = new Date().getFullYear();

function setMenu(open) {
  navLinks.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
  document.body.style.overflow = open ? 'hidden' : '';
}
burger.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
navLinks.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

// stagger siblings that reveal together
document.querySelectorAll('.stats, .edu, .skills, .contact-grid').forEach((group) => {
  [...group.children].forEach((el, i) => el.style.setProperty('--d', `${i * 110}ms`));
});

function countUp(el) {
  const target = Number(el.dataset.count);
  if (reduceMotion) { el.textContent = target; return; }
  const from = 'plain' in el.dataset ? target - 40 : 0;
  const start = performance.now();
  const dur = 1400;
  (function tick(now) {
    const t = clamp((now - start) / dur);
    el.textContent = Math.round(from + (target - from) * easeOut(t));
    if (t < 1) requestAnimationFrame(tick);
  })(start);
}

const revealObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add('in');
    entry.target.querySelectorAll('[data-count]').forEach(countUp);
    revealObserver.unobserve(entry.target);
  }
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

// active nav link
const linkFor = new Map(
  [...navLinks.querySelectorAll('a')].map((a) => [a.getAttribute('href').slice(1), a])
);
const sectionObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    linkFor.forEach((a) => a.classList.remove('active'));
    linkFor.get(entry.target.id)?.classList.add('active');
  }
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('section[id]').forEach((s) => sectionObserver.observe(s));

let scrollProgress = 0;
let sceneMax = 1;
function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  scrollProgress = max > 0 ? clamp(scrollY / max) : 0;
  progressBar.style.transform = `scaleX(${scrollProgress})`;
  nav.classList.toggle('scrolled', scrollY > 30);

  const r = timeline.getBoundingClientRect();
  timeline.style.setProperty('--fill', clamp((innerHeight * 0.6 - r.top) / r.height).toFixed(3));

  // keep the 3D scene vivid in the hero, calm behind the content
  const dim = clamp(scrollY / (innerHeight * 0.9));
  document.documentElement.style.setProperty('--scene-opacity', (sceneMax * (1 - dim * 0.68)).toFixed(3));
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
onScroll();

/* =========================================================
   Three.js: a twisting tower of timber that assembles on load,
   loosens while you read and comes back together at the end.
   ========================================================= */
function woodTexture(base, dark) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 90; i++) {
    const y = Math.random() * c.height;
    const amp = 1 + Math.random() * 3;
    const phase = Math.random() * Math.PI * 2;
    g.beginPath();
    for (let x = 0; x <= c.width; x += 8) {
      const yy = y + Math.sin(x * 0.012 + phase) * amp;
      x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
    }
    g.strokeStyle = dark;
    g.globalAlpha = 0.06 + Math.random() * 0.22;
    g.lineWidth = 0.5 + Math.random() * 1.6;
    g.stroke();
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function initScene() {
  const canvas = document.getElementById('scene');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return; // no WebGL: CSS gradient background remains
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x14110f, 9, 22);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(0, 0, 11);

  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x1a120c, 0.9));
  const key = new THREE.DirectionalLight(0xffe2b8, 2.6);
  key.position.set(4, 6, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff8a3c, 1.4);
  rim.position.set(-6, -2, -4);
  scene.add(rim);
  const glow = new THREE.PointLight(0xffa550, 30, 14);
  glow.position.set(0, 0, 2.5);
  scene.add(glow);

  const materials = [
    ['#c8935a', '#5a3515'], ['#b47a43', '#4a2a10'], ['#dcae76', '#7a4d22'], ['#8f5a30', '#2e1808'],
  ].map(([base, dark]) => new THREE.MeshStandardMaterial({ map: woodTexture(base, dark), roughness: 0.62, metalness: 0.02 }));

  const tower = new THREE.Group();
  scene.add(tower);

  const COUNT = 58;
  const STEP = 0.15;
  const geometry = new THREE.BoxGeometry(1, 0.13, 0.46);
  const planks = [];
  const euler = new THREE.Euler();
  for (let i = 0; i < COUNT; i++) {
    const mesh = new THREE.Mesh(geometry, materials[i % materials.length]);
    const length = 2.5 + Math.sin(i * 0.55) * 0.55;
    mesh.scale.x = length;

    const home = new THREE.Vector3(0, (i - (COUNT - 1) / 2) * STEP, 0);
    const homeQ = new THREE.Quaternion().setFromEuler(euler.set(0, i * 0.21, 0));

    const angle = Math.random() * Math.PI * 2;
    const radius = 3.5 + Math.random() * 6;
    const away = new THREE.Vector3(Math.cos(angle) * radius, (Math.random() - 0.5) * 13, Math.sin(angle) * radius - 2);
    const awayQ = new THREE.Quaternion().setFromEuler(
      euler.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
    );
    planks.push({ mesh, home, homeQ, away, awayQ, delay: (i / COUNT) * 0.55, seed: Math.random() * 100 });
    tower.add(mesh);
  }

  // floating sawdust
  const DUST = 260;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 22;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 1;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xe0a458, size: 0.035, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(dust);

  let baseX = 0;
  let baseScale = 1;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const wide = w / h > 1.05 && w > 860;
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
    baseX = wide ? halfWidth * 0.5 : halfWidth * 0.8;
    baseScale = wide ? 0.76 : 0.6;
    sceneMax = wide ? 1 : 0.6;
    onScroll();
  }
  addEventListener('resize', resize);
  resize();

  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  const tmpV = new THREE.Vector3();
  let smoothScroll = scrollProgress;
  const t0 = performance.now();
  const INTRO = 2600;

  function frame(now) {
    const time = (now - t0) / 1000;
    const intro = reduceMotion ? 1 : clamp((now - t0) / INTRO);
    smoothScroll += (scrollProgress - smoothScroll) * (reduceMotion ? 1 : 0.07);
    pointer.sx += (pointer.x - pointer.sx) * 0.05;
    pointer.sy += (pointer.y - pointer.sy) * 0.05;

    // 0 = assembled, 1 = fully scattered
    const loosen = Math.sin(Math.PI * smoothScroll) * 0.42;

    for (const p of planks) {
      const local = easeOut(clamp((intro - p.delay) / (1 - 0.55)));
      const k = Math.max(1 - local, loosen);
      p.mesh.position.lerpVectors(p.home, p.away, k);
      p.mesh.quaternion.slerpQuaternions(p.homeQ, p.awayQ, k * 0.85);
      if (!reduceMotion) {
        p.mesh.position.y += Math.sin(time * 0.7 + p.seed) * (0.02 + k * 0.25);
        p.mesh.position.add(tmpV.set(Math.sin(time * 0.4 + p.seed), 0, Math.cos(time * 0.5 + p.seed)).multiplyScalar(k * 0.2));
      }
    }

    tower.position.x = baseX * (1 - clamp(smoothScroll * 4) * 0.25);
    tower.position.y = Math.sin(time * 0.5) * (reduceMotion ? 0 : 0.08);
    tower.scale.setScalar(baseScale);
    tower.rotation.y = (reduceMotion ? 0.6 : time * 0.14) + smoothScroll * Math.PI * 2.2 + pointer.sx * 0.35;
    tower.rotation.x = 0.16 + pointer.sy * 0.12;
    tower.rotation.z = -0.12 + pointer.sx * 0.04;

    camera.position.x = pointer.sx * 0.35;
    camera.position.y = -pointer.sy * 0.25;
    camera.lookAt(0, 0, 0);

    dust.rotation.y = time * 0.015 + smoothScroll * 0.8;
    dust.position.y = smoothScroll * 2;

    renderer.render(scene, camera);
  }

  if (reduceMotion) {
    const renderOnce = () => frame(performance.now());
    renderOnce();
    addEventListener('scroll', renderOnce, { passive: true });
    addEventListener('resize', renderOnce);
  } else {
    let running = true;
    renderer.setAnimationLoop(frame);
    document.addEventListener('visibilitychange', () => {
      const visible = !document.hidden;
      if (visible === running) return;
      running = visible;
      renderer.setAnimationLoop(visible ? frame : null);
    });
  }
}

initScene();
