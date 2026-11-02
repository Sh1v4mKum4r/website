import { useEffect, useRef } from 'react';
import { drawMotif } from '../sky/motifs';

// Draws a game's own motif (from motifs.js) into a small canvas, so the
// homepage carries the real product's identity marks, not emoji or icons.
export default function MotifIcon({ id, size = 40, color = '#1f2b4d' }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);
    drawMotif(ctx, id, size / 2, size / 2, size * 0.34, color);
  }, [id, size, color]);
  return <canvas ref={ref} width={size} height={size} style={{ width: size, height: size, display: 'block' }} aria-hidden="true" />;
}
