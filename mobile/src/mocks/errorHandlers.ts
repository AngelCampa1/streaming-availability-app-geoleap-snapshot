/**
 * MSW Error Handlers for Testing Error Scenarios
 *
 * These handlers can be used to override default handlers and test
 * how the application handles various error conditions like network
 * failures, server errors, authentication issues, etc.
 *
 * Usage in tests:
 *
 *   import { server } from '../mocks/server';
 *   import { networkErrorHandlers, serverErrorHandlers } from '../mocks/errorHandlers';
 *
 *   test('handles network error gracefully', async () => {
 *     server.use(...networkErrorHandlers);
 *     // ... test code that should handle network errors
 *   });
 *
 * @see https://mswjs.io/docs/api/setup-server/use
 */

import { http, HttpResponse, delay } from 'msw';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.geoleap.app';

// ============================================================================
// Network Error Handlers
// ============================================================================

/**
 * Simulates network connectivity issues (e.g., offline, DNS failure)
 */
export const networkErrorHandlers = [
  http.all('*', () => {
    return HttpResponse.error();
  }),
];

/**
 * Handler that simulates a network error for a specific endpoint
 */
export function createNetworkErrorHandler(path: string, method: 'get' | 'post' | 'put' | 'delete' | 'patch' = 'get') {
  const httpMethod = http[method];
  return httpMethod(`${BASE_URL}${path}`, () => {
    return HttpResponse.error();
  });
}

// ============================================================================
// Server Error Handlers (5xx)
// ============================================================================

/**
 * Simulates server errors (500 Internal Server Error)
 */
export const serverErrorHandlers = [
  http.all('*', async () => {
    await delay(100);
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal Server Error',
        },
      },
      { status: 500 }
    );
  }),
];

/**
 * Creates a 500 Internal Server Error handler for a specific endpoint
 */
export function createServerErrorHandler(path: string, method: 'get' | 'post' | 'put' | 'delete' | 'patch' = 'get') {
  const httpMethod = http[method];
  return httpMethod(`${BASE_URL}${path}`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Internal Server Error' },
      },
      { status: 500 }
    );
  });
}

/**
 * Creates a 502 Bad Gateway handler
 */
export function createBadGatewayHandler(path: string, method: 'get' | 'post' | 'put' | 'delete' | 'patch' = 'get') {
  const httpMethod = http[method];
  return httpMethod(`${BASE_URL}${path}`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Bad Gateway' },
      },
      { status: 502 }
    );
  });
}

/**
 * Creates a 503 Service Unavailable handler
 */
export function createServiceUnavailableHandler(path: string, method: 'get' | 'post' | 'put' | 'delete' | 'patch' = 'get') {
  const httpMethod = http[method];
  return httpMethod(`${BASE_URL}${path}`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Service Unavailable' },
      },
      { status: 503 }
    );
  });
}

/**
 * Creates a 504 Gateway Timeout handler
 */
export function createGatewayTimeoutHandler(path: string, method: 'get' | 'post' | 'put' | 'delete' | 'patch' = 'get') {
  const httpMethod = http[method];
  return httpMethod(`${BASE_URL}${path}`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        success: false,
        error: { code: 'TIMEOUT_ERROR', message: 'Gateway Timeout' },
      },
      { status: 504 }
    );
  });
}

// ============================================================================
// Authentication Error Handlers (401/403)
// ============================================================================

/**
 * Simulates authentication failures (401 Unauthorized)
 */
export const unauthorizedHandlers = [
  http.all('*', async () => {
    await delay(50);
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Unauthorized. Please log in again.',
        },
      },
      { status: 401 }
    );
  }),
];

/**
 * Creates a 401 Unauthorized handler for a specific endpoint
 */
export function createUnauthorizedHandler(path: string, method: 'get' | 'post' | 'put' | 'delete' | 'patch' = 'get') {
  const httpMethod = http[method];
  return httpMethod(`${BASE_URL}${path}`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        success: false,
        error: { code: 'AUTHENTICATION_ERROR', message: 'Unauthorized' },
      },
      { status: 401 }
    );
  });
}

/**
 * Simulates permission/authorization failures (403 Forbidden)
 */
export const forbiddenHandlers = [
  http.all('*', async () => {
    await delay(50);
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Access denied. You do not have permission to perform this action.',
        },
      },
      { status: 403 }
    );
  }),
];

/**
 * Creates a 403 Forbidden handler for a specific endpoint
 */
export function createForbiddenHandler(path: string, method: 'get' | 'post' | 'put' | 'delete' | 'patch' = 'get') {
  const httpMethod = http[method];
  return httpMethod(`${BASE_URL}${path}`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        success: false,
        error: { code: 'AUTHENTICATION_ERROR', message: 'Access forbidden' },
      },
      { status: 403 }
    );
  });
}

// ============================================================================
// Validation Error Handlers (400/422)
// ============================================================================

/**
 * Simulates validation errors (400 Bad Request)
 */
export const validationErrorHandlers = [
  http.all('*', async () => {
    await delay(50);
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed. Please check your input.',
          details: {
            fields: ['email', 'password'],
          },
        },
      },
      { status: 400 }
    );
  }),
];

/**
 * Creates a 400 Bad Request handler with custom validation errors
 */
export function createValidationErrorHandler(
  path: string,
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' = 'post',
  fieldErrors: Record<string, string> = {}
) {
  const httpMethod = http[method];
  return httpMethod(`${BASE_URL}${path}`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { fields: fieldErrors },
        },
      },
      { status: 400 }
    );
  });
}

/**
 * Creates a 422 Unprocessable Entity handler
 */
