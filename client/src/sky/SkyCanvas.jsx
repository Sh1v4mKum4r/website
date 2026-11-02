import { useEffect, useRef } from 'react';
import { hitTest, generateStarfield, clusterCentroids, effectProgress, cometPos, makeCamera, screenToWorld, clampCamera } from './skyModel';
import { CLUSTERS } from './games';
import './SkyCanvas.css';

export default function SkyCanvas({ stars, effects, width, height, onSelect }) {
  const canvasRef = useRef(null);
  const camRef = useRef(makeCamera());
  const stateRef = useRef({ stars, effects });
  stateRef.current = { stars, effects };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    camRef.current = clampCamera(camRef.current, { width, height });
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    const field = generateStarfield(99, Math.round((width * height) / 6000), width, height);
    let raf;
    let start = performance.now();

    const draw = (now) => {
      const t = (now - start) / 1000;
      const { stars } = stateRef.current;
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(camRef.current.x, camRef.current.y);
      ctx.scale(camRef.current.scale, camRef.current.scale);

      // starfield
      for (const s of field) {
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + s.phase);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // nebula tints per cluster + labels
      const centroids = clusterCentroids(stars);
      for (const [cluster, c] of Object.entries(centroids)) {
        const col = (CLUSTERS[cluster] && CLUSTERS[cluster].color) || '#38bdf8';
        const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 180);
        grad.addColorStop(0, hexA(col, 0.18));
        grad.addColorStop(1, hexA(col, 0));
        ctx.fillStyle = grad;
        ctx.fillRect(c.x - 180, c.y - 180, 360, 360);
        ctx.fillStyle = hexA(col, 0.5);
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        const rad = Math.max(40, ...stars.filter((s) => s.cluster === cluster).map((s) => Math.hypot(s.x - c.x, s.y - c.y)));
        ctx.fillText(((CLUSTERS[cluster] && CLUSTERS[cluster].label) || '').toUpperCase(), c.x, c.y - rad - 20);
      }
      // constellation lines: connect ring neighbours into a clean closed shape
      ctx.strokeStyle = 'rgba(160,180,255,0.22)';
      ctx.lineWidth = 1.2;
      for (const cluster of Object.keys(centroids)) {
        const members = stars
          .filter((s) => s.cluster === cluster)
          .sort((a, b) => (a.ring || 0) - (b.ring || 0));
        if (members.length < 2) continue;
        ctx.beginPath();
        members.forEach((s, i) => (i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y)));
        ctx.closePath();
        ctx.stroke();
      }

      // game stars
      for (const star of stars) {
        const g = ctx.createRadialGradient(star.x, star.y, 1, star.x, star.y, star.radius);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, clusterColor(star.cluster));
        ctx.fillStyle = g;
        ctx.shadowBlur = 18 * (star.brightness ?? 0.6);
        ctx.shadowColor = clusterColor(star.cluster);
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // legible game-name label below the star
        ctx.font = '600 12px Outfit, system-ui';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillText(star.name, star.x + 0.5, star.y + star.radius + 15.5);
        ctx.fillStyle = '#eaf0ff';
        ctx.fillText(star.name, star.x, star.y + star.radius + 15);
      }

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
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x; const dy = e.clientY - d.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    camRef.current = clampCamera({ ...d.cam, x: d.cam.x + dx, y: d.cam.y + dy }, { width, height });
  };
  const onPointerUp = () => { setTimeout(() => { dragRef.current = null; }, 0); };

  return (
    <canvas
      ref={canvasRef}
      className="sky-canvas"
      style={{ width, height }}
      onClick={handleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
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
