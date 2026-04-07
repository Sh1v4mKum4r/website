import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import Board from '../components/Board';
import Connect4Board from '../components/Connect4Board';
import OthelloBoard from '../components/OthelloBoard';
import CheckersBoard from '../components/CheckersBoard';
import GomokuBoard from '../components/GomokuBoard';
import MancalaBoard from '../components/MancalaBoard';
import DotsBoxesBoard from '../components/DotsBoxesBoard';
import NimBoard from '../components/NimBoard';
import UTTTBoard from '../components/UTTTBoard';
import ChainBoard from '../components/ChainBoard';
import MemoryBoard from '../components/MemoryBoard';
import { makeOthelloMove } from '../utils/othelloLogic';
import { getInitialCheckersBoard, makeCheckersMove } from '../utils/checkersLogic';
import { makeGomokuMove } from '../utils/gomokuLogic';
import { getInitialMancalaBoard, makeMancalaMove } from '../utils/mancalaLogic';
import { getInitialDotsBoxesBoard, makeDotsBoxesMove } from '../utils/dotsboxesLogic';
import { getInitialNimBoard, makeNimMove } from '../utils/nimLogic';
import { getInitialUTTTState, makeUTTTMove } from '../utils/utttLogic';
import { getInitialChainBoard, makeChainMove, CHAIN_COLORS } from '../utils/chainLogic';
import { getInitialMemoryState, makeMemoryMove } from '../utils/memoryLogic';
import Chat from '../components/Chat';
import { playMove, playWin, playLose, playJoin, playTimeout, playTick } from '../utils/sounds';
import './Game.css';

