import { useEffect, useRef } from 'react';
import './WarpTransition.css';

const WARP_MS = 1200;

export default function WarpTransition({ game, onDone }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const id = setTimeout(() => onDoneRef.current(), WARP_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="warp" role="status" aria-label={`Entering ${game?.name || 'game'}`}>
      <div className="warp-streaks" />
      <p className="warp-label">Entering {game?.name}…</p>
    </div>
  );
}
