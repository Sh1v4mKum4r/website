const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// lobbies: { lobbyCode: { players: [{id, name}], rooms: { roomCode: { players: {socketId: role}, playerNames: [], board, turn, score } } } }
const lobbies = {};

// Track which lobby each socket is in
const socketToLobby = {}; // socketId -> lobbyCode

const generateCode = (len = 4) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < len; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const checkWinner = (board) => {
  const wins = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  for (let w of wins) {
    const [a, b, c] = w;
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return { winner: board[a], line: w };
  }
  if (!board.includes(null)) return { winner: "draw", line: null };
  return null;
};

const broadcastLobbyState = (lobbyCode) => {
  const lobby = lobbies[lobbyCode];
  if (!lobby) return;

  const roomList = Object.entries(lobby.rooms).map(([code, room]) => ({
    code,
    playerNames: room.playerNames || [],
    isFull: Object.keys(room.players).length >= 2,
    spectatorCount: (room.spectators || []).length
  }));

  io.to(`lobby:${lobbyCode}`).emit("lobbyUpdate", {
    players: lobby.players,
    rooms: roomList
  });
};

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Create a new lobby
  socket.on("createLobby", ({ name }, callback) => {
    let code;
    do { code = generateCode(5); } while (lobbies[code]);

    lobbies[code] = {
      players: [{ id: socket.id, name }],
      rooms: {}
    };

    socketToLobby[socket.id] = code;
    socket.join(`lobby:${code}`);
    console.log(`Lobby ${code} created by ${name}`);

    callback({ success: true, lobbyCode: code });
    broadcastLobbyState(code);
  });

  // Join an existing lobby by code
  socket.on("joinLobby", ({ name, lobbyCode }, callback) => {
    const lobby = lobbies[lobbyCode];
    if (!lobby) return callback({ error: "Lobby not found" });

    // Add player if not already there
    if (!lobby.players.find(p => p.id === socket.id)) {
      lobby.players.push({ id: socket.id, name });
    }

    socketToLobby[socket.id] = lobbyCode;
    socket.join(`lobby:${lobbyCode}`);
    console.log(`${name} joined lobby ${lobbyCode}`);

    callback({ success: true });
    broadcastLobbyState(lobbyCode);
  });

  // Create a game room inside the lobby
  socket.on("createRoom", (callback) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return callback({ error: "Not in a lobby" });

    const lobby = lobbies[lobbyCode];
    const playerName = lobby.players.find(p => p.id === socket.id)?.name || "Unknown";

    let roomCode;
    do { roomCode = generateCode(4); } while (lobby.rooms[roomCode]);

    lobby.rooms[roomCode] = {
      players: { [socket.id]: "X" },
      playerNames: [playerName],
      spectators: [],
      board: Array(9).fill(null),
      turn: "X",
      score: { X: 0, O: 0 }
    };

    socket.join(roomCode);
    console.log(`Room ${roomCode} created in lobby ${lobbyCode} by ${playerName}`);

    callback({ code: roomCode, role: "X" });
    broadcastLobbyState(lobbyCode);
  });

  // Join a game room inside the lobby
  socket.on("joinRoom", (roomCode, callback) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return callback({ error: "Not in a lobby" });

    const lobby = lobbies[lobbyCode];
    const room = lobby.rooms[roomCode];
    if (!room) return callback({ error: "Room not found" });

    // Rejoin
    if (room.players[socket.id]) {
      return callback({ code: roomCode, role: room.players[socket.id] });
    }

    if (Object.keys(room.players).length >= 2) {
      return callback({ error: "Room is full" });
    }

    const playerName = lobby.players.find(p => p.id === socket.id)?.name || "Unknown";
    room.players[socket.id] = "O";
    room.playerNames.push(playerName);

    socket.join(roomCode);
    console.log(`${playerName} joined room ${roomCode}`);

    callback({ code: roomCode, role: "O", gameData: { board: room.board, turn: room.turn, score: room.score, playerNames: room.playerNames } });
    io.to(roomCode).emit("gameStart", room);
    broadcastLobbyState(lobbyCode);
  });

  // Make a move
  socket.on("makeMove", ({ code, index, player }) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;

    const room = lobbies[lobbyCode]?.rooms[code];
    if (room && room.turn === player && !room.board[index]) {
      room.board[index] = player;
      const result = checkWinner(room.board);
      if (result) {
        room.result = result;
        if (result.winner !== 'draw') room.score[result.winner]++;
      } else {
        room.turn = player === "X" ? "O" : "X";
      }
      io.to(code).emit("gameUpdate", room);
    }
  });

  // Restart game
  socket.on("restartGame", (code) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;

    const room = lobbies[lobbyCode]?.rooms[code];
    if (room) {
      room.board = Array(9).fill(null);
      room.turn = "X";
      room.result = null;
      io.to(code).emit("gameUpdate", room);
    }
  });

  // Spectate a game room (read-only)
  socket.on("spectateRoom", (roomCode, callback) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return callback({ error: "Not in a lobby" });

    const lobby = lobbies[lobbyCode];
    const room = lobby?.rooms[roomCode];
    if (!room) return callback({ error: "Room not found" });

    if (!room.spectators) room.spectators = [];
    room.spectators.push(socket.id);
    socket.join(roomCode);
    console.log(`Spectator joined room ${roomCode}`);

    callback({
      gameData: { board: room.board, turn: room.turn, score: room.score, playerNames: room.playerNames, result: room.result || null }
    });
    broadcastLobbyState(lobbyCode);
  });

  // Leave spectating
  socket.on("leaveSpectate", (roomCode) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;

    const lobby = lobbies[lobbyCode];
    const room = lobby?.rooms[roomCode];
    if (room && room.spectators) {
      room.spectators = room.spectators.filter(id => id !== socket.id);
    }
    socket.leave(roomCode);
    broadcastLobbyState(lobbyCode);
  });

  // Leave a game room (return to lobby)
  socket.on("leaveRoom", (roomCode) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;

    const lobby = lobbies[lobbyCode];
    const room = lobby?.rooms[roomCode];
    if (!room) return;

    // Check if player
    if (room.players[socket.id]) {
      const playerName = lobby.players.find(p => p.id === socket.id)?.name;
      delete room.players[socket.id];
      if (playerName) room.playerNames = room.playerNames.filter(n => n !== playerName);

      if (Object.keys(room.players).length === 0) {
        delete lobby.rooms[roomCode];
      } else {
        io.to(roomCode).emit("opponentLeft");
      }
      socket.leave(roomCode);
    }
    // Check if spectator
    else if (room.spectators && room.spectators.includes(socket.id)) {
      room.spectators = room.spectators.filter(id => id !== socket.id);
      socket.leave(roomCode);
    }

    broadcastLobbyState(lobbyCode);
  });

  // Get current lobby state (for refreshing sidebar)
  socket.on("getLobbyState", (callback) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode || !lobbies[lobbyCode]) return callback({ error: "Not in a lobby" });

    const lobby = lobbies[lobbyCode];
    const roomList = Object.entries(lobby.rooms).map(([code, room]) => ({
      code,
      playerNames: room.playerNames || [],
      isFull: Object.keys(room.players).length >= 2
    }));

    callback({ players: lobby.players, rooms: roomList, lobbyCode });
  });

  // Leave lobby entirely
  socket.on("leaveLobby", () => {
    handleDisconnect(socket);
  });

  socket.on('disconnect', () => {
    console.log(`User Disconnected: ${socket.id}`);
    handleDisconnect(socket);
  });
});

const handleDisconnect = (socket) => {
  const lobbyCode = socketToLobby[socket.id];
  if (!lobbyCode) return;

  const lobby = lobbies[lobbyCode];
  if (!lobby) return;

  // Remove from any rooms (as player or spectator)
  for (const [roomCode, room] of Object.entries(lobby.rooms)) {
    if (room.players[socket.id]) {
      const playerName = lobby.players.find(p => p.id === socket.id)?.name;
      delete room.players[socket.id];
      if (playerName) room.playerNames = room.playerNames.filter(n => n !== playerName);

      if (Object.keys(room.players).length === 0) {
        delete lobby.rooms[roomCode];
      } else {
        io.to(roomCode).emit("opponentLeft");
      }
    }
    if (room.spectators) {
      room.spectators = room.spectators.filter(id => id !== socket.id);
    }
  }

  // Remove from lobby
  lobby.players = lobby.players.filter(p => p.id !== socket.id);
  delete socketToLobby[socket.id];

  // Delete lobby if empty
  if (lobby.players.length === 0) {
    delete lobbies[lobbyCode];
  } else {
    broadcastLobbyState(lobbyCode);
  }
};

server.listen(3001, () => {
  console.log("SERVER IS RUNNING ON PORT 3001");
});
