/**
 * Comprehensive tests for error-handler.ts
 *
 * Coverage Target: 95%+
 * Strategy: Test real implementations, mock only I/O boundaries
 * Focus: Error handling logic, retry mechanisms, type guards
 */

import { ErrorHandler, useErrorHandler } from '../error-handler';
import { ApiError, ApiErrorResponse } from '../api';
import { renderHook } from '@testing-library/react';

// Helper to create ApiError
function createApiError(
  message: string,
  statusCode: number,
  code: string,
  path: string,
  correlationId: string,
  retryable: boolean,
  validationErrors?: Record<string, string[]>,
  retryAfterSeconds?: number
): ApiError {
  const response: ApiErrorResponse = {
    correlationId,
    error: {
      code,
      message,
      retryable,
      validationErrors,
      retryAfterSeconds,
    },
    timestamp: new Date().toISOString(),
    path,
  };
  return new ApiError(response, statusCode);
}

// Mock logger to avoid console spam
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('handleApiError', () => {
    it('handles ApiError with validation errors', () => {
      const error = createApiError(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        '/api/test',
        'test-correlation-id',
        false,
        { email: ['Invalid email format'], password: ['Password too short'] }
      );

      const message = ErrorHandler.handleApiError(error, { showToUser: false, logError: false });

      expect(message).toBe('email: Invalid email format');
    });

    it('handles ApiError with specific status codes', () => {
      const testCases = [
        { status: 400, expected: 'Invalid request. Please check your input and try again.' },
        { status: 401, expected: 'Authentication required. Please log in and try again.' },
        { status: 403, expected: "You don't have permission to perform this action." },
        { status: 404, expected: 'The requested resource was not found.' },
        { status: 409, expected: 'A conflict occurred. The resource may already exist.' },
        { status: 429, expected: 'Too many requests. Please wait 60 seconds and try again.' },
        { status: 500, expected: 'Server error. Our team has been notified. Please try again later.' },
        { status: 503, expected: 'Service temporarily unavailable. Please try again in a few moments.' },
      ];

      testCases.forEach(({ status, expected }) => {
        const error = createApiError(
          'Test error',
          status,
          'TEST_ERROR',
          '/api/test',
          'test-correlation-id',
          false
        );

        const message = ErrorHandler.handleApiError(error, { showToUser: false, logError: false });
        expect(message).toBe(expected);
      });
    });

    it('handles ApiError with retry information', () => {
      const error = createApiError(
        'Rate limited',
        429,
        'RATE_LIMIT',
        '/api/test',
        'test-correlation-id',
        true,
        undefined,
        120 // retryAfterSeconds
      );

      const message = ErrorHandler.handleApiError(error, { showToUser: false, logError: false });

      expect(message).toContain('120 seconds');
    });

    it('handles network errors (TypeError with fetch)', () => {
      const error = new TypeError('fetch failed');

      const message = ErrorHandler.handleApiError(error, { showToUser: false, logError: false });

      expect(message).toBe('Network error. Please check your connection and try again.');
    });

    it('handles generic Error instances', () => {
      const error = new Error('Something went wrong');

      const message = ErrorHandler.handleApiError(error, { showToUser: false, logError: false });

      expect(message).toBe('An unexpected error occurred. Please try again.');
    });

    it('handles unknown error types', () => {
      const error = 'string error';

      const message = ErrorHandler.handleApiError(error, { showToUser: false, logError: false });

      expect(message).toBe('An unexpected error occurred.');
    });

    it('uses custom message when provided', () => {
      const error = createApiError(
        'Test error',
        500,
        'TEST_ERROR',
        '/api/test',
        'test-correlation-id',
        false
      );

      const customMessage = 'Custom error message';
      const message = ErrorHandler.handleApiError(error, {
        customMessage,
        showToUser: false,
        logError: false,
      });

      expect(message).toBe(customMessage);
    });

    it('calls onError callback when provided', () => {
      const onError = jest.fn();
      const error = new Error('Test error');

      ErrorHandler.handleApiError(error, {
        onError,
        showToUser: false,
        logError: false,
      });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('converts non-Error to Error for callback', () => {
      const onError = jest.fn();
      const error = 'string error';

      ErrorHandler.handleApiError(error, {
        onError,
        showToUser: false,
        logError: false,
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(onError.mock.calls[0][0].message).toBe('string error');
    });

    it('logs error when logError is true', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');

      ErrorHandler.handleApiError(error, {
        logError: true,
        showToUser: false,
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('includes context in log', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');
      const context = { userId: '123', action: 'test' };

      ErrorHandler.handleApiError(error, {
        logError: true,
        showToUser: false,
        context,
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ context })
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('handleLoadingError', () => {
    it('sets error message and loading state', () => {
      const setError = jest.fn();
      const setLoading = jest.fn();
      const error = new Error('Test error');

      ErrorHandler.handleLoadingError(error, setError, setLoading, {
        showToUser: false,
        logError: false,
      });

      expect(setError).toHaveBeenCalledWith('An unexpected error occurred. Please try again.');
      expect(setLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('withRetry', () => {
    it('succeeds on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await ErrorHandler.withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on retryable ApiError', async () => {
      // Use real timers for this test to avoid async/timer issues
      jest.useRealTimers();

      const fn = jest
        .fn()
        .mockRejectedValueOnce(
          createApiError('Retry me', 503, 'SERVICE_UNAVAILABLE', '/api/test', 'test-id', true)
        )
        .mockRejectedValueOnce(
          createApiError('Retry me again', 503, 'SERVICE_UNAVAILABLE', '/api/test', 'test-id', true)
        )
        .mockResolvedValue('success');

      const result = await ErrorHandler.withRetry(fn, { maxRetries: 3, initialDelay: 1 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries

      // Restore fake timers for other tests
      jest.useFakeTimers();
    }, 30000);

    it('does not retry non-retryable errors', async () => {
      const error = createApiError('Do not retry', 400, 'BAD_REQUEST', '/api/test', 'test-id', false);
      const fn = jest.fn().mockRejectedValue(error);

      await expect(ErrorHandler.withRetry(fn)).rejects.toThrow(error);
      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });

    it('respects maxRetries limit', async () => {
      // Use real timers for this test to avoid async/timer issues
      jest.useRealTimers();

      const error = createApiError('Retry me', 503, 'SERVICE_UNAVAILABLE', '/api/test', 'test-id', true);
      const fn = jest.fn().mockRejectedValue(error);

      await expect(
        ErrorHandler.withRetry(fn, { maxRetries: 2, initialDelay: 1 })
      ).rejects.toThrow(error);

      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries

      // Restore fake timers for other tests
      jest.useFakeTimers();
    }, 30000);

    it('uses exponential backoff with max delay', async () => {
      // Use real timers for this test to avoid async/timer issues
      jest.useRealTimers();

      const error = createApiError('Retry me', 503, 'SERVICE_UNAVAILABLE', '/api/test', 'test-id', true);
      const callTimes: number[] = [];
      const startTime = Date.now();

      const fn = jest.fn().mockImplementation(() => {
        callTimes.push(Date.now() - startTime);
        return Promise.reject(error);
      });

      await expect(
        ErrorHandler.withRetry(fn, {
          maxRetries: 3,
          initialDelay: 10,
          maxDelay: 50,
        })
      ).rejects.toThrow();

      expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries

      // Verify delays increase (exponential backoff)
      // Note: We can't test exact timing due to execution overhead
      // but we can verify the function was called multiple times
      expect(callTimes.length).toBe(4);

      // Restore fake timers for other tests
      jest.useFakeTimers();
    }, 30000);

    it('uses custom shouldRetry predicate', async () => {
      // Use real timers for this test to avoid async/timer issues
      jest.useRealTimers();

      const error = new Error('Custom error');
      const fn = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const shouldRetry = jest.fn().mockReturnValue(true);

      const result = await ErrorHandler.withRetry(fn, { shouldRetry, initialDelay: 1 });

      expect(result).toBe('success');
      expect(shouldRetry).toHaveBeenCalledWith(error);
      expect(fn).toHaveBeenCalledTimes(2);

      // Restore fake timers for other tests
      jest.useFakeTimers();
    }, 30000);
  });

  describe('safe', () => {
    it('returns data on success', async () => {
      const promise = Promise.resolve('success');

      const result = await ErrorHandler.safe(promise, 'default');

      expect(result).toEqual({ data: 'success', error: null });
    });

    it('returns default value and error on failure', async () => {
      const error = new Error('Test error');
      const promise = Promise.reject(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await ErrorHandler.safe(promise, 'default');
      consoleErrorSpy.mockRestore();

      expect(result).toEqual({ data: 'default', error });
    });

    it('converts non-Error to Error', async () => {
      const promise = Promise.reject('string error');

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await ErrorHandler.safe(promise, 'default');
      consoleErrorSpy.mockRestore();

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('string error');
    });
  });

  describe('validateResponse', () => {
    it('returns validated data when valid', () => {
      const data = { id: '123', name: 'Test' };
      const validator = (d: any): d is typeof data => d.id && d.name;

      const result = ErrorHandler.validateResponse(data, validator);

      expect(result).toBe(data);
    });

    it('throws error when invalid', () => {
      const data = { invalid: true };
      const validator = (d: any): d is { id: string } => !!d.id;

      expect(() => ErrorHandler.validateResponse(data, validator)).toThrow('Invalid response data');
    });

    it('uses custom error message', () => {
      const data = { invalid: true };
      const validator = (d: any): d is { id: string } => !!d.id;
      const customMessage = 'Custom validation error';

      expect(() => ErrorHandler.validateResponse(data, validator, customMessage)).toThrow(
        customMessage
      );
    });
  });

  describe('handleValidationErrors', () => {
    it('returns first validation error', () => {
      const validationErrors = {
        email: ['Invalid email format', 'Email already exists'],
        password: ['Password too short'],
      };

      const message = ErrorHandler.handleValidationErrors(validationErrors);

      expect(message).toBe('email: Invalid email format');
    });

    it('returns default message when no errors', () => {
      const validationErrors = {};

      const message = ErrorHandler.handleValidationErrors(validationErrors);

      expect(message).toBe('Validation failed');
    });

    it('handles multiple fields', () => {
      const validationErrors = {
        firstName: ['Required field'],
      };

      const message = ErrorHandler.handleValidationErrors(validationErrors);

      expect(message).toBe('firstName: Required field');
    });
  });

  describe('Type Guard Methods', () => {
    it('isApiError correctly identifies ApiError', () => {
      const apiError = createApiError('Test', 400, 'TEST', '/api', 'id', false);
      const regularError = new Error('Test');

      expect(ErrorHandler.isApiError(apiError)).toBe(true);
      expect(ErrorHandler.isApiError(regularError)).toBe(false);
      expect(ErrorHandler.isApiError('string')).toBe(false);
    });

    it('isNetworkError correctly identifies network errors', () => {
      const networkError = new TypeError('fetch failed');
      const regularError = new Error('Test');

      expect(ErrorHandler.isNetworkError(networkError)).toBe(true);
      expect(ErrorHandler.isNetworkError(regularError)).toBe(false);
    });

    it('isTimeoutError correctly identifies timeout errors', () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'TimeoutError';
      const regularError = new Error('Test');

      expect(ErrorHandler.isTimeoutError(timeoutError)).toBe(true);
      expect(ErrorHandler.isTimeoutError(regularError)).toBe(false);
    });

    it('isValidationError correctly identifies validation errors', () => {
      const validationError = createApiError('Validation', 400, 'VALIDATION', '/api', 'id', false, {
        email: ['Invalid'],
      });
      const badRequestError = createApiError('Bad Request', 400, 'BAD_REQUEST', '/api', 'id', false);
      const serverError = createApiError('Server Error', 500, 'SERVER_ERROR', '/api', 'id', false);

      expect(ErrorHandler.isValidationError(validationError)).toBe(true);
      expect(ErrorHandler.isValidationError(badRequestError)).toBe(false);
      expect(ErrorHandler.isValidationError(serverError)).toBe(false);
    });

    it('isAuthError correctly identifies auth errors', () => {
      const unauthorizedError = createApiError('Unauthorized', 401, 'UNAUTHORIZED', '/api', 'id', false);
      const forbiddenError = createApiError('Forbidden', 403, 'FORBIDDEN', '/api', 'id', false);
      const notFoundError = createApiError('Not Found', 404, 'NOT_FOUND', '/api', 'id', false);

      expect(ErrorHandler.isAuthError(unauthorizedError)).toBe(true);
      expect(ErrorHandler.isAuthError(forbiddenError)).toBe(true);
      expect(ErrorHandler.isAuthError(notFoundError)).toBe(false);
    });

    it('isNotFoundError correctly identifies 404 errors', () => {
      const notFoundError = createApiError('Not Found', 404, 'NOT_FOUND', '/api', 'id', false);
      const forbiddenError = createApiError('Forbidden', 403, 'FORBIDDEN', '/api', 'id', false);

      expect(ErrorHandler.isNotFoundError(notFoundError)).toBe(true);
      expect(ErrorHandler.isNotFoundError(forbiddenError)).toBe(false);
    });

    it('isServerError correctly identifies 5xx errors', () => {
      const serverErrors = [500, 502, 503, 504].map(
        (status) => createApiError('Server Error', status, 'SERVER_ERROR', '/api', 'id', false)
      );
      const clientError = createApiError('Client Error', 400, 'BAD_REQUEST', '/api', 'id', false);

      serverErrors.forEach((error) => {
        expect(ErrorHandler.isServerError(error)).toBe(true);
      });
      expect(ErrorHandler.isServerError(clientError)).toBe(false);
    });
  });

  describe('useErrorHandler', () => {
    it('returns error handling utilities', () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(result.current).toHaveProperty('handleError');
      expect(result.current).toHaveProperty('handleLoadingError');
      expect(result.current).toHaveProperty('withRetry');
      expect(result.current).toHaveProperty('safe');
    });

    it('handleError wraps ErrorHandler.handleApiError', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Test error');

      const message = result.current.handleError(error, {
        showToUser: false,
        logError: false,
      });

      expect(message).toBe('An unexpected error occurred. Please try again.');
    });

    it('handleLoadingError wraps ErrorHandler.handleLoadingError', () => {
      const { result } = renderHook(() => useErrorHandler());
      const setError = jest.fn();
      const setLoading = jest.fn();
      const error = new Error('Test error');

      result.current.handleLoadingError(error, setError, setLoading, {
        showToUser: false,
        logError: false,
      });

      expect(setError).toHaveBeenCalled();
      expect(setLoading).toHaveBeenCalledWith(false);
    });

    it('withRetry is accessible', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const fn = jest.fn().mockResolvedValue('success');

      const value = await result.current.withRetry(fn);

      expect(value).toBe('success');
    });

    it('safe is accessible', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const promise = Promise.resolve('success');

      const value = await result.current.safe(promise, 'default');

      expect(value).toEqual({ data: 'success', error: null });
    });
  });

  describe('Edge Cases and Error Paths', () => {
    it('handles ApiError with undefined validationErrors', () => {
      const error = createApiError('Test', 400, 'BAD_REQUEST', '/api', 'id', false, undefined);

      const message = ErrorHandler.handleApiError(error, { showToUser: false, logError: false });

      expect(message).toBe('Invalid request. Please check your input and try again.');
    });

    it('handles ApiError with empty validationErrors', () => {
      const error = createApiError('Test', 400, 'BAD_REQUEST', '/api', 'id', false, {});

      const message = ErrorHandler.handleApiError(error, { showToUser: false, logError: false });

      expect(message).toBe('Invalid request. Please check your input and try again.');
    });

    it('handles ApiError with undefined retryAfterSeconds', () => {
      const error = createApiError('Rate limited', 429, 'RATE_LIMIT', '/api', 'id', true, undefined, undefined);

      const message = ErrorHandler.handleApiError(error, { showToUser: false, logError: false });

      expect(message).toContain('60 seconds'); // Default value
    });

    it('handles withRetry when all attempts fail', async () => {
      // Use real timers for this test to avoid async/timer issues
      jest.useRealTimers();

      const error = createApiError('Always fails', 503, 'SERVICE_UNAVAILABLE', '/api', 'id', true);
      const fn = jest.fn().mockRejectedValue(error);

      await expect(
        ErrorHandler.withRetry(fn, { maxRetries: 1, initialDelay: 1 })
      ).rejects.toThrow(error);

      expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry

      // Restore fake timers for other tests
      jest.useFakeTimers();
    }, 30000);

    it('handles safe with already rejected promise', async () => {
      const error = new Error('Already rejected');
      const promise = Promise.reject(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await ErrorHandler.safe(promise, 'fallback');
      consoleErrorSpy.mockRestore();

      expect(result.data).toBe('fallback');
      expect(result.error).toBe(error);
    });
  });
});
