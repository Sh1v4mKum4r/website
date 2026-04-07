
export const getInitialMancalaBoard = () => {
    // Indices 0-5: Player X's pits
    // Index 6: Player X's store
    // Indices 7-12: Player O's pits
    // Index 13: Player O's store
    return [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
};

const getOppositePit = (index) => 12 - index;

export const checkMancalaWinner = (board) => {
    const xPitsEmpty = board.slice(0, 6).every(s => s === 0);
    const oPitsEmpty = board.slice(7, 13).every(s => s === 0);

    if (!xPitsEmpty && !oPitsEmpty) return null;

    // Collect remaining stones into respective stores
    const finalBoard = [...board];
    for (let i = 0; i < 6; i++) {
        finalBoard[6] += finalBoard[i];
        finalBoard[i] = 0;
    }
    for (let i = 7; i < 13; i++) {
        finalBoard[13] += finalBoard[i];
        finalBoard[i] = 0;
    }

    const xScore = finalBoard[6];
    const oScore = finalBoard[13];

    if (xScore > oScore) return { winner: 'X', line: null, board: finalBoard };
    if (oScore > xScore) return { winner: 'O', line: null, board: finalBoard };
    return { winner: 'draw', line: null, board: finalBoard };
};

export const makeMancalaMove = (board, pitIndex, turn) => {
    // Validate: must be own pit
    if (turn === 'X' && (pitIndex < 0 || pitIndex > 5)) return { valid: false };
    if (turn === 'O' && (pitIndex < 7 || pitIndex > 12)) return { valid: false };

    // Must have stones in the pit
    if (board[pitIndex] === 0) return { valid: false };

    const newBoard = [...board];
    let stones = newBoard[pitIndex];
    newBoard[pitIndex] = 0;

    const opponentStore = turn === 'X' ? 13 : 6;
    let currentIndex = pitIndex;

    // Sow stones counterclockwise
    while (stones > 0) {
        currentIndex = (currentIndex + 1) % 14;
        // Skip opponent's store
        if (currentIndex === opponentStore) continue;
        newBoard[currentIndex]++;
        stones--;
    }

    // The last stone landed at currentIndex
    const lastIndex = currentIndex;
    const ownStore = turn === 'X' ? 6 : 13;

    // Check for capture: last stone lands in an empty pit on own side
    const ownPitsStart = turn === 'X' ? 0 : 7;
    const ownPitsEnd = turn === 'X' ? 5 : 12;

    if (lastIndex !== ownStore &&
        lastIndex >= ownPitsStart &&
        lastIndex <= ownPitsEnd &&
        newBoard[lastIndex] === 1) {
        const oppositeIndex = getOppositePit(lastIndex);
        if (newBoard[oppositeIndex] > 0) {
            newBoard[ownStore] += newBoard[oppositeIndex] + 1;
            newBoard[oppositeIndex] = 0;
            newBoard[lastIndex] = 0;
        }
    }

    // Extra turn: last stone lands in own store
    let nextTurn = turn === 'X' ? 'O' : 'X';
    if (lastIndex === ownStore) {
        nextTurn = turn;
    }

    // Check for game over
    let result = checkMancalaWinner(newBoard);

    // If game ended, use the final board with collected stones
    if (result && result.board) {
        const finalBoard = result.board;
        result = { winner: result.winner, line: null };
        return { valid: true, board: finalBoard, result, nextTurn };
    }

    return { valid: true, board: newBoard, result, nextTurn };
};
