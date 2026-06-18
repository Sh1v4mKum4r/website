// End-to-end test: two real socket clients play a full Tic Tac Toe game to a
// win, then we assert the win was recorded in the leaderboard (and the loser
// was NOT). Run with: node integration.test.js
//
// Uses an isolated temp DB so it never touches real data.

const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');

const TMP_DB = path.join(os.tmpdir(), `lb-itest-${process.pid}.db`);
process.env.LEADERBOARD_DB = TMP_DB;

const io = require(path.join(__dirname, '../client/node_modules/socket.io-client'));
require('./server'); // starts listening on :3001

const URL = 'http://localhost:3001';
const opts = { transports: ['websocket'], forceNew: true };

const emitAck = (sock, event, payload) =>
  new Promise((resolve) => sock.emit(event, payload, resolve));

const waitFor = (sock, event) =>
  new Promise((resolve) => sock.once(event, resolve));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const a = io(URL, opts); // Alice (X, creator)
  const b = io(URL, opts); // Bob   (O, joiner)
  await Promise.all([waitFor(a, 'connect'), waitFor(b, 'connect')]);

  // Lobby
  const lobby = await emitAck(a, 'createLobby', { name: 'Alice' });
  assert.ok(lobby.lobbyCode, 'lobby created');
  const joinedLobby = await emitAck(b, 'joinLobby', { name: 'Bob', lobbyCode: lobby.lobbyCode });
  assert.ok(joinedLobby.success, 'Bob joined lobby');

  // Room
  const room = await emitAck(a, 'createRoom', { gameType: 'tictactoe', seriesLength: 0 });
  assert.ok(room.code, 'room created');
  const bStart = waitFor(b, 'gameStart');
  const joinedRoom = await emitAck(b, 'joinRoom', room.code);
  assert.strictEqual(joinedRoom.role, 'O', 'Bob is O');
  await bStart;
  await sleep(100);

  // Play to an X win: X 0,1,2 (top row); O plays 3,4 in between.
  const moves = [
    ['X', 0], ['O', 3],
    ['X', 1], ['O', 4],
    ['X', 2], // winning move
  ];
  for (const [player, index] of moves) {
    const sock = player === 'X' ? a : b;
    const update = waitFor(a, 'gameUpdate');
    sock.emit('makeMove', { code: room.code, index, player });
    await update;
  }
  await sleep(150); // let handleGameResult + recordWin flush

  // Assert via the REST API
  const res = await fetch(`${URL}/api/leaderboard/tictactoe`);
  const board = await res.json();
  console.log('  leaderboard/tictactoe =', JSON.stringify(board));

  const alice = board.find((r) => r.username === 'Alice');
  assert.ok(alice, 'Alice appears on the tictactoe leaderboard');
  assert.strictEqual(alice.wins, 1, 'Alice has exactly 1 win');
  assert.ok(!board.find((r) => r.username === 'Bob'), 'Bob (loser) is NOT recorded');

  console.log('  ok - full game recorded exactly one win for the winner');

  a.close();
  b.close();
}

run()
  .then(() => {
    try { fs.rmSync(TMP_DB, { force: true }); fs.rmSync(`${TMP_DB}-wal`, { force: true }); fs.rmSync(`${TMP_DB}-shm`, { force: true }); } catch {}
    console.log('\nintegration test passed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nintegration test FAILED:', err);
    process.exit(1);
  });
