# Constellation — Living Star-Map Game Browser

**Date:** 2026-11-02
**Status:** Design approved, pending spec review
**Repo:** `Sh1v4mKum4r/website` (client = Vite/React, server = Express/Socket.IO)

## Problem

multiplayergames.in currently reads as a generic AI-generated template: Orbitron
font, cyan/magenta neon-on-navy palette, glow shadows, and a plain grid of
rectangular game cards. It does not feel modern, distinctive, or memorable.

## Goal

Replace the game browser with a **living constellation**: games are glowing stars
in an interactive night sky, sized and brightened by live player activity, grouped
into named constellations, connected by links that pulse with real player flow, and
entered through a warp-speed transition. Over time the cosmic theme extends to the
whole site. The star-map must be beautiful **and** performant, accessible, and safe
to roll out on a live site with real users.

## Non-goals

- Not the 3D "hive planet" (WebGL globe) — this is a 2D star-map.
- Not a bee/hive/honey theme — the earlier honeycomb was only a shape exploration.
- No rectangular game selectors anywhere. Stars are round; supporting UI is
  rounded/organic.
- Phase 1 does not re-skin the whole site; that lands in Phase 3.

## Decisions (locked with the user)

| Decision | Choice |
|---|---|
| Scope | Whole-site cosmic theme (reached incrementally; Phase 1 = game browser) |
| Rollout | New `/sky` route behind a beta toggle, alongside the current site; becomes default once polished |
| Staging | Phased — core ships first, spectacle and re-skin follow |
| Rendering | Canvas 2D for the sky; React/DOM overlay for crisp interactive UI |

## Architecture

```
┌──────────────────────── /sky route ─────────────────────────┐
│  SkyOverlay (React/DOM)      SkyCanvas (Canvas 2D, rAF loop) │
│   · top nav / telescope       · starfield + nebulae          │
│   · game detail capsule       · game-stars, links, clusters  │
│   · controls, list toggle     · comets / supernova / warp    │
│         ▲  hover/click (hit-test) │  draw(state)              │
│         └──────────── skyModel (pure state) ◀────────────┐   │
└──────────────────────────────────────────────────────────┼──┘
                        useSkyData (Socket.IO)              │
                                   ▲ sky:state / sky:event  │
┌──────────────────────── server ─┼───────────────────────────┐
│  skyPresence: players-per-game, open rooms, win/match/move   │
│  reuses existing Socket.IO infra (see project memory)         │
└───────────────────────────────────────────────────────────────┘
```

### Components (each one job, testable in isolation)

- **`skyModel`** (pure, no DOM) — the source of truth for what the sky contains:
  an array of game-stars `{ id, name, category, x, y, baseSize, brightness,
  playerCount, rooms }`, cluster/constellation definitions, and a transient
  **effects queue** (`comet`, `supernova`, `matchFlare`, `warp`). Exposes pure
  functions: layout (assign positions by cluster), `brightnessFor(count)`,
  `sizeFor(count)`, `hitTest(x, y)`, `pushEffect(e)`, `tick(dt)` (ages/expires
  effects). No rendering, no sockets. **This is where the TDD effort goes.**
- **`SkyCanvas`** — owns one `requestAnimationFrame` loop. Reads `skyModel`, draws
  everything, DPR-aware. Translates pointer coordinates and calls
  `skyModel.hitTest`. Pauses on `document.hidden`; degrades particle budget when
  measured FPS drops. No business logic.
- **`useSkyData`** — subscribes to the Socket.IO sky channel, maps `sky:state`
  into `skyModel`, enqueues `sky:event` effects, and handles
  reconnect/backoff and the offline fallback (last-known snapshot).
- **`SkyOverlay`** — React/DOM layered over the canvas: nav, telescope-search,
  the game **detail capsule** (title, live count, rooms, Enter / Spectate),
  reduced-motion + list-view toggle. All crisp text and focusable controls live
  here, never on the canvas.
- **`WarpTransition`** — the lightspeed launch effect; on completion routes to the
  existing game room flow.
- **`FallbackList`** — an accessible, animation-free grid/list of the same games,
  shown for `prefers-reduced-motion`, small screens, no-JS/SEO, and as the
  keyboard/screen-reader path. Same data, same actions.
- **Server `skyPresence`** — tracks active players per game and open rooms from the
  existing socket lifecycle; emits `sky:state` snapshots on an interval and
  `sky:event` on wins, match starts, and player migrations. Reuses the current
  Socket.IO server; no new transport.

