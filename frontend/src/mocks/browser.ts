/**
 * MSW Browser Setup for Development
 *
 * This file sets up the MSW worker for use in browser environments.
 * This is useful for:
 * - Local development without a running backend
 * - Storybook component development
 * - E2E test environments
 *
 * Usage in development:
 * ```typescript
 * // In your app entry point (e.g., _app.tsx or layout.tsx)
 * if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_MOCKS === 'true') {
 *   const { worker } = await import('@/mocks/browser');
 *   await worker.start({
 *     onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
 *   });
 * }
 * ```
 *
 * Setup for Next.js:
 * 1. Run: npx msw init public/ --save
 * 2. This creates public/mockServiceWorker.js
 * 3. Set NEXT_PUBLIC_ENABLE_MOCKS=true in .env.local
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Create the MSW worker instance with all default handlers
export const worker = setupWorker(...handlers);

// Export for convenience
export { handlers } from './handlers';
export { http, HttpResponse, delay } from 'msw';

/**
 * Start MSW in browser environment
 *
 * Call this function in your app's entry point during development.
 * Example usage in Next.js:
 *
 * ```typescript
 * // src/app/layout.tsx or src/app/providers.tsx
 * 'use client';
 *
 * import { useEffect } from 'react';
 *
 * export function MSWProvider({ children }: { children: React.ReactNode }) {
 *   useEffect(() => {
 *     if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_MOCKS === 'true') {
 *       import('@/mocks/browser').then(({ startMSW }) => {
 *         startMSW();
 *       });
 *     }
 *   }, []);
 *
 *   return <>{children}</>;
 * }
 * ```
 */
export async function startMSW(options?: {
  onUnhandledRequest?: 'bypass' | 'warn' | 'error';
  quiet?: boolean;
}): Promise<void> {
  // Only run in browser
  if (typeof window === 'undefined') {
    console.warn('MSW browser worker can only be started in browser environment');
    return;
  }

  const { onUnhandledRequest = 'bypass', quiet = false } = options || {};

  try {
    await worker.start({
      onUnhandledRequest,
      quiet,
    });

    if (!quiet) {
      // eslint-disable-next-line no-console
      console.log('[MSW] Mock Service Worker started');
    }
  } catch (error) {
    console.error('[MSW] Failed to start Mock Service Worker:', error);
  }
}

/**
 * Stop MSW worker
 */
export function stopMSW(): void {
  if (typeof window === 'undefined') {
    return;
  }

  worker.stop();
  // eslint-disable-next-line no-console
  console.log('[MSW] Mock Service Worker stopped');
}
