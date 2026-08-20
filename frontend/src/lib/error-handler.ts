/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiError } from './api';
import { logger } from './logger';

/**
 * Comprehensive error handling utilities for frontend
 */

export interface ErrorHandlerOptions {
  /**
   * Show error to user via toast/notification
   */
  showToUser?: boolean;

  /**
   * Log error to console/monitoring service
   */
  logError?: boolean;

  /**
   * Custom error message override
   */
  customMessage?: string;

  /**
   * Error context for better debugging
   */
  context?: Record<string, any>;

  /**
   * Callback after error is handled
   */
  onError?: (error: Error) => void;
}

export class ErrorHandler {
  /**
   * Handle API errors with user-friendly messages
   */
  static handleApiError(error: any, options: ErrorHandlerOptions = {}): string {
    const { showToUser = true, logError = true, customMessage, context, onError } = options;

    let userMessage: string;
    let logMessage: string;

    if (error instanceof ApiError) {
      // Structured API error
      userMessage = customMessage || this.getApiErrorMessage(error);
      logMessage = this.formatApiErrorLog(error, context);
    } else if (error instanceof TypeError && error.message.includes('fetch')) {
      // Network error
      userMessage = customMessage || 'Network error. Please check your connection and try again.';
      logMessage = `Network error: ${error.message}`;
    } else if (error instanceof Error) {
      // Generic Error
      userMessage = customMessage || 'An unexpected error occurred. Please try again.';
      logMessage = `Error: ${error.message}\nStack: ${error.stack}`;
    } else {
      // Unknown error
      userMessage = customMessage || 'An unexpected error occurred.';
      logMessage = `Unknown error: ${JSON.stringify(error)}`;
    }

    if (logError) {
      console.error(logMessage, { error, context });
    }

    if (showToUser) {
      this.showErrorToUser(userMessage, error instanceof ApiError ? error.isRetryable : false);
    }

    if (onError) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }

    return userMessage;
  }

  /**
   * Get user-friendly message from ApiError
   */
  private static getApiErrorMessage(error: ApiError): string {
    // Validation errors - only use if we actually have validation messages
    if (error.validationErrors && Object.keys(error.validationErrors).length > 0) {
      const entries = Object.entries(error.validationErrors);
      const [field, messages] = entries[0] || [];
      const firstMessage = messages?.[0];
      if (field && firstMessage) {
        return `${field}: ${firstMessage}`;
      }
    }

    // HTTP status code specific messages
    switch (error.statusCode) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please log in and try again.';
      case 403:
        return "You don't have permission to perform this action.";
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'A conflict occurred. The resource may already exist.';
      case 429:
        return `Too many requests. Please wait ${error.retryAfterSeconds || 60} seconds and try again.`;
      case 500:
        return 'Server error. Our team has been notified. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again in a few moments.';
      default:
        return error.message || 'An error occurred. Please try again.';
    }
  }

  /**
   * Format API error for logging
   */
  private static formatApiErrorLog(error: ApiError, context?: Record<string, any>): string {
    return `
API Error:
  Code: ${error.errorCode}
  Status: ${error.statusCode}
  Message: ${error.message}
  Path: ${error.path}
  Correlation ID: ${error.correlationId}
  Trace ID: ${error.traceId || 'N/A'}
  Retryable: ${error.isRetryable}
  Context: ${JSON.stringify(context, null, 2)}
    `.trim();
  }

  /**
   * Show error to user (to be implemented with toast library)
   */
  private static showErrorToUser(message: string, isRetryable: boolean): void {
    // TODO: Implement with toast notification library
    // For now, just log to console
    console.warn(`[User Error] ${message}${isRetryable ? ' (Retryable)' : ''}`);
  }

  /**
   * Handle loading state errors
   */
  static handleLoadingError(
    error: any,
    setError: (error: string | null) => void,
    setLoading: (loading: boolean) => void,
    options: ErrorHandlerOptions = {}
  ): void {
    const message = this.handleApiError(error, options);
    setError(message);
    setLoading(false);
  }

  /**
   * Retry wrapper with exponential backoff
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelay?: number;
      maxDelay?: number;
      shouldRetry?: (error: any) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      shouldRetry = error => error instanceof ApiError && error.isRetryable,
    } = options;

    let lastError: any;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry if this is the last attempt or error is not retryable
        if (attempt === maxRetries || !shouldRetry(error)) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, maxDelay);

        logger.info('[ErrorHandler] Retrying request', { attempt: attempt + 1, maxRetries });
      }
    }

    throw lastError;
  }

  /**
   * Safe async wrapper that never throws
   */
  static async safe<T>(
    promise: Promise<T>,
    defaultValue: T
  ): Promise<{ data: T; error: null } | { data: T; error: Error }> {
    try {
      const data = await promise;
      return { data, error: null };
    } catch (error) {
      console.error('Safe async wrapper caught error:', error);
      return {
        data: defaultValue,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Validate response and throw if invalid
   */
  static validateResponse<T>(
    data: any,
    validator: (data: any) => data is T,
    errorMessage: string = 'Invalid response data'
  ): T {
    if (!validator(data)) {
      throw new Error(errorMessage);
    }
    return data;
  }

  /**
   * Handle validation errors specifically
   */
  static handleValidationErrors(validationErrors: Record<string, string[]>): string {
    const allErrors = Object.entries(validationErrors).flatMap(([field, errors]) =>
      errors.map(error => `${field}: ${error}`)
    );

    return allErrors.length > 0 ? allErrors[0] : 'Validation failed';
  }

  /**
   * Check if error is a specific type
   */
  static isApiError(error: any): error is ApiError {
    return error instanceof ApiError;
  }

  static isNetworkError(error: any): boolean {
    return error instanceof TypeError && error.message.includes('fetch');
  }

  static isTimeoutError(error: any): boolean {
    return error instanceof Error && error.name === 'TimeoutError';
  }

  static isValidationError(error: any): boolean {
    return error instanceof ApiError && error.statusCode === 400 && !!error.validationErrors;
  }

  static isAuthError(error: any): boolean {
    return error instanceof ApiError && (error.statusCode === 401 || error.statusCode === 403);
  }

  static isNotFoundError(error: any): boolean {
    return error instanceof ApiError && error.statusCode === 404;
  }

  static isServerError(error: any): boolean {
    return error instanceof ApiError && error.statusCode >= 500;
  }
}

/**
 * React hook-friendly error handler
 */
export function useErrorHandler() {
  const handleError = (error: any, options?: ErrorHandlerOptions) => {
    return ErrorHandler.handleApiError(error, options);
  };

  const handleLoadingError = (
    error: any,
    setError: (error: string | null) => void,
    setLoading: (loading: boolean) => void,
    options?: ErrorHandlerOptions
  ) => {
    ErrorHandler.handleLoadingError(error, setError, setLoading, options);
  };

  return {
    handleError,
    handleLoadingError,
    withRetry: ErrorHandler.withRetry,
    safe: ErrorHandler.safe,
  };
}
