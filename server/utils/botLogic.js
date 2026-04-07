// Bot Logic — CommonJS module
// getBotMove(gameType, roomState, botRole, difficulty)
// Returns { index, data? } or null if no valid move

const { makeTicTacToeMove } = require('./gameLogic');
const { makeConnect4Move } = require('./gameLogic');
const { makeOthelloMove } = require('./gameLogic');
const { getAllPossibleMoves } = require('./checkersLogic');
const { makeCheckersMove } = require('./checkersLogic');
const { makeGomokuMove } = require('./gomokuLogic');
const { makeMancalaMove } = require('./mancalaLogic');
const { makeDotsBoxesMove } = require('./dotsboxesLogic');
const { makeNimMove } = require('./nimLogic');
const { makeUTTTMove } = require('./utttLogic');
const { makeChainMove } = require('./chainLogic');
const { makeMemoryMove } = require('./memoryLogic');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomChoice(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function getOpponent(role) {
  if (role === 'X') return 'O';
  if (role === 'O') return 'X';
  if (role === 'r') return 'b';
  if (role === 'b') return 'r';
  return null;
}

// ---------------------------------------------------------------------------
// Per-game valid-move finders
// ---------------------------------------------------------------------------

function getValidMovesTTT(board, turn) {
  const moves = [];
  for (let i = 0; i < 9; i++) {
    const res = makeTicTacToeMove(board, i, turn);
    if (res.valid) moves.push({ index: i, result: res.result });
  }
  return moves;
}

function getValidMovesConnect4(board, turn) {
  const moves = [];
  for (let col = 0; col < 7; col++) {
    const res = makeConnect4Move(board, col, turn);
    if (res.valid) moves.push({ index: col, result: res.result });
  }
  return moves;
}

function getValidMovesOthello(board, turn) {
  const moves = [];
  for (let i = 0; i < 64; i++) {
    const res = makeOthelloMove(board, i, turn);
    if (res.valid) moves.push({ index: i, result: res.result, board: res.board });
  }
  return moves;
}

function getValidMovesGomoku(board, turn) {
  const moves = [];
  for (let i = 0; i < 225; i++) {
    const res = makeGomokuMove(board, i, turn);
    if (res.valid) moves.push({ index: i, result: res.result });
  }
  return moves;
}

function getValidMovesMancala(board, turn) {
  const moves = [];
  const start = turn === 'X' ? 0 : 7;
  const end = turn === 'X' ? 5 : 12;
  for (let i = start; i <= end; i++) {
    const res = makeMancalaMove(board, i, turn);
    if (res.valid) moves.push({ index: i, result: res.result, nextTurn: res.nextTurn });
  }
  return moves;
}

function getValidMovesDotsBoxes(board, turn) {
  const moves = [];
  for (let i = 0; i < 60; i++) {
    const res = makeDotsBoxesMove(board, i, turn);
    if (res.valid) moves.push({ index: i, result: res.result, nextTurn: res.nextTurn, board: res.board });
  }
  return moves;
}

function getValidMovesNim(board, turn) {
  const moves = [];
  for (let i = 0; i < 15; i++) {
    const res = makeNimMove(board, i, turn);
    if (res.valid) moves.push({ index: i, result: res.result });
  }
  return moves;
}

function getValidMovesUTTT(state, turn) {
  const moves = [];
  for (let i = 0; i < 81; i++) {
    const res = makeUTTTMove(state, i, turn);
    if (res.valid) moves.push({ index: i, result: res.result });
  }
  return moves;
}

function getValidMovesChain(board, turn, turnOrder, moveCount) {
  const moves = [];
  for (let i = 0; i < 81; i++) {
    const res = makeChainMove(board, i, turn, turnOrder, moveCount);
    if (res.valid) moves.push({ index: i, result: res.result });
  }
  return moves;
}

function getValidMovesMemory(state, currentPlayer) {
  const moves = [];
  for (let i = 0; i < 20; i++) {
    const res = makeMemoryMove(state, i, currentPlayer);
    if (res.valid) moves.push({ index: i, result: res.result });
  }
  return moves;
}

// ---------------------------------------------------------------------------
// TTT Minimax (Hard mode)
// ---------------------------------------------------------------------------

function tttMinimax(board, isMaximizing, botRole) {
  const opponent = getOpponent(botRole);
  // Check terminal
  const { checkTicTacToeWinner } = require('./gameLogic');
  const winResult = checkTicTacToeWinner(board);
  if (winResult) {
    if (winResult.winner === botRole) return { score: 10 };
    if (winResult.winner === opponent) return { score: -10 };
    return { score: 0 }; // draw
  }

  const turn = isMaximizing ? botRole : opponent;
  let bestScore = isMaximizing ? -Infinity : Infinity;
  let bestIndex = -1;

  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    const newBoard = [...board];
    newBoard[i] = turn;
    const result = tttMinimax(newBoard, !isMaximizing, botRole);
    if (isMaximizing) {
      if (result.score > bestScore) {
        bestScore = result.score;
        bestIndex = i;
      }
    } else {
      if (result.score < bestScore) {
        bestScore = result.score;
        bestIndex = i;
      }
    }
  }

  return { score: bestScore, index: bestIndex };
}

