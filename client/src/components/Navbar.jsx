import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar({ onLobbyClick }) {
  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">🎮 MultiplayerGames.in</Link>
      <div className="nav-links">
        <button className="nav-button" onClick={onLobbyClick}>Lobby</button>
      </div>
    </nav>
  );
}

export default Navbar;
