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
