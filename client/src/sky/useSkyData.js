import { useEffect, useMemo, useRef, useState } from 'react';
import { socket as defaultSocket } from '../socket';
import { SKY_GAMES } from './games';
import { layoutStars, applyCounts, makeEffect } from './skyModel';

// `socket` is injectable for tests; defaults to the shared app socket.
export function useSkyData({ width, height, seed = 42, socket = defaultSocket }) {
  const base = useMemo(
    () => layoutStars(SKY_GAMES, { width, height, seed }),
    [width, height, seed]
  );
  const [counts, setCounts] = useState({});
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [effects, setEffects] = useState([]);
  const effectsRef = useRef(effects);
  effectsRef.current = effects;

  useEffect(() => {
    const onState = (state) => {
      const map = {};
      for (const g of state.games || []) map[g.game] = g.players;
      setCounts(map);
      setTotalPlayers(state.totalPlayers || 0);
    };
    const onEvent = (ev) => {
      setEffects((prev) => [...prev, makeEffect(ev.type, ev, 2200)]);
    };
    socket.on('sky:state', onState);
    socket.on('sky:event', onEvent);
    return () => {
      socket.off('sky:state', onState);
      socket.off('sky:event', onEvent);
    };
  }, [socket]);

  const stars = useMemo(() => applyCounts(base, counts), [base, counts]);
  return { stars, effects, setEffects, totalPlayers };
}
