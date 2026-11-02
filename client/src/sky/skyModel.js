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

// Each cluster is laid out as an evenly-spaced ring around its anchor, so stars
// never clump and the connecting lines form a clean shape. Deterministic.
const CLUSTER_ANCHORS = {
  strategy: { x: 0.30, y: 0.52 },
  word: { x: 0.52, y: 0.72 },
  party: { x: 0.72, y: 0.33 },
};

export function layoutStars(games, { width, height }) {
  const byCluster = {};
  for (const g of games) (byCluster[g.cluster] = byCluster[g.cluster] || []).push(g);
  const stars = [];
  for (const [cluster, list] of Object.entries(byCluster)) {
    const anchor = CLUSTER_ANCHORS[cluster] || { x: 0.5, y: 0.5 };
    const ax = anchor.x * width;
    const ay = anchor.y * height;
    const n = list.length;
    const R = n <= 1 ? 0 : Math.min(Math.min(width, height) * 0.34, 70 + n * 14);
    list.forEach((g, i) => {
      const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const x = Math.min(width, Math.max(0, ax + Math.cos(ang) * R));
      const y = Math.min(height, Math.max(0, ay + Math.sin(ang) * R));
      stars.push({ id: g.id, name: g.name, route: g.route, cluster: g.cluster, glyph: g.glyph, ring: i, x, y });
    });
  }
  return stars;
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

export function clusterCentroids(stars) {
  const acc = {};
  for (const s of stars) {
    const a = acc[s.cluster] || { x: 0, y: 0, n: 0 };
    a.x += s.x; a.y += s.y; a.n += 1;
    acc[s.cluster] = a;
  }
  const out = {};
  for (const [k, a] of Object.entries(acc)) out[k] = { x: a.x / a.n, y: a.y / a.n };
  return out;
}

export function effectProgress(effect) {
  if (!effect.ttl) return 1;
  return Math.min(1, Math.max(0, effect.t / effect.ttl));
}

export function cometPos(from, to, p) {
  return { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p };
}
