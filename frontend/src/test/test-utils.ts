/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test Utilities
 * Shared testing helpers and mocks for frontend tests
 */

/**
 * Creates a properly mocked Response object with all required methods
 * Fixes: "originalResponse.clone is not a function" errors in tests
 *
 * @param data - The data to return from response.json()
 * @param init - Optional Response initialization options
 * @returns A mocked Response object with clone() support
 */
export function createMockResponse<T = any>(
  data: T,
  init: ResponseInit = { status: 200, statusText: 'OK' }
): Response {
  const jsonData = JSON.stringify(data);

  // Create a proper Response object that includes clone()
  const response = new Response(jsonData, {
    status: init.status || 200,
    statusText: init.statusText || 'OK',
    headers: init.headers || { 'Content-Type': 'application/json' },
  });

  return response;
}

/**
 * Creates a mocked fetch function that returns a Response with proper clone() support
 *
 * @param data - The data to return from the fetch
 * @param init - Optional Response initialization options
 * @returns A mocked fetch function
 */
export function createMockFetch<T = any>(
  data: T,
  init?: ResponseInit
): jest.Mock {
  const mockFetch = jest.fn();
  mockFetch.mockResolvedValue(createMockResponse(data, init));
  return mockFetch;
}

/**
 * Creates a mocked fetch function that returns an error
 *
 * @param error - The error to throw
 * @returns A mocked fetch function that rejects
 */
export function createMockFetchError(error: Error | string): jest.Mock {
  const mockFetch = jest.fn();
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  mockFetch.mockRejectedValue(errorObj);
  return mockFetch;
}

/**
 * Creates a mocked fetch function that returns multiple responses in sequence
 * Useful for testing pagination, retry logic, etc.
 *
 * @param responses - Array of data objects to return in sequence
 * @param init - Optional Response initialization options
 * @returns A mocked fetch function
 */
export function createMockFetchSequence<T = any>(
  responses: T[],
  init?: ResponseInit
): jest.Mock {
  const mockFetch = jest.fn();

  responses.forEach((data, index) => {
    if (index === 0) {
      mockFetch.mockResolvedValueOnce(createMockResponse(data, init));
    } else {
      mockFetch.mockResolvedValueOnce(createMockResponse(data, init));
    }
  });

  return mockFetch;
}
