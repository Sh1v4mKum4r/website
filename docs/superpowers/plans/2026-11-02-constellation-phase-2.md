# Constellation Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the living spectacle to the `/sky` constellation — pan/zoom the sky, named constellations with nebulae and star-lines, supernova flares on wins (consuming Phase 1's already-wired `sky:event`/effects), and player comets that streak between games on migration — then deploy.

**Architecture:** All built on Phase 1. The canvas gains a `camera` (pan/zoom) whose transform is pure and unit-tested; `skyModel` gains pure helpers for cluster centroids, effect progress, and comet interpolation. `SkyCanvas` renders the new layers each frame from props. The server gains a pure migration detector that emits `sky:event {type:'move', from, to}`; the client renders it as a comet.

**Tech Stack:** Same as Phase 1 — React 19, Canvas 2D, Socket.IO, Vitest; server node tests.

**Scope (deferred to Phase 2b):** orbiting room-moons and online room entry/spectate (needs lobby-context integration) — NOT in this plan.

**Naming contract (new, Phase 2):**
- `skyModel.js` adds: `makeCamera()` → `{x,y,scale}`; `clampCamera(cam, {width,height})`; `screenToWorld(cam, sx, sy)`; `worldToScreen(cam, wx, wy)`; `clusterCentroids(stars)` → `{cluster:{x,y}}`; `effectProgress(effect)` → 0..1; `cometPos(from, to, p)` → `{x,y}`.
- Server `skyPresence.js` adds: `diffPresence(prev, next)` → `[{type:'move', game} | ...]` move events from two player-location snapshots; `snapshotLocations(lobbies)` → `{socketId: game}`.
- `sky:event` gains `{type:'move', from, to}` (both are game ids) and keeps `{type:'win', game}`.

---

## Task 1: Camera (pan & zoom) — pure transform

**Files:** Modify `client/src/sky/skyModel.js`; Create `client/src/sky/skyModel.camera.test.js`.

- [ ] **Step 1: Write the failing test**
```javascript
// client/src/sky/skyModel.camera.test.js
import { describe, it, expect } from 'vitest';
import { makeCamera, screenToWorld, worldToScreen, clampCamera } from './skyModel';

describe('camera', () => {
  it('makeCamera starts at origin, scale 1', () => {
    expect(makeCamera()).toEqual({ x: 0, y: 0, scale: 1 });
  });
  it('worldToScreen and screenToWorld are inverses', () => {
    const cam = { x: 40, y: -20, scale: 1.5 };
    const s = worldToScreen(cam, 100, 200);
    const w = screenToWorld(cam, s.x, s.y);
    expect(w.x).toBeCloseTo(100, 5);
    expect(w.y).toBeCloseTo(200, 5);
  });
  it('clampCamera keeps scale within [1, 3]', () => {
    expect(clampCamera({ x: 0, y: 0, scale: 0.2 }, { width: 800, height: 600 }).scale).toBe(1);
    expect(clampCamera({ x: 0, y: 0, scale: 9 }, { width: 800, height: 600 }).scale).toBe(3);
  });
});
```

- [ ] **Step 2: Run to verify it fails**
Run: `cd "/home/sh4d0w/agentic coding projects/website/client" && npx vitest run src/sky/skyModel.camera.test.js`
Expected: FAIL — `makeCamera is not a function`.

- [ ] **Step 3: Append to `client/src/sky/skyModel.js`**
```javascript
export function makeCamera() { return { x: 0, y: 0, scale: 1 }; }

export function worldToScreen(cam, wx, wy) {
  return { x: wx * cam.scale + cam.x, y: wy * cam.scale + cam.y };
}
export function screenToWorld(cam, sx, sy) {
  return { x: (sx - cam.x) / cam.scale, y: (sy - cam.y) / cam.scale };
}
export function clampCamera(cam, { width, height }) {
  const scale = Math.min(3, Math.max(1, cam.scale));
  // keep the world from drifting entirely off-screen
  const maxPan = { x: width * (scale - 1), y: height * (scale - 1) };
  const x = Math.min(0, Math.max(-maxPan.x, cam.x));
  const y = Math.min(0, Math.max(-maxPan.y, cam.y));
  return { x, y, scale };
}
```

