/**
 * MemoryLeakDetector - Test utility for detecting listener accumulation
 *
 * This utility helps identify memory leaks in React hooks and services by
 * tracking listener arrays and detecting unexpected growth over multiple
 * mount/unmount cycles.
 *
 * @example
 * ```typescript
 * import { MemoryLeakDetector } from '../utils/memoryLeakDetector';
 *
 * it('should not leak listeners after 100 mount/unmount cycles', () => {
 *   const detector = new MemoryLeakDetector();
 *   const service = new NetworkService();
 *
 *   // Record baseline before test
 *   detector.recordBaseline(service, 'connectionListeners');
 *
 *   // Perform 100 mount/unmount cycles
 *   for (let i = 0; i < 100; i++) {
 *     const { unmount } = renderHook(() => useNetworkStatus());
 *     unmount();
 *   }
 *
 *   // Assert no leaks
 *   detector.assertNoLeaks(service, ['connectionListeners']);
 * });
 * ```
 */
export class MemoryLeakDetector {
  private baselines = new Map<string, number>();

  /**
   * Record the baseline count for a listener array
   * @param obj The object containing the listener array
   * @param listenerArrayName The property name of the listener array
   */
  recordBaseline(obj: any, listenerArrayName: string): void {
    const count = this.getListenerCount(obj, listenerArrayName);
    this.baselines.set(listenerArrayName, count);
  }

  /**
   * Check if listeners have leaked beyond baseline
   * @param obj The object containing the listener array
   * @param listenerArrayName The property name of the listener array
   * @param tolerance Optional tolerance (default: 1 for test's own listener)
   * @returns true if leak detected, false otherwise
   */
  checkForLeaks(
    obj: any,
    listenerArrayName: string,
    tolerance: number = 1
  ): boolean {
    const baseline = this.baselines.get(listenerArrayName) || 0;
    const current = this.getListenerCount(obj, listenerArrayName);

    // Allow tolerance for test's own listener(s)
    return current > baseline + tolerance;
  }

  /**
   * Assert that no memory leaks exist for specified listener arrays
   * @param obj The object containing the listener arrays
   * @param arrayNames Array of listener array property names to check
   * @param tolerance Optional tolerance per array (default: 1)
   * @throws Error if any leaks are detected
   */
  assertNoLeaks(
    obj: any,
    arrayNames: string[],
    tolerance: number = 1
  ): void {
    const leaks: Array<{ name: string; baseline: number; current: number }> =
      [];

    for (const name of arrayNames) {
      if (this.checkForLeaks(obj, name, tolerance)) {
        const baseline = this.baselines.get(name) || 0;
        const current = this.getListenerCount(obj, name);
        leaks.push({ name, baseline, current });
      }
    }

    if (leaks.length > 0) {
      const leakMessages = leaks.map(
        leak =>
          `  - ${leak.name}: baseline=${leak.baseline}, current=${leak.current} (leaked ${leak.current - leak.baseline - tolerance})`
      );

      throw new Error(
        `Memory leaks detected in listener arrays:\n${leakMessages.join('\n')}\n\n` +
          `This indicates listeners are not being properly cleaned up on component unmount.`
      );
    }
  }

  /**
   * Get detailed report of listener counts
   * @param obj The object containing listener arrays
   * @param arrayNames Array of listener array property names
   * @returns Formatted report string
   */
  getReport(obj: any, arrayNames: string[]): string {
    const lines: string[] = ['Listener Count Report:'];

    for (const name of arrayNames) {
      const baseline = this.baselines.get(name);
      const current = this.getListenerCount(obj, name);
      const baselineStr =
        baseline !== undefined ? baseline.toString() : 'not recorded';

      lines.push(`  - ${name}: ${current} (baseline: ${baselineStr})`);
    }

    return lines.join('\n');
  }

  /**
   * Reset all recorded baselines
   */
  reset(): void {
    this.baselines.clear();
  }

  /**
   * Get the count of listeners in an array
   * @param obj The object containing the listener array
   * @param listenerArrayName The property name of the listener array
   * @returns The number of listeners, or 0 if array doesn't exist
   */
  private getListenerCount(obj: any, listenerArrayName: string): number {
    if (!obj) {
      return 0;
    }

    // Handle nested properties (e.g., 'listeners.network')
    const parts = listenerArrayName.split('.');
    let current = obj;

    for (const part of parts) {
      if (current[part] === undefined) {
        return 0;
      }
      current = current[part];
    }

    // Check if it's an array
    if (Array.isArray(current)) {
      return current.length;
    }

    // Check if it's a Set
    if (current instanceof Set) {
      return current.size;
    }

    // Check if it's a Map
    if (current instanceof Map) {
      return current.size;
    }

    // For other types, return 0
    return 0;
  }
}

/**
 * Helper function to create a memory leak detector and record baselines in one call
 * @param obj The object to monitor
 * @param listenerArrayNames Array of listener array property names
 * @returns Configured MemoryLeakDetector instance
 */
export function createMemoryLeakDetector(
  obj: any,
  listenerArrayNames: string[]
): MemoryLeakDetector {
  const detector = new MemoryLeakDetector();

  for (const name of listenerArrayNames) {
    detector.recordBaseline(obj, name);
  }

  return detector;
}
