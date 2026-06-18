# Leaderboard (per-game wins) — Design

**Date:** 2026-06-18
**Branch:** `feature/leaderboard`
**Status:** Approved, implementing

## Goal
A small persistent store that tracks, per username, how many times they have **won** each
game. Surfaced as a simple leaderboard page on the site.

## Scope decisions (approved)
- **Metric = wins tally.** One win recorded per game *round* with a non-draw winner.
  (Most games are win/lose, so a wins count is the only metric uniform across them.)
- **Bots & Pass-and-Play excluded.** Only wins by a real, named human in an online room count.
  (Pass-and-play is client-only and never reaches the server, so it is excluded automatically.)
- **Draws not recorded.**
- **Username = plain name string.** Names are unique only *within a lobby*; globally, two people
  using the same name share one leaderboard row. Real per-user identity would need accounts (out of scope).
- **Coverage = the 11 board games** that flow through the server's single `handleGameResult()`
  choke point: tictactoe, connect4, othello, checkers, gomoku, mancala, dotsboxes, nim, uttt,
  chain, memory.
  The 3 word games (wordle, scribble, imposter) use separate end-events with different/ambiguous
  winner semantics — **deferred** as an easy follow-up.

## Architecture

### 1. Data layer — `server/db.js` (the swappable piece)
Hides storage behind 3 functions so a later swap to hosted Postgres only touches this file:
```
recordWin(username, game)        // upsert + increment wins by 1
getLeaderboard(game, limit=10)   // [{username, wins}] for one game, desc
getAllLeaderboards(limit=10)     // { [game]: [{username, wins}] }
```

### 2. Storage — SQLite via better-sqlite3
File: `server/data/leaderboard.db` (the `data/` dir is gitignored).
Schema:
```sql
CREATE TABLE IF NOT EXISTS wins (
  username TEXT NOT NULL,
  game     TEXT NOT NULL,
  wins     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (username, game)
);
```
Synchronous, zero-config, fast. Production note: on Render free tier the filesystem is
ephemeral, so this resets on redeploy — acceptable for now; swap `db.js` internals to a hosted
Postgres later for permanence.

### 3. Hook — `handleGameResult(room, result, roomCode, lobby)`
On a non-draw result: skip entirely if the room contains any bot (`room.bots`) — this prevents
farming wins against bots; otherwise find the socketId in `room.players` whose role ===
`result.winner`, resolve the human name from `lobby.players`, and call `recordWin(name,
room.gameType)`. The two call sites both have `lobbyCode` in scope, so they pass `lobbies[lobbyCode]`.

### 4. REST endpoints — existing Express app
- `GET /api/leaderboard`        → all games (`getAllLeaderboards`)
- `GET /api/leaderboard/:game`  → one game (`getLeaderboard`)

### 5. Client — Leaderboard page
- `client/src/pages/Leaderboard.jsx` (+ css): fetch `${API_URL}/api/leaderboard`, render a ranked
  table (rank, username, wins) per game.
- Route `/leaderboard` in `App.jsx`; nav link in `Navbar`.
- API base URL: reuse the same `VITE_API_URL || production URL` convention as `socket.js`.

## Testing
- Unit test for `db.js`: recordWin increments correctly; getLeaderboard orders desc and respects limit.
- Manual local run: server :3001 + client :5173, play a game to completion, confirm the win appears.

## Out of scope (possible follow-ups)
- Word games (wordle/scribble/imposter) leaderboard hooks.
- Hosted Postgres for permanent production data.
- Accounts / globally-unique identity.
