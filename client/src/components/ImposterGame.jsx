import React, { useState, useEffect, useRef } from 'react';
import './ImposterGame.css';

const ImposterGame = ({ roomCode, socket, playerName, playerId, players, isLocal }) => {
    const [gameState, setGameState] = useState(null);
    const [clueInput, setClueInput] = useState('');
    const [revealData, setRevealData] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [showWord, setShowWord] = useState(false);
    const [gameOver, setGameOver] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const chatEndRef = useRef(null);

    // Socket listeners
    useEffect(() => {
        if (!socket) return;

        const onStateUpdate = (state) => {
            setGameState(state);
            setRevealData(null);
            if (state.phase === 'discussion') {
                setCountdown(state.timeLeft || 60);
            }
        };

        const onReveal = (data) => {
            setRevealData(data);
        };

        const onGameEnd = (data) => {
            setGameOver(data);
        };

        const onChat = (msg) => {
            setChatMessages((prev) => [...prev, msg]);
        };

        socket.on('imposterStateUpdate', onStateUpdate);
        socket.on('imposterReveal', onReveal);
        socket.on('imposterGameEnd', onGameEnd);
        socket.on('imposterChat', onChat);

        return () => {
            socket.off('imposterStateUpdate', onStateUpdate);
            socket.off('imposterReveal', onReveal);
            socket.off('imposterGameEnd', onGameEnd);
            socket.off('imposterChat', onChat);
        };
    }, [socket]);

    // Discussion countdown timer
    useEffect(() => {
        if (!gameState || gameState.phase !== 'discussion' || countdown === null) return;
        if (countdown <= 0) {
            // Move to voting when timer runs out
            socket.emit('imposterPhaseAdvance', { room: roomCode });
            setCountdown(null);
            return;
        }
        const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown, gameState, socket, roomCode]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Show word briefly on mount / phase change
    useEffect(() => {
        if (gameState && gameState.phase === 'clue') {
            setShowWord(true);
            const t = setTimeout(() => setShowWord(false), 4000);
            return () => clearTimeout(t);
        }
    }, [gameState?.phase, gameState?.round]);

    if (!gameState) {
        return (
            <div className="imposter-game">
                <div className="imposter-waiting">Waiting for game state...</div>
            </div>
        );
    }

    const {
        phase,
        words,
        clues,
        clueOrder,
        currentClueIndex,
        votes,
        scores,
        round,
        totalRounds,
        playerNames,
        playerIds,
        imposterPlayerId,
    } = gameState;

    const myWord = words?.[playerId];
    const isImposter = playerId === imposterPlayerId;
    const currentCluePlayer = clueOrder?.[currentClueIndex];
    const isMyTurnToClue = currentCluePlayer === playerId && phase === 'clue';
    const hasVoted = !!votes?.[playerId];

    // --- Handlers ---
    const handleSubmitClue = (e) => {
        e.preventDefault();
        const word = clueInput.trim().split(/\s+/)[0];
        if (!word) return;
        socket.emit('imposterClue', { room: roomCode, playerId, clue: word });
        setClueInput('');
    };

    const handleVote = (votedForId) => {
        if (hasVoted || votedForId === playerId || phase !== 'voting') return;
        socket.emit('imposterVote', { room: roomCode, playerId, votedForId });
    };

    const handleSendChat = (e) => {
        e.preventDefault();
        if (!chatInput.trim() || phase !== 'discussion') return;
        socket.emit('imposterChat', {
            room: roomCode,
            sender: playerName,
            message: chatInput.trim(),
        });
        setChatInput('');
    };

    const handleNextRound = () => {
        socket.emit('imposterNextRound', { room: roomCode });
        setRevealData(null);
        setChatMessages([]);
    };

    const handleSkipDiscussion = () => {
        socket.emit('imposterPhaseAdvance', { room: roomCode });
        setCountdown(null);
    };

    // --- Phase Indicator ---
    const phases = ['clue', 'discussion', 'voting', 'reveal'];
    const phaseLabels = ['Clue Giving', 'Discussion', 'Voting', 'Reveal'];

    // --- Render ---
    return (
        <div className="imposter-game">
            {/* Header */}
            <div className="imposter-header">
                <div className="imposter-round">
                    Round {round} / {totalRounds}
                </div>
                <div className="imposter-phase-indicator">
                    {phases.map((p, i) => (
                        <div key={p} className={`phase-step ${p === phase ? 'active' : ''} ${phases.indexOf(phase) > i ? 'done' : ''}`}>
                            <div className="phase-dot" />
                            <span className="phase-label">{phaseLabels[i]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Word Card */}
            <div className={`imposter-word-card ${isImposter ? 'imposter' : 'civilian'} ${showWord ? 'show' : ''}`}>
                {isImposter ? (
                    <>
                        <div className="imposter-badge">IMPOSTER</div>
                        <div className="imposter-word-text">{myWord}</div>
                        <div className="imposter-word-hint">Blend in! Give clues that fit.</div>
                    </>
                ) : (
                    <>
                        <div className="civilian-badge">YOUR WORD</div>
                        <div className="imposter-word-text">{myWord}</div>
                        <div className="imposter-word-hint">Find the imposter!</div>
                    </>
                )}
                <button className="imposter-peek-btn" onClick={() => setShowWord(!showWord)}>
                    {showWord ? 'Hide' : 'Peek'}
                </button>
            </div>

            {/* Clue Phase */}
            {phase === 'clue' && (
                <div className="imposter-clue-phase">
                    <h3 className="imposter-section-title">Clue Round</h3>
                    <div className="imposter-clue-order">
                        {clueOrder.map((pid, i) => {
                            const hasClue = !!clues[pid];
                            const isCurrent = i === currentClueIndex;
                            return (
                                <div key={pid} className={`clue-player ${hasClue ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                                    <div className="clue-player-avatar">
                                        {(playerNames[pid] || 'P')[0].toUpperCase()}
                                    </div>
                                    <div className="clue-player-name">{playerNames[pid] || pid}</div>
                                    {hasClue && <div className="clue-word">{clues[pid]}</div>}
                                    {isCurrent && !hasClue && <div className="clue-thinking">thinking...</div>}
                                </div>
                            );
                        })}
                    </div>
                    {isMyTurnToClue && (
                        <form className="imposter-clue-form" onSubmit={handleSubmitClue}>
                            <input
                                type="text"
                                value={clueInput}
                                onChange={(e) => setClueInput(e.target.value)}
                                placeholder="Enter a one-word clue..."
                                maxLength={30}
                                autoFocus
                            />
                            <button type="submit" disabled={!clueInput.trim()}>Submit</button>
                        </form>
                    )}
                    {!isMyTurnToClue && (
                        <div className="imposter-waiting-text">
                            Waiting for <strong>{playerNames[currentCluePlayer] || 'player'}</strong> to give a clue...
                        </div>
                    )}
                </div>
            )}

            {/* Discussion Phase */}
            {phase === 'discussion' && (
                <div className="imposter-discussion-phase">
                    <h3 className="imposter-section-title">
                        Discussion
                        {countdown !== null && (
                            <span className={`imposter-timer ${countdown <= 10 ? 'urgent' : ''}`}>
                                {countdown}s
                            </span>
                        )}
                    </h3>

                    {/* Show all clues */}
                    <div className="imposter-clue-summary">
                        {clueOrder.map((pid) => (
                            <div key={pid} className="clue-summary-item">
                                <span className="clue-summary-name">{playerNames[pid]}:</span>
                                <span className="clue-summary-word">{clues[pid]}</span>
                            </div>
                        ))}
                    </div>

                    {/* Chat */}
                    <div className="imposter-chat">
                        <div className="imposter-chat-messages">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`imposter-chat-msg ${msg.sender === playerName ? 'mine' : ''}`}>
                                    <span className="imposter-chat-sender">{msg.sender}: </span>
                                    <span className="imposter-chat-text">{msg.message}</span>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <form className="imposter-chat-form" onSubmit={handleSendChat}>
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Discuss who the imposter might be..."
                                maxLength={200}
                            />
                            <button type="submit">Send</button>
                        </form>
                    </div>

                    <button className="imposter-skip-btn" onClick={handleSkipDiscussion}>
                        Skip to Voting
                    </button>
                </div>
            )}

            {/* Voting Phase */}
            {phase === 'voting' && (
                <div className="imposter-voting-phase">
                    <h3 className="imposter-section-title">Vote for the Imposter!</h3>

                    {/* Clue reminder */}
                    <div className="imposter-clue-summary compact">
                        {clueOrder.map((pid) => (
                            <div key={pid} className="clue-summary-item">
                                <span className="clue-summary-name">{playerNames[pid]}:</span>
                                <span className="clue-summary-word">{clues[pid]}</span>
                            </div>
                        ))}
                    </div>

                    <div className="imposter-vote-grid">
                        {playerIds.filter((pid) => pid !== playerId).map((pid) => {
                            const voted = votes[playerId] === pid;
                            const voteCount = Object.values(votes).filter((v) => v === pid).length;
                            return (
                                <div
                                    key={pid}
                                    className={`imposter-vote-card ${voted ? 'voted' : ''} ${hasVoted && !voted ? 'disabled' : ''}`}
                                    onClick={() => handleVote(pid)}
                                >
                                    <div className="vote-card-avatar">
                                        {(playerNames[pid] || 'P')[0].toUpperCase()}
                                    </div>
                                    <div className="vote-card-name">{playerNames[pid] || pid}</div>
                                    {hasVoted && <div className="vote-card-count">{voteCount} vote{voteCount !== 1 ? 's' : ''}</div>}
                                </div>
                            );
                        })}
                    </div>

                    {hasVoted ? (
                        <div className="imposter-waiting-text">Waiting for others to vote...</div>
                    ) : (
                        <div className="imposter-waiting-text">Click a player to vote!</div>
                    )}
                </div>
            )}

            {/* Reveal Phase */}
            {phase === 'reveal' && revealData && (
                <div className="imposter-reveal-phase">
                    <div className={`imposter-reveal-banner ${revealData.imposterCaught ? 'caught' : 'escaped'}`}>
                        {revealData.imposterCaught
                            ? 'IMPOSTER CAUGHT!'
                            : 'IMPOSTER ESCAPED!'}
                    </div>

                    <div className="imposter-reveal-identity">
                        <div className="reveal-imposter-card">
                            <div className="reveal-avatar imposter-avatar">
                                {(playerNames[revealData.imposterId] || 'I')[0].toUpperCase()}
                            </div>
                            <div className="reveal-name">{playerNames[revealData.imposterId]}</div>
                            <div className="reveal-role">was the Imposter</div>
                        </div>
                    </div>

                    <div className="imposter-reveal-words">
                        <div className="reveal-word-pair">
                            <div className="reveal-word majority">
                                <span className="reveal-word-label">Civilian Word</span>
                                <span className="reveal-word-value">{revealData.majorityWord}</span>
                            </div>
                            <span className="reveal-vs">vs</span>
                            <div className="reveal-word imposter-w">
                                <span className="reveal-word-label">Imposter Word</span>
                                <span className="reveal-word-value">{revealData.imposterWord}</span>
                            </div>
                        </div>
                    </div>

                    {/* Vote Tally */}
                    <div className="imposter-vote-tally">
                        <h4>Vote Tally</h4>
                        <div className="tally-grid">
                            {playerIds.map((pid) => (
                                <div key={pid} className={`tally-item ${pid === revealData.imposterId ? 'was-imposter' : ''}`}>
                                    <span className="tally-name">{playerNames[pid]}</span>
                                    <span className="tally-votes">{revealData.voteCounts[pid] || 0} vote{(revealData.voteCounts[pid] || 0) !== 1 ? 's' : ''}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Scoreboard */}
                    <div className="imposter-scoreboard">
                        <h4>Scores</h4>
                        <div className="score-grid">
                            {playerIds
                                .sort((a, b) => (revealData.scores[b] || 0) - (revealData.scores[a] || 0))
                                .map((pid, i) => (
                                    <div key={pid} className={`score-item ${i === 0 ? 'leader' : ''}`}>
                                        <span className="score-rank">#{i + 1}</span>
                                        <span className="score-name">{playerNames[pid]}</span>
                                        <span className="score-value">{revealData.scores[pid] || 0}</span>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {round < totalRounds && (
                        <button className="imposter-next-btn" onClick={handleNextRound}>
                            Next Round
                        </button>
                    )}
                </div>
            )}

            {/* Game Over */}
            {gameOver && (
                <div className="imposter-game-over-overlay">
                    <div className="imposter-game-over">
                        <h2>Game Over!</h2>
                        <div className="final-scores">
                            {Object.entries(gameOver.scores || scores)
                                .sort(([, a], [, b]) => b - a)
                                .map(([pid, score], i) => (
                                    <div key={pid} className={`final-score-item ${i === 0 ? 'winner' : ''}`}>
                                        <span className="final-rank">{i === 0 ? 'Winner' : `#${i + 1}`}</span>
                                        <span className="final-name">{playerNames[pid]}</span>
                                        <span className="final-score">{score} pts</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImposterGame;
