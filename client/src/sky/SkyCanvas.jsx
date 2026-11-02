import { useEffect, useRef } from 'react';
import { hitTest, generateStarfield } from './skyModel';
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
