import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import WarpTransition from './WarpTransition';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('WarpTransition', () => {
  it('calls onDone after the animation duration', () => {
    const onDone = vi.fn();
    render(<WarpTransition game={{ name: 'Chess' }} onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1300);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
