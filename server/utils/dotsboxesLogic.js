// Dots and Boxes Logic (Server - CommonJS)
// Board: Array(33)
//   Indices 0-11:  horizontal edges (4 rows x 3 per row)
//   Indices 12-23: vertical edges (3 rows x 4 per row)
//   Indices 24-32: boxes (3x3 grid)
// Edges become 'X' or 'O' when claimed. Boxes become 'X' or 'O' when completed.

const TOTAL_EDGES = 24;
const TOTAL_BOXES = 9;
const BOARD_SIZE = 33;

const getInitialDotsBoxesBoard = () => Array(BOARD_SIZE).fill(null);

// Get the 4 edge indices for a box at grid position (r, c)
const getBoxEdges = (r, c) => ({
    top: r * 3 + c,
    bottom: (r + 1) * 3 + c,
    left: 12 + r * 4 + c,
    right: 12 + r * 4 + (c + 1)
});

// Get which boxes are adjacent to a given edge index
const getAdjacentBoxes = (edgeIndex) => {
    const boxes = [];

    if (edgeIndex < 12) {
        // Horizontal edge
        const row = Math.floor(edgeIndex / 3);
        const col = edgeIndex % 3;
        // Box above (row - 1, col)
        if (row > 0) boxes.push({ r: row - 1, c: col });
        // Box below (row, col)
        if (row < 3) boxes.push({ r: row, c: col });
    } else {
        // Vertical edge (index 12-23)
        const vi = edgeIndex - 12;
        const row = Math.floor(vi / 4);
        const col = vi % 4;
        // Box to the left (row, col - 1)
        if (col > 0) boxes.push({ r: row, c: col - 1 });
        // Box to the right (row, col)
        if (col < 3) boxes.push({ r: row, c: col });
    }

    return boxes;
};

const checkDotsBoxesWinner = (board) => {
    let countX = 0;
    let countO = 0;
    let filledBoxes = 0;

    for (let i = 24; i < BOARD_SIZE; i++) {
        if (board[i] === 'X') { countX++; filledBoxes++; }
        else if (board[i] === 'O') { countO++; filledBoxes++; }
    }

    // Game is over when all 9 boxes are filled (which means all 24 edges are filled)
    if (filledBoxes === TOTAL_BOXES) {
        if (countX > countO) return { winner: 'X', line: null };
        if (countO > countX) return { winner: 'O', line: null };
        return { winner: 'draw', line: null };
    }

    return null;
};

const makeDotsBoxesMove = (board, edgeIndex, turn) => {
    // Validate edge index
    if (edgeIndex < 0 || edgeIndex >= TOTAL_EDGES) return { valid: false };

    // Edge must be unclaimed
    if (board[edgeIndex] !== null) return { valid: false };

    const newBoard = [...board];
    newBoard[edgeIndex] = turn;

    // Check if this edge completed any adjacent boxes
    const adjacentBoxes = getAdjacentBoxes(edgeIndex);
    let boxesCompleted = 0;

    for (const { r, c } of adjacentBoxes) {
        const edges = getBoxEdges(r, c);
        const allFilled = newBoard[edges.top] !== null
            && newBoard[edges.bottom] !== null
            && newBoard[edges.left] !== null
            && newBoard[edges.right] !== null;

        if (allFilled) {
            const boxIndex = 24 + r * 3 + c;
            // Only mark if not already claimed
            if (newBoard[boxIndex] === null) {
                newBoard[boxIndex] = turn;
                boxesCompleted++;
            }
        }
    }

    // Extra turn if any box was completed
    const nextTurn = boxesCompleted > 0 ? turn : (turn === 'X' ? 'O' : 'X');

    const result = checkDotsBoxesWinner(newBoard);

    return { valid: true, board: newBoard, result, nextTurn };
};

module.exports = {
    getInitialDotsBoxesBoard,
    makeDotsBoxesMove,
    checkDotsBoxesWinner
};