export function createUnprocessableEntityHandler(
  path: string,
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' = 'post',
  message: string = 'The request was well-formed but was unable to be followed due to semantic errors.'
) {
  const httpMethod = http[method];
  return httpMethod(`${BASE_URL}${path}`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message },
      },
      { status: 422 }
    );
  });
}

// ============================================================================
// Not Found Handlers (404)
// ============================================================================

/**
 * Simulates resource not found (404)
 */
export const notFoundHandlers = [
  http.all('*', async () => {
    await delay(50);
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found.',
        },
      },
      { status: 404 }
    );
  }),
];

/**
 * Creates a 404 Not Found handler for a specific endpoint
 */
export function createNotFoundHandler(path: string, method: 'get' | 'post' | 'put' | 'delete' | 'patch' = 'get') {
  const httpMethod = http[method];
  return httpMethod(`${BASE_URL}${path}`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resource not found' },
      },
      { status: 404 }
    );
  });
}

// ============================================================================
// Rate Limiting Handlers (429)
// ============================================================================

/**
 * Simulates rate limiting (429 Too Many Requests)
 */
export const rateLimitHandlers = [
  http.all('*', async () => {
    await delay(50);
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT',
          message: 'Too many requests. Please try again later.',
        },
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60),
        },
      }
    );
  }),
];

/**
 * Creates a 429 Rate Limit handler for a specific endpoint
 */
export function createRateLimitHandler(path: string, method: 'get' | 'post' | 'put' | 'delete' | 'patch' = 'get', retryAfterSeconds: number = 60) {
  const httpMethod = http[method];
  return httpMethod(`${BASE_URL}${path}`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Too many requests' },
      },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSeconds) },
      }
    );
  });
}

// ============================================================================
// Timeout/Slow Response Handlers
// ============================================================================

/**
 * Simulates very slow responses (for timeout testing)
 * Default delay is 30 seconds - longer than most request timeouts
 */
export function createSlowResponseHandler(
  path: string,
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' = 'get',
  delayMs: number = 30000
) {
  const httpMethod = http[method];
  return httpMethod(`${BASE_URL}${path}`, async () => {
    await delay(delayMs);
    return HttpResponse.json({ success: true, data: {} });
  });
}

/**
 * All slow response handlers (for timeout testing across all endpoints)
 */
export const slowResponseHandlers = [
  http.all('*', async () => {
    await delay(30000); // 30 second delay
    return HttpResponse.json({ success: true, data: {} });
  }),
];

// ============================================================================
// Empty Response Handlers
// ============================================================================

/**
 * Returns empty data (for testing empty state handling)
 */
export const emptyResponseHandlers = [
  http.get(`${BASE_URL}/api/watchlist`, async () => {
    await delay(50);
    return HttpResponse.json({
      success: true,
      data: { watchlists: [] },
    });
  }),

  http.get(`${BASE_URL}/api/streaming/search`, async () => {
    await delay(50);
    return HttpResponse.json({
      results: [],
      pagination: {
        page: 1,
        totalPages: 0,
        totalResults: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        pageSize: 20,
      },
      queryTime: 50,
    });
  }),

  http.get(`${BASE_URL}/recommendations`, async () => {
    await delay(50);
    return HttpResponse.json({
      success: true,
      data: [],
    });
  }),
];

// ============================================================================
// Partial/Malformed Response Handlers
// ============================================================================

/**
 * Returns malformed JSON (for testing JSON parsing error handling)
 */
export const malformedJsonHandlers = [
  http.all('*', async () => {
    await delay(50);
    return new HttpResponse('{ invalid json', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
];

/**
 * Returns HTML instead of JSON (for testing content-type error handling)
 */
export const wrongContentTypeHandlers = [
  http.all('*', async () => {
    await delay(50);
    return new HttpResponse('<html><body>Error Page</body></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }),
];

// ============================================================================
// Auth-Specific Error Handlers
// ============================================================================

/**
 * Login-specific errors for testing auth flows
 */
export const authErrorHandlers = {
  invalidCredentials: http.post(`${BASE_URL}/api/auth/login`, async () => {
    await delay(100);
    return HttpResponse.json(
      {
        success: false,
        error: { code: 'AUTHENTICATION_ERROR', message: 'Invalid email or password' },
      },
      { status: 401 }
    );
  }),

  accountLocked: http.post(`${BASE_URL}/api/auth/login`, async () => {
    await delay(100);
    return HttpResponse.json(
      {
        success: false,
        error: { code: 'AUTHENTICATION_ERROR', message: 'Account is locked. Please contact support.' },
      },
      { status: 403 }
    );
  }),

  emailNotVerified: http.post(`${BASE_URL}/api/auth/login`, async () => {
    await delay(100);
    return HttpResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Please verify your email before logging in.' },
      },
      { status: 403 }
    );
  }),

  expiredToken: http.post(`${BASE_URL}/api/auth/refresh`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        success: false,
        error: { code: 'AUTHENTICATION_ERROR', message: 'Refresh token has expired' },
      },
      { status: 401 }
    );
  }),
};

// ============================================================================
// Export convenience collections
// ============================================================================

export const errorHandlerCollections = {
  network: networkErrorHandlers,
  server: serverErrorHandlers,
  unauthorized: unauthorizedHandlers,
  forbidden: forbiddenHandlers,
  validation: validationErrorHandlers,
  notFound: notFoundHandlers,
  rateLimit: rateLimitHandlers,
  slow: slowResponseHandlers,
  empty: emptyResponseHandlers,
  malformedJson: malformedJsonHandlers,
  wrongContentType: wrongContentTypeHandlers,
};

export default errorHandlerCollections;
