/**
 * apiErrorHandler.test.ts - Tests for API error handling
 *
 * Test Strategy: Test the ApiErrorHandler static methods with mocked NetInfo.
 * Tests verify user-friendly error handling and offline-first approach.
 */

import { ApiErrorHandler, ApiError } from './apiErrorHandler';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn().mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    }),
  },
}));

// Mock logger to prevent console noise
jest.mock('./logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ApiErrorHandler', () => {
  beforeAll(() => {
    // Use real timers - ApiErrorHandler may use async operations
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseError', () => {
    it('parses network offline error', async () => {
      const NetInfo = require('@react-native-community/netinfo').default;
      NetInfo.fetch.mockResolvedValueOnce({
        isConnected: false,
        isInternetReachable: false,
      });

      const error = new Error('Network request failed');
      const parsed = await ApiErrorHandler.parseError(error);

      expect(parsed.code).toBe('NETWORK_OFFLINE');
      expect(parsed.isNetworkError).toBe(true);
      expect(parsed.canRetry).toBe(true);
      expect(parsed.userMessage).toContain('offline');
    });

    it('parses CORS error', async () => {
      const error = new Error('CORS policy blocked the request');
      const parsed = await ApiErrorHandler.parseError(error, 'API call');

      expect(parsed.code).toBe('CORS_ERROR');
      expect(parsed.isCorsError).toBe(true);
      expect(parsed.userMessage).toContain('server');
    });

    it('parses 401 authentication error', async () => {
      const error = {
        response: { status: 401, data: { message: 'Unauthorized' } },
        message: 'Unauthorized',
      };

      const parsed = await ApiErrorHandler.parseError(error);

      expect(parsed.code).toBe('AUTH_ERROR');
      expect(parsed.isAuthError).toBe(true);
      expect(parsed.userMessage).toContain('session');
    });

    it('parses 403 forbidden error', async () => {
      const error = {
        response: { status: 403, data: { message: 'Forbidden' } },
        message: 'Forbidden',
      };

      const parsed = await ApiErrorHandler.parseError(error);

      // Implementation treats 403 same as 401
      expect(parsed.code).toBe('AUTH_ERROR');
      expect(parsed.isAuthError).toBe(true);
    });

    it('parses 404 not found error', async () => {
      const error = {
        response: { status: 404, data: { message: 'Not found' } },
        message: 'Not found',
      };

      const parsed = await ApiErrorHandler.parseError(error);

      expect(parsed.code).toBe('NOT_FOUND');
      expect(parsed.canRetry).toBe(false);
    });

    it('parses 404 not found with context', async () => {
      const error = {
        response: { status: 404, data: { message: 'Not found' } },
        message: 'Not found',
      };

      const parsed = await ApiErrorHandler.parseError(error, 'Movie');

      expect(parsed.code).toBe('NOT_FOUND');
      expect(parsed.userMessage).toContain('Movie');
    });

    it('parses 500 server error', async () => {
      const error = {
        response: { status: 500, data: { message: 'Internal server error' } },
        message: 'Internal server error',
      };

      const parsed = await ApiErrorHandler.parseError(error);

      expect(parsed.code).toBe('SERVER_ERROR');
      expect(parsed.canRetry).toBe(true);
      expect(parsed.userMessage).toContain('server');
    });

    it('parses timeout error by code', async () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
      };

      const parsed = await ApiErrorHandler.parseError(error);

      expect(parsed.code).toBe('TIMEOUT');
      expect(parsed.isNetworkError).toBe(true);
      expect(parsed.canRetry).toBe(true);
    });

    it('parses timeout error by message', async () => {
      const error = {
        message: 'Request timeout after 30 seconds',
      };

      const parsed = await ApiErrorHandler.parseError(error);

      expect(parsed.code).toBe('TIMEOUT');
      expect(parsed.isNetworkError).toBe(true);
    });

    it('parses generic network error', async () => {
      const error = {
        code: 'ERR_NETWORK',
        message: 'Network Error',
      };

      const parsed = await ApiErrorHandler.parseError(error);

      expect(parsed.code).toBe('NETWORK_ERROR');
      expect(parsed.isNetworkError).toBe(true);
      expect(parsed.canRetry).toBe(true);
    });

    it('parses error without response as network error', async () => {
      const error = new Error('Connection failed');

      const parsed = await ApiErrorHandler.parseError(error);

      expect(parsed.code).toBe('NETWORK_ERROR');
      expect(parsed.isNetworkError).toBe(true);
    });

    it('handles error without message', async () => {
      const error = { response: { status: 200 } };

      const parsed = await ApiErrorHandler.parseError(error);

      expect(parsed.code).toBe('UNKNOWN_ERROR');
      expect(parsed.message).toBeDefined();
    });

    it('handles empty object error', async () => {
      // Note: null/undefined throws due to accessing baseError.message
      // This tests the closest equivalent - an empty object
      const parsed = await ApiErrorHandler.parseError({});

      expect(parsed.code).toBe('NETWORK_ERROR');
    });

    it('handles string error', async () => {
      // Strings don't have a .message property but won't throw
      const parsed = await ApiErrorHandler.parseError('String error' as unknown);

      expect(parsed.code).toBeDefined();
    });
  });

  describe('logError', () => {
    it('logs error with operation context', () => {
      const { logger } = require('./logger');
      const error: ApiError = {
        code: 'NETWORK_ERROR',
        message: 'Connection failed',
        userMessage: 'Please check your connection',
        isNetworkError: true,
        isCorsError: false,
        isAuthError: false,
        canRetry: true,
      };

      ApiErrorHandler.logError(error, 'FetchMovies');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('FetchMovies'),
        expect.objectContaining({ code: 'NETWORK_ERROR' })
      );
    });

    it('logs auth errors with warn level', () => {
      const { logger } = require('./logger');
      const error: ApiError = {
        code: 'AUTH_ERROR',
        message: 'Unauthorized',
        userMessage: 'Please sign in',
        isNetworkError: false,
        isCorsError: false,
        isAuthError: true,
        canRetry: false,
      };

      ApiErrorHandler.logError(error, 'Login');

      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs NOT_FOUND errors with warn level', () => {
      const { logger } = require('./logger');
      const error: ApiError = {
        code: 'NOT_FOUND',
        message: 'Not found',
        userMessage: 'Resource not found',
        isNetworkError: false,
        isCorsError: false,
        isAuthError: false,
        canRetry: false,
      };

      ApiErrorHandler.logError(error, 'FetchUser');

      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('handleError', () => {
    it('parses error and logs it', async () => {
      const { logger } = require('./logger');
      const error = new Error('Test error');

      const result = await ApiErrorHandler.handleError(error, 'TestOperation');

      expect(result).toBeDefined();
      expect(result.code).toBeDefined();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('TestOperation'),
        expect.any(Object)
      );
    });

    it('returns parsed API error object', async () => {
      const NetInfo = require('@react-native-community/netinfo').default;
      NetInfo.fetch.mockResolvedValueOnce({
        isConnected: false,
        isInternetReachable: false,
      });

      const error = new Error('Network Error');
      const result = await ApiErrorHandler.handleError(error, 'API call');

      expect(result.code).toBe('NETWORK_OFFLINE');
      expect(result.isNetworkError).toBe(true);
      expect(result.canRetry).toBe(true);
    });

    it('passes context to parseError', async () => {
      const error = {
        response: { status: 404 },
        message: 'Not found',
      };

      const result = await ApiErrorHandler.handleError(error, 'FetchData', 'UserProfile');

      expect(result.userMessage).toContain('UserProfile');
    });
  });

  describe('retryWithExponentialBackoff', () => {
    it('resolves on first attempt when successful', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await ApiErrorHandler.retryWithExponentialBackoff(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('does not retry on auth errors', async () => {
      const authError = {
        response: { status: 401, data: { message: 'Unauthorized' } },
        message: 'Unauthorized',
      };
      const mockFn = jest.fn().mockRejectedValue(authError);

      await expect(
        ApiErrorHandler.retryWithExponentialBackoff(mockFn, 3, 10)
      ).rejects.toEqual(authError);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('retries on network errors', async () => {
      const NetInfo = require('@react-native-community/netinfo').default;
      NetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      const networkError = new Error('Network Error');
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success');

      const result = await ApiErrorHandler.retryWithExponentialBackoff(mockFn, 3, 10);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('throws after max retries exhausted', async () => {
      const networkError = new Error('Network Error');
      const mockFn = jest.fn().mockRejectedValue(networkError);

      await expect(
        ApiErrorHandler.retryWithExponentialBackoff(mockFn, 3, 10)
      ).rejects.toThrow('Network Error');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('uses default values when not provided', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await ApiErrorHandler.retryWithExponentialBackoff(mockFn);

      expect(result).toBe('success');
    });
  });
});
