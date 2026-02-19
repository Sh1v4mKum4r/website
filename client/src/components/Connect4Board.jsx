
import React from 'react';
import './Connect4Board.css';

const Connect4Board = ({ board, onColumnClick, winningLine, turn }) => {
    // Board is flat array of 42. 7 cols x 6 rows.
    // We want to render by rows? Or by columns?
    // Flexbox row of columns is easier for clicking columns.
    // But visual is a grid.
    // Let's render 7 columns, each with 6 cells.
    // Board index: r * 7 + c.

    const cols = 7;
    const rows = 6;

    const renderColumn = (colIndex) => {
        const cells = [];
        for (let r = 0; r < rows; r++) {
            const idx = r * cols + colIndex;
            const value = board[idx];
            const isWin = winningLine && winningLine.includes(idx);
            cells.push(
                <div key={r} className={`c4-cell ${value ? value.toLowerCase() : ''} ${isWin ? 'win' : ''}`}>
                    <div className="c4-circle"></div>
                </div>
            );
        }
        return (
            <div key={colIndex} className="c4-column" onClick={() => onColumnClick(colIndex)}>
                {cells}
            </div>
        );
    };

    return (
        <div className={`c4-board ${turn ? `turn-${turn.toLowerCase()}` : ''}`}>
            {Array.from({ length: cols }).map((_, i) => renderColumn(i))}
        </div>
    );
};

export default Connect4Board;
