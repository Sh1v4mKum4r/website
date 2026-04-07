
const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

const getInitialUTTTState = () => ({
    board: Array(81).fill(null),
    activeBoard: null,
    subBoardWinners: Array(9).fill(null)
});

const checkSubBoardWinner = (board, subBoardIndex) => {
    const offset = subBoardIndex * 9;
    for (const [a, b, c] of WIN_LINES) {
        if (board[offset + a] && board[offset + a] === board[offset + b] && board[offset + a] === board[offset + c]) {
            return board[offset + a];
        }
    }
    // Check for draw: all 9 cells filled
    let filled = 0;
    for (let i = 0; i < 9; i++) {
        if (board[offset + i] !== null) filled++;
    }
    if (filled === 9) return 'draw';
    return null;
};

const checkUTTTWinner = (subBoardWinners) => {
    for (const [a, b, c] of WIN_LINES) {
        if (subBoardWinners[a] && subBoardWinners[a] !== 'draw' &&
            subBoardWinners[a] === subBoardWinners[b] && subBoardWinners[a] === subBoardWinners[c]) {
            return { winner: subBoardWinners[a], line: [a, b, c] };
        }
    }
    // Check if all sub-boards are resolved
    const allResolved = subBoardWinners.every(w => w !== null);
    if (allResolved) return { winner: 'draw', line: null };
    return null;
};

const makeUTTTMove = (state, cellIndex, turn) => {
    const { board, activeBoard, subBoardWinners } = state;

    // Validate cell index
    if (cellIndex < 0 || cellIndex >= 81) return { valid: false };

    // Determine which sub-board and cell within it
    const subBoardIndex = Math.floor(cellIndex / 9);
    const cellInSub = cellIndex % 9;

    // Sub-board must not be already won/drawn
    if (subBoardWinners[subBoardIndex] !== null) return { valid: false };

    // Must play in activeBoard if set
    if (activeBoard !== null && subBoardIndex !== activeBoard) return { valid: false };

    // Cell must be empty
    if (board[cellIndex] !== null) return { valid: false };

    // Place the piece
    const newBoard = [...board];
    newBoard[cellIndex] = turn;

    // Check if this sub-board is now won/drawn
    const newSubBoardWinners = [...subBoardWinners];
    const subResult = checkSubBoardWinner(newBoard, subBoardIndex);
    if (subResult) {
        newSubBoardWinners[subBoardIndex] = subResult;
    }

    // Determine next activeBoard: the cell position within the sub-board
    // points to the next sub-board to play in
    let nextActiveBoard = cellInSub;
    // If that target sub-board is already won/drawn, free choice
    if (newSubBoardWinners[nextActiveBoard] !== null) {
        nextActiveBoard = null;
    }

    // Check meta-game winner
    const metaResult = checkUTTTWinner(newSubBoardWinners);

    const nextTurn = turn === 'X' ? 'O' : 'X';

    return {
        valid: true,
        board: newBoard,
        activeBoard: nextActiveBoard,
        subBoardWinners: newSubBoardWinners,
        result: metaResult,
        nextTurn
    };
};

module.exports = { getInitialUTTTState, makeUTTTMove, checkUTTTWinner };
