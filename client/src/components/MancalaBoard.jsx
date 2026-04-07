import React from 'react';
import './MancalaBoard.css';

const MancalaBoard = ({ board, onCellClick, turn, myRole, isLocal }) => {
    // Board layout:
    // Indices 0-5: Player X's pits (bottom row, left to right)
    // Index 6: Player X's store (right side)
    // Indices 7-12: Player O's pits (top row, displayed right to left: 12,11,10,9,8,7)
    // Index 13: Player O's store (left side)

    const canClick = (index) => {
        if (isLocal) {
            // In local mode, current turn player can click their own pits
            if (turn === 'X') return index >= 0 && index <= 5 && board[index] > 0;
            if (turn === 'O') return index >= 7 && index <= 12 && board[index] > 0;
        } else {
            // In online mode, only click own pits when it's your turn
            if (myRole !== turn) return false;
            if (myRole === 'X') return index >= 0 && index <= 5 && board[index] > 0;
            if (myRole === 'O') return index >= 7 && index <= 12 && board[index] > 0;
        }
        return false;
    };

    const handlePitClick = (index) => {
        if (canClick(index)) {
            onCellClick(index);
        }
    };

    // Player O's pits: displayed right to left (12, 11, 10, 9, 8, 7)
    const oPits = [12, 11, 10, 9, 8, 7];
    // Player X's pits: displayed left to right (0, 1, 2, 3, 4, 5)
    const xPits = [0, 1, 2, 3, 4, 5];

    return (
        <div className={`mancala-board turn-${turn ? turn.toLowerCase() : ''}`}>
            {/* Player O's store (left) */}
            <div className="mancala-store store-o">
                <div className="store-label">O</div>
                <div className="store-count">{board[13]}</div>
            </div>

            {/* Middle section: two rows of pits */}
            <div className="mancala-pits">
                {/* Top row: Player O's pits (right to left) */}
                <div className="pit-row row-o">
                    {oPits.map(index => (
                        <div
                            key={index}
                            className={`mancala-pit pit-o ${canClick(index) ? 'clickable' : ''}`}
                            onClick={() => handlePitClick(index)}
                        >
                            <div className="pit-stones">{board[index]}</div>
                        </div>
                    ))}
                </div>

                {/* Bottom row: Player X's pits (left to right) */}
                <div className="pit-row row-x">
                    {xPits.map(index => (
                        <div
                            key={index}
                            className={`mancala-pit pit-x ${canClick(index) ? 'clickable' : ''}`}
                            onClick={() => handlePitClick(index)}
                        >
                            <div className="pit-stones">{board[index]}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Player X's store (right) */}
            <div className="mancala-store store-x">
                <div className="store-label">X</div>
                <div className="store-count">{board[6]}</div>
            </div>
        </div>
    );
};

export default MancalaBoard;
