// Memory (Concentration) Game Logic — ES module version
// Board: Array(20) — 10 pairs of emoji cards, shuffled
// State: { cards, revealed, matchedBy, flippedIndices, scores, turnOrder, moveCount }

export const MEMORY_CARD_EMOJIS = ['🐶','🐱','🐸','🦊','🐻','🐼','🐯','🦁','🐮','🐷'];

/**
 * Fisher-Yates shuffle (in-place)
 */
const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

/**
 * Create the initial game state for Memory.
 * @param {number} playerCount — 2, 3, or 4 players
 */
export const getInitialMemoryState = (playerCount = 2) => {
    // Each emoji appears twice → 20 cards total
    const cards = shuffle([...MEMORY_CARD_EMOJIS, ...MEMORY_CARD_EMOJIS]);

    // Build turnOrder and scores based on player count
    let turnOrder;
    if (playerCount === 2) {
        turnOrder = ['X', 'O'];
    } else {
        turnOrder = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
    }

    const scores = {};
    for (const p of turnOrder) {
        scores[p] = 0;
    }

    return {
        cards,
        revealed: Array(20).fill('hidden'),
        matchedBy: Array(20).fill(null),
        flippedIndices: [],
        scores,
        turnOrder,
        moveCount: 0,
    };
};

/**
 * Process a card flip in Memory.
 * @param {object} state — current game state
 * @param {number} cardIndex — index of the card being flipped (0-19)
 * @param {string} currentPlayer — the player making the move (e.g. 'X', 'O', 'P1')
 * @returns {object} — result of the move
 */
export const makeMemoryMove = (state, cardIndex, currentPlayer) => {
    // Validate index range
    if (cardIndex < 0 || cardIndex >= 20) {
        return { valid: false };
    }

    // Cannot flip a matched card
    if (state.revealed[cardIndex] === 'matched') {
        return { valid: false };
    }

    // Cannot flip an already-flipped card
    if (state.revealed[cardIndex] === 'flipped') {
        return { valid: false };
    }

    // Cannot flip if 2 cards are already flipped (waiting for flip-back)
    if (state.flippedIndices.length >= 2) {
        return { valid: false };
    }

    // Clone mutable state
    const cards = [...state.cards];
    const revealed = [...state.revealed];
    const matchedBy = [...state.matchedBy];
    const scores = { ...state.scores };
    const turnOrder = [...state.turnOrder];
    let flippedIndices = [...state.flippedIndices];
    let moveCount = state.moveCount + 1;

    // Flip this card
    revealed[cardIndex] = 'flipped';
    flippedIndices.push(cardIndex);

    let result = null;
    let nextTurn = currentPlayer;
    let isMatch = null;
    let needsFlipBack = false;
    let flipBackIndices = null;

    if (flippedIndices.length === 1) {
        // First card flipped — wait for the second
        isMatch = null;
        nextTurn = currentPlayer;
    } else if (flippedIndices.length === 2) {
        // Second card flipped — check for match
        const [idx1, idx2] = flippedIndices;
        const card1 = cards[idx1];
        const card2 = cards[idx2];

        if (card1 === card2) {
            // Match found
            isMatch = true;
            revealed[idx1] = 'matched';
            revealed[idx2] = 'matched';
            matchedBy[idx1] = currentPlayer;
            matchedBy[idx2] = currentPlayer;
            scores[currentPlayer] = (scores[currentPlayer] || 0) + 1;
            flippedIndices = [];
            nextTurn = currentPlayer; // extra turn on match

            // Check game over — all cards matched
            const allMatched = revealed.every((r) => r === 'matched');
            if (allMatched) {
                // Determine winner
                const maxScore = Math.max(...Object.values(scores));
                const topPlayers = Object.keys(scores).filter((p) => scores[p] === maxScore);
                if (topPlayers.length === 1) {
                    result = { winner: topPlayers[0], line: null };
                } else {
                    result = { winner: 'draw', line: null };
                }
            }
        } else {
            // No match
            isMatch = false;
            needsFlipBack = true;
            flipBackIndices = [idx1, idx2];

            // Next player in turnOrder
            const currentIdx = turnOrder.indexOf(currentPlayer);
            nextTurn = turnOrder[(currentIdx + 1) % turnOrder.length];
        }
    }

    return {
        valid: true,
        cards,
        revealed,
        matchedBy,
        flippedIndices,
        scores,
        turnOrder,
        moveCount,
        result,
        nextTurn,
        isMatch,
        needsFlipBack,
        flipBackIndices,
    };
};
