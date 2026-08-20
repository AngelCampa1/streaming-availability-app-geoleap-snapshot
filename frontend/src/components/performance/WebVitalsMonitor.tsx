'use client';

import { useEffect } from 'react';
import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { logger } from '@/lib/logger';

interface WebVitalsData {
  name: string;
  value: number;
  id: string;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
}

// Thresholds for Core Web Vitals (based on Google recommendations)
const VITALS_THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
} as const;

function getRating(name: keyof typeof VITALS_THRESHOLDS, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = VITALS_THRESHOLDS[name];
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

// BUG-015 FIX: Track which metrics have been reported to avoid duplicates
const reportedMetrics = new Set<string>();

function sendToAnalytics({ name, value, id, rating, delta }: WebVitalsData) {
  // BUG-015 FIX: Deduplicate metric reporting - only report each metric ID once
  const metricKey = `${name}_${id}`;
  if (reportedMetrics.has(metricKey)) {
    return; // Skip duplicate report
  }
  reportedMetrics.add(metricKey);

  // Limit set size to prevent memory leak
  if (reportedMetrics.size > 100) {
    const firstKey = reportedMetrics.values().next().value;
    if (firstKey) reportedMetrics.delete(firstKey);
  }

  // BUG-015 FIX: Single consolidated log entry instead of two separate calls
  logger.info(`WebVital_${name}`, {
    name: `WebVital_${name}`,
    value,
    id,
    rating,
    delta: delta.toString(),
    timestamp: Date.now().toString(),
    isGood: rating === 'good',
    threshold: VITALS_THRESHOLDS[name as keyof typeof VITALS_THRESHOLDS],
  });

  // Send to Google Analytics if available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof window !== 'undefined' && typeof (window as any).gtag !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gtag('event', name, {
      event_category: 'Web Vitals',
      event_label: id,
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      custom_map: {
        metric_id: 'id',
        metric_value: 'value',
        metric_delta: 'delta',
        metric_rating: 'rating',
      },
    });
  }

  // Warn about poor performance in development
  if (process.env.NODE_ENV === 'development' && rating === 'poor') {
    console.warn(
      `🚨 Poor ${name} detected: ${value.toFixed(2)}${name === 'CLS' ? '' : 'ms'} (threshold: ${
        VITALS_THRESHOLDS[name as keyof typeof VITALS_THRESHOLDS].poor
      }${name === 'CLS' ? '' : 'ms'})`
    );
  }
}

function handleMetric(metric: Metric) {
  const data: WebVitalsData = {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    rating: getRating(metric.name as keyof typeof VITALS_THRESHOLDS, metric.value),
    delta: metric.delta,
  };

  sendToAnalytics(data);
}

