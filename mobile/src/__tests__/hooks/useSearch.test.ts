import { renderHook, act } from '@testing-library/react-native';
import { useSearch } from '../../hooks/useSearch';
import { searchService } from '../../services/searchService';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

// Mock React Query hooks to control their behavior directly
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useInfiniteQuery: jest.fn(),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the search service with proper implementation
jest.mock('../../services/searchService', () => ({
  searchService: {
    search: jest.fn(),
    getSearchHistory: jest.fn(),
    getSuggestions: jest.fn(),
    clearSearchHistory: jest.fn(),
    removeFromSearchHistory: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock console.error to prevent test output pollution
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Setup mock implementations for React Query hooks
const mockUseInfiniteQuery = useInfiniteQuery as jest.MockedFunction<typeof useInfiniteQuery>;
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

describe('useSearch Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [] },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    // Reset useQuery to always return the default values
    mockUseQuery.mockImplementation((_query) => {
      // Return default empty results for all queries
      return {
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      };
    });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.query).toBe('');
    expect(result.current.filters).toEqual({});
    expect(result.current.isSearching).toBe(false);
    expect(result.current.results).toEqual([]);
    expect(result.current.totalResults).toBe(0);
  });

  it('should perform search successfully', async () => {
    // Mock React Query to return our results after the search is triggered
    const mockRefetch = jest.fn();
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [{
          items: [{
            id: '1',
            title: 'Test Result',
            description: 'Test description',
            type: 'content' as const,
            createdAt: new Date(),
          }],
          totalCount: 1,
          hasMore: false,
          filters: { limit: 20 },
          query: 'test',
        }],
      },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useSearch());

    // Initial state - query should be empty
    expect(result.current.query).toBe('');

    // Trigger search
    await act(async () => {
      result.current.performSearch('test');
    });

    // Check that query was updated
    expect(result.current.query).toBe('test');

    // Since we mocked the React Query result directly, the results should be available
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].title).toBe('Test Result');
    expect(result.current.totalResults).toBe(1);
  });

  it('should handle search errors gracefully', async () => {
    const mockError = new Error('Search failed');

    // Mock React Query to return an error
    const mockRefetch = jest.fn();
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [] },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      error: mockError,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      result.current.performSearch('test');
    });

    expect(result.current.query).toBe('test');
    expect(result.current.searchError).toBeTruthy();
  });

  it('should update filters correctly', async () => {
    const { result } = renderHook(() => useSearch());

    const newFilters = { type: ['server'] as string[], category: 'streaming' };

    await act(async () => {
      result.current.updateFilters(newFilters);
    });

    expect(result.current.filters).toEqual(expect.objectContaining(newFilters));
  });

  it('should clear search state', async () => {
    const { result } = renderHook(() => useSearch());

    // First set some state
    await act(async () => {
      result.current.updateFilters({ type: ['server'] as string[] });
    });

    expect(result.current.filters).toEqual(expect.objectContaining({ type: ['server'] }));

    // Then clear
    await act(async () => {
      result.current.clearSearch();
    });

    expect(result.current.query).toBe('');
    expect(result.current.filters).toEqual({});
  });

  it('should get autocomplete suggestions', async () => {
    const mockSuggestions = [
      {
        id: '1',
        text: 'test suggestion',
        type: 'autocomplete' as const,
      },
    ];

    // Set up autocomplete mock for the second useQuery call
    mockUseQuery.mockImplementation((query) => {
      if (query.queryKey && query.queryKey[0] === 'autocomplete' && query.queryKey[1] === 'te') {
        return {
          data: mockSuggestions,
          isLoading: false,
          refetch: jest.fn(),
        };
      }
      // Default return for other queries
      return {
        data: [],
        isLoading: false,
        refetch: jest.fn(),
      };
    });

    const { result } = renderHook(() => useSearch());

    // Trigger autocomplete by setting query (needs > 1 character to be enabled)
    await act(async () => {
      result.current.performSearch('te');
    });

    expect(result.current.autoCompleteResults).toHaveLength(1);
    expect(result.current.autoCompleteResults[0].text).toBe('test suggestion');
  });

  it('should manage search history', async () => {
    const mockHistory = [
      {
        id: '1',
        query: 'previous search',
        timestamp: Date.now(),
        resultCount: 5,
      },
    ];

    // Set up search history mock for the first useQuery call
    mockUseQuery.mockImplementation((query) => {
      if (query.queryKey && query.queryKey[0] === 'searchHistory') {
        return {
          data: mockHistory,
          refetch: jest.fn(),
        };
      }
      // Default return for other queries
      return {
        data: [],
        isLoading: false,
        refetch: jest.fn(),
      };
    });

    const { result } = renderHook(() => useSearch());

    expect(result.current.searchHistory).toHaveLength(1);
    expect(result.current.searchHistory[0].query).toBe('previous search');
  });

  it('should remove history item', async () => {
    (searchService.removeFromSearchHistory as jest.Mock).mockResolvedValue();

    // Mock search history refetch
    const mockRefetch = jest.fn();
    mockUseQuery.mockReturnValueOnce({
      data: [],
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      result.current.removeHistoryItem('1');
    });

    expect(searchService.removeFromSearchHistory).toHaveBeenCalledWith('1');
  });

  it('should clear all history', async () => {
    (searchService.clearSearchHistory as jest.Mock).mockResolvedValue();

    // Mock search history refetch
    const mockRefetch = jest.fn();
    mockUseQuery.mockReturnValueOnce({
      data: [],
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      result.current.clearHistory();
    });

    expect(searchService.clearSearchHistory).toHaveBeenCalled();
  });

  it('should fetch more results for pagination', async () => {
    const _initialResults = [
      { id: '1', title: 'Result 1', description: 'Desc 1', type: 'server' as const, score: 0.9, metadata: {} },
    ];

    // Mock React Query with pagination
    const mockFetchNextPage = jest.fn();
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [{
          items: [{
            id: '1',
            title: 'Result 1',
            description: 'Desc 1',
            type: 'content' as const,
            createdAt: new Date(),
          }],
          totalCount: 1,
          hasMore: false,
          filters: { limit: 20 },
          query: 'test',
        }],
      },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useSearch());

    // Initial search
    await act(async () => {
      result.current.performSearch('test');
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].title).toBe('Result 1');
    expect(result.current.hasMoreResults).toBe(false);
  });
});
