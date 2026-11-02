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

check('bots are excluded from player counts but the room still counts', () => {
  const state = computeSkyState({
    L: { players: [], rooms: { R: { gameType: 'chess', players: { h: 'X', 'bot-x': 'O' } } } },
  });
  assert.strictEqual(state.games[0].players, 1);
  assert.strictEqual(state.games[0].rooms, 1);
  assert.strictEqual(state.totalPlayers, 1);
});

check('rooms without a gameType are skipped', () => {
  const state = computeSkyState({
    L: { players: [], rooms: { R: { players: { a: 'X' } } } },
  });
  assert.deepStrictEqual(state.games, []);
  assert.strictEqual(state.totalPlayers, 0);
});

check('buildWinEvent returns null for null room', () => {
  assert.strictEqual(buildWinEvent(null), null);
});

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

console.log(`\n${passed} passed`);
