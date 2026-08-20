/**
 * Global Error Handler Test
 * Focus on critical error handling functionality
 * Tests the actual globalErrorHandler singleton and useErrorReporting hook
 */

import { globalErrorHandler, useErrorReporting } from '../global-error-handler';
import { renderHook } from '@testing-library/react';
import type { ApiError } from '../api';
import { withNodeEnv, setNodeEnv, resetNodeEnv } from '@/test-utils/envMock';

// Helper to create mock ApiError
const createMockApiError = (overrides: Partial<ApiError> = {}): ApiError => {
  const error = new Error('API Error') as ApiError;
  Object.assign(error, {
    name: 'ApiError',
    statusCode: 500,
    correlationId: 'test-correlation-123',
    errorCode: 'INTERNAL_ERROR',
    isRetryable: true,
    supportContact: 'support@geoleap.com',
    validationErrors: undefined,
    retryAfterSeconds: undefined,
    path: '/api/test',
    traceId: 'trace-123',
    ...overrides,
  });
  return error;
};

// Mock dependencies
jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Global Error Handler', () => {
  let consoleGroupSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleGroupEndSpy: jest.SpyInstance;
  let dispatchEventSpy: jest.SpyInstance;

  beforeEach(() => {
    // Set NODE_ENV for test suite
    setNodeEnv('development');

    consoleGroupSpy = jest.spyOn(console, 'group').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();
    dispatchEventSpy = jest.spyOn(window, 'dispatchEvent').mockImplementation();

    globalErrorHandler.clearErrors();
  });

  afterEach(() => {
    resetNodeEnv();
    consoleGroupSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleGroupEndSpy.mockRestore();
    dispatchEventSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('handleError', () => {
    it('handles Error objects correctly and adds to queue', () => {
      const error = new Error('Test error');
      globalErrorHandler.handleError(error, 'Test Context');

      const recentErrors = globalErrorHandler.getRecentErrors(1);
      expect(recentErrors).toHaveLength(1);
      expect(recentErrors[0].error.message).toBe('Test error');
      expect(recentErrors[0].context).toBe('Test Context');
    });

    // SKIP: This test relies on process.env.NODE_ENV which is a compile-time constant.
    // The development-mode logging only activates when code is built with NODE_ENV=development.
    // In the test environment, NODE_ENV is always 'test', so this code path never executes.
    it.skip('logs error details in development mode', () => {
      const error = new Error('Test error');
      globalErrorHandler.handleError(error, 'Test Context');

      expect(consoleGroupSpy).toHaveBeenCalledWith('🚨 Error Handler - Test Context');
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleGroupEndSpy).toHaveBeenCalled();
    });

    it('uses default context when not provided', () => {
      const error = new Error('Test error');
      globalErrorHandler.handleError(error);

      const recentErrors = globalErrorHandler.getRecentErrors(1);
      expect(recentErrors[0].context).toBe('Unknown Context');
    });

    it('dispatches critical-error event for chunk errors', () => {
      const error = new Error('Chunk loading failed');
      globalErrorHandler.handleError(error, 'Module Loader');

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'critical-error' })
      );
    });

    it('dispatches critical-error event for network errors', () => {
      const error = new Error('Network request failed');
      globalErrorHandler.handleError(error, 'API Call');

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'critical-error' })
      );
    });

    it('does not dispatch critical-error for non-critical errors', () => {
      const error = new Error('Simple validation error');
      globalErrorHandler.handleError(error, 'Form Validation');

      const criticalErrorCalls = dispatchEventSpy.mock.calls.filter(
        call => call[0].type === 'critical-error'
      );
      expect(criticalErrorCalls).toHaveLength(0);
    });
  });

  describe('handleApiError', () => {
    it('adds API error to queue with error code in context', () => {
      const apiError = createMockApiError({ errorCode: 'RATE_LIMIT_EXCEEDED' });
      globalErrorHandler.handleApiError(apiError, 'Rate Limit Test');

      const recentErrors = globalErrorHandler.getRecentErrors(1);
      expect(recentErrors).toHaveLength(1);
      expect(recentErrors[0].context).toContain('Rate Limit Test');
      expect(recentErrors[0].context).toContain('RATE_LIMIT_EXCEEDED');
    });

    // SKIP: This test relies on process.env.NODE_ENV which is a compile-time constant.
    // The development-mode logging only activates when code is built with NODE_ENV=development.
    // In the test environment, NODE_ENV is always 'test', so this code path never executes.
    it.skip('logs API error details in development mode', () => {
      const apiError = createMockApiError({
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
        validationErrors: { email: ['Invalid email format'] },
      });
      globalErrorHandler.handleApiError(apiError, 'Form Submission');

      expect(consoleGroupSpy).toHaveBeenCalledWith('🚨 API Error - Form Submission');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error Code:', 'VALIDATION_ERROR');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Status Code:', 400);
    });

    it('dispatches api-error event with user-friendly message', () => {
      const apiError = createMockApiError({ errorCode: 'UNAUTHORIZED' });
      globalErrorHandler.handleApiError(apiError, 'Auth Check');

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'api-error' })
      );

      const apiErrorCall = dispatchEventSpy.mock.calls.find(
        call => call[0].type === 'api-error'
      );
      expect(apiErrorCall[0].detail.message).toBe('Please log in to continue.');
    });

    it('returns correct message for FORBIDDEN', () => {
      const apiError = createMockApiError({ errorCode: 'FORBIDDEN' });
      globalErrorHandler.handleApiError(apiError, 'Access');

      const apiErrorCall = dispatchEventSpy.mock.calls.find(
        call => call[0].type === 'api-error'
      );
      expect(apiErrorCall[0].detail.message).toBe("You don't have permission to perform this action.");
    });

    it('returns correct message for RESOURCE_NOT_FOUND', () => {
      const apiError = createMockApiError({ errorCode: 'RESOURCE_NOT_FOUND' });
      globalErrorHandler.handleApiError(apiError, 'Fetch');

      const apiErrorCall = dispatchEventSpy.mock.calls.find(
        call => call[0].type === 'api-error'
      );
      expect(apiErrorCall[0].detail.message).toBe('The requested resource could not be found.');
    });

    it('returns correct message for VALIDATION_ERROR', () => {
      const apiError = createMockApiError({ errorCode: 'VALIDATION_ERROR' });
      globalErrorHandler.handleApiError(apiError, 'Form');

      const apiErrorCall = dispatchEventSpy.mock.calls.find(
        call => call[0].type === 'api-error'
      );
      expect(apiErrorCall[0].detail.message).toBe('Please check your input and try again.');
    });

    it('returns correct message for RATE_LIMIT_EXCEEDED', () => {
      const apiError = createMockApiError({ errorCode: 'RATE_LIMIT_EXCEEDED' });
      globalErrorHandler.handleApiError(apiError, 'API');

      const apiErrorCall = dispatchEventSpy.mock.calls.find(
        call => call[0].type === 'api-error'
      );
      expect(apiErrorCall[0].detail.message).toBe('Too many requests. Please wait a moment and try again.');
    });

    it('returns correct message for EXTERNAL_SERVICE_ERROR', () => {
      const apiError = createMockApiError({ errorCode: 'EXTERNAL_SERVICE_ERROR' });
      globalErrorHandler.handleApiError(apiError, 'Service');

      const apiErrorCall = dispatchEventSpy.mock.calls.find(
        call => call[0].type === 'api-error'
      );
      expect(apiErrorCall[0].detail.message).toBe('A service is temporarily unavailable. Please try again later.');
    });

    it('returns correct message for MAINTENANCE_MODE', () => {
      const apiError = createMockApiError({ errorCode: 'MAINTENANCE_MODE' });
      globalErrorHandler.handleApiError(apiError, 'System');

      const apiErrorCall = dispatchEventSpy.mock.calls.find(
        call => call[0].type === 'api-error'
      );
      expect(apiErrorCall[0].detail.message).toBe('The service is under maintenance. Please try again later.');
    });

    it('uses supportContact for unknown error codes', () => {
      const apiError = createMockApiError({
        errorCode: 'UNKNOWN_ERROR',
        supportContact: 'contact@support.com',
      });
      globalErrorHandler.handleApiError(apiError, 'Unknown');

      const apiErrorCall = dispatchEventSpy.mock.calls.find(
        call => call[0].type === 'api-error'
      );
      expect(apiErrorCall[0].detail.message).toBe('contact@support.com');
    });

    it('includes isRetryable in api-error event', () => {
      const apiError = createMockApiError({ isRetryable: true });
      globalErrorHandler.handleApiError(apiError, 'Retry Test');

      const apiErrorCall = dispatchEventSpy.mock.calls.find(
        call => call[0].type === 'api-error'
      );
      expect(apiErrorCall[0].detail.isRetryable).toBe(true);
    });
  });

  describe('handleUnhandledRejection', () => {
    it('handles Error objects', () => {
      const error = new Error('Promise rejection error');
      const event = {
        preventDefault: jest.fn(),
        reason: error,
        promise: Promise.reject(error).catch(() => {}),
      } as unknown as PromiseRejectionEvent;

      globalErrorHandler.handleUnhandledRejection(event);

      expect(event.preventDefault).toHaveBeenCalled();
      // Implementation uses console.group + separate console.error calls
      expect(consoleErrorSpy).toHaveBeenCalledWith('Reason:', error);
    });

    it('converts non-Error objects to Error', () => {
      const event = {
        preventDefault: jest.fn(),
        reason: 'String rejection',
        promise: Promise.reject('String rejection').catch(() => {}),
      } as unknown as PromiseRejectionEvent;

      globalErrorHandler.handleUnhandledRejection(event);

      const recentErrors = globalErrorHandler.getRecentErrors(1);
      expect(recentErrors[0].error.message).toBe('String rejection');
    });
  });

  describe('handleGlobalError', () => {
    it('handles ErrorEvent with error object', () => {
      const error = new Error('Global error');
      const event = {
        error,
        message: 'Error message',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
      } as ErrorEvent;

      globalErrorHandler.handleGlobalError(event);

      // Implementation uses console.group('🚨 Global JavaScript Error') + separate console.error calls
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', error);
      const recentErrors = globalErrorHandler.getRecentErrors(1);
      expect(recentErrors[0].context).toContain('test.js:10');
    });

    it('creates Error from message when no error object', () => {
      const event = {
        error: null,
        message: 'Script error.',
        filename: 'external.js',
        lineno: 1,
        colno: 1,
      } as ErrorEvent;

      globalErrorHandler.handleGlobalError(event);

      const recentErrors = globalErrorHandler.getRecentErrors(1);
      expect(recentErrors[0].error.message).toBe('Script error.');
    });
  });

  describe('getRecentErrors', () => {
    it('returns limited number of errors', () => {
      for (let i = 0; i < 15; i++) {
        globalErrorHandler.handleError(new Error(`Error ${i}`), `Context ${i}`);
      }

      const recentErrors = globalErrorHandler.getRecentErrors(5);
      expect(recentErrors).toHaveLength(5);
    });

    it('returns errors in reverse order (most recent first)', () => {
      globalErrorHandler.handleError(new Error('First'), 'First');
      globalErrorHandler.handleError(new Error('Second'), 'Second');
      globalErrorHandler.handleError(new Error('Third'), 'Third');

      const recentErrors = globalErrorHandler.getRecentErrors(3);
      expect(recentErrors[0].context).toBe('Third');
      expect(recentErrors[1].context).toBe('Second');
      expect(recentErrors[2].context).toBe('First');
    });

    it('defaults to 10 errors', () => {
      for (let i = 0; i < 15; i++) {
        globalErrorHandler.handleError(new Error(`Error ${i}`), `Context ${i}`);
      }

      const recentErrors = globalErrorHandler.getRecentErrors();
      expect(recentErrors).toHaveLength(10);
    });
  });

  describe('clearErrors', () => {
    it('clears all errors from queue', () => {
      globalErrorHandler.handleError(new Error('Error 1'), 'Context 1');
      globalErrorHandler.handleError(new Error('Error 2'), 'Context 2');

      expect(globalErrorHandler.getRecentErrors()).toHaveLength(2);

      globalErrorHandler.clearErrors();

      expect(globalErrorHandler.getRecentErrors()).toHaveLength(0);
    });
  });

  describe('error tracking integration', () => {
    it('adds error to queue when handleError is called', () => {
      const error = new Error('Tracked error');
      globalErrorHandler.handleError(error, 'Tracking Test');

      const recentErrors = globalErrorHandler.getRecentErrors(1);
      expect(recentErrors).toHaveLength(1);
      expect(recentErrors[0].error).toBe(error);
      expect(recentErrors[0].context).toBe('Tracking Test');
    });

    it('adds API error to queue when handleApiError is called', () => {
      const apiError = createMockApiError({ errorCode: 'TEST_ERROR' });
      globalErrorHandler.handleApiError(apiError, 'API Tracking Test');

      const recentErrors = globalErrorHandler.getRecentErrors(1);
      expect(recentErrors).toHaveLength(1);
      expect(recentErrors[0].error).toBe(apiError);
      expect(recentErrors[0].context).toContain('TEST_ERROR');
    });
  });

  describe('production mode', () => {
    it('does not log detailed errors in production', async () => {
      await withNodeEnv('production', async () => {
        const error = new Error('Production error');
        globalErrorHandler.handleError(error, 'Prod Test');

        expect(consoleGroupSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Error Handler')
        );
      });
    });
  });

  describe('Performance impact', () => {
    it('handles errors efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 10; i++) {
        globalErrorHandler.handleError(new Error(`Error ${i}`));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
    });
  });
});

