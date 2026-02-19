import React from 'react';
import './Cell.css';

function Cell({ value, onClick, isWinning }) {
  return (
    <div
      className={`cell ${isWinning ? 'winning' : ''} ${value ? 'placed' : ''}`}
      onClick={onClick}
    >
      {value}
    </div>
  );
}

export default Cell;
