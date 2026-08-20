/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

/**
 * Performance monitoring and optimization utilities for search
 */

import { logger } from '@/lib/logger';

// BUG-015 FIX: Track if search performance monitoring is already active
let searchPerformanceActive = false;

/**
 * Monitor Core Web Vitals for search page
 * BUG-015 FIX: Added deduplication to prevent multiple observer instances
 */
export function monitorSearchPerformance(): void {
  if (typeof window === 'undefined') return;

  // BUG-015 FIX: Prevent duplicate observers
  if (searchPerformanceActive) return;
  searchPerformanceActive = true;

  // Performance observer for LCP - only log in development and once
  if (process.env.NODE_ENV === 'development') {
    try {
      let lcpLogged = false;
      const observer = new PerformanceObserver(list => {
        if (lcpLogged) return;
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];

        if ('renderTime' in lastEntry && lastEntry.renderTime) {
          lcpLogged = true;
          logger.debug('[Search Performance] LCP', { renderTime: lastEntry.renderTime });
        }
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_e) {
      // Performance API not supported
    }

    // Monitor FCP - only log once
    try {
      let fcpLogged = false;
      const observer = new PerformanceObserver(list => {
        if (fcpLogged) return;
        const entries = list.getEntries();
        const firstPaint = entries.find(e => e.name === 'first-contentful-paint');
        if (firstPaint) {
          fcpLogged = true;
          logger.debug('[Search Performance] FCP', { startTime: firstPaint.startTime });
        }
      });

      observer.observe({ type: 'paint', buffered: true });
    } catch (_e) {
      // Performance API not supported
    }
  }
}

/**
 * Report search performance metrics
 */
export function reportSearchMetrics(query: string, loadTime: number): void {
  if (typeof window === 'undefined') return;

  // Log for debugging
  logger.info('[Search Performance] Metrics reported', {
    query,
    loadTime,
    timestamp: new Date().toISOString(),
  });

  // Send to analytics (implement based on your analytics solution)
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'search_performance', {
      query_length: query.length,
      load_time: loadTime,
    });
  }
}

/**
 * Optimize images for search results
 */
export function getOptimizedImageUrl(url: string, width: number = 200, quality: number = 75): string {
  // Use Next.js Image Optimization API if available
  if (url.startsWith('/')) {
    return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
  }

  // For external images, return as-is (consider using a CDN proxy)
  return url;
}

/**
 * Debounce search input for better performance
 */
export function createSearchDebouncer(delay: number = 300) {
  let timeoutId: NodeJS.Timeout | null = null;

  return (callback: () => void) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      callback();
      timeoutId = null;
    }, delay);
  };
}

/**
 * Request deduplication for concurrent search requests
 */
const pendingRequests = new Map<string, Promise<any>>();

export function deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  // Check if request is already pending
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  // Create new request
  const promise = requestFn().finally(() => {
    // Clean up after request completes
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Measure and log component render time
 */
export function measureRenderTime(componentName: string): () => void {
  const startTime = performance.now();

  return () => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    if (renderTime > 16) {
      // Longer than 16ms (one frame)
      console.warn(`[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms`);
    }
  };
}

/**
 * Virtualization helper for long lists
 */
export function calculateVisibleRange(
  scrollTop: number,
  itemHeight: number,
  containerHeight: number,
  totalItems: number,
  overscan: number = 3
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(totalItems, start + visibleCount + overscan * 2);

  return { start, end };
}

declare global {
  interface Window {
    gtag?: (command: string, action: string, parameters?: Record<string, any>) => void;
  }
}
