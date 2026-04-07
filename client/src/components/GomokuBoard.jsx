import React from 'react';
import './GomokuBoard.css';

const GomokuBoard = ({ board, onCellClick, winningLine, turn }) => {
    return (
        <div className={`gomoku-board turn-${turn ? turn.toLowerCase() : ''}`}>
            {board.map((value, index) => {
                const isX = value === 'X';
                const isO = value === 'O';
                const hasStone = isX || isO;
                const isWin = winningLine?.includes(index);

                return (
                    <div
                        key={index}
                        className={`gomoku-cell ${isWin ? 'win' : ''}`}
                        onClick={() => onCellClick(index)}
                    >
                        {hasStone && (
                            <div className={`gomoku-stone ${isX ? 'black' : 'white'}`}></div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default GomokuBoard;
