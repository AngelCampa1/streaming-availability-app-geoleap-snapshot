'use client';

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NetworkStatusProps {
  onRetry?: () => void;
  className?: string;
  showOfflineContent?: boolean;
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionSpeed, setConnectionSpeed] = useState<'fast' | 'slow' | 'offline'>('fast');

  useEffect(() => {
    // Initial status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setConnectionSpeed('fast');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionSpeed('offline');
    };

    // Connection speed estimation
    const estimateConnectionSpeed = () => {
      if (!navigator.onLine) {
        setConnectionSpeed('offline');
        return;
      }

      const connection = (navigator as unknown as { connection?: { effectiveType?: string } }).connection; // Network Information API
      if (connection) {
        // Use Network Information API if available
        const effectiveType = connection.effectiveType;
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          setConnectionSpeed('slow');
        } else {
          setConnectionSpeed('fast');
        }
      } else {
        // Fallback: test with a small image request
        const startTime = Date.now();
        const img = new Image();
        img.onload = () => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          setConnectionSpeed(duration > 1000 ? 'slow' : 'fast');
        };
        img.onerror = () => {
          setConnectionSpeed('slow');
        };
        img.src = '/api/health?' + Date.now(); // Small endpoint
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection speed periodically
    estimateConnectionSpeed();
    const speedCheckInterval = setInterval(estimateConnectionSpeed, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(speedCheckInterval);
    };
  }, []);

  return { isOnline, connectionSpeed };
}

export function NetworkStatusIndicator({ onRetry, className, showOfflineContent = false }: NetworkStatusProps) {
  const { isOnline, connectionSpeed } = useNetworkStatus();
  const [showNotification, setShowNotification] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!isOnline || connectionSpeed === 'slow') {
      setShowNotification(true);
      setIsDismissed(false); // Reset dismissal when going offline/slow
    } else {
      // Hide notification after a delay when back online
      const timer = setTimeout(() => setShowNotification(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, connectionSpeed]);

  if (!showNotification || isDismissed) return null;

  if (!isOnline) {
    return (
      <div className="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 z-[1700] w-full max-w-md px-4">
        <Alert className={cn('border-warning/30 bg-warning/10 text-warning shadow-lg pointer-events-auto', className)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <AlertDescription className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">You&apos;re offline</p>
              <p className="text-sm opacity-80">
                {showOfflineContent ? 'You can still browse cached content' : 'Please check your internet connection'}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className="border-warning/30 text-warning hover:bg-warning/20"
                >
                  Retry
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsDismissed(true)}
                className="text-warning hover:bg-warning/20 h-8 w-8 p-0"
                aria-label="Dismiss"
              >
                ×
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (connectionSpeed === 'slow') {
    return (
      <div className="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 z-[1700] w-full max-w-md px-4">
        <Alert
          className={cn('border-warning/30 bg-warning/10 text-warning shadow-lg pointer-events-auto', className)}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <AlertDescription className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">Slow connection detected</p>
              <p className="text-sm opacity-80">Some features may be limited to improve your experience</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsDismissed(true)}
              className="text-warning hover:bg-warning/20 h-8 w-8 p-0 ml-4"
              aria-label="Dismiss"
            >
              ×
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}

export function OfflineCapable({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { isOnline } = useNetworkStatus();

  if (!isOnline && fallback) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function NetworkAwareButton({
  children,
  onClick,
  offlineMessage = 'This feature requires an internet connection',
  ...props
}: React.ComponentProps<typeof Button> & {
  offlineMessage?: string;
}) {
  const { isOnline } = useNetworkStatus();
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isOnline) {
      setShowOfflineMessage(true);
      setTimeout(() => setShowOfflineMessage(false), 3000);
      return;
    }

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div className="relative">
      <Button
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(props as any)}
        onClick={handleClick}
        disabled={props.disabled || !isOnline}
        className={cn(props.className, !isOnline && 'opacity-60 cursor-not-allowed')}
      >
        {children}
      </Button>
      {showOfflineMessage && (
        <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-foreground text-background text-xs py-1 px-2 rounded whitespace-nowrap">{offlineMessage}</div>
        </div>
      )}
    </div>
  );
}

// Connection quality indicator component
export function ConnectionIndicator() {
  const { isOnline, connectionSpeed } = useNetworkStatus();

  const getIndicatorColor = () => {
    if (!isOnline) return 'bg-destructive';
    if (connectionSpeed === 'slow') return 'bg-warning';
    return 'bg-success';
  };

  const getIndicatorText = () => {
    if (!isOnline) return 'Offline';
    if (connectionSpeed === 'slow') return 'Slow connection';
    return 'Connected';
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className={cn('w-2 h-2 rounded-full', getIndicatorColor())} />
      <span>{getIndicatorText()}</span>
    </div>
  );
}

// Service worker integration for offline functionality
export function useOfflineSupport() {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      setIsSupported(true);

      navigator.serviceWorker.getRegistration().then(registration => {
        setIsRegistered(!!registration);
      });
    }
  }, []);

  const enableOfflineSupport = async () => {
    if (!isSupported) return false;

    try {
      await navigator.serviceWorker.register('/sw.js');
      setIsRegistered(true);
      return true;
    } catch (err) {
      console.error('Service worker registration failed:', err);
      return false;
    }
  };

  return {
    isSupported,
    isRegistered,
    enableOfflineSupport,
  };
}

// Retry wrapper component for network-dependent operations
export function NetworkRetryWrapper({
  children,
  onRetry,
  maxRetries = 3,
  retryDelay = 1000,
}: {
  children: (retry: () => void, retryCount: number) => React.ReactNode;
  onRetry: () => Promise<void>;
  maxRetries?: number;
  retryDelay?: number;
}) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const { isOnline } = useNetworkStatus();

  const handleRetry = async () => {
    if (!isOnline || retryCount >= maxRetries || isRetrying) {
      return;
    }

    setIsRetrying(true);

    try {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      await onRetry();
      setRetryCount(0); // Reset on success
    } catch (_error) {
      setRetryCount(prev => prev + 1);
    } finally {
      setIsRetrying(false);
    }
  };

  return <>{children(handleRetry, retryCount)}</>;
}