// ---------------------------------------------------------------------------
// Nim strategy helpers (Hard mode — Misere Nim)
// ---------------------------------------------------------------------------

const NIM_ROW_BOUNDARIES = [
  { start: 0, end: 3 },
  { start: 3, end: 8 },
  { start: 8, end: 15 },
];

function getNimRowCounts(board) {
  return NIM_ROW_BOUNDARIES.map(({ start, end }) => {
    let count = 0;
    for (let i = start; i < end; i++) {
      if (board[i] === 'stone') count++;
    }
    return count;
  });
}

function findNimHardMove(board, turn) {
  // For Misere Nim: strategic play is to leave opponent in losing position.
  // XOR of row counts: want to leave XOR === 0 in normal nim, but in misere
  // the endgame is slightly different.
  const rowCounts = getNimRowCounts(board);
  const nimSum = rowCounts.reduce((a, b) => a ^ b, 0);
  const totalStones = rowCounts.reduce((a, b) => a + b, 0);

  // Try all valid moves, prefer ones that give us the winning position
  const validMoves = getValidMovesNim(board, turn);
  if (validMoves.length === 0) return null;

  // In misere nim, if totalStones === 1 we must take it (and lose) — just return it
  if (totalStones === 1) return { index: validMoves[0].index };

  // Try to find a move that leaves nimSum === 0 in the resulting position,
  // with misere adjustment: if all remaining rows have <= 1, we want an odd number of rows with 1
  for (const move of validMoves) {
    const res = makeNimMove(board, move.index, turn);
    if (!res.valid) continue;
    const newCounts = getNimRowCounts(res.board);
    const newNimSum = newCounts.reduce((a, b) => a ^ b, 0);
    const newTotal = newCounts.reduce((a, b) => a + b, 0);
    const allOneOrZero = newCounts.every(c => c <= 1);

    if (allOneOrZero) {
      // Misere: want odd number of empty rows (i.e. odd number of 0-count rows)
      // Actually: want to leave an odd number of rows with exactly 1 stone
      const onesCount = newCounts.filter(c => c === 1).length;
      // In misere, we want to leave opponent facing an odd number of 1-heaps
      // (so they take one and leave us an even number, eventually they take last)
      if (onesCount % 2 === 1) {
        return { index: move.index };
      }
    } else if (newNimSum === 0) {
      return { index: move.index };
    }
  }

  // Fallback: random valid move
  const chosen = randomChoice(validMoves);
  return chosen ? { index: chosen.index } : null;
}

// ---------------------------------------------------------------------------
// Difficulty: Easy — random valid move
// ---------------------------------------------------------------------------

