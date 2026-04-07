import React from 'react';
import { parseCell, getCriticalMass } from '../utils/chainLogic';
import './ChainBoard.css';

const COLOR_NAMES = {
    X: 'Red',
    O: 'Blue',
    Y: 'Yellow',
    G: 'Green',
    P: 'Purple',
    C: 'Cyan',
};

const ChainBoard = ({ board, onCellClick, turn, turnOrder }) => {
    const handleClick = (index) => {
        onCellClick(index);
    };

    const renderAtoms = (player, atoms) => {
        const countClass =
            atoms === 1
                ? 'atoms-1'
                : atoms === 2
                    ? 'atoms-2'
                    : atoms === 3
                        ? 'atoms-3'
                        : 'atoms-many';

        const dots = [];
        for (let i = 0; i < atoms; i++) {
            dots.push(
                <div
                    key={i}
                    className={`chain-atom color-${player}`}
                />
            );
        }

        return (
            <div className={`chain-atoms ${countClass}`}>
                {dots}
            </div>
        );
    };

    return (
        <div className="chain-board-wrapper">
            <div className="chain-turn-indicator">
                <div className={`chain-turn-dot color-${turn}`} />
                <span>{COLOR_NAMES[turn] || turn}'s turn</span>
            </div>

            <div className="chain-board">
                {board.map((cell, index) => {
                    const { player, atoms } = parseCell(cell);
                    const hasAtoms = player !== null && atoms > 0;
                    const critMass = getCriticalMass(index);
                    const nearCritical = hasAtoms && atoms === critMass - 1;
                    const isOwnOrEmpty = !player || player === turn;

                    const classes = [
                        'chain-cell',
                        player ? `owner-${player}` : '',
                        nearCritical ? 'near-critical' : '',
                        !isOwnOrEmpty ? 'cell-disabled' : '',
                    ]
                        .filter(Boolean)
                        .join(' ');

                    return (
                        <div
                            key={index}
                            className={classes}
                            onClick={() => handleClick(index)}
                        >
                            {hasAtoms && renderAtoms(player, atoms)}
                        </div>
                    );
                })}
            </div>

            <div className="chain-players">
                {turnOrder.map((color) => (
                    <div
                        key={color}
                        className={`chain-player-badge ${turn === color ? 'current-turn' : 'active'}`}
                    >
                        <div
                            className="chain-player-color"
                            style={{ backgroundColor: getPlayerHex(color) }}
                        />
                        <span>{COLOR_NAMES[color] || color}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const getPlayerHex = (color) => {
    const map = {
        X: '#ef4444',
        O: '#3b82f6',
        Y: '#eab308',
        G: '#22c55e',
        P: '#a855f7',
        C: '#06b6d4',
    };
    return map[color] || '#888';
};

export default ChainBoard;
