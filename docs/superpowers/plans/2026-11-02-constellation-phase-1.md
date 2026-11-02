# Constellation Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the core "constellation" game browser at a new `/sky` route — an animated Canvas star-map where each game is a star sized and brightened by live player counts, with a detail capsule, a warp-speed entry into pass-n-play, and an accessible fallback list — behind a beta toggle, leaving the current `/games` page untouched.

**Architecture:** A single Canvas 2D element (`SkyCanvas`) renders a starfield plus game-stars from a pure, unit-tested state module (`skyModel`). A React overlay (`SkyOverlay`) draws crisp UI over the canvas. Live per-game player counts flow from a new pure server module (`skyPresence`) over the existing Socket.IO connection into a `useSkyData` hook. A `FallbackList` serves reduced-motion, keyboard, and small-screen users.

**Tech Stack:** React 19, react-router-dom 7, socket.io(-client) 4, Vite 7; new client test runner Vitest + jsdom + @testing-library/react; server tests are plain `node *.test.js` with `assert` (existing pattern).

**Scope note — entry in Phase 1:** "Play" from a star launches **pass-n-play** (`/game/<route>/local`), which needs no lobby. Online room creation and "Spectate" arrive in Phase 2 (they depend on the orbiting-rooms work and lobby wiring). Live player counts are read-only visualization in Phase 1.

**Naming contract (used across tasks):**
- Server `server/utils/skyPresence.js`: `computeSkyState(lobbies)` → `{ totalPlayers, games: [{ game, players, rooms }] }`; `buildWinEvent(room)` → `{ type: 'win', game } | null`.
- Client `client/src/sky/games.js`: `SKY_GAMES` = `[{ id, name, route, cluster, glyph }]`; `CLUSTERS` = `{ strategy, word, party }` (each `{ label, color }`).
- Client `client/src/sky/skyModel.js`: `sizeFor(players)`, `brightnessFor(players)`, `layoutStars(games, { width, height, seed })` → stars `{ id, name, route, cluster, glyph, x, y }`; `applyCounts(stars, countsById)` → `{ ...star, players, radius, brightness }`; `hitTest(stars, x, y)` → star | null; `makeEffect(type, payload, ttl)`, `ageEffects(effects, dt)`; `generateStarfield(seed, count, width, height)` → `[{ x, y, r, phase }]`.
- Client components: `SkyCanvas({ stars, effects, width, height, onSelect })`, `SkyOverlay({ star, onPlay, onClose })`, `WarpTransition({ game, onDone })`, `FallbackList({ stars, onPlay })`, page `Sky`.

---

## File structure

**Server (create):**
- `server/utils/skyPresence.js` — pure presence aggregation.
- `server/skyPresence.test.js` — node test.

**Server (modify):**
- `server/server.js` — emit `sky:state` on interval + on connection; emit `sky:event` on a win.
- `server/package.json` — add the new test file to the `test` script.

**Client (create):**
- `client/vitest.config.js`, `client/src/test/setup.js` — test harness.
- `client/src/sky/games.js` — game→cluster metadata.
- `client/src/sky/skyModel.js` — pure state/geometry.
- `client/src/sky/useSkyData.js` — socket → model hook.
- `client/src/sky/SkyCanvas.jsx` + `SkyCanvas.css`
- `client/src/sky/SkyOverlay.jsx` + `SkyOverlay.css`
- `client/src/sky/WarpTransition.jsx` + `WarpTransition.css`
- `client/src/sky/FallbackList.jsx` + `FallbackList.css`
- `client/src/pages/Sky.jsx` + `Sky.css`
- Tests: `client/src/sky/*.test.js(x)` colocated.

**Client (modify):**
- `client/package.json` — add vitest deps + `test` script.
- `client/src/App.jsx` — add `/sky` route.
- `client/src/pages/Games.jsx` — add a "Try the new sky ✨" link.
- `client/src/context/theme.css` — add `[data-theme="cosmic"]` tokens.

---

## Task 1: Server — `computeSkyState(lobbies)`

**Files:**
- Create: `server/utils/skyPresence.js`
- Test: `server/skyPresence.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// server/skyPresence.test.js
// Run with: node skyPresence.test.js
const assert = require('assert');
const { computeSkyState, buildWinEvent } = require('./utils/skyPresence');

let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log(`  ok - ${name}`); };

// lobbies shape mirrors server.js: { code: { players:[{id,name}], rooms: { roomCode: { gameType, players:{socketId:role} } } } }
const lobbies = {
  L1: {
    players: [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Ben' }],
    rooms: {
      R1: { gameType: 'chess', players: { a: 'X', b: 'O' } },
      R2: { gameType: 'wordle', players: { a: 'P1' } },
    },
  },
  L2: {
    players: [{ id: 'c', name: 'Cid' }],
    rooms: { R3: { gameType: 'chess', players: { c: 'X' } } },
  },
};

check('counts players and rooms per game across lobbies', () => {
  const state = computeSkyState(lobbies);
  const chess = state.games.find((g) => g.game === 'chess');
  assert.strictEqual(chess.players, 3);
  assert.strictEqual(chess.rooms, 2);
});

check('reports totalPlayers across all rooms', () => {
  const state = computeSkyState(lobbies);
  assert.strictEqual(state.totalPlayers, 4);
});

check('empty lobbies yield empty games and zero total', () => {
  const state = computeSkyState({});
  assert.deepStrictEqual(state.games, []);
  assert.strictEqual(state.totalPlayers, 0);
});

check('buildWinEvent returns a win event for a real game', () => {
  assert.deepStrictEqual(buildWinEvent({ gameType: 'chess' }), { type: 'win', game: 'chess' });
});

check('buildWinEvent returns null when no gameType', () => {
  assert.strictEqual(buildWinEvent({}), null);
});

console.log(`\n${passed} passed`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node skyPresence.test.js`
Expected: FAIL — `Cannot find module './utils/skyPresence'`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// server/utils/skyPresence.js
// Pure aggregation of live presence from the server's `lobbies` object.
// No socket.io here — server.js injects lobbies and emits the result.

