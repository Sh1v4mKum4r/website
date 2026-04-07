import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import Home from './pages/Home';
import Games from './pages/Games';
import Game from './pages/Game';
import MainLayout from './layouts/MainLayout';
import './context/theme.css';
import './App.css';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <ToastProvider>
          <div className="App">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route element={<MainLayout />}>
                <Route path="/games" element={<Games />} />
                <Route path="/game/tic-tac-toe/:roomCode" element={<Game />} />
                <Route path="/game/connect4/:roomCode" element={<Game />} />
                <Route path="/game/othello/:roomCode" element={<Game />} />
                <Route path="/game/checkers/:roomCode" element={<Game />} />
                <Route path="/game/gomoku/:roomCode" element={<Game />} />
                <Route path="/game/mancala/:roomCode" element={<Game />} />
                <Route path="/game/dots-and-boxes/:roomCode" element={<Game />} />
                <Route path="/game/nim/:roomCode" element={<Game />} />
                <Route path="/game/ultimate-tic-tac-toe/:roomCode" element={<Game />} />
                <Route path="/game/chain-reaction/:roomCode" element={<Game />} />
                <Route path="/game/memory/:roomCode" element={<Game />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </ToastProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;