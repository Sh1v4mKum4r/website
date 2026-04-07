import React from 'react';
import './UTTTBoard.css';

const UTTTBoard = ({ board, activeBoard, subBoardWinners, onCellClick, turn }) => {
    const renderCell = (globalIndex, subBoardIndex) => {
        const value = board[globalIndex];
        const subWinner = subBoardWinners[subBoardIndex];
        const isPlayable = subWinner === null && (activeBoard === null || activeBoard === subBoardIndex);

        return (
            <div
                key={globalIndex}
                className={`uttt-cell ${value ? value.toLowerCase() : ''} ${value ? 'placed' : ''} ${isPlayable && !value ? 'clickable' : ''}`}
                onClick={() => isPlayable && !value ? onCellClick(globalIndex) : null}
            >
                {value}
            </div>
        );
    };

    const renderSubBoard = (subBoardIndex) => {
        const winner = subBoardWinners[subBoardIndex];
        const isActive = activeBoard === null ? winner === null : activeBoard === subBoardIndex;
        const isDone = winner !== null;
        const isWon = winner === 'X' || winner === 'O';

        const cells = [];
        const offset = subBoardIndex * 9;
        for (let i = 0; i < 9; i++) {
            cells.push(renderCell(offset + i, subBoardIndex));
        }

        return (
            <div
                key={subBoardIndex}
                className={`uttt-sub-board ${isActive && !isDone ? 'active' : ''} ${isDone ? 'done' : ''} ${isWon ? 'won' : ''}`}
            >
                <div className="uttt-sub-grid">
                    {cells}
                </div>
                {isWon && (
                    <div className={`uttt-overlay ${winner.toLowerCase()}`}>
                        <span>{winner}</span>
                    </div>
                )}
                {winner === 'draw' && (
                    <div className="uttt-overlay draw">
                        <span>-</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`uttt-board ${turn ? `turn-${turn.toLowerCase()}` : ''}`}>
            {Array.from({ length: 9 }).map((_, i) => renderSubBoard(i))}
        </div>
    );
};

export default UTTTBoard;
