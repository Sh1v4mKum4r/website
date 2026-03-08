
const checkTicTacToeWinner = (board) => {
    const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (let w of wins) {
        const [a, b, c] = w;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], line: w };
        }
    }
    if (!board.includes(null)) return { winner: "draw", line: null };
    return null;
};

const makeTicTacToeMove = (board, index, turn) => {
    if (board[index] !== null) return { valid: false };
    const newBoard = [...board];
    newBoard[index] = turn;
    const result = checkTicTacToeWinner(newBoard);
    return { valid: true, board: newBoard, result };
};

const ROWS = 6;
const COLS = 7;

const checkConnect4Winner = (board) => {
    // Check horizontal
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            const idx = r * COLS + c;
            if (board[idx] && board[idx] === board[idx + 1] && board[idx] === board[idx + 2] && board[idx] === board[idx + 3]) {
                return { winner: board[idx], line: [idx, idx + 1, idx + 2, idx + 3] };
            }
        }
    }
    // Check vertical
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS; c++) {
            const idx = r * COLS + c;
            if (board[idx] && board[idx] === board[idx + COLS] && board[idx] === board[idx + 2 * COLS] && board[idx] === board[idx + 3 * COLS]) {
                return { winner: board[idx], line: [idx, idx + COLS, idx + 2 * COLS, idx + 3 * COLS] };
            }
        }
    }
    // Check diagonal (down-right)
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            const idx = r * COLS + c;
            if (board[idx] && board[idx] === board[idx + COLS + 1] && board[idx] === board[idx + 2 * COLS + 2] && board[idx] === board[idx + 3 * COLS + 3]) {
                return { winner: board[idx], line: [idx, idx + COLS + 1, idx + 2 * COLS + 2, idx + 3 * COLS + 3] };
            }
        }
    }
    // Check diagonal (up-right) / down-left
    for (let r = 3; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            const idx = r * COLS + c;
            if (board[idx] && board[idx] === board[idx - COLS + 1] && board[idx] === board[idx - 2 * COLS + 2] && board[idx] === board[idx - 3 * COLS + 3]) {
                return { winner: board[idx], line: [idx, idx - COLS + 1, idx - 2 * COLS + 2, idx - 3 * COLS + 3] };
            }
        }
    }

    if (!board.includes(null)) return { winner: "draw", line: null };
    return null;
};

const makeConnect4Move = (board, colIndex, turn) => {
    if (colIndex < 0 || colIndex >= COLS) return { valid: false };

    // Find lowest empty row in column
    let targetIdx = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
        const idx = r * COLS + colIndex;
        if (board[idx] === null) {
            targetIdx = idx;
            break;
        }
    }

    if (targetIdx === -1) return { valid: false }; // Column full

    const newBoard = [...board];
    newBoard[targetIdx] = turn;
    const result = checkConnect4Winner(newBoard);
    return { valid: true, board: newBoard, result };
};

const OTHELLO_SIZE = 8;
const OTHELLO_DIRS = [
    [-1, 0], [1, 0], [0, -1], [0, 1], // Up, Down, Left, Right
    [-1, -1], [-1, 1], [1, -1], [1, 1] // Diagonals
];

const getOthelloFlips = (board, index, turn) => {
    if (board[index] !== null) return [];
    
    const r = Math.floor(index / OTHELLO_SIZE);
    const c = index % OTHELLO_SIZE;
    const opponent = turn === 'X' ? 'O' : 'X';
    let flipsToMake = [];

    for (const [dr, dc] of OTHELLO_DIRS) {
        let currR = r + dr;
        let currC = c + dc;
        let potentialFlips = [];

        while (currR >= 0 && currR < OTHELLO_SIZE && currC >= 0 && currC < OTHELLO_SIZE) {
            const currIdx = currR * OTHELLO_SIZE + currC;
            if (board[currIdx] === opponent) {
                potentialFlips.push(currIdx);
                currR += dr;
                currC += dc;
            } else if (board[currIdx] === turn) {
                if (potentialFlips.length > 0) {
                    flipsToMake.push(...potentialFlips);
                }
                break;
            } else {
                break;
            }
        }
    }
    return flipsToMake;
};

const checkHasValidOthelloMoves = (board, turn) => {
    for (let i = 0; i < 64; i++) {
        if (getOthelloFlips(board, i, turn).length > 0) {
            return true;
        }
    }
    return false;
};

const checkOthelloWinner = (board) => {
    let countX = 0;
    let countO = 0;
    for (const cell of board) {
        if (cell === 'X') countX++;
        if (cell === 'O') countO++;
    }
    
    // Check if board is full or neither player has valid moves
    const hasMovesX = checkHasValidOthelloMoves(board, 'X');
    const hasMovesO = checkHasValidOthelloMoves(board, 'O');
    
    if (countX + countO === 64 || (!hasMovesX && !hasMovesO)) {
        if (countX > countO) return { winner: 'X', line: null };
        if (countO > countX) return { winner: 'O', line: null };
        return { winner: 'draw', line: null };
    }
    return null;
};

const makeOthelloMove = (board, index, turn) => {
    const flips = getOthelloFlips(board, index, turn);
    if (flips.length === 0) return { valid: false };

    const newBoard = [...board];
    newBoard[index] = turn;
    for (const flipIdx of flips) {
        newBoard[flipIdx] = turn;
    }

    // After move, does the OTHER player have a valid move? If not, player gets to go again unless game over.
    let nextTurn = turn === 'X' ? 'O' : 'X';
    let result = checkOthelloWinner(newBoard);
    
    if (!result && !checkHasValidOthelloMoves(newBoard, nextTurn)) {
        nextTurn = turn; // Skip turn
    }

    return { valid: true, board: newBoard, result, nextTurn };
};

module.exports = {
    checkTicTacToeWinner,
    makeTicTacToeMove,
    checkConnect4Winner,
    makeConnect4Move,
    makeOthelloMove,
    checkOthelloWinner
};
