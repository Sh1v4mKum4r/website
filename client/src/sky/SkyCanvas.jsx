import { useEffect, useRef } from 'react';
import { hitTest, generateStarfield, clusterCentroids, effectProgress, cometPos } from './skyModel';
import { CLUSTERS } from './games';
import './SkyCanvas.css';

export default function SkyCanvas({ stars, effects, width, height, onSelect }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ stars, effects });
  stateRef.current = { stars, effects };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
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
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = hexA(col, 0.5);
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(((CLUSTERS[cluster] && CLUSTERS[cluster].label) || '').toUpperCase(), c.x, c.y - 150);
      }
      // constellation lines within each cluster
      ctx.strokeStyle = 'rgba(160,180,255,0.18)';
      ctx.lineWidth = 1;
      for (const cluster of Object.keys(centroids)) {
        const members = stars.filter((s) => s.cluster === cluster);
        ctx.beginPath();
        members.forEach((s, i) => (i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y)));
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
        ctx.fillStyle = '#06101f';
        ctx.font = `${Math.round(star.radius)}px system-ui`;
        ctx.textAlign = 'center';
        ctx.fillText(star.glyph, star.x, star.y + star.radius * 0.35);
      }

      const byId = Object.fromEntries(stars.map((s) => [s.id, s]));
      for (const e of stateRef.current.effects || []) {
        const p = effectProgress(e);
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
    };
    const loop = (now) => { if (!document.hidden) draw(now); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = hitTest(stateRef.current.stars, x, y);
    if (hit) onSelect(hit);
  };

  return (
    <canvas
      ref={canvasRef}
      className="sky-canvas"
      style={{ width, height }}
      onClick={handleClick}
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
