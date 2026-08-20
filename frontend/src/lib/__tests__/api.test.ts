/**
 * API Library Test
 * Focus on critical API functionality using MSW for network-level mocking
 * Optimized for 100% test success rate per CLAUDE.md requirements
 *
 * SECURITY NOTE: API now uses httpOnly cookie-based authentication
 * Tests verify credentials: 'include' is set (cookies sent automatically)
 * No Authorization headers are used - tokens are in httpOnly cookies
 */

import { apiCall, searchContent, getUserStreamingServices } from '../api';
import { server, http, HttpResponse } from '@/mocks/server';

// Mock SecurityService to bypass CSRF token fetching for tests
// This allows MSW to intercept the actual HTTP requests
jest.mock('../security', () => ({
  SecurityService: {
    secureRequest: jest.fn((url: string, options?: RequestInit) => {
      // Pass through to fetch so MSW can intercept
      return fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers as Record<string, string>),
        },
      });
    }),
  },
}));

describe('API Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('apiCall', () => {
    it('makes successful API requests', async () => {
      const mockResponse = { success: true, data: { id: 1, name: 'Test' } };

      server.use(
        http.get('*/test', () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await apiCall('/test');
      expect(result).toEqual(mockResponse);
    });

    it('uses cookie-based authentication instead of Authorization header', async () => {
      let capturedRequest: Request | null = null;

      server.use(
        http.get('*/test', ({ request }) => {
          capturedRequest = request;
          return HttpResponse.json({});
        })
      );

      await apiCall('/test');

      // SECURITY: Verify no Authorization header (cookie-based auth)
      expect(capturedRequest).not.toBeNull();
      expect(capturedRequest!.headers.get('Authorization')).toBeNull();
    });

    it('handles API errors gracefully', async () => {
      server.use(
        http.get('*/test', () => {
          return HttpResponse.json(
            { message: 'Invalid request' },
            { status: 400, statusText: 'Bad Request' }
          );
        })
      );

      await expect(apiCall('/test')).rejects.toThrow('Invalid request');
    });

    it('handles network errors', async () => {
      server.use(
        http.get('*/test', () => {
          return HttpResponse.error();
        })
      );

      await expect(apiCall('/test')).rejects.toThrow();
    });

    it('supports different HTTP methods', async () => {
      let capturedRequest: Request | null = null;
      let capturedBody: string | null = null;

      server.use(
        http.post('*/test', async ({ request }) => {
          capturedRequest = request;
          capturedBody = await request.text();
          return HttpResponse.json({});
        })
      );

      await apiCall('/test', { method: 'POST', body: JSON.stringify({ data: 'test' }) });

      // SECURITY: Cookie-based auth - no Authorization header
      expect(capturedRequest).not.toBeNull();
      expect(capturedRequest!.method).toBe('POST');
      expect(capturedRequest!.headers.get('Content-Type')).toBe('application/json');
      expect(capturedBody).toBe(JSON.stringify({ data: 'test' }));
    });
  });

  describe('searchContent', () => {
    it('searches content successfully', async () => {
      const mockResults = {
        results: [{ id: 1, title: 'Test Movie', type: 'movie' }],
        totalResults: 1,
        page: 1,
        totalPages: 1,
      };

      server.use(
        http.get('*/api/search', () => {
          return HttpResponse.json(mockResults);
        })
      );

      const result = await searchContent('test query');

      expect(result).toEqual(mockResults);
    });

    it('handles search with filters', async () => {
      let capturedUrl: string | null = null;

      server.use(
        http.get('*/api/search', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ results: [], totalResults: 0 });
        })
      );

      await searchContent('test', { type: 'movie', year: 2020 });

      expect(capturedUrl).toContain('q=test');
      expect(capturedUrl).toContain('type=movie');
      expect(capturedUrl).toContain('year=2020');
    });
  });

  describe('getUserStreamingServices', () => {
    it('fetches user streaming services', async () => {
      const mockServices = {
        userServices: [{ id: '1', serviceName: 'Netflix' }],
        availableServices: [{ id: '2', name: 'Hulu' }],
      };

      server.use(
        http.get('*/api/streaming-services/user', () => {
          return HttpResponse.json(mockServices);
        })
      );

      const result = await getUserStreamingServices();
      expect(result).toEqual(mockServices);
    });

    it('includes country code in request when provided', async () => {
      let capturedUrl: string | null = null;

      server.use(
        http.get('*/api/streaming-services/user', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ userServices: [], availableServices: [] });
        })
      );

      await getUserStreamingServices('US');

      expect(capturedUrl).toContain('countryCode=US');
    });
  });

  describe('Error handling', () => {
    it('handles 401 unauthorized responses', async () => {
      server.use(
        http.get('*/test', () => {
          return HttpResponse.json(
            { message: 'Invalid token' },
            { status: 401, statusText: 'Unauthorized' }
          );
        })
      );

      await expect(apiCall('/test')).rejects.toThrow('Invalid token');
    });

    it('handles 500 server errors', async () => {
      server.use(
        http.get('*/test', () => {
          return HttpResponse.json(
            { message: 'Server error' },
            { status: 500, statusText: 'Internal Server Error' }
          );
        })
      );

      await expect(apiCall('/test')).rejects.toThrow('Server error');
    });

    it('handles invalid JSON responses', async () => {
      server.use(
        http.get('*/test', () => {
          return new HttpResponse('invalid json {', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );

      await expect(apiCall('/test')).rejects.toThrow();
    });

    it('handles HTML error responses gracefully (BUG-E2E-004)', async () => {
      server.use(
        http.get('*/test', () => {
          return new HttpResponse('<!DOCTYPE html><html><body>404 Not Found</body></html>', {
            status: 404,
            headers: { 'Content-Type': 'text/html' },
          });
        })
      );

      // The API throws the raw HTML as the error message for non-JSON responses
      await expect(apiCall('/test')).rejects.toThrow('<!DOCTYPE html>');
    });

    it('handles empty error responses', async () => {
      server.use(
        http.get('*/test', () => {
          return new HttpResponse('', {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );

      await expect(apiCall('/test')).rejects.toThrow();
    });
  });

  describe('ApiClient class', () => {
    // Import ApiClient for direct testing
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ApiClient } = require('../api');
    let client: any;

    beforeEach(() => {
      client = new ApiClient();
    });

    describe('HTTP Methods', () => {
      it('GET method makes successful requests', async () => {
        const mockData = { id: 1, name: 'Test Data' };
        server.use(
          http.get('*/api/items', () => {
            return HttpResponse.json(mockData);
          })
        );

        const result = await client.get('/api/items');
        expect(result).toEqual(mockData);
      });

      it('POST method sends data correctly', async () => {
        let capturedBody: any = null;
        server.use(
          http.post('*/api/items', async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json({ success: true, id: 123 });
          })
        );

        const testData = { name: 'New Item', value: 42 };
        const result = await client.post('/api/items', testData);

        expect(result).toEqual({ success: true, id: 123 });
        expect(capturedBody).toEqual(testData);
      });

      it('PUT method updates data correctly', async () => {
        let capturedBody: any = null;
        server.use(
          http.put('*/api/items/123', async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json({ success: true });
          })
        );

        const updateData = { name: 'Updated Item' };
        await client.put('/api/items/123', updateData);

        expect(capturedBody).toEqual(updateData);
      });

      it('DELETE method removes data correctly', async () => {
        let deleteCalled = false;
        server.use(
          http.delete('*/api/items/123', () => {
            deleteCalled = true;
            return HttpResponse.json({ success: true });
          })
        );

        await client.delete('/api/items/123');
        expect(deleteCalled).toBe(true);
      });

      it('postPublic method works without CSRF for anonymous access', async () => {
        let capturedBody: any = null;
        server.use(
          http.post('*/api/public/search', async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json({ results: [] });
          })
        );

        const searchData = { query: 'test' };
        await client.postPublic('/api/public/search', searchData);

        expect(capturedBody).toEqual(searchData);
      });
    });

    describe('Timeout Enforcement (BUG-010)', () => {
      it('has 15-second timeout configured', () => {
        // Verify timeout is set to 15 seconds (BUG-010 fix)
        expect(client.requestTimeout).toBe(15000);
      });
    });

    describe('Retry Logic', () => {
      it('retries failed requests on server errors', async () => {
        let attemptCount = 0;

        server.use(
          http.get('*/api/retry-test', () => {
            attemptCount++;
            if (attemptCount < 2) {
              return HttpResponse.json(
                {
                  correlationId: 'test-id',
                  error: {
                    code: 'SERVER_ERROR',
                    message: 'Server temporarily unavailable',
                    retryable: true,
                  },
                  timestamp: new Date().toISOString(),
                  path: '/api/retry-test',
                },
                { status: 503 }
              );
            }
            return HttpResponse.json({ success: true });
          })
        );

        const result = await client.get('/api/retry-test');
        expect(result).toEqual({ success: true });
        expect(attemptCount).toBeGreaterThan(1); // Should retry at least once
      }, 10000);

      it('does NOT retry on 401 Unauthorized (BUG-012)', async () => {
        let attemptCount = 0;

        server.use(
          http.get('*/api/auth-test', () => {
            attemptCount++;
            return HttpResponse.json(
              {
                correlationId: 'test-id',
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Invalid credentials',
                  retryable: false,
                },
                timestamp: new Date().toISOString(),
                path: '/api/auth-test',
              },
              { status: 401 }
            );
          })
        );

        await expect(client.get('/api/auth-test')).rejects.toThrow('Invalid credentials');
        expect(attemptCount).toBe(1); // Should NOT retry
      });

      it('does NOT retry on 403 Forbidden (BUG-012)', async () => {
        let attemptCount = 0;

        server.use(
          http.get('*/api/forbidden-test', () => {
            attemptCount++;
            return HttpResponse.json(
              {
                correlationId: 'test-id',
                error: {
                  code: 'FORBIDDEN',
                  message: 'Access denied',
                  retryable: false,
                },
                timestamp: new Date().toISOString(),
                path: '/api/forbidden-test',
              },
              { status: 403 }
            );
          })
        );

        await expect(client.get('/api/forbidden-test')).rejects.toThrow('Access denied');
        expect(attemptCount).toBe(1); // Should NOT retry
      });

      it('handles rate limiting (429) with retry-after header', async () => {
        let attemptCount = 0;

        server.use(
          http.get('*/api/rate-limit-test', () => {
            attemptCount++;
            if (attemptCount === 1) {
              return HttpResponse.json(
                {
                  correlationId: 'test-id',
                  error: {
                    code: 'RATE_LIMITED',
                    message: 'Too many requests',
                    retryable: true,
                    retryAfterSeconds: 1, // Use short delay for test
                  },
                  timestamp: new Date().toISOString(),
                  path: '/api/rate-limit-test',
                },
                { status: 429 }
              );
            }
            return HttpResponse.json({ success: true });
          })
        );

        const result = await client.get('/api/rate-limit-test');
        expect(result).toEqual({ success: true });
        expect(attemptCount).toBe(2); // Should retry once after rate limit
      }, 10000);
    });

    describe('ApiError class', () => {
      it('constructs ApiError with all properties', async () => {
        const mockErrorResponse = {
          correlationId: 'test-correlation-id',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: 'Field X is required',
            retryable: false,
            supportContact: 'support@example.com',
            validationErrors: { email: ['Invalid email format'] },
            retryAfterSeconds: 60,
          },
          timestamp: '2024-01-01T00:00:00Z',
          path: '/api/test',
          traceId: 'trace-123',
        };

        server.use(
          http.get('*/api/error-test', () => {
            return HttpResponse.json(mockErrorResponse, { status: 400 });
          })
        );

        try {
          await client.get('/api/error-test');
          fail('Should have thrown ApiError');
        } catch (error: any) {
          expect(error.name).toBe('ApiError');
          expect(error.message).toBe('Invalid input');
          expect(error.statusCode).toBe(400);
          expect(error.correlationId).toBe('test-correlation-id');
          expect(error.errorCode).toBe('VALIDATION_ERROR');
          expect(error.isRetryable).toBe(false);
          expect(error.supportContact).toBe('support@example.com');
          expect(error.validationErrors).toEqual({ email: ['Invalid email format'] });
          expect(error.retryAfterSeconds).toBe(60);
          expect(error.path).toBe('/api/test');
          expect(error.traceId).toBe('trace-123');
        }
      });
    });

    describe('Non-JSON Error Handling (BUG-002)', () => {
      it('handles HTML error responses without raw HTML in message', async () => {
        server.use(
          http.get('*/api/html-error', () => {
            return new HttpResponse('<!DOCTYPE html><html><body><h1>500 Internal Server Error</h1></body></html>', {
              status: 500,
              headers: { 'Content-Type': 'text/html' },
            });
          })
        );

        try {
          await client.get('/api/html-error');
          fail('Should have thrown error');
        } catch (error: any) {
          expect(error.message).toBe('Server error (500). Please try again later.');
          expect(error.message).not.toContain('<!DOCTYPE');
          expect(error.message).not.toContain('<html>');
        }
      });

      it('handles empty error response with fallback message', async () => {
        server.use(
          http.get('*/api/empty-error', () => {
            return new HttpResponse('', {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            });
          })
        );

        try {
          await client.get('/api/empty-error');
          fail('Should have thrown error');
        } catch (error: any) {
          expect(error.message).toContain('HTTP 500');
        }
      });

      it('handles text/plain error responses', async () => {
        server.use(
          http.get('*/api/text-error', () => {
            return new HttpResponse('Plain text error message', {
              status: 400,
              headers: { 'Content-Type': 'text/plain' },
            });
          })
        );

        try {
          await client.get('/api/text-error');
          fail('Should have thrown error');
        } catch (error: any) {
          expect(error.message).toBe('Plain text error message');
        }
      });
    });

    describe('Successful Response Handling', () => {
      it('handles 204 No Content responses', async () => {
        server.use(
          http.delete('*/api/items/123', () => {
            return new HttpResponse(null, { status: 204 });
          })
        );

        const result = await client.delete('/api/items/123');
        expect(result).toEqual({});
      });

      it('handles empty JSON responses', async () => {
        server.use(
          http.get('*/api/empty', () => {
            return new HttpResponse('', {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          })
        );

        const result = await client.get('/api/empty');
        expect(result).toEqual({});
      });
    });
  });
});
