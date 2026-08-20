/**
 * Comprehensive tests for search-prefetch.ts
 *
 * Coverage Target: 90%+
 * Strategy: Test React Query prefetching strategies with mock QueryClient
 */

import { QueryClient } from '@tanstack/react-query';
import {
  prefetchSearchOnHover,
  prefetchNextPage,
  warmSearchCache,
  invalidateSearchCache,
  clearSearchCache,
} from '../search-prefetch';
import { searchGlobalContent } from '@/lib/api';
import { GlobalSearchRequest } from '@/lib/types/paywall';

// Mock the API
jest.mock('@/lib/api', () => ({
  searchGlobalContent: jest.fn(),
}));

describe('prefetchSearchOnHover', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  it('prefetches search results', () => {
    const request: GlobalSearchRequest = {
      query: 'action movies',
      page: 1,
      pageSize: 10,
    };

    const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');

    prefetchSearchOnHover(request, queryClient);

    expect(prefetchSpy).toHaveBeenCalledWith({
      queryKey: ['search', 'action movies', request],
      queryFn: expect.any(Function),
      staleTime: 5 * 60 * 1000,
    });
  });

  it('does not prefetch if data already cached', () => {
    const request: GlobalSearchRequest = {
      query: 'cached query',
      page: 1,
      pageSize: 10,
    };

    // Pre-populate cache
    queryClient.setQueryData(['search', 'cached query', request], { results: [] });

    const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');

    prefetchSearchOnHover(request, queryClient);

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  it('calls searchGlobalContent when query function executes', async () => {
    const request: GlobalSearchRequest = {
      query: 'test',
      page: 1,
      pageSize: 10,
    };

    const mockResults = { results: [{ id: '1', title: 'Movie 1' }] };
    (searchGlobalContent as jest.Mock).mockResolvedValue(mockResults);

    const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');

    prefetchSearchOnHover(request, queryClient);

    // Get the queryFn that was passed
    const call = prefetchSpy.mock.calls[0][0];
    const mockContext = {
      queryKey: ['search', 'test', request] as const,
      signal: new AbortController().signal,
      meta: undefined,
      client: queryClient
    };
    const result = typeof call.queryFn === 'function' ? await call.queryFn(mockContext) : null;

    expect(searchGlobalContent).toHaveBeenCalledWith(request);
    expect(result).toEqual(mockResults);
  });

  it('handles queries with filters', () => {
    const request: GlobalSearchRequest = {
      query: 'movies',
      page: 1,
      pageSize: 10,
      genres: ['Action', 'Adventure'],
      yearFrom: 2020,
    };

    const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');

    prefetchSearchOnHover(request, queryClient);

    expect(prefetchSpy).toHaveBeenCalledWith({
      queryKey: ['search', 'movies', request],
      queryFn: expect.any(Function),
      staleTime: 5 * 60 * 1000,
    });
  });
});

describe('prefetchNextPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  it('prefetches next page of results', () => {
    const currentRequest: GlobalSearchRequest = {
      query: 'movies',
      page: 1,
      pageSize: 20,
    };

    const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');

    prefetchNextPage(currentRequest, queryClient);

    expect(prefetchSpy).toHaveBeenCalledWith({
      queryKey: ['search', 'movies', { ...currentRequest, page: 2 }],
      queryFn: expect.any(Function),
      staleTime: 5 * 60 * 1000,
    });
  });

  it('handles request without page number', () => {
    const currentRequest: GlobalSearchRequest = {
      query: 'test',
      pageSize: 10,
    };

    const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');

    prefetchNextPage(currentRequest, queryClient);

    // Should prefetch page 2 (1 + 1) since undefined is treated as 1
    const call = prefetchSpy.mock.calls[0][0];
    expect(call.queryKey).toEqual(['search', 'test', { ...currentRequest, page: 2 }]);
  });

  it('preserves all filters when prefetching next page', () => {
    const currentRequest: GlobalSearchRequest = {
      query: 'action',
      page: 3,
      pageSize: 15,
      genres: ['Action'],
      yearFrom: 2020,
      yearTo: 2024,
    };

    const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');

    prefetchNextPage(currentRequest, queryClient);

    const nextRequest = {
      ...currentRequest,
      page: 4,
    };

    expect(prefetchSpy).toHaveBeenCalledWith({
      queryKey: ['search', 'action', nextRequest],
      queryFn: expect.any(Function),
      staleTime: 5 * 60 * 1000,
    });
  });

  it('calls searchGlobalContent with next page', async () => {
    const currentRequest: GlobalSearchRequest = {
      query: 'test',
      page: 2,
      pageSize: 10,
    };

    const mockResults = { results: [], page: 3 };
    (searchGlobalContent as jest.Mock).mockResolvedValue(mockResults);

    const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');

    prefetchNextPage(currentRequest, queryClient);

    const call = prefetchSpy.mock.calls[0][0];
    const nextRequest = { ...currentRequest, page: 3 };
    const mockContext = {
      queryKey: ['search', 'test', nextRequest] as const,
      signal: new AbortController().signal,
      meta: undefined,
      client: queryClient
    };
    if (typeof call.queryFn === 'function') {
      await call.queryFn(mockContext);
    }

    expect(searchGlobalContent).toHaveBeenCalledWith({
      ...currentRequest,
      page: 3,
    });
  });
});

