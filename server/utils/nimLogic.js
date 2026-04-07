// Nim Game Logic (Misere variant)
// Board: Array(15) — 3 rows: Row 0 (3 stones), Row 1 (5 stones), Row 2 (7 stones)
// Cell values: 'stone' (present) or null (removed)

const ROW_BOUNDARIES = [
    { start: 0, end: 3 },   // Row 0: indices 0, 1, 2
    { start: 3, end: 8 },   // Row 1: indices 3, 4, 5, 6, 7
    { start: 8, end: 15 },  // Row 2: indices 8, 9, 10, 11, 12, 13, 14
];

const getRowForIndex = (index) => {
    for (let r = 0; r < ROW_BOUNDARIES.length; r++) {
        if (index >= ROW_BOUNDARIES[r].start && index < ROW_BOUNDARIES[r].end) {
            return r;
        }
    }
    return -1;
};

const getInitialNimBoard = () => {
    return Array(15).fill('stone');
};

const checkNimWinner = (board) => {
    // Winner is determined in makeNimMove context (misere: last stone taker loses)
    return null;
};

const makeNimMove = (board, index, turn) => {
    // Validate index
    if (index < 0 || index >= 15) return { valid: false };

    // Must click on an existing stone
    if (board[index] !== 'stone') return { valid: false };

    const row = getRowForIndex(index);
    if (row === -1) return { valid: false };

    const { end } = ROW_BOUNDARIES[row];

    // Remove clicked stone and all stones to its right in the same row
    const newBoard = [...board];
    for (let i = index; i < end; i++) {
        newBoard[i] = null;
    }

    // Check if all stones are removed — current player took the last stone and loses (misere)
    const allRemoved = newBoard.every((cell) => cell === null);
    const opponent = turn === 'X' ? 'O' : 'X';
    const result = allRemoved ? { winner: opponent, line: null } : null;
    const nextTurn = allRemoved ? null : opponent;

    return { valid: true, board: newBoard, result, nextTurn };
};

module.exports = { getInitialNimBoard, makeNimMove, checkNimWinner };
