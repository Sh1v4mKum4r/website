// Imposter Word — Social Deduction Game Logic (CommonJS)
// One player gets a different word; others must find the imposter via one-word clues.

const WORD_PAIRS = [
    ['apple', 'banana'],
    ['guitar', 'piano'],
    ['soccer', 'basketball'],
    ['coffee', 'tea'],
    ['cat', 'dog'],
    ['sun', 'moon'],
    ['ocean', 'lake'],
    ['pizza', 'burger'],
    ['train', 'bus'],
    ['winter', 'summer'],
    ['sword', 'shield'],
    ['mountain', 'valley'],
    ['rain', 'snow'],
    ['pencil', 'pen'],
    ['chair', 'couch'],
    ['shirt', 'jacket'],
    ['violin', 'cello'],
    ['eagle', 'hawk'],
    ['rose', 'tulip'],
    ['gold', 'silver'],
    ['bread', 'rice'],
    ['candle', 'lamp'],
    ['river', 'stream'],
    ['castle', 'tower'],
    ['diamond', 'ruby'],
    ['hammer', 'wrench'],
    ['painting', 'sculpture'],
    ['forest', 'jungle'],
    ['cookie', 'cake'],
    ['shark', 'whale'],
    ['drum', 'flute'],
    ['lightning', 'thunder'],
];

/**
 * Fisher-Yates shuffle (in-place)
 */
const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

/**
 * Pick a random word pair and assign words to players.
 * One random player becomes the imposter and gets the second word.
 */
const assignWords = (playerIds) => {
    const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
    const imposterIndex = Math.floor(Math.random() * playerIds.length);
    const imposterPlayerId = playerIds[imposterIndex];

    // Randomly decide which word is the "majority" word and which is the "imposter" word
    const flip = Math.random() < 0.5;
    const majorityWord = flip ? pair[0] : pair[1];
    const imposterWord = flip ? pair[1] : pair[0];

    const words = {};
    for (const pid of playerIds) {
        words[pid] = pid === imposterPlayerId ? imposterWord : majorityWord;
    }

    return { imposterPlayerId, words, majorityWord, imposterWord };
};

/**
 * Create the initial game state for Imposter Word.
 * @param {string[]} playerIds — array of socket/player IDs
 * @param {Object} playerNames — { playerId: displayName }
 * @returns {Object} game state
 */
const getInitialImposterState = (playerIds, playerNames) => {
    const { imposterPlayerId, words, majorityWord, imposterWord } = assignWords(playerIds);
    const clueOrder = shuffle(playerIds);

    const scores = {};
    for (const pid of playerIds) {
        scores[pid] = 0;
    }

    return {
        imposterPlayerId,
        words,
        majorityWord,
        imposterWord,
        clues: {},
        votes: {},
        phase: 'clue',        // clue → discussion → voting → reveal
        currentClueIndex: 0,
        clueOrder,
        round: 1,
        totalRounds: 3,
        scores,
        timeLeft: 0,
        playerNames: { ...playerNames },
        playerIds: [...playerIds],
    };
};

/**
 * Submit a one-word clue from a player.
 * @param {Object} state — current game state
 * @param {string} playerId
 * @param {string} clue — the one-word clue
 * @returns {Object} updated state (or null if invalid)
 */
const submitClue = (state, playerId, clue) => {
    // Only accept clues during the clue phase
    if (state.phase !== 'clue') return null;

    // Only accept from the player whose turn it is
    const expectedPlayer = state.clueOrder[state.currentClueIndex];
    if (playerId !== expectedPlayer) return null;

    // Sanitize: take only the first word, strip punctuation
    const sanitized = clue.trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9'-]/g, '');
    if (!sanitized) return null;

    // Don't allow the actual word as a clue
    const lower = sanitized.toLowerCase();
    if (lower === state.majorityWord.toLowerCase() || lower === state.imposterWord.toLowerCase()) {
        return null;
    }

    const newClues = { ...state.clues, [playerId]: sanitized };
    const nextIndex = state.currentClueIndex + 1;

    // If all players have given clues, move to discussion phase
    if (nextIndex >= state.clueOrder.length) {
        return {
            ...state,
            clues: newClues,
            currentClueIndex: nextIndex,
            phase: 'discussion',
            timeLeft: 60,
        };
    }

    return {
        ...state,
        clues: newClues,
        currentClueIndex: nextIndex,
    };
};

/**
 * Submit a vote for who the imposter is.
 * @param {Object} state — current game state
 * @param {string} playerId — voter
 * @param {string} votedForId — who they're voting for
 * @returns {Object} updated state (or null if invalid)
 */
const submitVote = (state, playerId, votedForId) => {
    if (state.phase !== 'voting') return null;

    // Can't vote for yourself
    if (playerId === votedForId) return null;

    // Can't vote twice
    if (state.votes[playerId]) return null;

    // Must vote for a valid player
    if (!state.playerIds.includes(votedForId)) return null;

    const newVotes = { ...state.votes, [playerId]: votedForId };

    // Check if all players have voted
    const allVoted = state.playerIds.every((pid) => newVotes[pid]);

    if (allVoted) {
        return {
            ...state,
            votes: newVotes,
            phase: 'reveal',
        };
    }

    return {
        ...state,
        votes: newVotes,
    };
};

/**
 * Tally votes and determine results for the current round.
 * @param {Object} state — current game state (phase should be 'reveal')
 * @returns {Object} { imposterCaught, imposterId, voteCounts, scores }
 */
const revealResults = (state) => {
    // Count votes
    const voteCounts = {};
    for (const pid of state.playerIds) {
        voteCounts[pid] = 0;
    }
    for (const votedFor of Object.values(state.votes)) {
        voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
    }

    // Find the player with the most votes
    let maxVotes = 0;
    let mostVoted = null;
    let isTie = false;

    for (const [pid, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
            maxVotes = count;
            mostVoted = pid;
            isTie = false;
        } else if (count === maxVotes && count > 0) {
            isTie = true;
        }
    }

    const imposterCaught = !isTie && mostVoted === state.imposterPlayerId;

    // Update scores
    const scores = { ...state.scores };
    if (imposterCaught) {
        // All non-imposters get a point
        for (const pid of state.playerIds) {
            if (pid !== state.imposterPlayerId) {
                scores[pid] = (scores[pid] || 0) + 1;
            }
        }
    } else {
        // Imposter gets 2 points for not being caught
        scores[state.imposterPlayerId] = (scores[state.imposterPlayerId] || 0) + 2;
    }

    return {
        imposterCaught,
        imposterId: state.imposterPlayerId,
        voteCounts,
        scores,
        majorityWord: state.majorityWord,
        imposterWord: state.imposterWord,
    };
};

/**
 * Set up the next round with new words and a new imposter.
 * @param {Object} state — current game state
 * @param {string[]} playerIds — (may have changed if players left/joined)
 * @returns {Object} new state for the next round
 */
const nextRound = (state, playerIds) => {
    const ids = playerIds || state.playerIds;
    const { imposterPlayerId, words, majorityWord, imposterWord } = assignWords(ids);
    const clueOrder = shuffle(ids);
    const nextRoundNum = state.round + 1;

    return {
        ...state,
        imposterPlayerId,
        words,
        majorityWord,
        imposterWord,
        clues: {},
        votes: {},
        phase: 'clue',
        currentClueIndex: 0,
        clueOrder,
        round: nextRoundNum,
        timeLeft: 0,
        playerIds: [...ids],
    };
};

module.exports = {
    WORD_PAIRS,
    getInitialImposterState,
    submitClue,
    submitVote,
    revealResults,
    nextRound,
};
