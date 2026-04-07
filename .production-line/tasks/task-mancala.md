## Your Role
You are implementing the Mancala game for a React + Express multiplayer gaming platform.

## Project Conventions
- camelCase for functions/variables, PascalCase for components
- Server files use CommonJS (module.exports), client files use ES modules (export)
- Game logic modules export: make{Game}Move(board, index, turn) → { valid, board, result, nextTurn }
- Board state is a flat array. Move functions return { valid: false } for invalid, { valid: true, board, result, nextTurn } for valid.
- result is { winner, line: null } or null. nextTurn is 'X' or 'O'.
- CSS follows existing patterns: theme variables, responsive design.

## Style Examples (from this project)
```javascript
// Othello move pattern (closest to Mancala — complex board transformation):
const makeOthelloMove = (board, index, turn) => {
    const flips = getOthelloFlips(board, index, turn);
    if (flips.length === 0) return { valid: false };
    const newBoard = [...board];
    newBoard[index] = turn;
    for (const flipIdx of flips) { newBoard[flipIdx] = turn; }
    let nextTurn = turn === 'X' ? 'O' : 'X';
    let result = checkOthelloWinner(newBoard);
    if (!result && !checkHasValidOthelloMoves(newBoard, nextTurn)) { nextTurn = turn; }
    return { valid: true, board: newBoard, result, nextTurn };
};
```

## Your Specific Task
Implement Mancala — a classic pit-and-stones game for 2 players.

### Board Representation
Array(14):
- Indices 0-5: Player X's pits (left to right from X's perspective)
- Index 6: Player X's store (mancala)
- Indices 7-12: Player O's pits (left to right from O's perspective)
- Index 13: Player O's store (mancala)
- Initial state: 4 stones in each pit, 0 in stores → [4,4,4,4,4,4, 0, 4,4,4,4,4,4, 0]

### Game Rules
1. **Sowing**: Player picks up all stones from one of their pits. Moving counterclockwise (increasing index, wrapping from 13→0), drop one stone per pit, SKIPPING the opponent's store.
   - Player X skips index 13 (O's store)
   - Player O skips index 6 (X's store)
2. **Extra turn**: If the last stone lands in the player's own store, they get another turn.
3. **Capture**: If the last stone lands in an empty pit ON THE PLAYER'S SIDE, and the opposite pit has stones, capture all stones from both pits into the player's store.
   - Opposite pits: pit i ↔ pit (12 - i) for i in 0-5 and 7-12
4. **Game over**: When ALL pits on one side are empty. Remaining stones on the other side go to that side's store. Player with more stones in their store wins.

### Files to Create

1. **server/utils/mancalaLogic.js** (CommonJS)
   - `getInitialMancalaBoard()` → [4,4,4,4,4,4, 0, 4,4,4,4,4,4, 0]
   - `makeMancalaMove(board, pitIndex, turn)` — validate (must be own pit, must have stones), sow, capture, check game over
   - `checkMancalaWinner(board)` — check if either side empty, tally stores, return winner
   - `module.exports = { getInitialMancalaBoard, makeMancalaMove, checkMancalaWinner }`

2. **client/src/utils/mancalaLogic.js** (ES module)
   - Same logic with ES module exports

3. **client/src/components/MancalaBoard.jsx**
   - Visual layout: Player O's pits on top row (right to left: indices 12,11,10,9,8,7), Player X's pits on bottom row (left to right: indices 0,1,2,3,4,5). Stores on sides (X's store index 6 on right, O's store index 13 on left).
   - Each pit shows stone count number
   - Clickable pits highlight on hover (only current player's pits)
   - Props: `{ board, onCellClick, turn, myRole, isLocal }`
   - Only allow clicking on current player's pits

4. **client/src/components/MancalaBoard.css**
   - Mancala-specific layout: horizontal board with stores on ends
   - Pit styling (oval/circular, show stone count)
   - Store styling (larger, elongated)
   - Stone count display
   - Hover effects on clickable pits
   - Use theme variables from existing CSS
   - Responsive design

## Files You Own (DO NOT touch anything else)
- server/utils/mancalaLogic.js
- client/src/utils/mancalaLogic.js
- client/src/components/MancalaBoard.jsx
- client/src/components/MancalaBoard.css

## Acceptance Criteria
1. server/utils/mancalaLogic.js exports getInitialMancalaBoard, makeMancalaMove, checkMancalaWinner as CommonJS
2. client/src/utils/mancalaLogic.js exports same as ES modules
3. MancalaBoard.jsx renders the board with correct pit layout, stone counts, and stores
4. Stone sowing correctly skips opponent's store
5. Extra turn works when last stone lands in own store
6. Capture works when last stone lands in empty own pit with stones opposite
7. Game over detection works (one side empty → remaining stones collected)
8. All files committed

## PROGRESS.md
Maintain a PROGRESS.md file in your working directory. Update it each iteration.

## When Done
When ALL acceptance criteria are met, output:
<promise>TASK_task-mancala_COMPLETE</promise>

