import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import './Sidebar.css';

function Sidebar({ isOpen, onClose }) {
  const [roomInput, setRoomInput] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    // For now, it defaults to creating a Tic-Tac-Toe room.
    // This can be expanded when more games are added.
    socket.emit("createRoom", ({ code, role }) => {
      onClose(); // Close sidebar on navigation
      navigate(`/game/tic-tac-toe/${code}`, { state: { role } });
    });
  };

  const handleJoinRoom = () => {
    if (roomInput.trim() === '') return alert("Please enter a room code.");
    socket.emit("joinRoom", roomInput.toUpperCase(), ({ error, code, role }) => {
      if (error) {
        alert(error);
      } else {
        onClose(); // Close sidebar on navigation
        navigate(`/game/tic-tac-toe/${code}`, { state: { role } });
      }
    });
  };

  return (
    <>
        <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
        <div className={`sidebar ${isOpen ? 'open' : ''}`}>
            <button className="close-btn" onClick={onClose}>×</button>
            <h2>Lobby</h2>
            <div className="game-card">
                <h3>Tic Tac Toe</h3>
                <div className="lobby-actions">
                    <button onClick={handleCreateRoom}>Create Room</button>
                    <div className="join-lobby">
                        <input 
                          placeholder="Room Code" 
                          value={roomInput}
                          onChange={(e) => setRoomInput(e.target.value)}
                          style={{ textTransform: 'uppercase' }}
                        />
                        <button onClick={handleJoinRoom}>Join Room</button>
                    </div>
                </div>
            </div>
            {/* When more games are added, logic can be updated to show options for the selected game */}
        </div>
    </>
  );
}

export default Sidebar;