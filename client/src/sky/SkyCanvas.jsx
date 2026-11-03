import { useEffect, useRef } from 'react';
import { hitTest, generateStarfield, clusterCentroids, effectProgress, cometPos, makeCamera, screenToWorld, clampCamera } from './skyModel';
import { CLUSTERS } from './games';
import { drawMotif } from './motifs';
import './SkyCanvas.css';

export default function SkyCanvas({ stars, effects, width, height, onSelect, interactive = true }) {
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
      const nx = (mouse.x - width / 2) / width;
      const ny = (mouse.y - height / 2) / height;
      ctx.clearRect(0, 0, width, height);

      // --- background starfield (screen space, parallax) ---
      for (const layer of layers) {
        const ox = -nx * layer.depth + Math.sin(t * 0.05) * layer.depth * 0.4;
        const oy = -ny * layer.depth + Math.cos(t * 0.04) * layer.depth * 0.4;
        ctx.fillStyle = '#ffffff';
        for (const s of layer.field) {
          ctx.globalAlpha = 0.22 + 0.45 * (0.5 + 0.5 * Math.sin(t * layer.tw + s.phase));
          ctx.beginPath();
          ctx.arc(s.x + ox, s.y + oy, s.r * layer.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // --- ambient shooting stars ---
      const sh = shootRef.current;
      if (now > sh.next) {
        sh.next = now + 3000 + Math.random() * 4500;
        const fromLeft = Math.random() < 0.5;
        sh.list.push({ x: fromLeft ? -40 : width + 40, y: Math.random() * height * 0.55, vx: (fromLeft ? 1 : -1) * (320 + Math.random() * 240), vy: 110 + Math.random() * 110, born: now, life: 1100 });
      }
      sh.list = sh.list.filter((m) => now - m.born < m.life);
      for (const m of sh.list) {
        const p = (now - m.born) / m.life;
        const dt = (now - m.born) / 1000;
        const x = m.x + m.vx * dt, y = m.y + m.vy * dt;
        const g = ctx.createLinearGradient(x - m.vx * 0.06, y - m.vy * 0.06, x, y);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(1, `rgba(255,255,255,${0.85 * (1 - p)})`);
        ctx.strokeStyle = g; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - m.vx * 0.06, y - m.vy * 0.06); ctx.lineTo(x, y); ctx.stroke();
      }

      // --- foreground constellation (pan/zoom) ---
      ctx.save();
      ctx.translate(camRef.current.x, camRef.current.y);
      ctx.scale(camRef.current.scale, camRef.current.scale);

      const centroids = clusterCentroids(stars);
      const driftX = Math.sin(t * 0.08) * 14;
      const driftY = Math.cos(t * 0.06) * 10;

      // very soft field of colour per cluster (kept subtle — flat radial, low alpha)
      for (const [cluster, c] of Object.entries(centroids)) {
        const col = (CLUSTERS[cluster] && CLUSTERS[cluster].color) || '#38bdf8';
        const cx = c.x + driftX, cy = c.y + driftY;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 230);
        grad.addColorStop(0, hexA(col, 0.1));
        grad.addColorStop(1, hexA(col, 0));
        ctx.fillStyle = grad;
        ctx.fillRect(cx - 230, cy - 230, 460, 460);
      }

      // where the cursor points, in world space
      const mw = screenToWorld(camRef.current, mouse.x, mouse.y);
      const hovered = mouse.inside ? hitTest(stars, mw.x, mw.y) : null;
      const hoverId = hovered && hovered.id;

      // links — the cluster the cursor is over lights up
      for (const cluster of Object.keys(centroids)) {
        const members = stars.filter((s) => s.cluster === cluster).sort((a, b) => (a.ring || 0) - (b.ring || 0));
        if (members.length < 2) continue;
        const col = (CLUSTERS[cluster] && CLUSTERS[cluster].color) || '#38bdf8';
        const lit = hovered && hovered.cluster === cluster;
        ctx.strokeStyle = hexA(col, lit ? 0.5 : 0.16);
        ctx.lineWidth = lit ? 1.6 : 1;
        ctx.beginPath();
        members.forEach((s, i) => (i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y)));
        ctx.closePath();
        ctx.stroke();
      }

      // --- nodes: a disc whose motif performs the game, reactive to the cursor ---
      for (const star of stars) {
        const col = clusterColor(star.cluster);
        const players = star.players || 0;
        const isHover = star.id === hoverId;
        // cursor spotlight: nearby stars grow, brighten and lean toward the pointer
        const mdx = mw.x - star.x, mdy = mw.y - star.y;
        const spot = mouse.inside ? Math.max(0, 1 - Math.hypot(mdx, mdy) / 240) : 0;
        const x = star.x + mdx * 0.05 * spot;
        const y = star.y + mdy * 0.05 * spot;
        const discR = (1 + spot * 0.22 + (isHover ? 0.14 : 0)) * (15 + Math.min(9, Math.log2(players + 1) * 2.6));

        ctx.fillStyle = hexA(col, 0.14 + spot * 0.14);
        ctx.beginPath(); ctx.arc(x, y, discR, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = hexA(col, Math.min(0.98, 0.4 + players * 0.06 + spot * 0.4));
        ctx.lineWidth = 1.5 + spot * 0.8;
        ctx.beginPath(); ctx.arc(x, y, discR, 0, Math.PI * 2); ctx.stroke();

        // the motif performs its game — ambient slowly, faster under the cursor
        const amb = (((t * 0.16 + star.x * 0.013) % 1) + 1) % 1;
        const fast = (((t * 0.5 + star.x * 0.013) % 1) + 1) % 1;
        const phase = (isHover || spot > 0.5) ? fast : amb;
        drawMotif(ctx, star.id, x, y, discR * 0.5, isHover ? '#ffffff' : '#e7ecff', phase, col);

        if (players > 0) {
          ctx.fillStyle = col; ctx.font = '700 11px Outfit, system-ui'; ctx.textAlign = 'center';
          ctx.fillText(String(players), x + discR * 0.78, y - discR * 0.78);
        }

        const labelY = y + discR + 15;
        ctx.font = (isHover || spot > 0.6) ? '700 14px Outfit, system-ui' : '600 13px Outfit, system-ui';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(5,6,16,0.85)';
        ctx.fillText(star.name, x + 0.6, labelY + 0.6);
        ctx.fillStyle = isHover ? '#ffffff' : '#e7ecff';
        ctx.fillText(star.name, x, labelY);
      }

      // live events: win pulse + migration comet
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
            ctx.beginPath(); ctx.arc(s.x, s.y, 16 + p * 80, 0, Math.PI * 2); ctx.stroke();
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
    if (!interactive) return undefined;
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
    if (dragRef.current && dragRef.current.moved) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const w = screenToWorld(camRef.current, e.clientX - rect.left, e.clientY - rect.top);
    const hit = hitTest(stateRef.current.stars, w.x, w.y);
    if (hit) onSelect(hit);
  };

  const onPointerDown = (e) => { if (!interactive) return; dragRef.current = { x: e.clientX, y: e.clientY, cam: { ...camRef.current }, moved: false }; };
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
