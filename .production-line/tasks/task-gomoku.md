## Your Role
You are implementing the Gomoku (Five in a Row) game for a React + Express multiplayer gaming platform.

## Project Conventions
- camelCase for functions/variables, PascalCase for components
- Server files use CommonJS (module.exports), client files use ES modules (export)
- Game logic modules export: make{Game}Move(board, index, turn) → { valid, board, result, nextTurn? }
- Board state is a flat array. null = empty cell.
- Move functions return { valid: false } for invalid moves, { valid: true, board, result } for valid moves
- result is { winner: 'X'|'O'|'draw', line: array|null } or null if game continues
- Board components receive: board, onCellClick, turn, and optionally winningLine
- CSS follows existing patterns: CSS Grid for boards, theme variables (var(--accent), var(--bg-secondary), etc.)

## Style Examples (from this project)

Server game logic (see server/utils/gameLogic.js for TicTacToe pattern):
```javascript
const makeTicTacToeMove = (board, index, turn) => {
    if (board[index] !== null) return { valid: false };
    const newBoard = [...board];
    newBoard[index] = turn;
    const result = checkTicTacToeWinner(newBoard);
    return { valid: true, board: newBoard, result };
};
```

Client board component (see client/src/components/Board.jsx):
```jsx
function Board({ board, onCellClick, winningLine }) {
  return (
    <div className="board">
      {board.map((value, index) => (
        <Cell key={index} value={value} onClick={() => onCellClick(index)} isWinning={winningLine?.includes(index)} />
      ))}
    </div>
  );
}
```

## Your Specific Task
Implement Gomoku (Five in a Row) — a game played on a 15x15 grid where players alternate placing X and O. The first player to get exactly 5 in a row (horizontally, vertically, or diagonally) wins. If the board fills up with no winner, it's a draw.

### Board Representation
- Flat array of 225 elements (15 rows × 15 columns)
- Index = row * 15 + col
- null = empty, 'X' = player X's stone, 'O' = player O's stone

### Win Detection
Check all horizontal, vertical, and both diagonal directions for exactly 5 consecutive same-color stones. Return the 5 winning indices as the `line` array.

### Files to Create

1. **server/utils/gomokuLogic.js** (CommonJS)
   - `checkGomokuWinner(board)` — scan entire board for 5-in-a-row. Return { winner, line } or null.
   - `makeGomokuMove(board, index, turn)` — validate move, place stone, check winner.
   - `module.exports = { makeGomokuMove, checkGomokuWinner }`

2. **client/src/utils/gomokuLogic.js** (ES module)
   - Same logic as server, but using `export` instead of `module.exports`.

3. **client/src/components/GomokuBoard.jsx**
   - Render a 15x15 CSS Grid
   - Each cell shows X (dark stone) or O (light stone) or empty
   - Highlight winning line cells
   - Props: `{ board, onCellClick, winningLine, turn }`
   - Import and use GomokuBoard.css

4. **client/src/components/GomokuBoard.css**
   - 15x15 CSS Grid layout
   - Cell size appropriate for the board (small cells, ~28-32px)
   - Stone styles (circular, colored)
   - Hover effect on empty cells showing current player's color (semi-transparent)
   - Winning cell highlight (glow/pulse animation)
   - Read existing board CSS files (Board.css, OthelloBoard.css) for style conventions:
     use var(--bg-secondary), var(--border-color), var(--accent) etc.
   - Make it responsive (smaller cells on mobile)

## Files You Own (DO NOT touch anything else)
- server/utils/gomokuLogic.js
- client/src/utils/gomokuLogic.js
- client/src/components/GomokuBoard.jsx
- client/src/components/GomokuBoard.css

## Acceptance Criteria
1. server/utils/gomokuLogic.js exports makeGomokuMove and checkGomokuWinner as CommonJS
2. client/src/utils/gomokuLogic.js exports same functions as ES modules
3. GomokuBoard.jsx renders a 15x15 clickable grid with X/O stones and winning line highlight
4. GomokuBoard.css styles the board responsively with theme-consistent colors
5. makeGomokuMove: returns { valid: false } for occupied cells; returns { valid: true, board, result } for valid moves
6. checkGomokuWinner: correctly detects horizontal, vertical, and diagonal 5-in-a-row; detects draws
7. All files committed with descriptive messages

## PROGRESS.md
Maintain a PROGRESS.md file in your working directory. Update it each iteration.

## When Done
When ALL acceptance criteria are met, output:
<promise>TASK_task-gomoku_COMPLETE</promise>

