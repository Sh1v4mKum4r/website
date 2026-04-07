import React, { useState } from 'react';
import { getRowForIndex, getRowBoundaries } from '../utils/nimLogic';
import './NimBoard.css';

const NimBoard = ({ board, onCellClick, turn }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const rowBoundaries = getRowBoundaries();

    const getAffectedIndices = (index) => {
        if (index === null || board[index] !== 'stone') return [];
        const row = getRowForIndex(index);
        if (row === -1) return [];
        const { end } = rowBoundaries[row];
        const affected = [];
        for (let i = index; i < end; i++) {
            if (board[i] === 'stone') {
                affected.push(i);
            }
        }
        return affected;
    };

    const affectedSet = new Set(getAffectedIndices(hoveredIndex));

    const handleClick = (index) => {
        if (board[index] === 'stone') {
            onCellClick(index);
        }
    };

    const renderRow = (rowIndex) => {
        const { start, end } = rowBoundaries[rowIndex];
        const stones = [];
        for (let i = start; i < end; i++) {
            const isStone = board[i] === 'stone';
            const isAffected = affectedSet.has(i);
            stones.push(
                <div
                    key={i}
                    className={`nim-stone ${isStone ? 'present' : 'removed'} ${isAffected ? 'preview' : ''}`}
                    onClick={() => handleClick(i)}
                    onMouseEnter={() => isStone && setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                >
                    {isStone && <div className="nim-stone-inner" />}
                </div>
            );
        }
        return (
            <div key={rowIndex} className="nim-row">
                {stones}
            </div>
        );
    };

    return (
        <div className="nim-board">
            {rowBoundaries.map((_, rowIndex) => renderRow(rowIndex))}
        </div>
    );
};

export default NimBoard;