function easyMove(validMoves) {
  if (validMoves.length === 0) return null;
  const chosen = randomChoice(validMoves);
  return { index: chosen.index };
}

// ---------------------------------------------------------------------------
// Difficulty: Medium — win if possible, block opponent win, else random
// ---------------------------------------------------------------------------

function mediumMoveStandard(validMovesSelf, validMovesOpponent, botRole) {
  if (validMovesSelf.length === 0) return null;
  const opponent = getOpponent(botRole);

  // 1. Try to win
  for (const m of validMovesSelf) {
    if (m.result && m.result.winner === botRole) {
      return { index: m.index };
    }
  }

  // 2. Block opponent wins
  if (validMovesOpponent) {
    const selfIndices = new Set(validMovesSelf.map(m => m.index));
    for (const m of validMovesOpponent) {
      if (m.result && m.result.winner === opponent && selfIndices.has(m.index)) {
        return { index: m.index };
      }
    }
  }

  // 3. Random
  const chosen = randomChoice(validMovesSelf);
  return { index: chosen.index };
}

// ---------------------------------------------------------------------------
// Game-specific getBotMove dispatchers
// ---------------------------------------------------------------------------

function botMoveTTT(roomState, botRole, difficulty) {
  const board = roomState.board;
  const validMoves = getValidMovesTTT(board, botRole);
  if (validMoves.length === 0) return null;

  if (difficulty === 'easy') return easyMove(validMoves);

  const opponent = getOpponent(botRole);
  const opponentMoves = getValidMovesTTT(board, opponent);

  if (difficulty === 'medium') {
    return mediumMoveStandard(validMoves, opponentMoves, botRole);
  }

  // Hard: minimax
  const result = tttMinimax(board, true, botRole);
  if (result.index >= 0) return { index: result.index };
  return easyMove(validMoves);
}

function botMoveConnect4(roomState, botRole, difficulty) {
  const board = roomState.board;
  const validMoves = getValidMovesConnect4(board, botRole);
  if (validMoves.length === 0) return null;

  if (difficulty === 'easy') return easyMove(validMoves);

  const opponent = getOpponent(botRole);
  const opponentMoves = getValidMovesConnect4(board, opponent);

  if (difficulty === 'medium') {
    return mediumMoveStandard(validMoves, opponentMoves, botRole);
  }

  // Hard: win/block + prefer center columns
  // 1. Win
  for (const m of validMoves) {
    if (m.result && m.result.winner === botRole) return { index: m.index };
  }
  // 2. Block
  const selfIndices = new Set(validMoves.map(m => m.index));
  for (const m of opponentMoves) {
    if (m.result && m.result.winner === opponent && selfIndices.has(m.index)) {
      return { index: m.index };
    }
  }
  // 3. Center preference
  const columnPreference = [3, 4, 2, 5, 1, 6, 0];
  for (const col of columnPreference) {
    if (selfIndices.has(col)) return { index: col };
  }
  return easyMove(validMoves);
}

