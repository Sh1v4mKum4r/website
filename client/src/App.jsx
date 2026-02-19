import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Games from './pages/Games';
import Game from './pages/Game';
import MainLayout from './layouts/MainLayout';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<MainLayout />}>
            <Route path="/games" element={<Games />} />
            <Route path="/game/tic-tac-toe/:roomCode" element={<Game />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;