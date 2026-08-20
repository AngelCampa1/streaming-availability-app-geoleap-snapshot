'use client';

import React, { useState, useEffect } from'react';
import { cn } from'@/lib/utils';
import { Button } from'@/components/ui/button';
import { useError, ErrorState } from'@/contexts/ErrorContext';

interface NotificationProps {
  error: ErrorState;
  onClose: (id: string) => void;
  onRetry?: (id: string) => void;
  position?:'top-right' |'top-left' |'bottom-right' |'bottom-left';
}

function ErrorNotification({ error, onClose, onRetry, position ='top-right' }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    setIsVisible(true);
  }, []);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onClose(error.id), 300);
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry(error.id);
    }
  };

  const getSeverityStyles = () => {
    switch (error.severity) {
      case'info':
        return {
          bg:'bg-primary/10',
          border:'border-primary/30',
          text:'text-primary',
          icon:'text-primary',
        };
      case'warning':
        return {
          bg:'bg-warning/10',
          border:'border-warning/30',
          text:'text-warning',
          icon:'text-warning',
        };
      case'error':
        return {
          bg:'bg-destructive/10',
          border:'border-destructive/30',
          text:'text-destructive',
          icon:'text-destructive',
        };
      case'critical':
        return {
          bg:'bg-destructive/20',
          border:'border-destructive/40',
          text:'text-destructive',
          icon:'text-destructive',
        };
      default:
        return {
          bg:'bg-muted',
          border:'border-border',
          text:'text-muted-foreground',
          icon:'text-muted-foreground',
        };
    }
  };

  const getSeverityIcon = () => {
    switch (error.severity) {
      case'info':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case'warning':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        );
      case'error':
      case'critical':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case'top-left':
        return'top-4 left-4';
      case'bottom-right':
        return'bottom-4 right-4';
      case'bottom-left':
        return'bottom-4 left-4';
      default:
        return'top-4 right-4';
    }
  };

  const getAnimationClasses = () => {
    const baseClasses ='transition-all duration-300 ease-in-out';

    if (isLeaving) {
      switch (position) {
        case'top-left':
        case'bottom-left':
          return `${baseClasses} transform -translate-x-full opacity-0`;
        default:
          return `${baseClasses} transform translate-x-full opacity-0`;
      }
    }

    if (isVisible) {
      return `${baseClasses} transform translate-x-0 opacity-100`;
    }

    switch (position) {
      case'top-left':
      case'bottom-left':
        return `${baseClasses} transform -translate-x-full opacity-0`;
      default:
        return `${baseClasses} transform translate-x-full opacity-0`;
    }
  };

  const styles = getSeverityStyles();

  return (
    <div className={cn('fixed z-[1700] w-full max-w-sm', getPositionClasses(), getAnimationClasses())}>
      <div className={cn('border rounded-lg shadow-lg p-4', styles.bg, styles.border)}>
        <div className="flex items-start gap-3">
          <div className={cn('flex-shrink-0', styles.icon)}>{getSeverityIcon()}</div>

          <div className="flex-1 min-w-0">
            <h4 className={cn('text-sm font-medium', styles.text)}>{error.title}</h4>
            <p className={cn('mt-1 text-sm', styles.text,'opacity-80')}>{error.message}</p>

            {(error.isRetryable || error.correlationId) && (
              <div className="mt-3 flex items-center gap-2">
                {error.isRetryable && error.retryCount < error.maxRetries && onRetry && (
                  <button
                    onClick={handleRetry}
                    className={cn('text-xs px-2 py-1 rounded-full border transition-colors',
                      styles.text,'hover:bg-white/50'
                    )}
                  >
                    Retry ({error.retryCount}/{error.maxRetries})
                  </button>
                )}

                {error.correlationId && (
                  <span className={cn('text-xs font-mono', styles.text,'opacity-60')}>
                    ID: {error.correlationId.slice(-8)}
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleClose}
            className={cn('flex-shrink-0 p-1 rounded hover:bg-black/5  transition-colors',
              styles.text
            )}
            aria-label="Close notification"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function ErrorNotificationContainer({
  position ='top-right',
  maxNotifications = 5,
}: {
  position?:'top-right' |'top-left' |'bottom-right' |'bottom-left';
  maxNotifications?: number;
}) {
  const { state, actions } = useError();
  const [retryFunctions, setRetryFunctions] = useState<Record<string, () => void>>({});

  const visibleErrors = state.errors.filter(error => error.isVisible).slice(0, maxNotifications);

  const handleClose = (id: string) => {
    actions.dismissError(id);
  };

  const handleRetry = (id: string) => {
    actions.retryError(id);

    // Execute retry function if available
    const retryFn = retryFunctions[id];
    if (retryFn) {
      retryFn();
    }
  };

  // Register retry functions from outside
  const _registerRetry = (errorId: string, retryFn: () => void) => {
    setRetryFunctions(prev => ({ ...prev, [errorId]: retryFn }));
  };

  const _unregisterRetry = (errorId: string) => {
    setRetryFunctions(prev => {
      const { [errorId]: _, ...rest } = prev;
      return rest;
    });
  };

  // Clean up retry functions when errors are removed
  useEffect(() => {
    const currentErrorIds = new Set(visibleErrors.map(e => e.id));
    setRetryFunctions(prev => {
      const filtered: Record<string, () => void> = {};
      Object.entries(prev).forEach(([id, fn]) => {
        if (currentErrorIds.has(id)) {
          filtered[id] = fn;
        }
      });
      return filtered;
    });
  }, [visibleErrors]);

  return (
    <>
      {visibleErrors.map((error) => (
        <ErrorNotification
          key={error.id}
          error={error}
          onClose={handleClose}
          onRetry={handleRetry}
          position={position}
        />
      ))}
    </>
  );
}

// Toast-style notifications for quick feedback
export function ErrorToast({
  message,
  severity ='error',
  duration = 5000,
  onClose,
}: {
  message: string;
  severity?: ErrorState['severity'];
  duration?: number;
  onClose?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getSeverityStyles = () => {
    switch (severity) {
      case'info':
        return'bg-primary text-primary-foreground';
      case'warning':
        return'bg-warning text-warning-foreground';
      case'error':
        return'bg-destructive text-destructive-foreground';
      case'critical':
        return'bg-destructive text-destructive-foreground';
      default:
        return'bg-muted text-muted-foreground';
    }
  };

  return (
    <div
      className={cn('fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[1700]','px-6 py-3 rounded-lg shadow-lg text-sm font-medium','transition-all duration-300 ease-in-out',
        getSeverityStyles(),
        isVisible ?'translate-y-0 opacity-100' :'translate-y-2 opacity-0'
      )}
    >
      {message}
    </div>
  );
}

// Inline notification for specific contexts
export function InlineErrorNotification({
  error,
  onRetry,
  onDismiss,
  className,
}: {
  error: ErrorState;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}) {
  const styles = {
    info:'bg-primary/10 border-primary/30 text-primary',
    warning:'bg-warning/10 border-warning/30 text-warning',
    error:'bg-destructive/10 border-destructive/30 text-destructive',
    critical:'bg-destructive/20 border-destructive/40 text-destructive',
  };

  return (
    <div className={cn('border rounded-lg p-3 mb-4', styles[error.severity], className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{error.title}</p>
          <p className="text-sm opacity-80 mt-1">{error.message}</p>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {error.isRetryable && error.retryCount < error.maxRetries && onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} className="text-xs">
              Retry
            </Button>
          )}

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 rounded-full hover:bg-black/5  transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for managing toast notifications
export function useErrorToast() {
  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      message: string;
      severity: ErrorState['severity'];
      duration?: number;
    }>
  >([]);

  const showToast = (message: string, severity: ErrorState['severity'] ='error', duration = 5000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, message, severity, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = () => (
    <>
      {toasts.map(toast => (
        <ErrorToast
          key={toast.id}
          message={toast.message}
          severity={toast.severity}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );

  return {
    showToast,
    ToastContainer,
  };
}

// Global notification handler
export function useGlobalErrorNotifications() {
  const { state } = useError();

  useEffect(() => {
    // Handle critical errors with browser notifications if permission granted
    if ('Notification' in window && Notification.permission ==='granted') {
      state.errors
        .filter(error => error.severity ==='critical' && error.isVisible)
        .forEach(error => {
          new Notification(`GeoLeap: ${error.title}`, {
            body: error.message,
            icon:'/favicon.ico',
            tag: error.id,
          });
        });
    }
  }, [state.errors]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission ==='default') {
      await Notification.requestPermission();
    }
  };

  return {
    requestNotificationPermission,
    hasNotificationPermission:'Notification' in window && Notification.permission ==='granted',
  };
}