function computeSkyState(lobbies) {
  const byGame = new Map(); // game -> { players, rooms }
  let totalPlayers = 0;

  for (const lobby of Object.values(lobbies || {})) {
    const rooms = lobby.rooms || {};
    for (const room of Object.values(rooms)) {
      const game = room.gameType;
      if (!game) continue;
      const count = Object.keys(room.players || {}).length;
      totalPlayers += count;
      const agg = byGame.get(game) || { players: 0, rooms: 0 };
      agg.players += count;
      agg.rooms += 1;
      byGame.set(game, agg);
    }
  }

  const games = [...byGame.entries()].map(([game, agg]) => ({
    game,
    players: agg.players,
    rooms: agg.rooms,
  }));

  return { totalPlayers, games };
}

function buildWinEvent(room) {
  if (!room || !room.gameType) return null;
  return { type: 'win', game: room.gameType };
}

module.exports = { computeSkyState, buildWinEvent };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && node skyPresence.test.js`
Expected: PASS — `5 passed`.

- [ ] **Step 5: Wire the new test into the server test script**

Modify `server/package.json` `scripts.test` to:

```json
"test": "node db.test.js && node winrules.test.js && node integration.test.js && node skyPresence.test.js"
```

- [ ] **Step 6: Commit**

```bash
git add server/utils/skyPresence.js server/skyPresence.test.js server/package.json
git commit -m "feat(sky): add pure skyPresence aggregation + tests"
```

---

## Task 2: Server — emit `sky:state` and `sky:event`

**Files:**
- Modify: `server/server.js`

This task wires the pure module into the live server. The emission is verified by Task 1's unit tests (for the payload) plus a manual check (for the socket wiring) — canvas/socket side effects are not unit-tested here.

- [ ] **Step 1: Import the module**

At the top of `server/server.js`, after the existing `require('./db')` line, add:

```javascript
const { computeSkyState, buildWinEvent } = require('./utils/skyPresence');
```

- [ ] **Step 2: Broadcast `sky:state` on an interval and on connection**

Immediately after the `io` server is created (`const io = new Server(server, { ... });`), add:

```javascript
// ── Sky presence broadcast ──
const SKY_STATE_INTERVAL_MS = 4000;
function broadcastSkyState() {
  io.emit('sky:state', computeSkyState(lobbies));
}
setInterval(broadcastSkyState, SKY_STATE_INTERVAL_MS).unref?.();
```

Inside the existing `io.on('connection', (socket) => { ... })` handler, near the top, send the current state to the new client:

```javascript
  socket.emit('sky:state', computeSkyState(lobbies));
```

- [ ] **Step 3: Emit `sky:event` when a game is won**

In `handleGameResult`, locate where a win is recorded (the `recordLeaderboardWin`/`recordWin` path). Immediately after a win is recorded, add:

```javascript
  const skyEvent = buildWinEvent(room);
  if (skyEvent) io.emit('sky:event', skyEvent);
```

(`io`, `room`, `buildWinEvent` are all already in scope there.)

- [ ] **Step 4: Verify the existing server tests still pass**

Run: `cd server && npm test`
Expected: PASS — all four test files, including `skyPresence.test.js`, print `passed`. `handleGameResult` is imported by `winrules.test.js` without binding a port; the new `io.emit` call is a no-op harmless side effect there because `io` exists but has no connected clients.

- [ ] **Step 5: Manual check**

Run: `cd server && npm start`, then in another terminal:
`node -e "const s=require('socket.io-client')('http://localhost:3001'); s.on('sky:state', d=>{console.log(d); s.close();});"`
Expected: a `{ totalPlayers: 0, games: [] }` object prints within ~4s.

- [ ] **Step 6: Commit**

```bash
git add server/server.js
git commit -m "feat(sky): broadcast sky:state and sky:event over socket.io"
```

---

## Task 3: Client — add Vitest test harness

**Files:**
- Modify: `client/package.json`
- Create: `client/vitest.config.js`, `client/src/test/setup.js`, `client/src/test/smoke.test.js`

- [ ] **Step 1: Add dev dependencies and a test script**

In `client/package.json`, add to `devDependencies`:

```json
"vitest": "^2.1.9",
"jsdom": "^25.0.1",
"@testing-library/react": "^16.1.0",
"@testing-library/jest-dom": "^6.6.3",
"@testing-library/user-event": "^14.5.2"
```

and add to `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Install**

Run: `cd client && npm install`
Expected: installs without error. (If npm is configured to block scripts, these packages need none.)

- [ ] **Step 3: Create the Vitest config**

```javascript
// client/vitest.config.js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
});
```

- [ ] **Step 4: Create the setup file**

```javascript
// client/src/test/setup.js
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Write a smoke test**

```javascript
// client/src/test/smoke.test.js
import { describe, it, expect } from 'vitest';