function botMoveOthello(roomState, botRole, difficulty) {
  const board = roomState.board;
  const validMoves = getValidMovesOthello(board, botRole);
  if (validMoves.length === 0) return null;

  if (difficulty === 'easy') return easyMove(validMoves);

  const opponent = getOpponent(botRole);
  const opponentMoves = getValidMovesOthello(board, opponent);

  if (difficulty === 'medium') {
    return mediumMoveStandard(validMoves, opponentMoves, botRole);
  }

  // Hard: win/block + corner strategy
  // 1. Win
  for (const m of validMoves) {
    if (m.result && m.result.winner === botRole) return { index: m.index };
  }
  // 2. Block
  const selfIndices = new Set(validMoves.map(m => m.index));
  for (const m of opponentMoves) {
    if (m.result && m.result.winner === opponent && selfIndices.has(m.index)) {
      return { index: m.index };
    }
  }

  // 3. Corners are very valuable
  const corners = [0, 7, 56, 63];
  // Cells adjacent to corners (dangerous to play)
  const adjacentToCorners = new Set([1, 8, 9, 6, 14, 15, 48, 49, 57, 54, 55, 62]);

  // Prefer corners
  for (const c of corners) {
    if (selfIndices.has(c)) return { index: c };
  }

  // Avoid adjacent-to-corner cells; pick from remaining, preferring more flips
  const safeMoves = validMoves.filter(m => !adjacentToCorners.has(m.index));
  if (safeMoves.length > 0) {
    // Among safe moves, prefer those that flip more pieces
    // We can approximate by counting flips (board diff)
    let bestMove = safeMoves[0];
    let bestFlips = 0;
    for (const m of safeMoves) {
      let flips = 0;
      if (m.board) {
        for (let i = 0; i < 64; i++) {
          if (board[i] !== m.board[i]) flips++;
        }
      }
      if (flips > bestFlips) {
        bestFlips = flips;
        bestMove = m;
      }
    }
    return { index: bestMove.index };
  }

  // Fallback: any valid move (avoid corners-adjacent if possible already exhausted)
  return easyMove(validMoves);
}

function botMoveCheckers(roomState, botRole, difficulty) {
  const board = roomState.board;
  const mustMoveIndex = roomState.mustMoveIndex || null;
  const { moves } = getAllPossibleMoves(board, botRole, mustMoveIndex);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    const chosen = randomChoice(moves);
    return { index: null, data: { fromIndex: chosen.from, toIndex: chosen.to } };
  }

  const opponent = getOpponent(botRole);

  // Medium/Hard: check if any move wins
  for (const m of moves) {
    const res = makeCheckersMove(board, m.from, m.to, botRole, mustMoveIndex);
    if (res.valid && res.result && res.result.winner === botRole) {
      return { index: null, data: { fromIndex: m.from, toIndex: m.to } };
    }
  }

  // Medium: check if opponent could win next, try to avoid
  if (difficulty === 'medium' || difficulty === 'hard') {
    // Prefer jumps (captures) over normal moves
    const jumpMoves = moves.filter(m => m.jumpOver !== null);
    if (jumpMoves.length > 0) {
      const chosen = randomChoice(jumpMoves);
      return { index: null, data: { fromIndex: chosen.from, toIndex: chosen.to } };
    }
  }

  if (difficulty === 'hard') {
    // Prefer moves that advance toward promotion row
    const promotionRow = botRole === 'r' ? 0 : 7;
    let bestMove = null;
    let bestDist = Infinity;
    for (const m of moves) {
      const toRow = Math.floor(m.to / 8);
      const dist = Math.abs(toRow - promotionRow);
      if (dist < bestDist) {
        bestDist = dist;
        bestMove = m;
      }
    }
    if (bestMove) {
      return { index: null, data: { fromIndex: bestMove.from, toIndex: bestMove.to } };
    }
  }

  const chosen = randomChoice(moves);
  return { index: null, data: { fromIndex: chosen.from, toIndex: chosen.to } };
}

