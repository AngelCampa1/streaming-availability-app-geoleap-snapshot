/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { render, fireEvent, waitFor, screen, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchScreen from '../../screens/search/SearchScreen';
import SearchResultsComponent from '../../components/search/SearchResultsComponent';

// Mock dependencies - most are already handled in jest.setup.js
jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.fn(({ renderItem, data, ...props }) => {
    const { FlatList } = jest.requireActual('react-native');
    const React = jest.requireActual('react');
    return React.createElement(FlatList, {
      ...props,
      data,
      renderItem,
      testID: 'flash-list',
    });
  }),
}));

// react-native-reanimated is already mocked in jest.setup.js

// Mock Alert
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock NetInfo for offline detection
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    addListener: mockAddListener,
  }),
}));

// Create a mock search hook for error scenarios
const createMockUseSearch = (errorScenario: string = 'none') => {
  const baseReturn = {
    query: '',
    filters: {},
    isSearching: false,
    results: [],
    totalResults: 0,
    hasMoreResults: false,
    isLoadingMore: false,
    autoCompleteResults: [],
    isLoadingAutoComplete: false,
    searchHistory: [],
    trendingSearches: [],
    clearSearch: jest.fn(),
    updateFilters: jest.fn(),
    fetchMoreResults: jest.fn(),
    clearHistory: jest.fn(),
    removeHistoryItem: jest.fn(),
    refetchResults: jest.fn(),
  };

  switch (errorScenario) {
    case 'network_error':
      return {
        ...baseReturn,
        performSearch: jest.fn().mockRejectedValue(new Error('Network request failed')),
        isSearching: false,
        results: [],
      };
    case 'timeout_error':
      return {
        ...baseReturn,
        performSearch: jest.fn().mockRejectedValue(new Error('Request timeout')),
        isSearching: false,
        results: [],
      };
    case 'server_error':
      return {
        ...baseReturn,
        performSearch: jest.fn().mockRejectedValue(new Error('Server error: 500')),
        isSearching: false,
        results: [],
      };
    case 'rate_limit_error':
      return {
        ...baseReturn,
        performSearch: jest.fn().mockRejectedValue(new Error('Rate limit exceeded')),
        isSearching: false,
        results: [],
      };
    case 'malformed_response':
      return {
        ...baseReturn,
        performSearch: jest.fn().mockResolvedValue({ invalid: 'response' }),
        isSearching: false,
        results: [],
      };
    case 'offline':
      return {
        ...baseReturn,
        performSearch: jest.fn().mockRejectedValue(new Error('No internet connection')),
        isSearching: false,
        results: [],
      };
    case 'partial_failure':
      return {
        ...baseReturn,
        performSearch: jest.fn().mockResolvedValue({}),
        results: [
          { id: '1', title: 'Working Result', type: 'content', createdAt: new Date() },
        ],
        totalResults: 1,
        fetchMoreResults: jest.fn().mockRejectedValue(new Error('Failed to load more')),
      };
    default:
      return {
        ...baseReturn,
        performSearch: jest.fn().mockResolvedValue({}),
      };
  }
};

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>,
  );
};

