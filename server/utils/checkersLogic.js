// Constants
const CHECKERS_SIZE = 8;
const EMPTY = null;

// Helpers
const getOpponentColor = (turn) => turn === 'r' ? 'b' : 'r';

const getRowCol = (index) => ({ r: Math.floor(index / CHECKERS_SIZE), c: index % CHECKERS_SIZE });
const getIndex = (r, c) => r * CHECKERS_SIZE + c;
const inBounds = (r, c) => r >= 0 && r < CHECKERS_SIZE && c >= 0 && c < CHECKERS_SIZE;

const getInitialCheckersBoard = () => {
    const board = Array(64).fill(EMPTY);
    for (let i = 0; i < 64; i++) {
        const { r, c } = getRowCol(i);
        if ((r + c) % 2 === 1) { // Dark squares
            if (r < 3) board[i] = 'b';
            else if (r > 4) board[i] = 'r';
        }
    }
    return board;
};

// Determine allowed directions
const getDirections = (piece) => {
    if (!piece) return [];
    if (piece === 'R' || piece === 'B') return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    if (piece === 'r') return [[-1, -1], [-1, 1]]; // Red moves UP (decreasing rank)
    if (piece === 'b') return [[1, -1], [1, 1]];  // Black moves DOWN (increasing rank)
    return [];
};

const getPotentialMoves = (board, index) => {
    const piece = board[index];
    if (!piece) return { normals: [], jumps: [] };

    const { r, c } = getRowCol(index);
    const dirs = getDirections(piece);
    const opponent = getOpponentColor(piece.toLowerCase());

    const normals = [];
    const jumps = [];

    for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;

        const targetIdx = getIndex(nr, nc);
        if (board[targetIdx] === EMPTY) {
            normals.push({ to: targetIdx, jumpOver: null });
        } else if ((board[targetIdx].toLowerCase()) === opponent) {
            // Check jump
            const jr = nr + dr;
            const jc = nc + dc;
            if (inBounds(jr, jc)) {
                const jumpTargetIdx = getIndex(jr, jc);
                if (board[jumpTargetIdx] === EMPTY) {
                    jumps.push({ to: jumpTargetIdx, jumpOver: targetIdx });
                }
            }
        }
    }

    return { normals, jumps };
};

const getAllPossibleMoves = (board, turn, mustMoveIndex = null) => {
    const allMoves = [];
    let hasJumps = false;

    for (let i = 0; i < 64; i++) {
        const piece = board[i];
        if (piece && piece.toLowerCase() === turn) {
            // If forced to move a specific piece (multi-jump scenario)
            if (mustMoveIndex !== null && i !== mustMoveIndex) continue;

            const { jumps } = getPotentialMoves(board, i);
            if (jumps.length > 0) {
                hasJumps = true;
                jumps.forEach(j => allMoves.push({ from: i, ...j }));
            }
        }
    }

    // If jumps are available, ONLY jumps are allowed
    if (hasJumps) return { moves: allMoves, hasJumps: true };

    // If no jumps, and we are NOT in a multi-jump scenario
    if (mustMoveIndex === null) {
        for (let i = 0; i < 64; i++) {
            const piece = board[i];
            if (piece && piece.toLowerCase() === turn) {
                const { normals } = getPotentialMoves(board, i);
                normals.forEach(n => allMoves.push({ from: i, ...n }));
            }
        }
    }

    return { moves: allMoves, hasJumps: false };
};

const checkCheckersWinner = (board) => {
    let redCount = 0;
    let blackCount = 0;
    for (const cell of board) {
        if (cell && cell.toLowerCase() === 'r') redCount++;
        if (cell && cell.toLowerCase() === 'b') blackCount++;
    }

    if (redCount === 0) return { winner: 'b', line: null };
    if (blackCount === 0) return { winner: 'r', line: null };

    // Check if current player has no moves (would require knowing turn, but we normally do this per turn later)
    return null;
};

const makeCheckersMove = (board, fromIndex, toIndex, turn, mustMoveIndex = null) => {
    const { moves } = getAllPossibleMoves(board, turn, mustMoveIndex);
    
    // Find the move attempt
    const validMove = moves.find(m => m.from === fromIndex && m.to === toIndex);
    
    if (!validMove) return { valid: false };

    let newBoard = [...board];
    const piece = newBoard[fromIndex];
    
    // Move piece
    newBoard[toIndex] = piece;
    newBoard[fromIndex] = EMPTY;

    let madeJump = false;
    // Handle capture
    if (validMove.jumpOver !== null) {
        newBoard[validMove.jumpOver] = EMPTY;
        madeJump = true;
    }

    // Handle Promotion
    let promoted = false;
    const { r: toRow } = getRowCol(toIndex);
    if (piece === 'r' && toRow === 0) {
        newBoard[toIndex] = 'R';
        promoted = true;
    } else if (piece === 'b' && toRow === 7) {
        newBoard[toIndex] = 'B';
        promoted = true;
    }

    let nextTurn = turn === 'r' ? 'b' : 'r';
    let nextMustMoveIndex = null;

    // Check for multi-jumps (if we just made a jump, and were not promoted this turn)
    if (madeJump && !promoted) {
        const { jumps: furtherJumps } = getPotentialMoves(newBoard, toIndex);
        if (furtherJumps.length > 0) {
            nextTurn = turn; // Keep current turn
            nextMustMoveIndex = toIndex; // Must move this newly landed piece
        }
    }

    let result = checkCheckersWinner(newBoard);
    
    // If no winner yet, check if the next player has any valid moves
    if (!result) {
        const nextMoves = getAllPossibleMoves(newBoard, nextTurn, nextMustMoveIndex);
        if (nextMoves.moves.length === 0) {
            // Next player has no valid moves, so current player wins
            result = { winner: turn, line: null };
        }
    }

    return { valid: true, board: newBoard, result, nextTurn, mustMoveIndex: nextMustMoveIndex };
};

module.exports = {
    getInitialCheckersBoard,
    getPotentialMoves,
    getAllPossibleMoves,
    checkCheckersWinner,
    makeCheckersMove
};
