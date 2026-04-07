## Your Role
You are integrating 4 new games (Gomoku, Mancala, Dots & Boxes, Nim) into an existing React + Express multiplayer gaming platform. All game logic and board components have already been created by other workers. You are wiring them into the shared files.

## Project Conventions
- camelCase for functions, PascalCase for components
- Server: CommonJS, Client: ES modules
- Games registered in Games.jsx GAMES array, rendered in Game.jsx, server logic in server.js
- Sidebar.jsx has gameRouteMap and gameNameMap objects

## Current State (what exists)
Current GAMES array in Games.jsx:
```javascript
const GAMES = [
    { id: 'tictactoe', name: 'Tic Tac Toe', desc: "The classic game of X's and O's.", route: 'tic-tac-toe', modes: ['pnp', '2p'] },
    { id: 'connect4', name: 'Connect 4', desc: 'Connect 4 discs in a row to win!', route: 'connect4', modes: ['pnp', '2p'] },
    { id: 'othello', name: 'Othello', desc: 'Outflank and flip your opponent\'s discs!', route: 'othello', modes: ['pnp', '2p'] },
    { id: 'checkers', name: 'Checkers', desc: 'Jump and capture your way to victory!', route: 'checkers', modes: ['pnp', '2p'] },
];
```

Current Sidebar.jsx maps:
```javascript
const gameRouteMap = { tictactoe: 'tic-tac-toe', connect4: 'connect4', othello: 'othello', checkers: 'checkers' };
const gameNameMap = { tictactoe: 'Tic Tac Toe', connect4: 'Connect 4', othello: 'Othello', checkers: 'Checkers' };
```

Current server.js imports:
```javascript
const { makeTicTacToeMove, makeConnect4Move, makeOthelloMove } = require('./utils/gameLogic');
const { getInitialCheckersBoard, makeCheckersMove } = require('./utils/checkersLogic');
```

## New Games to Add

### 1. Gomoku (id: 'gomoku', route: 'gomoku')
- Board: Array(225).fill(null) — 15×15 grid
- Server logic: `const { makeGomokuMove } = require('./utils/gomokuLogic');`
- Client logic: `import { makeGomokuMove } from '../utils/gomokuLogic';`
- Client board: `import GomokuBoard from '../components/GomokuBoard';`
- Uses standard X/O turns, standard handleCellClick pattern (same as tictactoe)
- Board component: `<GomokuBoard board={board} onCellClick={handleCellClick} winningLine={result?.line} turn={turn} />`
- Scoreboard: default X/O score display
- Game title: 'Gomoku'

### 2. Mancala (id: 'mancala', route: 'mancala')
- Board: getInitialMancalaBoard() → [4,4,4,4,4,4,0,4,4,4,4,4,4,0]
- Server logic: `const { getInitialMancalaBoard, makeMancalaMove } = require('./utils/mancalaLogic');`
- Client logic: `import { getInitialMancalaBoard, makeMancalaMove } from '../utils/mancalaLogic';`
- Client board: `import MancalaBoard from '../components/MancalaBoard';`
- Uses X/O turns. Returns nextTurn (may be same player for extra turn).
- Local play: call makeMancalaMove(board, index, turn), use returned nextTurn
- Board component: `<MancalaBoard board={board} onCellClick={handleCellClick} turn={turn} myRole={myRole} isLocal={isLocal} />`
- Scoreboard: `Player X: ${board[6]} | Player O: ${board[13]}` (store counts)
- Game title: 'Mancala'

### 3. Dots & Boxes (id: 'dotsboxes', route: 'dots-and-boxes')
- Board: Array(33).fill(null)
- Server logic: `const { getInitialDotsBoxesBoard, makeDotsBoxesMove } = require('./utils/dotsboxesLogic');`
- Client logic: `import { getInitialDotsBoxesBoard, makeDotsBoxesMove } from '../utils/dotsboxesLogic';`
- Client board: `import DotsBoxesBoard from '../components/DotsBoxesBoard';`
- Uses X/O turns. Returns nextTurn (same player if box completed).
- Local play: call makeDotsBoxesMove(board, index, turn), use returned nextTurn
- Board component: `<DotsBoxesBoard board={board} onCellClick={handleCellClick} turn={turn} />`
- Scoreboard: `X: ${board.slice(24).filter(c => c === 'X').length} boxes | O: ${board.slice(24).filter(c => c === 'O').length} boxes`
- Game title: 'Dots & Boxes'

