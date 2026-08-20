/**
 * Performance API Polyfill for React Native
 *
 * React Native doesn't have the browser's performance API by default.
 * This polyfill provides a compatible interface using Date.now() for timing.
 *
 * Note: Date.now() is less precise than performance.now() but adequate
 * for performance monitoring in mobile apps.
 */

export interface PerformancePolyfill {
  now(): number;
  mark(name: string): void;
  measure(name: string, startMark?: string, endMark?: string): void;
  clearMarks(name?: string): void;
  clearMeasures(name?: string): void;
}

export const performance: PerformancePolyfill = {
  /**
   * Returns high-resolution timestamp in milliseconds
   * Uses Date.now() as fallback for React Native
   */
  now: (): number => Date.now(),

  /**
   * Creates a named timestamp mark
   * Noop in this polyfill - marks are not stored
   */
  mark: (_name: string): void => {
    // Noop - could implement storage if needed
  },

  /**
   * Measures time between two marks
   * Noop in this polyfill - measures are not stored
   */
  measure: (_name: string, _startMark?: string, _endMark?: string): void => {
    // Noop - could implement storage if needed
  },

  /**
   * Clears performance marks
   * Noop in this polyfill
   */
  clearMarks: (_name?: string): void => {
    // Noop - no marks stored
  },

  /**
   * Clears performance measures
   * Noop in this polyfill
   */
  clearMeasures: (_name?: string): void => {
    // Noop - no measures stored
  },
};

export default performance;
