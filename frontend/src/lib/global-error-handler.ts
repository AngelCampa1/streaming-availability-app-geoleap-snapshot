'use client';

import { ApiError } from './api';
import { logger } from './logger';

export interface GlobalErrorHandler {
  handleError: (error: Error, context?: string) => void;
  handleApiError: (error: ApiError, context?: string) => void;
  handleUnhandledRejection: (error: PromiseRejectionEvent) => void;
  handleGlobalError: (error: ErrorEvent) => void;
}

class GlobalErrorHandlerService implements GlobalErrorHandler {
  private errorQueue: Array<{ error: Error; context?: string; timestamp: Date }> = [];
  private isInitialized = false;

  initialize() {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

    // Handle global JavaScript errors
    window.addEventListener('error', this.handleGlobalError.bind(this));

    // Handle React errors (this will be caught by ErrorBoundary components)
    window.addEventListener('error', event => {
      if (event.error) {
        this.handleError(event.error, 'Global Error Handler');
      }
    });

    this.isInitialized = true;
    logger.info('[GlobalErrorHandler] Initialized');
  }

  handleError(error: Error, context = 'Unknown Context') {
    const errorEntry = {
      error,
      context,
      timestamp: new Date(),
    };

    this.errorQueue.push(errorEntry);
    this.logError(errorEntry);

    // Send to Application Insights if available
    this.sendToApplicationInsights(error, context);

    // Show user notification for critical errors
    if (this.isCriticalError(error)) {
      this.showUserNotification(error, context);
    }
  }

  handleApiError(error: ApiError, context = 'API Call') {
    const contextWithErrorCode = `${context} (${error.errorCode})`;
    const errorEntry = {
      error,
      context: contextWithErrorCode,
      timestamp: new Date(),
    };

    this.errorQueue.push(errorEntry);
    this.logApiError(error, context);

    // Send to Application Insights with API-specific properties
    this.sendApiErrorToApplicationInsights(error, contextWithErrorCode);

    // Show user-friendly message for API errors
    this.showApiErrorNotification(error);
  }

  handleUnhandledRejection(event: PromiseRejectionEvent) {
    event.preventDefault(); // Prevent the default browser behavior

    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

    // eslint-disable-next-line no-console
    console.group('🚨 Unhandled Promise Rejection');
    console.error('Reason:', event.reason);
    console.error('Promise:', event.promise);
    // eslint-disable-next-line no-console
    console.groupEnd();

    this.handleError(error, 'Unhandled Promise Rejection');
  }

  handleGlobalError(event: ErrorEvent) {
    const error = event.error || new Error(event.message);

    // eslint-disable-next-line no-console
    console.group('🚨 Global JavaScript Error');
    console.error('Message:', event.message);
    console.error('Filename:', event.filename);
    console.error('Line:', event.lineno);
    console.error('Column:', event.colno);
    console.error('Error:', event.error);
    // eslint-disable-next-line no-console
    console.groupEnd();

    this.handleError(error, `Global JS Error - ${event.filename}:${event.lineno}`);
  }

