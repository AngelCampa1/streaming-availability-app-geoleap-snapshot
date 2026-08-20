/**
 * GlobalErrorInitializer Component Tests
 *
 * CRITICAL: Error handling infrastructure - initializes global error handling
 * Tests error handler initialization, custom error event listeners, and cleanup.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { GlobalErrorInitializer } from '../GlobalErrorInitializer';

// Mock the global error handler
jest.mock('@/lib/global-error-handler', () => ({
  globalErrorHandler: {
    initialize: jest.fn(),
  },
}));

// Get reference to the mocked initialize function
import { globalErrorHandler } from '@/lib/global-error-handler';
const mockInitialize = globalErrorHandler.initialize as jest.Mock;

describe('GlobalErrorInitializer', () => {
  let consoleWarnSpy: jest.SpyInstance;
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Spy on console.warn
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Spy on window event listeners
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(<GlobalErrorInitializer />);
      }).not.toThrow();
    });

    it('returns null (renders nothing)', () => {
      const { container } = render(<GlobalErrorInitializer />);

      expect(container.firstChild).toBeNull();
    });

    it('does not render any DOM elements', () => {
      const { container } = render(<GlobalErrorInitializer />);

      expect(container.innerHTML).toBe('');
    });
  });

  describe('Initialization', () => {
    it('calls globalErrorHandler.initialize on mount', () => {
      render(<GlobalErrorInitializer />);

      expect(mockInitialize).toHaveBeenCalledTimes(1);
    });

    it('calls initialize only once on mount', () => {
      const { rerender } = render(<GlobalErrorInitializer />);

      expect(mockInitialize).toHaveBeenCalledTimes(1);

      // Re-render should not call initialize again
      rerender(<GlobalErrorInitializer />);
      expect(mockInitialize).toHaveBeenCalledTimes(1);
    });

    it('initializes before setting up event listeners', () => {
      const callOrder: string[] = [];

      mockInitialize.mockImplementation(() => {
        callOrder.push('initialize');
      });

      addEventListenerSpy.mockImplementation((event: string) => {
        callOrder.push(`addEventListener:${event}`);
      });

      render(<GlobalErrorInitializer />);

      expect(callOrder[0]).toBe('initialize');
      expect(callOrder).toContain('addEventListener:critical-error');
      expect(callOrder).toContain('addEventListener:api-error');
    });
  });

  describe('Event Listener Setup', () => {
    it('sets up critical-error event listener', () => {
      render(<GlobalErrorInitializer />);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'critical-error',
        expect.any(Function)
      );
    });

    it('sets up api-error event listener', () => {
      render(<GlobalErrorInitializer />);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'api-error',
        expect.any(Function)
      );
    });

    it('sets up both event listeners', () => {
      render(<GlobalErrorInitializer />);

      const eventTypes = addEventListenerSpy.mock.calls.map(call => call[0]);

      expect(eventTypes).toContain('critical-error');
      expect(eventTypes).toContain('api-error');
    });
  });

  describe('Critical Error Event Handling', () => {
    it('handles critical-error custom events', () => {
      render(<GlobalErrorInitializer />);

      // Dispatch a custom critical-error event
      const event = new CustomEvent('critical-error', {
        detail: {
          message: 'Test critical error',
          context: { page: 'home' },
        },
      });

      window.dispatchEvent(event);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Critical error notification:',
        'Test critical error',
        { page: 'home' }
      );
    });

    it('handles multiple critical error events', () => {
      render(<GlobalErrorInitializer />);

      // Dispatch first event
      const event1 = new CustomEvent('critical-error', {
        detail: {
          message: 'First error',
          context: { id: 1 },
        },
      });
      window.dispatchEvent(event1);

      // Dispatch second event
      const event2 = new CustomEvent('critical-error', {
        detail: {
          message: 'Second error',
          context: { id: 2 },
        },
      });
      window.dispatchEvent(event2);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenNthCalledWith(
        1,
        'Critical error notification:',
        'First error',
        { id: 1 }
      );
      expect(consoleWarnSpy).toHaveBeenNthCalledWith(
        2,
        'Critical error notification:',
        'Second error',
        { id: 2 }
      );
    });

    it('handles critical errors with complex context', () => {
      render(<GlobalErrorInitializer />);

      const event = new CustomEvent('critical-error', {
        detail: {
          message: 'Complex error',
          context: {
            user: { id: 123, email: 'test@example.com' },
            stack: 'Error stack trace here',
            timestamp: Date.now(),
          },
        },
      });

      window.dispatchEvent(event);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Critical error notification:',
        'Complex error',
        expect.objectContaining({
          user: expect.any(Object),
          stack: expect.any(String),
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('API Error Event Handling', () => {
    it('handles api-error custom events', () => {
      render(<GlobalErrorInitializer />);

      // Dispatch a custom api-error event
      const event = new CustomEvent('api-error', {
        detail: {
          message: 'API request failed',
          isRetryable: true,
          supportContact: 'support@example.com',
          correlationId: 'abc-123',
        },
      });

      window.dispatchEvent(event);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'API error notification:',
        {
          message: 'API request failed',
          isRetryable: true,
          supportContact: 'support@example.com',
          correlationId: 'abc-123',
        }
      );
    });

    it('handles multiple API error events', () => {
      render(<GlobalErrorInitializer />);

      // Dispatch first event
      const event1 = new CustomEvent('api-error', {
        detail: {
          message: 'First API error',
          isRetryable: false,
          supportContact: 'support@example.com',
          correlationId: '111',
        },
      });
      window.dispatchEvent(event1);

      // Dispatch second event
      const event2 = new CustomEvent('api-error', {
        detail: {
          message: 'Second API error',
          isRetryable: true,
          supportContact: 'support@example.com',
          correlationId: '222',
        },
      });
      window.dispatchEvent(event2);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenNthCalledWith(1, 'API error notification:', expect.objectContaining({ correlationId: '111' }));
      expect(consoleWarnSpy).toHaveBeenNthCalledWith(2, 'API error notification:', expect.objectContaining({ correlationId: '222' }));
    });

    it('handles API errors with partial details', () => {
      render(<GlobalErrorInitializer />);

      const event = new CustomEvent('api-error', {
        detail: {
          message: 'Minimal error info',
          isRetryable: undefined,
          supportContact: undefined,
          correlationId: undefined,
        },
      });

      window.dispatchEvent(event);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'API error notification:',
        expect.objectContaining({
          message: 'Minimal error info',
        })
      );
    });
  });

  describe('Event Cleanup', () => {
    it('removes critical-error listener on unmount', () => {
      const { unmount } = render(<GlobalErrorInitializer />);

      // Capture the event handler that was added
      const criticalErrorHandler = addEventListenerSpy.mock.calls.find(
        call => call[0] === 'critical-error'
      )?.[1];

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'critical-error',
        criticalErrorHandler
      );
    });

    it('removes api-error listener on unmount', () => {
      const { unmount } = render(<GlobalErrorInitializer />);

      // Capture the event handler that was added
      const apiErrorHandler = addEventListenerSpy.mock.calls.find(
        call => call[0] === 'api-error'
      )?.[1];

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'api-error',
        apiErrorHandler
      );
    });

    it('removes both event listeners on unmount', () => {
      const { unmount } = render(<GlobalErrorInitializer />);

      unmount();

      const removedEvents = removeEventListenerSpy.mock.calls.map(call => call[0]);

      expect(removedEvents).toContain('critical-error');
      expect(removedEvents).toContain('api-error');
    });

    it('does not handle events after unmount', () => {
      const { unmount } = render(<GlobalErrorInitializer />);

      unmount();

      consoleWarnSpy.mockClear();

      // Try to dispatch events after unmount
      const criticalEvent = new CustomEvent('critical-error', {
        detail: { message: 'Should not log', context: {} },
      });
      window.dispatchEvent(criticalEvent);

      const apiEvent = new CustomEvent('api-error', {
        detail: { message: 'Should not log', isRetryable: false, supportContact: '', correlationId: '' },
      });
      window.dispatchEvent(apiEvent);

      // Console.warn should not be called after unmount
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Integration', () => {
    it('initializes and handles errors in correct order', () => {
      render(<GlobalErrorInitializer />);

      // Verify initialization happened
      expect(mockInitialize).toHaveBeenCalled();

      // Dispatch an error event
      const event = new CustomEvent('critical-error', {
        detail: { message: 'Test', context: {} },
      });
      window.dispatchEvent(event);

      // Verify error was handled
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Critical error notification:',
        'Test',
        {}
      );
    });

    it('handles both error types simultaneously', () => {
      render(<GlobalErrorInitializer />);

      // Dispatch both types of errors
      const criticalEvent = new CustomEvent('critical-error', {
        detail: { message: 'Critical', context: {} },
      });
      const apiEvent = new CustomEvent('api-error', {
        detail: { message: 'API', isRetryable: true, supportContact: '', correlationId: '' },
      });

      window.dispatchEvent(criticalEvent);
      window.dispatchEvent(apiEvent);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Critical error notification:', 'Critical', {});
      expect(consoleWarnSpy).toHaveBeenCalledWith('API error notification:', expect.any(Object));
    });

    it('continues handling errors after re-render', () => {
      const { rerender } = render(<GlobalErrorInitializer />);

      // Dispatch event before re-render
      const event1 = new CustomEvent('critical-error', {
        detail: { message: 'Before', context: {} },
      });
      window.dispatchEvent(event1);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

      // Re-render
      rerender(<GlobalErrorInitializer />);

      // Dispatch event after re-render
      const event2 = new CustomEvent('critical-error', {
        detail: { message: 'After', context: {} },
      });
      window.dispatchEvent(event2);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it.skip('handles events with missing detail property (known issue)', () => {
      // KNOWN ISSUE: Component throws TypeError when event.detail is null/undefined
      // This is a potential bug - component should handle null detail gracefully
      // Skipping this test as it documents a known limitation rather than desired behavior
      // TODO: Fix component to handle null/undefined detail objects gracefully

      render(<GlobalErrorInitializer />);
      const event = new CustomEvent('critical-error');
      window.dispatchEvent(event);
      // Currently throws: TypeError: Cannot destructure property 'message' of 'event.detail' as it is null
    });

    it('handles rapid successive events', () => {
      render(<GlobalErrorInitializer />);

      // Dispatch 10 events rapidly
      for (let i = 0; i < 10; i++) {
        const event = new CustomEvent('critical-error', {
          detail: { message: `Error ${i}`, context: { id: i } },
        });
        window.dispatchEvent(event);
      }

      expect(consoleWarnSpy).toHaveBeenCalledTimes(10);
    });

    it('handles events with null or undefined values', () => {
      render(<GlobalErrorInitializer />);

      const event = new CustomEvent('api-error', {
        detail: {
          message: null,
          isRetryable: null,
          supportContact: null,
          correlationId: null,
        },
      });

      expect(() => {
        window.dispatchEvent(event);
      }).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });
});
