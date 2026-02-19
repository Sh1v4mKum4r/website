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
  const [gameMessage, setGameMessage] = useState("Waiting for opponent...");

  useEffect(() => {
    if (roomCode === 'local') {
      setIsLocal(true);
      setGameStarted(true);
      setGameMessage("Player X's Turn");
    } else {
      const roleFromState = location.state?.role;
      setMyRole(roleFromState);

      // The creator (role 'X') is already in the room.
      // A joiner (role 'O' or coming from a direct link) needs to join.
      if (roleFromState !== 'X') {
        socket.emit("joinRoom", roomCode, ({ error, code, role }) => {
          if (error) {
            alert(error);
            navigate('/lobby');
          } else {
            setMyRole(role); // Set role for the joiner
          }
        });
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
    
    if (isLocal) {
        setGameMessage(`Player ${turn}'s Turn`);
    } else {
        setGameMessage(turn === myRole ? "Your Turn" : "Opponent's Turn");
    }
  }, [turn, gameStarted, result, isLocal, myRole]);


  const setGameData = (data) => {
    setBoard(data.board);
    setTurn(data.turn);
    setScore(data.score);
    if (data.result) {
      setResult(data.result);
      if (data.result.winner === 'draw') {
        setGameMessage("It's a draw!");
      } else {
        const winner = data.result.winner;
        if (isLocal) {
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
    if (board[index] || result) return;
    
    if (isLocal) {
      if (turn) {
          const newBoard = [...board];
          newBoard[index] = turn;
          setBoard(newBoard);
          const localResult = checkLocalWinner(newBoard);
          if (localResult) {
            setResult(localResult);
            if(localResult.winner === 'draw') setGameMessage("It's a draw!");
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
        socket.emit('leaveRoom');
    }
    navigate('/games');
  };

  const checkLocalWinner = (currentBoard) => {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let w of wins) {
      const [a,b,c] = w;
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c])
        return { winner: currentBoard[a], line: w };
    }
    if (!currentBoard.includes(null)) return { winner: "draw", line: null };
    return null;
  };

  return (
    <div className="game-container">
      <h2>Tic Tac Toe</h2>
      {!isLocal && <div id="roomInfo">Room Code: {roomCode}</div>}
      <div id="scoreboard">X: {score.X} | O: {score.O}</div>
      
      <Board board={board} onCellClick={handleCellClick} winningLine={result?.line} />

      <div id="turnIndicator">{gameMessage}</div>
      <div className="controls">
        {result && <button onClick={handleRestart}>Restart</button>}
        <button onClick={handleExit}>Exit to Lobby</button>
      </div>
    </div>
  );
}

export default Game;
