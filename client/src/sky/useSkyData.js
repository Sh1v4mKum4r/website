import { useEffect, useMemo, useState } from 'react';
import { socket as defaultSocket } from '../socket';
import { SKY_GAMES } from './games';
import { layoutStars, applyCounts, makeEffect, ageEffects } from './skyModel';

// `socket` is injectable for tests; defaults to the shared app socket.
export function useSkyData({ width, height, seed = 42, socket = defaultSocket }) {
  const base = useMemo(
    () => layoutStars(SKY_GAMES, { width, height, seed }),
    [width, height, seed]
  );
  const [counts, setCounts] = useState({});
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [effects, setEffects] = useState([]);

  useEffect(() => {
    const onState = (state) => {
      const map = {};
      for (const g of state.games || []) map[g.game] = g.players;
      setCounts(map);
      setTotalPlayers(state.totalPlayers || 0);
    };
    const onEvent = (ev) => {
      setEffects((prev) => [...prev, makeEffect(ev.type, ev, 2200)].slice(-20));
    };
    socket.on('sky:state', onState);
    socket.on('sky:event', onEvent);
    return () => {
      socket.off('sky:state', onState);
      socket.off('sky:event', onEvent);
    };
  }, [socket]);

  useEffect(() => {
    const id = setInterval(() => {
      setEffects((prev) => (prev.length ? ageEffects(prev, 100) : prev));
    }, 100);
    return () => clearInterval(id);
  }, []);

  const stars = useMemo(() => applyCounts(base, counts), [base, counts]);
  return { stars, effects, setEffects, totalPlayers };
}
