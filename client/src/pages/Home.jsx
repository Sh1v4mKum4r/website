import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  const handlePlayClick = () => {
    navigate('/games');
  };

  return (
    <>
      <header className="home-header">
        🎮 MultiplayerGames.in
      </header>
      <div className="hero">
        <h1>Play Multiplayer Games Online</h1>
        <p>Real-time browser games. No downloads. Just play.</p>
        <button className="btn" onClick={handlePlayClick}> Start Playing </button>
      </div>
      <footer className="home-footer">
        © 2026 MultiplayerGames.in | Built in India 🇮🇳
      </footer>
    </>
  );
}

export default Home;