describe('warmSearchCache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  it('prefetches multiple popular queries', () => {
    const popularQueries = ['action movies', 'comedy', 'thriller'];

    const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');

    warmSearchCache(popularQueries, queryClient);

    expect(prefetchSpy).toHaveBeenCalledTimes(3);
    expect(prefetchSpy).toHaveBeenCalledWith({
      queryKey: ['search', 'action movies', expect.any(Object)],
      queryFn: expect.any(Function),
      staleTime: 10 * 60 * 1000, // Longer stale time for popular searches
    });
  });

  it('uses standard request parameters for popular searches', () => {
    const popularQueries = ['popular'];

    const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');

    warmSearchCache(popularQueries, queryClient);

    const call = prefetchSpy.mock.calls[0][0];
    expect(call.queryKey[2]).toEqual({
      query: 'popular',
      page: 1,
      pageSize: 10,
    });
  });

  it('skips already cached queries', () => {
    const popularQueries = ['cached', 'not-cached'];

    // Pre-populate cache for 'cached'
    queryClient.setQueryData(['search', 'cached', { query: 'cached', page: 1, pageSize: 10 }], {
      results: [],
    });

    const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');

    warmSearchCache(popularQueries, queryClient);

    expect(prefetchSpy).toHaveBeenCalledTimes(1);
    expect(prefetchSpy).toHaveBeenCalledWith({
      queryKey: ['search', 'not-cached', expect.any(Object)],
      queryFn: expect.any(Function),
      staleTime: 10 * 60 * 1000,
    });
  });

  it('handles empty popular queries array', () => {
    const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');

    warmSearchCache([], queryClient);

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  it('uses longer stale time for popular searches', () => {
    const popularQueries = ['trending'];

    const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');

    warmSearchCache(popularQueries, queryClient);

    const call = prefetchSpy.mock.calls[0][0];
    expect(call.staleTime).toBe(10 * 60 * 1000); // 10 minutes
  });
});

describe('invalidateSearchCache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  it('invalidates cache for specific query', () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    invalidateSearchCache('action movies', queryClient);

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['search', 'action movies'],
    });
  });

  it('invalidates all pages of a query', () => {
    // Set up cache with multiple pages
    const query = 'movies';
    queryClient.setQueryData(['search', query, { query, page: 1 }], { results: [] });
    queryClient.setQueryData(['search', query, { query, page: 2 }], { results: [] });

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    invalidateSearchCache(query, queryClient);

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['search', query],
    });
  });

  it('does not affect other queries', () => {
    queryClient.setQueryData(['search', 'query1', { query: 'query1' }], { results: [] });
    queryClient.setQueryData(['search', 'query2', { query: 'query2' }], { results: [] });

    invalidateSearchCache('query1', queryClient);

    const _query1Data = queryClient.getQueryData(['search', 'query1', { query: 'query1' }]);
    const query2Data = queryClient.getQueryData(['search', 'query2', { query: 'query2' }]);

    // query1 should be invalidated (but data still exists until refetch)
    // query2 should not be affected
    expect(query2Data).toEqual({ results: [] });
  });
});

