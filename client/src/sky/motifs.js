// Each game's node draws its own mechanic, and when `phase` (0..1, looping) is
// driven it *performs* that mechanic: a disc drops, a tile flips, electrons
// orbit, a stick is taken. `ink` is the structure colour, `hot` the active mark.
export function drawMotif(ctx, id, cx, cy, s, ink, phase = 0, hot) {
  hot = hot || ink;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = Math.max(1.3, s * 0.12);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  const dot = (x, y, r, c) => { ctx.fillStyle = c || ink; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = ink; };
  const ring = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); };
  const ease = (p) => 1 - Math.pow(1 - p, 3);
  const d = s * 0.78;
  const P = phase % 1;

  switch (id) {
    case 'tictactoe': { // X then O appear in turn
      line(-d / 3, -d, -d / 3, d); line(d / 3, -d, d / 3, d);
      line(-d, -d / 3, d, -d / 3); line(-d, d / 3, d, d / 3);
      const c = d * 0.66;
      if (P < 0.5) { const a = Math.min(1, P * 4); ctx.strokeStyle = hot; line(-c - a * 0 - c * 0.5, -c * 1.5, -c * 0.5 + c, -c * 1.5 + 2 * c * a); line(-c * 0.5 + c, -c * 1.5, -c * 0.5 - c, -c * 1.5 + 2 * c * a); }
      else { const a = Math.min(1, (P - 0.5) * 4); ctx.strokeStyle = hot; ctx.beginPath(); ctx.arc(c * 0.5, c * 1.5, c * 0.4, 0, a * Math.PI * 2); ctx.stroke(); }
      break;
    }
    case 'connect4': { // a disc falls into the grid
      const r = s * 0.22, gx = d * 0.7;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) ring(a * gx, b * gx, r);
      const fall = ease(Math.min(1, P * 1.6));
      dot(gx, -gx + fall * (2 * gx), r, hot);
      break;
    }
    case 'othello': { // a disc flips over
      const f = Math.cos(P * Math.PI * 2);
      ctx.save(); ctx.scale(Math.max(0.08, Math.abs(f)), 1);
      ctx.fillStyle = f >= 0 ? hot : ink;
      ctx.beginPath(); ctx.arc(0, 0, d, 0, Math.PI * 2); ctx.fill();
      ctx.restore(); ring(0, 0, d);
      break;
    }
    case 'checkers': { // a piece hops to the next square
      const q = d * 0.9;
      ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1, s * 0.08); ctx.strokeRect(-q, -q, q * 2, q * 2);
      const hop = ease(P); const x = -q / 2 + hop * q; const y = -q / 2 + hop * q - Math.sin(P * Math.PI) * q * 0.5;
      dot(x, y, q * 0.42, hot);
      break;
    }
    case 'gomoku': { // a stone settles on the grid
      line(-d, -d / 2, d, -d / 2); line(-d, d / 2, d, d / 2);
      line(-d / 2, -d, -d / 2, d); line(d / 2, -d, d / 2, d);
      dot(-d / 2, -d / 2, s * 0.22 * (0.4 + 0.6 * Math.min(1, P * 2)), hot);
      break;
    }
    case 'mancala': { // a stone travels along the pits
      const r = s * 0.2; const xs = [-d * 0.75, -d * 0.25, d * 0.25];
      ring(xs[0], 0, r); ring(xs[1], 0, r); ring(xs[2], 0, r); dot(d * 0.75, 0, r);
      const seg = Math.min(3, Math.floor(P * 4)); const fp = (P * 4) % 1;
      const from = [-d * 0.75, -d * 0.25, d * 0.25, d * 0.75][seg]; const to = [-d * 0.25, d * 0.25, d * 0.75, d * 0.75][seg];
      dot(from + (to - from) * ease(fp), -r * 1.6, r * 0.6, hot);
      break;
    }
    case 'dotsboxes': { // a line is drawn, then the box fills
      dot(-d, -d, s * 0.16); dot(d, -d, s * 0.16); dot(-d, d, s * 0.16); dot(d, d, s * 0.16);
      ctx.strokeStyle = hot; const g = Math.min(1, P * 2);
      line(-d, -d, -d + g * 2 * d, -d);
      if (P > 0.5) { ctx.fillStyle = hot; ctx.globalAlpha = (P - 0.5) * 1.2; ctx.fillRect(-d * 0.6, -d * 0.6, d * 1.2, d * 1.2); ctx.globalAlpha = 1; ctx.fillStyle = ink; }
      break;
    }
    case 'nim': { // the tallest stick is taken
      const g = 1 - Math.min(1, P * 1.5);
      line(-d * 0.7, d, -d * 0.7, -d * 0.4);
      line(0, d, 0, -d + (1 - g) * 2 * d);
      line(d * 0.7, d, d * 0.7, -d * 0.7);
      break;
    }
    case 'uttt': { // a sub-cell lights in turn
      const r = s * 0.11; let k = 0;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const on = k === Math.floor(P * 9); dot(a * d * 0.7, b * d * 0.7, r, on ? hot : ink); k++; }
      ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1, s * 0.08); ctx.strokeRect(-d, -d, d * 2, d * 2);
      break;
    }
    case 'chain': { // electrons orbit, a pulse ripples
      ring(0, 0, d); dot(0, 0, s * 0.26, hot);
      for (let i = 0; i < 3; i++) { const a = P * Math.PI * 2 + i * (Math.PI * 2 / 3); dot(Math.cos(a) * d, Math.sin(a) * d, s * 0.14, hot); }
      break;
    }
    case 'memory': { // a card flips face-up
      const w = d * 0.7, h = d * 1.1;
      ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1, s * 0.09); ctx.strokeRect(-d, -h / 2, w, h);
      const f = Math.cos(P * Math.PI * 2);
      ctx.save(); ctx.translate(d - w / 2, 0); ctx.scale(Math.max(0.08, Math.abs(f)), 1);
      if (f >= 0) { ctx.fillStyle = hot; dot(0, 0, w * 0.3, hot); } else { ctx.strokeRect(-w / 2, -h / 2, w, h); }
      ctx.restore();
      break;
    }
    case 'scribble': { // the line draws itself
      ctx.strokeStyle = hot; ctx.setLineDash([s * 4, s * 4]); ctx.lineDashOffset = -P * s * 8;
      ctx.beginPath(); ctx.moveTo(-d, d * 0.4); ctx.bezierCurveTo(-d * 0.3, -d, d * 0.2, d * 1.2, d, -d * 0.4); ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case 'imposter': { // the odd one out pulses
      const r = s * 0.18;
      dot(-d * 0.6, -d * 0.4, r); dot(d * 0.6, -d * 0.4, r); dot(0, d * 0.5, r);
      const pulse = 1 + 0.5 * Math.sin(P * Math.PI * 2);
      dot(0, -d * 1.0, r * 1.2 * pulse, hot);
      break;
    }
    case 'wordle': { // the middle tile flips to a hit
      const w = d * 0.62;
      ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1, s * 0.09);
      ctx.strokeRect(-d, -w / 2, w, w); ctx.strokeRect(w / 2, -w / 2, w, w);
      const f = Math.cos(P * Math.PI * 2);
      ctx.save(); ctx.scale(1, Math.max(0.08, Math.abs(f)));
      ctx.fillStyle = f < 0 ? hot : ink;
      ctx.fillRect(-w / 2, -w / 2, w, w);
      ctx.restore();
      break;
    }
    default:
      dot(0, 0, s * 0.4);
  }
  ctx.restore();
}
