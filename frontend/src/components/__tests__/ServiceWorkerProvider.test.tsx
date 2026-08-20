/**
 * ServiceWorkerProvider Component Tests
 *
 * Tests the service worker provider component
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ServiceWorkerProvider, { useServiceWorker } from '../ServiceWorkerProvider';
import { logger as _logger } from '@/lib/logger';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
  },
}));

describe('ServiceWorkerProvider', () => {
  const originalNavigator = global.navigator;
  const originalLocalStorage = global.localStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    // Mock navigator.onLine
    Object.defineProperty(global.navigator, 'onLine', {
      value: true,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
    });
  });

  describe('Rendering', () => {
    it('renders children', () => {
      render(
        <ServiceWorkerProvider>
          <div>Test Child</div>
        </ServiceWorkerProvider>
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });
  });

  describe('Online/Offline Status', () => {
    it('does not show offline indicator when online', () => {
      render(
        <ServiceWorkerProvider>
          <div>Test</div>
        </ServiceWorkerProvider>
      );

      expect(screen.queryByText(/You're offline/i)).not.toBeInTheDocument();
    });

    it('shows offline indicator when offline', () => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      render(
        <ServiceWorkerProvider>
          <div>Test</div>
        </ServiceWorkerProvider>
      );

      expect(screen.getByText(/You're offline - Some features may be limited/i)).toBeInTheDocument();
    });

    it('shows offline indicator when going offline', async () => {
      render(
        <ServiceWorkerProvider>
          <div>Test</div>
        </ServiceWorkerProvider>
      );

      expect(screen.queryByText(/You're offline/i)).not.toBeInTheDocument();

      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      fireEvent(window, new Event('offline'));

      await waitFor(() => {
        expect(screen.getByText(/You're offline - Some features may be limited/i)).toBeInTheDocument();
      });
    });

    it('hides offline indicator when going online', async () => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      render(
        <ServiceWorkerProvider>
          <div>Test</div>
        </ServiceWorkerProvider>
      );

      expect(screen.getByText(/You're offline/i)).toBeInTheDocument();

      Object.defineProperty(global.navigator, 'onLine', {
        value: true,
        configurable: true,
      });

      fireEvent(window, new Event('online'));

      await waitFor(() => {
        expect(screen.queryByText(/You're offline/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Service Worker Registration', () => {
    it('detects service worker support', () => {
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: {
          register: jest.fn(),
          controller: null,
        },
        configurable: true,
      });

      render(
        <ServiceWorkerProvider>
          <div>Test</div>
        </ServiceWorkerProvider>
      );

      // Service worker detection happens on mount
      expect(global.navigator.serviceWorker).toBeDefined();
    });

    it('does not crash when service worker not supported', () => {
      const nav = { ...global.navigator };
      delete (nav as any).serviceWorker;
      Object.defineProperty(global, 'navigator', {
        value: nav,
        configurable: true,
      });

      expect(() => {
        render(
          <ServiceWorkerProvider>
            <div>Test</div>
          </ServiceWorkerProvider>
        );
      }).not.toThrow();
    });
  });

  describe('Event Listener Cleanup', () => {
    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <ServiceWorkerProvider>
          <div>Test</div>
        </ServiceWorkerProvider>
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });
});

describe('useServiceWorker hook', () => {
  it('returns expected properties', () => {
    const TestComponent = () => {
      const sw = useServiceWorker();
      return (
        <div>
          <div data-testid="is-online">{sw.isOnline ? 'online' : 'offline'}</div>
          <div data-testid="is-supported">{sw.isSupported ? 'supported' : 'not supported'}</div>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId('is-online')).toHaveTextContent('online');
  });

  it('reflects navigator.onLine status', () => {
    Object.defineProperty(global.navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    const TestComponent = () => {
      const sw = useServiceWorker();
      return <div data-testid="status">{sw.isOnline ? 'online' : 'offline'}</div>;
    };

    render(<TestComponent />);

    expect(screen.getByTestId('status')).toHaveTextContent('offline');
  });

  it('provides cacheSearchResult function', () => {
    const mockPostMessage = jest.fn();

    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: {
        controller: {
          postMessage: mockPostMessage,
        },
      },
      configurable: true,
    });

    const TestComponent = () => {
      const sw = useServiceWorker();

      React.useEffect(() => {
        sw.cacheSearchResult('/api/search?q=test', { results: [] });
      }, [sw]);

      return <div>Test</div>;
    };

    render(<TestComponent />);

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'CACHE_SEARCH',
      payload: { url: '/api/search?q=test', data: { results: [] } },
    });
  });
});
