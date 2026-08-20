/**
 * API Error Handler - BUG-013/14/15 Fix
 * Provides user-friendly error messages and offline-first fallback handling
 */

import { logger } from './logger';
import NetInfo from '@react-native-community/netinfo';

export interface ApiError {
  code: string;
  message: string;
  userMessage: string;
  isNetworkError: boolean;
  isCorsError: boolean;
  isAuthError: boolean;
  canRetry: boolean;
}

export class ApiErrorHandler {
  /**
   * Parse and enhance API errors with user-friendly messages
   */
  static async parseError(error: unknown, context?: string): Promise<ApiError> {
    const baseError = error as Error & { response?: { status?: number; data?: any }; code?: string };

    // Check network connectivity
    const networkState = await NetInfo.fetch();
    const isOnline = networkState.isConnected && networkState.isInternetReachable;

    // Network connectivity error
    if (!isOnline) {
      return {
        code: 'NETWORK_OFFLINE',
        message: baseError.message || 'No internet connection',
        userMessage: 'You appear to be offline. Please check your internet connection and try again.',
        isNetworkError: true,
        isCorsError: false,
        isAuthError: false,
        canRetry: true,
      };
    }

    // CORS error (common on web builds)
    if (baseError.message?.includes('CORS') || baseError.message?.includes('cors')) {
      logger.warn(`[ApiErrorHandler] CORS error detected for ${context}`, baseError);
      return {
        code: 'CORS_ERROR',
        message: baseError.message,
        userMessage: 'Unable to connect to the server. This feature may not be available in the web version.',
        isNetworkError: false,
        isCorsError: true,
        isAuthError: false,
        canRetry: false,
      };
    }

    // Network timeout
    if (baseError.code === 'ECONNABORTED' || baseError.message?.includes('timeout')) {
      return {
        code: 'TIMEOUT',
        message: baseError.message,
        userMessage: 'The request took too long. Please check your connection and try again.',
        isNetworkError: true,
        isCorsError: false,
        isAuthError: false,
        canRetry: true,
      };
    }

    // Authentication errors (401, 403)
    if (baseError.response?.status === 401 || baseError.response?.status === 403) {
      return {
        code: 'AUTH_ERROR',
        message: baseError.message,
        userMessage: 'Your session has expired. Please log in again.',
        isNetworkError: false,
        isCorsError: false,
        isAuthError: true,
        canRetry: false,
      };
    }

    // Server errors (500+)
    if (baseError.response?.status && baseError.response.status >= 500) {
      return {
        code: 'SERVER_ERROR',
        message: baseError.message,
        userMessage: 'The server is experiencing issues. Please try again later.',
        isNetworkError: false,
        isCorsError: false,
        isAuthError: false,
        canRetry: true,
      };
    }

    // Not found (404)
    if (baseError.response?.status === 404) {
      return {
        code: 'NOT_FOUND',
        message: baseError.message,
        userMessage: context ? `${context} not found` : 'The requested resource was not found.',
        isNetworkError: false,
        isCorsError: false,
        isAuthError: false,
        canRetry: false,
      };
    }

    // Generic network error
    if (baseError.code === 'ERR_NETWORK' || !baseError.response) {
      return {
        code: 'NETWORK_ERROR',
        message: baseError.message,
        userMessage: 'Unable to connect to the server. Please check your connection.',
        isNetworkError: true,
        isCorsError: false,
        isAuthError: false,
        canRetry: true,
      };
    }

    // Unknown error
    return {
      code: 'UNKNOWN_ERROR',
      message: baseError.message || 'An unknown error occurred',
      userMessage: 'Something went wrong. Please try again.',
      isNetworkError: false,
      isCorsError: false,
      isAuthError: false,
      canRetry: true,
    };
  }

  /**
   * Log error with context
   */
  static logError(error: ApiError, operation: string): void {
    const logLevel = error.isAuthError || error.code === 'NOT_FOUND' ? 'warn' : 'error';

    logger[logLevel](`[ApiErrorHandler] ${operation} failed:`, {
      code: error.code,
      message: error.message,
      isNetworkError: error.isNetworkError,
      isCorsError: error.isCorsError,
    });
  }

  /**
   * Show user-friendly error message
   * Returns the error object for further handling
   */
  static async handleError(error: unknown, operation: string, context?: string): Promise<ApiError> {
    const apiError = await this.parseError(error, context);
    this.logError(apiError, operation);
    return apiError;
  }

  /**
   * Retry logic for failed API calls
   */
  static async retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const apiError = await this.parseError(error);

        // Don't retry if it's not a retryable error
        if (!apiError.canRetry) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries - 1) {
          throw error;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        logger.debug(`[ApiErrorHandler] Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise<void>(resolve => setTimeout(() => resolve(), delay));
      }
    }

    throw lastError;
  }
}

export default ApiErrorHandler;
