'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
// import * as Sentry from '@sentry/nextjs'; // Disabled for CF Workers
import { ErrorMessage } from './ErrorMessage';
import { InternalServerErrorPage } from './ErrorPages';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  onRetry?: () => void;
  level?: 'page' | 'section' | 'component';
  showErrorBoundary?: boolean;
  contextName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
  retryCount: number;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: this.generateErrorId(),
      retryCount: 0,
    };
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error with detailed context
    this.logError(error, errorInfo);

    // Add to error context if available
    this.addToErrorContext(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.state.errorId);
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
      contextName: this.props.contextName,
      level: this.props.level,
      retryCount: this.state.retryCount,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`🚨 Enhanced Error Boundary - ${this.state.errorId}`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Context:', this.props.contextName || 'Unknown');
      console.error('Level:', this.props.level || 'component');
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
      (window as WindowWithLoggerService).loggerService!.logError('EnhancedErrorBoundary', errorData);
    }

    // Send to Sentry
    console.error('Sentry disabled:', error, {
      extra: {
        errorId: this.state.errorId,
        componentStack: errorInfo.componentStack || '',
        timestamp: errorData.timestamp,
        url: errorData.url,
        contextName: this.props.contextName || 'Unknown',
        level: this.props.level || 'component',
        retryCount: this.state.retryCount.toString(),
      },
    });
  }

  private addToErrorContext(error: Error, errorInfo: ErrorInfo) {
    // Try to add to error context if it exists
    try {
      interface WindowWithErrorActions extends Window {
        __errorActions?: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          addSystemError: (message: string, correlationId?: string, context?: Record<string, any>) => string;
        };
      }

      const windowWithActions = window as WindowWithErrorActions;
      if (windowWithActions.__errorActions) {
        windowWithActions.__errorActions.addSystemError(error.message, this.state.errorId, {
          componentStack: errorInfo.componentStack,
          contextName: this.props.contextName,
          level: this.props.level,
          retryCount: this.state.retryCount,
        });
      }
    } catch (contextError) {
      // Ignore context errors to prevent infinite loops
      console.warn('Failed to add error to context:', contextError);
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: this.generateErrorId(),
      retryCount: prevState.retryCount + 1,
    }));

    // Call the optional retry callback
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  private getErrorFallback() {
    const { level = 'component', contextName } = this.props;
    const canRetry = this.state.retryCount < this.maxRetries;
    const error = this.state.error;

    // Custom fallback UI
    if (this.props.fallback) {
      return this.props.fallback;
    }

    // Page-level error - show full page error
    if (level === 'page') {
      return (
        <InternalServerErrorPage
          title="Page Error"
          message={`An error occurred while loading this page${contextName ? ` (${contextName})` : ''}.`}
          correlationId={this.state.errorId}
          onRetry={canRetry ? this.handleRetry : undefined}
        />
      );
    }

    // Section-level error - show error message with context
    if (level === 'section') {
      return (
        <div className="p-6 min-h-[200px] flex items-center justify-center">
          <ErrorMessage
            title={`${contextName ? `${contextName} ` : ''}Error`}
            message={error?.message || 'An unexpected error occurred in this section.'}
            severity="error"
            category="system"
            correlationId={this.state.errorId}
            isRetryable={canRetry}
            actions={
              canRetry
                ? [
                    {
                      label: `Retry (${this.state.retryCount}/${this.maxRetries})`,
                      onClick: this.handleRetry,
                      variant: 'primary',
                    },
                  ]
                : []
            }
            details={
              process.env.NODE_ENV === 'development' ? (
                <div className="text-left">
                  <p>
                    <strong>Context:</strong> {contextName || 'Unknown'}
                  </p>
                  {error?.stack && (
                    <pre className="mt-2 text-xs whitespace-pre-wrap bg-muted p-2 rounded">
                      {error.stack}
                    </pre>
                  )}
                </div>
              ) : undefined
            }
            expandable={process.env.NODE_ENV === 'development'}
          />
        </div>
      );
    }

    // Component-level error - show minimal error
    return (
      <div className="p-4 border border-error/20 bg-error/10 rounded-lg">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-error flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-error">
              {contextName ? `${contextName} Error` : 'Component Error'}
            </h4>
            <p className="mt-1 text-sm text-error/90">
              {error?.message || 'This component encountered an error.'}
            </p>
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="mt-2 text-xs text-error underline hover:no-underline"
              >
                Try again ({this.state.retryCount}/{this.maxRetries})
              </button>
            )}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer text-error/80">Debug Info</summary>
                <div className="mt-1 text-xs text-error/80">
                  <p>
                    <strong>Error ID:</strong> {this.state.errorId}
                  </p>
                  {error?.stack && (
                    <pre className="mt-1 whitespace-pre-wrap text-xs bg-error/5 p-1 rounded">
                      {error.stack.split('\n').slice(0, 3).join('\n')}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.getErrorFallback();
    }

    return this.props.children;
  }
}

