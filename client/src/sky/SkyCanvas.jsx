import { useEffect, useRef } from 'react';
import { hitTest, generateStarfield, clusterCentroids, effectProgress, cometPos, makeCamera, screenToWorld, clampCamera } from './skyModel';
import { CLUSTERS } from './games';
import './SkyCanvas.css';

export default function SkyCanvas({ stars, effects, width, height, onSelect }) {
  const canvasRef = useRef(null);
  const camRef = useRef(makeCamera());
  const stateRef = useRef({ stars, effects });
  stateRef.current = { stars, effects };
  const mouseRef = useRef({ x: width / 2, y: height / 2, inside: false });
  const shootRef = useRef({ list: [], next: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    camRef.current = clampCamera(camRef.current, { width, height });
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // three parallax starfield layers: far (small, still) -> near (big, drifts most)
    const total = Math.min(520, Math.round((width * height) / 1600));
    const layers = [
      { field: generateStarfield(11, Math.round(total * 0.5), width, height), depth: 7, size: 0.7, tw: 1.6 },
      { field: generateStarfield(42, Math.round(total * 0.3), width, height), depth: 16, size: 1.0, tw: 2.2 },
      { field: generateStarfield(99, Math.round(total * 0.2), width, height), depth: 30, size: 1.5, tw: 3.0 },
    ];
    let raf;
    const start = performance.now();

    const draw = (now) => {
      const t = (now - start) / 1000;
      const { stars } = stateRef.current;
      const mouse = mouseRef.current;
      const nx = (mouse.x - width / 2) / width;   // ~ -0.5..0.5
      const ny = (mouse.y - height / 2) / height;
      ctx.clearRect(0, 0, width, height);

      // ---- background starfield (screen space, mouse parallax) ----
      for (const layer of layers) {
        const ox = -nx * layer.depth + Math.sin(t * 0.05) * layer.depth * 0.4;
        const oy = -ny * layer.depth + Math.cos(t * 0.04) * layer.depth * 0.4;
        ctx.fillStyle = '#ffffff';
        for (const s of layer.field) {
          ctx.globalAlpha = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * layer.tw + s.phase));
          ctx.beginPath();
          ctx.arc(s.x + ox, s.y + oy, s.r * layer.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // ---- ambient shooting stars ----
      const sh = shootRef.current;
      if (now > sh.next) {
        sh.next = now + 2600 + Math.random() * 4200;
        const fromLeft = Math.random() < 0.5;
        sh.list.push({
          x: fromLeft ? -40 : width + 40, y: Math.random() * height * 0.6,
          vx: (fromLeft ? 1 : -1) * (320 + Math.random() * 260), vy: 120 + Math.random() * 120,
          born: now, life: 1100,
        });
      }
      sh.list = sh.list.filter((m) => now - m.born < m.life);
      for (const m of sh.list) {
        const p = (now - m.born) / m.life;
        const dt = (now - m.born) / 1000;
        const x = m.x + m.vx * dt, y = m.y + m.vy * dt;
        const tailX = x - m.vx * 0.06, tailY = y - m.vy * 0.06;
        const grad = ctx.createLinearGradient(tailX, tailY, x, y);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, `rgba(255,255,255,${0.9 * (1 - p)})`);
        ctx.strokeStyle = grad; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(x, y); ctx.stroke();
      }

      // ---- foreground: constellation world (pan/zoom camera) ----
      ctx.save();
      ctx.translate(camRef.current.x, camRef.current.y);
      ctx.scale(camRef.current.scale, camRef.current.scale);

      const centroids = clusterCentroids(stars);
      const driftX = Math.sin(t * 0.08) * 16;
      const driftY = Math.cos(t * 0.06) * 12;

      // drifting nebula tints + labels
      for (const [cluster, c] of Object.entries(centroids)) {
        const col = (CLUSTERS[cluster] && CLUSTERS[cluster].color) || '#38bdf8';
        const cx = c.x + driftX, cy = c.y + driftY;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 240);
        grad.addColorStop(0, hexA(col, 0.16));
        grad.addColorStop(1, hexA(col, 0));
        ctx.fillStyle = grad;
        ctx.fillRect(cx - 240, cy - 240, 480, 480);
        const rad = Math.max(40, ...stars.filter((s) => s.cluster === cluster).map((s) => Math.hypot(s.x - c.x, s.y - c.y)));
        ctx.fillStyle = hexA(col, 0.6);
        ctx.font = '600 11px Outfit, system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(((CLUSTERS[cluster] && CLUSTERS[cluster].label) || '').toUpperCase(), c.x, c.y - rad - 22);
      }

      // flowing constellation lines (energy running along them)
      ctx.strokeStyle = 'rgba(170,190,255,0.30)';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([5, 9]);
      ctx.lineDashOffset = -t * 22;
      for (const cluster of Object.keys(centroids)) {
        const members = stars.filter((s) => s.cluster === cluster).sort((a, b) => (a.ring || 0) - (b.ring || 0));
        if (members.length < 2) continue;
        ctx.beginPath();
        members.forEach((s, i) => (i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y)));
        ctx.closePath();
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // hovered star (world space)
      const mw = screenToWorld(camRef.current, mouse.x, mouse.y);
      const hovered = mouse.inside ? hitTest(stars, mw.x, mw.y) : null;
      const hoverId = hovered && hovered.id;

      // game stars (breathing + bloom + hover)
      for (const star of stars) {
        const col = clusterColor(star.cluster);
        const breathe = 1 + 0.07 * Math.sin(t * 1.4 + star.x * 0.05);
        const isHover = star.id === hoverId;
        const r = star.radius * breathe * (isHover ? 1.45 : 1);
        const bright = star.brightness ?? 0.6;
        if (isHover) {
          ctx.strokeStyle = hexA(col, 0.6);
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(star.x, star.y, r + 9, 0, Math.PI * 2); ctx.stroke();
        }
        const g = ctx.createRadialGradient(star.x, star.y, 1, star.x, star.y, r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, col);
        ctx.fillStyle = g;
        ctx.shadowBlur = (isHover ? 34 : 16) * bright + 8 * Math.sin(t * 1.4 + star.x);
        ctx.shadowColor = col;
        ctx.beginPath(); ctx.arc(star.x, star.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // legible game-name label
        ctx.font = isHover ? '700 13px Outfit, system-ui' : '600 12px Outfit, system-ui';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillText(star.name, star.x + 0.5, star.y + r + 15.5);
        ctx.fillStyle = isHover ? '#ffffff' : '#dbe4ff';
        ctx.fillText(star.name, star.x, star.y + r + 15);
      }

      // live effects: win supernova + migration comets
      const activeEffects = stateRef.current.effects || [];
      if (activeEffects.length) {
        const byId = Object.fromEntries(stars.map((s) => [s.id, s]));
        const nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        for (const e of activeEffects) {
          const p = e.born ? Math.min(1, Math.max(0, (nowMs - e.born) / (e.ttl || 2200))) : effectProgress(e);
          if (e.type === 'win') {
            const s = byId[e.payload.game]; if (!s) continue;
            ctx.strokeStyle = `rgba(253,230,138,${1 - p})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(s.x, s.y, 6 + p * 90, 0, Math.PI * 2); ctx.stroke();
          } else if (e.type === 'move') {
            const a = byId[e.payload.from]; const b = byId[e.payload.to]; if (!a || !b) continue;
            const pos = cometPos(a, b, p);
            ctx.fillStyle = `rgba(255,255,255,${1 - p})`;
            ctx.beginPath(); ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      ctx.restore();
    };
    const loop = (now) => { if (!document.hidden) draw(now); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  const dragRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const handler = (e) => {
      e.preventDefault();
      const cam = camRef.current;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const nx = sx - (sx - cam.x) * factor;
      const ny = sy - (sy - cam.y) * factor;
      camRef.current = clampCamera({ x: nx, y: ny, scale: cam.scale * factor }, { width, height });
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, [width, height]);

  const trackMouse = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, inside: true };
  };

  const handleClick = (e) => {
    if (dragRef.current && dragRef.current.moved) return; // a drag, not a click
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = screenToWorld(camRef.current, sx, sy);
    const hit = hitTest(stateRef.current.stars, w.x, w.y);
    if (hit) onSelect(hit);
  };

  const onPointerDown = (e) => { dragRef.current = { x: e.clientX, y: e.clientY, cam: { ...camRef.current }, moved: false }; };
  const onPointerMove = (e) => {
    trackMouse(e);
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x; const dy = e.clientY - d.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    camRef.current = clampCamera({ ...d.cam, x: d.cam.x + dx, y: d.cam.y + dy }, { width, height });
  };
  const onPointerUp = () => { setTimeout(() => { dragRef.current = null; }, 0); };
  const onPointerLeave = () => { mouseRef.current = { ...mouseRef.current, inside: false }; setTimeout(() => { dragRef.current = null; }, 0); };

  return (
    <canvas
      ref={canvasRef}
      className="sky-canvas"
      style={{ width, height }}
      onClick={handleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      aria-hidden="true"
    />
  );
}

function clusterColor(cluster) {
  return (CLUSTERS[cluster] && CLUSTERS[cluster].color) || '#38bdf8';
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
