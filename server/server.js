const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { makeTicTacToeMove, makeConnect4Move, makeOthelloMove } = require('./utils/gameLogic');
const { getInitialCheckersBoard, makeCheckersMove } = require('./utils/checkersLogic');
const { makeGomokuMove } = require('./utils/gomokuLogic');
const { getInitialMancalaBoard, makeMancalaMove } = require('./utils/mancalaLogic');
const { getInitialDotsBoxesBoard, makeDotsBoxesMove } = require('./utils/dotsboxesLogic');
const { getInitialNimBoard, makeNimMove } = require('./utils/nimLogic');
const { getInitialUTTTState, makeUTTTMove } = require('./utils/utttLogic');
const { getInitialChainBoard, makeChainMove, CHAIN_COLORS } = require('./utils/chainLogic');
const { getInitialMemoryState, makeMemoryMove } = require('./utils/memoryLogic');
const { getBotMove } = require('./utils/botLogic');
const { getInitialScribbleState, checkGuess: scribbleCheckGuess, nextRound: scribbleNextRound } = require('./utils/scribbleLogic');
const { getInitialImposterState, submitClue, submitVote, revealResults, nextRound: imposterNextRound } = require('./utils/imposterLogic');
const { getInitialWordleState, submitGuess: wordleSubmitGuess } = require('./utils/wordleLogic');

const app = express();
app.use(cors());

const GAME_CONFIG = {
    tictactoe: { maxPlayers: 2 },
    connect4: { maxPlayers: 2 },
    othello: { maxPlayers: 2 },
    checkers: { maxPlayers: 2 },
    gomoku: { maxPlayers: 2 },
    mancala: { maxPlayers: 2 },
    dotsboxes: { maxPlayers: 2 },
    nim: { maxPlayers: 2 },
    uttt: { maxPlayers: 2 },
    chain: { maxPlayers: 6 },
    memory: { maxPlayers: 4 },
    scribble: { maxPlayers: 8 },
    imposter: { maxPlayers: 10 },
    wordle: { maxPlayers: 2 },
};

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
      let winningRole = 'X';
      if (room.gameType === 'checkers') {
        winningRole = room.turn === 'b' ? 'r' : 'b';
      } else if (room.gameType === 'chain') {
        // For chain, the current player times out; next player in turn order wins
        const to = room.turnOrder || [];
        const curIdx = to.indexOf(room.turn);
        winningRole = to[(curIdx + 1) % to.length] || 'X';
      } else if (room.gameType === 'memory') {
        // For memory, use turnOrder to find next player
        const mto = room.memoryState?.turnOrder || ['X', 'O'];
        const mIdx = mto.indexOf(room.turn);
        winningRole = mto[(mIdx + 1) % mto.length] || 'X';
      } else {
        winningRole = room.turn === 'X' ? 'O' : 'X';
      }
      handleGameResult(room, { winner: winningRole, line: null, timeout: true }, roomCode);
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

const getBoardForGameType = (gameType) => {
  if (gameType === 'connect4') return Array(42).fill(null);
  if (gameType === 'othello') {
    const b = Array(64).fill(null);
    b[27] = 'O'; b[28] = 'X'; b[35] = 'X'; b[36] = 'O';
    return b;
  }
  if (gameType === 'checkers') return getInitialCheckersBoard();
  if (gameType === 'gomoku') return Array(225).fill(null);
  if (gameType === 'mancala') return getInitialMancalaBoard();
  if (gameType === 'dotsboxes') return getInitialDotsBoxesBoard();
  if (gameType === 'nim') return getInitialNimBoard();
  if (gameType === 'uttt') return Array(81).fill(null);
  if (gameType === 'chain') return getInitialChainBoard();
  if (gameType === 'memory') return null; // Memory uses memoryState instead
  if (gameType === 'scribble' || gameType === 'imposter' || gameType === 'wordle') return null;
  return Array(9).fill(null);
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
    isFull: Object.keys(room.players).length >= (GAME_CONFIG[room.gameType] || { maxPlayers: 2 }).maxPlayers,
    spectatorCount: (room.spectators || []).length
  }));

  io.to(`lobby:${lobbyCode}`).emit("lobbyUpdate", {
    players: lobby.players,
    rooms: roomList
  });
};

