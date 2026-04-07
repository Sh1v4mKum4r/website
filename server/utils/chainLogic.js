// Chain Reaction Game Logic
// Board: Array(80) — 10 rows x 8 cols. Index = row * 8 + col.
// Each cell: null (empty) or string like 'R2' (Red player, 2 atoms)
// Player colors: R=Red, G=Green, B=Blue, Y=Yellow, P=Purple, C=Cyan

const CHAIN_COLORS = ['R', 'G', 'B', 'Y', 'P', 'C'];
const ROWS = 10;
const COLS = 8;

const getInitialChainBoard = () => {
    return Array(ROWS * COLS).fill(null);
};

const getCriticalMass = (index) => {
    const row = Math.floor(index / COLS);
    const col = index % COLS;
    const isTopOrBottom = row === 0 || row === ROWS - 1;
    const isLeftOrRight = col === 0 || col === COLS - 1;

    if (isTopOrBottom && isLeftOrRight) return 2; // corner
    if (isTopOrBottom || isLeftOrRight) return 3; // edge
    return 4; // interior
};

const getNeighbors = (index) => {
    const row = Math.floor(index / COLS);
    const col = index % COLS;
    const neighbors = [];
    if (row > 0) neighbors.push((row - 1) * COLS + col);         // up
    if (row < ROWS - 1) neighbors.push((row + 1) * COLS + col);  // down
    if (col > 0) neighbors.push(row * COLS + (col - 1));         // left
    if (col < COLS - 1) neighbors.push(row * COLS + (col + 1));  // right
    return neighbors;
};

const parseCell = (cell) => {
    if (!cell) return { player: null, atoms: 0 };
    return { player: cell[0], atoms: parseInt(cell.substring(1), 10) };
};

const encodeCell = (player, atoms) => {
    if (!player || atoms <= 0) return null;
    return player + atoms;
};

const makeChainMove = (board, index, turn, turnOrder, moveCount) => {
    // Validate index
    if (index < 0 || index >= ROWS * COLS) return { valid: false };

    // Validate turn is in turnOrder
    if (!turnOrder.includes(turn)) return { valid: false };

    // Cell must be empty or owned by the current player
    const cell = parseCell(board[index]);
    if (cell.player !== null && cell.player !== turn) return { valid: false };

    // Place atom
    const newBoard = [...board];
    const newAtoms = cell.atoms + 1;
    newBoard[index] = encodeCell(turn, newAtoms);

    // Process explosions using a queue (iterative, not recursive)
    const queue = [];
    if (newAtoms >= getCriticalMass(index)) {
        queue.push(index);
    }

    let iterations = 0;
    const MAX_ITERATIONS = 1000;

    while (queue.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        const explodeIndex = queue.shift();
        const explodeCell = parseCell(newBoard[explodeIndex]);

        // Cell might have already been modified by a prior explosion in this cycle
        if (!explodeCell.player || explodeCell.atoms < getCriticalMass(explodeIndex)) {
            continue;
        }

        const explodingPlayer = explodeCell.player;
        const remainingAtoms = explodeCell.atoms - getCriticalMass(explodeIndex);

        // Reset or reduce the exploding cell
        if (remainingAtoms <= 0) {
            newBoard[explodeIndex] = null;
        } else {
            newBoard[explodeIndex] = encodeCell(explodingPlayer, remainingAtoms);
        }

        // Send atoms to neighbors
        const neighbors = getNeighbors(explodeIndex);
        for (const neighborIndex of neighbors) {
            const neighborCell = parseCell(newBoard[neighborIndex]);
            const neighborNewAtoms = neighborCell.atoms + 1;
            // Neighbor becomes owned by the exploding player
            newBoard[neighborIndex] = encodeCell(explodingPlayer, neighborNewAtoms);

            // Check if neighbor now needs to explode
            if (neighborNewAtoms >= getCriticalMass(neighborIndex)) {
                queue.push(neighborIndex);
            }
        }
    }

    // Increment move count
    const newMoveCount = moveCount + 1;

    // Check eliminations (only after everyone has had a chance to play)
    let newTurnOrder = [...turnOrder];
    let result = null;

    if (newMoveCount >= turnOrder.length) {
        // Count atoms per player
        const atomCounts = {};
        for (const color of newTurnOrder) {
            atomCounts[color] = 0;
        }
        for (let i = 0; i < ROWS * COLS; i++) {
            const c = parseCell(newBoard[i]);
            if (c.player && atomCounts.hasOwnProperty(c.player)) {
                atomCounts[c.player] += c.atoms;
            }
        }

        // Eliminate players with 0 atoms
        newTurnOrder = newTurnOrder.filter(color => atomCounts[color] > 0);

        // Check for winner
        if (newTurnOrder.length === 1) {
            result = { winner: newTurnOrder[0], line: null };
            return {
                valid: true,
                board: newBoard,
                result,
                nextTurn: null,
                turnOrder: newTurnOrder,
                moveCount: newMoveCount,
            };
        }

        if (newTurnOrder.length === 0) {
            // Edge case: all players eliminated simultaneously — last player to move wins
            result = { winner: turn, line: null };
            return {
                valid: true,
                board: newBoard,
                result,
                nextTurn: null,
                turnOrder: [turn],
                moveCount: newMoveCount,
            };
        }
    }

    // Determine next turn: cycle to the next player in turnOrder
    const currentIndex = newTurnOrder.indexOf(turn);
    const nextTurn = newTurnOrder[(currentIndex + 1) % newTurnOrder.length];

    return {
        valid: true,
        board: newBoard,
        result,
        nextTurn,
        turnOrder: newTurnOrder,
        moveCount: newMoveCount,
    };
};

module.exports = { getInitialChainBoard, makeChainMove, CHAIN_COLORS, ROWS, COLS };
