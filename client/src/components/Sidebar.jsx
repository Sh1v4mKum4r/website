import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import './Sidebar.css';

function Sidebar({ isOpen, onClose }) {
  const [step, setStep] = useState('entry'); // 'entry' | 'lobby'
  const [mode, setMode] = useState(null);    // 'create' | 'join'
  const [name, setName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [myLobbyCode, setMyLobbyCode] = useState(null);
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [lobbyRooms, setLobbyRooms] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    socket.on('lobbyUpdate', ({ players, rooms }) => {
      setLobbyPlayers(players);
      setLobbyRooms(rooms);
    });

    return () => {
      socket.off('lobbyUpdate');
    };
  }, []);

  // Refresh lobby state when sidebar opens and we're already in a lobby
  useEffect(() => {
    if (isOpen && myLobbyCode) {
      socket.emit('getLobbyState', (response) => {
        if (response && !response.error) {
          setLobbyPlayers(response.players);
          setLobbyRooms(response.rooms);
          setStep('lobby');
        }
      });
    }
  }, [isOpen, myLobbyCode]);

  const handleCreateLobby = () => {
    if (!name.trim()) return setError('Please enter your name.');
    setError('');
    // Debug log
    console.log("Creating lobby with name:", name);
    socket.emit('createLobby', { name }, ({ success, lobbyCode }) => {
      console.log("Create lobby result:", success, lobbyCode);
      if (success) {
        setMyLobbyCode(lobbyCode);
        setStep('lobby');
      }
    });
  };

  const handleJoinLobby = () => {
    if (!name.trim()) return setError('Please enter your name.');
    if (!lobbyCode.trim()) return setError('Please enter a lobby code.');
    setError('');
    console.log("Joining lobby:", lobbyCode, "as", name);
    socket.emit('joinLobby', { name, lobbyCode: lobbyCode.toUpperCase() }, ({ success, error }) => {
      console.log("Join lobby result:", success, error);
      if (error) return setError(error);
      setMyLobbyCode(lobbyCode.toUpperCase());
      setStep('lobby');
    });
  };

  const handleCreateRoom = () => {
    socket.emit('createRoom', ({ code, role, error }) => {
      if (error) return alert(error);
      onClose();
      navigate(`/game/tic-tac-toe/${code}`, { state: { role, lobbyCode: myLobbyCode, playerName: name } });
    });
  };

  const handleJoinRoom = (roomCode) => {
    socket.emit('joinRoom', roomCode, ({ code, role, gameData, error }) => {
      if (error) return alert(error);
      onClose();
      navigate(`/game/tic-tac-toe/${code}`, { state: { role, lobbyCode: myLobbyCode, gameData, playerName: name } });
    });
  };

  const handleWatchRoom = (roomCode) => {
    socket.emit('spectateRoom', roomCode, ({ gameData, error }) => {
      if (error) return alert(error);
      onClose();
      navigate(`/game/tic-tac-toe/${roomCode}`, { state: { role: 'spectator', lobbyCode: myLobbyCode, gameData } });
    });
  };

  const handleLeaveLobby = () => {
    socket.emit('leaveLobby');
    setStep('entry');
    setMode(null);
    setMyLobbyCode(null);
    setLobbyPlayers([]);
    setLobbyRooms([]);
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <button className="close-btn" onClick={onClose}>×</button>

        {/* ── ENTRY SCREEN ── */}
        {step === 'entry' && (
          <div className="sidebar-content entry">
            <h2>Game Lobby</h2>
            <p>Create or join a lobby to play with friends.</p>

            {!mode && (
              <div className="sidebar-buttons">
                <button className="primary-btn" onClick={() => setMode('create')}>Create Lobby</button>
                <button className="secondary-btn" onClick={() => setMode('join')}>Join Lobby</button>
              </div>
            )}

            {mode && (
              <div className="sidebar-form">
                <button className="back-link" onClick={() => { setMode(null); setError(''); }}>← Back</button>
                <h3>{mode === 'create' ? 'New Lobby' : 'Join Lobby'}</h3>

                <input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={12}
                  autoFocus
                />

                {mode === 'join' && (
                  <input
                    type="text"
                    placeholder="Lobby Code"
                    value={lobbyCode}
                    onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                    maxLength={5}
                  />
                )}

                {error && <p className="error-text">{error}</p>}

                <button
                  className="primary-btn full-width"
                  onClick={mode === 'create' ? handleCreateLobby : handleJoinLobby}
                >
                  {mode === 'create' ? 'Create & Enter' : 'Join'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── LOBBY DASHBOARD ── */}
        {step === 'lobby' && (
          <div className="sidebar-content dashboard">
            <div className="dashboard-header">
              <h2>Lobby <span className="code">{myLobbyCode}</span></h2>
              <button className="leave-link" onClick={handleLeaveLobby}>Leave</button>
            </div>

            <div className="section">
              <div className="section-title">
                <h3>Game Rooms</h3>
                <button className="small-btn" onClick={handleCreateRoom}>+ New</button>
              </div>
              <div className="list-container">
                {lobbyRooms.length === 0 ? (
                  <p className="empty-text">No active rooms.</p>
                ) : (
                  lobbyRooms.map(room => (
                    <div key={room.code} className="list-item room">
                      <div className="info">
                        <span className="game-name">Tic Tac Toe</span>
                        <span className="players">{room.playerNames.join(' vs ')}</span>
                        {room.spectatorCount > 0 && <span className="spectator-count">👁 {room.spectatorCount}</span>}
                      </div>
                      {room.isFull ? (
                        <button
                          className="watch-btn"
                          onClick={() => handleWatchRoom(room.code)}
                        >
                          Watch
                        </button>
                      ) : (
                        <button
                          className="join-btn"
                          onClick={() => handleJoinRoom(room.code)}
                        >
                          Join
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="section">
              <h3>Online Players ({lobbyPlayers.length})</h3>
              <div className="list-container">
                {lobbyPlayers.length === 0 ? (
                  <p className="empty-text">Just you.</p>
                ) : (
                  lobbyPlayers.map(user => (
                    <div key={user.id} className="list-item player">
                      <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
                      <span>{user.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Sidebar;