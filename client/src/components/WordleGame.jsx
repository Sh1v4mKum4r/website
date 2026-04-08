import React, { useState, useEffect, useCallback, useRef } from 'react';
import './WordleGame.css';

// Import server logic for local/pnp mode (bundled via Vite)
import { WORDLE_WORDS, getInitialWordleState, submitGuess } from '../utils/wordleLogic';

const KEYBOARD_ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['Enter','z','x','c','v','b','n','m','Backspace'],
];

// Priority: correct > present > absent > unused
const STATUS_PRIORITY = { correct: 3, present: 2, absent: 1 };

const WordleGame = ({ roomCode, socket, playerName, playerId, isLocal, gameState: externalGameState, initialState }) => {
  const [state, setState] = useState(initialState || null);
  const [currentGuess, setCurrentGuess] = useState('');
  const [shakeRow, setShakeRow] = useState(-1);
  const [flipRow, setFlipRow] = useState(-1);
  const [bounceRow, setBounceRow] = useState(-1);
  const [message, setMessage] = useState('');
  const [letterStatuses, setLetterStatuses] = useState({});
  const [revealedRows, setRevealedRows] = useState(new Set());
  const gameRef = useRef(null);

  // Initialize game
  useEffect(() => {
    if (isLocal) {
      const initial = getInitialWordleState();
      setState(initial);
      setCurrentGuess('');
      setLetterStatuses({});
      setRevealedRows(new Set());
      setMessage('');
    }
  }, [isLocal]);

  // Socket listeners for online mode
  useEffect(() => {
    if (isLocal || !socket) return;

    const handleStateUpdate = (data) => {
      setState(data.state);
      if (data.feedback) {
        // Trigger flip animation for the latest guess row
        const rowIdx = data.state.guesses.length - 1;
        triggerFlip(rowIdx, data.feedback);
      }
      if (data.state.result === 'win') {
        const rowIdx = data.state.guesses.length - 1;
        setTimeout(() => triggerBounce(rowIdx), 1800);
        setMessage('You got it!');
      } else if (data.state.result === 'loss') {
        setMessage(`The word was: ${data.state.word.toUpperCase()}`);
      }
      if (data.reason) {
        setMessage(data.reason);
        setTimeout(() => setMessage(''), 2000);
      }
    };

    socket.on('wordleStateUpdate', handleStateUpdate);
    return () => socket.off('wordleStateUpdate', handleStateUpdate);
  }, [isLocal, socket]);

  // Update letter statuses from all guesses
  const updateLetterStatuses = useCallback((guesses) => {
    const statuses = {};
    for (const { feedback } of guesses) {
      for (const { letter, status } of feedback) {
        const current = statuses[letter];
        if (!current || STATUS_PRIORITY[status] > STATUS_PRIORITY[current]) {
          statuses[letter] = status;
        }
      }
    }
    setLetterStatuses(statuses);
  }, []);

  const triggerFlip = useCallback((rowIdx, feedback) => {
    setFlipRow(rowIdx);
    // After all tiles have flipped, update letter statuses
    setTimeout(() => {
      setFlipRow(-1);
      setRevealedRows(prev => new Set(prev).add(rowIdx));
    }, 250 * 5 + 500); // stagger 250ms per tile + 500ms for the flip
  }, []);

  const triggerBounce = useCallback((rowIdx) => {
    setBounceRow(rowIdx);
    setTimeout(() => setBounceRow(-1), 1500);
  }, []);

  const triggerShake = useCallback((rowIdx) => {
    setShakeRow(rowIdx);
    setTimeout(() => setShakeRow(-1), 600);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!state || state.result) return;
    if (currentGuess.length !== 5) {
      triggerShake(state.guesses.length);
      setMessage('Not enough letters');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    if (isLocal) {
      const result = submitGuess(state, currentGuess);
      if (!result.valid) {
        triggerShake(state.guesses.length);
        setMessage(result.reason);
        setTimeout(() => setMessage(''), 2000);
        return;
      }

      const rowIdx = result.newState.guesses.length - 1;
      setState(result.newState);
      setCurrentGuess('');
      triggerFlip(rowIdx, result.feedback);

      // Delay letter status update until after flip completes
      setTimeout(() => {
        updateLetterStatuses(result.newState.guesses);
      }, 250 * 5 + 500);

      if (result.newState.result === 'win') {
        setTimeout(() => {
          triggerBounce(rowIdx);
          setMessage('Brilliant!');
        }, 250 * 5 + 600);
      } else if (result.newState.result === 'loss') {
        setTimeout(() => {
          setMessage(`The word was: ${result.newState.word.toUpperCase()}`);
        }, 250 * 5 + 600);
      }
    } else if (socket) {
      socket.emit('wordleGuess', { roomCode, guess: currentGuess });
      setCurrentGuess('');
    }
  }, [state, currentGuess, isLocal, socket, roomCode, triggerFlip, triggerBounce, triggerShake, updateLetterStatuses]);

  const handleKey = useCallback((key) => {
    if (!state || state.result) return;

    if (key === 'Enter') {
      handleSubmit();
      return;
    }

    if (key === 'Backspace') {
      setCurrentGuess(prev => prev.slice(0, -1));
      return;
    }

    if (/^[a-zA-Z]$/.test(key) && currentGuess.length < 5) {
      setCurrentGuess(prev => prev + key.toLowerCase());
    }
  }, [state, currentGuess, handleSubmit]);

  // Physical keyboard support
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter' || e.key === 'Backspace' || /^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleKey(e.key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKey]);

  // Focus the game container for keyboard events
  useEffect(() => {
    if (gameRef.current) gameRef.current.focus();
  }, []);

  const handleRestart = () => {
    const initial = getInitialWordleState();
    setState(initial);
    setCurrentGuess('');
    setLetterStatuses({});
    setRevealedRows(new Set());
    setFlipRow(-1);
    setShakeRow(-1);
    setBounceRow(-1);
    setMessage('');
  };

  if (!state) return <div className="wordle-game"><p>Loading...</p></div>;

  // Build the 6x5 grid
  const rows = [];
  for (let r = 0; r < state.maxGuesses; r++) {
    const tiles = [];
    const isCurrentRow = r === state.guesses.length && !state.result;
    const isSubmitted = r < state.guesses.length;
    const isFlipping = flipRow === r;
    const isShaking = shakeRow === r;
    const isBouncing = bounceRow === r;
    const isRevealed = revealedRows.has(r);

    for (let c = 0; c < 5; c++) {
      let letter = '';
      let statusClass = '';
      let flipDelay = '';
      let bounceDelay = '';

      if (isSubmitted) {
        const guessData = state.guesses[r];
        letter = guessData.feedback[c].letter;
        if (isRevealed || !isFlipping) {
          statusClass = guessData.feedback[c].status;
        }
        if (isFlipping) {
          flipDelay = `${c * 250}ms`;
          statusClass = guessData.feedback[c].status;
        }
      } else if (isCurrentRow && c < currentGuess.length) {
        letter = currentGuess[c];
      }

      if (isBouncing) {
        bounceDelay = `${c * 100}ms`;
      }

      const filled = letter !== '';

      tiles.push(
        <div
          key={c}
          className={`wordle-tile${filled ? ' filled' : ''}${statusClass ? ` ${statusClass}` : ''}${isFlipping ? ' flip' : ''}${isBouncing ? ' bounce' : ''}`}
          style={{
            ...(isFlipping ? { animationDelay: flipDelay } : {}),
            ...(isBouncing ? { animationDelay: bounceDelay } : {}),
          }}
        >
          <span className="wordle-tile-letter">{letter.toUpperCase()}</span>
        </div>
      );
    }

    rows.push(
      <div key={r} className={`wordle-row${isShaking ? ' shake' : ''}`}>
        {tiles}
      </div>
    );
  }

  return (
    <div className="wordle-game" ref={gameRef} tabIndex={-1}>
      <div className="wordle-header">
        <h2>Wordle</h2>
      </div>

      {message && <div className="wordle-message">{message}</div>}

      <div className="wordle-board">
        {rows}
      </div>

      <div className="wordle-keyboard">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="wordle-keyboard-row">
            {row.map((key) => {
              const isSpecial = key === 'Enter' || key === 'Backspace';
              const displayKey = key === 'Backspace' ? '⌫' : key === 'Enter' ? 'ENTER' : key.toUpperCase();
              const keyStatus = letterStatuses[key.toLowerCase()] || '';

              return (
                <button
                  key={key}
                  className={`wordle-key${isSpecial ? ' special' : ''}${keyStatus ? ` ${keyStatus}` : ''}`}
                  onClick={() => handleKey(key)}
                  aria-label={key}
                >
                  {displayKey}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {state.result && (
        <div className="wordle-controls">
          {isLocal && <button className="wordle-restart-btn" onClick={handleRestart}>Play Again</button>}
        </div>
      )}
    </div>
  );
};

export default WordleGame;
