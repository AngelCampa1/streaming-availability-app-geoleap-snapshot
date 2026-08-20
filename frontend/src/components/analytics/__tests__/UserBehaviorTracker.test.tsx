/**
 * UserBehaviorTracker Component Tests
 *
 * Test coverage for headless user behavior tracking component.
 * Tests session management, consent handling, event tracking (page views, clicks, scrolls),
 * event batching, periodic flushing, and configuration options.
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import UserBehaviorTracker from '../UserBehaviorTracker';
import { useUserBehavior, userBehaviorUtils } from '@/hooks/useUserBehavior';

// Mock Next.js navigation
const mockPathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

// Mock useUserBehavior hook
const mockTrackBatchEvents = jest.fn();
jest.mock('@/hooks/useUserBehavior', () => ({
  useUserBehavior: jest.fn(),
  userBehaviorUtils: {
    generateSessionId: jest.fn(),
    createPageViewEvent: jest.fn(),
    createClickEvent: jest.fn(),
    getScrollDepth: jest.fn(),
    getViewportSize: jest.fn(),
  },
}));

describe('UserBehaviorTracker', () => {
  beforeAll(() => {
    // Mock timers
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();

    // Default mock implementations
    (useUserBehavior as jest.Mock).mockReturnValue({
      trackBatchEvents: mockTrackBatchEvents,
    });

    mockPathname.mockReturnValue('/test-page');
    (userBehaviorUtils.generateSessionId as jest.Mock).mockReturnValue('session-123');
    (userBehaviorUtils.createPageViewEvent as jest.Mock).mockReturnValue({
      sessionId: 'session-123',
      eventType: 'page_view',
      pageUrl: '/test-page',
      pageTitle: 'Test Page',
      timestamp: new Date(),
      hasConsent: true,
    });
    (userBehaviorUtils.createClickEvent as jest.Mock).mockReturnValue({
      sessionId: 'session-123',
      eventType: 'click',
      pageUrl: '/test-page',
      timestamp: new Date(),
      hasConsent: true,
    });
    (userBehaviorUtils.getScrollDepth as jest.Mock).mockReturnValue(50);
    (userBehaviorUtils.getViewportSize as jest.Mock).mockReturnValue('1920x1080');

    mockTrackBatchEvents.mockResolvedValue(undefined);
  });

  describe('Rendering & Initialization', () => {
    it('renders without crashing', () => {
      const { container } = render(<UserBehaviorTracker />);
      expect(container).toBeEmptyDOMElement();
    });

    it('returns null (headless component)', () => {
      const { container } = render(<UserBehaviorTracker />);
      expect(container.firstChild).toBeNull();
    });

    it('accepts all props without errors', () => {
      expect(() => {
        render(
          <UserBehaviorTracker
            userId="user-123"
            trackPageViews={true}
            trackClicks={true}
            trackScrolling={true}
            trackTimeOnPage={true}
            respectConsent={true}
            batchSize={5}
            flushInterval={10000}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Session Management', () => {
    it('generates new session ID if none exists', () => {
      render(<UserBehaviorTracker />);

      expect(userBehaviorUtils.generateSessionId).toHaveBeenCalled();
      expect(sessionStorage.getItem('user_session_id')).toBe('session-123');
    });

    it('uses existing session ID from sessionStorage', () => {
      sessionStorage.setItem('user_session_id', 'existing-session');

      render(<UserBehaviorTracker />);

      expect(userBehaviorUtils.generateSessionId).not.toHaveBeenCalled();
      expect(sessionStorage.getItem('user_session_id')).toBe('existing-session');
    });

    it('persists session ID across re-renders', () => {
      const { rerender } = render(<UserBehaviorTracker />);

      const firstSessionId = sessionStorage.getItem('user_session_id');

      rerender(<UserBehaviorTracker userId="user-456" />);

      expect(sessionStorage.getItem('user_session_id')).toBe(firstSessionId);
    });
  });

  describe('Consent Handling', () => {
    it('does not track events when consent is not given and respectConsent is true', async () => {
      localStorage.removeItem('user_consent');

      render(<UserBehaviorTracker respectConsent={true} />);

      act(() => {
        jest.advanceTimersByTime(31000); // Advance past flush interval
      });

      await waitFor(() => {
        expect(mockTrackBatchEvents).not.toHaveBeenCalled();
      });
    });

    it('tracks events when consent is accepted', async () => {
      localStorage.setItem('user_consent', 'accepted');

      render(<UserBehaviorTracker respectConsent={true} batchSize={1} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockTrackBatchEvents).toHaveBeenCalled();
      });
    });

    it('tracks events when consent is true', async () => {
      localStorage.setItem('user_consent', 'true');

      render(<UserBehaviorTracker respectConsent={true} batchSize={1} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockTrackBatchEvents).toHaveBeenCalled();
      });
    });

    it('tracks events when respectConsent is false regardless of consent', async () => {
      localStorage.removeItem('user_consent');

      render(<UserBehaviorTracker respectConsent={false} batchSize={1} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockTrackBatchEvents).toHaveBeenCalled();
      });
    });
  });

  describe('Page View Tracking', () => {
    beforeEach(() => {
      localStorage.setItem('user_consent', 'accepted');
    });

    it('tracks page view on mount when trackPageViews is true', async () => {
      render(<UserBehaviorTracker trackPageViews={true} batchSize={1} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(userBehaviorUtils.createPageViewEvent).toHaveBeenCalledWith(
          '/test-page',
          expect.any(String),
          undefined
        );
      });
    });

    it('does not track page view when trackPageViews is false', async () => {
      render(<UserBehaviorTracker trackPageViews={false} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(userBehaviorUtils.createPageViewEvent).not.toHaveBeenCalled();
      });
    });

    it('includes userId in page view event when provided', async () => {
      render(<UserBehaviorTracker userId="user-789" trackPageViews={true} batchSize={1} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(userBehaviorUtils.createPageViewEvent).toHaveBeenCalledWith(
          '/test-page',
          expect.any(String),
          'user-789'
        );
      });
    });

    it('tracks page view when pathname changes', async () => {
      const { rerender } = render(<UserBehaviorTracker trackPageViews={true} batchSize={1} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(userBehaviorUtils.createPageViewEvent).toHaveBeenCalledTimes(1);
      });

      mockPathname.mockReturnValue('/new-page');
      rerender(<UserBehaviorTracker trackPageViews={true} batchSize={1} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(userBehaviorUtils.createPageViewEvent).toHaveBeenCalledTimes(2);
      });
    });

    it('tracks page exit event on unmount when trackTimeOnPage is true', async () => {
      const { unmount } = render(<UserBehaviorTracker trackTimeOnPage={true} trackPageViews={true} batchSize={10} />);

      act(() => {
        jest.advanceTimersByTime(5000); // Simulate 5 seconds on page
      });

      unmount();

      // unmount triggers final flush - wait for it
      await waitFor(() => {
        expect(mockTrackBatchEvents).toHaveBeenCalled();
      });

      // Check that page_exit event was tracked
      const allCalls = mockTrackBatchEvents.mock.calls.flat(2);
      const hasPageExit = allCalls.some((event: any) => event?.eventType === 'page_exit');
      expect(hasPageExit).toBe(true);
    });
  });

  describe('Click Tracking', () => {
    beforeEach(() => {
      localStorage.setItem('user_consent', 'accepted');
    });

    it('tracks click events when trackClicks is true', async () => {
      render(<UserBehaviorTracker trackClicks={true} batchSize={1} />);

      const button = document.createElement('button');
      button.textContent = 'Click me';
      document.body.appendChild(button);

      act(() => {
        button.click();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(userBehaviorUtils.createClickEvent).toHaveBeenCalled();
      });

      document.body.removeChild(button);
    });

    it('does not track clicks when trackClicks is false', async () => {
      render(<UserBehaviorTracker trackClicks={false} />);

      const button = document.createElement('button');
      document.body.appendChild(button);

      act(() => {
        button.click();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(userBehaviorUtils.createClickEvent).not.toHaveBeenCalled();
      });

      document.body.removeChild(button);
    });

    it('captures click coordinates', async () => {
      render(<UserBehaviorTracker trackClicks={true} batchSize={1} userId="user-123" />);

      const button = document.createElement('button');
      button.textContent = 'Click me'; // Set text BEFORE appending
      document.body.appendChild(button);

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        clientX: 150,
        clientY: 250,
      });

      act(() => {
        button.dispatchEvent(clickEvent);
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(userBehaviorUtils.createClickEvent).toHaveBeenCalledWith(
          '/test-page',
          'button',
          'Click me',
          expect.any(String), // selector
          150,
          250,
          'user-123'
        );
      });

      document.body.removeChild(button);
    });

    it('removes click listener on unmount', async () => {
      const { unmount } = render(<UserBehaviorTracker trackClicks={true} />);

      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Scroll Tracking', () => {
    beforeEach(() => {
      localStorage.setItem('user_consent', 'accepted');
      (userBehaviorUtils.getScrollDepth as jest.Mock).mockReturnValue(0);
    });

    it('tracks scroll events when trackScrolling is true', async () => {
      render(<UserBehaviorTracker trackScrolling={true} batchSize={1} />);

      (userBehaviorUtils.getScrollDepth as jest.Mock).mockReturnValue(25);

      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });

      act(() => {
        jest.advanceTimersByTime(600); // Scroll debounce + processing
      });

      await waitFor(() => {
        expect(userBehaviorUtils.getScrollDepth).toHaveBeenCalled();
      });
    });

    it('does not track scrolling when trackScrolling is false', async () => {
      render(<UserBehaviorTracker trackScrolling={false} />);

      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(userBehaviorUtils.getScrollDepth).not.toHaveBeenCalled();
      });
    });

    it('only tracks significant scroll changes (10%+ difference)', async () => {
      render(
        <UserBehaviorTracker
          trackPageViews={false}
          trackScrolling={true}
          batchSize={1}
          flushInterval={60000}
        />
      );

      // Clear any initial calls
      mockTrackBatchEvents.mockClear();

      // First scroll - 5% (should not track - less than 10% difference)
      (userBehaviorUtils.getScrollDepth as jest.Mock).mockReturnValue(5);
      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });
      act(() => {
        jest.advanceTimersByTime(600);
      });

      // Should not have called trackBatchEvents yet (5% < 10% threshold)
      expect(mockTrackBatchEvents).not.toHaveBeenCalled();

      // Second scroll - 15% (should track, 15% difference from 0)
      (userBehaviorUtils.getScrollDepth as jest.Mock).mockReturnValue(15);
      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });
      act(() => {
        jest.advanceTimersByTime(600);
      });

      // Should now have scroll event tracked
      await waitFor(() => {
        expect(mockTrackBatchEvents).toHaveBeenCalled();
      });

      // Verify scroll event was sent
      const allCalls = mockTrackBatchEvents.mock.calls.flat(2);
      const hasScrollEvent = allCalls.some((event: any) => event?.eventType === 'scroll');
      expect(hasScrollEvent).toBe(true);
    });

    it('debounces scroll events', async () => {
      render(<UserBehaviorTracker trackScrolling={true} batchSize={1} />);

      (userBehaviorUtils.getScrollDepth as jest.Mock).mockReturnValue(25);

      // Rapid scroll events
      act(() => {
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('scroll'));
      });

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        // Should only call getScrollDepth once due to debouncing
        expect(userBehaviorUtils.getScrollDepth).toHaveBeenCalledTimes(1);
      });
    });

    it('removes scroll listener on unmount', async () => {
      const { unmount } = render(<UserBehaviorTracker trackScrolling={true} />);

      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Event Batching', () => {
    beforeEach(() => {
      localStorage.setItem('user_consent', 'accepted');
    });

    it('batches events until batchSize is reached', async () => {
      render(
        <UserBehaviorTracker
          trackPageViews={false}
          trackClicks={true}
          batchSize={3}
          flushInterval={60000}
        />
      );

      const button = document.createElement('button');
      document.body.appendChild(button);

      // First two events - should not flush yet
      act(() => {
        button.click();
        button.click();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockTrackBatchEvents).not.toHaveBeenCalled();

      // Third event - should trigger flush
      act(() => {
        button.click();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should now flush after reaching batch size of 3
      await waitFor(() => {
        expect(mockTrackBatchEvents).toHaveBeenCalled();
      });

      document.body.removeChild(button);
    });

    it('respects custom batchSize prop', async () => {
      const customBatchSize = 5;
      render(
        <UserBehaviorTracker
          trackPageViews={false}
          trackClicks={true}
          batchSize={customBatchSize}
          flushInterval={60000}
        />
      );

      const button = document.createElement('button');
      button.textContent = 'Test';
      document.body.appendChild(button);

      // Generate events up to batchSize - 1
      for (let i = 0; i < customBatchSize - 1; i++) {
        act(() => {
          button.click();
        });
        act(() => {
          jest.advanceTimersByTime(10);
        });
      }

      // Should not have flushed yet
      expect(mockTrackBatchEvents).not.toHaveBeenCalled();

      // One more event to reach batch size
      act(() => {
        button.click();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockTrackBatchEvents).toHaveBeenCalled();
        const totalEvents = mockTrackBatchEvents.mock.calls[0][0].length;
        expect(totalEvents).toBe(customBatchSize);
      });

      document.body.removeChild(button);
    });
  });

  describe('Periodic Flushing', () => {
    beforeEach(() => {
      localStorage.setItem('user_consent', 'accepted');
    });

    it('flushes events at specified interval', async () => {
      const flushInterval = 10000;
      render(<UserBehaviorTracker trackPageViews={true} batchSize={100} flushInterval={flushInterval} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should not flush immediately
      expect(mockTrackBatchEvents).not.toHaveBeenCalled();

      // Advance to flush interval
      act(() => {
        jest.advanceTimersByTime(flushInterval);
      });

      await waitFor(() => {
        expect(mockTrackBatchEvents).toHaveBeenCalled();
      });
    });

    it('respects custom flushInterval prop', async () => {
      const customInterval = 5000;
      render(<UserBehaviorTracker trackPageViews={true} batchSize={100} flushInterval={customInterval} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      act(() => {
        jest.advanceTimersByTime(customInterval);
      });

      await waitFor(() => {
        expect(mockTrackBatchEvents).toHaveBeenCalled();
      });
    });

    it('performs final flush on unmount', async () => {
      const { unmount } = render(<UserBehaviorTracker trackPageViews={true} batchSize={100} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      unmount();

      await waitFor(() => {
        expect(mockTrackBatchEvents).toHaveBeenCalled();
      });
    });

    it('clears flush interval on unmount', async () => {
      const { unmount } = render(<UserBehaviorTracker flushInterval={10000} />);

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      localStorage.setItem('user_consent', 'accepted');
      // Suppress expected console errors in error handling tests
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      if (consoleErrorSpy) {
        consoleErrorSpy.mockRestore();
      }
    });

    it('re-queues events on flush failure', async () => {
      mockTrackBatchEvents.mockRejectedValueOnce(new Error('Network error'));

      render(<UserBehaviorTracker trackPageViews={true} batchSize={1} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockTrackBatchEvents).toHaveBeenCalledTimes(1);
      });

      // Should re-queue and try again on next flush
      mockTrackBatchEvents.mockResolvedValueOnce(undefined);

      act(() => {
        jest.advanceTimersByTime(30000); // Next flush interval
      });

      await waitFor(() => {
        expect(mockTrackBatchEvents).toHaveBeenCalledTimes(2);
      });
    });

    it('limits re-queue size to prevent infinite growth', async () => {
      mockTrackBatchEvents.mockRejectedValue(new Error('Persistent error'));

      const batchSize = 5;
      render(<UserBehaviorTracker trackPageViews={true} trackClicks={true} batchSize={batchSize} />);

      // Generate many events
      const button = document.createElement('button');
      document.body.appendChild(button);

      for (let i = 0; i < 30; i++) {
        act(() => {
          button.click();
        });
      }

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Trigger flush
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockTrackBatchEvents).toHaveBeenCalled();
      });

      // Events should be limited (not infinite growth)
      const totalEventsSent = mockTrackBatchEvents.mock.calls.reduce(
        (sum, call) => sum + call[0].length,
        0
      );

      expect(totalEventsSent).toBeLessThan(100); // Should not grow infinitely

      document.body.removeChild(button);
    });

    it('logs errors to console', async () => {
      // Reset console.error mock to verify it was called
      if (consoleErrorSpy) {
        consoleErrorSpy.mockRestore();
      }
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockTrackBatchEvents.mockRejectedValueOnce(new Error('Test error'));

      render(<UserBehaviorTracker trackPageViews={true} batchSize={1} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to track behavior events:',
          expect.any(Error)
        );
      });
    });
  });

  describe('CSS Selector Generation', () => {
    beforeEach(() => {
      localStorage.setItem('user_consent', 'accepted');
    });

    it('generates selector using element ID if available', async () => {
      render(<UserBehaviorTracker trackClicks={true} batchSize={1} />);

      const button = document.createElement('button');
      button.id = 'submit-button';
      button.textContent = 'Submit';
      document.body.appendChild(button);

      act(() => {
        button.click();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(userBehaviorUtils.createClickEvent).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(String),
          '#submit-button',
          expect.any(Number),
          expect.any(Number),
          undefined
        );
      });

      document.body.removeChild(button);
    });

    it('generates selector using tag and classes when no ID', async () => {
      render(<UserBehaviorTracker trackClicks={true} batchSize={1} />);

      const button = document.createElement('button');
      button.className = 'btn btn-primary';
      button.textContent = 'Click';
      document.body.appendChild(button);

      act(() => {
        button.click();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        const mockFn = userBehaviorUtils.createClickEvent as jest.Mock;
        const calls = mockFn.mock.calls;
        const selector = calls[calls.length - 1][3];
        expect(selector).toContain('button');
        expect(selector).toContain('btn');
      });

      document.body.removeChild(button);
    });
  });

  describe('Configuration Props', () => {
    it('uses default values when no props provided', () => {
      expect(() => {
        render(<UserBehaviorTracker />);
      }).not.toThrow();
    });

    it('applies all tracking flags correctly', async () => {
      localStorage.setItem('user_consent', 'accepted');

      render(
        <UserBehaviorTracker
          trackPageViews={false}
          trackClicks={false}
          trackScrolling={false}
          trackTimeOnPage={false}
        />
      );

      const button = document.createElement('button');
      document.body.appendChild(button);

      act(() => {
        button.click();
        window.dispatchEvent(new Event('scroll'));
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // No tracking should occur
      expect(userBehaviorUtils.createPageViewEvent).not.toHaveBeenCalled();
      expect(userBehaviorUtils.createClickEvent).not.toHaveBeenCalled();
      expect(userBehaviorUtils.getScrollDepth).not.toHaveBeenCalled();

      document.body.removeChild(button);
    });
  });
});
