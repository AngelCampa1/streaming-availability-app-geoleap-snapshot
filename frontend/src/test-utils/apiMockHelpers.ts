/**
 * API Mock Helpers for Tests
 *
 * Fixes TS2345 errors: Type mismatches in API mock return values
 *
 * Usage:
 * ```typescript
 * import { createSuccessResponse, mockApiSuccess } from '@/test-utils/apiMockHelpers';
 *
 * // Option 1: Create response directly
 * mockForgotPassword.mockResolvedValue(createSuccessResponse());
 *
 * // Option 2: Use helper
 * mockApiSuccess(mockForgotPassword);
 * ```
 */

// Import the actual ApiResponse from lib/api to match the real type
import type { ApiResponse } from '@/lib/api';

/**
 * Create a successful API response matching the lib/api ApiResponse type
 */
export function createSuccessResponse(message: string = 'Operation successful'): ApiResponse {
  return {
    message,
  };
}

/**
 * Create an error API response
 */
export function createErrorResponse(message: string): ApiResponse {
  return {
    message,
  };
}

/**
 * Mock an API function to return a success response
 */
export function mockApiSuccess(
  mockFn: jest.Mock,
  message?: string
): jest.Mock {
  return mockFn.mockResolvedValue(createSuccessResponse(message));
}

/**
 * Mock an API function to return an error response
 */
export function mockApiError(
  mockFn: jest.Mock,
  message: string
): jest.Mock {
  return mockFn.mockResolvedValue(createErrorResponse(message));
}

/**
 * Mock an API function to throw an error
 */
export function mockApiThrow(mockFn: jest.Mock, error: Error | string): jest.Mock {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  return mockFn.mockRejectedValue(errorObj);
}

/**
 * Create a mock fetch response for testing raw HTTP calls
 */
export function createMockFetchResponse(
  data: unknown,
  options: {
    ok?: boolean;
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {}
): Response {
  const { ok = true, status = 200, statusText = 'OK', headers = {} } = options;

  return {
    ok,
    status,
    statusText,
    headers: new Headers(headers),
    json: async () => data,
    text: async () => JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)]),
    arrayBuffer: async () => new ArrayBuffer(0),
    formData: async () => new FormData(),
    clone: function() { return this; },
    body: null,
    bodyUsed: false,
    redirected: false,
    type: 'basic',
    url: '',
  } as Response;
}

/**
 * Create a mock error fetch response
 */
export function createMockErrorResponse(
  status: number,
  statusText: string,
  errorData?: unknown
): Response {
  return createMockFetchResponse(errorData || { error: statusText }, {
    ok: false,
    status,
    statusText,
  });
}
