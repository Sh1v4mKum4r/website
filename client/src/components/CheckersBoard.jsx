import React, { useState } from 'react';
import './CheckersBoard.css';

const CheckersBoard = ({ board, onMove, turn, myRole, isLocal }) => {
    const [selectedIdx, setSelectedIdx] = useState(null);

    const handleSquareClick = (index) => {
        // Find if this is a piece click or a destination click
        const piece = board[index];
        const isMyPiece = piece && piece.toLowerCase() === (isLocal ? turn.toLowerCase() : myRole?.toLowerCase());
        
        if (isMyPiece) {
            setSelectedIdx(index);
        } else if (selectedIdx !== null && piece === null) {
            // Attempt to move from selectedIdx to index
            onMove(selectedIdx, index);
            setSelectedIdx(null);
        } else {
            setSelectedIdx(null); // Clear selection on invalid click
        }
    };

    const renderPiece = (piece) => {
        if (!piece) return null;
        // We'll use 'r', 'b' for regular, 'R', 'B' for kings. Or 'red', 'black', 'redKing', 'blackKing'
        // Let's stick to 'r', 'b', 'R', 'B' for simplicity
        
        let colorClass = piece.toLowerCase() === 'r' ? 'red' : 'black';
        let kingClass = (piece === 'R' || piece === 'B') ? 'king' : '';

        return (
            <div className={`checkers-piece ${colorClass} ${kingClass}`}>
                {kingClass && <div className="crown">♔</div>}
            </div>
        );
    };

    return (
        <div className="checkers-board">
            {board.map((cell, index) => {
                const row = Math.floor(index / 8);
                const col = index % 8;
                const isDark = (row + col) % 2 === 1;
                const isSelected = selectedIdx === index;

                return (
                    <div
                        key={index}
                        className={`checkers-cell ${isDark ? 'dark' : 'light'} ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSquareClick(index)}
                    >
                        {renderPiece(cell)}
                    </div>
                );
            })}
        </div>
    );
};

export default CheckersBoard;
