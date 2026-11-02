import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sky from './Sky';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => ({
    moveTo() {}, lineTo() {}, stroke() {}, set strokeStyle(_) {}, set lineWidth(_) {},
    closePath() {}, setLineDash() {}, set lineDashOffset(_) {}, createLinearGradient() { return { addColorStop() {} }; }, ellipse() {}, rotate() {},
    clearRect() {}, beginPath() {}, arc() {}, fill() {}, save() {}, restore() {}, fillRect() {},
    createRadialGradient() { return { addColorStop() {} }; }, fillText() {}, translate() {}, scale() {},
    set fillStyle(_) {}, set globalAlpha(_) {}, set font(_) {}, set textAlign(_) {}, set shadowBlur(_) {}, set shadowColor(_) {},
  });
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(16), 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
  window.matchMedia = window.matchMedia || ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
});

describe('Sky page', () => {
  it('renders the sky surface with a heading', () => {
    render(<MemoryRouter><Sky /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /the sky/i })).toBeInTheDocument();
  });
});
