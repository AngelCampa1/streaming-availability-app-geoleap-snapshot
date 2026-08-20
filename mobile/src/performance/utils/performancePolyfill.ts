/**
 * Performance API Polyfill for React Native
 * Provides performance.now() equivalent functionality and polyfill object
 */

// Performance polyfill object for React Native
export const performance = {
  now: (): number => Date.now(),
  mark: (_name: string): void => {
    // Noop - marks not implemented
  },
  measure: (_name: string, _startMark?: string, _endMark?: string): void => {
    // Noop - measures not implemented
  },
  clearMarks: (_name?: string): void => {
    // Noop
  },
  clearMeasures: (_name?: string): void => {
    // Noop
  },
  memory: undefined as {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | undefined,
};

/**
 * Get high-resolution timestamp in milliseconds
 * Falls back to Date.now() when performance.now() is not available
 */
export const performanceNow = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

/**
 * Check if the native performance API is available
 */
export const isPerformanceAvailable = (): boolean => {
  return typeof performance !== 'undefined' && typeof performance.now === 'function';
};

/**
 * Get performance memory info if available (V8 engines only)
 */
export const getPerformanceMemory = (): {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
} | null => {
  if (
    typeof performance !== 'undefined' &&
    performance.memory
  ) {
    return performance.memory;
  }
  return null;
};