  private logError(errorEntry: { error: Error; context?: string; timestamp: Date }) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.group(`🚨 Error Handler - ${errorEntry.context}`);
      console.error('Error:', errorEntry.error);
      console.error('Context:', errorEntry.context);
      console.error('Timestamp:', errorEntry.timestamp.toISOString());
      console.error('Stack:', errorEntry.error.stack);
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  }

  private logApiError(error: ApiError, context: string) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.group(`🚨 API Error - ${context}`);
      console.error('Error Code:', error.errorCode);
      console.error('Status Code:', error.statusCode);
      console.error('Message:', error.message);
      console.error('Correlation ID:', error.correlationId);
      console.error('Retryable:', error.isRetryable);
      console.error('Support Contact:', error.supportContact);
      if (error.validationErrors) {
        console.error('Validation Errors:', error.validationErrors);
      }
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  }

  private sendToApplicationInsights(error: Error, context: string) {
    interface WindowWithAppInsights extends Window {
      appInsights?: {
        trackException: (telemetry: { exception: Error; properties: Record<string, string> }) => void;
      };
    }

    if (typeof window !== 'undefined' && (window as WindowWithAppInsights).appInsights) {
      (window as WindowWithAppInsights).appInsights!.trackException({
        exception: error,
        properties: {
          context,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          source: 'GlobalErrorHandler',
        },
      });
    }
  }

  private sendApiErrorToApplicationInsights(error: ApiError, context: string) {
    interface WindowWithAppInsights extends Window {
      appInsights?: {
        trackException: (telemetry: { exception: Error; properties: Record<string, string> }) => void;
      };
    }

    if (typeof window !== 'undefined' && (window as WindowWithAppInsights).appInsights) {
      (window as WindowWithAppInsights).appInsights!.trackException({
        exception: error,
        properties: {
          context,
          errorCode: error.errorCode,
          statusCode: error.statusCode.toString(),
          correlationId: error.correlationId,
          isRetryable: error.isRetryable.toString(),
          path: error.path,
          traceId: error.traceId || '',
          timestamp: new Date().toISOString(),
          url: window.location.href,
          source: 'ApiErrorHandler',
        },
      });
    }
  }

  private isCriticalError(error: Error): boolean {
    // Define what constitutes a critical error
    const criticalPatterns = [
      /chunk/i, // Chunk loading errors
      /network/i, // Network errors
      /loading/i, // Resource loading errors
      /script/i, // Script errors
    ];

    return criticalPatterns.some(pattern => pattern.test(error.message) || pattern.test(error.name));
  }

  private showUserNotification(error: Error, context: string) {
    // This would integrate with your notification system
    console.warn('Critical error occurred:', { error: error.message, context });

    // Example: Show a toast notification
    if (typeof window !== 'undefined') {
      // You could dispatch a custom event here that your notification system listens for
      window.dispatchEvent(
        new CustomEvent('critical-error', {
          detail: {
            message: 'Something went wrong. Please refresh the page.',
            error: error.message,
            context,
          },
        })
      );
    }
  }

  private showApiErrorNotification(error: ApiError) {
    // Show user-friendly messages for API errors
    const userMessage = this.getUserFriendlyMessage(error);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('api-error', {
          detail: {
            message: userMessage,
            isRetryable: error.isRetryable,
            supportContact: error.supportContact,
            correlationId: error.correlationId,
          },
        })
      );
    }
  }

  private getUserFriendlyMessage(error: ApiError): string {
    switch (error.errorCode) {
      case 'UNAUTHORIZED':
        return 'Please log in to continue.';
      case 'FORBIDDEN':
        return "You don't have permission to perform this action.";
      case 'RESOURCE_NOT_FOUND':
        return 'The requested resource could not be found.';
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many requests. Please wait a moment and try again.';
      case 'EXTERNAL_SERVICE_ERROR':
        return 'A service is temporarily unavailable. Please try again later.';
      case 'MAINTENANCE_MODE':
        return 'The service is under maintenance. Please try again later.';
      default:
        return error.supportContact || 'An error occurred. Please try again.';
    }
  }

  // Get recent errors for debugging
  getRecentErrors(limit = 10) {
    return this.errorQueue.slice(-limit).reverse();
  }

  // Clear error queue
  clearErrors() {
    this.errorQueue = [];
  }
}

// Create singleton instance
export const globalErrorHandler = new GlobalErrorHandlerService();

// Auto-initialize if we're in the browser
if (typeof window !== 'undefined') {
  globalErrorHandler.initialize();
}

// Hook for React components to report errors
export const useErrorReporting = () => {
  const reportError = (error: Error, context?: string) => {
    globalErrorHandler.handleError(error, context);
  };

  const reportApiError = (error: ApiError, context?: string) => {
    globalErrorHandler.handleApiError(error, context);
  };

  return { reportError, reportApiError };
};
