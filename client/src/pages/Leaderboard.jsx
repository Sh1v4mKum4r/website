import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';
import MotifIcon from '../components/MotifIcon';
import { SKY_GAMES, CLUSTERS } from '../sky/games';
import './Leaderboard.css';

// Game id -> display name (mirrors the GAMES list in Games.jsx).
const GAME_NAMES = {
    tictactoe: 'Tic Tac Toe',
    connect4: 'Connect 4',
    othello: 'Othello',
    checkers: 'Checkers',
    gomoku: 'Gomoku',
    mancala: 'Mancala',
    dotsboxes: 'Dots & Boxes',
    nim: 'Nim',
    uttt: 'Ultimate Tic Tac Toe',
    chain: 'Chain Reaction',
    memory: 'Memory',
    scribble: 'Scribble',
    imposter: 'Imposter Word',
    wordle: 'Wordle',
};

const CLUSTER_OF = Object.fromEntries(SKY_GAMES.map((g) => [g.id, g.cluster]));
const colorFor = (id) => (CLUSTERS[CLUSTER_OF[id]] || CLUSTERS.strategy).color;

function Leaderboard() {
    const [boards, setBoards] = useState(null);
    const [status, setStatus] = useState('loading'); // loading | ok | error

    useEffect(() => {
        let cancelled = false;
        fetch(`${API_URL}/api/leaderboard`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (cancelled) return;
                setBoards(data);
                setStatus('ok');
            })
            .catch(() => {
                if (cancelled) return;
                setStatus('error');
            });
        return () => { cancelled = true; };
    }, []);

    const games = boards ? Object.keys(boards).filter((g) => boards[g]?.length) : [];

    return (
        <div className="lb-page">
            <div className="lb-inner">
                <header className="lb-head">
                    <p className="lb-eyebrow">Hall of fame</p>
                    <h1 className="lb-title">Leaderboard.</h1>
                    <p className="lb-lead">Most wins per game, across online matches.</p>
                </header>

                {status === 'loading' && <p className="lb-message">Loading the standings…</p>}
                {status === 'error' && (
                    <p className="lb-message">Couldn't load the leaderboard. Try again later.</p>
                )}
                {status === 'ok' && games.length === 0 && (
                    <div className="lb-empty">
                        <p className="lb-empty-title">No games have been won yet.</p>
                        <p className="lb-empty-sub">Be the first name up here.</p>
                        <Link to="/games" className="lb-empty-cta">Play a game →</Link>
                    </div>
                )}

                {status === 'ok' && games.length > 0 && (
                    <div className="lb-grid">
                        {games.map((game) => {
                            const color = colorFor(game);
                            return (
                                <div key={game} className="lb-card" style={{ '--c': color }}>
                                    <div className="lb-card-head">
                                        <span className="lb-card-icon"><MotifIcon id={game} size={30} color={color} /></span>
                                        <h3>{GAME_NAMES[game] || game}</h3>
                                    </div>
                                    <ol className="lb-list">
                                        {boards[game].map((row, i) => (
                                            <li key={row.username} className={i < 3 ? `rank-${i + 1}` : ''}>
                                                <span className="lb-rank">{i + 1}</span>
                                                <span className="lb-name">{row.username}</span>
                                                <span className="lb-wins">{row.wins}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Leaderboard;
