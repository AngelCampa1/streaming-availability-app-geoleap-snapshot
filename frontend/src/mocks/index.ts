/**
 * MSW Mock Infrastructure
 *
 * This module provides network-level API mocking using MSW (Mock Service Worker).
 * Unlike traditional Jest mocks that mock at the module level, MSW intercepts
 * actual HTTP requests at the network level, which means:
 *
 * 1. Your actual fetch/axios code runs
 * 2. Real HTTP requests are intercepted
 * 3. Mock responses are returned
 * 4. No need to mock fetch or API clients
 *
 * This approach exercises more of your actual code paths and catches more bugs.
 *
 * ## Structure
 *
 * - `handlers.ts` - API request handlers (organized by domain)
 * - `server.ts` - MSW server for Node.js/Jest tests
 * - `browser.ts` - MSW worker for browser/Storybook
 * - `testData.ts` - Centralized mock data
 *
 * ## Usage in Tests
 *
 * The MSW server is automatically started in jest.setup.js.
 * You can override handlers in individual tests:
 *
 * ```typescript
 * import { server, http, HttpResponse } from '@/mocks';
 *
 * test('handles error state', async () => {
 *   // Override the handler for this test
 *   server.use(
 *     http.get('/api/search', () => {
 *       return HttpResponse.json(
 *         { message: 'Server error' },
 *         { status: 500 }
 *       );
 *     })
 *   );
 *
 *   // Your test code here
 * });
 * ```
 *
 * ## Usage in Browser (Development)
 *
 * To enable MSW in development:
 *
 * 1. Run: `npx msw init public/ --save`
 * 2. Set `NEXT_PUBLIC_ENABLE_MOCKS=true` in `.env.local`
 * 3. Import and start the worker in your app
 *
 * ```typescript
 * // In your app entry point
 * if (process.env.NEXT_PUBLIC_ENABLE_MOCKS === 'true') {
 *   const { startMSW } = await import('@/mocks');
 *   await startMSW();
 * }
 * ```
 *
 * ## Custom Handlers for Specific Tests
 *
 * You can create scenario-specific handlers:
 *
 * ```typescript
 * import { http, HttpResponse } from '@/mocks';
 *
 * export const errorHandlers = [
 *   http.get('/api/search', () => {
 *     return HttpResponse.json({ error: 'Failed' }, { status: 500 });
 *   }),
 * ];
 *
 * // In test
 * server.use(...errorHandlers);
 * ```
 */

// Server exports (for Jest/Node.js tests)
export { server, handlers } from './server';

// Browser exports (for development/Storybook)
export { worker, startMSW, stopMSW } from './browser';

// MSW utilities re-exported for convenience
export { http, HttpResponse, delay } from 'msw';

// Handler groups for selective use
export {
  authHandlers,
  searchHandlers,
  contentHandlers,
  watchlistHandlers,
  streamingHandlers,
  subscriptionHandlers,
  socialHandlers,
  notificationHandlers,
  healthHandlers,
} from './handlers';

// Test data exports
export {
  mockUser,
  mockAuthTokens,
  mockUserSubscription,
  mockSearchResults,
  mockContent,
  mockWatchlistItems,
  mockWatchlistStats,
  mockStreamingServices,
  mockUserSubscriptions,
  mockVpnCountries,
  mockPaywallInfo,
  mockSocialConnections,
  mockNotifications,
  mockErrorResponses,
} from './testData';
