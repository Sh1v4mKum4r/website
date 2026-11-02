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
      const count = Object.keys(room.players || {}).filter((id) => !id.startsWith('bot-')).length;
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

// The caller decides when a real win happened; do not call this on draws.
function buildWinEvent(room) {
  if (!room || !room.gameType) return null;
  return { type: 'win', game: room.gameType };
}

module.exports = { computeSkyState, buildWinEvent };
