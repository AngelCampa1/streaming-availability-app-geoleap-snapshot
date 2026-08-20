/**
 * DelayService - Centralized delay and timer management
 *
 * This service abstracts setTimeout/setInterval to make testing easier
 * and avoid fake timer issues in Jest tests. All services should use
 * this instead of calling setTimeout/setInterval directly.
 *
 * Benefits:
 * - Easy to mock in tests (no fake timer complexity)
 * - Centralized timer management
 * - Consistent API across services
 * - Type-safe timeout/interval IDs
 */

export interface TimerHandle {
  id: NodeJS.Timeout;
  clear: () => void;
}

export class DelayService {
  private static instance: DelayService;

  /**
   * Singleton instance
   */
  public static getInstance(): DelayService {
    if (!DelayService.instance) {
      DelayService.instance = new DelayService();
    }
    return DelayService.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  public static resetInstance(): void {
    DelayService.instance = undefined as any;
  }

  /**
   * Asynchronous delay - waits for specified milliseconds
   *
   * @param ms Milliseconds to wait
   * @returns Promise that resolves after delay
   *
   * @example
   * await delayService.wait(1000); // Wait 1 second
   */
  public async wait(ms: number): Promise<void> {
    return new Promise<void>(resolve => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Create a timeout that executes callback after delay
   *
   * @param callback Function to execute after delay
   * @param ms Milliseconds to wait
   * @returns Timer handle with clear method
   *
   * @example
   * const timer = delayService.timeout(() => console.log('done'), 1000);
   * timer.clear(); // Cancel timeout
   */
  public timeout(callback: () => void, ms: number): TimerHandle {
    const id = setTimeout(callback, ms);
    return {
      id,
      clear: () => clearTimeout(id),
    };
  }

  /**
   * Create an interval that executes callback repeatedly
   *
   * @param callback Function to execute on each interval
   * @param ms Milliseconds between executions
   * @returns Timer handle with clear method
   *
   * @example
   * const timer = delayService.interval(() => console.log('tick'), 1000);
   * timer.clear(); // Stop interval
   */
  public interval(callback: () => void, ms: number): TimerHandle {
    const id = setInterval(callback, ms);
    return {
      id,
      clear: () => clearInterval(id),
    };
  }

  /**
   * Clear a timeout or interval
   *
   * @param handle Timer handle from timeout() or interval()
   *
   * @example
   * const timer = delayService.timeout(() => {}, 1000);
   * delayService.clear(timer); // Cancel timer
   */
  public clear(handle: TimerHandle): void {
    handle.clear();
  }
}

// Export singleton instance for convenient imports
export const delayService = DelayService.getInstance();