### 4. Nim (id: 'nim', route: 'nim')
- Board: getInitialNimBoard() → Array(15).fill('stone')
- Server logic: `const { getInitialNimBoard, makeNimMove } = require('./utils/nimLogic');`
- Client logic: `import { getInitialNimBoard, makeNimMove } from '../utils/nimLogic';`
- Client board: `import NimBoard from '../components/NimBoard';`
- Uses X/O turns.
- Local play: call makeNimMove(board, index, turn), standard result handling
- Board component: `<NimBoard board={board} onCellClick={handleCellClick} turn={turn} />`
- Scoreboard: `Stones left: ${board.filter(s => s === 'stone').length}`
- Game title: 'Nim'

## Detailed Changes Per File

### client/src/pages/Games.jsx
Add 4 entries to GAMES array (after checkers):
```javascript
{ id: 'gomoku', name: 'Gomoku', desc: 'Get five in a row on a 15×15 board!', route: 'gomoku', modes: ['pnp', '2p'] },
{ id: 'mancala', name: 'Mancala', desc: 'Capture stones and fill your store!', route: 'mancala', modes: ['pnp', '2p'] },
{ id: 'dotsboxes', name: 'Dots & Boxes', desc: 'Draw lines and claim boxes!', route: 'dots-and-boxes', modes: ['pnp', '2p'] },
{ id: 'nim', name: 'Nim', desc: 'Remove stones — but don\'t take the last one!', route: 'nim', modes: ['pnp', '2p'] },
```

### client/src/components/Sidebar.jsx
Add to maps:
```javascript
const gameRouteMap = { tictactoe: 'tic-tac-toe', connect4: 'connect4', othello: 'othello', checkers: 'checkers', gomoku: 'gomoku', mancala: 'mancala', dotsboxes: 'dots-and-boxes', nim: 'nim' };
const gameNameMap = { tictactoe: 'Tic Tac Toe', connect4: 'Connect 4', othello: 'Othello', checkers: 'Checkers', gomoku: 'Gomoku', mancala: 'Mancala', dotsboxes: 'Dots & Boxes', nim: 'Nim' };
```

### client/src/pages/Game.jsx
1. Add imports at top:
```javascript
import GomokuBoard from '../components/GomokuBoard';
import MancalaBoard from '../components/MancalaBoard';
import DotsBoxesBoard from '../components/DotsBoxesBoard';
import NimBoard from '../components/NimBoard';
import { makeGomokuMove } from '../utils/gomokuLogic';
import { getInitialMancalaBoard, makeMancalaMove } from '../utils/mancalaLogic';
import { makeDotsBoxesMove } from '../utils/dotsboxesLogic';
import { getInitialNimBoard, makeNimMove } from '../utils/nimLogic';
```

2. In getInitialBoard function, add cases:
```javascript
if (gType === 'gomoku') return Array(225).fill(null);
if (gType === 'mancala') return getInitialMancalaBoard();
if (gType === 'dotsboxes') return Array(33).fill(null);
if (gType === 'nim') return getInitialNimBoard();
```

3. In handleCellClick local mode, add else-if branches for each game:
```javascript
} else if (gameType === 'gomoku') {
    if (board[index]) return;
    const newBoard = [...board];
    newBoard[index] = turn;
    setBoard(newBoard);
    // Use local winner check from gomokuLogic
    const moveResult = makeGomokuMove(board, index, turn);
    if (!moveResult.valid) return;
    setBoard(moveResult.board);
    if (moveResult.result) {
        setResult(moveResult.result);
        if (moveResult.result.winner === 'draw') setGameMessage("It's a draw!");
        else setGameMessage(`Player ${moveResult.result.winner} wins!`);
    } else {
        setTurn(turn === "X" ? "O" : "X");
    }
} else if (gameType === 'mancala') {
    const moveResult = makeMancalaMove(board, index, turn);
    if (!moveResult.valid) return;
    setBoard(moveResult.board);
    if (moveResult.result) {
        setResult(moveResult.result);
        if (moveResult.result.winner === 'draw') setGameMessage("It's a draw!");
        else setGameMessage(`Player ${moveResult.result.winner} wins!`);
    } else {
        setTurn(moveResult.nextTurn);
    }
} else if (gameType === 'dotsboxes') {
    const moveResult = makeDotsBoxesMove(board, index, turn);
    if (!moveResult.valid) return;
    setBoard(moveResult.board);
    if (moveResult.result) {
        setResult(moveResult.result);
        if (moveResult.result.winner === 'draw') setGameMessage("It's a draw!");
        else setGameMessage(`Player ${moveResult.result.winner} wins!`);
    } else {
        setTurn(moveResult.nextTurn);
    }
} else if (gameType === 'nim') {
    const moveResult = makeNimMove(board, index, turn);
    if (!moveResult.valid) return;
    setBoard(moveResult.board);
    if (moveResult.result) {
        setResult(moveResult.result);
        setGameMessage(`Player ${moveResult.result.winner} wins!`);
    } else {
        setTurn(moveResult.nextTurn);
    }
}
```

