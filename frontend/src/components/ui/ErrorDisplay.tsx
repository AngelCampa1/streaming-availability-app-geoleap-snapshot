/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { AlertCircle, RefreshCw, WifiOff, ServerCrash, AlertTriangle } from 'lucide-react';

export interface ErrorDisplayProps {
  error: string | Error;
  type?: 'network' | 'server' | 'validation' | 'permission' | 'general';
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  showIcon?: boolean;
  variant?: 'inline' | 'card' | 'banner' | 'modal';
  retryLabel?: string;
  dismissLabel?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  type = 'general',
  onRetry,
  onDismiss,
  className = '',
  showIcon = true,
  variant = 'inline',
  retryLabel = 'Try Again',
  dismissLabel = 'Dismiss',
}) => {
  const errorMessage = error instanceof Error ? error.message : error;

  const getErrorIcon = () => {
    switch (type) {
      case 'network':
        return <WifiOff className="w-5 h-5" />;
      case 'server':
        return <ServerCrash className="w-5 h-5" />;
      case 'validation':
        return <AlertTriangle className="w-5 h-5" />;
      case 'permission':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getErrorTitle = () => {
    switch (type) {
      case 'network':
        return 'Connection Error';
      case 'server':
        return 'Server Error';
      case 'validation':
        return 'Validation Error';
      case 'permission':
        return 'Permission Denied';
      default:
        return 'Error';
    }
  };

  const getErrorDescription = () => {
    switch (type) {
      case 'network':
        return 'Please check your internet connection and try again.';
      case 'server':
        return 'Our servers are experiencing issues. Please try again later.';
      case 'validation':
        return 'Please check your input and try again.';
      case 'permission':
        return "You don't have permission to perform this action.";
      default:
        return 'An unexpected error occurred.';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return 'bg-background border border-destructive/30 rounded-lg shadow-sm p-6';
      case 'banner':
        return 'bg-destructive/10 border border-destructive/30 rounded-lg p-4';
      case 'modal':
        return 'bg-background rounded-lg shadow-lg p-6 max-w-md mx-auto';
      default:
        return 'text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-4';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'card':
      case 'modal':
        return 'text-destructive';
      default:
        return 'text-destructive';
    }
  };

  return (
    <div className={`${getVariantStyles()} ${className}`} role="alert" aria-live="polite">
      <div className="flex items-start space-x-3">
        {showIcon && <div className={`flex-shrink-0 ${getIconColor()}`}>{getErrorIcon()}</div>}

        <div className="flex-1 min-w-0">
          {variant !== 'inline' && <h3 className="text-lg font-medium text-foreground mb-2">{getErrorTitle()}</h3>}

          <p className="text-sm text-muted-foreground mb-3">{getErrorDescription()}</p>

          {errorMessage && (
            <p className="text-xs text-muted-foreground mb-4 font-mono bg-muted p-2 rounded border border-border">
              {errorMessage}
            </p>
          )}

          <div className="flex space-x-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-error hover:bg-error/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error transition-colors"
                aria-label={retryLabel}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {retryLabel}
              </button>
            )}

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="inline-flex items-center px-3 py-2 border border-border text-sm leading-4 font-medium rounded-md text-foreground bg-card hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border transition-colors"
                aria-label={dismissLabel}
              >
                {dismissLabel}
              </button>
            )}
          </div>
        </div>

        {onDismiss && variant === 'banner' && (
          <div className="flex-shrink-0 ml-4">
            <button
              onClick={onDismiss}
              className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus:text-foreground transition-colors"
              aria-label="Dismiss error"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Error boundary component for catching React errors
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{
    fallback?: React.ComponentType<{ error?: Error; reset: () => void }>;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  }>,
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;

      if (Fallback) {
        return <Fallback error={this.state.error} reset={this.reset} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-error" />
              <h2 className="mt-6 text-3xl font-bold text-foreground">Something went wrong</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We&apos;re sorry, but something unexpected happened. Please try again.
              </p>
            </div>

            <ErrorDisplay
              error={this.state.error || 'Unknown error'}
              type="general"
              onRetry={this.reset}
              variant="card"
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for handling errors in functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error | string) => {
    const errorObj = error instanceof Error ? error : new Error(error);
    setError(errorObj);
  }, []);

  // Log errors when they occur
  React.useEffect(() => {
    if (error) {
      console.error('Error handled by useErrorHandler:', error);
    }
  }, [error]);

  return {
    error,
    handleError,
    resetError,
    hasError: !!error,
  };
};

export default ErrorDisplay;