describe('clearSearchCache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  it('removes all search queries from cache', () => {
    queryClient.setQueryData(['search', 'query1', { query: 'query1' }], { results: [] });
    queryClient.setQueryData(['search', 'query2', { query: 'query2' }], { results: [] });
    queryClient.setQueryData(['other', 'data'], { value: 'test' });

    const removeSpy = jest.spyOn(queryClient, 'removeQueries');

    clearSearchCache(queryClient);

    expect(removeSpy).toHaveBeenCalledWith({
      queryKey: ['search'],
    });
  });

  it('preserves non-search queries', () => {
    queryClient.setQueryData(['search', 'movies', {}], { results: [] });
    queryClient.setQueryData(['user', 'profile'], { name: 'Test User' });
    queryClient.setQueryData(['watchlist', 'items'], { items: [] });

    clearSearchCache(queryClient);

    const userProfile = queryClient.getQueryData(['user', 'profile']);
    const watchlist = queryClient.getQueryData(['watchlist', 'items']);

    expect(userProfile).toEqual({ name: 'Test User' });
    expect(watchlist).toEqual({ items: [] });
  });

  it('removes multiple search queries at once', () => {
    // Populate cache with many search queries
    for (let i = 0; i < 10; i++) {
      queryClient.setQueryData(['search', `query${i}`, { query: `query${i}` }], { results: [] });
    }

    const removeSpy = jest.spyOn(queryClient, 'removeQueries');

    clearSearchCache(queryClient);

    expect(removeSpy).toHaveBeenCalledWith({
      queryKey: ['search'],
    });
  });

  it('handles empty cache gracefully', () => {
    const removeSpy = jest.spyOn(queryClient, 'removeQueries');

    expect(() => clearSearchCache(queryClient)).not.toThrow();

    expect(removeSpy).toHaveBeenCalledWith({
      queryKey: ['search'],
    });
  });
});

describe('Integration scenarios', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();

    (searchGlobalContent as jest.Mock).mockResolvedValue({
      results: [{ id: '1', title: 'Test Movie' }],
      totalResults: 100,
      page: 1,
    });
  });

  it('supports hover prefetch + next page prefetch workflow', () => {
    const request: GlobalSearchRequest = {
      query: 'action',
      page: 1,
      pageSize: 20,
    };

    const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');

    // User hovers over search suggestion
    prefetchSearchOnHover(request, queryClient);
    expect(prefetchSpy).toHaveBeenCalledTimes(1);

    // User views page 1, prefetch page 2
    prefetchNextPage(request, queryClient);
    expect(prefetchSpy).toHaveBeenCalledTimes(2);
  });

  it('supports cache warming + invalidation workflow', () => {
    const popularQueries = ['trending', 'new releases'];

    // Warm cache on app startup
    warmSearchCache(popularQueries, queryClient);

    // User performs an action that requires cache refresh
    invalidateSearchCache('trending', queryClient);

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    invalidateSearchCache('trending', queryClient);

    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('supports full cache reset', () => {
    // Populate various caches
    const request: GlobalSearchRequest = { query: 'test', page: 1, pageSize: 10 };
    prefetchSearchOnHover(request, queryClient);
    warmSearchCache(['popular'], queryClient);

    // User logs out, clear all search cache
    clearSearchCache(queryClient);

    const removeSpy = jest.spyOn(queryClient, 'removeQueries');
    clearSearchCache(queryClient);

    expect(removeSpy).toHaveBeenCalled();
  });
});