### Data flow

1. Players connect/join games on the existing sockets; `skyPresence` aggregates.
2. Server emits `sky:state` (per-game counts, open rooms) on a short interval and
   `sky:event` as discrete events happen.
3. `useSkyData` folds state into `skyModel`; events become entries in the effects
   queue.
4. `SkyCanvas` renders each frame from `skyModel`.
5. Hover/click → `hitTest` → `SkyOverlay` shows the capsule → **Enter** →
   `WarpTransition` → existing room-join flow.

## Theming

Add a **`cosmic`** theme to the existing `context/theme.css` variable system
(alongside `dark`/`light`), with deep-space tokens: `--bg-primary` near-black,
category star colors (strategy = cyan, word = magenta/pink, party = green),
replace the Orbitron body font with a clean modern sans (e.g. Outfit/Space
Grotesk), and drop the neon glow defaults. Phase 1 introduces the tokens and
applies them to the `/sky` surfaces; Phase 3 migrates nav, profile, leaderboard,
chat, and in-game frames to the same tokens and makes `cosmic` the default theme.

## Performance & accessibility (requirements, not polish)

- Canvas 2D, `devicePixelRatio`-aware; capped star/particle counts; `rAF` paused
  when the tab is hidden; automatic effect-budget downgrade below a target FPS.
- `prefers-reduced-motion` → `FallbackList` (no animation).
- Full keyboard navigation and screen-reader support via `FallbackList`; the
  canvas is `aria-hidden` and mirrored by that accessible list.
- Mobile: touch pan/zoom, tap to select, reduced particle budget.
- Backend is Render free tier (ephemeral) — `sky:state` is derived live from
  socket presence, nothing requiring durable storage.

## Feature set by phase

**Phase 1 — Core sky that ships end-to-end**
- Canvas starfield + drifting nebulae.
- Game-stars sized and colored by category.
- **Live brightness/size** from real `skyPresence` counts.
- Hover/click → detail capsule (Enter / Spectate).
- **Warp-speed entry** into a game.
- `FallbackList` + reduced-motion path.
- `/sky` route + beta toggle; `cosmic` theme tokens introduced on `/sky`.

**Phase 2 — Spectacle**
- Open rooms orbit their star (click a moon → that room).
- Player **comets** between games (migration).
- **Supernova** moments + sky events (match flares).
- Pan & zoom the sky (telescope).
- Named **constellations** + nebula-tinted clusters.

**Phase 3 — Deep / world + re-skin**
- Gravity cursor (stars bend toward the pointer).
- Black-hole **featured/trending** game with accretion disk.
- **Binary-star** live 1v1 duels with a spectator dust ring.
- **Cosmic time-of-day** + celestial events (meteor showers/eclipses for
  tournaments & seasons).
- **Your star** (profile): wins become orbiting planets; rank = brightness;
  leaderboard = brightest stars.
- **Draw-your-own constellation** (pin favorites into a saved pattern).
- Whole-site cosmic re-skin; flip `cosmic` to the default theme.

## Testing strategy

- **TDD** `skyModel`: `brightnessFor`/`sizeFor` mapping, cluster layout
  determinism, `hitTest` geometry (incl. overlapping stars), effects-queue
  ageing/expiry.
- **Unit-test `skyPresence`**: per-game counts under join/leave, room
  open/close tracking, event emission on win/match/migrate, no leak on
  disconnect.
- **Component tests** for `SkyOverlay` (capsule open/close, Enter/Spectate wiring)
  and `FallbackList` (keyboard nav, same actions as the sky).
- **Manual/visual**: canvas rendering correctness and FPS profiling on a mobile
  device and a low-end profile; verify reduced-motion fallback.

## Rollout

Build on a `feature/constellation-sky` branch. `/sky` ships behind a toggle while
`/games` stays the default. Promote `/sky` to default only after Phase 1 is
polished and profiled on mobile. Each phase is independently shippable.

## Open questions

- Exact `sky:state` emit interval (start ~3–5s; tune against Render free-tier
  socket load).
- Star layout: fixed hand-authored cluster positions vs. a deterministic
  force/seeded layout (lean seeded-deterministic so positions are stable between
  loads).
- Whether Phase 1's toggle is a user setting or a simple URL/route switch (lean
  route switch first).