- [ ] **Step 4: Run to verify it passes**
Run the camera test file, then `npm test`. Expected: all pass.

- [ ] **Step 5: Commit**
```bash
git add client/src/sky/skyModel.js client/src/sky/skyModel.camera.test.js
git commit -m "feat(sky): pure pan/zoom camera transform"
```

---

## Task 2: Cluster centroids + effect/comet math

**Files:** Modify `client/src/sky/skyModel.js`; Create `client/src/sky/skyModel.phase2math.test.js`.

- [ ] **Step 1: Write the failing test**
```javascript
// client/src/sky/skyModel.phase2math.test.js
import { describe, it, expect } from 'vitest';
import { clusterCentroids, effectProgress, cometPos } from './skyModel';

describe('clusterCentroids', () => {
  it('averages star positions per cluster', () => {
    const stars = [
      { cluster: 'strategy', x: 0, y: 0 }, { cluster: 'strategy', x: 100, y: 50 },
      { cluster: 'word', x: 300, y: 300 },
    ];
    const c = clusterCentroids(stars);
    expect(c.strategy).toEqual({ x: 50, y: 25 });
    expect(c.word).toEqual({ x: 300, y: 300 });
  });
});

describe('effectProgress', () => {
  it('is 0 at birth and 1 at ttl', () => {
    expect(effectProgress({ t: 0, ttl: 2000 })).toBe(0);
    expect(effectProgress({ t: 2000, ttl: 2000 })).toBe(1);
    expect(effectProgress({ t: 1000, ttl: 2000 })).toBe(0.5);
  });
});

describe('cometPos', () => {
  it('interpolates from A to B by p', () => {
    expect(cometPos({ x: 0, y: 0 }, { x: 100, y: 200 }, 0.5)).toEqual({ x: 50, y: 100 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**
Run: `cd "/home/sh4d0w/agentic coding projects/website/client" && npx vitest run src/sky/skyModel.phase2math.test.js`
Expected: FAIL — `clusterCentroids is not a function`.

- [ ] **Step 3: Append to `client/src/sky/skyModel.js`**
```javascript
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
```

- [ ] **Step 4: Run to verify it passes**
Run the test file, then `npm test`. Expected: all pass.

- [ ] **Step 5: Commit**
```bash
git add client/src/sky/skyModel.js client/src/sky/skyModel.phase2math.test.js
git commit -m "feat(sky): cluster centroids, effect progress, comet interpolation"
```

---

## Task 3: Server — migration detection + `sky:event {type:'move'}`

**Files:** Modify `server/utils/skyPresence.js`; Create/extend `server/skyPresence.test.js` (add cases); Modify `server/server.js`.

- [ ] **Step 1: Add failing test cases to `server/skyPresence.test.js`** (append before the final `console.log`)
```javascript
const { snapshotLocations, diffPresence } = require('./utils/skyPresence');

check('snapshotLocations maps each human socket to its game', () => {
  const locs = snapshotLocations({ L1: { rooms: { R1: { gameType: 'chess', players: { a: 'X', 'bot-1': 'O' } } } } });
  assert.deepStrictEqual(locs, { a: 'chess' });
});

check('diffPresence emits a move when a player changes game', () => {
  const prev = { a: 'chess' };
  const next = { a: 'wordle' };
  assert.deepStrictEqual(diffPresence(prev, next), [{ type: 'move', from: 'chess', to: 'wordle' }]);
});

check('diffPresence emits nothing when nobody moved', () => {
  assert.deepStrictEqual(diffPresence({ a: 'chess' }, { a: 'chess' }), []);
});

