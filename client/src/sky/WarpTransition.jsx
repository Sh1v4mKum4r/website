import { useEffect } from 'react';
import './WarpTransition.css';

const WARP_MS = 1200;

export default function WarpTransition({ game, onDone }) {
  useEffect(() => {
    const id = setTimeout(onDone, WARP_MS);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <div className="warp" role="status" aria-label={`Entering ${game?.name || 'game'}`}>
      <div className="warp-streaks" />
      <p className="warp-label">Entering {game?.name}…</p>
    </div>
  );
}
