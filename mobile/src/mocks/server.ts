/**
 * MSW Server Setup for React Native (Jest Tests)
 *
 * This file sets up MSW for React Native test environments (Jest).
 * The server intercepts HTTP requests made during tests and returns
 * mock responses defined in handlers.ts.
 *
 * @see https://mswjs.io/docs/integrations/react-native/
 */

import { setupServer } from 'msw/native';
import { http, HttpResponse, delay } from 'msw';
import { handlers } from './handlers';

// Re-export MSW utilities for use in tests
export { http, HttpResponse, delay };

/**
 * Create the MSW server with the default handlers.
 * This server will intercept all HTTP requests made during tests.
 */
export const server = setupServer(...handlers);

/**
 * Convenience function to start the server with recommended options.
 * Call this in your test setup (beforeAll).
 */
export function startServer() {
  server.listen({
    onUnhandledRequest: 'warn', // Warn about unhandled requests (helps catch missing handlers)
  });
}

/**
 * Convenience function to reset handlers after each test.
 * Call this in afterEach to ensure test isolation.
 */
export function resetServer() {
  server.resetHandlers();
}

/**
 * Convenience function to stop the server.
 * Call this in afterAll to clean up.
 */
export function stopServer() {
  server.close();
}

export default server;
