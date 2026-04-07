## Your Role
You are implementing the Nim stone removal game for a React + Express multiplayer gaming platform.

## Project Conventions
- camelCase for functions/variables, PascalCase for components
- Server: CommonJS, Client: ES modules
- Move functions: return { valid, board, result, nextTurn }
- result: { winner, line: null } or null
- CSS: theme variables, responsive

## Style Examples
```javascript
const makeTicTacToeMove = (board, index, turn) => {
    if (board[index] !== null) return { valid: false };
    const newBoard = [...board];
    newBoard[index] = turn;
    const result = checkTicTacToeWinner(newBoard);
    return { valid: true, board: newBoard, result };
};
```

## Your Specific Task
Implement Nim — a mathematical strategy game where players take turns removing stones.

### Board Representation
Array(15) — 3 rows of stones:
- Row 0 (3 stones): indices 0, 1, 2
- Row 1 (5 stones): indices 3, 4, 5, 6, 7
- Row 2 (7 stones): indices 8, 9, 10, 11, 12, 13, 14
- Cell values: 'stone' (present) or null (removed)
- Initial state: Array(15).fill('stone')

### Row Boundaries
- Row 0: indices [0, 3) → 0, 1, 2
- Row 1: indices [3, 8) → 3, 4, 5, 6, 7
- Row 2: indices [8, 15) → 8, 9, 10, 11, 12, 13, 14

### Game Rules (Misère variant)
1. Player clicks on a stone at index i
2. ALL stones at index i and to its RIGHT in the same row are removed (set to null)
   - This means clicking the leftmost remaining stone in a row removes ALL remaining stones in that row
   - Clicking a stone in the middle removes it and everything to its right
3. Player must remove at least 1 stone per turn
4. The player who takes the LAST stone LOSES (misère variant)
5. After a move, if all 15 stones are null, the current player loses:
   result = { winner: opponent, line: null }

### Files to Create

1. **server/utils/nimLogic.js** (CommonJS)
   - `getInitialNimBoard()` → Array(15).fill('stone')
   - `makeNimMove(board, index, turn)` — validate (must be a stone), remove stones from index rightward in same row, check if all removed
   - `checkNimWinner(board)` — returns null (winner determined in makeNimMove context)
   - `module.exports = { getInitialNimBoard, makeNimMove, checkNimWinner }`

2. **client/src/utils/nimLogic.js** (ES module)
   - Same logic with ES exports

3. **client/src/components/NimBoard.jsx**
   - Render 3 rows of stones in a pyramid-like layout (3, 5, 7)
   - Stones are circular elements, present ones are colored, removed ones are invisible/placeholder
   - When hovering a stone, highlight it AND all stones to its right in the same row (preview what will be removed)
   - Clicking removes the highlighted stones
   - Props: `{ board, onCellClick, turn }`
   - Center each row horizontally for pyramid appearance

4. **client/src/components/NimBoard.css**
   - Pyramid layout: rows centered, each row wider than the one above
   - Stone styling (circles, ~40px, colored)
   - Removed stone placeholder (transparent/outline)
   - Hover preview effect (dim/highlight stones that will be removed)
   - Theme variables, responsive

## Files You Own (DO NOT touch anything else)
- server/utils/nimLogic.js
- client/src/utils/nimLogic.js
- client/src/components/NimBoard.jsx
- client/src/components/NimBoard.css

## Acceptance Criteria
1. server/utils/nimLogic.js exports getInitialNimBoard, makeNimMove, checkNimWinner as CommonJS
2. client/src/utils/nimLogic.js exports same as ES modules
3. NimBoard.jsx renders 3 rows of stones (3, 5, 7) in a pyramid layout with hover preview
4. makeNimMove correctly removes clicked stone and all to its right in the same row
5. Returns { valid: false } when clicking null (removed) stones
6. Misère win condition: player who takes last stone loses
7. All files committed

## PROGRESS.md
Maintain a PROGRESS.md file in your working directory. Update it each iteration.

## When Done
When ALL acceptance criteria are met, output:
<promise>TASK_task-nim_COMPLETE</promise>

