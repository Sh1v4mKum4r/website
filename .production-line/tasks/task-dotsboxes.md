## Your Role
You are implementing the Dots and Boxes game for a React + Express multiplayer gaming platform.

## Project Conventions
- camelCase for functions/variables, PascalCase for components
- Server: CommonJS, Client: ES modules
- Move functions: return { valid, board, result, nextTurn }
- result: { winner, line: null } or null
- CSS: theme variables, responsive, CSS Grid

## Style Examples
```javascript
const makeConnect4Move = (board, colIndex, turn) => {
    if (colIndex < 0 || colIndex >= COLS) return { valid: false };
    // ... find position, place piece, check winner
    return { valid: true, board: newBoard, result };
};
```

## Your Specific Task
Implement Dots and Boxes — a game where players draw lines between dots to complete boxes.

### Board Representation
Array(33) for a 4×4 dot grid (3×3 boxes):
- Indices 0-11: horizontal edges (4 rows × 3 per row)
  - Edge between dots at row r, cols c and c+1: index = r * 3 + c (r=0..3, c=0..2)
- Indices 12-23: vertical edges (3 rows × 4 per row)
  - Edge between dots at rows r and r+1, col c: index = 12 + r * 4 + c (r=0..2, c=0..3)
- Indices 24-32: boxes (3×3 grid)
  - Box at row r, col c: index = 24 + r * 3 + c (r=0..2, c=0..2)
- All cells start as null. Edges become 'X' or 'O' when claimed. Boxes become 'X' or 'O' when completed.

### Box Edge Mapping
Box at (r, c) has these 4 edges:
- Top: r * 3 + c
- Bottom: (r+1) * 3 + c
- Left: 12 + r * 4 + c
- Right: 12 + r * 4 + (c + 1)

### Game Rules
1. Player clicks on an unclaimed edge (index 0-23)
2. Edge is marked with player's mark
3. Check if placing this edge completed any adjacent box(es):
   - Each edge borders at most 2 boxes. Check both.
   - If a box now has all 4 edges filled, mark the box with the current player's mark
4. If ANY box was completed: player gets ANOTHER TURN (nextTurn = current player)
5. If no box completed: nextTurn = opponent
6. Game over when all 24 edges are filled
7. Winner: player who completed more boxes. Draw if tied.

### Files to Create

1. **server/utils/dotsboxesLogic.js** (CommonJS)
   - `getInitialDotsBoxesBoard()` → Array(33).fill(null)
   - `makeDotsBoxesMove(board, edgeIndex, turn)` — validate, place edge, check box completion, determine if extra turn
   - `checkDotsBoxesWinner(board)` — count boxes per player, determine winner if all boxes filled
   - `module.exports = { getInitialDotsBoxesBoard, makeDotsBoxesMove, checkDotsBoxesWinner }`

2. **client/src/utils/dotsboxesLogic.js** (ES module)
   - Same logic with ES exports

3. **client/src/components/DotsBoxesBoard.jsx**
   - Render a 4×4 grid of dots with edges between them
   - Dots: small circles at grid intersections
   - Horizontal edges: clickable horizontal bars between horizontally adjacent dots
   - Vertical edges: clickable vertical bars between vertically adjacent dots
   - Claimed edges show the player's color (e.g., blue for X, red for O)
   - Completed boxes show a colored fill
   - Props: `{ board, onCellClick, turn }` — onCellClick receives the edge index (0-23)
   - Unclaimed edges highlight on hover

4. **client/src/components/DotsBoxesBoard.css**
   - CSS Grid or absolute positioning for dots/edges/boxes
   - Dot styling (small circles)
   - Edge styling (horizontal and vertical bars)
   - Box fill colors
   - Hover effects on unclaimed edges
   - Theme variables, responsive

## Files You Own (DO NOT touch anything else)
- server/utils/dotsboxesLogic.js
- client/src/utils/dotsboxesLogic.js
- client/src/components/DotsBoxesBoard.jsx
- client/src/components/DotsBoxesBoard.css

## Acceptance Criteria
1. server/utils/dotsboxesLogic.js exports getInitialDotsBoxesBoard, makeDotsBoxesMove, checkDotsBoxesWinner as CommonJS
2. client/src/utils/dotsboxesLogic.js exports same as ES modules
3. DotsBoxesBoard.jsx renders 4x4 dots with clickable edges and colored completed boxes
4. Edge claiming works correctly (only unclaimed edges, index 0-23)
5. Box completion detection works (checks all adjacent boxes when edge placed)
6. Extra turn granted when box completed
7. Game over and winner detection work when all edges filled
8. All files committed

## PROGRESS.md
Maintain a PROGRESS.md file in your working directory. Update it each iteration.

## When Done
When ALL acceptance criteria are met, output:
<promise>TASK_task-dotsboxes_COMPLETE</promise>

