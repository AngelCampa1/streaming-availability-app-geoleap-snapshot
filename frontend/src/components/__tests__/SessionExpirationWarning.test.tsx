/**
 * SessionExpirationWarning Component Tests
 *
 * CRITICAL: Auth security component - auto-logout on session expiration
 * Tests countdown timer, auto-logout, session extension, and manual logout.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionExpirationWarning } from '../SessionExpirationWarning';

// Mock the AuthContext
const mockExtendSession = jest.fn();
const mockLogout = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    sessionExpiring: false,
    extendSession: mockExtendSession,
    logout: mockLogout,
  })),
}));

// Get the mocked useAuth to modify its return value
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useAuth } = require('@/contexts/AuthContext');

describe('SessionExpirationWarning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default: session not expiring
    useAuth.mockReturnValue({
      sessionExpiring: false,
      extendSession: mockExtendSession,
      logout: mockLogout,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering & Visibility', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(<SessionExpirationWarning />);
      }).not.toThrow();
    });

    it('renders null when session is not expiring', () => {
      const { container } = render(<SessionExpirationWarning />);

      expect(container.firstChild).toBeNull();
    });

    it('shows warning banner when session is expiring', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      render(<SessionExpirationWarning />);

      expect(screen.getByText(/Your session will expire in/i)).toBeInTheDocument();
    });

    it('displays warning icon', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      const { container } = render(<SessionExpirationWarning />);

      const svgIcon = container.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
      expect(svgIcon).toHaveClass('w-6', 'h-6');
    });

    it('has fixed positioning at top of screen', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      const { container } = render(<SessionExpirationWarning />);

      const banner = container.firstChild as HTMLElement;
      expect(banner).toHaveClass('fixed', 'top-0', 'left-0', 'right-0', 'z-50');
    });

    it('has warning color styling', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      const { container } = render(<SessionExpirationWarning />);

      const banner = container.firstChild as HTMLElement;
      expect(banner).toHaveClass('bg-warning', 'text-warning-foreground');
    });
  });

  describe('Countdown Timer', () => {
    it('starts countdown at 2:00 (120 seconds)', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      render(<SessionExpirationWarning />);

      expect(screen.getByText(/Your session will expire in 2:00/i)).toBeInTheDocument();
    });

    it('decrements countdown every second', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      render(<SessionExpirationWarning />);

      // Initial: 2:00
      expect(screen.getByText(/2:00/)).toBeInTheDocument();

      // After 1 second: 1:59
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText(/1:59/)).toBeInTheDocument();

      // After 60 seconds total: 1:00
      act(() => {
        jest.advanceTimersByTime(59000);
      });
      expect(screen.getByText(/1:00/)).toBeInTheDocument();

      // After 70 seconds total: 0:50
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      expect(screen.getByText(/0:50/)).toBeInTheDocument();
    });

    it('formats seconds with leading zero', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      render(<SessionExpirationWarning />);

      // Advance to 1:09
      act(() => {
        jest.advanceTimersByTime(51000); // 120 - 51 = 69 seconds = 1:09
      });

      expect(screen.getByText(/1:09/)).toBeInTheDocument();
    });

    it('counts down to 0:00', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      render(<SessionExpirationWarning />);

      // Advance to 0:01
      act(() => {
        jest.advanceTimersByTime(119000);
      });
      expect(screen.getByText(/0:01/)).toBeInTheDocument();

      // Advance to 0:00
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText(/0:00/)).toBeInTheDocument();
    });

    it('resets countdown when sessionExpiring becomes false', () => {
      const { rerender } = render(<SessionExpirationWarning />);

      // Start expiring
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });
      rerender(<SessionExpirationWarning />);

      // Countdown some
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      expect(screen.getByText(/1:50/)).toBeInTheDocument();

      // Stop expiring
      useAuth.mockReturnValue({
        sessionExpiring: false,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });
      rerender(<SessionExpirationWarning />);

      // Component should be hidden
      expect(screen.queryByText(/Your session will expire in/)).not.toBeInTheDocument();

      // Start expiring again - should reset to 2:00
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });
      rerender(<SessionExpirationWarning />);

      expect(screen.getByText(/2:00/)).toBeInTheDocument();
    });
  });

  describe('Auto-Logout Functionality', () => {
    it('calls logout when countdown reaches 0', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      render(<SessionExpirationWarning />);

      // Advance to 0:01
      act(() => {
        jest.advanceTimersByTime(119000);
      });
      expect(mockLogout).not.toHaveBeenCalled();

      // Advance to 0:00 - should trigger logout
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('stops countdown after auto-logout', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      render(<SessionExpirationWarning />);

      // Advance to trigger auto-logout
      act(() => {
        jest.advanceTimersByTime(120000);
      });

      expect(mockLogout).toHaveBeenCalledTimes(1);

      // Advance further - should not call logout again
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('clears interval when component unmounts', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      const { unmount } = render(<SessionExpirationWarning />);

      // Start countdown
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Unmount
      unmount();

      // Advance timers - logout should not be called
      act(() => {
        jest.advanceTimersByTime(200000);
      });

      expect(mockLogout).not.toHaveBeenCalled();
    });
  });

  describe('Button Functionality', () => {
    it('renders Extend Session button', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      render(<SessionExpirationWarning />);

      expect(screen.getByRole('button', { name: /Extend Session/i })).toBeInTheDocument();
    });

    it('renders Logout Now button', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      render(<SessionExpirationWarning />);

      expect(screen.getByRole('button', { name: /Logout Now/i })).toBeInTheDocument();
    });

    it('calls extendSession when Extend Session button is clicked', async () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      const user = userEvent.setup({ delay: null });
      render(<SessionExpirationWarning />);

      const extendButton = screen.getByRole('button', { name: /Extend Session/i });
      await user.click(extendButton);

      expect(mockExtendSession).toHaveBeenCalledTimes(1);
    });

    it('calls logout when Logout Now button is clicked', async () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      const user = userEvent.setup({ delay: null });
      render(<SessionExpirationWarning />);

      const logoutButton = screen.getByRole('button', { name: /Logout Now/i });
      await user.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('can click Extend Session multiple times', async () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      const user = userEvent.setup({ delay: null });
      render(<SessionExpirationWarning />);

      const extendButton = screen.getByRole('button', { name: /Extend Session/i });

      await user.click(extendButton);
      await user.click(extendButton);
      await user.click(extendButton);

      expect(mockExtendSession).toHaveBeenCalledTimes(3);
    });

    it('Extend Session button has correct styling', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      render(<SessionExpirationWarning />);

      const extendButton = screen.getByRole('button', { name: /Extend Session/i });
      expect(extendButton).toHaveClass('bg-background', 'text-foreground', 'rounded-full', 'font-medium');
    });

    it('Logout Now button has correct styling', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      render(<SessionExpirationWarning />);

      const logoutButton = screen.getByRole('button', { name: /Logout Now/i });
      expect(logoutButton).toHaveClass('text-warning-foreground', 'border', 'border-current', 'rounded-full', 'font-medium');
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid sessionExpiring toggle', () => {
      const { rerender } = render(<SessionExpirationWarning />);

      // Toggle on
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });
      rerender(<SessionExpirationWarning />);
      expect(screen.getByText(/2:00/)).toBeInTheDocument();

      // Toggle off immediately
      useAuth.mockReturnValue({
        sessionExpiring: false,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });
      rerender(<SessionExpirationWarning />);
      expect(screen.queryByText(/Your session will expire in/)).not.toBeInTheDocument();

      // Toggle on again
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });
      rerender(<SessionExpirationWarning />);
      expect(screen.getByText(/2:00/)).toBeInTheDocument();
    });

    it('countdown continues accurately across multiple renders', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      const { rerender } = render(<SessionExpirationWarning />);

      // Advance 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });
      expect(screen.getByText(/1:30/)).toBeInTheDocument();

      // Re-render (shouldn't affect countdown)
      rerender(<SessionExpirationWarning />);

      // Advance another 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });
      expect(screen.getByText(/1:00/)).toBeInTheDocument();
    });

    it('handles sessionExpiring changing while countdown is active', () => {
      const { rerender } = render(<SessionExpirationWarning />);

      // Start expiring
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });
      rerender(<SessionExpirationWarning />);

      // Countdown for 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });
      expect(screen.getByText(/1:30/)).toBeInTheDocument();

      // Session extended (sessionExpiring becomes false)
      useAuth.mockReturnValue({
        sessionExpiring: false,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });
      rerender(<SessionExpirationWarning />);

      // Should be hidden and countdown stopped
      expect(screen.queryByText(/Your session will expire in/)).not.toBeInTheDocument();

      // Even after time passes, logout should not be called
      act(() => {
        jest.advanceTimersByTime(200000);
      });
      expect(mockLogout).not.toHaveBeenCalled();
    });
  });

  describe('Layout & Structure', () => {
    it('displays warning message and controls in same container', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      const { container } = render(<SessionExpirationWarning />);

      const innerContainer = container.querySelector('.container');
      expect(innerContainer).toBeInTheDocument();
      expect(innerContainer).toHaveClass('mx-auto', 'flex', 'items-center', 'justify-between');
    });

    it('groups message with icon', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      const { container } = render(<SessionExpirationWarning />);

      const messageGroup = container.querySelector('.flex.items-center.space-x-4');
      expect(messageGroup).toBeInTheDocument();

      // Should contain icon and text
      const svg = messageGroup?.querySelector('svg');
      const text = messageGroup?.querySelector('span');
      expect(svg).toBeInTheDocument();
      expect(text).toBeInTheDocument();
    });

    it('groups buttons together', () => {
      useAuth.mockReturnValue({
        sessionExpiring: true,
        extendSession: mockExtendSession,
        logout: mockLogout,
      });

      const { container } = render(<SessionExpirationWarning />);

      const buttonGroup = container.querySelector('.flex.items-center.space-x-3');
      expect(buttonGroup).toBeInTheDocument();

      // Should contain both buttons
      const buttons = buttonGroup?.querySelectorAll('button');
      expect(buttons).toHaveLength(2);
    });
  });
});
