import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import SkyCanvas from './SkyCanvas';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => ({
    clearRect() {}, beginPath() {}, arc() {}, fill() {}, save() {}, restore() {},
    fillRect() {}, createRadialGradient() { return { addColorStop() {} }; },
    set fillStyle(_) {}, set globalAlpha(_) {}, set font(_) {}, fillText() {},
    set textAlign(_) {}, set shadowBlur(_) {}, set shadowColor(_) {}, translate() {}, scale() {},
  });
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(16), 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
});

const stars = [
  { id: 'chess', name: 'Chess', route: 'chess', cluster: 'strategy', glyph: '♟', x: 120, y: 90, radius: 16, brightness: 1 },
];

describe('SkyCanvas', () => {
  it('renders a canvas', () => {
    const { container } = render(<SkyCanvas stars={stars} effects={[]} width={400} height={300} onSelect={() => {}} />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('calls onSelect with the star under a click', () => {
    const onSelect = vi.fn();
    const { container } = render(<SkyCanvas stars={stars} effects={[]} width={400} height={300} onSelect={onSelect} />);
    const canvas = container.querySelector('canvas');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300 });
    fireEvent.click(canvas, { clientX: 122, clientY: 92 });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'chess' }));
  });
});
