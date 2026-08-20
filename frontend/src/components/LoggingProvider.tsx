'use client';

import React, { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { analytics } from '@/lib/analytics/unified-analytics';

interface LoggingProviderProps {
  children: React.ReactNode;
}

export const LoggingProvider: React.FC<LoggingProviderProps> = ({ children }) => {
  useEffect(() => {
    // Initialize unified analytics
    analytics.initialize();

    // Initialize logging on mount
    logger.info('Application started', {
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    // Track route changes (for client-side navigation)
    const handleRouteChange = () => {
      const pageName = document.title || window.location.pathname;
      logger.logPageView(pageName);
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);

    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        logger.debug('Page became visible');
      } else {
        logger.debug('Page became hidden');
        // Flush logs when page becomes hidden
        logger.flush();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track online/offline status
    const handleOnline = () => {
      logger.info('Network status: online');
    };

    const handleOffline = () => {
      logger.warn('Network status: offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Performance observer for Core Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            logger.logPerformance('LargestContentfulPaint', lastEntry.startTime);
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        // First Input Delay
        const fidObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            const fidEntry = entry as PerformanceEntry & { processingStart?: number };
            if (fidEntry.processingStart) {
              logger.logPerformance('FirstInputDelay', fidEntry.processingStart - entry.startTime);
            }
          });
        });
        fidObserver.observe({ type: 'first-input', buffered: true });

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          let clsValue = 0;
          entries.forEach(entry => {
            const clsEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
            if (!clsEntry.hadRecentInput) {
              clsValue += clsEntry.value || 0;
            }
          });
          if (clsValue > 0) {
            logger.logPerformance('CumulativeLayoutShift', clsValue);
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (error) {
        logger.warn('Failed to initialize Core Web Vitals tracking', { error });
      }
    }

    // Cleanup function
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      // Flush logs on unmount
      logger.flush();
    };
  }, []);

  // Handle global keyboard shortcuts for debugging (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const handleKeydown = (event: KeyboardEvent) => {
        // Ctrl+Shift+L to show logs
        if (event.ctrlKey && event.shiftKey && event.key === 'L') {
          event.preventDefault();
          const logs = logger.getLogs();
          console.warn('🔍 Application Logs', logs);
        }
      };

      window.addEventListener('keydown', handleKeydown);
      return () => window.removeEventListener('keydown', handleKeydown);
    }
  }, []);

  return <>{children}</>;
};