function botMoveGomoku(roomState, botRole, difficulty) {
  const board = roomState.board;
  const validMoves = getValidMovesGomoku(board, botRole);
  if (validMoves.length === 0) return null;

  if (difficulty === 'easy') return easyMove(validMoves);

  const opponent = getOpponent(botRole);
  const opponentMoves = getValidMovesGomoku(board, opponent);

  if (difficulty === 'medium') {
    return mediumMoveStandard(validMoves, opponentMoves, botRole);
  }

  // Hard: win/block + prefer near existing pieces + center
  // 1. Win
  for (const m of validMoves) {
    if (m.result && m.result.winner === botRole) return { index: m.index };
  }
  // 2. Block
  const selfIndices = new Set(validMoves.map(m => m.index));
  for (const m of opponentMoves) {
    if (m.result && m.result.winner === opponent && selfIndices.has(m.index)) {
      return { index: m.index };
    }
  }

  // 3. Prefer moves near existing pieces
  const occupied = new Set();
  for (let i = 0; i < 225; i++) {
    if (board[i] !== null) occupied.add(i);
  }

  if (occupied.size === 0) {
    // First move: center
    return { index: 112 }; // 7*15+7 = 112
  }

  // Score each valid move by proximity to existing pieces and center
  const center = 112;
  let bestMove = null;
  let bestScore = -Infinity;

  for (const m of validMoves) {
    const row = Math.floor(m.index / 15);
    const col = m.index % 15;
    let score = 0;

    // Distance to center (closer is better)
    const distCenter = Math.abs(row - 7) + Math.abs(col - 7);
    score -= distCenter * 0.5;

    // Adjacency bonus
    for (const occ of occupied) {
      const oRow = Math.floor(occ / 15);
      const oCol = occ % 15;
      const dist = Math.max(Math.abs(row - oRow), Math.abs(col - oCol));
      if (dist <= 2) score += (3 - dist);
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }

  if (bestMove) return { index: bestMove.index };
  return easyMove(validMoves);
}

function botMoveMancala(roomState, botRole, difficulty) {
  const board = roomState.board;
  const validMoves = getValidMovesMancala(board, botRole);
  if (validMoves.length === 0) return null;

  if (difficulty === 'easy') return easyMove(validMoves);

  // Medium: win if possible, else random
  // 1. Win
  for (const m of validMoves) {
    if (m.result && m.result.winner === botRole) return { index: m.index };
  }

  if (difficulty === 'medium') {
    // 2. Prefer moves that give extra turn
    const extraTurnMoves = validMoves.filter(m => m.nextTurn === botRole);
    if (extraTurnMoves.length > 0) {
      const chosen = randomChoice(extraTurnMoves);
      return { index: chosen.index };
    }
    return easyMove(validMoves);
  }

  // Hard: prefer extra turn moves, then captures, then random
  // Extra turn: landing in own store
  const extraTurnMoves = validMoves.filter(m => m.nextTurn === botRole);
  if (extraTurnMoves.length > 0) {
    // Among extra-turn moves, prefer winning ones first (already checked), then any
    const chosen = randomChoice(extraTurnMoves);
    return { index: chosen.index };
  }

  // Prefer capturing moves: simulate and check if store increased more than stones sown
  const ownStore = botRole === 'X' ? 6 : 13;
  let bestCapture = null;
  let bestCaptureGain = 0;
  for (const m of validMoves) {
    const res = makeMancalaMove(board, m.index, botRole);
    if (res.valid) {
      const gain = res.board[ownStore] - board[ownStore];
      const stonesSown = board[m.index]; // stones that were in this pit
      if (gain > stonesSown && gain > bestCaptureGain) {
        bestCaptureGain = gain;
        bestCapture = m;
      }
    }
  }
  if (bestCapture) return { index: bestCapture.index };

  return easyMove(validMoves);
}

function botMoveDotsBoxes(roomState, botRole, difficulty) {
  const board = roomState.board;
  const validMoves = getValidMovesDotsBoxes(board, botRole);
  if (validMoves.length === 0) return null;

  if (difficulty === 'easy') return easyMove(validMoves);

  // 1. Win
  for (const m of validMoves) {
    if (m.result && m.result.winner === botRole) return { index: m.index };
  }

  // 2. Prefer moves that complete a box (extra turn)
  const boxCompletingMoves = validMoves.filter(m => m.nextTurn === botRole);
  if (boxCompletingMoves.length > 0) {
    // Among these, prefer completing more boxes (if possible)
    return { index: boxCompletingMoves[0].index };
  }

  if (difficulty === 'medium') {
    return easyMove(validMoves);
  }

  // Hard: avoid giving opponent box completions
  // For each valid move, simulate and check if opponent can then complete boxes
  const safeMoves = [];
  const opponent = getOpponent(botRole);

  for (const m of validMoves) {
    const newBoard = m.board;
    // Check if opponent can complete any box after this move
    let opponentCanComplete = false;
    for (let i = 0; i < 60; i++) {
      if (newBoard[i] !== null) continue;
      const oppRes = makeDotsBoxesMove(newBoard, i, opponent);
      if (oppRes.valid && oppRes.nextTurn === opponent) {
        opponentCanComplete = true;
        break;
      }
    }
    if (!opponentCanComplete) {
      safeMoves.push(m);
    }
  }

  if (safeMoves.length > 0) {
    const chosen = randomChoice(safeMoves);
    return { index: chosen.index };
  }

  // If all moves give opponent a box, pick one that gives fewest
  return easyMove(validMoves);
}

function botMoveNim(roomState, botRole, difficulty) {
  const board = roomState.board;
  const validMoves = getValidMovesNim(board, botRole);
  if (validMoves.length === 0) return null;

  if (difficulty === 'easy') return easyMove(validMoves);

  // Medium: avoid taking last stone (misere), check if any move wins
  // 1. Win
  for (const m of validMoves) {
    if (m.result && m.result.winner === botRole) return { index: m.index };
  }
  // 2. Avoid moves where opponent wins
  const opponent = getOpponent(botRole);
  const safeMoves = validMoves.filter(m => !(m.result && m.result.winner === opponent));
  if (difficulty === 'medium') {
    if (safeMoves.length > 0) return easyMove(safeMoves);
    return easyMove(validMoves);
  }

  // Hard: strategic nim play
  return findNimHardMove(board, botRole) || easyMove(validMoves);
}

function botMoveUTTT(roomState, botRole, difficulty) {
  const state = {
    board: roomState.board,
    activeBoard: roomState.activeBoard != null ? roomState.activeBoard : null,
    subBoardWinners: roomState.subBoardWinners || Array(9).fill(null),
  };
  const validMoves = getValidMovesUTTT(state, botRole);
  if (validMoves.length === 0) return null;

  if (difficulty === 'easy') return easyMove(validMoves);

  const opponent = getOpponent(botRole);
  const opponentMoves = getValidMovesUTTT(state, opponent);

  if (difficulty === 'medium') {
    return mediumMoveStandard(validMoves, opponentMoves, botRole);
  }

  // Hard: win/block + prefer center cells within sub-boards
  // 1. Win
  for (const m of validMoves) {
    if (m.result && m.result.winner === botRole) return { index: m.index };
  }
  // 2. Block
  const selfIndices = new Set(validMoves.map(m => m.index));
  for (const m of opponentMoves) {
    if (m.result && m.result.winner === opponent && selfIndices.has(m.index)) {
      return { index: m.index };
    }
  }

  // 3. Prefer center of sub-boards (position 4 within each 3x3)
  // Also prefer winning sub-boards
  for (const m of validMoves) {
    const cellInSub = m.index % 9;
    if (cellInSub === 4) return { index: m.index }; // center of sub-board
  }

  // 4. Prefer corners within sub-boards
  const subCorners = [0, 2, 6, 8];
  for (const m of validMoves) {
    const cellInSub = m.index % 9;
    if (subCorners.includes(cellInSub)) return { index: m.index };
  }

  return easyMove(validMoves);
}

function botMoveChain(roomState, botRole, difficulty) {
  const board = roomState.board;
  const turnOrder = roomState.turnOrder || ['X', 'O'];
  const moveCount = roomState.chainMoveCount || 0;
  const validMoves = getValidMovesChain(board, botRole, turnOrder, moveCount);
  if (validMoves.length === 0) return null;

  if (difficulty === 'easy') return easyMove(validMoves);

  // 1. Win
  for (const m of validMoves) {
    if (m.result && m.result.winner === botRole) return { index: m.index };
  }

  if (difficulty === 'medium') {
    return easyMove(validMoves);
  }

  // Hard: prefer corners and edges (lower critical mass = easier to chain)
  // Also avoid cells near opponent's near-critical cells
  const cornerIndices = [0, 8, 72, 80]; // corners of 9x9
  const edgeIndices = [];
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    if ((row === 0 || row === 8 || col === 0 || col === 8) && !cornerIndices.includes(i)) {
      edgeIndices.push(i);
    }
  }

  const validSet = new Set(validMoves.map(m => m.index));

  // Prefer corners
  for (const c of cornerIndices) {
    if (validSet.has(c)) return { index: c };
  }

  // Prefer edge cells
  for (const e of edgeIndices) {
    if (validSet.has(e)) return { index: e };
  }

  // Center-weighted random
  const centerWeighted = validMoves.map(m => {
    const row = Math.floor(m.index / 9);
    const col = m.index % 9;
    const distCenter = Math.abs(row - 4) + Math.abs(col - 4);
    return { ...m, weight: 10 - distCenter };
  });
  centerWeighted.sort((a, b) => b.weight - a.weight);
  return { index: centerWeighted[0].index };
}

