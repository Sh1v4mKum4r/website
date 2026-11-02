import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSkyData } from './useSkyData';

// Minimal fake socket that records handlers so the test can fire events.
function makeFakeSocket() {
  const handlers = {};
  return {
    on: (ev, fn) => { (handlers[ev] ||= []).push(fn); },
    off: (ev, fn) => { handlers[ev] = (handlers[ev] || []).filter((h) => h !== fn); },
    emit: () => {},
    fire: (ev, data) => (handlers[ev] || []).forEach((h) => h(data)),
  };
}

describe('useSkyData', () => {
  it('lays out stars and applies live counts from sky:state', () => {
    const socket = makeFakeSocket();
    const { result } = renderHook(() => useSkyData({ width: 800, height: 600, socket }));
    expect(result.current.stars.length).toBeGreaterThan(0);

    act(() => socket.fire('sky:state', { totalPlayers: 5, games: [{ game: 'connect4', players: 5, rooms: 2 }] }));
    const c4 = result.current.stars.find((s) => s.id === 'connect4');
    expect(c4.players).toBe(5);
    expect(result.current.totalPlayers).toBe(5);
  });

  it('pushes an effect on sky:event', () => {
    const socket = makeFakeSocket();
    const { result } = renderHook(() => useSkyData({ width: 800, height: 600, socket }));
    act(() => socket.fire('sky:event', { type: 'win', game: 'chess' }));
    expect(result.current.effects).toHaveLength(1);
    expect(result.current.effects[0].type).toBe('win');
  });
});
