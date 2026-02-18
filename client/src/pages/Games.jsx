import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Games.css';

function Games() {
    const navigate = useNavigate();

    // In the future, this could be generated from a list of games.
    const handleSelectGame = (gamePath) => {
        // For now, we only have tic-tac-toe.
        // A real implementation would go to a game-specific lobby.
        // But for now, we can just go to the game directly for simplicity.
        // Let's stick with the user's flow: this just shows game buttons.
        // The sidebar will handle room creation.
        alert("Please use the 'Lobby' button in the navbar to create or join a room for this game.");
    };

    return (
        <div className="games-container">
            <h2>Select a Game</h2>
            <div className="game-list">
                <div className="game-selection-card" onClick={() => handleSelectGame('/tic-tac-toe')}>
                    <h3>Tic Tac Toe</h3>
                    <p>The classic game of X's and O's.</p>
                </div>
                {/* Add more game cards here in the future */}
            </div>
        </div>
    );
}

export default Games;
