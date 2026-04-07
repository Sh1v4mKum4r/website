// Nim — Interface Contract
// Board: Array(15) — 3 rows: row0=[0..2](3 stones), row1=[3..7](5 stones), row2=[8..14](7 stones)
// Cells: 'stone' (present) or null (removed)
// Players: X goes first, O second
// Misère variant: player who takes the LAST stone LOSES

// Server (CommonJS): server/utils/nimLogic.js
// module.exports = { getInitialNimBoard, makeNimMove, checkNimWinner }

// Client (ES module): client/src/utils/nimLogic.js
// export { getInitialNimBoard, makeNimMove, checkNimWinner }

// getInitialNimBoard()
//   - Returns: Array(15).fill('stone')

// makeNimMove(board, index, turn)
//   - board: Array(15), index: 0-14, turn: 'X'|'O'
//   - Player clicks a stone. ALL stones at that index and to its right in the same row are removed.
//   - Row boundaries: row0=[0,3), row1=[3,8), row2=[8,15)
//   - Returns: { valid: false } if stone at index is null
//   - Returns: { valid: true, board: newBoard, result: null|{winner,line:null}, nextTurn: 'X'|'O' }
//   - After removal, if ALL 15 stones gone: current player LOSES (misère)
//     result = { winner: opponent, line: null }
//   - nextTurn = opponent

// checkNimWinner(board)
//   - If all stones null: the player who just moved loses (caller must know who)
//   - Returns null (not used independently — winner determined in makeNimMove)

