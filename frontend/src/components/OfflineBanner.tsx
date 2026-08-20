'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, X } from 'lucide-react';

/**
 * OfflineBanner - Displays a banner when the user loses internet connection.
 * Automatically shows/hides based on navigator.onLine and online/offline events.
 */
export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Check initial state
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      setIsDismissed(false); // Reset dismissed state when back online
    };

    const handleOffline = () => {
      setIsOffline(true);
      setIsDismissed(false); // Show banner again when going offline
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [mounted]);

  // Don't render if not mounted, online, or dismissed
  if (!mounted || !isOffline || isDismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 bg-warning text-warning-foreground px-4 py-3 shadow-md animate-in slide-in-from-top duration-300"
    >
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <WifiOff className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">You&apos;re offline</p>
            <p className="text-xs opacity-90">Some features may not work until you reconnect.</p>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-warning-foreground/20 rounded-full transition-colors"
          aria-label="Dismiss offline notification"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default OfflineBanner;
