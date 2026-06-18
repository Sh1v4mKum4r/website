// Deterministic unit tests for the leaderboard win-recording RULES, exercising
// the real handleGameResult / recordLeaderboardWin from server.js with fake
// rooms + lobbies. Uses an in-memory DB. Run with: node winrules.test.js

process.env.LEADERBOARD_DB = ':memory:';
const assert = require('assert');
const { handleGameResult } = require('./server'); // does not bind a port (guarded)
const { getLeaderboard } = require('./db');

const wins = (game, name) =>
  (getLeaderboard(game).find((r) => r.username === name) || { wins: 0 }).wins;

// Helpers to fabricate the minimal room/lobby shapes the code reads.
const humanRoom = (game) => ({
  gameType: game,
  players: { sockA: 'X', sockB: 'O' },
  score: { X: 0, O: 0, b: 0, r: 0 },
  seriesLength: 0,
});
const lobby = { players: [{ id: 'sockA', name: 'Ana' }, { id: 'sockB', name: 'Ben' }] };

let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log(`  ok - ${name}`); };

check('human winner is recorded', () => {
  handleGameResult(humanRoom('tictactoe'), { winner: 'X' }, 'R1', lobby);
  assert.strictEqual(wins('tictactoe', 'Ana'), 1);
});

check('loser is not recorded', () => {
  assert.strictEqual(wins('tictactoe', 'Ben'), 0);
});

check('draw is not recorded', () => {
  const before = getLeaderboard('connect4').length;
  handleGameResult(humanRoom('connect4'), { winner: 'draw' }, 'R2', lobby);
  assert.strictEqual(getLeaderboard('connect4').length, before);
});

check('bot game is not recorded (human beats bot)', () => {
  const room = humanRoom('othello');
  room.bots = { sockB: { role: 'O', name: 'Bot (Easy)' } }; // Ben replaced by a bot
  room.players = { sockA: 'X', sockB: 'O' };
  handleGameResult(room, { winner: 'X' }, 'R3', lobby); // human X wins
  assert.strictEqual(wins('othello', 'Ana'), 0, 'no win recorded in a bot game');
});

check('unknown/disconnected winner is skipped', () => {
  const room = humanRoom('gomoku');
  handleGameResult(room, { winner: 'O' }, 'R4', { players: [{ id: 'sockA', name: 'Ana' }] });
  // 'O' maps to sockB, which is not in this lobby -> no name -> skipped
  assert.strictEqual(getLeaderboard('gomoku').length, 0);
});

check('repeated wins accumulate', () => {
  handleGameResult(humanRoom('tictactoe'), { winner: 'X' }, 'R5', lobby);
  handleGameResult(humanRoom('tictactoe'), { winner: 'X' }, 'R6', lobby);
  assert.strictEqual(wins('tictactoe', 'Ana'), 3); // 1 earlier + 2 here
});

console.log(`\n${passed} checks passed.`);
process.exit(0);
