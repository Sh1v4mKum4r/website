
import React from 'react';
import './DotsBoxesBoard.css';

const DotsBoxesBoard = ({ board, onCellClick, turn }) => {
    // 4x4 dot grid = 3x3 boxes
    // Render using CSS Grid: 7 columns x 7 rows
    //   Dots at even positions (0,0), (0,2), (0,4), (0,6), etc.
    //   Horizontal edges at odd columns, even rows
    //   Vertical edges at even columns, odd rows
    //   Boxes at odd columns, odd rows

    const GRID_ROWS = 7; // 4 dot rows + 3 gap rows
    const GRID_COLS = 7; // 4 dot cols + 3 gap cols

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
                const edgeIndex = dotRow * 3 + dotCol;
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
                const edgeIndex = 12 + dotRow * 4 + dotCol;
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
                const boxIndex = 24 + boxRow * 3 + boxCol;
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
