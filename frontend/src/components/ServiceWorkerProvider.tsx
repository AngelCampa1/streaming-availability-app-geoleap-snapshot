'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  updateAvailable: boolean;
  isOnline: boolean;
  cacheSize?: {
    totalSize: number;
    cacheCount: number;
    formattedSize: string;
  };
}

interface ServiceWorkerProviderProps {
  children: React.ReactNode;
}

export default function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [swState, setSwState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    updateAvailable: false,
    isOnline: true, // Default to true, will be updated by event listeners
  });

  // BUG FIX: Track cleanup functions for memory leak prevention
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);
  const messageChannelRef = useRef<MessageChannel | null>(null);

  const getCacheSize = useCallback(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // BUG FIX: Close previous MessageChannel to prevent memory leak
      if (messageChannelRef.current) {
        messageChannelRef.current.port1.close();
        messageChannelRef.current.port2.close();
      }

      const messageChannel = new MessageChannel();
      messageChannelRef.current = messageChannel;

      messageChannel.port1.onmessage = event => {
        if (event.data.type === 'CACHE_SIZE') {
          setSwState(prev => ({ ...prev, cacheSize: event.data.size }));
          // BUG FIX: Close port after receiving message
          messageChannel.port1.close();
        }
      };

      navigator.serviceWorker.controller.postMessage({ type: 'GET_CACHE_SIZE' }, [messageChannel.port2]);
    }
  }, []);

  const registerServiceWorker = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      setSwState(prev => ({ ...prev, isRegistered: true }));

      // BUG FIX: Track event listeners for cleanup
      const handleUpdateFound = () => {
        const newWorker = registration.installing;

        if (newWorker) {
          const handleStateChange = () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setSwState(prev => ({ ...prev, updateAvailable: true }));
            }
          };

          newWorker.addEventListener('statechange', handleStateChange);
          // BUG FIX: Track statechange listener for cleanup
          cleanupFunctionsRef.current.push(() => {
            newWorker.removeEventListener('statechange', handleStateChange);
          });
        }
      };

      registration.addEventListener('updatefound', handleUpdateFound);
      cleanupFunctionsRef.current.push(() => {
        registration.removeEventListener('updatefound', handleUpdateFound);
      });

      // BUG FIX: Handle messages from service worker with tracked listener
      const handleMessage = (event: MessageEvent) => {
        const { type, size } = event.data;

        if (type === 'CACHE_SIZE') {
          setSwState(prev => ({ ...prev, cacheSize: size }));
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      cleanupFunctionsRef.current.push(() => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      });

      // Get initial cache size
      getCacheSize();

      logger.info('[ServiceWorkerProvider] Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }, [getCacheSize]);

  useEffect(() => {
    // Check if service workers are supported
    if ('serviceWorker' in navigator) {
      setSwState(prev => ({ ...prev, isSupported: true }));
      // TEMPORARILY DISABLED: Service worker causing bundle caching issues during development
      // registerServiceWorker();
    }

    // Set initial online status
    if (typeof navigator !== 'undefined') {
      setSwState(prev => ({ ...prev, isOnline: navigator.onLine }));
    }

    // Listen for online/offline events
    const handleOnline = () => setSwState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setSwState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      // BUG FIX: Call all tracked cleanup functions to prevent memory leaks
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());
      cleanupFunctionsRef.current = [];

      // BUG FIX: Close any open MessageChannel
      if (messageChannelRef.current) {
        messageChannelRef.current.port1.close();
        messageChannelRef.current.port2.close();
        messageChannelRef.current = null;
      }
    };
  }, [registerServiceWorker]);

  const updateServiceWorker = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  const _clearCache = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      setTimeout(() => getCacheSize(), 1000); // Refresh cache size after clearing
    }
  };

  // Cache a search result
  const _cacheSearchResult = (url: string, data: any) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_SEARCH',
        payload: { url, data },
      });
    }
  };

  return (
    <>
      {children}

      {/* Update Available Notification */}
      {swState.updateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:w-96 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg z-50 mobile-optimized">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">Update Available</h4>
              <p className="text-xs opacity-90 mt-1">A new version of GeoLeap is ready</p>
            </div>
            <button
              onClick={updateServiceWorker}
              className="bg-primary-foreground text-primary px-3 py-1 rounded text-sm font-medium hover:bg-primary-foreground/90 touch-target"
            >
              Update
            </button>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {!swState.isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-warning text-warning-foreground px-4 py-2 text-center text-sm z-50 safe-area-top pointer-events-none">
          <span className="inline-flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            You&apos;re offline - Some features may be limited
          </span>
        </div>
      )}
    </>
  );
}

// Hook for using service worker context in components
export function useServiceWorker() {
  // This would normally use React Context, but for simplicity we'll return basic functions
  const cacheSearchResult = (url: string, data: any) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_SEARCH',
        payload: { url, data },
      });
    }
  };

  return {
    cacheSearchResult,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSupported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  };
}
