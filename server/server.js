const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", // URL of the React client or dynamic client origin from env
    methods: ["GET", "POST"]
  }
});

const rooms = {};

// Function to generate a random room code
const generateRoomCode = () => {
  let code = '';
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Check for winner
const checkWinner = (board) => {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  for (let w of wins) {
    const [a,b,c] = w;
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return { winner: board[a], line: w };
  }

  if (!board.includes(null)) return { winner: "draw", line: null };
  return null;
}

const handleLeaveRoom = (socket) => {
    for (const code in rooms) {
      if (rooms[code] && rooms[code].players[socket.id]) {
        console.log(`Player ${socket.id} leaving room ${code}`);
        delete rooms[code].players[socket.id];
        if (Object.keys(rooms[code].players).length === 0) {
          console.log(`Room ${code} is empty, deleting.`);
          delete rooms[code];
        } else {
          console.log(`Notifying opponent in room ${code}`);
          io.to(code).emit("opponentLeft");
        }
        break;
      }
    }
};

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("createRoom", (callback) => {
    let code;
    do {
      code = generateRoomCode();
    } while(rooms[code]);
    
    rooms[code] = {
      players: { [socket.id]: "X" },
      board: Array(9).fill(null),
      turn: "X",
      score: { X: 0, O: 0 }
    };
    
    socket.join(code);
    console.log(`Room ${code} created by ${socket.id}`);
    callback({ code, role: "X" });
  });

  socket.on("joinRoom", (code, callback) => {
    if (!rooms[code]) {
      return callback({ error: "Room not found" });
    }

    if (rooms[code].players[socket.id]) {
      console.log(`Player ${socket.id} is rejoining room ${code}`);
      return callback({ code, role: rooms[code].players[socket.id] });
    }
    
    if (Object.keys(rooms[code].players).length >= 2) {
      return callback({ error: "Room is full" });
    }
    
    const role = "O";
    rooms[code].players[socket.id] = role;
    socket.join(code);
    console.log(`Player ${socket.id} joined room ${code} as O`);
    
    callback({ code, role });
    io.to(code).emit("gameStart", rooms[code]);
  });

  socket.on("makeMove", ({ code, index, player }) => {
    const room = rooms[code];
    if (room && room.turn === player && !room.board[index]) {
      room.board[index] = player;
      const result = checkWinner(room.board);

      if (result) {
        room.result = result;
        if(result.winner !== 'draw') {
          room.score[result.winner]++;
        }
      } else {
        room.turn = player === "X" ? "O" : "X";
      }
      
      io.to(code).emit("gameUpdate", room);
    }
  });

  socket.on("restartGame", (code) => {
    const room = rooms[code];
    if(room) {
      room.board = Array(9).fill(null);
      room.turn = "X";
      room.result = null;
      io.to(code).emit("gameUpdate", room);
    }
  });
  
  socket.on('leaveRoom', () => {
    console.log(`User explicitly left: ${socket.id}`);
    handleLeaveRoom(socket);
  });

  socket.on('disconnect', () => {
    console.log(`User Disconnected: ${socket.id}`);
    handleLeaveRoom(socket);
  });
});

server.listen(3001, () => {
  console.log("SERVER IS RUNNING ON PORT 3001");
});
