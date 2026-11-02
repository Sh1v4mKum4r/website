import { describe, it, expect } from 'vitest';
import { makeCamera, screenToWorld, worldToScreen, clampCamera } from './skyModel';

describe('camera', () => {
  it('makeCamera starts at origin, scale 1', () => {
    expect(makeCamera()).toEqual({ x: 0, y: 0, scale: 1 });
  });
  it('worldToScreen and screenToWorld are inverses', () => {
    const cam = { x: 40, y: -20, scale: 1.5 };
    const s = worldToScreen(cam, 100, 200);
    const w = screenToWorld(cam, s.x, s.y);
    expect(w.x).toBeCloseTo(100, 5);
    expect(w.y).toBeCloseTo(200, 5);
  });
  it('clampCamera keeps scale within [1, 3]', () => {
    expect(clampCamera({ x: 0, y: 0, scale: 0.2 }, { width: 800, height: 600 }).scale).toBe(1);
    expect(clampCamera({ x: 0, y: 0, scale: 9 }, { width: 800, height: 600 }).scale).toBe(3);
  });
});
