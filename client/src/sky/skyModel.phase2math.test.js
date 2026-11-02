import { describe, it, expect } from 'vitest';
import { clusterCentroids, effectProgress, cometPos } from './skyModel';

describe('clusterCentroids', () => {
  it('averages star positions per cluster', () => {
    const stars = [
      { cluster: 'strategy', x: 0, y: 0 }, { cluster: 'strategy', x: 100, y: 50 },
      { cluster: 'word', x: 300, y: 300 },
    ];
    const c = clusterCentroids(stars);
    expect(c.strategy).toEqual({ x: 50, y: 25 });
    expect(c.word).toEqual({ x: 300, y: 300 });
  });
});

describe('effectProgress', () => {
  it('is 0 at birth and 1 at ttl', () => {
    expect(effectProgress({ t: 0, ttl: 2000 })).toBe(0);
    expect(effectProgress({ t: 2000, ttl: 2000 })).toBe(1);
    expect(effectProgress({ t: 1000, ttl: 2000 })).toBe(0.5);
  });
});

describe('cometPos', () => {
  it('interpolates from A to B by p', () => {
    expect(cometPos({ x: 0, y: 0 }, { x: 100, y: 200 }, 0.5)).toEqual({ x: 50, y: 100 });
  });
});
