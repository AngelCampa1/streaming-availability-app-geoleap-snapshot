'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { onCLS, onFCP, onINP, onLCP, onTTFB, Metric } from 'web-vitals';

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

interface CoreWebVitalsMonitorProps {
  onMetric?: (metric: WebVitalMetric) => void;
  reportingEnabled?: boolean;
  className?: string;
}

/**
 * Core Web Vitals monitoring component
 * Tracks and reports Core Web Vitals metrics for performance optimization
 */
export function CoreWebVitalsMonitor({ onMetric, reportingEnabled = true, className = '' }: CoreWebVitalsMonitorProps) {
  const [metrics, setMetrics] = useState<WebVitalMetric[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const reportedMetrics = useRef(new Set<string>());
  const maxMetrics = 5; // Limit metrics to prevent memory bloat

  const handleMetric = useCallback(
    (metric: Metric) => {
      const webVitalMetric: WebVitalMetric = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
      };

      // Avoid duplicate reporting
      const metricKey = `${metric.name}-${metric.id}`;
      if (reportedMetrics.current.has(metricKey)) {
        return;
      }
      reportedMetrics.current.add(metricKey);

      setMetrics(prev => {
        const existing = prev.findIndex(m => m.name === metric.name);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = webVitalMetric;
          return updated;
        }

        // Prevent memory bloat by limiting metrics array size
        const newMetrics = [...prev, webVitalMetric];
        if (newMetrics.length > maxMetrics) {
          return newMetrics.slice(-maxMetrics);
        }
        return newMetrics;
      });

      // Report to analytics if enabled
      if (reportingEnabled && onMetric) {
        onMetric(webVitalMetric);
      }

      // Report to external analytics
      if (reportingEnabled) {
        reportToAnalytics(webVitalMetric);
      }
    },
    [onMetric, reportingEnabled, maxMetrics]
  );

  useEffect(() => {
    // Only initialize web vitals in browser environment
    if (typeof window === 'undefined') return;

    // Measure Core Web Vitals
    onCLS(handleMetric);
    onFCP(handleMetric);
    onINP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);

    // Cleanup function to prevent memory leaks
    return () => {
      // Clear reported metrics periodically to prevent Set from growing indefinitely
      if (reportedMetrics.current.size > 100) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        reportedMetrics.current.clear();
      }
    };
  }, [handleMetric]);

  // Development mode - show metrics panel
  useEffect(() => {
    const showMetrics =
      process.env.NODE_ENV === 'development' ||
      (typeof window !== 'undefined' && window.location.search.includes('debug=vitals'));
    setIsVisible(showMetrics);
  }, []);

  if (!isVisible || metrics.length === 0) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className="bg-background/95 backdrop-blur border border-border rounded-lg p-4 shadow-lg max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Core Web Vitals</h3>
          <button onClick={() => setIsVisible(false)} className="text-foreground-muted hover:text-foreground text-xs">
            ✕
          </button>
        </div>
        <div className="space-y-2">
          {metrics.map(metric => (
            <MetricDisplay key={metric.name} metric={metric} />
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-foreground-muted">Dev mode • Metrics auto-reported</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual metric display component
 */
function MetricDisplay({ metric }: { metric: WebVitalMetric }) {
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'text-success';
      case 'needs-improvement':
        return 'text-warning';
      case 'poor':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatValue = (name: string, value: number) => {
    switch (name) {
      case 'CLS':
        return value.toFixed(3);
      case 'FCP':
      case 'LCP':
      case 'FID':
      case 'TTFB':
        return `${Math.round(value)}ms`;
      default:
        return Math.round(value).toString();
    }
  };

  const getMetricDescription = (name: string) => {
    switch (name) {
      case 'CLS':
        return 'Cumulative Layout Shift';
      case 'FCP':
        return 'First Contentful Paint';
      case 'LCP':
        return 'Largest Contentful Paint';
      case 'FID':
        return 'First Input Delay';
      case 'TTFB':
        return 'Time to First Byte';
      default:
        return name;
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-foreground">{metric.name}</div>
        <div className="text-xs text-foreground-muted">{getMetricDescription(metric.name)}</div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-semibold ${getRatingColor(metric.rating)}`}>
          {formatValue(metric.name, metric.value)}
        </div>
        <div className="text-xs text-foreground-muted capitalize">{metric.rating}</div>
      </div>
    </div>
  );
}

/**
 * Report metrics to analytics services
 */
function reportToAnalytics(metric: WebVitalMetric) {
  // Report to Google Analytics 4 if available
  if (
    typeof window !== 'undefined' &&
    'gtag' in window &&
    typeof (window as { gtag?: (...args: unknown[]) => void }).gtag === 'function'
  ) {
    const gtag = (window as { gtag: (...args: unknown[]) => void }).gtag;
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      custom_map: {
        metric_rating: metric.rating,
      },
    });
  }

  // Web Vitals are automatically captured by Sentry's browserTracingIntegration

  // Report to custom analytics endpoint with error handling and request throttling
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    // Throttle requests to prevent excessive API calls
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'web-vitals',
        metric: {
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          id: metric.id,
        }, // Send only essential data to reduce payload
        url: window.location.pathname, // Use pathname instead of full href
        timestamp: Date.now(),
      }),
      signal: controller.signal,
    })
      .catch(error => {
        if (error.name !== 'AbortError') {
          console.warn('Failed to report web vitals:', error);
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });
  }
}

/**
 * Hook for programmatic web vitals tracking
 */
export function useWebVitals(onMetric?: (metric: WebVitalMetric) => void) {
  useEffect(() => {
    const handleMetric = (metric: Metric) => {
      const webVitalMetric: WebVitalMetric = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
      };

      if (onMetric) {
        onMetric(webVitalMetric);
      }

      reportToAnalytics(webVitalMetric);
    };

    onCLS(handleMetric);
    onFCP(handleMetric);
    onINP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
  }, [onMetric]);
}

/**
 * Performance budget checker
 */
export function usePerformanceBudget() {
  const [budgetStatus, setBudgetStatus] = useState<{
    lcp: boolean;
    fcp: boolean;
    cls: boolean;
    fid: boolean;
  }>({
    lcp: true,
    fcp: true,
    cls: true,
    fid: true,
  });

  const checkBudget = useCallback((metric: WebVitalMetric) => {
    const budgets = {
      LCP: 2500, // 2.5s
      FCP: 1800, // 1.8s
      CLS: 0.1, // 0.1
      FID: 100, // 100ms
    };

    if (metric.name in budgets) {
      const budget = budgets[metric.name as keyof typeof budgets];
      const isWithinBudget = metric.value <= budget;

      setBudgetStatus(prev => ({
        ...prev,
        [metric.name.toLowerCase()]: isWithinBudget,
      }));

      // Alert in development if budget exceeded
      if (process.env.NODE_ENV === 'development' && !isWithinBudget) {
        console.warn(`⚠️ Performance Budget Exceeded: ${metric.name} = ${metric.value} (budget: ${budget})`);
      }
    }
  }, []);

  useWebVitals(checkBudget);

  return budgetStatus;
}

/**
 * Performance insights component
 */
export function PerformanceInsights() {
  const [insights, setInsights] = useState<string[]>([]);
  const budgetStatus = usePerformanceBudget();

  useEffect(() => {
    const newInsights: string[] = [];

    if (!budgetStatus.lcp) {
      newInsights.push(
        'Consider optimizing largest contentful paint (LCP) by optimizing images and removing render-blocking resources.'
      );
    }

    if (!budgetStatus.fcp) {
      newInsights.push(
        'Improve first contentful paint (FCP) by reducing server response times and eliminating render-blocking CSS.'
      );
    }

    if (!budgetStatus.cls) {
      newInsights.push('Reduce cumulative layout shift (CLS) by setting explicit dimensions for images and ads.');
    }

    if (!budgetStatus.fid) {
      newInsights.push(
        'Optimize first input delay (FID) by reducing JavaScript execution time and breaking up long tasks.'
      );
    }

    setInsights(newInsights);
  }, [budgetStatus]);

  if (insights.length === 0 || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 max-w-md bg-warning/10 border border-warning/20 rounded-lg p-4 shadow-lg">
      <h3 className="text-sm font-semibold text-warning mb-2">Performance Insights</h3>
      <ul className="space-y-1 text-xs text-warning">
        {insights.map((insight, index) => (
          <li key={index} className="flex items-start">
            <span className="mr-2">💡</span>
            <span>{insight}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
