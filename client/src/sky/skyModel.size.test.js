// client/src/sky/skyModel.size.test.js
import { describe, it, expect } from 'vitest';
import { sizeFor, brightnessFor } from './skyModel';

describe('sizeFor', () => {
  it('returns the base radius at zero players', () => {
    expect(sizeFor(0)).toBe(10);
  });
  it('grows with players but is capped', () => {
    expect(sizeFor(10)).toBeGreaterThan(sizeFor(2));
    expect(sizeFor(1000)).toBeLessThanOrEqual(26);
  });
});

describe('brightnessFor', () => {
  it('is 0.35 at zero players and approaches 1', () => {
    expect(brightnessFor(0)).toBeCloseTo(0.35, 2);
    expect(brightnessFor(1000)).toBeGreaterThan(0.95);
    expect(brightnessFor(1000)).toBeLessThanOrEqual(1);
  });
});
