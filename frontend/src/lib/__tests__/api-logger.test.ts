/**
 * Comprehensive tests for api-logger.ts
 *
 * Coverage Target: 95%+
 * Strategy: Use MSW v2 for network mocking, test real API logger implementation
 * Focus: Logging, sanitization, correlation ID tracking, performance measurement
 */

import { apiLogger, api, useApi, createApiClient } from '../api-logger';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { renderHook } from '@testing-library/react';
import { logger } from '../logger';

// Mock only the logger to capture calls, but let the ApiLogger class run real code
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logApiCall: jest.fn(),
    setCorrelationId: jest.fn(),
  },
}));

const mockLogger = logger as jest.Mocked<typeof logger>;

// MSW v2 server setup
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
});
afterAll(() => server.close());

describe('ApiLogger', () => {
  describe('fetchWithLogging', () => {
    it('logs successful GET request with correlation ID', async () => {
      server.use(
        http.get('https://api.test.com/users', () => {
          return HttpResponse.json(
            { users: [{ id: '1', name: 'Test User' }] },
            {
              status: 200,
              headers: { 'X-Correlation-ID': 'server-correlation-123' },
            }
          );
        })
      );

      const response = await apiLogger.fetchWithLogging('https://api.test.com/users');

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ users: [{ id: '1', name: 'Test User' }] });
      expect(response.correlationId).toBe('server-correlation-123');

      // Verify logging calls
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('API Request: GET'),
        expect.objectContaining({
          correlationId: expect.any(String),
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('API Success'),
        expect.objectContaining({
          correlationId: 'server-correlation-123',
          status: 200,
          responseTime: expect.any(Number),
        })
      );

      expect(mockLogger.logApiCall).toHaveBeenCalledWith(
        'https://api.test.com/users',
        'GET',
        200,
        expect.any(Number),
        true
      );

      expect(mockLogger.setCorrelationId).toHaveBeenCalledWith('server-correlation-123');
    });

    it('logs POST request with sanitized body', async () => {
      server.use(
        http.post('https://api.test.com/auth/login', () => {
          return HttpResponse.json({ token: 'auth-token-123' });
        })
      );

      const response = await apiLogger.fetchWithLogging('https://api.test.com/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'secret123' }),
      });

      expect(response.status).toBe(200);

      // Verify password was sanitized in logs
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('API Request: POST'),
        expect.objectContaining({
          body: expect.objectContaining({
            email: 'test@example.com',
            password: '***REDACTED***',
          }),
        })
      );
    });

    it('sanitizes sensitive headers (authorization, cookie, api-key)', async () => {
      server.use(
        http.get('https://api.test.com/protected', () => {
          return HttpResponse.json({ data: 'protected' });
        })
      );

      await apiLogger.fetchWithLogging('https://api.test.com/protected', {
        headers: {
          Authorization: 'Bearer secret-token',
          Cookie: 'session=abc123',
          'X-API-Key': 'api-key-secret',
          'X-Auth-Token': 'auth-token',
          'Content-Type': 'application/json',
        },
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: '***REDACTED***',
            Cookie: '***REDACTED***',
            'X-API-Key': '***REDACTED***',
            'X-Auth-Token': '***REDACTED***',
          }),
        })
      );
    });

    it('logs API errors with details', async () => {
      server.use(
        http.get('https://api.test.com/error', () => {
          return HttpResponse.json(
            {
              message: 'Invalid request',
              error: 'VALIDATION_ERROR',
              correlationId: 'error-correlation-456',
            },
            { status: 400 }
          );
        })
      );

      const response = await apiLogger.fetchWithLogging('https://api.test.com/error');

      expect(response.status).toBe(400);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('API Error'),
        expect.objectContaining({
          correlationId: expect.any(String),
          status: 400,
          responseTime: expect.any(Number),
          errorData: expect.objectContaining({
            message: 'Invalid request',
            error: 'VALIDATION_ERROR',
            correlationId: 'error-correlation-456',
          }),
        })
      );

      expect(mockLogger.logApiCall).toHaveBeenCalledWith(
        'https://api.test.com/error',
        'GET',
        400,
        expect.any(Number),
        false // not successful
      );
    });

    it('handles network errors', async () => {
      server.use(
        http.get('https://api.test.com/network-error', () => {
          return HttpResponse.error();
        })
      );

      await expect(apiLogger.fetchWithLogging('https://api.test.com/network-error')).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('API Network Error'),
        expect.objectContaining({
          correlationId: expect.any(String),
          error: expect.any(String),
          responseTime: expect.any(Number),
        })
      );

      expect(mockLogger.logApiCall).toHaveBeenCalledWith(
        'https://api.test.com/network-error',
        'GET',
        0, // Status code 0 for network error
        expect.any(Number),
        false
      );
    });

    it('handles non-JSON responses (text/plain)', async () => {
      server.use(
        http.get('https://api.test.com/text', () => {
          return new Response('Plain text response', {
            headers: { 'content-type': 'text/plain' },
          });
        })
      );

      const response = await apiLogger.fetchWithLogging('https://api.test.com/text');

      expect(response.status).toBe(200);
      expect(response.data).toBe('Plain text response');
    });

    it('handles responses without content-type header', async () => {
      server.use(
        http.get('https://api.test.com/no-content-type', () => {
          return new Response('Some data');
        })
      );

      const response = await apiLogger.fetchWithLogging('https://api.test.com/no-content-type');

      expect(response.status).toBe(200);
      expect(typeof response.data).toBe('string');
    });

    it('uses custom correlation ID when provided', async () => {
      const customId = 'custom-correlation-xyz';

      server.use(
        http.get('https://api.test.com/custom-id', ({ request }) => {
          const correlationId = request.headers.get('X-Correlation-ID');
          return HttpResponse.json(
            { received: correlationId },
            {
              headers: { 'X-Correlation-ID': correlationId! },
            }
          );
        })
      );

      const response = await apiLogger.fetchWithLogging('https://api.test.com/custom-id', {
        correlationId: customId,
      });

      expect(response.correlationId).toBe(customId);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          correlationId: customId,
        })
      );
    });

    it('generates correlation ID when not provided', async () => {
      server.use(
        http.get('https://api.test.com/auto-id', () => {
          return HttpResponse.json({ ok: true });
        })
      );

      await apiLogger.fetchWithLogging('https://api.test.com/auto-id');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          correlationId: expect.stringContaining('client_'),
        })
      );
    });

    it('includes response size when available', async () => {
      server.use(
        http.get('https://api.test.com/with-size', () => {
          return HttpResponse.json(
            { data: 'test' },
            {
              headers: { 'Content-Length': '1024' },
            }
          );
        })
      );

      await apiLogger.fetchWithLogging('https://api.test.com/with-size');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          responseSize: 1024,
        })
      );
    });

    it('handles missing response size gracefully', async () => {
      server.use(
        http.get('https://api.test.com/no-size', () => {
          return new Response(JSON.stringify({ data: 'test' }), {
            headers: { 'content-type': 'application/json' },
            // No Content-Length header
          });
        })
      );

      await apiLogger.fetchWithLogging('https://api.test.com/no-size');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          responseSize: undefined,
        })
      );
    });
  });

  describe('Convenience HTTP Methods', () => {
    it('get() method works correctly', async () => {
      server.use(
        http.get('https://api.test.com/get', () => {
          return HttpResponse.json({ method: 'GET' });
        })
      );

      const response = await apiLogger.get('https://api.test.com/get');

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ method: 'GET' });
    });

    it('post() method sends body correctly', async () => {
      server.use(
        http.post('https://api.test.com/post', async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ received: body }, { status: 201 });
        })
      );

      const body = JSON.stringify({ name: 'Test' });
      const response = await apiLogger.post('https://api.test.com/post', body);

      expect(response.status).toBe(201);
      expect((response.data as { received: { name: string } }).received).toEqual({ name: 'Test' });
    });

    it('put() method works correctly', async () => {
      server.use(
        http.put('https://api.test.com/put/123', () => {
          return HttpResponse.json({ updated: true });
        })
      );

      const response = await apiLogger.put('https://api.test.com/put/123', JSON.stringify({ name: 'Updated' }));

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ updated: true });
    });

    it('patch() method works correctly', async () => {
      server.use(
        http.patch('https://api.test.com/patch/123', () => {
          return HttpResponse.json({ patched: true });
        })
      );

      const response = await apiLogger.patch('https://api.test.com/patch/123', JSON.stringify({ name: 'Patched' }));

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ patched: true });
    });

    it('delete() method works correctly', async () => {
      server.use(
        http.delete('https://api.test.com/delete/123', () => {
          return new Response(null, { status: 204 });
        })
      );

      const response = await apiLogger.delete('https://api.test.com/delete/123');

      expect(response.status).toBe(204);
    });
  });

  describe('api singleton', () => {
    it('exposes all HTTP methods', () => {
      expect(api.get).toBeDefined();
      expect(api.post).toBeDefined();
      expect(api.put).toBeDefined();
      expect(api.patch).toBeDefined();
      expect(api.delete).toBeDefined();
      expect(api.fetch).toBeDefined();
    });

    it('works with get', async () => {
      server.use(
        http.get('https://api.test.com/api-get', () => {
          return HttpResponse.json({ ok: true });
        })
      );

      const response = await api.get('https://api.test.com/api-get');

      expect(response.status).toBe(200);
    });

    it('works with post', async () => {
      server.use(
        http.post('https://api.test.com/api-post', () => {
          return HttpResponse.json({ created: true }, { status: 201 });
        })
      );

      const response = await api.post('https://api.test.com/api-post', JSON.stringify({ data: 'test' }));

      expect(response.status).toBe(201);
    });
  });

  describe('useApi hook', () => {
    it('returns api singleton', () => {
      const { result } = renderHook(() => useApi());

      expect(result.current).toBe(api);
      expect(result.current.get).toBeDefined();
      expect(result.current.post).toBeDefined();
    });
  });

  describe('createApiClient', () => {
    it('creates client with base URL', async () => {
      server.use(
        http.get('https://api.test.com/v1/users', () => {
          return HttpResponse.json({ users: [] });
        })
      );

      const client = createApiClient('https://api.test.com/v1');
      const response = await client.get('/users');

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ users: [] });
    });

    it('supports all HTTP methods', async () => {
      const baseUrl = 'https://api.test.com';

      server.use(
        http.post(`${baseUrl}/items`, () => HttpResponse.json({ id: '1' }, { status: 201 })),
        http.put(`${baseUrl}/items/1`, () => HttpResponse.json({ updated: true })),
        http.patch(`${baseUrl}/items/1`, () => HttpResponse.json({ patched: true })),
        http.delete(`${baseUrl}/items/1`, () => new Response(null, { status: 204 }))
      );

      const client = createApiClient(baseUrl);

      const postResponse = await client.post('/items', JSON.stringify({ name: 'Item 1' }));
      expect(postResponse.status).toBe(201);

      const putResponse = await client.put('/items/1', JSON.stringify({ name: 'Updated' }));
      expect(putResponse.status).toBe(200);

      const patchResponse = await client.patch('/items/1', JSON.stringify({ name: 'Patched' }));
      expect(patchResponse.status).toBe(200);

      const deleteResponse = await client.delete('/items/1');
      expect(deleteResponse.status).toBe(204);
    });

    it('handles trailing slash in base URL', async () => {
      server.use(
        http.get('https://api.test.com/users', () => {
          return HttpResponse.json({ ok: true });
        })
      );

      const client = createApiClient('https://api.test.com/');
      const response = await client.get('users'); // No leading slash

      expect(response.status).toBe(200);
    });
  });

  describe('Sanitization', () => {
    it('sanitizes password in request body', async () => {
      server.use(
        http.post('https://api.test.com/register', () => {
          return HttpResponse.json({ ok: true });
        })
      );

      await apiLogger.post(
        'https://api.test.com/register',
        JSON.stringify({
          email: 'test@example.com',
          password: 'SuperSecret123!',
          confirmPassword: 'SuperSecret123!',
        })
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.objectContaining({
            email: 'test@example.com',
            password: '***REDACTED***',
            confirmPassword: '***REDACTED***',
          }),
        })
      );
    });

    it('sanitizes token, secret, key fields', async () => {
      server.use(
        http.post('https://api.test.com/config', () => {
          return HttpResponse.json({ ok: true });
        })
      );

      await apiLogger.post(
        'https://api.test.com/config',
        JSON.stringify({
          apiToken: 'secret-token',
          apiKey: 'secret-key',
          clientSecret: 'client-secret',
          encryptionKey: 'encryption-key',
        })
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.objectContaining({
            apiToken: '***REDACTED***',
            apiKey: '***REDACTED***',
            clientSecret: '***REDACTED***',
            encryptionKey: '***REDACTED***',
          }),
        })
      );
    });

    it('sanitizes payment card information', async () => {
      server.use(
        http.post('https://api.test.com/payment', () => {
          return HttpResponse.json({ ok: true });
        })
      );

      await apiLogger.post(
        'https://api.test.com/payment',
        JSON.stringify({
          cardNumber: '4111111111111111',
          cvv: '123',
          pin: '1234',
        })
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.objectContaining({
            cardNumber: '***REDACTED***',
            cvv: '***REDACTED***',
            pin: '***REDACTED***',
          }),
        })
      );
    });

    it('sanitizes error response data for privacy', async () => {
      server.use(
        http.get('https://api.test.com/private-error', () => {
          return HttpResponse.json(
            {
              message: 'Error message',
              error: 'ERROR_CODE',
              correlationId: 'corr-123',
              timestamp: '2024-01-01T00:00:00Z',
              path: '/api/test',
              sensitiveData: 'should-not-be-logged',
            },
            { status: 400 }
          );
        })
      );

      await apiLogger.get('https://api.test.com/private-error');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          errorData: {
            message: 'Error message',
            error: 'ERROR_CODE',
            correlationId: 'corr-123',
            timestamp: '2024-01-01T00:00:00Z',
            path: '/api/test',
            // sensitiveData should NOT be present
          },
        })
      );
    });

    it('handles non-object error response data', async () => {
      server.use(
        http.get('https://api.test.com/string-error', () => {
          return new Response('Simple error message', { status: 400 });
        })
      );

      await apiLogger.get('https://api.test.com/string-error');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          errorData: 'Simple error message',
        })
      );
    });

    it('handles null error response data', async () => {
      server.use(
        http.get('https://api.test.com/null-error', () => {
          return HttpResponse.json(null, { status: 400 });
        })
      );

      await apiLogger.get('https://api.test.com/null-error');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          errorData: null,
        })
      );
    });

    it('handles non-JSON body gracefully (not parseable)', async () => {
      server.use(
        http.post('https://api.test.com/plain', () => {
          return HttpResponse.json({ ok: true });
        })
      );

      await apiLogger.post('https://api.test.com/plain', 'plain text body');

      // Should not crash, body logged as-is since not JSON
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: 'plain text body',
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles empty body', async () => {
      server.use(
        http.post('https://api.test.com/empty', () => {
          return HttpResponse.json({ ok: true });
        })
      );

      const response = await apiLogger.post('https://api.test.com/empty');

      expect(response.status).toBe(200);
    });

    it('handles undefined body', async () => {
      server.use(
        http.post('https://api.test.com/undefined', () => {
          return HttpResponse.json({ ok: true });
        })
      );

      const response = await apiLogger.post('https://api.test.com/undefined', undefined);

      expect(response.status).toBe(200);
    });

    it('handles response without correlation ID header', async () => {
      server.use(
        http.get('https://api.test.com/no-correlation', () => {
          return HttpResponse.json({ ok: true });
        })
      );

      const response = await apiLogger.get('https://api.test.com/no-correlation');

      expect(response.correlationId).toBeUndefined();
    });

    it('handles exception during JSON parsing', async () => {
      server.use(
        http.get('https://api.test.com/invalid-json', () => {
          return new Response('{ invalid json }', {
            headers: { 'content-type': 'application/json' },
          });
        })
      );

      // Should throw error when trying to parse invalid JSON
      await expect(apiLogger.get('https://api.test.com/invalid-json')).rejects.toThrow();
    });
  });
});