function botMoveMemory(roomState, botRole, difficulty) {
  const memoryState = roomState.memoryState;
  if (!memoryState) return null;

  const validMoves = getValidMovesMemory(memoryState, botRole);
  if (validMoves.length === 0) return null;

  if (difficulty === 'easy') return easyMove(validMoves);

  // Memory is special: the bot can "see" cards (since it has the state).
  // For medium: flip randomly but if we've already flipped one card and know where
  // the match is, go for it.
  // For hard: always pick a matching pair if possible.

  const { cards, revealed, flippedIndices } = memoryState;

  if (flippedIndices.length === 1) {
    // We already flipped one card. Try to find its match.
    const flippedCard = cards[flippedIndices[0]];
    for (const m of validMoves) {
      if (cards[m.index] === flippedCard) {
        return { index: m.index };
      }
    }
    // No match available (shouldn't happen in a valid game)
    return easyMove(validMoves);
  }

  // No cards flipped yet — first flip of a pair
  if (difficulty === 'hard') {
    // Find any pair of unmatched cards and flip the first one
    const hiddenCards = {};
    for (let i = 0; i < 20; i++) {
      if (revealed[i] === 'hidden') {
        const card = cards[i];
        if (hiddenCards[card] !== undefined) {
          // Found a pair — flip the first one
          return { index: hiddenCards[card] };
        }
        hiddenCards[card] = i;
      }
    }
    // Shouldn't reach here if game isn't over
    return easyMove(validMoves);
  }

  // Medium: random first flip
  return easyMove(validMoves);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

function getBotMove(gameType, roomState, botRole, difficulty) {
  try {
    switch (gameType) {
      case 'tictactoe':
        return botMoveTTT(roomState, botRole, difficulty);
      case 'connect4':
        return botMoveConnect4(roomState, botRole, difficulty);
      case 'othello':
        return botMoveOthello(roomState, botRole, difficulty);
      case 'checkers':
        return botMoveCheckers(roomState, botRole, difficulty);
      case 'gomoku':
        return botMoveGomoku(roomState, botRole, difficulty);
      case 'mancala':
        return botMoveMancala(roomState, botRole, difficulty);
      case 'dotsboxes':
        return botMoveDotsBoxes(roomState, botRole, difficulty);
      case 'nim':
        return botMoveNim(roomState, botRole, difficulty);
      case 'uttt':
        return botMoveUTTT(roomState, botRole, difficulty);
      case 'chain':
        return botMoveChain(roomState, botRole, difficulty);
      case 'memory':
        return botMoveMemory(roomState, botRole, difficulty);
      default:
        return null;
    }
  } catch (err) {
    // Graceful fallback: return null if anything blows up
    console.error(`[botLogic] Error for ${gameType}:`, err.message);
    return null;
  }
}

module.exports = { getBotMove };
