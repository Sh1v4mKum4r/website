export const GOMOKU_SIZE = 15;
export const GOMOKU_CELLS = GOMOKU_SIZE * GOMOKU_SIZE; // 225
const GOMOKU_DIRS = [
    [0, 1],   // Horizontal
    [1, 0],   // Vertical
    [1, 1],   // Diagonal down-right
    [1, -1]   // Diagonal down-left
];

export const checkGomokuWinner = (board) => {
    for (let r = 0; r < GOMOKU_SIZE; r++) {
        for (let c = 0; c < GOMOKU_SIZE; c++) {
            const idx = r * GOMOKU_SIZE + c;
            const cell = board[idx];
            if (!cell) continue;

            for (const [dr, dc] of GOMOKU_DIRS) {
                const endR = r + dr * 4;
                const endC = c + dc * 4;

                // Check bounds for the last cell in the sequence
                if (endR < 0 || endR >= GOMOKU_SIZE) continue;
                if (endC < 0 || endC >= GOMOKU_SIZE) continue;

                let line = [idx];
                let matched = true;

                for (let step = 1; step <= 4; step++) {
                    const nr = r + dr * step;
                    const nc = c + dc * step;
                    const ni = nr * GOMOKU_SIZE + nc;
                    if (board[ni] !== cell) {
                        matched = false;
                        break;
                    }
                    line.push(ni);
                }

                if (matched) {
                    return { winner: cell, line };
                }
            }
        }
    }

    if (!board.includes(null)) return { winner: 'draw', line: null };
    return null;
};

export const makeGomokuMove = (board, index, turn) => {
    if (index < 0 || index >= GOMOKU_CELLS) return { valid: false };
    if (board[index] !== null) return { valid: false };

    const newBoard = [...board];
    newBoard[index] = turn;
    const result = checkGomokuWinner(newBoard);
    return { valid: true, board: newBoard, result };
};
