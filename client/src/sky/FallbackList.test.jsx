import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FallbackList from './FallbackList';

const stars = [
  { id: 'chess', name: 'Chess', route: 'chess', players: 12, glyph: '♟' },
  { id: 'wordle', name: 'Wordle', route: 'wordle', players: 3, glyph: '✺' },
];

describe('FallbackList', () => {
  it('renders a button per game with its live count', () => {
    render(<FallbackList stars={stars} onPlay={() => {}} />);
    expect(screen.getByRole('button', { name: /Chess.*12/s })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Wordle.*3/s })).toBeInTheDocument();
  });

  it('calls onPlay with the game when activated', () => {
    const onPlay = vi.fn();
    render(<FallbackList stars={stars} onPlay={onPlay} />);
    fireEvent.click(screen.getByRole('button', { name: /Chess/ }));
    expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({ id: 'chess' }));
  });
});
