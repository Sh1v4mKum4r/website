import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SkyOverlay from './SkyOverlay';

const star = { id: 'chess', name: 'Chess', route: 'chess', players: 128, glyph: '♟', cluster: 'strategy' };

describe('SkyOverlay', () => {
  it('renders nothing when no star is selected', () => {
    const { container } = render(<SkyOverlay star={null} onPlay={() => {}} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the selected game and live count', () => {
    render(<SkyOverlay star={star} onPlay={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Chess')).toBeInTheDocument();
    expect(screen.getByText(/128 playing/i)).toBeInTheDocument();
  });

  it('calls onPlay with the star when Play is clicked', () => {
    const onPlay = vi.fn();
    render(<SkyOverlay star={star} onPlay={onPlay} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(onPlay).toHaveBeenCalledWith(star);
  });
});
