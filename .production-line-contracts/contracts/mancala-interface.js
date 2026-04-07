// Mancala — Interface Contract
// Board: Array(14) — indices 0-5: Player X pits, 6: Player X store,
//                      indices 7-12: Player O pits, 13: Player O store
// Initial: 4 stones per pit (indices 0-5, 7-12), 0 in stores (6, 13)
// Players: X (pits 0-5, store 6), O (pits 7-12, store 13)

// Server (CommonJS): server/utils/mancalaLogic.js
// module.exports = { getInitialMancalaBoard, makeMancalaMove, checkMancalaWinner }

// Client (ES module): client/src/utils/mancalaLogic.js
// export { getInitialMancalaBoard, makeMancalaMove, checkMancalaWinner }

// getInitialMancalaBoard()
//   - Returns: [4,4,4,4,4,4, 0, 4,4,4,4,4,4, 0]

// makeMancalaMove(board, pitIndex, turn)
//   - board: Array(14), pitIndex: 0-5 if turn='X', 7-12 if turn='O'
//   - Returns: { valid: false } if pit empty or not player's pit
//   - Returns: { valid: true, board: newBoard, result: null|{winner,line:null}, nextTurn: 'X'|'O' }
//   - Rules:
//     1. Pick up all stones from selected pit
//     2. Distribute one stone per pit counterclockwise, SKIPPING opponent's store
//     3. If last stone lands in own store: nextTurn = same player (extra turn)
//     4. If last stone lands in empty own pit AND opposite pit has stones: capture both into own store
//     5. Game ends when one side's pits are all empty. Remaining stones go to that side's store.
//   - nextTurn: 'X' or 'O' (same player if landed in own store)

// checkMancalaWinner(board)
//   - Returns: { winner, line: null } or null
//   - Checks if either side's pits are all empty
//   - Winner is player with more stones in store (or 'draw')