// Specialized error boundaries for different levels
export function PageErrorBoundary({
  children,
  contextName,
  onError,
  onRetry,
}: {
  children: ReactNode;
  contextName?: string;
  onError?: Props['onError'];
  onRetry?: Props['onRetry'];
}) {
  return (
    <EnhancedErrorBoundary level="page" contextName={contextName} onError={onError} onRetry={onRetry}>
      {children}
    </EnhancedErrorBoundary>
  );
}

export function SectionErrorBoundary({
  children,
  contextName,
  onError,
  onRetry,
}: {
  children: ReactNode;
  contextName?: string;
  onError?: Props['onError'];
  onRetry?: Props['onRetry'];
}) {
  return (
    <EnhancedErrorBoundary level="section" contextName={contextName} onError={onError} onRetry={onRetry}>
      {children}
    </EnhancedErrorBoundary>
  );
}

export function ComponentErrorBoundary({
  children,
  contextName,
  fallback,
  onError,
  onRetry,
}: {
  children: ReactNode;
  contextName?: string;
  fallback?: ReactNode;
  onError?: Props['onError'];
  onRetry?: Props['onRetry'];
}) {
  return (
    <EnhancedErrorBoundary
      level="component"
      contextName={contextName}
      fallback={fallback}
      onError={onError}
      onRetry={onRetry}
    >
      {children}
    </EnhancedErrorBoundary>
  );
}

// Higher-order component for wrapping components with error boundary
export function withEnhancedErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  options: {
    level?: Props['level'];
    contextName?: string;
    errorFallback?: ReactNode;
  } = {}
) {
  const WrappedComponent = (props: T) => (
    <EnhancedErrorBoundary
      level={options.level || 'component'}
      contextName={options.contextName || Component.displayName || Component.name}
      fallback={options.errorFallback}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Component {...(props as any)} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withEnhancedErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook to integrate with error context
export function useErrorBoundaryContext() {
  React.useEffect(() => {
    // Make error actions available globally for error boundaries
    try {
      if (typeof window !== 'undefined') {
        interface WindowWithErrorActions extends Window {
          __errorActions?: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            addSystemError: (message: string, correlationId?: string, context?: Record<string, any>) => string;
          };
        }

        // This would be set by the ErrorProvider
        const windowWithActions = window as WindowWithErrorActions;
        if (windowWithActions.__errorActions) {
          // Error actions are available
          return;
        }
      }
    } catch (error) {
      console.warn('Error boundary context integration failed:', error);
    }
  }, []);
}

// Manual error reporting for functional components
export function useErrorReporting() {
  const reportError = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error: Error, contextName?: string, additionalInfo?: Record<string, any>) => {
      const errorId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const errorData = {
        errorId,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        contextName: contextName || 'Manual Report',
        additionalInfo,
      };

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error(`🚨 Manual Error Report - ${errorId}`);
        console.error('Error:', error);
        console.error('Context:', contextName);
        console.error('Additional Info:', additionalInfo);
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

      // Add to error context if available
      try {
        interface WindowWithErrorActions extends Window {
          __errorActions?: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            addSystemError: (message: string, correlationId?: string, context?: Record<string, any>) => string;
          };
        }

        const windowWithActions = window as WindowWithErrorActions;
        if (windowWithActions.__errorActions) {
          windowWithActions.__errorActions.addSystemError(error.message, errorId, { contextName, ...additionalInfo });
        }
      } catch (contextError) {
        // Ignore context errors
        console.warn('Failed to add error to context:', contextError);
      }

      return errorId;
    },
    []
  );

  return { reportError };
}
