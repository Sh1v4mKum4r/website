// Minimal unit test for the leaderboard data layer.
// Run with: node db.test.js   (uses an in-memory DB, no files touched)

process.env.LEADERBOARD_DB = ':memory:';
const assert = require('assert');
const { recordWin, getLeaderboard, getAllLeaderboards } = require('./db');

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok - ${name}`);
}

check('recordWin creates and increments a tally', () => {
  recordWin('alice', 'tictactoe');
  recordWin('alice', 'tictactoe');
  recordWin('alice', 'tictactoe');
  const board = getLeaderboard('tictactoe');
  assert.strictEqual(board[0].username, 'alice');
  assert.strictEqual(board[0].wins, 3);
});

check('getLeaderboard orders by wins desc', () => {
  recordWin('bob', 'tictactoe');
  recordWin('bob', 'tictactoe');
  recordWin('bob', 'tictactoe');
  recordWin('bob', 'tictactoe'); // bob: 4, alice: 3
  const board = getLeaderboard('tictactoe');
  assert.deepStrictEqual(board.map(r => r.username), ['bob', 'alice']);
});

check('wins are scoped per game', () => {
  recordWin('alice', 'connect4');
  assert.strictEqual(getLeaderboard('connect4')[0].wins, 1);
  assert.strictEqual(getLeaderboard('tictactoe').find(r => r.username === 'alice').wins, 3);
});

check('limit is respected', () => {
  for (let i = 0; i < 15; i++) recordWin(`p${i}`, 'gomoku');
  assert.strictEqual(getLeaderboard('gomoku', 5).length, 5);
});

check('empty/invalid input is a no-op', () => {
  const before = getLeaderboard('othello').length;
  recordWin('', 'othello');
  recordWin('x', '');
  recordWin(null, 'othello');
  assert.strictEqual(getLeaderboard('othello').length, before);
});

check('usernames are trimmed', () => {
  recordWin('  spacey  ', 'nim');
  assert.strictEqual(getLeaderboard('nim')[0].username, 'spacey');
});

check('getAllLeaderboards groups by game', () => {
  const all = getAllLeaderboards();
  assert.ok(all.tictactoe && all.connect4 && all.gomoku);
  assert.strictEqual(all.connect4[0].username, 'alice');
});

check('getLeaderboard of unknown game is empty', () => {
  assert.deepStrictEqual(getLeaderboard('nonexistent'), []);
});

console.log(`\n${passed} checks passed.`);