check('diffPresence ignores joins and leaves (only game-to-game moves)', () => {
  assert.deepStrictEqual(diffPresence({}, { a: 'chess' }), []);
  assert.deepStrictEqual(diffPresence({ a: 'chess' }, {}), []);
});
```

- [ ] **Step 2: Run to verify it fails**
Run: `cd "/home/sh4d0w/agentic coding projects/website/server" && node skyPresence.test.js`
Expected: FAIL — `snapshotLocations is not a function`.

- [ ] **Step 3: Append to `server/utils/skyPresence.js`** (before `module.exports`, and add the two names to the export)
```javascript
// Map each HUMAN socket id to the game it is currently in.
function snapshotLocations(lobbies) {
  const locs = {};
  for (const lobby of Object.values(lobbies || {})) {
    for (const room of Object.values(lobby.rooms || {})) {
      if (!room.gameType) continue;
      for (const id of Object.keys(room.players || {})) {
        if (!id.startsWith('bot-')) locs[id] = room.gameType;
      }
    }
  }
  return locs;
}

// Compare two location snapshots; emit a move event only when a player
// goes from one game directly to another (joins/leaves are ignored).
function diffPresence(prev, next) {
  const events = [];
  for (const [id, to] of Object.entries(next)) {
    const from = prev[id];
    if (from && from !== to) events.push({ type: 'move', from, to });
  }
  return events;
}
```
Change the export line to:
```javascript
module.exports = { computeSkyState, buildWinEvent, snapshotLocations, diffPresence };
```

- [ ] **Step 4: Run to verify it passes**
Run: `cd "/home/sh4d0w/agentic coding projects/website/server" && node skyPresence.test.js`
Expected: PASS — all checks (now 12).

- [ ] **Step 5: Wire into `server/server.js`.** Update the import line that pulls from `./utils/skyPresence` to also import the new names:
```javascript
const { computeSkyState, buildWinEvent, snapshotLocations, diffPresence } = require('./utils/skyPresence');
```
Replace the existing `broadcastSkyState` block (added in Phase 1) with one that also diffs locations and emits moves:
```javascript
// ── Sky presence broadcast ──
const SKY_STATE_INTERVAL_MS = 4000;
let lastLocations = {};
function broadcastSkyState() {
  const next = snapshotLocations(lobbies);
  for (const ev of diffPresence(lastLocations, next)) io.emit('sky:event', ev);
  lastLocations = next;
  io.emit('sky:state', computeSkyState(lobbies));
}
setInterval(broadcastSkyState, SKY_STATE_INTERVAL_MS).unref?.();
```

- [ ] **Step 6: Verify the server suite**
Run: `cd "/home/sh4d0w/agentic coding projects/website/server" && npm test`. Expected: all four files pass.

- [ ] **Step 7: Commit**
```bash
git add server/utils/skyPresence.js server/skyPresence.test.js server/server.js
git commit -m "feat(sky): emit sky:event move on player migration between games"
```

---

## Task 4: Client — render nebulae, constellations, effects & comets

**Files:** Modify `client/src/sky/SkyCanvas.jsx`; Modify `client/src/pages/Sky.jsx`; extend `client/src/sky/SkyCanvas.test.jsx`.

This task is canvas rendering (verified manually) plus wiring. The pure math it relies on is already tested in Tasks 1–2. Keep the existing SkyCanvas tests green.

- [ ] **Step 1: Wire real effects + camera into the page.** In `client/src/pages/Sky.jsx`:
  - Change the hook call to also take effects: `const { stars, totalPlayers, effects } = useSkyData({ width: size.width, height: size.height });`
  - Pass real effects and a camera to the canvas: `<SkyCanvas stars={stars} effects={effects} width={size.width} height={size.height} onSelect={setSelected} />` (effects now real, not `[]`).

- [ ] **Step 2: Extend `SkyCanvas.jsx` to draw the new layers.** Add these imports at the top: `import { clusterColor as _unused } from './skyModel';` is NOT needed — instead import the new helpers: `import { hitTest, generateStarfield, clusterCentroids, effectProgress, cometPos } from './skyModel';` and `import { CLUSTERS, SKY_GAMES } from './games';`. In the draw loop, AFTER drawing the starfield and BEFORE the game stars, draw nebulae + constellation lines; AFTER the stars, draw effects (supernova/shooting) and comets. Concretely, inside `draw`, add:
```javascript
      // nebula tints per cluster
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
        ctx.fillText((CLUSTERS[cluster] && CLUSTERS[cluster].label || '').toUpperCase(), c.x, c.y - 150);
      }
      // constellation lines: link stars within a cluster in id order
      ctx.strokeStyle = 'rgba(160,180,255,0.18)';
      ctx.lineWidth = 1;
      for (const cluster of Object.keys(centroids)) {
        const members = stars.filter((s) => s.cluster === cluster);
        ctx.beginPath();
        members.forEach((s, i) => (i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y)));
        ctx.stroke();
      }
