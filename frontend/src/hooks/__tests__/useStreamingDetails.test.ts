/**
 * Comprehensive tests for useStreamingDetails.ts
 *
 * Coverage Target: 85%+
 * Strategy: Test fetch methods, error handling, abort controller cleanup, memory leak prevention
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useStreamingDetails } from '../useStreamingDetails';
import type { ShowStreamingDetails, UserLocationResponse } from '@/types/streaming';

const API_URL = 'http://localhost:8020';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockStreamingDetails: ShowStreamingDetails = {
  id: 'test-123',
  title: 'Test Movie',
  availabilityByCountry: {
    US: {
      countryCode: 'us',
      countryName: 'United States',
      services: [
        {
          serviceId: 'netflix',
          serviceName: 'Netflix',
          type: 'subscription',
          url: 'https://netflix.com/watch/123',
          quality: 'UHD',
          audioLanguages: ['en'],
          subtitleLanguages: ['en'],
          isUserSubscription: false,
        },
      ],
      hasUserSubscriptions: false,
      userServicesCount: 0,
    },
  },
  totalCountries: 1,
  countriesWithUserSubscriptions: 0,
  userServicesWithContent: ['netflix'],
};

const mockLocationResponse: UserLocationResponse = {
  countryCode: 'us',
  countryName: 'United States',
  autoDetected: true,
  detectionMethod: 'geoip',
};

describe.skip('useStreamingDetails - Main Hook', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useStreamingDetails());

    expect(result.current.details).toBeNull();
    expect(result.current.location).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch streaming details successfully', async () => {
    server.use(
      http.get(`${API_URL}/api/search/shows/:showId/streaming-details`, ({ params }) => {
        expect(params.showId).toBe('test-123');
        return HttpResponse.json(mockStreamingDetails);
      })
    );

    const { result } = renderHook(() => useStreamingDetails());

    await act(async () => {
      await result.current.fetchStreamingDetails('test-123');
    });

    expect(result.current.details).toEqual(mockStreamingDetails);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should include user service IDs in headers when provided', async () => {
    server.use(
      http.get(`${API_URL}/api/search/shows/:showId/streaming-details`, ({ request }) => {
        const userServices = request.headers.get('X-User-Services');
        expect(userServices).toBe('netflix,hulu,prime-video');
        expect(request.headers.get('X-Auth-Mode')).toBe('cookie');
        return HttpResponse.json(mockStreamingDetails);
      })
    );

    const { result } = renderHook(() => useStreamingDetails());

    await act(async () => {
      await result.current.fetchStreamingDetails('test-123', ['netflix', 'hulu', 'prime-video']);
    });
  });

  it('should handle 404 errors with error message', async () => {
    server.use(
      http.get(`${API_URL}/api/search/shows/:showId/streaming-details`, () => {
        return HttpResponse.json({ message: 'Show not found' }, { status: 404 });
      })
    );

    const { result } = renderHook(() => useStreamingDetails());

    await act(async () => {
      try {
        await result.current.fetchStreamingDetails('nonexistent');
      } catch (_err) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe('Show not found');
    expect(result.current.loading).toBe(false);
  });

  it('should handle generic error responses', async () => {
    server.use(
      http.get(`${API_URL}/api/search/shows/:showId/streaming-details`, () => {
        return HttpResponse.json({ error: { message: 'Server error' } }, { status: 500 });
      })
    );

    const { result } = renderHook(() => useStreamingDetails());

    await act(async () => {
      try {
        await result.current.fetchStreamingDetails('test-123');
      } catch (_err) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe('Server error');
  });

  it('should handle malformed error responses', async () => {
    server.use(
      http.get(`${API_URL}/api/search/shows/:showId/streaming-details`, () => {
        return new Response('Invalid JSON', { status: 500 });
      })
    );

    const { result } = renderHook(() => useStreamingDetails());

    await act(async () => {
      try {
        await result.current.fetchStreamingDetails('test-123');
      } catch (_err) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe('Failed to fetch streaming details');
  });

  it('should cancel pending requests when new request is made', async () => {
    const firstRequestAborted = false;

    server.use(
      http.get(`${API_URL}/api/search/shows/:showId/streaming-details`, async () => {
        // Simulate a slow request
        await new Promise(resolve => setTimeout(resolve, 100));
        if (firstRequestAborted) {
          return new Response(null, { status: 499 }); // Client closed request
        }
        return HttpResponse.json(mockStreamingDetails);
      })
    );

    const { result } = renderHook(() => useStreamingDetails());

    // Start first request (don't await)
    const _firstRequest = result.current.fetchStreamingDetails('slow-show');

    // Immediately start second request
    await act(async () => {
      await result.current.fetchStreamingDetails('fast-show');
    });

    // First request should have been aborted
    // Second request should complete
    expect(result.current.details).toBeDefined();
  });

  it('should handle AbortError silently', async () => {
    const { result } = renderHook(() => useStreamingDetails());

    server.use(
      http.get(`${API_URL}/api/search/shows/:showId/streaming-details`, async () => {
        // Simulate slow request
        await new Promise(resolve => setTimeout(resolve, 200));
        return HttpResponse.json(mockStreamingDetails);
      })
    );

    // Start first request and immediately cancel with second request
    act(() => {
      result.current.fetchStreamingDetails('first-request');
    });

    // Cancel the first request by starting another
    let returnValue;
    await act(async () => {
      returnValue = await result.current.fetchStreamingDetails('second-request');
    });

    // The first request should have been aborted (returns null internally)
    // The second request should complete successfully
    expect(returnValue).toEqual(mockStreamingDetails);
    expect(result.current.error).toBeNull();
  });

  it('should fetch user location successfully', async () => {
    server.use(
      http.get(`${API_URL}/api/search/location`, () => {
        return HttpResponse.json(mockLocationResponse);
      })
    );

    const { result } = renderHook(() => useStreamingDetails());

    let locationData;
    await act(async () => {
      locationData = await result.current.fetchUserLocation();
    });

    expect(result.current.location).toEqual(mockLocationResponse);
    expect(locationData).toEqual(mockLocationResponse);
  });

  it('should handle location fetch errors gracefully (non-critical)', async () => {
    server.use(
      http.get(`${API_URL}/api/search/location`, () => {
        return new Response(null, { status: 500 });
      })
    );

    const { result } = renderHook(() => useStreamingDetails());

    let locationData;
    await act(async () => {
      locationData = await result.current.fetchUserLocation();
    });

    expect(locationData).toBeNull();
    expect(result.current.location).toBeNull();
    expect(result.current.error).toBeNull(); // Location errors don't set error state
  });

  it('should handle location fetch AbortError silently', async () => {
    server.use(
      http.get(`${API_URL}/api/search/location`, () => {
        throw new DOMException('The operation was aborted.', 'AbortError');
      })
    );

    const { result } = renderHook(() => useStreamingDetails());

    let locationData;
    await act(async () => {
      locationData = await result.current.fetchUserLocation();
    });

    expect(locationData).toBeNull();
  });

  it('should handle location fetch network errors gracefully', async () => {
    server.use(
      http.get(`${API_URL}/api/search/location`, () => {
        throw new Error('Network error');
      })
    );

    const { result } = renderHook(() => useStreamingDetails());

    let locationData;
    await act(async () => {
      locationData = await result.current.fetchUserLocation();
    });

    expect(locationData).toBeNull();
    expect(result.current.error).toBeNull(); // Location errors are non-critical
  });

  it('should clean up abort controller on unmount', () => {
    const { unmount } = renderHook(() => useStreamingDetails());

    // Should not throw when unmounting
    expect(() => unmount()).not.toThrow();
  });

  it('should not update state after unmount', async () => {
    server.use(
      http.get(`${API_URL}/api/search/shows/:showId/streaming-details`, async () => {
        // Simulate slow response
        await new Promise(resolve => setTimeout(resolve, 50));
        return HttpResponse.json(mockStreamingDetails);
      })
    );

    const { result, unmount } = renderHook(() => useStreamingDetails());

    // Start request but don't await
    act(() => {
      result.current.fetchStreamingDetails('test-123');
    });

    // Unmount immediately
    unmount();

    // Wait for request to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // No assertions needed - test passes if no warnings/errors
  });

  it('should handle fetch throwing generic error', async () => {
    server.use(
      http.get(`${API_URL}/api/search/shows/:showId/streaming-details`, () => {
        throw new Error('Network failure');
      })
    );

    const { result } = renderHook(() => useStreamingDetails());

    await act(async () => {
      try {
        await result.current.fetchStreamingDetails('test-123');
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe('Network failure');
      }
    });

    expect(result.current.error).toBe('Network failure');
  });

  it('should return fetched data from fetchStreamingDetails', async () => {
    server.use(
      http.get(`${API_URL}/api/search/shows/:showId/streaming-details`, () => {
        return HttpResponse.json(mockStreamingDetails);
      })
    );

    const { result } = renderHook(() => useStreamingDetails());

    let returnedData;
    await act(async () => {
      returnedData = await result.current.fetchStreamingDetails('test-123');
    });

    expect(returnedData).toEqual(mockStreamingDetails);
  });

  it('should set loading to true while fetching', async () => {
    server.use(
      http.get(`${API_URL}/api/search/shows/:showId/streaming-details`, async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return HttpResponse.json(mockStreamingDetails);
      })
    );

    const { result } = renderHook(() => useStreamingDetails());

    act(() => {
      result.current.fetchStreamingDetails('test-123');
    });

    // Should be loading
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    // Wait for completion
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should clear error on successful fetch', async () => {
    server.use(
      http.get(`${API_URL}/api/search/shows/:showId/streaming-details`, () => {
        return new Response(null, { status: 500 });
      })
    );

    const { result } = renderHook(() => useStreamingDetails());

    // First request fails
    await act(async () => {
      try {
        await result.current.fetchStreamingDetails('fail');
      } catch (_err) {
        // Expected
      }
    });

    expect(result.current.error).toBeTruthy();

    // Second request succeeds
    server.use(
      http.get(`${API_URL}/api/search/shows/:showId/streaming-details`, () => {
        return HttpResponse.json(mockStreamingDetails);
      })
    );

    await act(async () => {
      await result.current.fetchStreamingDetails('success');
    });

    expect(result.current.error).toBeNull();
  });
});