// ── Execute a move (shared by human makeMove and bot scheduleBotMove) ──
const executeMove = (lobbyCode, roomCode, index, player, data) => {
  const room = lobbies[lobbyCode]?.rooms[roomCode];
  if (!room || room.turn !== player) return false;

  let moveResult;
  if (room.gameType === 'connect4') {
    moveResult = makeConnect4Move(room.board, index, player);
  } else if (room.gameType === 'othello') {
    moveResult = makeOthelloMove(room.board, index, player);
  } else if (room.gameType === 'checkers') {
    moveResult = makeCheckersMove(room.board, data.fromIndex, data.toIndex, player, room.mustMoveIndex);
  } else if (room.gameType === 'gomoku') {
    moveResult = makeGomokuMove(room.board, index, player);
  } else if (room.gameType === 'mancala') {
    moveResult = makeMancalaMove(room.board, index, player);
  } else if (room.gameType === 'dotsboxes') {
    moveResult = makeDotsBoxesMove(room.board, index, player);
  } else if (room.gameType === 'nim') {
    moveResult = makeNimMove(room.board, index, player);
  } else if (room.gameType === 'uttt') {
    const utttState = { board: room.board, activeBoard: room.activeBoard, subBoardWinners: room.subBoardWinners };
    moveResult = makeUTTTMove(utttState, index, player);
  } else if (room.gameType === 'chain') {
    moveResult = makeChainMove(room.board, index, player, room.turnOrder, room.chainMoveCount);
  } else if (room.gameType === 'memory') {
    moveResult = makeMemoryMove(room.memoryState, index, player);
  } else {
    moveResult = makeTicTacToeMove(room.board, index, player);
  }

  if (!moveResult.valid) return false;

  // Update board for most games
  if (room.gameType === 'memory') {
    room.memoryState = {
      cards: moveResult.cards,
      revealed: moveResult.revealed,
      matchedBy: moveResult.matchedBy,
      flippedIndices: moveResult.flippedIndices,
      scores: moveResult.scores,
      turnOrder: moveResult.turnOrder,
      moveCount: moveResult.moveCount,
    };
  } else {
    room.board = moveResult.board;
  }

  if (room.gameType === 'checkers') {
    room.mustMoveIndex = moveResult.mustMoveIndex || null;
  }
  if (room.gameType === 'uttt') {
    room.activeBoard = moveResult.activeBoard;
    room.subBoardWinners = moveResult.subBoardWinners;
  }
  if (room.gameType === 'chain') {
    room.turnOrder = moveResult.turnOrder;
    room.chainMoveCount = moveResult.moveCount;
  }

  const result = moveResult.result;

  if (result) {
    handleGameResult(room, result, roomCode);
    clearTurnTimer(roomCode);
    io.to(roomCode).emit("gameUpdate", room);
    return true;
  }

  if (room.gameType === 'checkers') {
    room.turn = moveResult.nextTurn || (player === "b" ? "r" : "b");
  } else {
    room.turn = moveResult.nextTurn || (player === "X" ? "O" : "X");
  }

  // Handle memory flip-back on server
  if (room.gameType === 'memory' && moveResult.needsFlipBack) {
    const flipIndices = moveResult.flipBackIndices;
    const nextTurn = moveResult.nextTurn;
    // Emit the current state with flipped cards visible
    io.to(roomCode).emit("gameUpdate", room);
    // After delay, flip back
    setTimeout(() => {
      const currentRoom = lobbies[lobbyCode]?.rooms[roomCode];
      if (currentRoom && currentRoom.memoryState) {
        const newRevealed = [...currentRoom.memoryState.revealed];
        for (const idx of flipIndices) {
          if (newRevealed[idx] === 'flipped') newRevealed[idx] = 'hidden';
        }
        currentRoom.memoryState.revealed = newRevealed;
        currentRoom.memoryState.flippedIndices = [];
        currentRoom.turn = nextTurn;
        io.to(roomCode).emit("gameUpdate", currentRoom);
        startTurnTimer(lobbyCode, roomCode);
        scheduleBotMove(lobbyCode, roomCode);
      }
    }, 1500);
    return true; // Don't emit gameUpdate again below
  }

  startTurnTimer(lobbyCode, roomCode);
  io.to(roomCode).emit("gameUpdate", room);
  scheduleBotMove(lobbyCode, roomCode);
  return true;
};

