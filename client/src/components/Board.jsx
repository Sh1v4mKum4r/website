import React from 'react';
import Cell from './Cell';
import './Board.css';

function Board({ board, onCellClick, winningLine }) {
  return (
    <div className="board">
      {board.map((value, index) => (
        <Cell 
          key={index} 
          value={value} 
          onClick={() => onCellClick(index)}
          isWinning={winningLine?.includes(index)}
        />
      ))}
    </div>
  );
}

export default Board;