describe('Search Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Network Error Handling', () => {
    it('handles network connection failures gracefully', async () => {
      jest.doMock('../../hooks/useSearch', () => ({
        useSearch: () => createMockUseSearch('network_error'),
      }));

      const SearchScreenWithError = require('../../screens/search/SearchScreen').default;
      renderWithQueryClient(<SearchScreenWithError />);

      const searchInput = screen.getByPlaceholderText('Search content, users, channels...');

      await act(async () => {
        fireEvent.changeText(searchInput, 'test query');
        fireEvent(searchInput, 'submitEditing');
      });

      // Should show network error message
      await waitFor(() => {
        expect(screen.getByText(/Network request failed/)).toBeTruthy();
      });
    });

    it('displays user-friendly error messages for network issues', async () => {
      jest.doMock('../../hooks/useSearch', () => ({
        useSearch: () => createMockUseSearch('network_error'),
      }));

      const SearchScreenWithError = require('../../screens/search/SearchScreen').default;
      renderWithQueryClient(<SearchScreenWithError />);

      const searchInput = screen.getByPlaceholderText('Search content, users, channels...');

      await act(async () => {
        fireEvent.changeText(searchInput, 'network test');
        fireEvent(searchInput, 'submitEditing');
      });

      await waitFor(() => {
        const errorMessage = screen.getByText(/Unable to connect/);
        expect(errorMessage).toBeTruthy();
      });
    });

    it('provides retry functionality for failed requests', async () => {
      const mockPerformSearch = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ results: [] });

      jest.doMock('../../hooks/useSearch', () => ({
        useSearch: () => ({
          ...createMockUseSearch('network_error'),
          performSearch: mockPerformSearch,
        }),
      }));

      const SearchScreenWithError = require('../../screens/search/SearchScreen').default;
      renderWithQueryClient(<SearchScreenWithError />);

      const searchInput = screen.getByPlaceholderText('Search content, users, channels...');

      // First attempt fails
      await act(async () => {
        fireEvent.changeText(searchInput, 'retry test');
        fireEvent(searchInput, 'submitEditing');
      });

      // Should show retry button
      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        fireEvent.press(retryButton);
      });

      // Second attempt should succeed
      expect(mockPerformSearch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Timeout Error Handling', () => {
    it('handles request timeouts appropriately', async () => {
      jest.doMock('../../hooks/useSearch', () => ({
        useSearch: () => createMockUseSearch('timeout_error'),
      }));

      const SearchScreenWithError = require('../../screens/search/SearchScreen').default;
      renderWithQueryClient(<SearchScreenWithError />);

      const searchInput = screen.getByPlaceholderText('Search content, users, channels...');

      await act(async () => {
        fireEvent.changeText(searchInput, 'timeout test');
        fireEvent(searchInput, 'submitEditing');
      });

      await waitFor(() => {
        expect(screen.getByText(/Request timed out/)).toBeTruthy();
      });
    });

    it('shows loading state during timeout scenarios', async () => {
      const mockPerformSearch = jest.fn(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 100),
        ),
      );

      jest.doMock('../../hooks/useSearch', () => ({
        useSearch: () => ({
          ...createMockUseSearch(),
          performSearch: mockPerformSearch,
          isSearching: true,
        }),
      }));

      const SearchScreenWithError = require('../../screens/search/SearchScreen').default;
      renderWithQueryClient(<SearchScreenWithError />);

      // Should show loading state
      expect(screen.getByText('Searching...')).toBeTruthy();
    });
  });

  describe('Server Error Handling', () => {
    it('handles 500 server errors', async () => {
      jest.doMock('../../hooks/useSearch', () => ({
        useSearch: () => createMockUseSearch('server_error'),
      }));

      const SearchScreenWithError = require('../../screens/search/SearchScreen').default;
      renderWithQueryClient(<SearchScreenWithError />);

      const searchInput = screen.getByPlaceholderText('Search content, users, channels...');

      await act(async () => {
        fireEvent.changeText(searchInput, 'server error test');
        fireEvent(searchInput, 'submitEditing');
      });

      await waitFor(() => {
        expect(screen.getByText(/Server temporarily unavailable/)).toBeTruthy();
      });
    });

    it('handles rate limiting errors', async () => {
      jest.doMock('../../hooks/useSearch', () => ({
        useSearch: () => createMockUseSearch('rate_limit_error'),
      }));

      const SearchScreenWithError = require('../../screens/search/SearchScreen').default;
      renderWithQueryClient(<SearchScreenWithError />);

      const searchInput = screen.getByPlaceholderText('Search content, users, channels...');

      await act(async () => {
        fireEvent.changeText(searchInput, 'rate limit test');
        fireEvent(searchInput, 'submitEditing');
      });

      await waitFor(() => {
        expect(screen.getByText(/Too many requests/)).toBeTruthy();
      });
    });
  });

  describe('Data Parsing Error Handling', () => {
    it('handles malformed API responses', async () => {
      jest.doMock('../../hooks/useSearch', () => ({
        useSearch: () => createMockUseSearch('malformed_response'),
      }));

      const SearchScreenWithError = require('../../screens/search/SearchScreen').default;
      renderWithQueryClient(<SearchScreenWithError />);

      const searchInput = screen.getByPlaceholderText('Search content, users, channels...');

      await act(async () => {
        fireEvent.changeText(searchInput, 'malformed test');
        fireEvent(searchInput, 'submitEditing');
      });

      // Should handle malformed response gracefully
      await waitFor(() => {
        expect(screen.getByText('Discover Content')).toBeTruthy();
      });
    });

    it('validates search result data structure', () => {
      const malformedResults = [
        { id: '1', title: null, type: 'invalid' },
        { id: '2' }, // Missing required fields
        null, // Null item
      ];

      const defaultProps = {
        results: malformedResults as any,
        totalResults: 3,
        isLoading: false,
        isLoadingMore: false,
        hasMoreResults: false,
        onResultPress: jest.fn(),
        onLoadMore: jest.fn(),
        onRefresh: jest.fn(),
        query: 'malformed data test',
      };

      expect(() => {
        renderWithQueryClient(<SearchResultsComponent {...defaultProps} />);
      }).not.toThrow();
    });
  });

  describe('Offline Scenario Handling', () => {
    it('detects offline state and shows appropriate message', async () => {
      // Mock NetInfo to return offline state
      jest.doMock('@react-native-community/netinfo', () => ({
        addEventListener: jest.fn(),
        fetch: jest.fn(() => Promise.resolve({ isConnected: false })),
      }));

      jest.doMock('../../hooks/useSearch', () => ({
        useSearch: () => createMockUseSearch('offline'),
      }));

      const SearchScreenWithError = require('../../screens/search/SearchScreen').default;
      renderWithQueryClient(<SearchScreenWithError />);

      await waitFor(() => {
        expect(screen.getByText(/No internet connection/)).toBeTruthy();
      });
    });

    it('provides cached results when offline', async () => {
      const cachedResults = [
        {
          id: 'cached-1',
          title: 'Cached Result',
          description: 'This result is from cache',
          type: 'content' as const,
          createdAt: new Date(),
        },
      ];

      jest.doMock('../../hooks/useSearch', () => ({
        useSearch: () => ({
          ...createMockUseSearch('offline'),
          results: cachedResults,
          totalResults: 1,
        }),
      }));

      const SearchScreenWithError = require('../../screens/search/SearchScreen').default;
      renderWithQueryClient(<SearchScreenWithError />);

      // Should show cached results
      expect(screen.getByText('Cached Result')).toBeTruthy();
      expect(screen.getByText(/Showing cached results/)).toBeTruthy();
    });

    it('handles connectivity restoration', async () => {
      const connectivityListener = jest.fn();

      jest.doMock('@react-native-community/netinfo', () => ({
        addEventListener: jest.fn((callback) => {
          connectivityListener.mockImplementation(callback);
          return jest.fn(); // unsubscribe function
        }),
        fetch: jest.fn(() => Promise.resolve({ isConnected: false })),
      }));

      jest.doMock('../../hooks/useSearch', () => ({
        useSearch: () => createMockUseSearch('offline'),
      }));

      const SearchScreenWithError = require('../../screens/search/SearchScreen').default;
      renderWithQueryClient(<SearchScreenWithError />);

      // Simulate connectivity restoration
      await act(async () => {
        connectivityListener({ isConnected: true });
      });

      // Should update UI to reflect connectivity
      await waitFor(() => {
        expect(screen.queryByText(/No internet connection/)).toBeNull();
      });
    });
  });

  describe('Partial Failure Handling', () => {
    it('handles partial loading failures gracefully', async () => {
      jest.doMock('../../hooks/useSearch', () => ({
        useSearch: () => createMockUseSearch('partial_failure'),
      }));

      const SearchScreenWithError = require('../../screens/search/SearchScreen').default;
      renderWithQueryClient(<SearchScreenWithError />);

      // Should show available results
      expect(screen.getByText('Working Result')).toBeTruthy();

      // Try to load more and fail
      const resultsList = screen.getByTestId('search-results-list');

      await act(async () => {
        fireEvent(resultsList, 'endReached');
      });

      // Should show error for failed load more
      await waitFor(() => {
        expect(screen.getByText(/Failed to load more results/)).toBeTruthy();
      });
    });

    it('handles image loading errors in results', async () => {
      const resultsWithImages = [
        {
          id: '1',
          title: 'Image Test',
          thumbnail: 'https://invalid-image-url.com/broken.jpg',
          type: 'content' as const,
          createdAt: new Date(),
        },
      ];

      const defaultProps = {
        results: resultsWithImages,
        totalResults: 1,
        isLoading: false,
        isLoadingMore: false,
        hasMoreResults: false,
        onResultPress: jest.fn(),
        onLoadMore: jest.fn(),
        onRefresh: jest.fn(),
        query: 'image error test',
      };

      renderWithQueryClient(<SearchResultsComponent {...defaultProps} />);

      const image = screen.getByTestId('result-image');

      // Simulate image error
      fireEvent(image, 'error');

      // Should show placeholder instead
      expect(screen.getByTestId('image-placeholder')).toBeTruthy();
    });
  });

  describe('User Input Validation', () => {
    it('handles empty search queries', async () => {
      renderWithQueryClient(<SearchScreen />);

      const searchInput = screen.getByPlaceholderText('Search content, users, channels...');

      await act(async () => {
        fireEvent.changeText(searchInput, '');
        fireEvent(searchInput, 'submitEditing');
      });

      // Should not perform search with empty query
      expect(screen.getByText('Discover Content')).toBeTruthy();
    });

    it('handles extremely long search queries', async () => {
      renderWithQueryClient(<SearchScreen />);

      const veryLongQuery = 'a'.repeat(1000);
      const searchInput = screen.getByPlaceholderText('Search content, users, channels...');

      await act(async () => {
        fireEvent.changeText(searchInput, veryLongQuery);
        fireEvent(searchInput, 'submitEditing');
      });

      // Should handle long queries gracefully (truncate or show error)
      expect(searchInput.props.value.length).toBeLessThanOrEqual(1000);
    });

    it('sanitizes potentially dangerous input', async () => {
      renderWithQueryClient(<SearchScreen />);

      const dangerousInput = '<script>alert("xss")</script>';
      const searchInput = screen.getByPlaceholderText('Search content, users, channels...');

      await act(async () => {
        fireEvent.changeText(searchInput, dangerousInput);
        fireEvent(searchInput, 'submitEditing');
      });

      // Should sanitize input
      expect(searchInput.props.value).not.toContain('<script>');
    });
  });

  describe('Memory and Resource Error Handling', () => {
    it('handles low memory situations', async () => {
      // Mock low memory warning
      const lowMemoryHandler = jest.fn();

      jest.doMock('react-native', () => ({
        ...jest.requireActual('react-native'),
        AppState: {
          addEventListener: jest.fn((event, callback) => {
            if (event === 'memoryWarning') {
              lowMemoryHandler.mockImplementation(callback);
            }
          }),
          removeEventListener: jest.fn(),
        },
      }));

      renderWithQueryClient(<SearchScreen />);

      // Trigger low memory warning
      await act(async () => {
        lowMemoryHandler();
      });

      // Should handle memory warning gracefully
      expect(screen.getByText(/Discover Content/)).toBeTruthy();
    });

    it('handles component cleanup on errors', () => {
      const ConsoleError = console.error;
      console.error = jest.fn();

      const { unmount } = renderWithQueryClient(<SearchScreen />);

      // Should unmount without throwing errors
      expect(() => {
        unmount();
      }).not.toThrow();

      console.error = ConsoleError;
    });
  });

  describe('Error Recovery', () => {
    it('provides automatic retry with exponential backoff', async () => {
      const mockPerformSearch = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ results: [] });

      jest.doMock('../../hooks/useSearch', () => ({
        useSearch: () => ({
          ...createMockUseSearch(),
          performSearch: mockPerformSearch,
        }),
      }));

      const SearchScreenWithError = require('../../screens/search/SearchScreen').default;
      renderWithQueryClient(<SearchScreenWithError />);

      const searchInput = screen.getByPlaceholderText('Search content, users, channels...');

      await act(async () => {
        fireEvent.changeText(searchInput, 'retry test');
        fireEvent(searchInput, 'submitEditing');
      });

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(mockPerformSearch).toHaveBeenCalledTimes(3);
      }, { timeout: 5000 });
    });

    it('provides manual refresh capability', async () => {
      const mockRefetch = jest.fn();

      jest.doMock('../../hooks/useSearch', () => ({
        useSearch: () => ({
          ...createMockUseSearch('network_error'),
          refetchResults: mockRefetch,
        }),
      }));

      const SearchScreenWithError = require('../../screens/search/SearchScreen').default;
      renderWithQueryClient(<SearchScreenWithError />);

      // Find and press refresh button
      const refreshButton = screen.getByText('Refresh');
      fireEvent.press(refreshButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Error Reporting and Analytics', () => {
    it('logs errors for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      jest.doMock('../../hooks/useSearch', () => ({
        useSearch: () => createMockUseSearch('network_error'),
      }));

      const SearchScreenWithError = require('../../screens/search/SearchScreen').default;
      renderWithQueryClient(<SearchScreenWithError />);

      const searchInput = screen.getByPlaceholderText('Search content, users, channels...');

      await act(async () => {
        fireEvent.changeText(searchInput, 'error logging test');
        fireEvent(searchInput, 'submitEditing');
      });

      // Should log error for debugging
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Search error'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('sends error analytics for monitoring', async () => {
      const mockAnalytics = jest.fn();

      // Mock analytics service
      jest.doMock('../../services/analytics/AnalyticsService', () => ({
        trackError: mockAnalytics,
      }));

      jest.doMock('../../hooks/useSearch', () => ({
        useSearch: () => createMockUseSearch('server_error'),
      }));

      const SearchScreenWithError = require('../../screens/search/SearchScreen').default;
      renderWithQueryClient(<SearchScreenWithError />);

      const searchInput = screen.getByPlaceholderText('Search content, users, channels...');

      await act(async () => {
        fireEvent.changeText(searchInput, 'analytics test');
        fireEvent(searchInput, 'submitEditing');
      });

      // Should track error for monitoring
      expect(mockAnalytics).toHaveBeenCalledWith('search_error', expect.objectContaining({
        error: 'Server error: 500',
        query: 'analytics test',
      }));
    });
  });
});
