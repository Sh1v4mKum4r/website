import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { socket } from '../socket';
import { useToast } from '../context/ToastContext';
import { useLobby } from '../context/LobbyContext';
import MotifIcon from '../components/MotifIcon';
import { SKY_GAMES, CLUSTERS } from '../sky/games';
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
    { id: 'uttt', name: 'Ultimate Tic Tac Toe', desc: "Tic Tac Toe... inception style!", route: 'ultimate-tic-tac-toe', modes: ['pnp', '2p'] },
    { id: 'chain', name: 'Chain Reaction', desc: 'Place atoms, cause explosions, dominate the grid!', route: 'chain-reaction', modes: ['pnp', '2p', 'mp'] },
    { id: 'memory', name: 'Memory', desc: 'Flip cards and find matching pairs!', route: 'memory', modes: ['pnp', '2p', 'mp'] },
    { id: 'scribble', name: 'Scribble', desc: 'Draw and guess the word!', route: 'scribble', modes: ['mp'] },
    { id: 'imposter', name: 'Imposter Word', desc: 'Find the imposter among your friends!', route: 'imposter-word', modes: ['mp'] },
    { id: 'wordle', name: 'Wordle', desc: 'Guess the 5-letter word in 6 tries!', route: 'wordle', modes: ['pnp', '2p'] },
];

const CATEGORIES = [
    { key: 'pnp', label: 'Pass & Play', desc: 'Two players, one device — hand it back and forth.' },
    { key: '2p', label: '2-Player', desc: 'Share a room code and play online, one on one.' },
    { key: 'mp', label: 'Multiplayer', desc: 'Three or more friends in the same room.' },
];

// Each game's home cluster + colour, so the grid carries the sky's identity.
const CLUSTER_OF = Object.fromEntries(SKY_GAMES.map((g) => [g.id, g.cluster]));
const colorFor = (id) => (CLUSTERS[CLUSTER_OF[id]] || CLUSTERS.strategy).color;

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
    const activeDesc = CATEGORIES.find(c => c.key === activeCategory)?.desc;

    return (
        <div className="games-page">
            <div className="games-inner">
                <header className="games-head">
                    <p className="games-eyebrow">The arcade</p>
                    <h1 className="games-title">Choose your game.</h1>
                    <p className="games-lead">
                        Board, word and party games — play on one device, or share a room code and play online.
                    </p>
                    <Link to="/sky" className="games-sky-link">
                        <span className="games-sky-spark" aria-hidden="true">✦</span>
                        Explore them as a constellation
                        <span aria-hidden="true">→</span>
                    </Link>
                </header>

                <div className="co-tabs" role="tablist" aria-label="Game modes">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.key}
                            role="tab"
                            aria-selected={activeCategory === cat.key}
                            className={`co-tab ${activeCategory === cat.key ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat.key)}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                <p className="co-tab-desc">{activeDesc}</p>

                {(activeCategory === '2p' || activeCategory === 'mp') && (
                    <div className="co-series">
                        <span className="co-series-label">Match type</span>
                        <div className="co-series-options">
                            {[
                                { value: 0, label: 'Single' },
                                { value: 3, label: 'Best of 3' },
                                { value: 5, label: 'Best of 5' },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    className={`co-series-option ${seriesLength === opt.value ? 'active' : ''}`}
                                    onClick={() => setSeriesLength(opt.value)}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <ul className="co-grid">
                    {gamesForCategory.map(game => {
                        const color = colorFor(game.id);
                        return (
                            <li key={game.id}>
                                <button
                                    className="co-card"
                                    style={{ '--c': color }}
                                    onClick={() => activeCategory === 'pnp' ? handlePassNPlay(game) : handleOnlineGame(game)}
                                >
                                    <span className="co-card-glow" aria-hidden="true" />
                                    <span className="co-card-icon">
                                        <MotifIcon id={game.id} size={44} color={color} />
                                    </span>
                                    <span className="co-card-body">
                                        <span className="co-card-name">{game.name}</span>
                                        <span className="co-card-desc">{game.desc}</span>
                                    </span>
                                    <span className="co-card-cta">
                                        {activeCategory === 'pnp' ? 'Play' : 'Create room'}
                                        <span aria-hidden="true"> →</span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

export default Games;