4. In board rendering JSX (around line 463-471), add conditions:
```jsx
gameType === 'gomoku' ? (
    <GomokuBoard board={board} onCellClick={handleCellClick} winningLine={result?.line} turn={turn} />
) : gameType === 'mancala' ? (
    <MancalaBoard board={board} onCellClick={handleCellClick} turn={turn} myRole={myRole} isLocal={isLocal} />
) : gameType === 'dotsboxes' ? (
    <DotsBoxesBoard board={board} onCellClick={handleCellClick} turn={turn} />
) : gameType === 'nim' ? (
    <NimBoard board={board} onCellClick={handleCellClick} turn={turn} />
) :
```

5. In game title h2 (around line 427), add names:
```javascript
gameType === 'gomoku' ? 'Gomoku' : gameType === 'mancala' ? 'Mancala' : gameType === 'dotsboxes' ? 'Dots & Boxes' : gameType === 'nim' ? 'Nim' :
```

6. In scoreboard (around line 446), add game-specific displays:
```jsx
gameType === 'mancala' ? (
    `Player X: ${board[6]} | Player O: ${board[13]}`
) : gameType === 'dotsboxes' ? (
    `X: ${board.slice(24).filter(c => c === 'X').length} boxes | O: ${board.slice(24).filter(c => c === 'O').length} boxes`
) : gameType === 'nim' ? (
    `Stones left: ${board.filter(s => s === 'stone').length}`
) :
```

### server/server.js
1. Add imports at top:
```javascript
const { makeGomokuMove } = require('./utils/gomokuLogic');
const { getInitialMancalaBoard, makeMancalaMove } = require('./utils/mancalaLogic');
const { getInitialDotsBoxesBoard, makeDotsBoxesMove } = require('./utils/dotsboxesLogic');
const { getInitialNimBoard, makeNimMove } = require('./utils/nimLogic');
```

2. In createRoom handler, update boardSize calculation and board initialization:
```javascript
// Add to the boardSize/board logic around line 172-184:
const getBoardForGameType = (gameType) => {
    switch(gameType) {
        case 'connect4': return Array(42).fill(null);
        case 'othello': {
            const b = Array(64).fill(null);
            b[27] = 'O'; b[28] = 'X'; b[35] = 'X'; b[36] = 'O';
            return b;
        }
        case 'checkers': return getInitialCheckersBoard();
        case 'gomoku': return Array(225).fill(null);
        case 'mancala': return getInitialMancalaBoard();
        case 'dotsboxes': return Array(33).fill(null);
        case 'nim': return getInitialNimBoard();
        default: return Array(9).fill(null); // tictactoe
    }
};
```
Use this helper in createRoom, restartGame, and rematch.

3. In makeMove handler (around line 250-260), add game branches:
```javascript
} else if (room.gameType === 'gomoku') {
    moveResult = makeGomokuMove(room.board, index, player);
} else if (room.gameType === 'mancala') {
    moveResult = makeMancalaMove(room.board, index, player);
} else if (room.gameType === 'dotsboxes') {
    moveResult = makeDotsBoxesMove(room.board, index, player);
} else if (room.gameType === 'nim') {
    moveResult = makeNimMove(room.board, index, player);
}
```

4. In the turn-switching after a valid move, handle nextTurn for mancala and dotsboxes:
For mancala and dotsboxes, the nextTurn from the move function should be used (may be same player for extra turns). The existing pattern handles this:
```javascript
room.turn = moveResult.nextTurn || (player === "X" ? "O" : "X");
```
This already works since all new games return nextTurn.

5. In restartGame and rematch handlers, use the same getBoardForGameType helper for board reset.

## Files You Own (DO NOT touch anything else)
- server/server.js
- client/src/pages/Game.jsx
- client/src/pages/Games.jsx
- client/src/components/Sidebar.jsx

## Acceptance Criteria
1. All 4 new games appear in Games.jsx GAMES array with 'pnp' and '2p' modes
2. Sidebar.jsx maps include all 4 new games
3. Game.jsx imports all new board components and logic, renders correct board per game type
4. Game.jsx getInitialBoard returns correct initial board for each new game
5. Game.jsx handleCellClick has local play logic for each new game
6. Game.jsx scoreboard shows appropriate info for each game
7. Game.jsx title shows correct name for each game
8. server.js imports all new game logic modules
9. server.js createRoom initializes correct board for each game type
10. server.js makeMove calls correct game logic for each game type
11. server.js restartGame and rematch reset boards correctly for each game type
12. All files committed

## PROGRESS.md
Maintain a PROGRESS.md file in your working directory. Update it each iteration.

## When Done
When ALL acceptance criteria are met, output:
<promise>TASK_task-integration_COMPLETE</promise>