describe('test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run to verify it passes**

Run: `cd client && npm test`
Expected: PASS — 1 test passed.

- [ ] **Step 7: Commit**

```bash
git add client/package.json client/package-lock.json client/vitest.config.js client/src/test/
git commit -m "test(client): add vitest + jsdom + testing-library harness"
```

---

## Task 4: Client — game→cluster metadata

**Files:**
- Create: `client/src/sky/games.js`, `client/src/sky/games.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// client/src/sky/games.test.js
import { describe, it, expect } from 'vitest';
import { SKY_GAMES, CLUSTERS } from './games';

describe('SKY_GAMES', () => {
  it('lists every game with id, name, route, cluster, glyph', () => {
    expect(SKY_GAMES.length).toBeGreaterThanOrEqual(14);
    for (const g of SKY_GAMES) {
      expect(g.id).toBeTruthy();
      expect(g.name).toBeTruthy();
      expect(g.route).toBeTruthy();
      expect(g.glyph).toBeTruthy();
      expect(CLUSTERS[g.cluster]).toBeTruthy();
    }
  });

  it('uses only defined clusters', () => {
    expect(Object.keys(CLUSTERS).sort()).toEqual(['party', 'strategy', 'word']);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd client && npx vitest run src/sky/games.test.js`
Expected: FAIL — cannot resolve `./games`.

- [ ] **Step 3: Write the implementation**

```javascript
// client/src/sky/games.js
// Star metadata. `id`/`route` mirror server game ids and Game.jsx routes.
export const CLUSTERS = {
  strategy: { label: 'Strategy', color: '#38bdf8' },
  word: { label: 'Word', color: '#f472b6' },
  party: { label: 'Party', color: '#34d399' },
};

export const SKY_GAMES = [
  { id: 'tictactoe', name: 'Tic Tac Toe', route: 'tic-tac-toe', cluster: 'strategy', glyph: '✕' },
  { id: 'connect4', name: 'Connect 4', route: 'connect4', cluster: 'strategy', glyph: '4' },
  { id: 'othello', name: 'Othello', route: 'othello', cluster: 'strategy', glyph: '◕' },
  { id: 'checkers', name: 'Checkers', route: 'checkers', cluster: 'strategy', glyph: '⛃' },
  { id: 'gomoku', name: 'Gomoku', route: 'gomoku', cluster: 'strategy', glyph: '◇' },
  { id: 'mancala', name: 'Mancala', route: 'mancala', cluster: 'strategy', glyph: '⦿' },
  { id: 'dotsboxes', name: 'Dots & Boxes', route: 'dots-and-boxes', cluster: 'strategy', glyph: '▦' },
  { id: 'nim', name: 'Nim', route: 'nim', cluster: 'strategy', glyph: '≡' },
  { id: 'uttt', name: 'Ultimate TTT', route: 'ultimate-tic-tac-toe', cluster: 'strategy', glyph: '⊞' },
  { id: 'chain', name: 'Chain Reaction', route: 'chain-reaction', cluster: 'party', glyph: '✺' },
  { id: 'memory', name: 'Memory', route: 'memory', cluster: 'party', glyph: '⧉' },
  { id: 'scribble', name: 'Scribble', route: 'scribble', cluster: 'party', glyph: '✎' },
  { id: 'imposter', name: 'Imposter', route: 'imposter-word', cluster: 'party', glyph: '☲' },
  { id: 'wordle', name: 'Wordle', route: 'wordle', cluster: 'word', glyph: '✺' },
];
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd client && npx vitest run src/sky/games.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/sky/games.js client/src/sky/games.test.js
git commit -m "feat(sky): game-to-cluster star metadata"
```

---

## Task 5: Client — `sizeFor` / `brightnessFor`

**Files:**
- Create: `client/src/sky/skyModel.js`, `client/src/sky/skyModel.size.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// client/src/sky/skyModel.size.test.js
import { describe, it, expect } from 'vitest';
import { sizeFor, brightnessFor } from './skyModel';

describe('sizeFor', () => {
  it('returns the base radius at zero players', () => {
    expect(sizeFor(0)).toBe(10);
  });
  it('grows with players but is capped', () => {
    expect(sizeFor(10)).toBeGreaterThan(sizeFor(2));
    expect(sizeFor(1000)).toBeLessThanOrEqual(26);
  });
});

describe('brightnessFor', () => {
  it('is 0.35 at zero players and approaches 1', () => {
    expect(brightnessFor(0)).toBeCloseTo(0.35, 2);
    expect(brightnessFor(1000)).toBeGreaterThan(0.95);
    expect(brightnessFor(1000)).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd client && npx vitest run src/sky/skyModel.size.test.js`
Expected: FAIL — cannot resolve `./skyModel`.

- [ ] **Step 3: Write the implementation**

```javascript
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd client && npx vitest run src/sky/skyModel.size.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/sky/skyModel.js client/src/sky/skyModel.size.test.js
git commit -m "feat(sky): sizeFor/brightnessFor mappings"
```

---

## Task 6: Client — `layoutStars` (seeded, deterministic)

**Files:**
- Modify: `client/src/sky/skyModel.js`
- Create: `client/src/sky/skyModel.layout.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// client/src/sky/skyModel.layout.test.js
import { describe, it, expect } from 'vitest';
import { layoutStars } from './skyModel';
import { SKY_GAMES } from './games';

const opts = { width: 800, height: 600, seed: 7 };

describe('layoutStars', () => {
  it('returns one star per game with coordinates inside the bounds', () => {
    const stars = layoutStars(SKY_GAMES, opts);
    expect(stars).toHaveLength(SKY_GAMES.length);
    for (const s of stars) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(opts.width);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(opts.height);
      expect(s.id).toBeTruthy();
      expect(s.route).toBeTruthy();
    }
  });

  it('is deterministic for the same seed', () => {
    const a = layoutStars(SKY_GAMES, opts);
    const b = layoutStars(SKY_GAMES, opts);
    expect(b).toEqual(a);
  });

  it('separates clusters horizontally (strategy left of party)', () => {
    const stars = layoutStars(SKY_GAMES, opts);
    const avg = (c) => {
      const xs = stars.filter((s) => s.cluster === c).map((s) => s.x);
      return xs.reduce((t, x) => t + x, 0) / xs.length;
    };
    expect(avg('strategy')).toBeLessThan(avg('party'));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd client && npx vitest run src/sky/skyModel.layout.test.js`
Expected: FAIL — `layoutStars is not a function`.

- [ ] **Step 3: Write the implementation (append to `skyModel.js`)**

```javascript
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd client && npx vitest run src/sky/skyModel.layout.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/sky/skyModel.js client/src/sky/skyModel.layout.test.js
git commit -m "feat(sky): deterministic seeded star layout by cluster"
```

---

## Task 7: Client — `applyCounts` + `hitTest`

**Files:**
- Modify: `client/src/sky/skyModel.js`
- Create: `client/src/sky/skyModel.hit.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// client/src/sky/skyModel.hit.test.js
import { describe, it, expect } from 'vitest';
import { applyCounts, hitTest } from './skyModel';

const stars = [
  { id: 'a', x: 100, y: 100 },
  { id: 'b', x: 300, y: 300 },
];

describe('applyCounts', () => {
  it('adds players, radius and brightness from a counts map', () => {
    const out = applyCounts(stars, { a: 5 });
    const a = out.find((s) => s.id === 'a');
    const b = out.find((s) => s.id === 'b');
    expect(a.players).toBe(5);
    expect(a.radius).toBeGreaterThan(10);
    expect(a.brightness).toBeGreaterThan(0.35);
    expect(b.players).toBe(0); // missing → zero
  });
});

describe('hitTest', () => {
  const sized = applyCounts(stars, { a: 0, b: 0 }); // radius ~10 each
  it('returns the star when the point is within its radius', () => {
    expect(hitTest(sized, 104, 103).id).toBe('a');
  });
  it('returns null when the point is far from every star', () => {
    expect(hitTest(sized, 500, 500)).toBe(null);
  });
  it('returns the nearest star when two overlap', () => {
    const close = applyCounts([{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 112, y: 100 }], { a: 0, b: 0 });
    expect(hitTest(close, 101, 100).id).toBe('a');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd client && npx vitest run src/sky/skyModel.hit.test.js`
Expected: FAIL — `applyCounts is not a function`.

- [ ] **Step 3: Write the implementation (append to `skyModel.js`)**

```javascript
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd client && npx vitest run src/sky/skyModel.hit.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/sky/skyModel.js client/src/sky/skyModel.hit.test.js
git commit -m "feat(sky): applyCounts + hitTest geometry"
```

---

## Task 8: Client — effects queue + starfield generator

**Files:**
- Modify: `client/src/sky/skyModel.js`
- Create: `client/src/sky/skyModel.effects.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// client/src/sky/skyModel.effects.test.js
import { describe, it, expect } from 'vitest';
import { makeEffect, ageEffects, generateStarfield } from './skyModel';

describe('effects queue', () => {
  it('makeEffect carries type, payload, ttl and starts at t=0', () => {
    const e = makeEffect('win', { game: 'chess' }, 2000);
    expect(e.type).toBe('win');
    expect(e.payload.game).toBe('chess');
    expect(e.t).toBe(0);
    expect(e.ttl).toBe(2000);
    expect(e.id).toBeTruthy();
  });

  it('ageEffects advances time and drops expired effects', () => {
    const a = makeEffect('win', {}, 1000);
    const b = makeEffect('win', {}, 5000);
    const next = ageEffects([a, b], 1200);
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe(b.id);
    expect(next[0].t).toBe(1200);
  });
});

describe('generateStarfield', () => {
  it('is deterministic and within bounds', () => {
    const one = generateStarfield(3, 50, 400, 300);
    const two = generateStarfield(3, 50, 400, 300);
    expect(one).toEqual(two);
    expect(one).toHaveLength(50);
    for (const s of one) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(400);
      expect(s.y).toBeLessThanOrEqual(300);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd client && npx vitest run src/sky/skyModel.effects.test.js`
Expected: FAIL — `makeEffect is not a function`.

- [ ] **Step 3: Write the implementation (append to `skyModel.js`)**

```javascript
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd client && npx vitest run src/sky/skyModel.effects.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/sky/skyModel.js client/src/sky/skyModel.effects.test.js
git commit -m "feat(sky): effects queue + deterministic starfield"
```

---

## Task 9: Client — `useSkyData` hook

**Files:**
- Create: `client/src/sky/useSkyData.js`, `client/src/sky/useSkyData.test.jsx`

- [ ] **Step 1: Write the failing test (with a mock socket)**

```jsx
// client/src/sky/useSkyData.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSkyData } from './useSkyData';

// Minimal fake socket that records handlers so the test can fire events.
function makeFakeSocket() {
  const handlers = {};
  return {
    on: (ev, fn) => { (handlers[ev] ||= []).push(fn); },
    off: (ev, fn) => { handlers[ev] = (handlers[ev] || []).filter((h) => h !== fn); },
    emit: () => {},
    fire: (ev, data) => (handlers[ev] || []).forEach((h) => h(data)),
  };
}

describe('useSkyData', () => {
  it('lays out stars and applies live counts from sky:state', () => {
    const socket = makeFakeSocket();
    const { result } = renderHook(() => useSkyData({ width: 800, height: 600, socket }));
    expect(result.current.stars.length).toBeGreaterThan(0);

    act(() => socket.fire('sky:state', { totalPlayers: 5, games: [{ game: 'chess', players: 5, rooms: 2 }] }));
    const chess = result.current.stars.find((s) => s.id === 'chess');
    expect(chess.players).toBe(5);
    expect(result.current.totalPlayers).toBe(5);
  });

  it('pushes an effect on sky:event', () => {
    const socket = makeFakeSocket();
    const { result } = renderHook(() => useSkyData({ width: 800, height: 600, socket }));
    act(() => socket.fire('sky:event', { type: 'win', game: 'chess' }));
    expect(result.current.effects).toHaveLength(1);
    expect(result.current.effects[0].type).toBe('win');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd client && npx vitest run src/sky/useSkyData.test.jsx`
Expected: FAIL — cannot resolve `./useSkyData`.

- [ ] **Step 3: Write the implementation**

```javascript
// client/src/sky/useSkyData.js
import { useEffect, useMemo, useRef, useState } from 'react';
import { socket as defaultSocket } from '../socket';
import { SKY_GAMES } from './games';
import { layoutStars, applyCounts, makeEffect } from './skyModel';

// `socket` is injectable for tests; defaults to the shared app socket.
export function useSkyData({ width, height, seed = 42, socket = defaultSocket }) {
  const base = useMemo(
    () => layoutStars(SKY_GAMES, { width, height, seed }),
    [width, height, seed]
  );
  const [counts, setCounts] = useState({});
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [effects, setEffects] = useState([]);
  const effectsRef = useRef(effects);
  effectsRef.current = effects;

  useEffect(() => {
    const onState = (state) => {
      const map = {};
      for (const g of state.games || []) map[g.game] = g.players;
      setCounts(map);
      setTotalPlayers(state.totalPlayers || 0);
    };
    const onEvent = (ev) => {
      setEffects((prev) => [...prev, makeEffect(ev.type, ev, 2200)]);
    };
    socket.on('sky:state', onState);
    socket.on('sky:event', onEvent);
    return () => {
      socket.off('sky:state', onState);
      socket.off('sky:event', onEvent);
    };
  }, [socket]);

  const stars = useMemo(() => applyCounts(base, counts), [base, counts]);
  return { stars, effects, setEffects, totalPlayers };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd client && npx vitest run src/sky/useSkyData.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/sky/useSkyData.js client/src/sky/useSkyData.test.jsx
git commit -m "feat(sky): useSkyData hook wiring socket state to the model"
```

---

## Task 10: Client — `SkyCanvas` component

**Files:**
- Create: `client/src/sky/SkyCanvas.jsx`, `client/src/sky/SkyCanvas.css`, `client/src/sky/SkyCanvas.test.jsx`

jsdom does not implement canvas drawing, so the test stubs `getContext` and asserts the component mounts and routes clicks through `hitTest` to `onSelect`. Visual correctness is verified manually in Task 14.

- [ ] **Step 1: Write the failing test**

```jsx
// client/src/sky/SkyCanvas.test.jsx
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import SkyCanvas from './SkyCanvas';

beforeAll(() => {
  // Stub the 2D context so the rAF draw loop is a no-op under jsdom.
  HTMLCanvasElement.prototype.getContext = () => ({
    clearRect() {}, beginPath() {}, arc() {}, fill() {}, save() {}, restore() {},
    fillRect() {}, createRadialGradient() { return { addColorStop() {} }; },
    set fillStyle(_) {}, set globalAlpha(_) {}, set font(_) {}, fillText() {},
    set textAlign(_) {}, set shadowBlur(_) {}, set shadowColor(_) {}, translate() {}, scale() {},
  });
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(16), 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
});

const stars = [
  { id: 'chess', name: 'Chess', route: 'chess', cluster: 'strategy', glyph: '♟', x: 120, y: 90, radius: 16, brightness: 1 },
];

describe('SkyCanvas', () => {
  it('renders a canvas', () => {
    const { container } = render(<SkyCanvas stars={stars} effects={[]} width={400} height={300} onSelect={() => {}} />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('calls onSelect with the star under a click', () => {
    const onSelect = vi.fn();
    const { container } = render(<SkyCanvas stars={stars} effects={[]} width={400} height={300} onSelect={onSelect} />);
    const canvas = container.querySelector('canvas');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300 });
    fireEvent.click(canvas, { clientX: 122, clientY: 92 });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'chess' }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd client && npx vitest run src/sky/SkyCanvas.test.jsx`
Expected: FAIL — cannot resolve `./SkyCanvas`.

- [ ] **Step 3: Write the component**

```jsx
// client/src/sky/SkyCanvas.jsx
import { useEffect, useRef } from 'react';
import { hitTest, generateStarfield } from './skyModel';
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
      raf = requestAnimationFrame(draw);
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
  return cluster === 'word' ? '#f472b6' : cluster === 'party' ? '#34d399' : '#38bdf8';
}
```

```css
/* client/src/sky/SkyCanvas.css */
.sky-canvas { display: block; cursor: pointer; touch-action: none; }
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd client && npx vitest run src/sky/SkyCanvas.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/sky/SkyCanvas.jsx client/src/sky/SkyCanvas.css client/src/sky/SkyCanvas.test.jsx
git commit -m "feat(sky): SkyCanvas renderer with hit-testing"
```

---

## Task 11: Client — `SkyOverlay` detail capsule

**Files:**
- Create: `client/src/sky/SkyOverlay.jsx`, `client/src/sky/SkyOverlay.css`, `client/src/sky/SkyOverlay.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// client/src/sky/SkyOverlay.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SkyOverlay from './SkyOverlay';

const star = { id: 'chess', name: 'Chess', route: 'chess', players: 128, glyph: '♟', cluster: 'strategy' };

describe('SkyOverlay', () => {
  it('renders nothing when no star is selected', () => {
    const { container } = render(<SkyOverlay star={null} onPlay={() => {}} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the selected game and live count', () => {
    render(<SkyOverlay star={star} onPlay={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Chess')).toBeInTheDocument();
    expect(screen.getByText(/128 playing/i)).toBeInTheDocument();
  });

  it('calls onPlay with the star when Play is clicked', () => {
    const onPlay = vi.fn();
    render(<SkyOverlay star={star} onPlay={onPlay} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(onPlay).toHaveBeenCalledWith(star);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd client && npx vitest run src/sky/SkyOverlay.test.jsx`
Expected: FAIL — cannot resolve `./SkyOverlay`.

- [ ] **Step 3: Write the component**

```jsx
// client/src/sky/SkyOverlay.jsx
import './SkyOverlay.css';

export default function SkyOverlay({ star, onPlay, onClose }) {
  if (!star) return null;
  return (
    <div className="sky-capsule" role="dialog" aria-label={`${star.name} details`}>
      <button className="sky-capsule-close" onClick={onClose} aria-label="Close">×</button>
      <div className="sky-capsule-head">
        <span className="sky-capsule-glyph">{star.glyph}</span>
        <div>
          <h3>{star.name}</h3>
          <p>{star.players || 0} playing now</p>
        </div>
      </div>
      <button className="sky-capsule-play" onClick={() => onPlay(star)}>⚡ Play</button>
    </div>
  );
}
```

```css
/* client/src/sky/SkyOverlay.css */
.sky-capsule {
  position: absolute; right: 22px; top: 90px; width: 210px; z-index: 9;
  border-radius: 18px; padding: 16px;
  background: linear-gradient(180deg, rgba(30,27,75,.85), rgba(12,14,30,.85));
  border: 1px solid rgba(129,140,248,.4); backdrop-filter: blur(12px);
  box-shadow: 0 24px 60px rgba(0,0,0,.55); color: #fff; font-family: 'Outfit', system-ui, sans-serif;
}
.sky-capsule-close { position: absolute; top: 8px; right: 10px; background: none; border: none; color: #aab; font-size: 18px; cursor: pointer; }
.sky-capsule-head { display: flex; align-items: center; gap: 12px; }
.sky-capsule-glyph { font-size: 26px; }
.sky-capsule h3 { margin: 0; font-size: 16px; }
.sky-capsule p { margin: 2px 0 0; font-size: 11px; color: #9aa3cf; }
.sky-capsule-play { display: block; width: 100%; margin-top: 14px; padding: 10px; border: none; border-radius: 999px; font-weight: 800; cursor: pointer; background: linear-gradient(90deg,#7dd3fc,#818cf8); color: #06121f; }
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd client && npx vitest run src/sky/SkyOverlay.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/sky/SkyOverlay.jsx client/src/sky/SkyOverlay.css client/src/sky/SkyOverlay.test.jsx
git commit -m "feat(sky): SkyOverlay detail capsule"
```

---

## Task 12: Client — `WarpTransition`

**Files:**
- Create: `client/src/sky/WarpTransition.jsx`, `client/src/sky/WarpTransition.css`, `client/src/sky/WarpTransition.test.jsx`

- [ ] **Step 1: Write the failing test (fake timers)**

```jsx
// client/src/sky/WarpTransition.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import WarpTransition from './WarpTransition';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('WarpTransition', () => {
  it('calls onDone after the animation duration', () => {
    const onDone = vi.fn();
    render(<WarpTransition game={{ name: 'Chess' }} onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1300);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd client && npx vitest run src/sky/WarpTransition.test.jsx`
Expected: FAIL — cannot resolve `./WarpTransition`.

- [ ] **Step 3: Write the component**

```jsx
// client/src/sky/WarpTransition.jsx
import { useEffect } from 'react';
import './WarpTransition.css';

const WARP_MS = 1200;

export default function WarpTransition({ game, onDone }) {
  useEffect(() => {
    const id = setTimeout(onDone, WARP_MS);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <div className="warp" role="status" aria-label={`Entering ${game?.name || 'game'}`}>
      <div className="warp-streaks" />
      <p className="warp-label">Entering {game?.name}…</p>
    </div>
  );
}
```

```css
/* client/src/sky/WarpTransition.css */
.warp { position: fixed; inset: 0; z-index: 50; background: #05060f; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.warp-streaks { position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 50%, transparent 0, #05060f 70%),
    repeating-conic-gradient(from 0deg, rgba(255,255,255,.7) 0deg 1deg, transparent 1deg 6deg);
  animation: warpzoom 1.2s cubic-bezier(.6,0,.9,1) forwards; }
@keyframes warpzoom { 0% { transform: scale(.2); opacity: 0; } 30% { opacity: 1; } 100% { transform: scale(6); opacity: 0; } }
.warp-label { position: relative; color: #cbd5ff; font-family: 'Outfit', system-ui, sans-serif; font-weight: 700; }
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd client && npx vitest run src/sky/WarpTransition.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/sky/WarpTransition.jsx client/src/sky/WarpTransition.css client/src/sky/WarpTransition.test.jsx
git commit -m "feat(sky): warp-speed entry transition"
```

---

## Task 13: Client — `FallbackList` (accessible)

**Files:**
- Create: `client/src/sky/FallbackList.jsx`, `client/src/sky/FallbackList.css`, `client/src/sky/FallbackList.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// client/src/sky/FallbackList.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FallbackList from './FallbackList';

const stars = [
  { id: 'chess', name: 'Chess', route: 'chess', players: 12, glyph: '♟' },
  { id: 'wordle', name: 'Wordle', route: 'wordle', players: 3, glyph: '✺' },
];

describe('FallbackList', () => {
  it('renders a button per game with its live count', () => {
    render(<FallbackList stars={stars} onPlay={() => {}} />);
    expect(screen.getByRole('button', { name: /Chess.*12/s })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Wordle.*3/s })).toBeInTheDocument();
  });

  it('calls onPlay with the game when activated', () => {
    const onPlay = vi.fn();
    render(<FallbackList stars={stars} onPlay={onPlay} />);
    fireEvent.click(screen.getByRole('button', { name: /Chess/ }));
    expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({ id: 'chess' }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd client && npx vitest run src/sky/FallbackList.test.jsx`
Expected: FAIL — cannot resolve `./FallbackList`.

- [ ] **Step 3: Write the component**

```jsx
// client/src/sky/FallbackList.jsx
import './FallbackList.css';

export default function FallbackList({ stars, onPlay }) {
  return (
    <ul className="sky-fallback" aria-label="Games">
      {stars.map((s) => (
        <li key={s.id}>
          <button className="sky-fallback-item" onClick={() => onPlay(s)}>
            <span className="sky-fallback-glyph" aria-hidden="true">{s.glyph}</span>
            <span className="sky-fallback-name">{s.name}</span>
            <span className="sky-fallback-count">{s.players || 0} playing</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
```

```css
/* client/src/sky/FallbackList.css */
.sky-fallback { list-style: none; margin: 0; padding: 16px; display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
.sky-fallback-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 14px; border-radius: 14px; cursor: pointer;
  background: #14171c; border: 1px solid #23272e; color: #fff; font-family: 'Outfit', system-ui, sans-serif; text-align: left; }
.sky-fallback-item:hover, .sky-fallback-item:focus-visible { border-color: #818cf8; outline: none; }
.sky-fallback-glyph { font-size: 20px; }
.sky-fallback-name { font-weight: 700; }
.sky-fallback-count { margin-left: auto; font-size: 11px; color: #9aa0a8; }
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd client && npx vitest run src/sky/FallbackList.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/sky/FallbackList.jsx client/src/sky/FallbackList.css client/src/sky/FallbackList.test.jsx
git commit -m "feat(sky): accessible fallback list view"
```

---

## Task 14: Client — `Sky` page, route, theme tokens, toggle

**Files:**
- Create: `client/src/pages/Sky.jsx`, `client/src/pages/Sky.css`, `client/src/pages/Sky.test.jsx`
- Modify: `client/src/App.jsx`, `client/src/pages/Games.jsx`, `client/src/context/theme.css`

- [ ] **Step 1: Write the failing test**

```jsx
// client/src/pages/Sky.test.jsx
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sky from './Sky';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => ({
    clearRect() {}, beginPath() {}, arc() {}, fill() {}, save() {}, restore() {}, fillRect() {},
    createRadialGradient() { return { addColorStop() {} }; }, fillText() {}, translate() {}, scale() {},
    set fillStyle(_) {}, set globalAlpha(_) {}, set font(_) {}, set textAlign(_) {}, set shadowBlur(_) {}, set shadowColor(_) {},
  });
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(16), 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
  window.matchMedia = window.matchMedia || ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
});

describe('Sky page', () => {
  it('renders the sky surface with a heading', () => {
    render(<MemoryRouter><Sky /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /the sky/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd client && npx vitest run src/pages/Sky.test.jsx`
Expected: FAIL — cannot resolve `./Sky`.

- [ ] **Step 3: Write the page**

```jsx
// client/src/pages/Sky.jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SkyCanvas from '../sky/SkyCanvas';
import SkyOverlay from '../sky/SkyOverlay';
import WarpTransition from '../sky/WarpTransition';
import FallbackList from '../sky/FallbackList';
import { useSkyData } from '../sky/useSkyData';
import './Sky.css';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Sky() {
  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const [size, setSize] = useState({ width: 800, height: 560 });
  const [selected, setSelected] = useState(null);
  const [warpGame, setWarpGame] = useState(null);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: Math.max(420, el.clientHeight) });
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const { stars, totalPlayers } = useSkyData({ width: size.width, height: size.height });

  const play = (star) => {
    if (reduced) { navigate(`/game/${star.route}/local`, { state: { gameType: star.id, isLocal: true } }); return; }
    setSelected(null);
    setWarpGame(star);
  };

  return (
    <div className="sky-page" data-theme="cosmic" ref={wrapRef}>
      <header className="sky-head">
        <h2>The Sky</h2>
        <span className="sky-total">◍ {totalPlayers} playing</span>
        <Link className="sky-back" to="/games">Classic view</Link>
      </header>

      {reduced ? (
        <FallbackList stars={stars} onPlay={play} />
      ) : (
        <div className="sky-surface">
          <SkyCanvas stars={stars} effects={[]} width={size.width} height={size.height} onSelect={setSelected} />
          <SkyOverlay star={selected} onPlay={play} onClose={() => setSelected(null)} />
        </div>
      )}

      {warpGame && (
        <WarpTransition
          game={warpGame}
          onDone={() => navigate(`/game/${warpGame.route}/local`, { state: { gameType: warpGame.id, isLocal: true } })}
        />
      )}
    </div>
  );
}
```

```css
/* client/src/pages/Sky.css */
.sky-page[data-theme="cosmic"] { --bg: #070812; min-height: 100vh; background: radial-gradient(90% 90% at 65% 30%, #141a3a, #070812 70%); color: #fff; font-family: 'Outfit', system-ui, sans-serif; }
.sky-head { display: flex; align-items: center; gap: 16px; padding: 14px 20px; }
.sky-head h2 { margin: 0; font-size: 20px; }
.sky-total { font-size: 12px; color: #aeb6e0; }
.sky-back { margin-left: auto; font-size: 12px; color: #9aa3cf; text-decoration: none; border: 1px solid rgba(255,255,255,.18); padding: 6px 12px; border-radius: 999px; }
.sky-surface { position: relative; }
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd client && npx vitest run src/pages/Sky.test.jsx`
Expected: PASS.

- [ ] **Step 5: Add the `/sky` route**

In `client/src/App.jsx`, add the import near the other page imports:

```jsx
import Sky from './pages/Sky';
```

and add this route inside the `<Route element={<MainLayout />}>` group, next to the `/games` route:

```jsx
                <Route path="/sky" element={<Sky />} />
```

- [ ] **Step 6: Add the beta toggle on the Games page**

In `client/src/pages/Games.jsx`, add `Link` to the router import:

```jsx
import { useNavigate, Link } from 'react-router-dom';
```

and add this just after the opening `<div className="games-container">` and the `<h2>Select a Game</h2>`:

```jsx
            <Link to="/sky" className="sky-beta-link">✨ Try the new sky (beta)</Link>
```

- [ ] **Step 7: Add cosmic theme tokens**

Append to `client/src/context/theme.css`:

```css
[data-theme="cosmic"] {
    --bg-primary: #070812;
    --bg-secondary: #0c0e1a;
    --text-primary: #ffffff;
    --text-secondary: #9aa3cf;
    --accent: #818cf8;
    --accent-hover: #6366f1;
    --border-color: rgba(129,140,248,.3);
}
```

- [ ] **Step 8: Run the full client test suite**

Run: `cd client && npm test`
Expected: PASS — every sky test plus the smoke test.

- [ ] **Step 9: Manual verification**

Run `cd server && npm start`, then `cd client && VITE_API_URL=http://localhost:3001 npm run dev`. Open `http://localhost:5173/games`, click "✨ Try the new sky (beta)". Verify: the star-map renders with a twinkling field and game-stars grouped left-to-right by cluster; clicking a star opens the capsule; "Play" triggers the warp and lands in pass-n-play; "Classic view" returns to `/games`. Toggle OS "reduce motion" and reload `/sky` — the accessible list renders instead. Resize to a narrow width — no horizontal scroll.

- [ ] **Step 10: Commit**

```bash
git add client/src/pages/Sky.jsx client/src/pages/Sky.css client/src/pages/Sky.test.jsx client/src/App.jsx client/src/pages/Games.jsx client/src/context/theme.css
git commit -m "feat(sky): Sky page, /sky route, cosmic theme tokens, beta toggle"
```

---

## Self-review

**Spec coverage (Phase 1 items):**
- Canvas starfield + game-stars sized/colored by category → Tasks 8, 10.
- Live brightness from real counts → Tasks 1–2 (server), 5, 7, 9.
- Hover/click → detail capsule → Tasks 10, 11.
- Warp-speed entry → Task 12, wired in 14.
- Reduced-motion / accessible fallback → Tasks 13, 14.
- `/sky` route + beta toggle → Task 14.
- Cosmic theme tokens introduced on `/sky` → Task 14.
- `skyModel` / `SkyCanvas` / `SkyOverlay` / `skyPresence` component split → all tasks.
- TDD on skyModel + skyPresence → Tasks 1, 5, 6, 7, 8.

**Deferred to later phases (by design, per spec):** orbiting rooms, comets, supernova, pan/zoom, named constellations, gravity, black hole, binary duels, cosmic time, your-star, draw-your-own, online room entry + spectate, whole-site re-skin.

**Type consistency:** `computeSkyState`→`{ totalPlayers, games:[{game,players,rooms}] }` consumed identically in Task 2 and Task 9's `onState`. `applyCounts` output (`players`,`radius`,`brightness`) consumed by `SkyCanvas` (radius, brightness, cluster, glyph) and `SkyOverlay` (players, glyph, name). `layoutStars` output keys (`id,name,route,cluster,glyph,x,y`) flow unchanged through `applyCounts` into components. `hitTest` returns a star object passed straight to `onSelect`→`setSelected`→`SkyOverlay`. Consistent.

**Placeholder scan:** none — every step has concrete code or an exact command.
