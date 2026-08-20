'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LoadingErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void | Promise<void>;
  retryDelay?: number;
  maxRetries?: number;
  autoRetry?: boolean;
  showProgress?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'minimal' | 'detailed' | 'card';
}

interface LoadingState {
  isLoading: boolean;
  hasError: boolean;
  retryCount: number;
  isRetrying: boolean;
  timeUntilRetry: number;
}

export function LoadingError({
  title = 'Failed to load',
  message = 'Something went wrong while loading this content.',
  onRetry,
  retryDelay = 3000,
  maxRetries = 3,
  autoRetry = false,
  showProgress = true,
  className,
  size = 'md',
  variant = 'detailed',
}: LoadingErrorProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    hasError: true,
    retryCount: 0,
    isRetrying: false,
    timeUntilRetry: 0,
  });

  const [countdownTimer, setCountdownTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (autoRetry && loadingState.retryCount < maxRetries && onRetry) {
      startAutoRetryCountdown();
    }

    return () => {
      if (countdownTimer) {
        clearTimeout(countdownTimer);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRetry, loadingState.retryCount, maxRetries, onRetry]);

  const startAutoRetryCountdown = () => {
    if (countdownTimer) {
      clearTimeout(countdownTimer);
    }

    setLoadingState(prev => ({ ...prev, timeUntilRetry: retryDelay / 1000 }));

    const intervalId = setInterval(() => {
      setLoadingState(prev => {
        if (prev.timeUntilRetry <= 1) {
          clearInterval(intervalId);
          handleRetry();
          return { ...prev, timeUntilRetry: 0 };
        }
        return { ...prev, timeUntilRetry: prev.timeUntilRetry - 1 };
      });
    }, 1000);

    setCountdownTimer(intervalId as NodeJS.Timeout);
  };

  const handleRetry = async () => {
    if (!onRetry || loadingState.isRetrying || loadingState.retryCount >= maxRetries) {
      return;
    }

    setLoadingState(prev => ({
      ...prev,
      isRetrying: true,
      isLoading: true,
      hasError: false,
      retryCount: prev.retryCount + 1,
      timeUntilRetry: 0,
    }));

    if (countdownTimer) {
      clearTimeout(countdownTimer);
      setCountdownTimer(null);
    }

    try {
      await onRetry();
      // Success - let parent component handle state
      setLoadingState(prev => ({
        ...prev,
        isRetrying: false,
        isLoading: false,
        hasError: false,
      }));
    } catch (_error) {
      setLoadingState(prev => ({
        ...prev,
        isRetrying: false,
        isLoading: false,
        hasError: true,
      }));
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'p-3',
          icon: 'w-8 h-8',
          title: 'text-sm font-medium',
          message: 'text-xs',
          button: 'text-xs px-2 py-1',
        };
      case 'lg':
        return {
          container: 'p-8',
          icon: 'w-16 h-16',
          title: 'text-2xl font-bold',
          message: 'text-base',
          button: 'text-base px-6 py-3',
        };
      default:
        return {
          container: 'p-6',
          icon: 'w-12 h-12',
          title: 'text-lg font-semibold',
          message: 'text-sm',
          button: 'text-sm px-4 py-2',
        };
    }
  };

  const sizeClasses = getSizeClasses();
  const canRetry = onRetry && loadingState.retryCount < maxRetries;

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-3 text-muted-foreground', className)}>
        <svg
          className={cn(sizeClasses.icon, 'text-error flex-shrink-0')}
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
          <p className={sizeClasses.title}>{title}</p>
          {canRetry && !loadingState.isRetrying && (
            <button onClick={handleRetry} className="text-primary hover:text-primary/80 underline text-xs mt-1">
              Try again
            </button>
          )}
        </div>
        {loadingState.isRetrying && (
          <div className="animate-spin">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                className="opacity-75"
              />
            </svg>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'border border-error/30 bg-error/10 rounded-lg',
          sizeClasses.container,
          className
        )}
      >
        <div className="flex items-start gap-4">
          <svg
            className={cn(sizeClasses.icon, 'text-error flex-shrink-0 mt-1')}
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
            <h3 className={cn(sizeClasses.title, 'text-error mb-1')}>{title}</h3>
            <p className={cn(sizeClasses.message, 'text-error/80 mb-4')}>{message}</p>
            {canRetry && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleRetry}
                  disabled={loadingState.isRetrying}
                  size="sm"
                  variant="outline"
                  className="border-error/30 text-error hover:bg-error/10"
                >
                  {loadingState.isRetrying ? (
                    <>
                      <div className="animate-spin mr-2">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                          <path
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            className="opacity-75"
                          />
                        </svg>
                      </div>
                      Retrying...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Try Again
                    </>
                  )}
                </Button>
                {loadingState.timeUntilRetry > 0 && (
                  <span className="text-xs text-error/70">Auto-retry in {loadingState.timeUntilRetry}s</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Detailed variant (default)
  return (
    <div className={cn('text-center', sizeClasses.container, className)}>
      <div className="mb-4">
        <svg
          className={cn(sizeClasses.icon, 'mx-auto text-error mb-3')}
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
      </div>

      <h3 className={cn(sizeClasses.title, 'text-foreground mb-2')}>{title}</h3>

      <p className={cn(sizeClasses.message, 'text-muted-foreground mb-6 max-w-sm mx-auto')}>{message}</p>

      {canRetry && (
        <div className="space-y-3">
          <Button
            onClick={handleRetry}
            disabled={loadingState.isRetrying}
            size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
          >
            {loadingState.isRetrying ? (
              <>
                <div className="animate-spin mr-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      className="opacity-75"
                    />
                  </svg>
                </div>
                Retrying...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Try Again ({loadingState.retryCount}/{maxRetries})
              </>
            )}
          </Button>

          {showProgress && loadingState.retryCount > 0 && (
            <div className="text-xs text-muted-foreground">
              {loadingState.retryCount >= maxRetries ? (
                'Maximum retry attempts reached'
              ) : loadingState.timeUntilRetry > 0 ? (
                <div className="flex items-center justify-center gap-2">
                  <span>Auto-retry in {loadingState.timeUntilRetry} seconds</span>
                  <button
                    onClick={() => {
                      if (countdownTimer) {
                        clearTimeout(countdownTimer);
                        setCountdownTimer(null);
                      }
                      setLoadingState(prev => ({ ...prev, timeUntilRetry: 0 }));
                    }}
                    className="underline hover:no-underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                `Attempt ${loadingState.retryCount} of ${maxRetries}`
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Skeleton loader with error state
export function SkeletonWithError({
  loading,
  error,
  onRetry,
  children,
  skeletonLines = 3,
  className,
}: {
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  skeletonLines?: number;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={cn('animate-pulse space-y-3', className)}>
        {Array.from({ length: skeletonLines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'bg-muted rounded h-4',
              i === skeletonLines - 1 && 'w-3/4' // Last line shorter
            )}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <LoadingError
        title="Failed to load content"
        message={error}
        onRetry={onRetry}
        size="sm"
        variant="card"
        className={className}
      />
    );
  }

  return <>{children}</>;
}

// Hook for loading state with error handling
export function useLoadingError<T>(
  loadFunction: () => Promise<T>,
  options: {
    autoLoad?: boolean;
    maxRetries?: number;
    retryDelay?: number;
  } = {}
) {
  const [state, setState] = useState<LoadingState & { data: T | null }>({
    isLoading: false,
    hasError: false,
    retryCount: 0,
    isRetrying: false,
    timeUntilRetry: 0,
    data: null,
  });

  const { autoLoad = true, maxRetries = 3, retryDelay: _retryDelay = 3000 } = options;

  const load = async () => {
    if (state.retryCount >= maxRetries) return;

    setState(prev => ({
      ...prev,
      isLoading: true,
      hasError: false,
      isRetrying: prev.retryCount > 0,
      retryCount: prev.retryCount + (prev.retryCount > 0 ? 1 : 0),
    }));

    try {
      const data = await loadFunction();
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: false,
        isRetrying: false,
        data,
        retryCount: 0, // Reset on success
      }));
    } catch (_error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        isRetrying: false,
        retryCount: prev.retryCount + (prev.retryCount === 0 ? 1 : 0),
      }));
    }
  };

  const retry = () => {
    load();
  };

  const reset = () => {
    setState({
      isLoading: false,
      hasError: false,
      retryCount: 0,
      isRetrying: false,
      timeUntilRetry: 0,
      data: null,
    });
  };

  useEffect(() => {
    if (autoLoad) {
      load();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
    load,
    retry,
    reset,
    canRetry: state.retryCount < maxRetries,
  };
}
