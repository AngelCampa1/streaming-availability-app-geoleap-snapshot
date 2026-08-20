/**
 * MSW Example Tests
 *
 * This file demonstrates how to use MSW for API mocking in tests.
 * These tests verify the MSW infrastructure is working correctly.
 */

// Import only server-side exports to avoid browser-only setupWorker
import { server } from '../server';
import { http, HttpResponse } from 'msw';
import { mockUser, mockErrorResponses } from '../testData';

describe('MSW Infrastructure Tests', () => {
  describe('Authentication Handlers', () => {
    it('returns user data for /api/auth/me', async () => {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
      });
    });

    it('returns 401 for unauthorized requests', async () => {
      const response = await fetch('/api/auth/me');

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('handles login with valid credentials', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      // Cookie-based auth: returns user and success, not tokens
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('test@example.com');
    });

    it('rejects invalid credentials', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid@test.com',
          password: 'wrong',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Search Handlers', () => {
    it('returns search results for valid query', async () => {
      const response = await fetch('/api/search?q=shawshank');

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.results).toBeDefined();
      expect(data.query).toBe('shawshank');
    });

    it('returns empty results for empty query', async () => {
      const response = await fetch('/api/search?q=');

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.results).toHaveLength(0);
      expect(data.suggestions).toBeDefined();
    });
  });

  describe('Handler Overrides', () => {
    it('allows overriding handlers for specific tests', async () => {
      // Override the search handler for this test only
      server.use(
        http.get('/api/search', () => {
          return HttpResponse.json({
            query: 'custom',
            results: [{ id: 'custom-1', title: 'Custom Result' }],
            totalResults: 1,
            page: 1,
            pageSize: 20,
          });
        })
      );

      const response = await fetch('/api/search?q=anything');
      const data = await response.json();

      expect(data.results[0].title).toBe('Custom Result');
    });

    it('allows simulating server errors', async () => {
      server.use(
        http.get('/api/search', () => {
          return HttpResponse.json(mockErrorResponses.serverError, { status: 500 });
        })
      );

      const response = await fetch('/api/search?q=test');

      expect(response.status).toBe(500);
    });

    it('handlers reset between tests', async () => {
      // This should use the default handler again
      const response = await fetch('/api/search?q=test');

      expect(response.ok).toBe(true);
    });
  });

  describe('Content Handlers', () => {
    it('returns content by ID', async () => {
      const response = await fetch('/api/content/movie/tt0111161');

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.id).toBe('tt0111161');
      expect(data.title).toBeDefined();
    });

    it('returns 404 for non-existent content', async () => {
      const response = await fetch('/api/content/movie/not-found');

      expect(response.status).toBe(404);
    });
  });

  describe('Health Check', () => {
    it('returns healthy status', async () => {
      const response = await fetch('/api/health');

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.checks).toBeDefined();
    });
  });
});
