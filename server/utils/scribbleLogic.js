// Scribble (Draw & Guess) Game Logic — CommonJS
// A Pictionary-style game where players take turns drawing a word
// while others try to guess it.

const WORD_LIST = [
    'apple', 'banana', 'cat', 'dog', 'elephant',
    'fire', 'guitar', 'house', 'island', 'jungle',
    'kite', 'lion', 'mountain', 'ninja', 'ocean',
    'piano', 'queen', 'robot', 'snake', 'tree',
    'umbrella', 'volcano', 'whale', 'xylophone', 'zebra',
    'airplane', 'bicycle', 'castle', 'dinosaur', 'eagle',
    'flower', 'ghost', 'hammer', 'iceberg', 'jellyfish',
    'kangaroo', 'lighthouse', 'mushroom', 'notebook', 'octopus',
    'penguin', 'rainbow', 'sandwich', 'telescope', 'unicorn',
    'vampire', 'waterfall', 'wizard', 'yogurt', 'zombie',
    'anchor', 'bridge', 'cactus', 'diamond', 'feather',
];

/**
 * Pick a random word from the word list.
 */
const pickRandomWord = () => {
    return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
};

/**
 * Create the initial game state for Scribble.
 * @param {string[]} playerIds — array of socket/player IDs
 * @param {object} playerNames — map of playerId → display name
 * @returns {object} — initial game state
 */
const getInitialScribbleState = (playerIds, playerNames) => {
    const drawOrder = [...playerIds];
    // Shuffle draw order
    for (let i = drawOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [drawOrder[i], drawOrder[j]] = [drawOrder[j], drawOrder[i]];
    }

    const scores = {};
    for (const id of playerIds) {
        scores[id] = 0;
    }

    return {
        currentDrawerIndex: 0,
        drawOrder,
        word: pickRandomWord(),
        scores,
        round: 1,
        totalRounds: Math.min(drawOrder.length, 3),
        guessedPlayers: [],
        timeLeft: 60,
        phase: 'drawing',
        playerNames: { ...playerNames },
    };
};

/**
 * Check a guess against the current word.
 * @param {object} state — current game state
 * @param {string} guess — the guessed word
 * @param {string} playerId — the player making the guess
 * @returns {object} — { correct, alreadyGuessed }
 */
const checkGuess = (state, guess, playerId) => {
    // Player already guessed correctly
    if (state.guessedPlayers.includes(playerId)) {
        return { correct: false, alreadyGuessed: true };
    }

    // Drawer cannot guess
    const currentDrawerId = state.drawOrder[state.currentDrawerIndex];
    if (playerId === currentDrawerId) {
        return { correct: false, alreadyGuessed: false };
    }

    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedWord = state.word.toLowerCase();

    if (normalizedGuess === normalizedWord) {
        // Award points — earlier guessers get more points
        const guessOrder = state.guessedPlayers.length;
        const guesserPoints = Math.max(10 - guessOrder * 2, 2);
        const drawerPoints = 2;

        state.guessedPlayers.push(playerId);
        state.scores[playerId] = (state.scores[playerId] || 0) + guesserPoints;
        state.scores[currentDrawerId] = (state.scores[currentDrawerId] || 0) + drawerPoints;

        return { correct: true, alreadyGuessed: false };
    }

    return { correct: false, alreadyGuessed: false };
};

/**
 * Advance to the next round/drawer.
 * @param {object} state — current game state
 * @returns {object} — updated state, or { gameOver, winner, scores } if finished
 */
const nextRound = (state) => {
    const nextDrawerIndex = state.currentDrawerIndex + 1;

    // Check if we've gone through all drawers in this round
    if (nextDrawerIndex >= state.drawOrder.length) {
        const nextRoundNum = state.round + 1;

        // Check if all rounds are complete
        if (nextRoundNum > state.totalRounds) {
            // Game over — find winner
            const maxScore = Math.max(...Object.values(state.scores));
            const topPlayers = Object.keys(state.scores).filter(
                (id) => state.scores[id] === maxScore
            );

            let winner;
            if (topPlayers.length === 1) {
                winner = state.playerNames[topPlayers[0]] || topPlayers[0];
            } else {
                winner = 'draw';
            }

            return {
                gameOver: true,
                winner,
                scores: { ...state.scores },
                playerNames: { ...state.playerNames },
            };
        }

        // Start new round with first drawer
        return {
            ...state,
            currentDrawerIndex: 0,
            word: pickRandomWord(),
            round: nextRoundNum,
            guessedPlayers: [],
            timeLeft: 60,
            phase: 'drawing',
        };
    }

    // Next drawer in same round
    return {
        ...state,
        currentDrawerIndex: nextDrawerIndex,
        word: pickRandomWord(),
        guessedPlayers: [],
        timeLeft: 60,
        phase: 'drawing',
    };
};

module.exports = {
    getInitialScribbleState,
    checkGuess,
    nextRound,
    WORD_LIST,
};