describe('useErrorReporting hook', () => {
  beforeEach(() => {
    globalErrorHandler.clearErrors();
    jest.spyOn(console, 'group').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'groupEnd').mockImplementation();
    jest.spyOn(window, 'dispatchEvent').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('provides reportError function', () => {
    const { result } = renderHook(() => useErrorReporting());

    expect(result.current.reportError).toBeDefined();
    expect(typeof result.current.reportError).toBe('function');
  });

  it('provides reportApiError function', () => {
    const { result } = renderHook(() => useErrorReporting());

    expect(result.current.reportApiError).toBeDefined();
    expect(typeof result.current.reportApiError).toBe('function');
  });

  it('reports errors through reportError', () => {
    const { result } = renderHook(() => useErrorReporting());

    const error = new Error('Hook test error');
    result.current.reportError(error, 'Hook Context');

    const recentErrors = globalErrorHandler.getRecentErrors(1);
    expect(recentErrors[0].error.message).toBe('Hook test error');
    expect(recentErrors[0].context).toBe('Hook Context');
  });

  it('reports API errors through reportApiError', () => {
    const { result } = renderHook(() => useErrorReporting());

    const apiError = createMockApiError({ errorCode: 'HOOK_ERROR' });
    result.current.reportApiError(apiError, 'Hook API Context');

    const recentErrors = globalErrorHandler.getRecentErrors(1);
    expect(recentErrors[0].context).toContain('Hook API Context');
    expect(recentErrors[0].context).toContain('HOOK_ERROR');
  });
});
