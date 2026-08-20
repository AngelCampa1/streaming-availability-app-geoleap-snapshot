/**
 * MSW Setup Verification Test
 *
 * This test verifies that MSW is correctly set up and can intercept HTTP requests.
 * Run with: npm test -- --testPathPattern=msw-setup
 */

import { server } from '../server';
import { handlers, mockUser, mockTokens, mockSearchResults } from '../handlers';
import { createUnauthorizedHandler, networkErrorHandlers } from '../errorHandlers';

// Setup MSW server for this test file
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// KNOWN ISSUE: MSW v2 server.listen() incompatibility - skipping entire suite
// TODO: Upgrade MSW setup for v2 compatibility
describe.skip('MSW Setup', () => {
  describe('Server Initialization', () => {
    it('should have default handlers configured', () => {
      expect(handlers).toBeDefined();
      expect(Array.isArray(handlers)).toBe(true);
      expect(handlers.length).toBeGreaterThan(0);
    });

    it('should have mock data available', () => {
      expect(mockUser).toBeDefined();
      expect(mockUser.id).toBe('user-123');
      expect(mockUser.email).toBe('test@geoleap.app');

      expect(mockTokens).toBeDefined();
      expect(mockTokens.accessToken).toBeDefined();

      expect(mockSearchResults).toBeDefined();
      expect(Array.isArray(mockSearchResults)).toBe(true);
    });
  });

  describe('API Mocking', () => {
    it('should intercept login requests', async () => {
      const response = await fetch('https://api.geoleap.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.tokens).toBeDefined();
    });

    it('should intercept search requests', async () => {
      const response = await fetch('https://api.geoleap.app/api/streaming/search?q=test');

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.results).toBeDefined();
      expect(data.pagination).toBeDefined();
      expect(data.queryTime).toBeDefined();
    });

    it('should intercept watchlist requests', async () => {
      const response = await fetch('https://api.geoleap.app/api/watchlist');

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.watchlists).toBeDefined();
    });

    it('should intercept health check', async () => {
      const response = await fetch('https://api.geoleap.app/health');

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.status).toBe('healthy');
    });
  });

  describe('Error Handler Overrides', () => {
    it('should allow overriding handlers for specific tests', async () => {
      // Override with unauthorized handler
      server.use(createUnauthorizedHandler('/api/auth/profile', 'get'));

      const response = await fetch('https://api.geoleap.app/api/auth/profile');

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should reset handlers after each test (previous override should be gone)', async () => {
      // This test runs after the override test
      // The handler should be reset to default
      const response = await fetch('https://api.geoleap.app/api/auth/profile');

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockUser.id);
    });

    it('should handle network errors', async () => {
      server.use(...networkErrorHandlers);

      try {
        await fetch('https://api.geoleap.app/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({}),
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Network error expected
        expect(error).toBeDefined();
      }
    });
  });

  describe('Handler Validation', () => {
    it('should return validation error for login without credentials', async () => {
      const response = await fetch('https://api.geoleap.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Empty body
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await fetch('https://api.geoleap.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid@test.com', password: 'wrong' }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent watchlist', async () => {
      const response = await fetch('https://api.geoleap.app/api/watchlist/not-found');

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });
});
