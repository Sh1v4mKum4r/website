import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SkyCanvas from '../sky/SkyCanvas';
import SkyOverlay from '../sky/SkyOverlay';
import WarpTransition from '../sky/WarpTransition';
import FallbackList from '../sky/FallbackList';
import { useSkyData } from '../sky/useSkyData';
import './Sky.css';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Sky() {
  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const [size, setSize] = useState({ width: 800, height: 560 });
  const [selected, setSelected] = useState(null);
  const [warpGame, setWarpGame] = useState(null);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize({
      width: el.clientWidth || window.innerWidth,
      height: Math.max(420, el.clientHeight || window.innerHeight),
    });
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const { stars, totalPlayers, effects } = useSkyData({ width: size.width, height: size.height });

  const play = (star) => {
    if (reduced) { navigate(`/game/${star.route}/local`, { state: { gameType: star.id, isLocal: true } }); return; }
    setSelected(null);
    setWarpGame(star);
  };

  return (
    <div className="sky-page" data-theme="cosmic" ref={wrapRef}>
      <header className="sky-head">
        <h2>The Sky</h2>
        <span className="sky-total">◍ {totalPlayers} playing</span>
        <Link className="sky-back" to="/games">Classic view</Link>
      </header>

      {reduced ? (
        <FallbackList stars={stars} onPlay={play} />
      ) : (
        <div className="sky-surface">
          <SkyCanvas stars={stars} effects={effects} width={size.width} height={size.height} onSelect={setSelected} />
          <SkyOverlay star={selected} onPlay={play} onClose={() => setSelected(null)} />
          <div className="sr-only"><FallbackList stars={stars} onPlay={play} /></div>
        </div>
      )}

      {warpGame && (
        <WarpTransition
          game={warpGame}
          onDone={() => navigate(`/game/${warpGame.route}/local`, { state: { gameType: warpGame.id, isLocal: true } })}
        />
      )}
    </div>
  );
}
