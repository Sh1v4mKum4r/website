import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CLUSTERS } from './games';
import { drawMotif } from './motifs';

// a soft radial dot, reused for stars, glows and nebulae
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.65)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 3D anchors per cluster give the constellation real depth
const ANCHORS = {
  strategy: new THREE.Vector3(-115, -8, 0),
  word: new THREE.Vector3(28, -72, 46),
  party: new THREE.Vector3(118, 52, -46),
};

export default function SkyGL({ stars, onSelect, onHover }) {
  const mountRef = useRef(null);
  const overlayRef = useRef(null);
  const starsRef = useRef(stars);
  starsRef.current = stars;

  useEffect(() => {
    const mount = mountRef.current;
    const overlay = overlayRef.current;
    let W = mount.clientWidth || window.innerWidth;
    let H = mount.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x05060f, 1);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05060f, 0.0016);
    const camera = new THREE.PerspectiveCamera(58, W / H, 0.1, 3000);
    camera.position.set(0, 0, 620); // starts far — flies in

    const tex = glowTexture();
    const clusterColor = (c) => new THREE.Color((CLUSTERS[c] && CLUSTERS[c].color) || '#38bdf8');

    // --- deep starfield (three layers of points for depth) ---
    const fieldGroup = new THREE.Group();
    [[2600, 900, 1.1, 0.5], [1500, 500, 1.8, 0.7], [700, 260, 3.2, 0.9]].forEach(([n, spread, size, op]) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (Math.random() - 0.5) * spread * 2.4;
        pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 1.5;
        pos[i * 3 + 2] = -Math.random() * spread - 40;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ size, map: tex, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xcdd6ff });
      fieldGroup.add(new THREE.Points(geo, mat));
    });
    scene.add(fieldGroup);

    // --- nebulae: big additive glows at each cluster ---
    const nebulae = [];
    for (const [key, anchor] of Object.entries(ANCHORS)) {
      const m = new THREE.SpriteMaterial({ map: tex, color: clusterColor(key), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
      const s = new THREE.Sprite(m);
      s.position.copy(anchor).setZ(anchor.z - 30);
      s.scale.setScalar(420);
      scene.add(s); nebulae.push(s);
    }

    // --- game stars: a bloom core + an animated motif, laid out in a ring per cluster ---
    const byCluster = {};
    starsRef.current.forEach((g) => (byCluster[g.cluster] = byCluster[g.cluster] || []).push(g));
    const nodes = [];           // { game, group, core, motifCanvas, motifTex, label }
    const pickables = [];
    for (const [key, list] of Object.entries(byCluster)) {
      const anchor = ANCHORS[key] || new THREE.Vector3();
      const col = clusterColor(key);
      const n = list.length;
      const R = n <= 1 ? 0 : 42 + n * 4;
      list.forEach((g, i) => {
        const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
        const p = new THREE.Vector3(anchor.x + Math.cos(ang) * R, anchor.y + Math.sin(ang) * R, anchor.z + (Math.random() - 0.5) * 24);
        const group = new THREE.Group(); group.position.copy(p);

        const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: col, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
        core.scale.setScalar(26);
        group.add(core);

        // picking proxy (invisible, generous)
        const hit = new THREE.Mesh(new THREE.SphereGeometry(16, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
        group.add(hit); hit.userData.game = g;
        pickables.push(hit);

        // motif as a live canvas texture
        const mc = document.createElement('canvas'); mc.width = mc.height = 128;
        const mtex = new THREE.CanvasTexture(mc); mtex.colorSpace = THREE.SRGBColorSpace;
        const motif = new THREE.Sprite(new THREE.SpriteMaterial({ map: mtex, transparent: true, depthWrite: false, depthTest: false }));
        motif.scale.setScalar(22); motif.position.z = 0.2;
        group.add(motif);

        scene.add(group);

        // DOM label
        const label = document.createElement('div');
        label.className = 'skygl-label';
        label.textContent = g.name;
        overlay.appendChild(label);

        nodes.push({ game: g, group, core, mc, mctx: mc.getContext('2d'), mtex, motif, label, baseColor: col, p });
      });
    }

    // --- bloom ---
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.9, 0.7, 0.18);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // --- interaction ---
    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2(0, 0);
    const ndc = new THREE.Vector2(-2, -2);
    let hoverGame = null;
    const toNDC = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      mouse.set((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
    };
    const onMove = (e) => { toNDC(e); };
    const onClick = () => {
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      if (hit && hit.object.userData.game) onSelect(hit.object.userData.game);
    };
    const onLeave = () => { ndc.set(-2, -2); mouse.set(0, 0); };
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerleave', onLeave);
    renderer.domElement.addEventListener('click', onClick);

    // --- loop ---
    const clock = new THREE.Clock();
    let raf, intro = 0;
    const tmp = new THREE.Vector3();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (document.hidden) return;
      const t = clock.getElapsedTime();
      const dt = Math.min(0.05, clock.getDelta());

      // cinematic fly-in, then gentle mouse-parallax drift
      intro = Math.min(1, intro + dt / 2.6);
      const introZ = THREE.MathUtils.lerp(620, 300, 1 - Math.pow(1 - intro, 3));
      camera.position.x += (mouse.x * 70 - camera.position.x) * 0.04;
      camera.position.y += (-mouse.y * 46 - camera.position.y) * 0.04;
      camera.position.z += (introZ - camera.position.z) * 0.06;
      camera.lookAt(0, 0, 0);
      fieldGroup.rotation.y = t * 0.006;
      nebulae.forEach((s, i) => { s.position.x += Math.sin(t * 0.1 + i) * 0.03; });

      // hover pick
      ray.setFromCamera(ndc, camera);
      const hit = ndc.x > -1.5 ? ray.intersectObjects(pickables, false)[0] : null;
      const hovered = hit ? hit.object.userData.game : null;
      if (hovered !== hoverGame) { hoverGame = hovered; if (onHover) onHover(hovered); }

      // update nodes: motif animation, hover emphasis, label projection
      for (const nd of nodes) {
        const g = nd.game;
        const isHover = hoverGame && hoverGame.id === g.id;
        const live = starsRef.current.find((s) => s.id === g.id);
        const players = (live && live.players) || 0;
        const amb = ((t * 0.16 + nd.p.x * 0.01) % 1 + 1) % 1;
        const fast = ((t * 0.5 + nd.p.x * 0.01) % 1 + 1) % 1;
        const phase = isHover ? fast : amb;
        // redraw motif
        nd.mctx.clearRect(0, 0, 128, 128);
        drawMotif(nd.mctx, g.id, 64, 64, 30, '#eaf0ff', phase, '#' + nd.baseColor.getHexString());
        nd.mtex.needsUpdate = true;
        const base = 24 + Math.min(10, Math.log2(players + 1) * 3);
        const scale = base * (isHover ? 1.5 : 1) * (1 + 0.05 * Math.sin(t * 1.5 + nd.p.x));
        nd.core.scale.setScalar(scale);
        nd.core.material.opacity = isHover ? 1 : 0.9;
        nd.motif.scale.setScalar(scale * 0.8);
        // project label
        tmp.copy(nd.group.position).project(camera);
        const vis = tmp.z < 1;
        const sx = (tmp.x * 0.5 + 0.5) * W;
        const sy = (-tmp.y * 0.5 + 0.5) * H;
        nd.label.style.transform = `translate(-50%,0) translate(${sx}px,${sy + scale * 0.7}px)`;
        nd.label.style.opacity = vis ? (isHover ? '1' : '0.72') : '0';
        nd.label.classList.toggle('skygl-label-hot', !!isHover);
      }

      composer.render();
    };
    animate();

    // --- resize ---
    const onResize = () => {
      W = mount.clientWidth || window.innerWidth; H = mount.clientHeight || window.innerHeight;
      renderer.setSize(W, H); composer.setSize(W, H);
      camera.aspect = W / H; camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      renderer.domElement.removeEventListener('click', onClick);
      nodes.forEach((nd) => { nd.label.remove(); nd.mtex.dispose(); });
      composer.dispose(); renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="skygl">
      <div className="skygl-mount" ref={mountRef} />
      <div className="skygl-overlay" ref={overlayRef} aria-hidden="true" />
    </div>
  );
}
