/**
 * OfflineBanner Component Tests
 *
 * Tests the offline status banner component
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfflineBanner } from '../OfflineBanner';

describe('OfflineBanner', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.navigator = originalNavigator;
  });

  describe('Initial Rendering', () => {
    it('does not render when online', () => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: true,
        configurable: true,
      });

      render(<OfflineBanner />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('renders when offline', () => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      render(<OfflineBanner />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    });
  });

  describe('Content Display', () => {
    beforeEach(() => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        configurable: true,
      });
    });

    it('displays offline message', () => {
      render(<OfflineBanner />);

      expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
      expect(screen.getByText(/some features may not work until you reconnect/i)).toBeInTheDocument();
    });

    it('displays wifi off icon', () => {
      const { container } = render(<OfflineBanner />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('displays dismiss button', () => {
      render(<OfflineBanner />);

      const dismissButton = screen.getByRole('button', { name: /dismiss offline notification/i });
      expect(dismissButton).toBeInTheDocument();
    });

    it('has correct ARIA attributes', () => {
      render(<OfflineBanner />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        configurable: true,
      });
    });

    it('hides banner when dismiss button clicked', async () => {
      const user = userEvent.setup();

      render(<OfflineBanner />);

      const dismissButton = screen.getByRole('button', { name: /dismiss offline notification/i });
      await user.click(dismissButton);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('remains dismissed after dismiss', async () => {
      const user = userEvent.setup();

      const { rerender } = render(<OfflineBanner />);

      const dismissButton = screen.getByRole('button', { name: /dismiss offline notification/i });
      await user.click(dismissButton);

      rerender(<OfflineBanner />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Online/Offline Events', () => {
    it('shows banner when going offline', async () => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: true,
        configurable: true,
      });

      render(<OfflineBanner />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // Simulate going offline
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        configurable: true,
      });
      fireEvent(window, new Event('offline'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('hides banner when going online', async () => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      render(<OfflineBanner />);

      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Simulate going online
      Object.defineProperty(global.navigator, 'onLine', {
        value: true,
        configurable: true,
      });
      fireEvent(window, new Event('online'));

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('resets dismissed state when going online', async () => {
      const user = userEvent.setup();

      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      render(<OfflineBanner />);

      // Dismiss the banner
      const dismissButton = screen.getByRole('button', { name: /dismiss offline notification/i });
      await user.click(dismissButton);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // Go online
      fireEvent(window, new Event('online'));

      // Go offline again - banner should reappear
      fireEvent(window, new Event('offline'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('shows banner again after dismissing when going offline again', async () => {
      const user = userEvent.setup();

      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      render(<OfflineBanner />);

      // Dismiss
      await user.click(screen.getByRole('button', { name: /dismiss/i }));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // Go online then offline again
      fireEvent(window, new Event('online'));
      fireEvent(window, new Event('offline'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Event Listener Cleanup', () => {
    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      const { unmount } = render(<OfflineBanner />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Styling', () => {
    beforeEach(() => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        configurable: true,
      });
    });

    it('applies correct positioning classes', () => {
      render(<OfflineBanner />);

      const banner = screen.getByRole('alert');
      expect(banner).toHaveClass('fixed', 'top-0', 'left-0', 'right-0', 'z-50');
    });

    it('applies warning color scheme', () => {
      render(<OfflineBanner />);

      const banner = screen.getByRole('alert');
      expect(banner).toHaveClass('bg-warning', 'text-warning-foreground');
    });
  });
});
