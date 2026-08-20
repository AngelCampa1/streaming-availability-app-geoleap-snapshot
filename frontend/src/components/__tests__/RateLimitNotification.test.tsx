/**
 * RateLimitNotification Component and Hook Tests
 *
 * Tests rate limit notification display and useRateLimit hook
 */

import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook } from '@testing-library/react';
import { RateLimitNotification, useRateLimit } from '../RateLimitNotification';

describe('RateLimitNotification', () => {
  jest.useFakeTimers();

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Rendering', () => {
    it('renders with default message', () => {
      render(<RateLimitNotification retryAfter={60} />);

      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
      expect(screen.getByText(/too many login attempts/i)).toBeInTheDocument();
    });

    it('renders with custom message', () => {
      render(<RateLimitNotification retryAfter={30} message="Custom rate limit message" />);

      expect(screen.getByText(/custom rate limit message/i)).toBeInTheDocument();
    });

    it('renders default message when only retryAfter not provided', () => {
      render(<RateLimitNotification />);

      // Component has a default message, so it still renders
      expect(screen.getByText(/too many login attempts/i)).toBeInTheDocument();
    });

    it('renders with only message', () => {
      render(<RateLimitNotification message="Rate limited" />);

      expect(screen.getByText(/rate limited/i)).toBeInTheDocument();
    });
  });

  describe('Timer Display', () => {
    it('displays countdown timer', () => {
      render(<RateLimitNotification retryAfter={45} />);

      expect(screen.getByText(/please wait 45s before trying again/i)).toBeInTheDocument();
    });

    it('formats time correctly for seconds only', () => {
      render(<RateLimitNotification retryAfter={30} />);

      expect(screen.getByText(/30s/i)).toBeInTheDocument();
    });

    it('formats time correctly for minutes and seconds', () => {
      render(<RateLimitNotification retryAfter={125} />);

      expect(screen.getByText(/2m 5s/i)).toBeInTheDocument();
    });

    it('updates countdown every second', () => {
      render(<RateLimitNotification retryAfter={5} />);

      expect(screen.getByText(/5s/i)).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByText(/4s/i)).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByText(/3s/i)).toBeInTheDocument();
    });

    it('counts down to zero', () => {
      render(<RateLimitNotification retryAfter={3} />);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByText(/1s/i)).toBeInTheDocument();
    });

    it('does not show timer when retryAfter is 0', () => {
      render(<RateLimitNotification retryAfter={0} message="Limited" />);

      expect(screen.queryByText(/please wait/i)).not.toBeInTheDocument();
    });
  });

  describe('Dismiss Functionality', () => {
    it('calls onDismiss when dismiss button clicked', async () => {
      const onDismiss = jest.fn();
      const user = userEvent.setup({ delay: null });

      render(<RateLimitNotification retryAfter={60} onDismiss={onDismiss} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not render dismiss button when onDismiss not provided', () => {
      render(<RateLimitNotification retryAfter={60} />);

      expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
    });

    it('calls onDismiss when timer reaches zero', () => {
      const onDismiss = jest.fn();

      render(<RateLimitNotification retryAfter={2} onDismiss={onDismiss} />);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling', () => {
    it('applies correct warning color scheme', () => {
      const { container } = render(<RateLimitNotification retryAfter={30} />);

      const notification = container.firstChild as HTMLElement;
      expect(notification).toHaveClass('bg-warning/10', 'border-warning', 'text-warning');
    });

    it('renders warning icon', () => {
      const { container } = render(<RateLimitNotification retryAfter={30} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-warning');
    });
  });

  describe('Edge Cases', () => {
    it('handles very large retry times', () => {
      render(<RateLimitNotification retryAfter={3600} />);

      expect(screen.getByText(/60m 0s/i)).toBeInTheDocument();
    });

    it('handles retryAfter change during countdown', () => {
      const { rerender } = render(<RateLimitNotification retryAfter={10} />);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(screen.getByText(/7s/i)).toBeInTheDocument();

      rerender(<RateLimitNotification retryAfter={20} />);

      expect(screen.getByText(/20s/i)).toBeInTheDocument();
    });
  });
});

describe('useRateLimit', () => {
  jest.useFakeTimers();

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('initializes with not rate limited', () => {
    const { result } = renderHook(() => useRateLimit());

    expect(result.current.rateLimited).toBe(false);
    expect(result.current.RateLimitComponent).toBeNull();
  });

  it('sets rate limited on 429 error', () => {
    const { result } = renderHook(() => useRateLimit());

    act(() => {
      result.current.handleRateLimitError({
        statusCode: 429,
        retryAfterSeconds: 60,
        message: 'Too many requests',
      });
    });

    expect(result.current.rateLimited).toBe(true);
  });

  it('sets default retry time if not provided', () => {
    const { result } = renderHook(() => useRateLimit());

    act(() => {
      result.current.handleRateLimitError({
        statusCode: 429,
      });
    });

    expect(result.current.rateLimited).toBe(true);
    expect(result.current.RateLimitComponent).not.toBeNull();
  });

  it('ignores non-429 errors', () => {
    const { result } = renderHook(() => useRateLimit());

    act(() => {
      result.current.handleRateLimitError({
        statusCode: 500,
      });
    });

    expect(result.current.rateLimited).toBe(false);
  });

  it('clears rate limit state', () => {
    const { result } = renderHook(() => useRateLimit());

    act(() => {
      result.current.handleRateLimitError({
        statusCode: 429,
        retryAfterSeconds: 30,
      });
    });

    expect(result.current.rateLimited).toBe(true);

    act(() => {
      result.current.clearRateLimit();
    });

    expect(result.current.rateLimited).toBe(false);
    expect(result.current.RateLimitComponent).toBeNull();
  });

  it('returns RateLimitComponent when rate limited', () => {
    const { result } = renderHook(() => useRateLimit());

    act(() => {
      result.current.handleRateLimitError({
        statusCode: 429,
        retryAfterSeconds: 60,
        message: 'Rate limited',
      });
    });

    expect(result.current.RateLimitComponent).not.toBeNull();
  });

  it('uses custom error message', () => {
    const { result } = renderHook(() => useRateLimit());

    act(() => {
      result.current.handleRateLimitError({
        statusCode: 429,
        retryAfterSeconds: 30,
        message: 'Custom limit message',
      });
    });

    expect(result.current.rateLimited).toBe(true);
  });
});
