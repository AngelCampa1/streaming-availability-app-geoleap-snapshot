'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
// import * as Sentry from '@sentry/nextjs'; // Disabled for CF Workers

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: this.generateErrorId(),
    };
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error with detailed context
    this.logError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    const errorData = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`🚨 React Error Boundary - ${this.state.errorId}`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Full Context:', errorData);
    }

    // Send to logging service
    interface WindowWithLoggerService extends Window {
      loggerService?: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logError: (source: string, data: Record<string, any>) => void;
      };
    }

    if (typeof window !== 'undefined' && (window as WindowWithLoggerService).loggerService) {
      (window as WindowWithLoggerService).loggerService!.logError('ReactErrorBoundary', errorData);
    }

    // Send to Sentry
    console.error('Sentry disabled:', error, {
      extra: {
        errorId: this.state.errorId,
        componentStack: errorInfo.componentStack || '',
        timestamp: errorData.timestamp,
        url: errorData.url,
      },
    });
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: this.generateErrorId(),
    });

    // Call the optional retry callback
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-muted/50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-destructive">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="mt-6 text-3xl font-bold text-foreground">Oops! Something went wrong</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We&apos;ve encountered an unexpected error. Our team has been notified.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 text-left">
                  <details className="bg-destructive/10 border border-destructive/30 rounded-md p-4">
                    <summary className="font-medium text-destructive cursor-pointer">
                      Error Details (Development Only)
                    </summary>
                    <div className="mt-2 text-sm text-destructive/90">
                      <p>
                        <strong>Error ID:</strong> {this.state.errorId}
                      </p>
                      <p>
                        <strong>Message:</strong> {this.state.error?.message}
                      </p>
                      {this.state.error?.stack && (
                        <pre className="mt-2 whitespace-pre-wrap text-xs">{this.state.error.stack}</pre>
                      )}
                    </div>
                  </details>
                </div>
              )}
              <div className="mt-6 space-y-4">
                {this.props.onRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={() => (window.location.href = '/')}
                  className="w-full flex justify-center py-2 px-4 border border-input rounded-full shadow-sm text-sm font-medium text-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                >
                  Go to Homepage
                </button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Error ID: {this.state.errorId}</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to report errors
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: Record<string, unknown>) => {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const errorData = {
      errorId,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      additionalInfo: errorInfo,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`🚨 Manual Error Report - ${errorId}`);
      console.error('Error:', error);
      console.error('Additional Info:', errorInfo);
      console.error('Full Context:', errorData);
    }

    // Send to logging service
    interface WindowWithLoggerService extends Window {
      loggerService?: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logError: (source: string, data: Record<string, any>) => void;
      };
    }

    if (typeof window !== 'undefined' && (window as WindowWithLoggerService).loggerService) {
      (window as WindowWithLoggerService).loggerService!.logError('ManualErrorReport', errorData);
    }

    // Send to Sentry
    console.error('Sentry disabled:', error, { extra: errorData });
  }, []);

  return { handleError };
};

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<T extends object>(Component: React.ComponentType<T>, errorFallback?: ReactNode) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary fallback={errorFallback}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Component {...(props as any)} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
