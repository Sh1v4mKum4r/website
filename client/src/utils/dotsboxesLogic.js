// Dots and Boxes Logic (Client - ES Module)
// Board: Array(85)
//   Indices 0-29:  horizontal edges (6 rows x 5 per row)
//   Indices 30-59: vertical edges (5 rows x 6 per row)
//   Indices 60-84: boxes (5x5 grid)
// Edges become 'X' or 'O' when claimed. Boxes become 'X' or 'O' when completed.

const H_COLS = 5;       // horizontal edges per row
const V_COLS = 6;       // vertical edges per row (= DOT_COLS)
const BOX_COLS = 5;
const H_EDGE_COUNT = 30; // 6 * 5
const V_EDGE_COUNT = 30; // 5 * 6
const TOTAL_EDGES = 60;
const TOTAL_BOXES = 25;
const BOARD_SIZE = 85;
const BOX_START = 60;

export const getInitialDotsBoxesBoard = () => Array(BOARD_SIZE).fill(null);

// Get the 4 edge indices for a box at grid position (r, c)
const getBoxEdges = (r, c) => ({
    top: r * H_COLS + c,
    bottom: (r + 1) * H_COLS + c,
    left: H_EDGE_COUNT + r * V_COLS + c,
    right: H_EDGE_COUNT + r * V_COLS + (c + 1)
});

// Get which boxes are adjacent to a given edge index
const getAdjacentBoxes = (edgeIndex) => {
    const boxes = [];

    if (edgeIndex < H_EDGE_COUNT) {
        // Horizontal edge
        const row = Math.floor(edgeIndex / H_COLS);
        const col = edgeIndex % H_COLS;
        // Box above (row - 1, col)
        if (row > 0) boxes.push({ r: row - 1, c: col });
        // Box below (row, col)
        if (row < BOX_COLS) boxes.push({ r: row, c: col });
    } else {
        // Vertical edge (index 30-59)
        const vi = edgeIndex - H_EDGE_COUNT;
        const row = Math.floor(vi / V_COLS);
        const col = vi % V_COLS;
        // Box to the left (row, col - 1)
        if (col > 0) boxes.push({ r: row, c: col - 1 });
        // Box to the right (row, col)
        if (col < BOX_COLS) boxes.push({ r: row, c: col });
    }

    return boxes;
};

export const checkDotsBoxesWinner = (board) => {
    let countX = 0;
    let countO = 0;
    let filledBoxes = 0;

    for (let i = BOX_START; i < BOARD_SIZE; i++) {
        if (board[i] === 'X') { countX++; filledBoxes++; }
        else if (board[i] === 'O') { countO++; filledBoxes++; }
    }

    // Game is over when all 25 boxes are filled
    if (filledBoxes === TOTAL_BOXES) {
        if (countX > countO) return { winner: 'X', line: null };
        if (countO > countX) return { winner: 'O', line: null };
        return { winner: 'draw', line: null };
    }

    return null;
};

export const makeDotsBoxesMove = (board, edgeIndex, turn) => {
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
            const boxIndex = BOX_START + r * BOX_COLS + c;
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
