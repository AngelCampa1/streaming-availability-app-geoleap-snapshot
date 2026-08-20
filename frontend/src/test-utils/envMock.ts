/**
 * Environment Mock Utility for Tests
 *
 * Fixes TS2540 errors: "Cannot assign to 'NODE_ENV' because it is a read-only property"
 *
 * Usage:
 * ```typescript
 * import { withNodeEnv } from '@/test-utils/envMock';
 *
 * it('should log in development mode', async () => {
 *   await withNodeEnv('development', async () => {
 *     // Test code that depends on process.env.NODE_ENV
 *   });
 * });
 * ```
 */

/**
 * Temporarily set NODE_ENV for a test function
 *
 * @param env - The environment to set ('development', 'production', or 'test')
 * @param fn - The test function to run with the specified environment
 * @returns The result of the test function
 */
export function withNodeEnv<T>(
  env: 'development' | 'production' | 'test',
  fn: () => T | Promise<T>
): T | Promise<T> {
  // Save the original descriptor
  const descriptor = Object.getOwnPropertyDescriptor(process.env, 'NODE_ENV');
  const originalValue = process.env.NODE_ENV;

  // Temporarily make NODE_ENV writable and set the new value
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: env,
    writable: true,
    configurable: true,
  });

  // Restore function
  const restore = () => {
    if (descriptor) {
      Object.defineProperty(process.env, 'NODE_ENV', descriptor);
    } else {
      // If no descriptor existed, restore the original value
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalValue,
        writable: true,
        configurable: true,
      });
    }
  };

  // Execute the function
  const result = fn();

  // If async, restore after promise settles
  if (result instanceof Promise) {
    return result.finally(restore) as T | Promise<T>;
  }

  // If sync, restore immediately
  restore();
  return result;
}

/**
 * Set NODE_ENV for the duration of a test suite
 * Call this in beforeEach and use resetNodeEnv in afterEach
 */
export function setNodeEnv(env: 'development' | 'production' | 'test'): void {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: env,
    writable: true,
    configurable: true,
  });
}

/**
 * Reset NODE_ENV to 'test' (default for tests)
 */
export function resetNodeEnv(): void {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true,
    configurable: true,
  });
}
