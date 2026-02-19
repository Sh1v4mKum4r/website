import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import Board from '../components/Board';
import './Game.css';

function Game() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [myRole, setMyRole] = useState(null);
  const [score, setScore] = useState({ X: 0, O: 0 });
  const [result, setResult] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [isLocal, setIsLocal] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [playerNames, setPlayerNames] = useState([]);
  const [myName, setMyName] = useState(null);
  const [gameMessage, setGameMessage] = useState("Waiting for opponent...");

  useEffect(() => {
    if (roomCode === 'local') {
      setIsLocal(true);
      setGameStarted(true);
      setGameMessage("Player X's Turn");
    } else {
      const roleFromState = location.state?.role;
      const gameDataFromState = location.state?.gameData;
      const nameFromState = location.state?.playerName;
      setMyRole(roleFromState);
      if (nameFromState) setMyName(nameFromState);

      // Spectator mode
      if (roleFromState === 'spectator') {
        setIsSpectator(true);
        if (gameDataFromState) {
          setGameData(gameDataFromState);
          setGameStarted(true);
        }
      }
      // Joiner gets game data from sidebar callback
      else if (roleFromState === 'O' && gameDataFromState) {
        setGameData(gameDataFromState);
        setGameStarted(true);
      }
    }

    socket.on("gameStart", (data) => {
      setGameData(data);
      setGameStarted(true);
    });

    socket.on("gameUpdate", (data) => {
      setGameData(data);
    });

    socket.on("opponentLeft", () => {
      setGameMessage("Opponent left the game.");
      setResult({ winner: "opponentLeft" });
    });

    return () => {
      socket.off("gameStart");
      socket.off("gameUpdate");
      socket.off("opponentLeft");
    };
  }, [roomCode, location.state, navigate]);

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
    if (data.playerNames) setPlayerNames(data.playerNames);
    if (data.result) {
      setResult(data.result);
      if (data.result.winner === 'draw') {
        setGameMessage("It's a draw!");
      } else {
        const winner = data.result.winner;
        if (isSpectator) {
          const pNames = data.playerNames || playerNames;
          setGameMessage(`${winner === 'X' ? pNames[0] || 'X' : pNames[1] || 'O'} Wins!`);
        } else if (isLocal) {
          setGameMessage(`Player ${winner} Wins!`);
        } else {
          setGameMessage(winner === myRole ? "You Win!" : "You Lose!");
        }
      }
    } else {
      setResult(null);
    }
  };

  const handleCellClick = (index) => {
    if (isSpectator) return; // Spectators can't make moves
    if (board[index] || result) return;

    if (isLocal) {
      if (turn) {
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
    } else {
      if (turn === myRole) {
        socket.emit("makeMove", { code: roomCode, index, player: myRole });
      }
    }
  };

  const handleRestart = () => {
    if (isLocal) {
      setBoard(Array(9).fill(null));
      setTurn("X");
      setResult(null);
      setGameMessage("Player X's Turn");
    } else {
      socket.emit("restartGame", roomCode);
    }
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

  return (
    <div className="game-container">
      <h2>Tic Tac Toe</h2>
      {isSpectator && <div className="spectator-badge">👁 Spectating</div>}
      {!isLocal && !isSpectator && <div id="roomInfo">Room Code: {roomCode}</div>}
      {!isLocal && !isSpectator && myName && <div className="player-names">Playing as {myName} ({myRole})</div>}
      {isSpectator && playerNames.length >= 2 && (
        <div className="player-names">{playerNames[0]} (X) vs {playerNames[1]} (O)</div>
      )}
      <div id="scoreboard">X: {score.X} | O: {score.O}</div>

      <Board board={board} onCellClick={handleCellClick} winningLine={result?.line} />

      <div id="turnIndicator">{gameMessage}</div>
      <div className="controls">
        {result && !isSpectator && <button onClick={handleRestart}>Restart</button>}
        <button onClick={handleExit}>{isSpectator ? 'Stop Watching' : 'Exit to Lobby'}</button>
      </div>
    </div>
  );
}

export default Game;
