import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { useToast } from '../context/ToastContext';
import { useLobby } from '../context/LobbyContext';
import './Games.css';

const GAMES = [
    { id: 'tictactoe', name: 'Tic Tac Toe', desc: "The classic game of X's and O's.", route: 'tic-tac-toe', modes: ['pnp', '2p'] },
    { id: 'connect4', name: 'Connect 4', desc: 'Connect 4 discs in a row to win!', route: 'connect4', modes: ['pnp', '2p'] },
    { id: 'othello', name: 'Othello', desc: 'Outflank and flip your opponent\'s discs!', route: 'othello', modes: ['pnp', '2p'] },
    { id: 'checkers', name: 'Checkers', desc: 'Jump and capture your way to victory!', route: 'checkers', modes: ['pnp', '2p'] },
    { id: 'gomoku', name: 'Gomoku', desc: 'Get five in a row on a 15×15 board!', route: 'gomoku', modes: ['pnp', '2p'] },
    { id: 'mancala', name: 'Mancala', desc: 'Capture stones and fill your store!', route: 'mancala', modes: ['pnp', '2p'] },
    { id: 'dotsboxes', name: 'Dots & Boxes', desc: 'Draw lines and claim boxes!', route: 'dots-and-boxes', modes: ['pnp', '2p'] },
    { id: 'nim', name: 'Nim', desc: "Remove stones — but don't take the last one!", route: 'nim', modes: ['pnp', '2p'] },
];

const CATEGORIES = [
    { key: 'pnp', label: 'Pass-n-Play', icon: '🎮', desc: 'Play on the same device' },
    { key: '2p', label: '2-Player', icon: '⚔️', desc: 'Play online 1v1' },
    { key: 'mp', label: 'Multiplayer', icon: '🌐', desc: '3+ players online' },
];

function Games() {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const { isInLobby, openSidebar, playerName } = useLobby();
    const [activeCategory, setActiveCategory] = useState('pnp');
    const [seriesLength, setSeriesLength] = useState(0);

    const handlePassNPlay = (game) => {
        navigate(`/game/${game.route}/local`, {
            state: { role: 'local', gameType: game.id, isLocal: true }
        });
    };

    const handleOnlineGame = (game) => {
        if (!isInLobby) {
            addToast('Join or create a lobby first!', 'warning');
            openSidebar();
            return;
        }
        socket.emit('createRoom', { gameType: game.id, seriesLength }, (response) => {
            if (response.error) {
                addToast(response.error, 'error');
                return;
            }
            navigate(`/game/${game.route}/${response.code}`, {
                state: { role: response.role, playerName, gameType: game.id, seriesLength: response.seriesLength }
            });
        });
    };

    const gamesForCategory = GAMES.filter(g => g.modes.includes(activeCategory));

    return (
        <div className="games-container">
            <h2>Select a Game</h2>

            {/* Category tabs */}
            <div className="category-tabs">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.key}
                        className={`category-tab ${activeCategory === cat.key ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.key)}
                    >
                        <span className="tab-icon">{cat.icon}</span>
                        <span className="tab-label">{cat.label}</span>
                    </button>
                ))}
            </div>

            <p className="category-desc">{CATEGORIES.find(c => c.key === activeCategory)?.desc}</p>

            {/* Series selector — only for online modes */}
            {(activeCategory === '2p' || activeCategory === 'mp') && (
                <div className="series-selector">
                    <span>Match type:</span>
                    <div className="series-options">
                        {[
                            { value: 0, label: 'Single' },
                            { value: 3, label: 'Bo3' },
                            { value: 5, label: 'Bo5' },
                        ].map(opt => (
                            <button
                                key={opt.value}
                                className={`series-option ${seriesLength === opt.value ? 'active' : ''}`}
                                onClick={() => setSeriesLength(opt.value)}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Game cards */}
            <div className="game-list">
                {activeCategory === 'mp' ? (
                    <div className="coming-soon-card">
                        <span className="coming-soon-icon">🚧</span>
                        <h3>Coming Soon</h3>
                        <p>Multiplayer games are on the way!</p>
                    </div>
                ) : (
                    gamesForCategory.map(game => (
                        <div
                            key={game.id}
                            className="game-selection-card"
                            onClick={() => activeCategory === 'pnp' ? handlePassNPlay(game) : handleOnlineGame(game)}
                        >
                            <h3>{game.name}</h3>
                            <p>{game.desc}</p>
                            <span className="play-badge">
                                {activeCategory === 'pnp' ? '▶ Play Now' : '🔗 Create Room'}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Games;
