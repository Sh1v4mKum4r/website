# Integration Specification

## Games to Register

| Game | id | route | name | desc | modes |
|------|----|-------|------|------|-------|
| Gomoku | gomoku | gomoku | Gomoku | Get five in a row on a 15x15 board! | pnp, 2p |
| Mancala | mancala | mancala | Mancala | Capture stones and fill your store! | pnp, 2p |
| Dots & Boxes | dotsboxes | dots-and-boxes | Dots & Boxes | Draw lines and claim boxes! | pnp, 2p |
| Nim | nim | nim | Nim | Remove stones — but don't take the last one! | pnp, 2p |

## Files to Modify

### 1. client/src/pages/Games.jsx
Add all 4 games to the GAMES array.

### 2. client/src/components/Sidebar.jsx
Add to gameRouteMap: { gomoku: 'gomoku', mancala: 'mancala', dotsboxes: 'dots-and-boxes', nim: 'nim' }
Add to gameNameMap: { gomoku: 'Gomoku', mancala: 'Mancala', dotsboxes: 'Dots & Boxes', nim: 'Nim' }

### 3. client/src/pages/Game.jsx
- Import board components: GomokuBoard, MancalaBoard, DotsBoxesBoard, NimBoard
- Import client logic: gomokuLogic, mancalaLogic, dotsboxesLogic, nimLogic
- In getInitialBoard: add cases for gomoku (Array(225).fill(null)), mancala (getInitialMancalaBoard()), dotsboxes (Array(33).fill(null)), nim (getInitialNimBoard())
- In board rendering JSX: add gameType conditionals to render appropriate board component
- In handleCellClick local mode: add cases for each game calling its logic function
- In game title h2: add display names
- In scoreboard: add display for mancala (store counts), dotsboxes (box counts), others use default X/O score
- Turn initialization: all new games use 'X' as first turn

### 4. server/server.js
- Import server logic modules
- In createRoom: add board initialization for each gameType
- In makeMove: add gameType branches calling appropriate move function
- In restartGame: add board reset for each gameType
- In rematch requestRematch: add board reset for each gameType
- Board sizes: gomoku=225, mancala=14, dotsboxes=33, nim=15
- Timer timeout winner logic: all new games use standard X/O (not b/r)

