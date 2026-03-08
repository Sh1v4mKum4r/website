const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { makeTicTacToeMove, makeConnect4Move, makeOthelloMove } = require('./utils/gameLogic');

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
const roomTimers = {}; // roomCode -> intervalId
const disconnectedPlayers = {}; // socketId -> { lobbyCode, name, rooms: { roomCode: role }, timeout }

const startTurnTimer = (lobbyCode, roomCode) => {
  const room = lobbies[lobbyCode]?.rooms[roomCode];
  if (!room || room.result) return;
  clearTurnTimer(roomCode);
  room.timeLeft = 30;
  roomTimers[roomCode] = setInterval(() => {
    room.timeLeft--;
    io.to(roomCode).emit('timerUpdate', { timeLeft: room.timeLeft });
    if (room.timeLeft <= 0) {
      clearTurnTimer(roomCode);
      handleGameResult(room, { winner: room.turn === 'X' ? 'O' : 'X', line: null, timeout: true }, roomCode);
      io.to(roomCode).emit('gameUpdate', room);
    }
  }, 1000);
};

const clearTurnTimer = (roomCode) => {
  if (roomTimers[roomCode]) {
    clearInterval(roomTimers[roomCode]);
    delete roomTimers[roomCode];
  }
};

const handleGameResult = (room, result, roomCode) => {
  room.result = result;
  if (result.winner !== 'draw') {
    room.score[result.winner]++;
    if (room.seriesLength > 0) {
      const winsNeeded = Math.ceil(room.seriesLength / 2);
      if (room.score[result.winner] >= winsNeeded) {
        room.seriesWinner = result.winner;
      }
    }
  }
};

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
    gameType: room.gameType || 'tictactoe',
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

    // Check for unique name
    if (lobby.players.some(p => p.name === name && p.id !== socket.id)) {
      return callback({ error: "Player name already taken" });
    }

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
  socket.on("createRoom", ({ gameType = "tictactoe", seriesLength = 0 } = {}, callback) => {
    // If first arg is function, it means no options passed (old client)
    if (typeof arguments[0] === 'function') {
      callback = arguments[0];
      gameType = "tictactoe";
      seriesLength = 0;
    }

    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return callback({ error: "Not in a lobby" });

    const lobby = lobbies[lobbyCode];
    if (!lobby) return callback({ error: "Lobby not found" });

    const playerName = lobby.players.find(p => p.id === socket.id)?.name || "Unknown";

    // Check if player is already in a room
    const existingRoom = Object.values(lobby.rooms).find(r => r.players[socket.id]);
    if (existingRoom) return callback({ error: "You are already in a game" });

    let roomCode;
    const generateCode = (len) => Math.random().toString(36).substring(2, 2 + len).toUpperCase();
    do { roomCode = generateCode(4); } while (lobby.rooms[roomCode]);

    const boardSize = gameType === 'connect4' ? 42 : (gameType === 'othello' ? 64 : 9);
    const board = Array(boardSize).fill(null);
    if (gameType === 'othello') {
      board[27] = 'O';
      board[28] = 'X';
      board[35] = 'X';
      board[36] = 'O';
    }

    lobby.rooms[roomCode] = {
      gameType,
      players: { [socket.id]: "X" },
      playerNames: [playerName],
      spectators: [],
      board,
      turn: "X",
      score: { X: 0, O: 0 },
      seriesLength: seriesLength || 0,
      chatHistory: [],
    };

    socket.join(roomCode);
    console.log(`Room ${roomCode} (${gameType}) created in lobby ${lobbyCode} by ${playerName}`);

    callback({ code: roomCode, role: "X", playerName, gameType, seriesLength: seriesLength || 0 });
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

    // Check if player is already in another room
    const existingRoom = Object.values(lobby.rooms).find(r => r.players[socket.id]);
    if (existingRoom) return callback({ error: "You are already in a game" });

    if (Object.keys(room.players).length >= 2) {
      return callback({ error: "Room is full" });
    }

    const playerName = lobby.players.find(p => p.id === socket.id)?.name || "Unknown";
    room.players[socket.id] = "O";
    room.playerNames.push(playerName);

    socket.join(roomCode);
    console.log(`${playerName} joined room ${roomCode}`);

    callback({ code: roomCode, role: "O", gameData: { board: room.board, turn: room.turn, score: room.score, playerNames: room.playerNames, gameType: room.gameType, seriesLength: room.seriesLength || 0, chatHistory: room.chatHistory || [] } });
    io.to(roomCode).emit("gameStart", room);
    startTurnTimer(lobbyCode, roomCode);
    broadcastLobbyState(lobbyCode);
  });

  // Make a move
  socket.on("makeMove", ({ code, index, player }) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;

    const room = lobbies[lobbyCode]?.rooms[code];
    if (!room || room.turn !== player) return;

    let moveResult;
    if (room.gameType === 'connect4') {
      moveResult = makeConnect4Move(room.board, index, player); // index is column for Connect 4
    } else if (room.gameType === 'othello') {
      moveResult = makeOthelloMove(room.board, index, player);
    } else {
      moveResult = makeTicTacToeMove(room.board, index, player);
    }

    if (moveResult.valid) {
      room.board = moveResult.board;
      const result = moveResult.result;

      if (result) {
        handleGameResult(room, result, code);
        clearTurnTimer(code);
      } else {
        room.turn = moveResult.nextTurn || (player === "X" ? "O" : "X");
        startTurnTimer(lobbyCode, code);
      }
      io.to(code).emit("gameUpdate", room);
    }
  });

  // Restart game (local mode)
  socket.on("restartGame", (code) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;

    const room = lobbies[lobbyCode]?.rooms[code];
    if (room) {
      const boardSize = room.gameType === 'connect4' ? 42 : (room.gameType === 'othello' ? 64 : 9);
      const board = Array(boardSize).fill(null);
      if (room.gameType === 'othello') {
        board[27] = 'O';
        board[28] = 'X';
        board[35] = 'X';
        board[36] = 'O';
      }
      room.board = board;
      room.turn = "X";
      room.result = null;
      io.to(code).emit("gameUpdate", room);
      if (Object.keys(room.players).length >= 2) {
        startTurnTimer(lobbyCode, code);
      }
    }
  });

  // Request rematch (F5)
  socket.on("requestRematch", (code) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;
    const room = lobbies[lobbyCode]?.rooms[code];
    if (!room || !room.result) return;
    if (!room.rematchRequests) room.rematchRequests = [];
    if (!room.rematchRequests.includes(socket.id)) {
      room.rematchRequests.push(socket.id);
    }
    if (room.rematchRequests.length >= 2) {
      if (room.seriesWinner) {
        room.score = { X: 0, O: 0 };
        room.seriesWinner = null;
      }
      const boardSize = room.gameType === 'connect4' ? 42 : (room.gameType === 'othello' ? 64 : 9);
      const board = Array(boardSize).fill(null);
      if (room.gameType === 'othello') {
        board[27] = 'O';
        board[28] = 'X';
        board[35] = 'X';
        board[36] = 'O';
      }
      room.board = board;
      room.turn = "X";
      room.result = null;
      room.rematchRequests = [];
      io.to(code).emit("gameUpdate", room);
      startTurnTimer(lobbyCode, code);
    } else {
      io.to(code).emit("rematchRequested", { requesterId: socket.id });
    }
  });

  // Decline rematch (F5)
  socket.on("declineRematch", (code) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;
    const room = lobbies[lobbyCode]?.rooms[code];
    if (!room) return;
    room.rematchRequests = [];
    io.to(code).emit("rematchDeclined");
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
      gameData: { board: room.board, turn: room.turn, score: room.score, playerNames: room.playerNames, result: room.result || null, gameType: room.gameType || 'tictactoe', timeLeft: room.timeLeft || null, seriesLength: room.seriesLength || 0, seriesWinner: room.seriesWinner || null, chatHistory: room.chatHistory || [] }
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
        clearTurnTimer(roomCode);
        delete lobby.rooms[roomCode];
      } else {
        clearTurnTimer(roomCode);
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

  // Chat
  socket.on("sendMessage", ({ room, message, sender }) => {
    const msg = {
      message,
      sender,
      timestamp: new Date().toISOString(),
      id: Date.now() + Math.random()
    };
    // Store in room chat history
    const lobbyCode = socketToLobby[socket.id];
    if (lobbyCode) {
      const lobby = lobbies[lobbyCode];
      if (lobby?.rooms[room]) {
        lobby.rooms[room].chatHistory = lobby.rooms[room].chatHistory || [];
        lobby.rooms[room].chatHistory.push(msg);
      }
    }
    io.to(room).emit("receiveMessage", msg);
  });

  // Get chat history for a room
  socket.on("getChatHistory", (roomCode, callback) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return callback({ chatHistory: [] });
    const room = lobbies[lobbyCode]?.rooms[roomCode];
    callback({ chatHistory: room?.chatHistory || [] });
  });

  // F11: Reconnect to Lobby
  socket.on("reconnectToLobby", ({ name, lobbyCode }, callback) => {
    const lobby = lobbies[lobbyCode];
    if (!lobby) return callback({ error: "Lobby no longer exists" });

    // Find if this player was disconnected
    let foundDisconnected = null;
    for (const [oldSocketId, data] of Object.entries(disconnectedPlayers)) {
      if (data.lobbyCode === lobbyCode && data.name === name) {
        foundDisconnected = { oldSocketId, ...data };
        break;
      }
    }

    if (foundDisconnected) {
      // Clear the grace period timeout
      clearTimeout(foundDisconnected.timeout);
      delete disconnectedPlayers[foundDisconnected.oldSocketId];

      // Re-add to lobby
      lobby.players.push({ id: socket.id, name });
      socketToLobby[socket.id] = lobbyCode;
      socket.join(`lobby:${lobbyCode}`);

      // Re-associate with rooms
      for (const [roomCode, role] of Object.entries(foundDisconnected.rooms || {})) {
        const room = lobby.rooms[roomCode];
        if (room) {
          room.players[socket.id] = role;
          if (!room.playerNames.includes(name)) room.playerNames.push(name);
          socket.join(roomCode);
          io.to(roomCode).emit("playerReconnected", { name });
          // Restart timer if game is active
          if (!room.result && Object.keys(room.players).length >= 2) {
            startTurnTimer(lobbyCode, roomCode);
          }
        }
      }

      console.log(`${name} reconnected to lobby ${lobbyCode}`);
      callback({ success: true, reconnected: true });
      broadcastLobbyState(lobbyCode);
    } else {
      // Normal join
      if (lobby.players.some(p => p.name === name && p.id !== socket.id)) {
        return callback({ error: "Player name already taken" });
      }
      if (!lobby.players.find(p => p.id === socket.id)) {
        lobby.players.push({ id: socket.id, name });
      }
      socketToLobby[socket.id] = lobbyCode;
      socket.join(`lobby:${lobbyCode}`);
      callback({ success: true, reconnected: false });
      broadcastLobbyState(lobbyCode);
    }
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

  const playerInfo = lobby.players.find(p => p.id === socket.id);
  const playerName = playerInfo?.name;

  // Collect rooms this player is in
  const playerRooms = {};
  let isInAnyRoom = false;

  for (const [roomCode, room] of Object.entries(lobby.rooms)) {
    if (room.players[socket.id]) {
      playerRooms[roomCode] = room.players[socket.id];
      isInAnyRoom = true;
    }
    if (room.spectators) {
      room.spectators = room.spectators.filter(id => id !== socket.id);
    }
  }

  // If player is in a game room, start grace period (F11)
  if (isInAnyRoom && playerName) {
    // Pause timers and notify opponent
    for (const [roomCode, role] of Object.entries(playerRooms)) {
      const room = lobby.rooms[roomCode];
      if (room) {
        clearTurnTimer(roomCode);
        io.to(roomCode).emit("opponentDisconnected", { name: playerName });
      }
    }

    // Remove from lobby player list and socket map temporarily
    lobby.players = lobby.players.filter(p => p.id !== socket.id);
    delete socketToLobby[socket.id];

    // But DON'T remove from room.players yet — start grace period
    const gracePeriod = setTimeout(() => {
      // Grace period expired — clean up for real
      delete disconnectedPlayers[socket.id];
      const lobbyStill = lobbies[lobbyCode];
      if (!lobbyStill) return;

      for (const [roomCode] of Object.entries(playerRooms)) {
        const room = lobbyStill.rooms[roomCode];
        if (!room) continue;
        delete room.players[socket.id];
        if (playerName) room.playerNames = room.playerNames.filter(n => n !== playerName);
        if (Object.keys(room.players).length === 0) {
          clearTurnTimer(roomCode);
          delete lobbyStill.rooms[roomCode];
        } else {
          io.to(roomCode).emit("opponentLeft");
        }
      }

      if (lobbyStill.players.length === 0 && Object.keys(lobbyStill.rooms).every(rc => !lobbyStill.rooms[rc])) {
        delete lobbies[lobbyCode];
      } else {
        broadcastLobbyState(lobbyCode);
      }
    }, 30000); // 30 second grace period

    disconnectedPlayers[socket.id] = {
      lobbyCode,
      name: playerName,
      rooms: playerRooms,
      timeout: gracePeriod
    };

    broadcastLobbyState(lobbyCode);
  } else {
    // Not in any room — clean up immediately (spectator or lobby-only)
    for (const [roomCode, room] of Object.entries(lobby.rooms)) {
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        if (playerName) room.playerNames = room.playerNames.filter(n => n !== playerName);
        if (Object.keys(room.players).length === 0) {
          clearTurnTimer(roomCode);
          delete lobby.rooms[roomCode];
        } else {
          clearTurnTimer(roomCode);
          io.to(roomCode).emit("opponentLeft");
        }
      }
    }

    lobby.players = lobby.players.filter(p => p.id !== socket.id);
    delete socketToLobby[socket.id];

    if (lobby.players.length === 0) {
      delete lobbies[lobbyCode];
    } else {
      broadcastLobbyState(lobbyCode);
    }
  }
};

server.listen(3001, () => {
  console.log("SERVER IS RUNNING ON PORT 3001");
});
