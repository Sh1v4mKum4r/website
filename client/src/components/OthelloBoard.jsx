import React from 'react';
import './OthelloBoard.css';

const OthelloBoard = ({ board, onCellClick, turn }) => {
    // Board is 64 cells, 8x8
    
    return (
        <div className={`othello-board turn-${turn ? turn.toLowerCase() : ''}`}>
            {board.map((value, index) => {
                const isBlack = value === 'X';
                const isWhite = value === 'O';
                const hasDisc = isBlack || isWhite;
                
                return (
                    <div 
                        key={index} 
                        className="othello-cell"
                        onClick={() => onCellClick(index)}
                    >
                        {hasDisc && (
                            <div className={`othello-disc ${isBlack ? 'black' : 'white'}`}></div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default OthelloBoard;
