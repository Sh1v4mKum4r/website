import React from 'react';
import './MemoryBoard.css';

const PLAYER_COLORS = {
    X: 'player-x',
    O: 'player-o',
    P1: 'player-p1',
    P2: 'player-p2',
    P3: 'player-p3',
    P4: 'player-p4',
};

const MemoryBoard = ({ state, onCardClick, currentPlayer }) => {
    const { cards, revealed, matchedBy, flippedIndices } = state;
    const isWaitingForFlipBack = flippedIndices.length >= 2;

    const handleClick = (index) => {
        // Disable clicks on matched, already-flipped, or when waiting for flip-back
        if (revealed[index] === 'matched') return;
        if (revealed[index] === 'flipped') return;
        if (isWaitingForFlipBack) return;
        onCardClick(index);
    };

    return (
        <div className="memory-board">
            <div className="memory-grid">
                {cards.map((emoji, index) => {
                    const status = revealed[index];
                    const isFaceUp = status === 'flipped' || status === 'matched';
                    const isMatched = status === 'matched';
                    const owner = matchedBy[index];
                    const playerClass = owner ? PLAYER_COLORS[owner] || '' : '';
                    const isClickable =
                        status === 'hidden' && !isWaitingForFlipBack;

                    return (
                        <div
                            key={index}
                            className={`memory-card ${isFaceUp ? 'flipped' : ''} ${isMatched ? 'matched' : ''} ${playerClass} ${isClickable ? 'clickable' : ''}`}
                            onClick={() => handleClick(index)}
                        >
                            <div className="memory-card-inner">
                                <div className="memory-card-back">
                                    <span className="memory-card-question">?</span>
                                </div>
                                <div className="memory-card-front">
                                    <span className="memory-card-emoji">{emoji}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MemoryBoard;
