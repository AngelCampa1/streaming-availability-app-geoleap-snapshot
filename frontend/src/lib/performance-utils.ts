import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { debounce, throttle } from 'lodash';
import { logger } from './logger';

/**
 * Custom hook for debounced values
 */
export function useDebounce<T>(value: T, delay: number, deps?: React.DependencyList): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(
    () => {
      const timer = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(timer);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps ? [value, delay, ...deps] : [value, delay]
  );

  return debouncedValue;
}

/**
 * Custom hook for debounced callbacks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList
): T {
  const debouncedRef = useRef<ReturnType<typeof debounce> | null>(null);

  useEffect(() => {
    debouncedRef.current = debounce(callback, delay);
    return () => {
      debouncedRef.current?.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);

  return useCallback(
    ((...args: Parameters<T>) => debouncedRef.current?.(...args)) as T,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps, delay]
  );
}

/**
 * Custom hook for throttled callbacks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList
): T {
  const throttledRef = useRef<ReturnType<typeof throttle> | null>(null);

  useEffect(() => {
    throttledRef.current = throttle(callback, delay, { leading: true, trailing: true });
    return () => {
      throttledRef.current?.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);

  return useCallback(
    ((...args: Parameters<T>) => throttledRef.current?.(...args)) as T,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps, delay]
  );
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start measuring performance for a given operation
   */
  startMeasure(name: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-start`);
    }
    this.metrics.set(name, Date.now());
  }

  /**
   * End measuring performance and log the result
   */
  endMeasure(name: string): number {
    const startTime = this.metrics.get(name);
    if (!startTime) {
      console.warn(`No start time found for measurement: ${name}`);
      return 0;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-end`);
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (error) {
        // Marks might have been cleared
        console.warn(`Could not measure ${name}:`, error);
      }
    }

    this.metrics.delete(name);

    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration}ms`);
    }

    return duration;
  }

  /**
   * Measure the execution time of an async function
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasure(name);
    try {
      const result = await fn();
      return result;
    } finally {
      this.endMeasure(name);
    }
  }
}

/**
 * Hook to use performance monitoring
 */
export function usePerformanceMonitor() {
  return PerformanceMonitor.getInstance();
}

/**
 * Request deduplication utility
 */
export class RequestDeduplicator<T> {
  private pendingRequests: Map<string, Promise<T>> = new Map();

  /**
   * Execute a request with deduplication
   */
  async execute(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Check if request is already pending
    const pendingRequest = this.pendingRequests.get(key);
    if (pendingRequest) {
      return pendingRequest;
    }

    // Create new request
    const request = requestFn().finally(() => {
      // Clean up after completion
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, request);
    return request;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Clear specific request
   */
  clearRequest(key: string): void {
    this.pendingRequests.delete(key);
  }
}

/**
 * Memory usage monitoring (for development)
 */
export class MemoryMonitor {
  private static logInterval: NodeJS.Timeout | null = null;

  static startMonitoring(intervalMs: number = 10000): void {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return;
    }

    this.logInterval = setInterval(() => {
      if (
        'memory' in
        (performance as Performance & {
          memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
        })
      ) {
        const memory = (
          performance as Performance & {
            memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
          }
        ).memory;
        logger.debug('[PerformanceUtils] Memory usage', {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB',
        });

        // Warn if memory usage is high
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usagePercent > 80) {
          console.warn(`High memory usage: ${Math.round(usagePercent)}%`);
        }
      }
    }, intervalMs);
  }

  static stopMonitoring(): void {
    if (this.logInterval) {
      clearInterval(this.logInterval);
      this.logInterval = null;
    }
  }
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
) {
  const observer = useRef<IntersectionObserver | null>(null);

  // Stabilize options to prevent unnecessary recreations from inline object literals
  const stableOptions = useMemo(
    () => options,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options?.threshold, options?.rootMargin, options?.root]
  );

  const observe = useCallback(
    (element: Element) => {
      if (observer.current) {
        observer.current.disconnect();
      }

      observer.current = new IntersectionObserver(callback, {
        threshold: 0.1,
        rootMargin: '50px',
        ...stableOptions,
      });

      observer.current.observe(element);
    },
    [callback, stableOptions]
  );

  const disconnect = useCallback(() => {
    if (observer.current) {
      observer.current.disconnect();
    }
  }, []);

  return { observe, disconnect };
}
