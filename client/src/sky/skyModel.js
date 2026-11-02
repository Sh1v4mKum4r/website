// client/src/sky/skyModel.js
const BASE_RADIUS = 10;
const MAX_RADIUS = 26;

export function sizeFor(players) {
  const p = Math.max(0, players || 0);
  // log growth so a few players matter but busy games don't dominate
  return Math.min(MAX_RADIUS, BASE_RADIUS + Math.log2(p + 1) * 3);
}

export function brightnessFor(players) {
  const p = Math.max(0, players || 0);
  return Math.min(1, 0.35 + (1 - Math.exp(-p / 12)) * 0.65);
}

// --- seeded RNG (mulberry32) ---
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLUSTER_ORDER = ['strategy', 'word', 'party'];

export function layoutStars(games, { width, height, seed = 1 }) {
  const rand = mulberry32(seed);
  const bands = CLUSTER_ORDER.length;
  const margin = 0.12;
  return games.map((g) => {
    const band = Math.max(0, CLUSTER_ORDER.indexOf(g.cluster));
    const bandW = width / bands;
    const cx = bandW * (band + 0.5);
    const jitterX = (rand() - 0.5) * bandW * (1 - margin);
    const y = height * (margin + rand() * (1 - margin * 2));
    const x = Math.min(width, Math.max(0, cx + jitterX));
    return { id: g.id, name: g.name, route: g.route, cluster: g.cluster, glyph: g.glyph, x, y };
  });
}

export function applyCounts(stars, countsById) {
  const counts = countsById || {};
  return stars.map((s) => {
    const players = counts[s.id] || 0;
    return { ...s, players, radius: sizeFor(players), brightness: brightnessFor(players) };
  });
}

export function hitTest(stars, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const s of stars) {
    const dx = s.x - x;
    const dy = s.y - y;
    const dist = Math.hypot(dx, dy);
    const r = Math.max(s.radius || 10, 14); // generous touch target
    if (dist <= r && dist < bestDist) {
      best = s;
      bestDist = dist;
    }
  }
  return best;
}

let _effectId = 0;
export function makeEffect(type, payload = {}, ttl = 2000) {
  return { id: `e${++_effectId}`, type, payload, t: 0, ttl };
}

export function ageEffects(effects, dt) {
  return effects
    .map((e) => ({ ...e, t: e.t + dt }))
    .filter((e) => e.t < e.ttl);
}

export function generateStarfield(seed, count, width, height) {
  const rand = mulberry32(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: rand() * width,
      y: rand() * height,
      r: 0.5 + rand() * 1.2,
      phase: rand() * Math.PI * 2,
    });
  }
  return out;
}

export function makeCamera() { return { x: 0, y: 0, scale: 1 }; }

export function worldToScreen(cam, wx, wy) {
  return { x: wx * cam.scale + cam.x, y: wy * cam.scale + cam.y };
}
export function screenToWorld(cam, sx, sy) {
  return { x: (sx - cam.x) / cam.scale, y: (sy - cam.y) / cam.scale };
}
export function clampCamera(cam, { width, height }) {
  const scale = Math.min(3, Math.max(1, cam.scale));
  const maxPan = { x: width * (scale - 1), y: height * (scale - 1) };
  const x = Math.min(0, Math.max(-maxPan.x, cam.x));
  const y = Math.min(0, Math.max(-maxPan.y, cam.y));
  return { x, y, scale };
}
