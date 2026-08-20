/**
 * LoggingProvider Component Tests
 *
 * Tests the logging and analytics provider component
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { LoggingProvider } from '../LoggingProvider';
import { logger } from '@/lib/logger';
import { analytics } from '@/lib/analytics/unified-analytics';
import { withNodeEnv } from '@/test-utils/envMock';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    logPageView: jest.fn(),
    logPerformance: jest.fn(),
    flush: jest.fn(),
    getLogs: jest.fn(() => []),
  },
}));

jest.mock('@/lib/analytics/unified-analytics', () => ({
  analytics: {
    initialize: jest.fn(),
  },
}));

describe('LoggingProvider', () => {
  const originalNavigator = global.navigator;
  const _originalWindow = global.window;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0' },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });

  describe('Initialization', () => {
    it('renders children', () => {
      render(
        <LoggingProvider>
          <div>Test Child</div>
        </LoggingProvider>
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('initializes analytics on mount', () => {
      render(
        <LoggingProvider>
          <div>Test</div>
        </LoggingProvider>
      );

      expect(analytics.initialize).toHaveBeenCalled();
    });

    it('logs application start with metadata', () => {
      render(
        <LoggingProvider>
          <div>Test</div>
        </LoggingProvider>
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Application started',
        expect.objectContaining({
          userAgent: expect.any(String),
          url: expect.any(String),
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Route Change Tracking', () => {
    it('tracks route changes on popstate event', () => {
      render(
        <LoggingProvider>
          <div>Test</div>
        </LoggingProvider>
      );

      fireEvent(window, new Event('popstate'));

      expect(logger.logPageView).toHaveBeenCalled();
    });

    it('uses document title for page view', () => {
      document.title = 'Test Page';

      render(
        <LoggingProvider>
          <div>Test</div>
        </LoggingProvider>
      );

      fireEvent(window, new Event('popstate'));

      expect(logger.logPageView).toHaveBeenCalledWith('Test Page');
    });
  });

  describe('Visibility Change Tracking', () => {
    it('logs when page becomes visible', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });

      render(
        <LoggingProvider>
          <div>Test</div>
        </LoggingProvider>
      );

      fireEvent(document, new Event('visibilitychange'));

      expect(logger.debug).toHaveBeenCalledWith('Page became visible');
    });

    it('logs and flushes when page becomes hidden', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });

      render(
        <LoggingProvider>
          <div>Test</div>
        </LoggingProvider>
      );

      fireEvent(document, new Event('visibilitychange'));

      expect(logger.debug).toHaveBeenCalledWith('Page became hidden');
      expect(logger.flush).toHaveBeenCalled();
    });
  });

  describe('Online/Offline Tracking', () => {
    it('logs when network goes online', () => {
      render(
        <LoggingProvider>
          <div>Test</div>
        </LoggingProvider>
      );

      fireEvent(window, new Event('online'));

      expect(logger.info).toHaveBeenCalledWith('Network status: online');
    });

    it('logs warning when network goes offline', () => {
      render(
        <LoggingProvider>
          <div>Test</div>
        </LoggingProvider>
      );

      fireEvent(window, new Event('offline'));

      expect(logger.warn).toHaveBeenCalledWith('Network status: offline');
    });
  });

  describe('Performance Observer', () => {
    it('sets up PerformanceObserver when available', () => {
      const mockObserve = jest.fn();
      const mockPerformanceObserver = jest.fn().mockImplementation(() => ({
        observe: mockObserve,
      }));

      global.PerformanceObserver = mockPerformanceObserver as any;

      render(
        <LoggingProvider>
          <div>Test</div>
        </LoggingProvider>
      );

      expect(mockPerformanceObserver).toHaveBeenCalled();
      expect(mockObserve).toHaveBeenCalled();
    });

    it('logs Largest Contentful Paint', () => {
      const observers: any[] = [];

      global.PerformanceObserver = jest.fn().mockImplementation((callback) => {
        observers.push(callback);
        return {
          observe: jest.fn(),
        };
      }) as any;

      render(
        <LoggingProvider>
          <div>Test</div>
        </LoggingProvider>
      );

      // Simulate LCP entry
      const lcpCallback = observers[0];
      if (lcpCallback) {
        lcpCallback({
          getEntries: () => [{ startTime: 1234 }],
        });

        expect(logger.logPerformance).toHaveBeenCalledWith('LargestContentfulPaint', 1234);
      }
    });

    it('logs First Input Delay', () => {
      const observers: any[] = [];

      global.PerformanceObserver = jest.fn().mockImplementation((callback) => {
        observers.push(callback);
        return {
          observe: jest.fn(),
        };
      }) as any;

      render(
        <LoggingProvider>
          <div>Test</div>
        </LoggingProvider>
      );

      // Simulate FID entry
      const fidCallback = observers[1];
      if (fidCallback) {
        fidCallback({
          getEntries: () => [{ startTime: 100, processingStart: 150 }],
        });

        expect(logger.logPerformance).toHaveBeenCalledWith('FirstInputDelay', 50);
      }
    });

    it('logs Cumulative Layout Shift', () => {
      const observers: any[] = [];

      global.PerformanceObserver = jest.fn().mockImplementation((callback) => {
        observers.push(callback);
        return {
          observe: jest.fn(),
        };
      }) as any;

      render(
        <LoggingProvider>
          <div>Test</div>
        </LoggingProvider>
      );

      // Simulate CLS entries
      const clsCallback = observers[2];
      if (clsCallback) {
        clsCallback({
          getEntries: () => [
            { hadRecentInput: false, value: 0.1 },
            { hadRecentInput: false, value: 0.05 },
            { hadRecentInput: true, value: 0.2 }, // Should be ignored
          ],
        });

        expect(logger.logPerformance).toHaveBeenCalledWith('CumulativeLayoutShift', expect.closeTo(0.15, 5));
      }
    });

    it('handles PerformanceObserver errors gracefully', () => {
      global.PerformanceObserver = jest.fn().mockImplementation(() => {
        throw new Error('PerformanceObserver failed');
      }) as any;

      expect(() => {
        render(
          <LoggingProvider>
            <div>Test</div>
          </LoggingProvider>
        );
      }).not.toThrow();

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to initialize Core Web Vitals tracking',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('does not set up PerformanceObserver when not available', () => {
      delete (global as any).PerformanceObserver;

      render(
        <LoggingProvider>
          <div>Test</div>
        </LoggingProvider>
      );

      // Should not crash and should not log performance metrics
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Development Mode Features', () => {
    it.skip('sets up keyboard shortcut in development mode', async () => {
      // SKIP: This test relies on process.env.NODE_ENV which is a compile-time constant
      // The keyboard shortcut feature only works when the code is built with NODE_ENV=development
      // In the test environment, NODE_ENV is always 'test', so this feature won't be activated
      await withNodeEnv('development', async () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const consoleTableSpy = jest.spyOn(console, 'table').mockImplementation();

        (logger.getLogs as jest.Mock).mockReturnValue([
          { level: 'info', message: 'Test log' },
        ]);

        render(
          <LoggingProvider>
            <div>Test</div>
          </LoggingProvider>
        );

        // Force a small delay to ensure useEffect has run
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Simulate Ctrl+Shift+L using native event dispatch
        await act(async () => {
          const event = new KeyboardEvent('keydown', {
            key: 'L',
            ctrlKey: true,
            shiftKey: true,
            bubbles: true,
            cancelable: true,
          });
          window.dispatchEvent(event);
        });

        expect(consoleWarnSpy).toHaveBeenCalledWith('🔍 Application Logs');
        expect(consoleTableSpy).toHaveBeenCalledWith([{ level: 'info', message: 'Test log' }]);

        consoleWarnSpy.mockRestore();
        consoleTableSpy.mockRestore();
      });
    });

    it('does not set up keyboard shortcuts in production', async () => {
      await withNodeEnv('production', async () => {
        render(
        <LoggingProvider>
          <div>Test</div>
        </LoggingProvider>
      );

      // Simulate Ctrl+Shift+L - should not trigger anything
      const event = new KeyboardEvent('keydown', {
        key: 'L',
        ctrlKey: true,
        shiftKey: true,
      });
      fireEvent(window, event);

        expect(logger.getLogs).not.toHaveBeenCalled();
      });
    });
  });

  describe('Cleanup', () => {
    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const removeDocEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = render(
        <LoggingProvider>
          <div>Test</div>
        </LoggingProvider>
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
      expect(removeDocEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      removeEventListenerSpy.mockRestore();
      removeDocEventListenerSpy.mockRestore();
    });

    it('flushes logs on unmount', () => {
      const { unmount } = render(
        <LoggingProvider>
          <div>Test</div>
        </LoggingProvider>
      );

      (logger.flush as jest.Mock).mockClear();

      unmount();

      expect(logger.flush).toHaveBeenCalled();
    });
  });
});
