/**
 * performancePolyfill.test.ts - Comprehensive tests for Performance API polyfill
 *
 * Test Strategy: Verify polyfill provides compatible interface for React Native
 * without browser's performance API. Test that now() returns timestamps and
 * noop methods don't throw errors.
 *
 * Coverage Target: 100% of performancePolyfill.ts (60 lines)
 */

import { performance } from './performancePolyfill';

describe('performancePolyfill', () => {
  beforeAll(() => {
    // Use real timers - performance.now() requires real Date.now()
    jest.useRealTimers();
  });

  // ==========================================================================
  // now() Tests
  // ==========================================================================

  describe('now', () => {
    it('returns a number', () => {
      const result = performance.now();

      expect(typeof result).toBe('number');
    });

    it('returns a positive number', () => {
      const result = performance.now();

      expect(result).toBeGreaterThan(0);
    });

    it('returns a timestamp in milliseconds', () => {
      const result = performance.now();

      // Should be a reasonable timestamp (not too small, not too large)
      expect(result).toBeGreaterThan(1000000000000); // After 2001-09-09
      expect(result).toBeLessThan(2000000000000); // Before 2033-05-18
    });

    it('returns different values on subsequent calls', () => {
      const time1 = performance.now();
      const time2 = performance.now();

      // Second call should be >= first call (time progresses or is same if called instantly)
      expect(time2).toBeGreaterThanOrEqual(time1);
    });

    it('returns increasing timestamps over time', async () => {
      const time1 = performance.now();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      const time2 = performance.now();

      expect(time2).toBeGreaterThan(time1);
    });

    it('has reasonable precision for timing measurements', async () => {
      const start = performance.now();

      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 50));

      const end = performance.now();
      const duration = end - start;

      // Duration should be approximately 50ms (with some tolerance)
      expect(duration).toBeGreaterThanOrEqual(45);
      expect(duration).toBeLessThan(100);
    });

    it('can be used for performance measurements', () => {
      const start = performance.now();

      // Simulate CPU-bound work
      let sum = 0;
      for (let i = 0; i < 100000; i++) {
        sum += i;
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(sum).toBeGreaterThan(0); // Ensure work was done
    });

    it('returns consistent timestamp format', () => {
      const time1 = performance.now();
      const time2 = performance.now();

      // Both should be valid numbers
      expect(Number.isFinite(time1)).toBe(true);
      expect(Number.isFinite(time2)).toBe(true);
      expect(Number.isNaN(time1)).toBe(false);
      expect(Number.isNaN(time2)).toBe(false);
    });

    it('can measure very short durations', () => {
      const start = performance.now();
      // No delay - immediate measurement
      const end = performance.now();

      const duration = end - start;

      // Duration should be 0 or very small
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(10);
    });
  });

  // ==========================================================================
  // mark() Tests (Noop Implementation)
  // ==========================================================================

  describe('mark', () => {
    it('does not throw when called', () => {
      expect(() => performance.mark('test-mark')).not.toThrow();
    });

    it('accepts any string as mark name', () => {
      expect(() => performance.mark('mark1')).not.toThrow();
      expect(() => performance.mark('another-mark')).not.toThrow();
      expect(() => performance.mark('mark_with_underscore')).not.toThrow();
    });

    it('accepts empty string as mark name', () => {
      expect(() => performance.mark('')).not.toThrow();
    });

    it('accepts long mark names', () => {
      const longName = 'a'.repeat(1000);
      expect(() => performance.mark(longName)).not.toThrow();
    });

    it('accepts mark names with special characters', () => {
      expect(() => performance.mark('mark:with:colons')).not.toThrow();
      expect(() => performance.mark('mark.with.dots')).not.toThrow();
      expect(() => performance.mark('mark-with-dashes')).not.toThrow();
    });

    it('can be called multiple times with same name', () => {
      expect(() => {
        performance.mark('repeated');
        performance.mark('repeated');
        performance.mark('repeated');
      }).not.toThrow();
    });

    it('can be called many times in sequence', () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          performance.mark(`mark-${i}`);
        }
      }).not.toThrow();
    });

    it('returns undefined (noop)', () => {
      const result = performance.mark('test');
      expect(result).toBeUndefined();
    });
  });

  // ==========================================================================
  // measure() Tests (Noop Implementation)
  // ==========================================================================

  describe('measure', () => {
    it('does not throw when called with name only', () => {
      expect(() => performance.measure('test-measure')).not.toThrow();
    });

    it('does not throw when called with name and startMark', () => {
      expect(() => performance.measure('test-measure', 'start-mark')).not.toThrow();
    });

    it('does not throw when called with name, startMark, and endMark', () => {
      expect(() => performance.measure('test-measure', 'start-mark', 'end-mark')).not.toThrow();
    });

    it('accepts any string as measure name', () => {
      expect(() => performance.measure('measure1')).not.toThrow();
      expect(() => performance.measure('another-measure')).not.toThrow();
    });

    it('accepts empty strings', () => {
      expect(() => performance.measure('', '', '')).not.toThrow();
    });

    it('accepts undefined for optional parameters', () => {
      expect(() => performance.measure('test', undefined, undefined)).not.toThrow();
    });

    it('can be called multiple times', () => {
      expect(() => {
        performance.measure('measure1');
        performance.measure('measure2', 'start');
        performance.measure('measure3', 'start', 'end');
      }).not.toThrow();
    });

    it('returns undefined (noop)', () => {
      const result = performance.measure('test');
      expect(result).toBeUndefined();
    });
  });

  // ==========================================================================
  // clearMarks() Tests (Noop Implementation)
  // ==========================================================================

  describe('clearMarks', () => {
    it('does not throw when called without arguments', () => {
      expect(() => performance.clearMarks()).not.toThrow();
    });

    it('does not throw when called with mark name', () => {
      expect(() => performance.clearMarks('test-mark')).not.toThrow();
    });

    it('accepts any string as mark name', () => {
      expect(() => performance.clearMarks('mark1')).not.toThrow();
      expect(() => performance.clearMarks('another-mark')).not.toThrow();
    });

    it('accepts empty string', () => {
      expect(() => performance.clearMarks('')).not.toThrow();
    });

    it('can be called multiple times', () => {
      expect(() => {
        performance.clearMarks();
        performance.clearMarks('mark1');
        performance.clearMarks('mark2');
      }).not.toThrow();
    });

    it('returns undefined (noop)', () => {
      const result = performance.clearMarks();
      expect(result).toBeUndefined();
    });
  });

  // ==========================================================================
  // clearMeasures() Tests (Noop Implementation)
  // ==========================================================================

  describe('clearMeasures', () => {
    it('does not throw when called without arguments', () => {
      expect(() => performance.clearMeasures()).not.toThrow();
    });

    it('does not throw when called with measure name', () => {
      expect(() => performance.clearMeasures('test-measure')).not.toThrow();
    });

    it('accepts any string as measure name', () => {
      expect(() => performance.clearMeasures('measure1')).not.toThrow();
      expect(() => performance.clearMeasures('another-measure')).not.toThrow();
    });

    it('accepts empty string', () => {
      expect(() => performance.clearMeasures('')).not.toThrow();
    });

    it('can be called multiple times', () => {
      expect(() => {
        performance.clearMeasures();
        performance.clearMeasures('measure1');
        performance.clearMeasures('measure2');
      }).not.toThrow();
    });

    it('returns undefined (noop)', () => {
      const result = performance.clearMeasures();
      expect(result).toBeUndefined();
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('supports typical performance measurement workflow', () => {
      expect(() => {
        performance.mark('start');
        // Simulate work
        const start = performance.now();
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        const end = performance.now();
        performance.mark('end');
        performance.measure('operation', 'start', 'end');

        expect(end - start).toBeGreaterThanOrEqual(0);
        expect(sum).toBeGreaterThan(0);
      }).not.toThrow();
    });

    it('supports multiple concurrent measurements', () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        performance.mark(`start-${i}`);
        const start = performance.now();

        // Simulate varying work
        let sum = 0;
        for (let j = 0; j < i * 100; j++) {
          sum += j;
        }

        const end = performance.now();
        performance.mark(`end-${i}`);
        performance.measure(`operation-${i}`, `start-${i}`, `end-${i}`);

        measurements.push(end - start);
      }

      // All measurements should be valid
      measurements.forEach(duration => {
        expect(duration).toBeGreaterThanOrEqual(0);
      });
    });

    it('can clear marks and measures without errors', () => {
      expect(() => {
        performance.mark('mark1');
        performance.mark('mark2');
        performance.measure('measure1', 'mark1', 'mark2');

        performance.clearMarks('mark1');
        performance.clearMeasures('measure1');
        performance.clearMarks();
        performance.clearMeasures();
      }).not.toThrow();
    });

    it('now() works independently of mark/measure calls', () => {
      performance.mark('test');
      const time1 = performance.now();

      performance.measure('test-measure');
      const time2 = performance.now();

      performance.clearMarks();
      const time3 = performance.now();

      expect(time2).toBeGreaterThanOrEqual(time1);
      expect(time3).toBeGreaterThanOrEqual(time2);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('handles rapid sequential now() calls', () => {
      const times = [];
      for (let i = 0; i < 1000; i++) {
        times.push(performance.now());
      }

      // All times should be valid and monotonically increasing (or equal)
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
      }
    });

    it('handles mark/measure with unicode characters', () => {
      expect(() => {
        performance.mark('测试-mark-🚀');
        performance.measure('测试-measure-🚀', '测试-mark-🚀');
      }).not.toThrow();
    });

    it('handles mark/measure with very long names', () => {
      const longName = 'a'.repeat(10000);
      expect(() => {
        performance.mark(longName);
        performance.measure(longName);
        performance.clearMarks(longName);
        performance.clearMeasures(longName);
      }).not.toThrow();
    });

    it('handles mark/measure with special characters', () => {
      const specialNames = [
        'mark:with:colons',
        'mark.with.dots',
        'mark-with-dashes',
        'mark_with_underscores',
        'mark/with/slashes',
        'mark\\with\\backslashes',
        'mark with spaces',
      ];

      specialNames.forEach(name => {
        expect(() => {
          performance.mark(name);
          performance.measure(name);
          performance.clearMarks(name);
          performance.clearMeasures(name);
        }).not.toThrow();
      });
    });

    it('now() is not affected by mark/measure/clear operations', () => {
      const time1 = performance.now();

      performance.mark('test');
      performance.measure('test');
      performance.clearMarks();
      performance.clearMeasures();

      const time2 = performance.now();

      expect(time2).toBeGreaterThanOrEqual(time1);
    });
  });

  // ==========================================================================
  // Performance Polyfill Object Tests
  // ==========================================================================

  describe('performance object', () => {
    it('has all required methods', () => {
      expect(performance).toHaveProperty('now');
      expect(performance).toHaveProperty('mark');
      expect(performance).toHaveProperty('measure');
      expect(performance).toHaveProperty('clearMarks');
      expect(performance).toHaveProperty('clearMeasures');
    });

    it('all methods are functions', () => {
      expect(typeof performance.now).toBe('function');
      expect(typeof performance.mark).toBe('function');
      expect(typeof performance.measure).toBe('function');
      expect(typeof performance.clearMarks).toBe('function');
      expect(typeof performance.clearMeasures).toBe('function');
    });

    it('is a valid PerformancePolyfill object', () => {
      // Should match the interface
      expect(performance).toBeDefined();
      expect(performance.now).toBeDefined();
      expect(performance.mark).toBeDefined();
      expect(performance.measure).toBeDefined();
      expect(performance.clearMarks).toBeDefined();
      expect(performance.clearMeasures).toBeDefined();
    });
  });
});