```
and after the game-stars loop, add effect + comet rendering:
```javascript
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
```
Add this helper at the bottom of the file (next to `clusterColor`):
```javascript
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
```

- [ ] **Step 3: Age the effects so they expire.** The effects come from `useSkyData` but nothing advances their `t`. In `SkyCanvas.jsx`, the draw loop already has `now`; track `last` time and call the page's ager. Simplest: in `useSkyData.js`, add a `useEffect` with an interval that ages effects every 100ms:
```javascript
  useEffect(() => {
    const id = setInterval(() => {
      setEffects((prev) => (prev.length ? ageEffects(prev, 100) : prev));
    }, 100);
    return () => clearInterval(id);
  }, []);
```
and import `ageEffects` from `./skyModel` in `useSkyData.js`.

- [ ] **Step 4: Keep the existing canvas test green and add one.** The current `SkyCanvas.test.jsx` stubs `getContext` with a subset of methods; add the methods the new code calls so it doesn't throw: ensure the stub object also has `createRadialGradient` (already present), `moveTo() {}`, `lineTo() {}`, `stroke() {}`, `set strokeStyle(_) {}`, `set lineWidth(_) {}`. Add those setters/methods to the `beforeAll` stub in `SkyCanvas.test.jsx` (and in `Sky.test.jsx`'s stub). Then the existing tests (renders a canvas; click → onSelect) must still pass with effects provided.

- [ ] **Step 5: Run the suites**
Run: `cd "/home/sh4d0w/agentic coding projects/website/client" && npm test`. Expected: all pass. Then `npm run build` — must succeed.

- [ ] **Step 6: Manual verification**
Start server + client (`VITE_API_URL=http://localhost:3001`), open `/sky`: confirm cluster nebulae tints + labels + faint constellation lines render; open two browser tabs, create/join a game in one so a win fires, and confirm a golden shockwave ring expands from that star; move a player between two games and confirm a comet streaks between the stars.

- [ ] **Step 7: Commit**
```bash
git add client/src/sky/SkyCanvas.jsx client/src/sky/SkyCanvas.test.jsx client/src/pages/Sky.jsx client/src/pages/Sky.test.jsx client/src/sky/useSkyData.js
git commit -m "feat(sky): render nebulae, constellations, supernova wins and migration comets"
```

---

## Task 5: Pan & zoom interaction on the canvas

**Files:** Modify `client/src/sky/SkyCanvas.jsx`; extend `client/src/sky/SkyCanvas.test.jsx`.

- [ ] **Step 1: Add a failing test** for world-space hit-testing under a panned camera. Append to `SkyCanvas.test.jsx`:
```jsx
  it('hit-tests in world space when panned/zoomed', () => {
    const onSelect = vi.fn();
    const { container } = render(<SkyCanvas stars={stars} effects={[]} width={400} height={300} onSelect={onSelect} />);
    const canvas = container.querySelector('canvas');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300 });
    // zoom in by scrolling, then a click near the star's screen position should still resolve it
    fireEvent.wheel(canvas, { deltaY: -100, clientX: 120, clientY: 90 });
    fireEvent.click(canvas, { clientX: 120, clientY: 90 });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'chess' }));
  });
```