export function WebVitalsMonitor() {
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    // Store observers for cleanup - defined outside try block for cleanup access
    const observers: PerformanceObserver[] = [];

    try {
      // Measure Core Web Vitals
      onCLS(handleMetric);
      onINP(handleMetric);
      onFCP(handleMetric);
      onLCP(handleMetric);
      onTTFB(handleMetric);

      // Additional performance monitoring
      const measureNavigationTiming = () => {
        if ('performance' in window && 'timing' in window.performance) {
          const timing = window.performance.timing;
          const navigation = window.performance.navigation;

          const metrics = {
            // Page Load Time
            loadTime: timing.loadEventEnd - timing.navigationStart,
            // Domain Lookup Time
            domainLookupTime: timing.domainLookupEnd - timing.domainLookupStart,
            // Server Response Time
            serverResponseTime: timing.responseEnd - timing.requestStart,
            // DOM Content Loaded Time
            domContentLoadedTime: timing.domContentLoadedEventEnd - timing.navigationStart,
            // First Byte Time
            firstByteTime: timing.responseStart - timing.navigationStart,
          };

          // Log navigation metrics
          logger.info('Performance Metric', {
            name: 'Navigation_LoadTime',
            average: metrics.loadTime,
            properties: {
              domainLookupTime: metrics.domainLookupTime.toString(),
              serverResponseTime: metrics.serverResponseTime.toString(),
              domContentLoadedTime: metrics.domContentLoadedTime.toString(),
              firstByteTime: metrics.firstByteTime.toString(),
              navigationType: navigation.type.toString(),
            },
          });

          // Warn about slow page loads in development
          if (process.env.NODE_ENV === 'development') {
            if (metrics.loadTime > 5000) {
              console.warn(`🐌 Slow page load: ${metrics.loadTime}ms`);
            }
            if (metrics.serverResponseTime > 1000) {
              console.warn(`🐌 Slow server response: ${metrics.serverResponseTime}ms`);
            }
          }
        }
      };

      // Measure navigation timing after load
      if (document.readyState === 'complete') {
        measureNavigationTiming();
      } else {
        window.addEventListener('load', measureNavigationTiming, { once: true });
      }

      // Measure resource loading performance
      const measureResourceTiming = () => {
        if ('performance' in window && 'getEntriesByType' in window.performance) {
          const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];

          // Analyze slow resources
          const slowResources = resources.filter(
            resource =>
              resource.duration > 1000 && // Resources taking more than 1 second
              !resource.name.includes('localhost') // Exclude local development resources
          );

          if (slowResources.length > 0 && process.env.NODE_ENV === 'development') {
            console.warn(
              '🐌 Slow resources detected:',
              slowResources.map(r => ({
                name: r.name,
                duration: Math.round(r.duration),
                size: r.transferSize || 'unknown',
              }))
            );
          }

          // Track average resource load time
          const avgResourceTime =
            resources.length > 0
              ? resources.reduce((sum, resource) => sum + resource.duration, 0) / resources.length
              : 0;

          logger.info('Performance Metric', {
            name: 'Resources_AverageLoadTime',
            average: avgResourceTime,
            properties: {
              resourceCount: resources.length.toString(),
              slowResourceCount: slowResources.length.toString(),
            },
          });
        }
      };

      // Measure resources after load
      setTimeout(measureResourceTiming, 2000);

      // Performance observer for additional insights
      if ('PerformanceObserver' in window) {
        try {
          // BUG-013 FIX: Throttle long task warnings to prevent console spam
          let lastLongTaskWarning = 0;
          const LONG_TASK_THROTTLE_MS = 5000; // Only warn every 5 seconds
          let longTaskCount = 0;

          // Observe long tasks (potential for improving FID)
          const longTaskObserver = new PerformanceObserver(list => {
            list.getEntries().forEach(entry => {
              if (entry.duration > 50) {
                longTaskCount++;
                const now = Date.now();
                // BUG-013 FIX: Only log significant long tasks (>100ms) and throttle warnings
                if (entry.duration > 100 && now - lastLongTaskWarning > LONG_TASK_THROTTLE_MS) {
                  lastLongTaskWarning = now;
                  logger.warn('Long task detected', {
                    duration: entry.duration,
                    startTime: entry.startTime,
                    name: entry.name || 'unknown',
                    totalLongTasks: longTaskCount,
                  });
                }
              }
            });
          });
          longTaskObserver.observe({ entryTypes: ['longtask'] });
          observers.push(longTaskObserver);

          // BUG-015 FIX: Track LCP to only log final value (LCP can fire multiple times)
          let lastLcpEntry: PerformanceEntry | null = null;

          // Observe largest contentful paint details
          const lcpObserver = new PerformanceObserver(list => {
            const entries = list.getEntries();
            // Only keep the last (most recent) LCP entry
            if (entries.length > 0) {
              lastLcpEntry = entries[entries.length - 1];
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          observers.push(lcpObserver);

          // BUG-015 FIX: Log LCP only once when page becomes hidden or after timeout
          const logFinalLcp = () => {
            if (lastLcpEntry && !reportedMetrics.has('lcp_detail')) {
              reportedMetrics.add('lcp_detail');
              const lcpEntry = lastLcpEntry as PerformanceEntry & {
                element?: HTMLElement;
                url?: string;
                size?: number;
              };
              logger.info('LCP element detected', {
                value: lcpEntry.startTime,
                element: lcpEntry.element?.tagName || 'unknown',
                url: lcpEntry.url || 'N/A',
                size: lcpEntry.size || 0,
              });
            }
          };

          // Log final LCP when page visibility changes or after 10 seconds
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
              logFinalLcp();
            }
          }, { once: true });
          setTimeout(logFinalLcp, 10000);
        } catch (error) {
          console.warn('PerformanceObserver not fully supported:', error);
        }
      }
    } catch (error) {
      console.warn('Web Vitals monitoring failed:', error);
      logger.logError('WebVitals monitoring error', { message: (error as Error).message });
    }

    // Cleanup function to disconnect all observers on unmount
    return () => {
      observers.forEach(observer => {
        try {
          observer.disconnect();
        } catch {
          // Ignore errors during cleanup
        }
      });
    };
  }, []);

  // This component doesn't render anything
  return null;
}

export default WebVitalsMonitor;
