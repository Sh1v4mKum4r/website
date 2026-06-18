// Leaderboard data layer.
//
// This module is the ONLY place that knows how leaderboard data is stored.
// It currently uses a local SQLite file (better-sqlite3). To move to a hosted
// database later (e.g. Postgres on Neon/Supabase for permanent production data),
// rewrite the internals of this file only — the three exported functions
// (recordWin, getLeaderboard, getAllLeaderboards) are the stable interface that
// the rest of the server depends on.

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = process.env.LEADERBOARD_DB || path.join(DATA_DIR, 'leaderboard.db');

// Ensure the data directory exists before opening the file.
if (DB_PATH !== ':memory:') {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS wins (
    username TEXT NOT NULL,
    game     TEXT NOT NULL,
    wins     INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (username, game)
  );
`);

const upsertStmt = db.prepare(`
  INSERT INTO wins (username, game, wins) VALUES (?, ?, 1)
  ON CONFLICT(username, game) DO UPDATE SET wins = wins + 1
`);

const oneGameStmt = db.prepare(`
  SELECT username, wins FROM wins
  WHERE game = ?
  ORDER BY wins DESC, username ASC
  LIMIT ?
`);

const allRowsStmt = db.prepare(`
  SELECT game, username, wins FROM wins
  ORDER BY game ASC, wins DESC, username ASC
`);

/**
 * Record one win for a username in a game (increments their tally by 1).
 * No-op for empty/invalid input.
 */
function recordWin(username, game) {
  if (!username || !game) return;
  const name = String(username).trim();
  if (!name) return;
  upsertStmt.run(name, String(game));
}

/**
 * Top players for a single game, highest wins first.
 * @returns {Array<{username: string, wins: number}>}
 */
function getLeaderboard(game, limit = 10) {
  if (!game) return [];
  return oneGameStmt.all(String(game), limit);
}

/**
 * Top players for every game, grouped by game.
 * @returns {Object<string, Array<{username: string, wins: number}>>}
 */
function getAllLeaderboards(limit = 10) {
  const grouped = {};
  for (const row of allRowsStmt.all()) {
    if (!grouped[row.game]) grouped[row.game] = [];
    if (grouped[row.game].length < limit) {
      grouped[row.game].push({ username: row.username, wins: row.wins });
    }
  }
  return grouped;
}

module.exports = { recordWin, getLeaderboard, getAllLeaderboards, _db: db };
