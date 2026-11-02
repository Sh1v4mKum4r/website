// client/src/sky/games.test.js
import { describe, it, expect } from 'vitest';
import { SKY_GAMES, CLUSTERS } from './games';

describe('SKY_GAMES', () => {
  it('lists every game with id, name, route, cluster, glyph', () => {
    expect(SKY_GAMES.length).toBeGreaterThanOrEqual(14);
    for (const g of SKY_GAMES) {
      expect(g.id).toBeTruthy();
      expect(g.name).toBeTruthy();
      expect(g.route).toBeTruthy();
      expect(g.glyph).toBeTruthy();
      expect(CLUSTERS[g.cluster]).toBeTruthy();
    }
  });

  it('uses only defined clusters', () => {
    expect(Object.keys(CLUSTERS).sort()).toEqual(['party', 'strategy', 'word']);
  });
});
