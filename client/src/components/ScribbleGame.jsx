import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ScribbleGame.css';

const COLORS = ['#ffffff', '#000000', '#ff0000', '#00cc00', '#0066ff', '#ffcc00', '#ff6600', '#cc00ff'];
const SIZES = [3, 6, 12];

const ScribbleGame = ({ roomCode, socket, playerName, playerId, players, isLocal }) => {
    const canvasRef = useRef(null);
    const [drawing, setDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(6);
    const [guess, setGuess] = useState('');
    const [gameState, setGameState] = useState(null);
    const [guessMessages, setGuessMessages] = useState([]);
    const [lastPoint, setLastPoint] = useState(null);
    const messagesEndRef = useRef(null);

    const isDrawer = gameState && gameState.drawOrder
        ? gameState.drawOrder[gameState.currentDrawerIndex] === playerId
        : false;

    const currentDrawerName = gameState && gameState.drawOrder && gameState.playerNames
        ? gameState.playerNames[gameState.drawOrder[gameState.currentDrawerIndex]] || 'Unknown'
        : '';

    // Scroll guess messages to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [guessMessages]);

    // Initialize canvas with white background
    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    useEffect(() => {
        initCanvas();
    }, [initCanvas]);

    // Clear canvas on new round (when word changes)
    useEffect(() => {
        if (gameState && gameState.phase === 'drawing') {
            initCanvas();
        }
    }, [gameState?.word, gameState?.currentDrawerIndex, gameState?.round, initCanvas]);

    // Socket listeners
    useEffect(() => {
        if (!socket) return;

        const handleStateUpdate = (state) => {
            setGameState(state);
        };

        const handleGuessResult = (data) => {
            setGuessMessages((prev) => [...prev, data]);
        };

        const handleRoundEnd = (data) => {
            setGuessMessages((prev) => [
                ...prev,
                { system: true, message: `Round ended! The word was: ${data.word}` },
            ]);
            // Clear canvas for next round
            initCanvas();
        };

        const handleGameEnd = (data) => {
            setGuessMessages((prev) => [
                ...prev,
                {
                    system: true,
                    message: data.winner === 'draw'
                        ? 'Game over! It\'s a draw!'
                        : `Game over! ${data.winner} wins!`,
                },
            ]);
        };

        const handleDrawUpdate = (data) => {
            // Receive drawing data from the drawer
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            if (data.type === 'clear') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                return;
            }

            if (data.type === 'line') {
                ctx.beginPath();
                ctx.strokeStyle = data.color;
                ctx.lineWidth = data.size;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.moveTo(data.x0, data.y0);
                ctx.lineTo(data.x1, data.y1);
                ctx.stroke();
            }
        };

        socket.on('scribbleStateUpdate', handleStateUpdate);
        socket.on('scribbleGuessResult', handleGuessResult);
        socket.on('scribbleRoundEnd', handleRoundEnd);
        socket.on('scribbleGameEnd', handleGameEnd);
        socket.on('scribbleDrawUpdate', handleDrawUpdate);

        return () => {
            socket.off('scribbleStateUpdate', handleStateUpdate);
            socket.off('scribbleGuessResult', handleGuessResult);
            socket.off('scribbleRoundEnd', handleRoundEnd);
            socket.off('scribbleGameEnd', handleGameEnd);
            socket.off('scribbleDrawUpdate', handleDrawUpdate);
        };
    }, [socket, initCanvas]);

    // Get canvas coordinates from mouse/touch event
    const getCanvasCoords = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    };

    // Drawing handlers
    const drawLine = (x0, y0, x1, y1, strokeColor, strokeSize, emit) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();

        if (emit && socket) {
            socket.emit('scribbleDraw', {
                room: roomCode,
                type: 'line',
                x0, y0, x1, y1,
                color: strokeColor,
                size: strokeSize,
            });
        }
    };

    const handlePointerDown = (e) => {
        if (!isDrawer) return;
        e.preventDefault();
        const coords = getCanvasCoords(e);
        setDrawing(true);
        setLastPoint(coords);
        // Draw a dot for single clicks
        drawLine(coords.x, coords.y, coords.x, coords.y, color, brushSize, true);
    };

    const handlePointerMove = (e) => {
        if (!drawing || !isDrawer) return;
        e.preventDefault();
        const coords = getCanvasCoords(e);
        if (lastPoint) {
            drawLine(lastPoint.x, lastPoint.y, coords.x, coords.y, color, brushSize, true);
        }
        setLastPoint(coords);
    };

    const handlePointerUp = (e) => {
        if (!isDrawer) return;
        e.preventDefault();
        setDrawing(false);
        setLastPoint(null);
    };

    const handleClear = () => {
        if (!isDrawer) return;
        initCanvas();
        if (socket) {
            socket.emit('scribbleDraw', {
                room: roomCode,
                type: 'clear',
            });
        }
    };

    // Guess submission
    const handleGuessSubmit = (e) => {
        e.preventDefault();
        if (!guess.trim() || isDrawer) return;

        socket.emit('scribbleGuess', {
            room: roomCode,
            guess: guess.trim(),
            playerId,
            playerName,
        });

        setGuess('');
    };

    // Generate word display (underscores for guessers, full word for drawer)
    const getWordDisplay = () => {
        if (!gameState || !gameState.word) return '';
        if (isDrawer) return gameState.word;
        return gameState.word.replace(/[a-zA-Z]/g, '_ ').trim();
    };

    // Sort scores for display
    const getSortedScores = () => {
        if (!gameState || !gameState.scores) return [];
        return Object.entries(gameState.scores)
            .map(([id, score]) => ({
                id,
                name: gameState.playerNames[id] || id,
                score,
                isDrawer: gameState.drawOrder[gameState.currentDrawerIndex] === id,
                hasGuessed: gameState.guessedPlayers?.includes(id),
            }))
            .sort((a, b) => b.score - a.score);
    };

    if (!gameState) {
        return (
            <div className="scribble-game">
                <div className="scribble-waiting">Waiting for game state...</div>
            </div>
        );
    }

    return (
        <div className="scribble-game">
            {/* Header: Round, Timer, Word */}
            <div className="scribble-header">
                <div className="scribble-round">
                    Round {gameState.round}/{gameState.totalRounds}
                </div>
                <div className="scribble-word-display">
                    {isDrawer ? (
                        <span className="scribble-word-label">Draw: <strong>{getWordDisplay()}</strong></span>
                    ) : (
                        <span className="scribble-word-hint">{getWordDisplay()}</span>
                    )}
                </div>
                <div className={`scribble-timer ${gameState.timeLeft <= 10 ? 'warning' : ''}`}>
                    {gameState.timeLeft}s
                </div>
            </div>

            <div className="scribble-body">
                {/* Scoreboard */}
                <div className="scribble-scores">
                    <h3 className="scribble-scores-title">Scores</h3>
                    {getSortedScores().map((p) => (
                        <div
                            key={p.id}
                            className={`scribble-score-entry ${p.isDrawer ? 'is-drawer' : ''} ${p.hasGuessed ? 'has-guessed' : ''}`}
                        >
                            <span className="scribble-score-name">
                                {p.name}
                                {p.isDrawer && <span className="scribble-drawer-badge">drawing</span>}
                                {p.hasGuessed && <span className="scribble-guessed-badge">guessed</span>}
                            </span>
                            <span className="scribble-score-value">{p.score}</span>
                        </div>
                    ))}
                </div>

                {/* Canvas Area */}
                <div className="scribble-canvas-area">
                    <canvas
                        ref={canvasRef}
                        width={600}
                        height={400}
                        className={`scribble-canvas ${isDrawer ? 'drawable' : ''}`}
                        onMouseDown={handlePointerDown}
                        onMouseMove={handlePointerMove}
                        onMouseUp={handlePointerUp}
                        onMouseLeave={handlePointerUp}
                        onTouchStart={handlePointerDown}
                        onTouchMove={handlePointerMove}
                        onTouchEnd={handlePointerUp}
                    />

                    {/* Drawing Tools (only for drawer) */}
                    {isDrawer && (
                        <div className="scribble-tools">
                            <div className="scribble-colors">
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        className={`scribble-color-btn ${color === c ? 'active' : ''}`}
                                        style={{ backgroundColor: c }}
                                        onClick={() => setColor(c)}
                                        title={c}
                                    />
                                ))}
                            </div>
                            <div className="scribble-sizes">
                                {SIZES.map((s) => (
                                    <button
                                        key={s}
                                        className={`scribble-size-btn ${brushSize === s ? 'active' : ''}`}
                                        onClick={() => setBrushSize(s)}
                                        title={`${s}px`}
                                    >
                                        <span
                                            className="scribble-size-dot"
                                            style={{ width: s + 4, height: s + 4 }}
                                        />
                                    </button>
                                ))}
                            </div>
                            <button className="scribble-clear-btn" onClick={handleClear}>
                                Clear
                            </button>
                        </div>
                    )}

                    {!isDrawer && (
                        <div className="scribble-drawer-info">
                            {currentDrawerName} is drawing...
                        </div>
                    )}
                </div>

                {/* Guess Chat */}
                <div className="scribble-chat">
                    <h3 className="scribble-chat-title">Guesses</h3>
                    <div className="scribble-chat-messages">
                        {guessMessages.map((msg, i) => (
                            <div
                                key={i}
                                className={`scribble-chat-msg ${msg.system ? 'system' : ''} ${msg.correct ? 'correct' : ''}`}
                            >
                                {msg.system ? (
                                    <span className="scribble-chat-system">{msg.message}</span>
                                ) : (
                                    <>
                                        <span className="scribble-chat-sender">{msg.playerName}: </span>
                                        <span className="scribble-chat-text">{msg.message}</span>
                                    </>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    {!isDrawer && (
                        <form className="scribble-guess-form" onSubmit={handleGuessSubmit}>
                            <input
                                type="text"
                                value={guess}
                                onChange={(e) => setGuess(e.target.value)}
                                placeholder="Type your guess..."
                                autoComplete="off"
                            />
                            <button type="submit">Guess</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScribbleGame;
