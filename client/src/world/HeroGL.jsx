import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer, EffectPass, RenderPass, BloomEffect, KernelSize } from 'postprocessing';
import { nebulaVert, nebulaFrag } from '../sky/nebulaShader';
import './HeroGL.css';

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A WebGL hero that renders one of two worlds and swaps contents on toggle.
export default function HeroGL({ world }) {
  const mountRef = useRef(null);
  const buildRef = useRef(null);   // (world) => void
  const builtRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    let W = mount.clientWidth || window.innerWidth;
    let H = mount.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0); // transparent — the CSS world backdrop shows through
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, W / H, 0.1, 3000);
    camera.position.set(0, 0, 420);
    const tex = glowTexture();

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e) => { pointer.tx = (e.clientX / window.innerWidth - 0.5); pointer.ty = (e.clientY / window.innerHeight - 0.5); };
    window.addEventListener('pointermove', onMove);

    let current = null; // active world object

    // ---------- SPACE ----------
    function buildSpace() {
      const group = new THREE.Group();
      const trash = [];

      // starfield (three parallax layers)
      [[2000, 820, 1.5, 0.7], [1100, 460, 2.3, 0.85], [520, 240, 3.8, 1]].forEach(([n, spread, size, op]) => {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          pos[i * 3] = (Math.random() - 0.5) * spread * 2.4;
          pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 1.5;
          pos[i * 3 + 2] = -Math.random() * spread - 30;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ size, map: tex, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xcdd6ff });
        const pts = new THREE.Points(geo, mat); group.add(pts); trash.push(geo, mat);
      });

      // nebula shader plane
      const nebMat = new THREE.ShaderMaterial({
        vertexShader: nebulaVert, fragmentShader: nebulaFrag,
        transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false,
        uniforms: { uTime: { value: 0 }, uC1: { value: new THREE.Color('#38bdf8') }, uC2: { value: new THREE.Color('#f472b6') }, uC3: { value: new THREE.Color('#34d399') } },
      });
      const nebGeo = new THREE.PlaneGeometry(2800, 1700);
      const neb = new THREE.Mesh(nebGeo, nebMat); neb.position.z = -420; neb.renderOrder = -1;
      group.add(neb); trash.push(nebGeo, nebMat);

      // glowing game-star nodes
      const nodes = [];
      const anchors = [[-168, 48, 10], [150, 78, -20], [-104, -86, 20], [182, -54, -10], [18, -118, 0], [-10, 120, -30]];
      const cols = ['#38bdf8', '#f472b6', '#34d399', '#f7941d', '#a78bfa', '#38bdf8'];
      anchors.forEach(([x, y, z], i) => {
        const m = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(cols[i]), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
        const s = new THREE.Sprite(m); s.position.set(x, y, z); s.scale.setScalar(26 + Math.random() * 10);
        group.add(s); trash.push(m);
        const hot = new THREE.SpriteMaterial({ map: tex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
        const hs = new THREE.Sprite(hot); hs.position.copy(s.position); hs.scale.setScalar(s.scale.x * 0.4);
        group.add(hs); trash.push(hot);
        nodes.push({ s, hs, base: s.scale.x, phase: Math.random() * 6 });
      });

      scene.add(group);
      scene.fog = new THREE.FogExp2(0x05060f, 0.0014);

      const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new EffectPass(camera, new BloomEffect({ intensity: 1.45, luminanceThreshold: 0.15, luminanceSmoothing: 0.3, mipmapBlur: true, radius: 0.72, kernelSize: KernelSize.HUGE })));

      let intro = 0;
      return {
        kind: 'space',
        update: (t, dt) => {
          intro = Math.min(1, intro + dt / 2.2);
          nebMat.uniforms.uTime.value = t;
          group.rotation.y = t * 0.01;
          camera.position.x += (pointer.x * 46 - camera.position.x) * 0.04;
          camera.position.y += (-pointer.y * 30 - camera.position.y) * 0.04;
          camera.position.z += (THREE.MathUtils.lerp(520, 420, 1 - Math.pow(1 - intro, 3)) - camera.position.z) * 0.05;
          camera.lookAt(0, 0, 0);
          nodes.forEach((n, i) => {
            const k = n.base * (1 + 0.08 * Math.sin(t * 1.4 + n.phase));
            n.s.scale.setScalar(k); n.hs.scale.setScalar(k * 0.4);
            n.s.position.y += Math.sin(t * 0.6 + i) * 0.02;
            n.hs.position.y = n.s.position.y;
          });
        },
        render: (dt) => composer.render(dt),
        dispose: () => { scene.remove(group); scene.fog = null; composer.dispose(); trash.forEach((o) => o.dispose && o.dispose()); },
      };
    }

    // ---------- ARCADE ----------
    function buildArcade() {
      const group = new THREE.Group();
      const trash = [];
      scene.fog = null;

      const amb = new THREE.AmbientLight(0xffffff, 1.0);
      const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(4, 6, 5);
      const rim = new THREE.DirectionalLight(0xffd2a8, 0.5); rim.position.set(-5, -2, 3);
      scene.add(amb, key, rim);

      const geoms = [
        new THREE.IcosahedronGeometry(16, 0),
        new THREE.TorusGeometry(12, 4.6, 18, 44),
        new THREE.SphereGeometry(14, 32, 32),
        new THREE.ConeGeometry(12, 22, 32),
        new THREE.DodecahedronGeometry(15, 0),
        new THREE.CapsuleGeometry(7, 12, 8, 16),
      ];
      const cols = [0xff5ca8, 0xff8a3d, 0x18b7b7, 0x7b5cff, 0xffd23f, 0x3ec5ff];
      const shapes = [];
      for (let i = 0; i < 13; i++) {
        const g = geoms[i % geoms.length];
        const m = new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.38, metalness: 0.04 });
        const mesh = new THREE.Mesh(g, m);
        mesh.position.set((Math.random() - 0.5) * 420, (Math.random() - 0.5) * 300, -60 - Math.random() * 220);
        mesh.rotation.set(Math.random() * 6, Math.random() * 6, 0);
        mesh.scale.setScalar(0.7 + Math.random() * 0.8);
        group.add(mesh); trash.push(m);
        shapes.push({ mesh, sx: (Math.random() - 0.5) * 0.4, sy: (Math.random() - 0.5) * 0.4, bob: 6 + Math.random() * 10, ph: Math.random() * 6, y0: mesh.position.y });
      }
      geoms.forEach((g) => trash.push(g));

      // confetti points, gently falling
      const N = 240;
      const cgeo = new THREE.BufferGeometry();
      const cpos = new Float32Array(N * 3);
      const speed = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        cpos[i * 3] = (Math.random() - 0.5) * 760;
        cpos[i * 3 + 1] = (Math.random() - 0.5) * 520;
        cpos[i * 3 + 2] = -Math.random() * 260;
        speed[i] = 14 + Math.random() * 26;
      }
      cgeo.setAttribute('position', new THREE.BufferAttribute(cpos, 3));
      const cmat = new THREE.PointsMaterial({ size: 5, map: tex, transparent: true, opacity: 0.9, depthWrite: false, vertexColors: false, color: 0xff8ac0 });
      const confetti = new THREE.Points(cgeo, cmat);
      group.add(confetti); trash.push(cgeo, cmat);

      scene.add(group);

      return {
        kind: 'arcade',
        update: (t, dt) => {
          camera.position.x += (pointer.x * 40 - camera.position.x) * 0.04;
          camera.position.y += (-pointer.y * 26 - camera.position.y) * 0.04;
          camera.position.z += (420 - camera.position.z) * 0.05;
          camera.lookAt(0, 0, 0);
          shapes.forEach((s) => {
            s.mesh.rotation.x += s.sx * dt; s.mesh.rotation.y += s.sy * dt;
            s.mesh.position.y = s.y0 + Math.sin(t * 0.7 + s.ph) * s.bob;
          });
          const arr = cgeo.attributes.position.array;
          for (let i = 0; i < N; i++) {
            arr[i * 3 + 1] -= speed[i] * dt;
            arr[i * 3] += Math.sin(t + i) * 0.15;
            if (arr[i * 3 + 1] < -280) arr[i * 3 + 1] = 280;
          }
          cgeo.attributes.position.needsUpdate = true;
        },
        render: () => renderer.render(scene, camera),
        dispose: () => { scene.remove(group); scene.remove(amb); scene.remove(key); scene.remove(rim); trash.forEach((o) => o.dispose && o.dispose()); },
      };
    }

    function build(w) {
      if (current) current.dispose();
      current = w === 'arcade' ? buildArcade() : buildSpace();
      builtRef.current = w;
    }
    buildRef.current = build;
    build(world);

    const clock = new THREE.Clock();
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (document.hidden || !current) return;
      const t = clock.getElapsedTime();
      const dt = Math.min(0.05, clock.getDelta());
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      current.update(t, dt);
      current.render(dt);
    };
    animate();

    const onResize = () => {
      W = mount.clientWidth || window.innerWidth; H = mount.clientHeight || window.innerHeight;
      renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      if (current) current.dispose();
      tex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // swap world contents when the toggle flips (renderer stays alive)
  useEffect(() => {
    if (buildRef.current && builtRef.current && builtRef.current !== world) {
      buildRef.current(world);
    }
  }, [world]);

  return <div className="hero-gl" ref={mountRef} aria-hidden="true" />;
}
