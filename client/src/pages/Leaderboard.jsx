import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
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

const MEDALS = ['🥇', '🥈', '🥉'];

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
        <div className="leaderboard-container">
            <h2>🏆 Leaderboard</h2>
            <p className="leaderboard-subtitle">Most wins per game (online games only)</p>

            {status === 'loading' && <p className="leaderboard-message">Loading…</p>}
            {status === 'error' && (
                <p className="leaderboard-message">Couldn't load the leaderboard. Try again later.</p>
            )}
            {status === 'ok' && games.length === 0 && (
                <p className="leaderboard-message">No games have been won yet. Be the first!</p>
            )}

            {status === 'ok' && games.length > 0 && (
                <div className="leaderboard-grid">
                    {games.map((game) => (
                        <div key={game} className="leaderboard-card">
                            <h3>{GAME_NAMES[game] || game}</h3>
                            <ol className="leaderboard-list">
                                {boards[game].map((row, i) => (
                                    <li key={row.username} className={i < 3 ? `rank-${i + 1}` : ''}>
                                        <span className="lb-rank">{MEDALS[i] || `#${i + 1}`}</span>
                                        <span className="lb-name">{row.username}</span>
                                        <span className="lb-wins">{row.wins}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Leaderboard;
