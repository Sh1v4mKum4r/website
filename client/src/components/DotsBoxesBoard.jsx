
import React from 'react';
import './DotsBoxesBoard.css';

const DotsBoxesBoard = ({ board, onCellClick, turn }) => {
    // 6x6 dot grid = 5x5 boxes
    // Render using CSS Grid: 11 columns x 11 rows
    //   Dots at even positions (0,0), (0,2), (0,4), …, (10,10)
    //   Horizontal edges at odd columns, even rows
    //   Vertical edges at even columns, odd rows
    //   Boxes at odd columns, odd rows

    const GRID_ROWS = 11; // 6 dot rows + 5 gap rows
    const GRID_COLS = 11; // 6 dot cols + 5 gap cols

    const elements = [];

    for (let gr = 0; gr < GRID_ROWS; gr++) {
        for (let gc = 0; gc < GRID_COLS; gc++) {
            const isEvenRow = gr % 2 === 0;
            const isEvenCol = gc % 2 === 0;

            if (isEvenRow && isEvenCol) {
                // Dot
                elements.push(
                    <div
                        key={`dot-${gr}-${gc}`}
                        className="db-dot"
                        style={{ gridRow: gr + 1, gridColumn: gc + 1 }}
                    />
                );
            } else if (isEvenRow && !isEvenCol) {
                // Horizontal edge
                const dotRow = gr / 2;
                const dotCol = (gc - 1) / 2;
                const edgeIndex = dotRow * 5 + dotCol;
                const claimed = board[edgeIndex];

                elements.push(
                    <div
                        key={`hedge-${edgeIndex}`}
                        className={`db-edge db-edge-h ${claimed ? `claimed claimed-${claimed.toLowerCase()}` : 'unclaimed'}`}
                        style={{ gridRow: gr + 1, gridColumn: gc + 1 }}
                        onClick={() => !claimed && onCellClick(edgeIndex)}
                    />
                );
            } else if (!isEvenRow && isEvenCol) {
                // Vertical edge
                const dotRow = (gr - 1) / 2;
                const dotCol = gc / 2;
                const edgeIndex = 30 + dotRow * 6 + dotCol;
                const claimed = board[edgeIndex];

                elements.push(
                    <div
                        key={`vedge-${edgeIndex}`}
                        className={`db-edge db-edge-v ${claimed ? `claimed claimed-${claimed.toLowerCase()}` : 'unclaimed'}`}
                        style={{ gridRow: gr + 1, gridColumn: gc + 1 }}
                        onClick={() => !claimed && onCellClick(edgeIndex)}
                    />
                );
            } else {
                // Box (odd row, odd col)
                const boxRow = (gr - 1) / 2;
                const boxCol = (gc - 1) / 2;
                const boxIndex = 60 + boxRow * 5 + boxCol;
                const owner = board[boxIndex];

                elements.push(
                    <div
                        key={`box-${boxIndex}`}
                        className={`db-box ${owner ? `filled filled-${owner.toLowerCase()}` : ''}`}
                        style={{ gridRow: gr + 1, gridColumn: gc + 1 }}
                    />
                );
            }
        }
    }

    return (
        <div className={`db-board turn-${turn ? turn.toLowerCase() : ''}`}>
            {elements}
        </div>
    );
};

export default DotsBoxesBoard;