function Game() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const initialGameType = location.state?.gameType || 'tictactoe';
  const getInitialBoard = (gType) => {
    if (gType === 'connect4') return Array(42).fill(null);
    if (gType === 'othello') {
      const b = Array(64).fill(null);
      b[27] = 'O'; b[28] = 'X'; b[35] = 'X'; b[36] = 'O';
      return b;
    }
    if (gType === 'checkers') return getInitialCheckersBoard();
    if (gType === 'gomoku') return Array(225).fill(null);
    if (gType === 'mancala') return getInitialMancalaBoard();
    if (gType === 'dotsboxes') return getInitialDotsBoxesBoard();
    if (gType === 'nim') return getInitialNimBoard();
    if (gType === 'uttt') return Array(81).fill(null);
    if (gType === 'chain') return getInitialChainBoard();
    if (gType === 'memory') return null; // Memory uses memoryState instead
    return Array(9).fill(null);
  };
  const [board, setBoard] = useState(getInitialBoard(initialGameType));
  const [turn, setTurn] = useState(initialGameType === 'checkers' ? 'b' : initialGameType === 'chain' ? 'R' : "X");
  const [mustMoveIndex, setMustMoveIndex] = useState(null);
  // UTTT state
  const [activeBoard, setActiveBoard] = useState(null);
  const [subBoardWinners, setSubBoardWinners] = useState(Array(9).fill(null));
  // Chain state
  const [turnOrder, setTurnOrder] = useState(initialGameType === 'chain' ? ['R', 'G'] : null);
  const [chainMoveCount, setChainMoveCount] = useState(0);
  // Memory state
  const [memoryState, setMemoryState] = useState(initialGameType === 'memory' ? getInitialMemoryState(2) : null);
  const [myRole, setMyRole] = useState(location.state?.role || null);
  const [gameType, setGameType] = useState(location.state?.gameType || 'tictactoe');
  const [score, setScore] = useState({ X: 0, O: 0 });
  const [result, setResult] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [isLocal, setIsLocal] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [playerNames, setPlayerNames] = useState([]);
  const [myName, setMyName] = useState(location.state?.playerName || null);
  const [gameMessage, setGameMessage] = useState("Waiting for opponent...");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [gameChatMessages, setGameChatMessages] = useState([]);
  const handleNewGameChat = useCallback((msg) => {
    setGameChatMessages((prev) => [...prev, msg]);
  }, []);

  // F4: Turn Timer
  const [timeLeft, setTimeLeft] = useState(null);

  // F5: Rematch
  const [rematchState, setRematchState] = useState(null); // null | 'requested' | 'received'

  // F6: Series
  const [seriesLength, setSeriesLength] = useState(location.state?.seriesLength || 0);

  // F11: Reconnection
  const [connectionStatus, setConnectionStatus] = useState(null); // null | 'opponent_disconnected' | 'reconnecting'
  const [seriesWinner, setSeriesWinner] = useState(null);

  const myRoleRef = useRef(myRole);

  useEffect(() => {
    myRoleRef.current = myRole;
  }, [myRole]);

  useEffect(() => {
    if (roomCode === 'local') {
      setIsLocal(true);
      setGameStarted(true);
      setGameMessage(initialGameType === 'checkers' ? "Player b's Turn" : initialGameType === 'chain' ? "Player R's Turn" : "Player X's Turn");
    } else {
      const roleFromState = location.state?.role;
      const gameDataFromState = location.state?.gameData;
      const nameFromState = location.state?.playerName;
      if (location.state?.gameType) setGameType(location.state?.gameType);
      if (location.state?.seriesLength) setSeriesLength(location.state.seriesLength);

      setMyRole(roleFromState);
      if (nameFromState) setMyName(nameFromState);

      if (roleFromState === 'spectator') {
        setIsSpectator(true);
        if (gameDataFromState) {
          setGameData(gameDataFromState);
          setGameStarted(true);
          if (gameDataFromState.chatHistory) setGameChatMessages(gameDataFromState.chatHistory);
        }
      } else if (roleFromState === 'O' && gameDataFromState) {
        setGameData(gameDataFromState);
        setGameStarted(true);
        if (gameDataFromState.chatHistory) setGameChatMessages(gameDataFromState.chatHistory);
      }
    }

    socket.on("gameStart", (data) => {
      setGameData(data);
      setGameStarted(true);
      playJoin();
    });

    socket.on("gameUpdate", (data) => {
      // Play move sound if board changed and no result yet
      if (!data.result) playMove();
      setGameData(data);
      setRematchState(null);
    });

    socket.on("opponentLeft", () => {
      setGameMessage("Opponent left the game.");
      setResult({ winner: "opponentLeft" });
      setTimeLeft(null);
      setConnectionStatus(null);
    });

    // Persistent game chat — use named handler so socket.off doesn't clobber Sidebar's listener
    socket.on("receiveMessage", handleNewGameChat);

    // F11: Reconnection events
    socket.on("opponentDisconnected", ({ name }) => {
      setConnectionStatus('opponent_disconnected');
      setGameMessage(`${name} disconnected — waiting for reconnection...`);
    });

    socket.on("playerReconnected", ({ name }) => {
      setConnectionStatus(null);
      setGameMessage(`${name} reconnected!`);
      setTimeout(() => {
        if (!result) {
          setGameMessage(turn === myRoleRef.current ? "Your Turn" : "Opponent's Turn");
        }
      }, 2000);
    });

    // F4: Timer updates from server
    socket.on("timerUpdate", ({ timeLeft: tl }) => {
      setTimeLeft(tl);
      if (tl <= 5 && tl > 0) playTick();
    });

    // F5: Rematch events
    socket.on("rematchRequested", ({ requesterId }) => {
      if (requesterId !== socket.id) {
        setRematchState('received');
      }
    });

    socket.on("rematchDeclined", () => {
      setRematchState(null);
      setGameMessage("Rematch declined.");
    });

    return () => {
      socket.off("gameStart");
      socket.off("gameUpdate");
      socket.off("opponentLeft");
      socket.off("timerUpdate");
      socket.off("rematchRequested");
      socket.off("rematchDeclined");
      socket.off("opponentDisconnected");
      socket.off("playerReconnected");
      socket.off("receiveMessage", handleNewGameChat);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, location.state, navigate]);

  // F4: Local mode timer
  useEffect(() => {
    if (!isLocal || !gameStarted || result) {
      if (result && isLocal) setTimeLeft(null);
      return;
    }

    let t = 30;
    setTimeLeft(t);
    const interval = setInterval(() => {
      t--;
      setTimeLeft(t);
      if (t <= 0) {
        clearInterval(interval);
        let winner;
        if (gameType === 'checkers') {
          winner = turn === 'b' ? 'r' : 'b';
        } else if (gameType === 'chain' && turnOrder) {
          const curIdx = turnOrder.indexOf(turn);
          winner = turnOrder[(curIdx + 1) % turnOrder.length] || 'X';
        } else {
          winner = turn === 'X' ? 'O' : 'X';
        }
        setResult({ winner, line: null, timeout: true });
        setGameMessage(`Time's up! Player ${winner} wins!`);
        playTimeout();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [turn, isLocal, gameStarted, result]);

  useEffect(() => {
    if (!gameStarted || result) return;

    if (isSpectator) {
      const pNames = playerNames.length >= 2 ? playerNames : ['Player X', 'Player O'];
      setGameMessage(`${turn === 'X' ? pNames[0] : pNames[1]}'s Turn`);
    } else if (isLocal) {
      setGameMessage(`Player ${turn}'s Turn`);
    } else {
      setGameMessage(turn === myRole ? "Your Turn" : "Opponent's Turn");
    }
  }, [turn, gameStarted, result, isLocal, isSpectator, myRole, playerNames]);


  const setGameData = (data) => {
    setBoard(data.board);
    setTurn(data.turn);
    setScore(data.score);
    if (data.gameType) setGameType(data.gameType);
    if (data.playerNames) setPlayerNames(data.playerNames);
    if (data.seriesLength !== undefined) setSeriesLength(data.seriesLength);
    if (data.seriesWinner !== undefined) setSeriesWinner(data.seriesWinner);
    if (data.timeLeft !== undefined) setTimeLeft(data.timeLeft);
    if (data.mustMoveIndex !== undefined) setMustMoveIndex(data.mustMoveIndex);
    // UTTT extra state
    if (data.activeBoard !== undefined) setActiveBoard(data.activeBoard);
    if (data.subBoardWinners !== undefined) setSubBoardWinners(data.subBoardWinners);
    // Chain extra state
    if (data.turnOrder !== undefined) setTurnOrder(data.turnOrder);
    if (data.chainMoveCount !== undefined) setChainMoveCount(data.chainMoveCount);
    // Memory extra state
    if (data.memoryState !== undefined) setMemoryState(data.memoryState);
    if (data.result) {
      setResult(data.result);
      setTimeLeft(null);
      if (data.result.timeout) {
        const winner = data.result.winner;
        if (isSpectator) {
          const pNames = data.playerNames || playerNames;
          setGameMessage(`Time's up! ${winner === 'X' ? pNames[0] || 'X' : pNames[1] || 'O'} wins!`);
        } else if (isLocal) {
          setGameMessage(`Time's up! Player ${winner} wins!`);
        } else {
          setGameMessage(winner === myRoleRef.current ? "Opponent timed out — You Win!" : "Time's up — You Lose!");
        }
        if (!isSpectator) {
          if (winner === myRoleRef.current || isLocal) playTimeout();
          else playTimeout();
        }
      } else if (data.result.winner === 'draw') {
        setGameMessage("It's a draw!");
      } else {
        const winner = data.result.winner;
        if (isSpectator) {
          const pNames = data.playerNames || playerNames;
          setGameMessage(`${winner === 'X' ? pNames[0] || 'X' : pNames[1] || 'O'} Wins!`);
        } else if (isLocal) {
          setGameMessage(`Player ${winner} Wins!`);
        } else {
          setGameMessage(winner === myRoleRef.current ? "You Win!" : "You Lose!");
          if (winner === myRoleRef.current) playWin(); else playLose();
        }
      }
      // F6: Check series winner
      if (data.seriesWinner) {
        setSeriesWinner(data.seriesWinner);
      }
    } else {
      setResult(null);
      setSeriesWinner(null);
    }
  };

  const handleCellClick = (index) => {
    if (isSpectator) return;
    if (result) return;

    if (isLocal) {
      if (turn) {
        if (gameType === 'connect4') {
          const cols = 7, rows = 6;
          let targetIdx = -1;
          for (let r = rows - 1; r >= 0; r--) {
            const idx = r * cols + index;
            if (board[idx] === null) { targetIdx = idx; break; }
          }
          if (targetIdx === -1) return;
          const newBoard = [...board];
          newBoard[targetIdx] = turn;
          setBoard(newBoard);
          const localResult = checkLocalConnect4Winner(newBoard);
          if (localResult) {
            setResult(localResult);
            if (localResult.winner === 'draw') setGameMessage("It's a draw!");
            else setGameMessage(`Player ${localResult.winner} wins!`);
          } else {
            setTurn(turn === "X" ? "O" : "X");
          }
        } else if (gameType === 'othello') {
          const moveResult = makeOthelloMove(board, index, turn);
          if (!moveResult.valid) return;

          setBoard(moveResult.board);
          if (moveResult.result) {
            setResult(moveResult.result);
            if (moveResult.result.winner === 'draw') setGameMessage("It's a draw!");
            else setGameMessage(`Player ${moveResult.result.winner} wins!`);
          } else {
            setTurn(moveResult.nextTurn);
          }
        } else if (gameType === 'gomoku') {
          const moveResult = makeGomokuMove(board, index, turn);
          if (!moveResult.valid) return;

          setBoard(moveResult.board);
          if (moveResult.result) {
            setResult(moveResult.result);
            if (moveResult.result.winner === 'draw') setGameMessage("It's a draw!");
            else setGameMessage(`Player ${moveResult.result.winner} wins!`);
          } else {
            setTurn(turn === 'X' ? 'O' : 'X');
          }
        } else if (gameType === 'mancala') {
          const moveResult = makeMancalaMove(board, index, turn);
          if (!moveResult.valid) return;

          setBoard(moveResult.board);
          if (moveResult.result) {
            setResult(moveResult.result);
            if (moveResult.result.winner === 'draw') setGameMessage("It's a draw!");
            else setGameMessage(`Player ${moveResult.result.winner} wins!`);
          } else {
            setTurn(moveResult.nextTurn);
          }
        } else if (gameType === 'dotsboxes') {
          const moveResult = makeDotsBoxesMove(board, index, turn);
          if (!moveResult.valid) return;

          setBoard(moveResult.board);
          if (moveResult.result) {
            setResult(moveResult.result);
            if (moveResult.result.winner === 'draw') setGameMessage("It's a draw!");
            else setGameMessage(`Player ${moveResult.result.winner} wins!`);
          } else {
            setTurn(moveResult.nextTurn);
          }
        } else if (gameType === 'nim') {
          const moveResult = makeNimMove(board, index, turn);
          if (!moveResult.valid) return;

          setBoard(moveResult.board);
          if (moveResult.result) {
            setResult(moveResult.result);
            if (moveResult.result.winner === 'draw') setGameMessage("It's a draw!");
            else setGameMessage(`Player ${moveResult.result.winner} wins!`);
          } else {
            setTurn(moveResult.nextTurn);
          }
        } else if (gameType === 'uttt') {
          const state = { board, activeBoard, subBoardWinners };
          const moveResult = makeUTTTMove(state, index, turn);
          if (!moveResult.valid) return;

          setBoard(moveResult.board);
          setActiveBoard(moveResult.activeBoard);
          setSubBoardWinners(moveResult.subBoardWinners);
          if (moveResult.result) {
            setResult(moveResult.result);
            if (moveResult.result.winner === 'draw') setGameMessage("It's a draw!");
            else setGameMessage(`Player ${moveResult.result.winner} wins!`);
          } else {
            setTurn(moveResult.nextTurn);
          }
        } else if (gameType === 'chain') {
          const currentTurnOrder = turnOrder || ['R', 'G'];
          if (!currentTurnOrder) return;
          const moveResult = makeChainMove(board, index, turn, currentTurnOrder, chainMoveCount);
          if (!moveResult.valid) return;

          setBoard(moveResult.board);
          setTurnOrder(moveResult.turnOrder);
          setChainMoveCount(moveResult.moveCount);
          if (moveResult.result) {
            setResult(moveResult.result);
            if (moveResult.result.winner === 'draw') setGameMessage("It's a draw!");
            else setGameMessage(`Player ${moveResult.result.winner} wins!`);
          } else {
            setTurn(moveResult.nextTurn);
          }
        } else if (gameType === 'memory') {
          if (!memoryState) return;
          const moveResult = makeMemoryMove(memoryState, index, turn);
          if (!moveResult.valid) return;

          const newState = {
            cards: moveResult.cards,
            revealed: moveResult.revealed,
            matchedBy: moveResult.matchedBy,
            flippedIndices: moveResult.flippedIndices,
            scores: moveResult.scores,
            turnOrder: moveResult.turnOrder,
            moveCount: moveResult.moveCount,
          };
          setMemoryState(newState);

          if (moveResult.result) {
            setResult(moveResult.result);
            if (moveResult.result.winner === 'draw') setGameMessage("It's a draw!");
            else setGameMessage(`Player ${moveResult.result.winner} wins!`);
          } else {
            setTurn(moveResult.nextTurn);
            if (moveResult.needsFlipBack) {
              const flipIndices = moveResult.flipBackIndices;
              const nextT = moveResult.nextTurn;
              setTimeout(() => {
                setMemoryState(prev => {
                  if (!prev) return prev;
                  const newRevealed = [...prev.revealed];
                  for (const idx of flipIndices) {
                    if (newRevealed[idx] === 'flipped') newRevealed[idx] = 'hidden';
                  }
                  return { ...prev, revealed: newRevealed, flippedIndices: [] };
                });
                setTurn(nextT);
              }, 1500);
            }
          }
        } else {
          if (board[index]) return;
          const newBoard = [...board];
          newBoard[index] = turn;
          setBoard(newBoard);
          const localResult = checkLocalWinner(newBoard);
          if (localResult) {
            setResult(localResult);
            if (localResult.winner === 'draw') setGameMessage("It's a draw!");
            else setGameMessage(`Player ${localResult.winner} wins!`);
          } else {
            setTurn(turn === "X" ? "O" : "X");
          }
        }
      }
    } else {
      // For standard grid games, skip if cell is already occupied
      // (connect4, mancala, dotsboxes, nim handle validity server-side)
      const skipOccupiedCheck = ['connect4', 'mancala', 'dotsboxes', 'nim', 'uttt', 'chain', 'memory'];
      if (!skipOccupiedCheck.includes(gameType) && board[index]) return;
      if (turn === myRole) {
        socket.emit("makeMove", { code: roomCode, index, player: myRole });
      }
    }
  };

  const handleCheckersMove = (fromIndex, toIndex) => {
    if (isSpectator || result) return;
    if (isLocal) {
        if (!turn) return;
        const moveResult = makeCheckersMove(board, fromIndex, toIndex, turn, mustMoveIndex);
        if (!moveResult.valid) return;
        
        setBoard(moveResult.board);
        setMustMoveIndex(moveResult.mustMoveIndex);
        if (moveResult.result) {
            setResult(moveResult.result);
            if (moveResult.result.winner === 'draw') setGameMessage("It's a draw!");
            else setGameMessage(`Player ${moveResult.result.winner} wins!`);
        } else {
            setTurn(moveResult.nextTurn);
        }
    } else {
        if (turn === myRole) {
            socket.emit("makeMove", { code: roomCode, index: null, player: myRole, data: { fromIndex, toIndex } });
        }
    }
  };

  const handleRestart = () => {
    if (isLocal) {
      if (gameType === 'memory') {
        const fresh = getInitialMemoryState(2);
        setMemoryState(fresh);
        setBoard(null);
        setTurn(fresh.turnOrder[0]);
      } else {
        setBoard(getInitialBoard(gameType));
      }
      if (gameType !== 'memory') {
        setTurn(gameType === 'checkers' ? 'b' : gameType === 'chain' ? 'R' : "X");
      }
      setResult(null);
      setMustMoveIndex(null);
      if (gameType === 'uttt') {
        setActiveBoard(null);
        setSubBoardWinners(Array(9).fill(null));
      }
      if (gameType === 'chain') {
        setTurnOrder(['R', 'G']);
        setChainMoveCount(0);
      }
      setGameMessage(gameType === 'checkers' ? "Player b's Turn" : gameType === 'chain' ? "Player R's Turn" : "Player X's Turn");
    } else {
      socket.emit("restartGame", roomCode);
    }
  };

  // F5: Rematch handlers
  const handleRequestRematch = () => {
    socket.emit("requestRematch", roomCode);
    setRematchState('requested');
  };

  const handleAcceptRematch = () => {
    socket.emit("requestRematch", roomCode);
    setRematchState(null);
  };

  const handleDeclineRematch = () => {
    socket.emit("declineRematch", roomCode);
    setRematchState(null);
  };

  const handleExit = () => {
    if (!isLocal) {
      if (isSpectator) {
        socket.emit('leaveSpectate', roomCode);
      } else {
        socket.emit('leaveRoom', roomCode);
      }
    }
    navigate('/games');
  };

  const checkLocalWinner = (currentBoard) => {
    const wins = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    for (let w of wins) {
      const [a, b, c] = w;
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c])
        return { winner: currentBoard[a], line: w };
    }
    if (!currentBoard.includes(null)) return { winner: "draw", line: null };
    return null;
  };

  const checkLocalConnect4Winner = (currentBoard) => {
    const ROWS = 6, COLS = 7;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const idx = r * COLS + c;
        if (currentBoard[idx] && currentBoard[idx] === currentBoard[idx + 1] && currentBoard[idx] === currentBoard[idx + 2] && currentBoard[idx] === currentBoard[idx + 3])
          return { winner: currentBoard[idx], line: [idx, idx + 1, idx + 2, idx + 3] };
      }
    }
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = r * COLS + c;
        if (currentBoard[idx] && currentBoard[idx] === currentBoard[idx + COLS] && currentBoard[idx] === currentBoard[idx + 2 * COLS] && currentBoard[idx] === currentBoard[idx + 3 * COLS])
          return { winner: currentBoard[idx], line: [idx, idx + COLS, idx + 2 * COLS, idx + 3 * COLS] };
      }
    }
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const idx = r * COLS + c;
        if (currentBoard[idx] && currentBoard[idx] === currentBoard[idx + COLS + 1] && currentBoard[idx] === currentBoard[idx + 2 * COLS + 2] && currentBoard[idx] === currentBoard[idx + 3 * COLS + 3])
          return { winner: currentBoard[idx], line: [idx, idx + COLS + 1, idx + 2 * COLS + 2, idx + 3 * COLS + 3] };
      }
    }
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const idx = r * COLS + c;
        if (currentBoard[idx] && currentBoard[idx] === currentBoard[idx - COLS + 1] && currentBoard[idx] === currentBoard[idx - 2 * COLS + 2] && currentBoard[idx] === currentBoard[idx - 3 * COLS + 3])
          return { winner: currentBoard[idx], line: [idx, idx - COLS + 1, idx - 2 * COLS + 2, idx - 3 * COLS + 3] };
      }
    }
    if (!currentBoard.includes(null)) return { winner: "draw", line: null };
    return null;
  };

  const winsNeeded = seriesLength > 0 ? Math.ceil(seriesLength / 2) : 0;

  return (
    <div className="game-container">
      <h2>{gameType === 'connect4' ? 'Connect 4' : gameType === 'othello' ? 'Othello' : gameType === 'checkers' ? 'Checkers' : gameType === 'gomoku' ? 'Gomoku' : gameType === 'mancala' ? 'Mancala' : gameType === 'dotsboxes' ? 'Dots & Boxes' : gameType === 'nim' ? 'Nim' : gameType === 'uttt' ? 'Ultimate Tic Tac Toe' : gameType === 'chain' ? 'Chain Reaction' : gameType === 'memory' ? 'Memory' : 'Tic Tac Toe'}</h2>
      {isSpectator && <div className="spectator-badge">👁 Spectating</div>}
      {!isLocal && !isSpectator && myName && <div className="player-names">Playing as {myName} ({myRole === 'b' ? 'Black' : myRole === 'r' ? 'Red' : myRole})</div>}
      {isSpectator && playerNames.length >= 2 && (
        <div className="player-names">{playerNames[0]} ({gameType === 'checkers' ? 'Black' : 'X'}) vs {playerNames[1]} ({gameType === 'checkers' ? 'Red' : 'O'})</div>
      )}

      {/* F6: Series Progress */}
      {seriesLength > 0 && (
        <div className="series-info">
          Best of {seriesLength} — Need {winsNeeded} to win
          <div className="series-dots">
            {Array.from({ length: seriesLength }).map((_, i) => (
              <span key={i} className={`series-dot ${i < score.X ? 'x-win' : i < score.X + score.O ? 'o-win' : ''}`}></span>
            ))}
          </div>
        </div>
      )}

      <div id="scoreboard">
        {gameType === 'othello' ? (
          `Black (X): ${board.filter(c => c === 'X').length} | White (O): ${board.filter(c => c === 'O').length}`
        ) : gameType === 'checkers' ? (
          `Black: ${board.filter(c => c && c.toLowerCase() === 'b').length} | Red: ${board.filter(c => c && c.toLowerCase() === 'r').length}`
        ) : gameType === 'mancala' ? (
          `X Store: ${board[6]} | O Store: ${board[13]}`
        ) : gameType === 'dotsboxes' ? (
          `X Boxes: ${board.slice(24).filter(c => c === 'X').length} | O Boxes: ${board.slice(24).filter(c => c === 'O').length}`
        ) : gameType === 'nim' ? (
          `Stones left: ${board.filter(c => c === 'stone').length}`
        ) : gameType === 'memory' && memoryState?.scores ? (
          Object.entries(memoryState.scores).map(([p, s]) => `${p}: ${s}`).join(' | ')
        ) : gameType === 'chain' && turnOrder ? (
          `Current: ${turn} | Players: ${turnOrder.join(', ')}`
        ) : (
          `X: ${score.X} | O: ${score.O}`
        )}
      </div>

      {/* F4: Timer */}
      {timeLeft !== null && !result && (
        <div className={`timer ${timeLeft <= 5 ? 'critical' : timeLeft <= 10 ? 'warning' : ''}`}>
          ⏱ {timeLeft}s
        </div>
      )}

      {gameType === 'connect4' ? (
        <Connect4Board board={board} onColumnClick={handleCellClick} winningLine={result?.line} turn={turn} />
      ) : gameType === 'othello' ? (
        <OthelloBoard board={board} onCellClick={handleCellClick} turn={turn} />
      ) : gameType === 'checkers' ? (
        <CheckersBoard board={board} onMove={handleCheckersMove} turn={turn} myRole={myRole} isLocal={isLocal} />
      ) : gameType === 'gomoku' ? (
        <GomokuBoard board={board} onCellClick={handleCellClick} winningLine={result?.line} turn={turn} />
      ) : gameType === 'mancala' ? (
        <MancalaBoard board={board} onCellClick={handleCellClick} turn={turn} myRole={myRole} isLocal={isLocal} />
      ) : gameType === 'dotsboxes' ? (
        <DotsBoxesBoard board={board} onCellClick={handleCellClick} turn={turn} />
      ) : gameType === 'nim' ? (
        <NimBoard board={board} onCellClick={handleCellClick} turn={turn} />
      ) : gameType === 'uttt' ? (
        <UTTTBoard board={board} activeBoard={activeBoard} subBoardWinners={subBoardWinners} onCellClick={handleCellClick} turn={turn} />
      ) : gameType === 'chain' ? (
        <ChainBoard board={board} onCellClick={handleCellClick} turn={turn} turnOrder={turnOrder || ['R', 'G']} />
      ) : gameType === 'memory' && memoryState ? (
        <MemoryBoard state={memoryState} onCardClick={handleCellClick} currentPlayer={turn} />
      ) : (
        <Board board={board} onCellClick={handleCellClick} winningLine={result?.line} />
      )}

      <div id="turnIndicator">{gameMessage}</div>

      {/* F6: Series Winner */}
      {seriesWinner && (
        <div className="series-winner">
          🏆 {isSpectator
            ? `${seriesWinner === 'X' ? playerNames[0] || 'X' : playerNames[1] || 'O'} wins the series!`
            : isLocal
              ? `Player ${seriesWinner} wins the series!`
              : seriesWinner === myRole ? "You win the series!" : "You lost the series!"
          }
        </div>
      )}

      <div className="controls">
        {/* F5: Rematch UI (online) */}
        {result && !isSpectator && !isLocal && (
          <>
            {rematchState === null && (
              <button className="rematch-btn" onClick={handleRequestRematch}>Rematch</button>
            )}
            {rematchState === 'requested' && (
              <button className="rematch-btn waiting" disabled>Waiting for opponent...</button>
            )}
            {rematchState === 'received' && (
              <div className="rematch-prompt">
                <span>Rematch?</span>
                <button className="accept-btn" onClick={handleAcceptRematch}>Accept</button>
                <button className="decline-btn" onClick={handleDeclineRematch}>Decline</button>
              </div>
            )}
          </>
        )}

        {/* Local mode keeps simple restart */}
        {result && isLocal && <button onClick={handleRestart}>Restart</button>}

        <button onClick={() => setIsChatOpen(!isChatOpen)} className="chat-toggle-btn">
          {isChatOpen ? 'Close Chat' : 'Chat'}
        </button>
        <button onClick={handleExit}>{isSpectator ? 'Stop Watching' : 'Exit to Lobby'}</button>
      </div>

      {isChatOpen && (
        <div className="game-chat-overlay">
          <Chat roomCode={roomCode} senderName={myName || (isSpectator ? "Spectator" : "Player")} messages={gameChatMessages} onNewMessage={handleNewGameChat} />
        </div>
      )}

      {/* F11: Reconnection overlay */}
      {connectionStatus === 'opponent_disconnected' && (
        <div className="reconnection-overlay">
          <div className="reconnection-message">
            <h3>⚠️ Opponent Disconnected</h3>
            <p>Waiting for them to reconnect...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Game;
