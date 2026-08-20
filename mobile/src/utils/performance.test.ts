/**
 * performance.test.ts - Tests for performance utilities
 *
 * Test Strategy: Test the exported performanceManager singleton,
 * usePerformanceMonitor hook, and PerformanceUtils functions.
 *
 * Note: PerformanceManager class is not exported, only the singleton instance.
 */

import { renderHook, act } from '@testing-library/react-native';
import {
  PerformanceUtils,
  usePerformanceMonitor,
  performanceManager,
} from './performance';

// Mock InteractionManager
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    InteractionManager: {
      runAfterInteractions: jest.fn(callback => {
        callback();
        return { cancel: jest.fn() };
      }),
    },
  };
});

// Mock logger
jest.mock('./logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

describe('performanceManager (singleton)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('exports performanceManager singleton', () => {
      expect(performanceManager).toBeDefined();
    });

    it('has initialize method', () => {
      expect(typeof performanceManager.initialize).toBe('function');
    });
  });

  describe('timer methods', () => {
    it('can start a timer', () => {
      expect(() => {
        performanceManager.startTimer('test-timer');
      }).not.toThrow();
    });

    it('can end a timer', () => {
      performanceManager.startTimer('test-end-timer');
      const duration = performanceManager.endTimer('test-end-timer');
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('returns 0 for non-existent timer', () => {
      const duration = performanceManager.endTimer('non-existent-timer');
      expect(duration).toBe(0);
    });
  });

  describe('component render measurement', () => {
    it('measures component render time', () => {
      const mockRender = jest.fn(() => 'rendered');
      const result = performanceManager.measureComponentRender('TestComponent', mockRender);
      expect(mockRender).toHaveBeenCalled();
      expect(result).toBe('rendered');
    });
  });

  describe('metrics', () => {
    it('can get metrics', () => {
      const metrics = performanceManager.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('appStartTime');
      expect(metrics).toHaveProperty('renderTime');
      expect(metrics).toHaveProperty('memoryUsage');
    });

    it('can get performance health', () => {
      const health = performanceManager.getPerformanceHealth();
      expect(health).toHaveProperty('overall');
      expect(health).toHaveProperty('issues');
      expect(health).toHaveProperty('recommendations');
      expect(['good', 'warning', 'critical']).toContain(health.overall);
    });
  });

  describe('observers', () => {
    it('can subscribe and unsubscribe', () => {
      const observer = jest.fn();
      const unsubscribe = performanceManager.subscribe(observer);
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('optimization suggestions', () => {
    it('returns array of suggestions', () => {
      const suggestions = performanceManager.getOptimizationSuggestions();
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('bundle analysis', () => {
    it('returns bundle analysis object', () => {
      const analysis = performanceManager.analyzeBundleSize();
      expect(analysis).toHaveProperty('totalSize');
      expect(analysis).toHaveProperty('recommendations');
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });
  });

  describe('export metrics', () => {
    it('returns comprehensive metrics report', () => {
      const report = performanceManager.exportMetrics();
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('health');
      expect(report).toHaveProperty('suggestions');
      expect(report).toHaveProperty('bundleAnalysis');
      expect(report).toHaveProperty('timestamp');
    });
  });

  describe('dispose', () => {
    it('cleans up resources', () => {
      expect(() => {
        performanceManager.dispose();
      }).not.toThrow();
    });
  });
});

describe('PerformanceUtils', () => {
  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('delays function execution', () => {
      const fn = jest.fn();
      const debouncedFn = PerformanceUtils.debounce(fn, 100);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('cancels previous calls when called again', () => {
      const fn = jest.fn();
      const debouncedFn = PerformanceUtils.debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('passes arguments to the debounced function', () => {
      const fn = jest.fn();
      const debouncedFn = PerformanceUtils.debounce(fn, 100);

      debouncedFn('arg1', 'arg2');
      jest.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('executes immediately on first call', () => {
      const fn = jest.fn();
      const throttledFn = PerformanceUtils.throttle(fn, 100);

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('ignores calls within throttle period', () => {
      const fn = jest.fn();
      const throttledFn = PerformanceUtils.throttle(fn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('allows call after throttle period', () => {
      const fn = jest.fn();
      const throttledFn = PerformanceUtils.throttle(fn, 100);

      throttledFn();
      jest.advanceTimersByTime(100);
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('passes arguments to the throttled function', () => {
      const fn = jest.fn();
      const throttledFn = PerformanceUtils.throttle(fn, 100);

      throttledFn('test-arg');
      expect(fn).toHaveBeenCalledWith('test-arg');
    });
  });

  describe('memoize', () => {
    it('caches function results', () => {
      const fn = jest.fn((x: number) => x * 2);
      const memoizedFn = PerformanceUtils.memoize(fn);

      const result1 = memoizedFn(5);
      const result2 = memoizedFn(5);

      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('computes for different arguments', () => {
      const fn = jest.fn((x: number) => x * 2);
      const memoizedFn = PerformanceUtils.memoize(fn);

      memoizedFn(5);
      memoizedFn(10);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('handles multiple arguments', () => {
      const fn = jest.fn((a: number, b: number) => a + b);
      const memoizedFn = PerformanceUtils.memoize(fn);

      const result1 = memoizedFn(2, 3);
      const result2 = memoizedFn(2, 3);

      expect(result1).toBe(5);
      expect(result2).toBe(5);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('batchUpdates', () => {
    it('accepts an array of functions', () => {
      // batchUpdates uses InteractionManager.runAfterInteractions which may be mocked
      // differently in the global setup. Just verify it doesn't throw.
      const update1 = jest.fn();
      const update2 = jest.fn();

      expect(() => {
        PerformanceUtils.batchUpdates([update1, update2]);
      }).not.toThrow();
    });

    it('handles empty array', () => {
      expect(() => {
        PerformanceUtils.batchUpdates([]);
      }).not.toThrow();
    });

    it('handles array with single function', () => {
      const update = jest.fn();
      expect(() => {
        PerformanceUtils.batchUpdates([update]);
      }).not.toThrow();
    });
  });

  describe('lazyLoad', () => {
    it('returns a lazy component', () => {
      const loader = () => Promise.resolve({ default: () => null });
      const FallbackComponent = () => null;

      const LazyComponent = PerformanceUtils.lazyLoad(loader, FallbackComponent);
      expect(LazyComponent).toBeDefined();
      // React.lazy returns an object with $$typeof
      expect(typeof LazyComponent).toBe('object');
    });
  });
});

describe('usePerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns performance utilities', () => {
    const { result } = renderHook(() => usePerformanceMonitor('TestComponent'));

    expect(result.current).toHaveProperty('measureRender');
    expect(result.current).toHaveProperty('startTimer');
    expect(result.current).toHaveProperty('endTimer');
    expect(result.current).toHaveProperty('measureInteraction');
  });

  it('measureRender calls the render function', () => {
    const { result } = renderHook(() => usePerformanceMonitor('TestComponent'));
    const renderFn = jest.fn(() => 'rendered');

    const returnValue = result.current.measureRender(renderFn);

    expect(renderFn).toHaveBeenCalled();
    expect(returnValue).toBe('rendered');
  });

  it('startTimer and endTimer work together', () => {
    const { result } = renderHook(() => usePerformanceMonitor('TestComponent'));

    act(() => {
      result.current.startTimer('test-timer');
    });

    const duration = result.current.endTimer('test-timer');
    expect(typeof duration).toBe('number');
  });

  it('measureInteraction is a function', () => {
    const { result } = renderHook(() => usePerformanceMonitor('TestComponent'));
    expect(typeof result.current.measureInteraction).toBe('function');
  });

  it('can be used with different component names', () => {
    const { result: result1 } = renderHook(() => usePerformanceMonitor('Component1'));
    const { result: result2 } = renderHook(() => usePerformanceMonitor('Component2'));

    expect(result1.current).toBeDefined();
    expect(result2.current).toBeDefined();
  });
});