- [ ] **Step 2: Run to verify it fails** (the wheel handler doesn't exist yet, but the click may still pass at scale 1 — the test pins the behavior). Run the file; if it already passes trivially, proceed; the real value is Step 3's implementation not regressing it.

- [ ] **Step 3: Implement camera state + handlers in `SkyCanvas.jsx`.** Add `import { makeCamera, screenToWorld, worldToScreen, clampCamera } from './skyModel';`. Hold a camera in a ref: `const camRef = useRef(makeCamera());`. In the draw loop, apply the camera before drawing world content: after `ctx.clearRect(...)`, add `ctx.save(); ctx.translate(camRef.current.x, camRef.current.y); ctx.scale(camRef.current.scale, camRef.current.scale);` and `ctx.restore();` at the end of the frame (wrap starfield in screen space before the save if you want it fixed; acceptable to include it in the transform for Phase 2). Update `handleClick` to convert to world coords: `const w = screenToWorld(camRef.current, x, y); const hit = hitTest(stateRef.current.stars, w.x, w.y);`. Add wheel + drag handlers:
```jsx
  const onWheel = (e) => {
    e.preventDefault();
    const cam = camRef.current;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    camRef.current = clampCamera({ ...cam, scale: cam.scale * factor }, { width, height });
  };
  const dragRef = useRef(null);
  const onPointerDown = (e) => { dragRef.current = { x: e.clientX, y: e.clientY, cam: { ...camRef.current } }; };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const d = dragRef.current;
    camRef.current = clampCamera({ ...d.cam, x: d.cam.x + (e.clientX - d.x), y: d.cam.y + (e.clientY - d.y) }, { width, height });
  };
  const onPointerUp = () => { dragRef.current = null; };
```
and add these to the `<canvas>` props: `onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}`. (Guard the click so a drag doesn't also select: if the pointer moved more than ~4px between down and up, skip `onSelect`.)

- [ ] **Step 4: Update the canvas test stub** so `translate`, `scale`, `save`, `restore` exist (they do) and `wheel`/`pointer` events don't throw. Run `npm test`; the earlier tests and the new world-space test must pass.

- [ ] **Step 5: Build + manual verify**
`npm run build` succeeds. Manually: drag to pan the sky, scroll to zoom, click a star after zooming and confirm it still selects correctly; verify no horizontal page scroll and that touch drag works on a narrow viewport.

- [ ] **Step 6: Commit**
```bash
git add client/src/sky/SkyCanvas.jsx client/src/sky/SkyCanvas.test.jsx
git commit -m "feat(sky): pan and zoom the sky (world-space hit-testing)"
```

---

## Deploy (after Tasks 1–5 pass review)

**Frontend (GitHub Pages):**
- [ ] From the Phase 2 branch: `cd "/home/sh4d0w/agentic coding projects/website/client" && VITE_API_URL=https://multiplayergames-api.onrender.com npm run deploy`
- This runs `predeploy` (build) then `gh-pages -d dist`, pushing the built site to the `gh-pages` branch → live at multiplayergames.in. The `gh-pages` package commits as the local git user (you), so it does not reintroduce `actions-user`.
- [ ] Verify multiplayergames.in/sky loads the constellation.

**Backend (Render — for live `sky:state`/events):**
- The production API at `multiplayergames-api.onrender.com` must run the Phase 1+2 `server/` code for live counts, wins and comets to appear. Render auto-deploys from its connected branch.
- [ ] Determine Render's deploy branch (ask the user / check Render dashboard). Merge the `server/` changes into that branch (or push), then let Render redeploy. Until then, `/sky` renders but shows zero live counts and no events.

## Self-review
- **Spec coverage (Phase 2 items):** pan/zoom → Tasks 1, 5. Named constellations + nebulae → Tasks 2, 4. Supernova/sky events → Tasks 2, 3 (effects already wired in Phase 1), 4. Player comets → Tasks 2, 3, 4. Orbiting rooms + online entry → explicitly deferred to Phase 2b.
- **Type consistency:** camera `{x,y,scale}` used identically in Tasks 1 and 5. `sky:event {type:'move', from, to}` emitted by server (Task 3) and consumed by the comet renderer (Task 4). `effectProgress`/`cometPos`/`clusterCentroids` defined in Tasks 1–2 and consumed in Task 4.
- **Placeholder scan:** none — every step has concrete code or an exact command.
