import { describe, it, expect } from 'vitest';
import { makeEffect, ageEffects, generateStarfield } from './skyModel';

describe('effects queue', () => {
  it('makeEffect carries type, payload, ttl and starts at t=0', () => {
    const e = makeEffect('win', { game: 'chess' }, 2000);
    expect(e.type).toBe('win');
    expect(e.payload.game).toBe('chess');
    expect(e.t).toBe(0);
    expect(e.ttl).toBe(2000);
    expect(e.id).toBeTruthy();
  });

  it('ageEffects advances time and drops expired effects', () => {
    const a = makeEffect('win', {}, 1000);
    const b = makeEffect('win', {}, 5000);
    const next = ageEffects([a, b], 1200);
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe(b.id);
    expect(next[0].t).toBe(1200);
  });
});

describe('generateStarfield', () => {
  it('is deterministic and within bounds', () => {
    const one = generateStarfield(3, 50, 400, 300);
    const two = generateStarfield(3, 50, 400, 300);
    expect(one).toEqual(two);
    expect(one).toHaveLength(50);
    for (const s of one) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(400);
      expect(s.y).toBeLessThanOrEqual(300);
    }
  });
});
