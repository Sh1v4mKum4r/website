export const OTHELLO_SIZE = 8;
export const OTHELLO_DIRS = [
    [-1, 0], [1, 0], [0, -1], [0, 1], // Up, Down, Left, Right
    [-1, -1], [-1, 1], [1, -1], [1, 1] // Diagonals
];

export const getOthelloFlips = (board, index, turn) => {
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

export const checkHasValidOthelloMoves = (board, turn) => {
    for (let i = 0; i < 64; i++) {
        if (getOthelloFlips(board, i, turn).length > 0) {
            return true;
        }
    }
    return false;
};

export const checkOthelloWinner = (board) => {
    let countX = 0;
    let countO = 0;
    for (const cell of board) {
        if (cell === 'X') countX++;
        if (cell === 'O') countO++;
    }
    
    const hasMovesX = checkHasValidOthelloMoves(board, 'X');
    const hasMovesO = checkHasValidOthelloMoves(board, 'O');
    
    if (countX + countO === 64 || (!hasMovesX && !hasMovesO)) {
        if (countX > countO) return { winner: 'X', line: null };
        if (countO > countX) return { winner: 'O', line: null };
        return { winner: 'draw', line: null };
    }
    return null;
};

export const makeOthelloMove = (board, index, turn) => {
    const flips = getOthelloFlips(board, index, turn);
    if (flips.length === 0) return { valid: false };

    const newBoard = [...board];
    newBoard[index] = turn;
    for (const flipIdx of flips) {
        newBoard[flipIdx] = turn;
    }

    let nextTurn = turn === 'X' ? 'O' : 'X';
    let result = checkOthelloWinner(newBoard);
    
    if (!result && !checkHasValidOthelloMoves(newBoard, nextTurn)) {
        nextTurn = turn; // Skip turn
    }

    return { valid: true, board: newBoard, result, nextTurn };
};
