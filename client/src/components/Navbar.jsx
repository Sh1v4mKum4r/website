import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toggleMute, getMuted } from '../utils/sounds';
import { useTheme } from '../context/ThemeContext';
import './Navbar.css';

function Navbar({ onLobbyClick }) {
  const [muted, setMuted] = useState(getMuted());
  const { theme, toggleTheme } = useTheme();

  const handleToggleMute = () => {
    const newState = toggleMute();
    setMuted(newState);
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">🎮 MultiplayerGames.in</Link>
      <div className="nav-links">
        <button className="nav-button" onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button className="nav-button" onClick={handleToggleMute} title={muted ? 'Unmute' : 'Mute'}>
          {muted ? '🔇' : '🔊'}
        </button>
        <button className="nav-button" onClick={onLobbyClick}>Lobby</button>
      </div>
    </nav>
  );
}

export default Navbar;
