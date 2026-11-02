import { describe, it, expect } from 'vitest';
import { layoutStars } from './skyModel';
import { SKY_GAMES } from './games';

const opts = { width: 800, height: 600, seed: 7 };

describe('layoutStars', () => {
  it('returns one star per game with coordinates inside the bounds', () => {
    const stars = layoutStars(SKY_GAMES, opts);
    expect(stars).toHaveLength(SKY_GAMES.length);
    for (const s of stars) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(opts.width);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(opts.height);
      expect(s.id).toBeTruthy();
      expect(s.route).toBeTruthy();
    }
  });

  it('is deterministic for the same seed', () => {
    const a = layoutStars(SKY_GAMES, opts);
    const b = layoutStars(SKY_GAMES, opts);
    expect(b).toEqual(a);
  });

  it('separates clusters horizontally (strategy left of party)', () => {
    const stars = layoutStars(SKY_GAMES, opts);
    const avg = (c) => {
      const xs = stars.filter((s) => s.cluster === c).map((s) => s.x);
      return xs.reduce((t, x) => t + x, 0) / xs.length;
    };
    expect(avg('strategy')).toBeLessThan(avg('party'));
  });
});
