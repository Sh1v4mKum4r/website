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
