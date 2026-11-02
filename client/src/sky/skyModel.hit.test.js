import { describe, it, expect } from 'vitest';
import { applyCounts, hitTest } from './skyModel';

const stars = [
  { id: 'a', x: 100, y: 100 },
  { id: 'b', x: 300, y: 300 },
];

describe('applyCounts', () => {
  it('adds players, radius and brightness from a counts map', () => {
    const out = applyCounts(stars, { a: 5 });
    const a = out.find((s) => s.id === 'a');
    const b = out.find((s) => s.id === 'b');
    expect(a.players).toBe(5);
    expect(a.radius).toBeGreaterThan(10);
    expect(a.brightness).toBeGreaterThan(0.35);
    expect(b.players).toBe(0); // missing → zero
  });
});

describe('hitTest', () => {
  const sized = applyCounts(stars, { a: 0, b: 0 }); // radius ~10 each
  it('returns the star when the point is within its radius', () => {
    expect(hitTest(sized, 104, 103).id).toBe('a');
  });
  it('returns null when the point is far from every star', () => {
    expect(hitTest(sized, 500, 500)).toBe(null);
  });
  it('returns the nearest star when two overlap', () => {
    const close = applyCounts([{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 112, y: 100 }], { a: 0, b: 0 });
    expect(hitTest(close, 101, 100).id).toBe('a');
  });
});