// ── Schedule a bot move if the current turn belongs to a bot ──
const scheduleBotMove = (lobbyCode, roomCode) => {
  const room = lobbies[lobbyCode]?.rooms[roomCode];
  if (!room || room.result) return;

  // Find if current turn belongs to a bot
  const botEntry = Object.entries(room.players).find(([sid, role]) =>
    sid.startsWith('bot-') && role === room.turn
  );
  if (!botEntry) return;

  const [botSocketId] = botEntry;
  const botInfo = room.bots?.[botSocketId];
  if (!botInfo) return;

  const delay = botInfo.difficulty === 'easy' ? 1200 : botInfo.difficulty === 'medium' ? 800 : 500;

  setTimeout(() => {
    const currentRoom = lobbies[lobbyCode]?.rooms[roomCode];
    if (!currentRoom || currentRoom.result) return;

    const move = getBotMove(currentRoom.gameType, currentRoom, botInfo.role, botInfo.difficulty);
    if (!move) return;

    executeMove(lobbyCode, roomCode, move.index, botInfo.role, move.data);
  }, delay);
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

    const board = getBoardForGameType(gameType);

    // Determine first player role
    let firstRole = 'X';
    if (gameType === 'checkers') firstRole = 'b';
    else if (gameType === 'chain') firstRole = CHAIN_COLORS[0]; // 'R'

    lobby.rooms[roomCode] = {
      gameType,
      players: { [socket.id]: firstRole },
      playerNames: [playerName],
      spectators: [],
      board,
      turn: gameType === 'checkers' ? "b" : gameType === 'chain' ? CHAIN_COLORS[0] : "X",
      score: gameType === 'chain'
        ? Object.fromEntries(CHAIN_COLORS.map(c => [c, 0]))
        : gameType === 'memory'
        ? { X: 0, O: 0, P3: 0, P4: 0 }
        : { X: 0, O: 0, b: 0, r: 0 },
      seriesLength: seriesLength || 0,
      chatHistory: [],
      mustMoveIndex: null,
    };

    const room = lobby.rooms[roomCode];

    // UTTT extra state
    if (gameType === 'uttt') {
      room.activeBoard = null;
      room.subBoardWinners = Array(9).fill(null);
    }

    // Chain extra state
    if (gameType === 'chain') {
      room.turnOrder = [CHAIN_COLORS[0]];
      room.chainMoveCount = 0;
    }

    // Memory extra state
    if (gameType === 'memory') {
      const memState = getInitialMemoryState(2);
      room.memoryState = memState;
      room.board = null;
      room.turn = memState.turnOrder[0];
    }

    // Word game state initialization
    if (gameType === 'scribble' || gameType === 'imposter' || gameType === 'wordle') {
      room.wordGameState = null; // Will be initialized when game starts
      room.board = null;
    }

    socket.join(roomCode);
    console.log(`Room ${roomCode} (${gameType}) created in lobby ${lobbyCode} by ${playerName}`);

    callback({ code: roomCode, role: firstRole, playerName, gameType, seriesLength: seriesLength || 0 });
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

    const maxPlayers = (GAME_CONFIG[room.gameType] || { maxPlayers: 2 }).maxPlayers;
    if (Object.keys(room.players).length >= maxPlayers) {
      return callback({ error: "Room is full" });
    }

    const playerName = lobby.players.find(p => p.id === socket.id)?.name || "Unknown";
    const playerCount = Object.keys(room.players).length;

    // Assign role based on game type
    let assignedRole;
    if (room.gameType === 'checkers') {
      assignedRole = 'r';
    } else if (room.gameType === 'chain') {
      assignedRole = CHAIN_COLORS[playerCount]; // Next color in sequence
      room.turnOrder = room.turnOrder || [];
      room.turnOrder.push(assignedRole);
    } else if (room.gameType === 'memory') {
      if (playerCount === 1) assignedRole = 'O';
      else if (playerCount === 2) assignedRole = 'P3';
      else assignedRole = 'P4';
      // Only do a full re-init when the 2nd player joins (first join into an existing room).
      // For 3rd/4th players, preserve existing cards/revealed and only extend turnOrder & scores.
      const allRoles = [...Object.values(room.players), assignedRole];
      if (playerCount === 1) {
        // 2nd player joins: safe to (re)initialize from scratch since no moves made yet
        const memState = getInitialMemoryState(allRoles.length);
        memState.turnOrder = allRoles;
        memState.scores = {};
        for (const r of allRoles) memState.scores[r] = 0;
        room.memoryState = memState;
        room.turn = memState.turnOrder[0];
      } else {
        // 3rd or 4th player joining — preserve existing game state, just add them in
        if (room.memoryState) {
          room.memoryState.turnOrder = allRoles;
          room.memoryState.scores = room.memoryState.scores || {};
          room.memoryState.scores[assignedRole] = 0;
        }
        // turn stays as-is
      }
    } else {
      assignedRole = 'O';
    }

    room.players[socket.id] = assignedRole;
    room.playerNames.push(playerName);

    socket.join(roomCode);
    console.log(`${playerName} joined room ${roomCode}`);

    const gameData = {
      board: room.board, turn: room.turn, score: room.score,
      playerNames: room.playerNames, gameType: room.gameType,
      seriesLength: room.seriesLength || 0, chatHistory: room.chatHistory || [],
    };
    // Include extra state
    if (room.gameType === 'uttt') {
      gameData.activeBoard = room.activeBoard;
      gameData.subBoardWinners = room.subBoardWinners;
    }
    if (room.gameType === 'chain') {
      gameData.turnOrder = room.turnOrder;
      gameData.chainMoveCount = room.chainMoveCount;
    }
    if (room.gameType === 'memory') {
      gameData.memoryState = room.memoryState;
    }

    callback({ code: roomCode, role: assignedRole, gameData });
    io.to(roomCode).emit("gameStart", room);
    // Start timer when we reach minimum 2 players
    const playerCount2 = Object.keys(room.players).length;
    if (playerCount2 >= 2) {
      // Auto-start word games when enough players join
      if (room.gameType === 'scribble' || room.gameType === 'imposter' || room.gameType === 'wordle') {
        const playerIds = Object.keys(room.players);
        const pNames = {};
        for (const pid of playerIds) {
          const lobbyPlayer = lobby.players.find(p => p.id === pid);
          pNames[pid] = lobbyPlayer?.name || 'Unknown';
        }
        if (room.gameType === 'scribble') {
          room.wordGameState = getInitialScribbleState(playerIds, pNames);
          io.to(roomCode).emit('scribbleStateUpdate', room.wordGameState);
        } else if (room.gameType === 'imposter') {
          room.wordGameState = getInitialImposterState(playerIds, pNames);
          // Send each player their own view (with their personal word)
          for (const pid of playerIds) {
            const playerSocket = io.sockets.sockets.get(pid);
            if (playerSocket) {
              playerSocket.emit('imposterStateUpdate', room.wordGameState);
            }
          }
        } else if (room.gameType === 'wordle') {
          room.wordGameState = getInitialWordleState();
          // Send state without the word to players
          const safeState = { ...room.wordGameState, word: undefined };
          io.to(roomCode).emit('wordleStateUpdate', { state: safeState });
        }
      } else {
        startTurnTimer(lobbyCode, roomCode);
      }
    }
    broadcastLobbyState(lobbyCode);
  });

  // Add a bot to a room
  socket.on("addBot", ({ difficulty }, callback) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return callback({ error: "Not in a lobby" });

    const lobby = lobbies[lobbyCode];
    if (!lobby) return callback({ error: "Lobby not found" });

    // Find which room the player is in
    let roomCode = null;
    let room = null;
    for (const [rc, r] of Object.entries(lobby.rooms)) {
      if (r.players[socket.id]) {
        roomCode = rc;
        room = r;
        break;
      }
    }
    if (!room) return callback({ error: "You are not in a room" });

    const maxPlayers = (GAME_CONFIG[room.gameType] || { maxPlayers: 2 }).maxPlayers;
    if (Object.keys(room.players).length >= maxPlayers) {
      return callback({ error: "Room is full" });
    }

    const botSocketId = `bot-${difficulty}-${Date.now()}`;
    const playerCount = Object.keys(room.players).length;

    // Assign role using same logic as joinRoom
    let assignedRole;
    if (room.gameType === 'checkers') {
      assignedRole = 'r';
    } else if (room.gameType === 'chain') {
      assignedRole = CHAIN_COLORS[playerCount];
      room.turnOrder = room.turnOrder || [];
      room.turnOrder.push(assignedRole);
    } else if (room.gameType === 'memory') {
      if (playerCount === 1) assignedRole = 'O';
      else if (playerCount === 2) assignedRole = 'P3';
      else assignedRole = 'P4';
      // Same fix as joinRoom: only do a full re-init for the 2nd player (bot joining fresh room)
      const allRoles = [...Object.values(room.players), assignedRole];
      if (playerCount === 1) {
        const memState = getInitialMemoryState(allRoles.length);
        memState.turnOrder = allRoles;
        memState.scores = {};
        for (const r of allRoles) memState.scores[r] = 0;
        room.memoryState = memState;
        room.turn = memState.turnOrder[0];
      } else {
        // 3rd or 4th bot joining — preserve existing game state
        if (room.memoryState) {
          room.memoryState.turnOrder = allRoles;
          room.memoryState.scores = room.memoryState.scores || {};
          room.memoryState.scores[assignedRole] = 0;
        }
      }
    } else {
      assignedRole = 'O';
    }

    const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    const botName = `Bot (${diffLabel})`;

    room.players[botSocketId] = assignedRole;
    room.playerNames.push(botName);
    if (!room.bots) room.bots = {};
    room.bots[botSocketId] = { role: assignedRole, difficulty, name: botName };

    console.log(`Bot ${botName} added to room ${roomCode}`);

    io.to(roomCode).emit("gameStart", room);
    // Start timer when we reach minimum 2 players
    if (Object.keys(room.players).length >= 2) {
      startTurnTimer(lobbyCode, roomCode);
    }
    broadcastLobbyState(lobbyCode);
    callback({ botName });

    // If it's the bot's turn, schedule a move
    scheduleBotMove(lobbyCode, roomCode);
  });

  // Make a move
  socket.on("makeMove", ({ code, index, player, data }) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;
    executeMove(lobbyCode, code, index, player, data);
  });

  // Restart game (local mode)
  socket.on("restartGame", (code) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;

    const room = lobbies[lobbyCode]?.rooms[code];
    if (room) {
      room.board = getBoardForGameType(room.gameType);
      room.turn = room.gameType === 'checkers' ? 'b' : room.gameType === 'chain' ? CHAIN_COLORS[0] : 'X';
      room.mustMoveIndex = null;
      room.result = null;
      // Reset extra state
      if (room.gameType === 'uttt') {
        room.activeBoard = null;
        room.subBoardWinners = Array(9).fill(null);
      }
      if (room.gameType === 'chain') {
        room.chainMoveCount = 0;
        // Rebuild turnOrder from current players
        const playerEntries = Object.values(room.players);
        room.turnOrder = playerEntries.length > 0 ? playerEntries : [CHAIN_COLORS[0]];
      }
      if (room.gameType === 'memory') {
        const roles = Object.values(room.players);
        const memState = getInitialMemoryState(roles.length);
        memState.turnOrder = roles;
        memState.scores = Object.fromEntries(roles.map(r => [r, 0]));
        room.memoryState = memState;
        room.turn = memState.turnOrder[0];
      }
      io.to(code).emit("gameUpdate", room);
      if (Object.keys(room.players).length >= 2) {
        startTurnTimer(lobbyCode, code);
        scheduleBotMove(lobbyCode, code);
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
    // Auto-add bot rematch requests
    if (room.bots) {
      for (const botId of Object.keys(room.bots)) {
        if (!room.rematchRequests.includes(botId)) {
          room.rematchRequests.push(botId);
        }
      }
    }
    const humanCount = Object.keys(room.players).filter(id => !id.startsWith('bot-')).length;
    const totalPlayers = Object.keys(room.players).length;
    if (room.rematchRequests.length >= totalPlayers || (humanCount <= 1 && room.rematchRequests.length >= 2)) {
      if (room.seriesWinner) {
        // Reset score with correct keys for the game type
        if (room.gameType === 'chain') {
          room.score = Object.fromEntries(CHAIN_COLORS.map(c => [c, 0]));
        } else if (room.gameType === 'memory') {
          const roles = Object.values(room.players);
          room.score = Object.fromEntries(roles.map(r => [r, 0]));
        } else {
          room.score = room.gameType === 'checkers' ? { b: 0, r: 0 } : { X: 0, O: 0 };
        }
        room.seriesWinner = null;
      }
      room.board = getBoardForGameType(room.gameType);
      room.turn = room.gameType === 'checkers' ? 'b' : room.gameType === 'chain' ? CHAIN_COLORS[0] : 'X';
      room.mustMoveIndex = null;
      room.result = null;
      room.rematchRequests = [];
      // Reset extra state for rematch
      if (room.gameType === 'uttt') {
        room.activeBoard = null;
        room.subBoardWinners = Array(9).fill(null);
      }
      if (room.gameType === 'chain') {
        room.chainMoveCount = 0;
        const playerEntries = Object.values(room.players);
        room.turnOrder = playerEntries.length > 0 ? playerEntries : [CHAIN_COLORS[0]];
      }
      if (room.gameType === 'memory') {
        const roles = Object.values(room.players);
        const memState = getInitialMemoryState(roles.length);
        memState.turnOrder = roles;
        memState.scores = Object.fromEntries(roles.map(r => [r, 0]));
        room.memoryState = memState;
        room.turn = memState.turnOrder[0];
      }
      io.to(code).emit("gameUpdate", room);
      startTurnTimer(lobbyCode, code);
      scheduleBotMove(lobbyCode, code);
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

    const spectateData = { board: room.board, turn: room.turn, score: room.score, playerNames: room.playerNames, result: room.result || null, gameType: room.gameType || 'tictactoe', timeLeft: room.timeLeft || null, seriesLength: room.seriesLength || 0, seriesWinner: room.seriesWinner || null, chatHistory: room.chatHistory || [] };
    if (room.gameType === 'uttt') {
      spectateData.activeBoard = room.activeBoard;
      spectateData.subBoardWinners = room.subBoardWinners;
    }
    if (room.gameType === 'chain') {
      spectateData.turnOrder = room.turnOrder;
      spectateData.chainMoveCount = room.chainMoveCount;
    }
    if (room.gameType === 'memory') {
      spectateData.memoryState = room.memoryState;
    }
    callback({ gameData: spectateData });
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

      // Clean up bots when a human leaves
      if (room.bots) {
        for (const botId of Object.keys(room.bots)) {
          const botInfo = room.bots[botId];
          delete room.players[botId];
          if (botInfo.name) room.playerNames = room.playerNames.filter(n => n !== botInfo.name);
        }
        room.bots = {};
      }

      if (Object.keys(room.players).length === 0) {
        clearTurnTimer(roomCode);
        delete lobby.rooms[roomCode];
      } else {
        clearTurnTimer(roomCode);
        io.to(roomCode).emit("opponentLeft", { voluntary: true });
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
      gameType: room.gameType || 'tictactoe',
      playerNames: room.playerNames || [],
      isFull: Object.keys(room.players).length >= (GAME_CONFIG[room.gameType] || { maxPlayers: 2 }).maxPlayers,
      spectatorCount: (room.spectators || []).length
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

  // ── Scribble Events ──
  socket.on("scribbleDraw", (data) => {
    // Broadcast drawing data to other players in the room
    socket.to(data.room).emit("scribbleDrawUpdate", data);
  });

  socket.on("scribbleGuess", ({ room: roomCode, guess, playerId, playerName }) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;
    const room = lobbies[lobbyCode]?.rooms[roomCode];
    if (!room || !room.wordGameState) return;

    const result = scribbleCheckGuess(room.wordGameState, guess, playerId);

    if (result.correct) {
      io.to(roomCode).emit("scribbleGuessResult", {
        playerName,
        message: `${playerName} guessed the word!`,
        correct: true,
      });
      // Update state
      io.to(roomCode).emit("scribbleStateUpdate", room.wordGameState);

      // Check if all guessers have guessed
      const totalPlayers = room.wordGameState.drawOrder.length;
      if (room.wordGameState.guessedPlayers.length >= totalPlayers - 1) {
        // All players guessed, move to next round
        const word = room.wordGameState.word;
        io.to(roomCode).emit("scribbleRoundEnd", { word });
        const nextState = scribbleNextRound(room.wordGameState);
        if (nextState.gameOver) {
          io.to(roomCode).emit("scribbleGameEnd", nextState);
          room.wordGameState = null;
        } else {
          room.wordGameState = nextState;
          io.to(roomCode).emit("scribbleStateUpdate", room.wordGameState);
        }
      }
    } else if (!result.alreadyGuessed) {
      io.to(roomCode).emit("scribbleGuessResult", {
        playerName,
        message: guess,
        correct: false,
      });
    }
  });

  socket.on("scribbleStart", ({ room: roomCode }) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;
    const lobby = lobbies[lobbyCode];
    const room = lobby?.rooms[roomCode];
    if (!room) return;

    const playerIds = Object.keys(room.players);
    const pNames = {};
    for (const pid of playerIds) {
      const lobbyPlayer = lobby.players.find(p => p.id === pid);
      pNames[pid] = lobbyPlayer?.name || 'Unknown';
    }
    room.wordGameState = getInitialScribbleState(playerIds, pNames);
    io.to(roomCode).emit("scribbleStateUpdate", room.wordGameState);
  });

  socket.on("scribbleNextRound", ({ room: roomCode }) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;
    const room = lobbies[lobbyCode]?.rooms[roomCode];
    if (!room || !room.wordGameState) return;

    const word = room.wordGameState.word;
    io.to(roomCode).emit("scribbleRoundEnd", { word });
    const nextState = scribbleNextRound(room.wordGameState);
    if (nextState.gameOver) {
      io.to(roomCode).emit("scribbleGameEnd", nextState);
      room.wordGameState = null;
    } else {
      room.wordGameState = nextState;
      io.to(roomCode).emit("scribbleStateUpdate", room.wordGameState);
    }
  });

  // ── Imposter Word Events ──
  socket.on("imposterStart", ({ room: roomCode }) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;
    const lobby = lobbies[lobbyCode];
    const room = lobby?.rooms[roomCode];
    if (!room) return;

    const playerIds = Object.keys(room.players);
    const pNames = {};
    for (const pid of playerIds) {
      const lobbyPlayer = lobby.players.find(p => p.id === pid);
      pNames[pid] = lobbyPlayer?.name || 'Unknown';
    }
    room.wordGameState = getInitialImposterState(playerIds, pNames);
    // Send state to each player
    for (const pid of playerIds) {
      const playerSocket = io.sockets.sockets.get(pid);
      if (playerSocket) {
        playerSocket.emit('imposterStateUpdate', room.wordGameState);
      }
    }
  });

  socket.on("imposterClue", ({ room: roomCode, playerId, clue }) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;
    const room = lobbies[lobbyCode]?.rooms[roomCode];
    if (!room || !room.wordGameState) return;

    const newState = submitClue(room.wordGameState, playerId, clue);
    if (!newState) return;

    room.wordGameState = newState;
    // Broadcast to all players
    const playerIds = Object.keys(room.players);
    for (const pid of playerIds) {
      const playerSocket = io.sockets.sockets.get(pid);
      if (playerSocket) {
        playerSocket.emit('imposterStateUpdate', room.wordGameState);
      }
    }
  });

  socket.on("imposterVote", ({ room: roomCode, playerId, votedForId }) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;
    const room = lobbies[lobbyCode]?.rooms[roomCode];
    if (!room || !room.wordGameState) return;

    const newState = submitVote(room.wordGameState, playerId, votedForId);
    if (!newState) return;

    room.wordGameState = newState;

    if (newState.phase === 'reveal') {
      const results = revealResults(newState);
      room.wordGameState.scores = results.scores;
      io.to(roomCode).emit('imposterReveal', results);

      // Check if game is over (all rounds played)
      if (newState.round >= newState.totalRounds) {
        io.to(roomCode).emit('imposterGameEnd', { scores: results.scores });
      }
    }

    // Broadcast updated state
    const playerIds = Object.keys(room.players);
    for (const pid of playerIds) {
      const playerSocket = io.sockets.sockets.get(pid);
      if (playerSocket) {
        playerSocket.emit('imposterStateUpdate', room.wordGameState);
      }
    }
  });

  socket.on("imposterNextRound", ({ room: roomCode }) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;
    const room = lobbies[lobbyCode]?.rooms[roomCode];
    if (!room || !room.wordGameState) return;

    const playerIds = Object.keys(room.players);
    const newState = imposterNextRound(room.wordGameState, playerIds);
    room.wordGameState = newState;

    for (const pid of playerIds) {
      const playerSocket = io.sockets.sockets.get(pid);
      if (playerSocket) {
        playerSocket.emit('imposterStateUpdate', room.wordGameState);
      }
    }
  });

  socket.on("imposterPhaseAdvance", ({ room: roomCode }) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;
    const room = lobbies[lobbyCode]?.rooms[roomCode];
    if (!room || !room.wordGameState) return;

    // Only advance from discussion to voting
    if (room.wordGameState.phase === 'discussion') {
      room.wordGameState.phase = 'voting';
      const playerIds = Object.keys(room.players);
      for (const pid of playerIds) {
        const playerSocket = io.sockets.sockets.get(pid);
        if (playerSocket) {
          playerSocket.emit('imposterStateUpdate', room.wordGameState);
        }
      }
    }
  });

  socket.on("imposterChat", (data) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;
    const room = lobbies[lobbyCode]?.rooms[data.room];
    if (!room) return;
    io.to(data.room).emit("imposterChat", { sender: data.sender, message: data.message });
  });

  // ── Wordle Events ──
  socket.on("wordleStart", ({ room: roomCode }) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;
    const room = lobbies[lobbyCode]?.rooms[roomCode];
    if (!room) return;

    room.wordGameState = getInitialWordleState();
    const safeState = { ...room.wordGameState, word: undefined };
    io.to(roomCode).emit("wordleStateUpdate", { state: safeState });
  });

  socket.on("wordleGuess", ({ roomCode, guess }) => {
    const lobbyCode = socketToLobby[socket.id];
    if (!lobbyCode) return;
    const room = lobbies[lobbyCode]?.rooms[roomCode];
    if (!room || !room.wordGameState) return;

    const result = wordleSubmitGuess(room.wordGameState, guess);
    if (!result.valid) {
      socket.emit("wordleStateUpdate", { state: { ...room.wordGameState, word: undefined }, reason: result.reason });
      return;
    }

    room.wordGameState = result.newState;
    // Send state to all players; include word only if game is over
    const stateToSend = { ...result.newState };
    if (!stateToSend.result) {
      stateToSend.word = undefined;
    }
    io.to(roomCode).emit("wordleStateUpdate", { state: stateToSend, feedback: result.feedback });
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
          // Send reconnecting player the full current room state (including result if game ended)
          // For word games, use their dedicated state events to avoid leaking secret words
          if (room.gameType === 'wordle' && room.wordGameState) {
            const safeState = { ...room.wordGameState };
            if (!safeState.result) safeState.word = undefined;
            socket.emit('wordleStateUpdate', { state: safeState });
          } else if (room.gameType === 'imposter' && room.wordGameState) {
            socket.emit('imposterStateUpdate', room.wordGameState);
          } else if (room.gameType === 'scribble' && room.wordGameState) {
            socket.emit('scribbleStateUpdate', room.wordGameState);
          } else {
            socket.emit("gameUpdate", room);
          }
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
        // Clean up bots when a human disconnects permanently
        if (room.bots) {
          for (const botId of Object.keys(room.bots)) {
            const botInfo = room.bots[botId];
            delete room.players[botId];
            if (botInfo.name) room.playerNames = room.playerNames.filter(n => n !== botInfo.name);
          }
          room.bots = {};
        }
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
