# Bug Fix Progress — Round 2 (website_claude branch)

This file tracks all identified bugs and their fix status so Gemini CLI can continue if Claude's token limit is reached.

## How to Continue
- Working directory: `/home/sh4d0w/agentic coding projects/website_antigravity/`
- Branch: `website_claude`
- All source files: `client/src/` (React frontend), `server/` (Express backend)
- After fixing, build: `cd client && npm run build`
- Deploy: `cd client && npm run deploy`

---

## BUG #1: [DONE] CRITICAL — Imposter game leaks all words to all players

**Files:** `server/server.js`

**Problem:** The server sends the FULL `room.wordGameState` to ALL players via `imposterStateUpdate`. This includes `imposterPlayerId`, `words` (mapping every player to their word), `majorityWord`, and `imposterWord`. Players can see everything in browser dev tools / network tab, completely breaking the game.

**Affected locations in server.js:**
- Lines 527-535: Game init when 2nd player joins
- Lines 984-991: `imposterStart` event handler
- Lines 1004-1011: `imposterClue` event handler
- Lines 1036-1043: `imposterVote` event handler
- Lines 1056-1061: `imposterNextRound` event handler
- Lines 1074-1079: `imposterPhaseAdvance` event handler
- Lines 1162-1163: Reconnection handler

**Fix:** Create a helper function `getSafeImposterState(fullState, playerId)` that:
1. Copies the full state
2. Replaces `words` with just `myWord: fullState.words[playerId]`
3. Removes `imposterPlayerId`, `majorityWord`, `imposterWord` (EXCEPT during reveal phase)
4. Use this helper everywhere `imposterStateUpdate` is emitted

```javascript
// Add this helper near the top of server.js
const getSafeImposterState = (state, playerId) => {
  const safe = { ...state };
  safe.myWord = state.words?.[playerId] || '';
  delete safe.words;
  // Only reveal secrets during reveal phase
  if (state.phase !== 'reveal') {
    delete safe.imposterPlayerId;
    delete safe.majorityWord;
    delete safe.imposterWord;
  }
  return safe;
};
```

Then replace every `playerSocket.emit('imposterStateUpdate', room.wordGameState)` with:
```javascript
playerSocket.emit('imposterStateUpdate', getSafeImposterState(room.wordGameState, pid));
```

**Client changes needed in ImposterGame.jsx:**
- Line 102: Change `const myWord = words?.[playerId]` to `const myWord = gameState.myWord`
- Line 103: Change `const isImposter = playerId === imposterPlayerId` — can't know during non-reveal phases. Instead, infer from word comparison or add an `isImposter` boolean to safe state.
- Better approach: Add `isImposter: playerId === state.imposterPlayerId` to the safe state so the client knows their role without seeing who the imposter is.

---

## BUG #2: [DONE] CRITICAL — Scribble game leaks word to all players

**Files:** `server/server.js`, `client/src/components/ScribbleGame.jsx`

**Problem:** `scribbleStateUpdate` sends the full `room.wordGameState` which includes `state.word` — the secret word. Even though the client shows underscores for guessers, the word is visible in browser dev tools.

**Affected locations in server.js:**
- Line 526: Game init
- Line 909: After correct guess
- Line 923: Next round state
- Line 949: `scribbleStart`
- Line 966: `scribbleNextRound`
- Lines 1164-1165: Reconnection

**Fix:** Create a helper:
```javascript
const getSafeScribbleState = (state, playerId) => {
  const safe = { ...state };
  const drawerId = state.drawOrder[state.currentDrawerIndex];
  if (playerId !== drawerId) {
    safe.word = undefined;  // Hide word from non-drawers
    safe.wordLength = state.word?.length || 0;  // Give length hint
  }
  return safe;
};
```

Then instead of `io.to(roomCode).emit('scribbleStateUpdate', ...)`, loop over players and send per-player safe state. For broadcast, use the room's player list.

**Client changes in ScribbleGame.jsx:**
- Line 226-228: `getWordDisplay()` — when word is undefined (non-drawer), use `gameState.wordLength` to generate underscores instead of `gameState.word.replace(...)`.

---

## BUG #3: [DONE] Dead arguments[0] code in createRoom

**File:** `server/server.js`, lines 343-348

**Problem:** Arrow function uses `arguments[0]` which doesn't work — arrow functions don't have `arguments`. Dead code.

**Fix:** Delete lines 343-348:
```javascript
// DELETE THIS:
if (typeof arguments[0] === 'function') {
  callback = arguments[0];
  gameType = "tictactoe";
  seriesLength = 0;
}
```

---

## BUG #4: [DONE] Chat cross-contamination between lobby and game

**Files:** `server/server.js`, `client/src/components/Sidebar.jsx`, `client/src/pages/Game.jsx`

**Problem:** Both Sidebar and Game.jsx listen to global `receiveMessage` without filtering. When a player is in a game room AND lobby, messages from one bleed into the other.

**Fix:**
1. server.js line ~862-877: Add `room` field to emitted message:
```javascript
const msg = { room, message, sender, timestamp, id };
```

2. Sidebar.jsx `handleNewMessage`: Filter for lobby messages:
```javascript
const handleNewMessage = useCallback((msg) => {
  if (msg.room && !msg.room.startsWith('lobby:')) return;
  setChatMessages((prev) => [...prev, msg]);
}, []);
```

3. Game.jsx `handleNewGameChat`: Filter for game room messages:
```javascript
const handleNewGameChat = useCallback((msg) => {
  if (msg.room && msg.room !== roomCode) return;
  setGameChatMessages((prev) => [...prev, msg]);
}, [roomCode]);
```

---

## BUG #5: [DONE] Wordle CSS hardcoded dark theme colors

**File:** `client/src/components/WordleGame.css`

**Problem:** Uses hardcoded colors (#121213, #fff, #3a3a3c, etc.) instead of CSS variables. Breaks light theme.

**Fix:** Replace with `var(--bg-primary)`, `var(--text-primary)`, `var(--border-color)`, etc.

---

## BUG #6: [DONE] Game state race condition — joining player misses gameStart

**Files:** `server/server.js`, `client/src/pages/Game.jsx`

**Problem:** When Player 2 joins, server emits `gameStart` + word game state BEFORE Player 2's Game.jsx mounts listeners. Events are dropped. Word game players see "Waiting for game state..." forever.

**Fix:** Added `requestGameState` server event. Game.jsx emits it after registering all listeners. Server responds with current filtered state. Also stripped `wordGameState` from `gameStart` to prevent secret leaks.

---

## STATUS: ALL 6 BUGS FIXED

## Files Modified:
1. `server/server.js` — Bugs #1, #2, #3, #4
2. `client/src/components/ImposterGame.jsx` — Bug #1 client changes
3. `client/src/components/ScribbleGame.jsx` — Bug #2 client changes
4. `client/src/components/Sidebar.jsx` — Bug #4
5. `client/src/pages/Game.jsx` — Bug #4
6. `client/src/components/WordleGame.css` — Bug #5
