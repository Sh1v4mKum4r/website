// Dots and Boxes — Interface Contract
// Board: Array(33) — 4x4 dot grid (3x3 boxes)
//   indices 0-11: horizontal edges (4 rows x 3 edges)
//     edge at dot-row r, between dot-cols c and c+1: index = r * 3 + c
//   indices 12-23: vertical edges (3 rows x 4 edges)
//     edge between dot-rows r and r+1, at dot-col c: index = 12 + r * 4 + c
//   indices 24-32: boxes (3x3)
//     box at (r, c): index = 24 + r * 3 + c
// Cells: null (unclaimed) or 'X'/'O' (who placed edge / completed box)
// Players: X goes first

// Server (CommonJS): server/utils/dotsboxesLogic.js
// module.exports = { getInitialDotsBoxesBoard, makeDotsBoxesMove, checkDotsBoxesWinner }

// Client (ES module): client/src/utils/dotsboxesLogic.js
// export { getInitialDotsBoxesBoard, makeDotsBoxesMove, checkDotsBoxesWinner }

// getInitialDotsBoxesBoard()
//   - Returns: Array(33).fill(null)

// makeDotsBoxesMove(board, edgeIndex, turn)
//   - board: Array(33), edgeIndex: 0-23, turn: 'X'|'O'
//   - Returns: { valid: false } if edge already claimed or index out of range
//   - Returns: { valid: true, board: newBoard, result: null|{winner,line:null}, nextTurn: 'X'|'O' }
//   - After placing edge, check if any adjacent box(es) are now complete (all 4 edges filled)
//   - If box completed: mark box with turn's mark, player gets ANOTHER TURN (nextTurn = turn)
//   - If no box completed: nextTurn = opponent
//   - Game over when all 24 edges are filled

// Box (r,c) edges: top=r*3+c, bottom=(r+1)*3+c, left=12+r*4+c, right=12+r*4+(c+1)

// checkDotsBoxesWinner(board)
//   - Count boxes owned by X and O (indices 24-32)
//   - If all 9 boxes filled: winner is player with more boxes (or 'draw')
//   - Returns: { winner, line: null } or null

