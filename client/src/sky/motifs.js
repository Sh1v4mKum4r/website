// A small flat drawing of each game, so a node carries the game's identity
// instead of a generic glowing orb. Drawn centered at (cx, cy); `s` is the
// motif half-size in px. `ink` is the stroke/fill colour. Flat, no glow.
export function drawMotif(ctx, id, cx, cy, s, ink) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = Math.max(1.3, s * 0.12);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  const dot = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const ring = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); };
  const d = s * 0.78;

  switch (id) {
    case 'tictactoe': // hash #
      line(-d / 3, -d, -d / 3, d); line(d / 3, -d, d / 3, d);
      line(-d, -d / 3, d, -d / 3); line(-d, d / 3, d, d / 3);
      break;
    case 'connect4': { // grid of discs, two filled
      const r = s * 0.24;
      for (let gx = -1; gx <= 1; gx++) for (let gy = -1; gy <= 1; gy++) {
        if ((gx + gy + 2) % 2 === 0) dot(gx * d * 0.7, gy * d * 0.7, r);
        else ring(gx * d * 0.7, gy * d * 0.7, r);
      }
      break;
    }
    case 'othello': // half-filled disc
      ring(0, 0, d);
      ctx.beginPath(); ctx.arc(0, 0, d, -Math.PI / 2, Math.PI / 2); ctx.fill();
      break;
    case 'checkers': { // 2x2 checker, two filled
      const q = d * 0.9;
      ctx.beginPath(); ctx.rect(-q, -q, q, q); ctx.fill();
      ctx.beginPath(); ctx.rect(0, 0, q, q); ctx.fill();
      ctx.lineWidth = Math.max(1, s * 0.08); ctx.strokeRect(-q, -q, q * 2, q * 2);
      break;
    }
    case 'gomoku': // grid + stone
      line(-d, -d / 2, d, -d / 2); line(-d, d / 2, d, d / 2);
      line(-d / 2, -d, -d / 2, d); line(d / 2, -d, d / 2, d);
      dot(-d / 2, -d / 2, s * 0.22);
      break;
    case 'mancala': { // row of pits + a store
      const r = s * 0.2;
      ring(-d * 0.75, 0, r); ring(-d * 0.25, 0, r); ring(d * 0.25, 0, r);
      dot(d * 0.75, 0, r);
      break;
    }
    case 'dotsboxes': // dots with one claimed edge
      dot(-d, -d, s * 0.16); dot(d, -d, s * 0.16); dot(-d, d, s * 0.16); dot(d, d, s * 0.16);
      line(-d, -d, d, -d);
      break;
    case 'nim': // sticks of unequal height
      line(-d * 0.7, d, -d * 0.7, -d * 0.4);
      line(0, d, 0, -d);
      line(d * 0.7, d, d * 0.7, -d * 0.7);
      break;
    case 'uttt': { // nested 3x3 of dots
      const r = s * 0.1;
      for (let gx = -1; gx <= 1; gx++) for (let gy = -1; gy <= 1; gy++) dot(gx * d * 0.7, gy * d * 0.7, r);
      ctx.lineWidth = Math.max(1, s * 0.08); ctx.strokeRect(-d, -d, d * 2, d * 2);
      break;
    }
    case 'chain': // atom: nucleus + orbiters
      dot(0, 0, s * 0.26);
      ring(0, 0, d);
      dot(0, -d, s * 0.14); dot(d, 0, s * 0.14); dot(-d, 0, s * 0.14);
      break;
    case 'memory': { // two cards, one turned
      const w = d * 0.7, h = d * 1.1;
      ctx.lineWidth = Math.max(1, s * 0.09);
      ctx.strokeRect(-d, -h / 2, w, h);
      ctx.beginPath(); ctx.rect(d - w, -h / 2, w, h); ctx.fill();
      break;
    }
    case 'scribble': // a drawn squiggle
      ctx.beginPath();
      ctx.moveTo(-d, d * 0.4);
      ctx.bezierCurveTo(-d * 0.3, -d, d * 0.2, d * 1.2, d, -d * 0.4);
      ctx.stroke();
      break;
    case 'imposter': { // a ring of figures, one apart
      const r = s * 0.18;
      dot(-d * 0.6, -d * 0.4, r); dot(d * 0.6, -d * 0.4, r); dot(0, d * 0.5, r);
      ring(0, -d * 1.0, r * 1.2); // the odd one out, offset
      break;
    }
    case 'wordle': { // three tiles, middle solid
      const w = d * 0.62;
      ctx.lineWidth = Math.max(1, s * 0.09);
      ctx.strokeRect(-d, -w / 2, w, w);
      ctx.beginPath(); ctx.rect(-w / 2, -w / 2, w, w); ctx.fill();
      ctx.strokeRect(w / 2, -w / 2, w, w);
      break;
    }
    default:
      dot(0, 0, s * 0.4);
  }
  ctx.restore();
}
