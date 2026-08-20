/**
 * MSW Server Setup for Node.js Tests
 *
 * This file sets up the MSW server for use in Jest/Node.js test environments.
 * Import and use this in your test setup file.
 *
 * Usage in jest.setup.js:
 * ```javascript
 * import { server } from './src/mocks/server';
 *
 * beforeAll(() => server.listen());
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 * ```
 *
 * Usage in individual tests (to override handlers):
 * ```javascript
 * import { server } from '@/mocks/server';
 * import { http, HttpResponse } from 'msw';
 *
 * test('handles error', async () => {
 *   server.use(
 *     http.get('/api/search', () => {
 *       return HttpResponse.json({ error: 'Server error' }, { status: 500 });
 *     })
 *   );
 *   // ... test code
 * });
 * ```
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create the MSW server instance with all default handlers
export const server = setupServer(...handlers);

// Export for convenience in tests
export { handlers } from './handlers';
export { http, HttpResponse, delay } from 'msw';
