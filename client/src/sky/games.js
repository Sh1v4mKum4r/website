// client/src/sky/games.js
// Star metadata. `id`/`route` mirror server game ids and Game.jsx routes.
export const CLUSTERS = {
  strategy: { label: 'Strategy', color: '#38bdf8' },
  word: { label: 'Word', color: '#f472b6' },
  party: { label: 'Party', color: '#34d399' },
};

export const SKY_GAMES = [
  { id: 'tictactoe', name: 'Tic Tac Toe', route: 'tic-tac-toe', cluster: 'strategy', glyph: '✕' },
  { id: 'connect4', name: 'Connect 4', route: 'connect4', cluster: 'strategy', glyph: '4' },
  { id: 'othello', name: 'Othello', route: 'othello', cluster: 'strategy', glyph: '◕' },
  { id: 'checkers', name: 'Checkers', route: 'checkers', cluster: 'strategy', glyph: '⛃' },
  { id: 'gomoku', name: 'Gomoku', route: 'gomoku', cluster: 'strategy', glyph: '◇' },
  { id: 'mancala', name: 'Mancala', route: 'mancala', cluster: 'strategy', glyph: '⦿' },
  { id: 'dotsboxes', name: 'Dots & Boxes', route: 'dots-and-boxes', cluster: 'strategy', glyph: '▦' },
  { id: 'nim', name: 'Nim', route: 'nim', cluster: 'strategy', glyph: '≡' },
  { id: 'uttt', name: 'Ultimate TTT', route: 'ultimate-tic-tac-toe', cluster: 'strategy', glyph: '⊞' },
  { id: 'chain', name: 'Chain Reaction', route: 'chain-reaction', cluster: 'party', glyph: '⚛' },
  { id: 'memory', name: 'Memory', route: 'memory', cluster: 'party', glyph: '⧉' },
  { id: 'scribble', name: 'Scribble', route: 'scribble', cluster: 'party', glyph: '✎' },
  { id: 'imposter', name: 'Imposter', route: 'imposter-word', cluster: 'party', glyph: '☲' },
  { id: 'wordle', name: 'Wordle', route: 'wordle', cluster: 'word', glyph: '✺' },
];
