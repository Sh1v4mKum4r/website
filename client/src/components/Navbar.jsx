import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { toggleMute, getMuted } from '../utils/sounds';
import { useTheme } from '../context/ThemeContext';
import './Navbar.css';

function Navbar({ onLobbyClick }) {
  const [muted, setMuted] = useState(getMuted());
  const { theme, toggleTheme } = useTheme();

  const handleToggleMute = () => setMuted(toggleMute());

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <span className="nav-brand-dot" aria-hidden="true" />
        MultiplayerGames<span className="nav-brand-tld">.in</span>
      </Link>

      <div className="nav-links">
        <NavLink to="/sky" className="nav-link">The Sky</NavLink>
        <NavLink to="/games" className="nav-link">Games</NavLink>
        <NavLink to="/leaderboard" className="nav-link">Leaderboard</NavLink>

        <span className="nav-divider" aria-hidden="true" />

        <button className="nav-icon" onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'} aria-label="Toggle theme">
          {theme === 'light' ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
          )}
        </button>

        <button className="nav-icon" onClick={handleToggleMute} title={muted ? 'Unmute' : 'Mute'} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M22 9l-6 6M16 9l6 6" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
          )}
        </button>

        <button className="nav-lobby" onClick={onLobbyClick}>Lobby</button>
      </div>
    </nav>
  );
}

export default Navbar;
