// Gomoku (Five in a Row) — Interface Contract
// Board: Array(225).fill(null) — 15x15 grid
// Cells: null (empty), 'X', or 'O'
// Players: X goes first, then O alternates

// Server (CommonJS): server/utils/gomokuLogic.js
// module.exports = { makeGomokuMove, checkGomokuWinner }

// Client (ES module): client/src/utils/gomokuLogic.js
// export { makeGomokuMove, checkGomokuWinner }

// makeGomokuMove(board, index, turn)
//   - board: Array(225), index: 0-224, turn: 'X'|'O'
//   - Returns: { valid: false } if cell occupied or out of bounds
//   - Returns: { valid: true, board: newBoard, result: null|{winner,line} }
//   - result.winner: 'X', 'O', or 'draw'
//   - result.line: array of 5 winning indices, or null for draw

// checkGomokuWinner(board)
//   - Returns: { winner, line } or null
//   - Checks horizontal, vertical, both diagonals for 5 in a row

