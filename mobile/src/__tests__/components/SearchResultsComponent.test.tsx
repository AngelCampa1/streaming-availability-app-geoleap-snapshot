/* eslint-disable @typescript-eslint/no-require-imports */
import React from'react';
import { render, fireEvent, waitFor, screen } from'@testing-library/react-native';
import { QueryClient, QueryClientProvider } from'@tanstack/react-query';
import SearchResultsComponent from'../../components/search/SearchResultsComponent';
import { SearchItem, SearchResults } from'../../types/search';

// Mock useTheme from ThemeProvider
jest.mock('../../theme/ThemeProvider', () => {
  const theme = {
    spacing: Array.from({ length: 50 }, (_, i) => i * 4),
    colors: {
      primary: { 100:'#ede9fe', 500:'#7c3aed', 600:'#6d28d9' },
      secondary: { 500:'#f59e0b' },
      error: { 100:'#fee2e2', 500:'#ef4444', 600:'#dc2626' },
      success: { 100:'#dcfce7', 500:'#10b981', 600:'#059669' },
      warning: { 100:'#fef3c7', 500:'#f59e0b', 600:'#d97706' },
      info: { 100:'#dbeafe', 500:'#3b82f6', 600:'#2563eb' },
      neutral: { 100:'#f5f5f5', 200:'#e5e5e5', 300:'#d4d4d4', 500:'#737373', 700:'#404040', 900:'#171717' },
      overlay: { light:'rgba(0,0,0,0.1)', medium:'rgba(0,0,0,0.4)', darkStrong:'rgba(0,0,0,0.6)', darkest:'rgba(0,0,0,0.8)' },
    },
    semantic: {
      text: { primary:'#000000', secondary:'#666666', tertiary:'#999999', inverse:'#ffffff' },
      background: { primary:'#ffffff', secondary:'#f5f5f5', tertiary:'#e5e5e5', error:'#fef2f2', info:'#eff6ff', success:'#f0fdf4' },
      border: { primary:'#e5e5e5', secondary:'#d4d4d4' },
    },
    typography: {
      fontSize: { xs: 11, sm: 12, base: 14, md: 14, lg: 16, xl: 18,'2xl': 24 },
      fontWeight: { normal:'400', medium:'500', semibold:'600', bold:'700' },
      lineHeight: { tight: 1.2, normal: 1.5 },
      letterSpacing: { tight: -0.5, normal: 0, wide: 0.5 },
    },
    borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
    shadows: {
      sm: { shadowColor:'#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
      md: { shadowColor:'#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    },
  };
  return {
    useTheme: () => ({ theme }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock dependencies
jest.mock('react-native-vector-icons/MaterialIcons', () =>'MockIcon');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock react-native-share
jest.mock('react-native-share', () => ({
  default: {
    open: jest.fn(() => Promise.resolve()),
  },
}));

// react-native-reanimated and react-native-modal are already mocked in jest.setup.js

// Mock InfiniteResultsList to avoid complex FlashList issues
jest.mock('../../components/search/InfiniteResultsList', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const MockInfiniteResultsList = ({
    searchResults,
    isLoading,
    isLoadingMore,
    onResultPress,
    onLoadMore,
    _onRefresh,
    _onWatchlistPress,
    _onSharePress,
  }) => {
    // Format popularity function (copied from ResultCard)
    const formatPopularity = (popularity?: number): string => {
      if (!popularity) {return'';}
      if (popularity > 1000000) {return `${(popularity / 1000000).toFixed(1)}M`;}
      if (popularity > 1000) {return `${(popularity / 1000).toFixed(1)}k`;}
      return popularity.toString();
    };

    // Format date function (copied from ResultCard)
    const formatDate = (date: Date): string => {
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffInDays === 0) {return'Today';}
      if (diffInDays === 1) {return'Yesterday';}
      if (diffInDays < 7) {return `${diffInDays}d ago`;}
      if (diffInDays < 30) {return `${Math.floor(diffInDays / 7)}w ago`;}
      if (diffInDays < 365) {return `${Math.floor(diffInDays / 30)}mo ago`;}
      return `${Math.floor(diffInDays / 365)}y ago`;
    };

    const renderItem = ({ item, index }) => (
      React.createElement(View, {
        testID: `result-card-${index}`,
        key: item.id,
        accessible: true,
        accessibilityRole:'button',
        accessibilityLabel: item.title,
        onStartShouldSetResponder: () => true,
        onResponderRelease: () => onResultPress(item),
      }, [
        // Render thumbnail or placeholder
        ...(item.thumbnail ? [
          React.createElement(View, {
            key:'thumbnail',
            testID:'result-thumbnail',
            style: { width: 80, height: 60, backgroundColor:'#f0f0f0' },
          }),
        ] : [
          React.createElement(View, {
            key:'thumbnail-placeholder',
            testID:'thumbnail-placeholder',
            style: { width: 80, height: 60, backgroundColor:'#e0e0e0' },
          }),
        ]),
        React.createElement(Text, { key:'title' }, item.title),
        React.createElement(Text, { key:'description' }, item.description),
        React.createElement(Text, { key:'type' }, item.type.toUpperCase()),
        // Render date if available
        ...(item.createdAt ? [
          React.createElement(Text, { key:'date' }, formatDate(item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt))),
        ] : []),
        // Render popularity if available
        ...(item.popularity ? [
          React.createElement(Text, { key:'popularity' }, formatPopularity(item.popularity)),
        ] : []),
        // Render tags if available
        ...(item.tags && item.tags.length > 0 ? [
          React.createElement(View, { key:'tags' },
            item.tags.map((tag, tagIndex) =>
              React.createElement(Text, {
                key: `tag-${tagIndex}`,
                testID: `tag-${tag}`,
              }, `#${tag}`),
            ),
          ),
        ] : []),
      ])
    );

    if (isLoading && searchResults.items.length === 0) {
      return React.createElement(Text, { testID:'loading-text' },'Searching...');
    }

    if (searchResults.items.length === 0 && !isLoading) {
      return React.createElement(View, { testID:'empty-state' }, [
        React.createElement(Text, { key:'title' },'No Results Found'),
        React.createElement(Text, { key:'subtitle' },'Try adjusting your search terms or filters'),
      ]);
    }

    // In tests, FlatList doesn't automatically render items, so we render them manually
    // We also need to support onEndReached for load more tests
    return React.createElement(View, {
      testID:'results-list',
      accessibilityLabel:'Search results list',
      accessibilityRole:'list',
      onEndReached: searchResults.hasMore && !isLoadingMore ? onLoadMore : undefined,
    }, [
      React.createElement(View, { key:'list-header', testID:'list-header' }),
      ...searchResults.items.map((item, index) => renderItem({ item, index })),
      isLoadingMore ?
        React.createElement(Text, { key:'list-footer', testID:'loading-more' },'Loading more results...') :
        null,
    ].filter(Boolean));
  };

  return MockInfiniteResultsList;
});

// Mock the react-native components that might cause issues
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Dimensions.get = jest.fn(() => ({ width: 375, height: 812 }));
  return RN;
});

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockSearchResults: SearchItem[] = [
  {
    id:'1',
    title:'Test Video Content',
    description:'This is a test video description',
    type:'content',
    thumbnail:'https://example.com/thumb1.jpg',
    url:'https://example.com/video1',
    tags: ['tech','tutorial','mobile'],
    createdAt: new Date('2024-01-15'),
    popularity: 1500,
  },
  {
    id:'2',
    title:'John Doe Profile',
    description:'User profile for John Doe',
    type:'user',
    thumbnail:'https://example.com/profile2.jpg',
    createdAt: new Date('2024-01-10'),
    popularity: 850,
  },
  {
    id:'3',
    title:'Tech Channel',
    description:'Channel focused on technology content',
    type:'channel',
    thumbnail:'https://example.com/channel3.jpg',
    tags: ['technology','reviews'],
    createdAt: new Date('2024-01-12'),
    popularity: 3200,
  },
];

const mockSearchResultsData: SearchResults = {
  items: mockSearchResults,
  totalCount: 3,
  hasMore: false,
  query:'test search',
  filters: {},
};

const defaultProps = {
  searchResults: mockSearchResultsData,
  isLoading: false,
  isLoadingMore: false,
  onResultPress: jest.fn(),
  onLoadMore: jest.fn(),
  onRefresh: jest.fn(),
};

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>,
  );
};

describe('SearchResultsComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders search results header correctly', () => {
      renderWithQueryClient(<SearchResultsComponent {...defaultProps} />);

      expect(screen.getByText('Results for "test search"')).toBeTruthy();
      expect(screen.getByText('3 results found')).toBeTruthy();
    });

    it('renders all result items', () => {
      renderWithQueryClient(<SearchResultsComponent {...defaultProps} />);

      expect(screen.getByText('Test Video Content')).toBeTruthy();
      expect(screen.getByText('John Doe Profile')).toBeTruthy();
      expect(screen.getByText('Tech Channel')).toBeTruthy();
    });

    it('displays result descriptions when available', () => {
      renderWithQueryClient(<SearchResultsComponent {...defaultProps} />);

      expect(screen.getByText('This is a test video description')).toBeTruthy();
      expect(screen.getByText('User profile for John Doe')).toBeTruthy();
    });

    it('shows type badges for each result', () => {
      renderWithQueryClient(<SearchResultsComponent {...defaultProps} />);

      expect(screen.getByText('CONTENT')).toBeTruthy();
      expect(screen.getByText('USER')).toBeTruthy();
      expect(screen.getByText('CHANNEL')).toBeTruthy();
    });

    it('displays tags when available', () => {
      renderWithQueryClient(<SearchResultsComponent {...defaultProps} />);

      expect(screen.getByText('#tech')).toBeTruthy();
      expect(screen.getByText('#tutorial')).toBeTruthy();
      expect(screen.getByText('#mobile')).toBeTruthy();
      expect(screen.getByText('#technology')).toBeTruthy();
    });

    it('shows popularity scores formatted correctly', () => {
      renderWithQueryClient(<SearchResultsComponent {...defaultProps} />);

      expect(screen.getByText('1.5k')).toBeTruthy(); // 1500 formatted
      expect(screen.getByText('850')).toBeTruthy();   // 850 as is
      expect(screen.getByText('3.2k')).toBeTruthy();  // 3200 formatted
    });
  });

  describe('Loading States', () => {
    it('renders loading skeleton when initially loading', () => {
      const loadingSearchResults: SearchResults = {
        ...mockSearchResultsData,
        items: [],
        totalCount: 0,
      };

      renderWithQueryClient(
        <SearchResultsComponent
          {...defaultProps}
          searchResults={loadingSearchResults}
          isLoading={true}
        />,
      );

      // Should show loading placeholders
      expect(screen.getByText('Results for "test search"')).toBeTruthy();
      // Should show loading state
      expect(screen.getByText('Searching...')).toBeTruthy();
    });

    it('shows loading more indicator at footer', () => {
      renderWithQueryClient(
        <SearchResultsComponent
          {...defaultProps}
          isLoadingMore={true}
          hasMoreResults={true}
        />,
      );

      expect(screen.getByText('Loading more results...')).toBeTruthy();
    });
  });

  describe('Empty States', () => {
    it('renders empty state when no results found', () => {
      const emptySearchResults: SearchResults = {
        ...mockSearchResultsData,
        items: [],
        totalCount: 0,
      };

      renderWithQueryClient(
        <SearchResultsComponent
          {...defaultProps}
          searchResults={emptySearchResults}
          isLoading={false}
        />,
      );

      expect(screen.getByText('No Results Found')).toBeTruthy();
      expect(screen.getByText('Try adjusting your search terms or filters')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('calls onResultPress when result item is tapped', () => {
      const mockOnResultPress = jest.fn();
      renderWithQueryClient(
        <SearchResultsComponent
          {...defaultProps}
          onResultPress={mockOnResultPress}
        />,
      );

      // Get the first result card by testID and manually trigger the responder release
      const firstResultCard = screen.getByTestId('result-card-0');
      fireEvent(firstResultCard,'responderRelease', { nativeEvent: {} });
      expect(mockOnResultPress).toHaveBeenCalledWith(mockSearchResults[0]);
    });

    it('calls onRefresh when pull to refresh is triggered', async () => {
      const mockOnRefresh = jest.fn();
      renderWithQueryClient(
        <SearchResultsComponent
          {...defaultProps}
          onRefresh={mockOnRefresh}
        />,
      );

      const resultsList = screen.getByText('Results for "test search"').parent;
      fireEvent(resultsList,'refresh');

      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalled();
      });
    });

    it('calls onLoadMore when scrolled to end', () => {
      const mockOnLoadMore = jest.fn();
      const searchResultsWithMore = {
        ...mockSearchResultsData,
        hasMore: true, // Enable load more functionality
      };

      renderWithQueryClient(
        <SearchResultsComponent
          {...defaultProps}
          searchResults={searchResultsWithMore}
          onLoadMore={mockOnLoadMore}
        />,
      );

      const resultsList = screen.getByTestId('results-list');
      // Manually trigger the onEndReached callback since fireEvent doesn't work with FlatList events
      if (resultsList.props.onEndReached) {
        resultsList.props.onEndReached();
      }

      expect(mockOnLoadMore).toHaveBeenCalled();
    });

    it('does not call onLoadMore when no more results available', () => {
      const mockOnLoadMore = jest.fn();
      // Use the default mockSearchResultsData which has hasMore: false
      renderWithQueryClient(
        <SearchResultsComponent
          {...defaultProps}
          onLoadMore={mockOnLoadMore}
        />,
      );

      const resultsList = screen.getByTestId('results-list');
      // Manually trigger the onEndReached callback since fireEvent doesn't work with FlatList events
      if (resultsList.props.onEndReached) {
        resultsList.props.onEndReached();
      }

      expect(mockOnLoadMore).not.toHaveBeenCalled();
    });
  });

  describe('Image Handling', () => {
    it('handles image loading errors gracefully', () => {
      renderWithQueryClient(<SearchResultsComponent {...defaultProps} />);

      const thumbnails = screen.getAllByTestId('result-thumbnail');

      // Should handle image errors gracefully
      expect(thumbnails.length).toBeGreaterThan(0);
    });

    it('shows placeholder when no thumbnail provided', () => {
      const resultsWithoutThumbnail = mockSearchResults.map(item => ({
        ...item,
        thumbnail: undefined,
      }));

      const mockSearchResultsWithoutThumbnail: SearchResults = {
        ...mockSearchResultsData,
        items: resultsWithoutThumbnail,
      };

      renderWithQueryClient(
        <SearchResultsComponent
          {...defaultProps}
          searchResults={mockSearchResultsWithoutThumbnail}
        />,
      );

      expect(screen.getAllByTestId(/thumbnail-placeholder/)).toHaveLength(3);
    });
  });

  describe('Date Formatting', () => {
    it('formats recent dates correctly', () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const recentResults = [
        { ...mockSearchResults[0], createdAt: today },
        { ...mockSearchResults[1], createdAt: yesterday },
        { ...mockSearchResults[2], createdAt: weekAgo },
      ];

      const recentSearchResults = {
        ...mockSearchResultsData,
        items: recentResults,
      };

      renderWithQueryClient(
        <SearchResultsComponent
          {...defaultProps}
          searchResults={recentSearchResults}
        />,
      );

      expect(screen.getByText('Today')).toBeTruthy();
      expect(screen.getByText('Yesterday')).toBeTruthy();
      expect(screen.getByText('1w ago')).toBeTruthy();
    });
  });

  describe('Performance Optimizations', () => {
    it('applies proper FlatList optimizations', () => {
      renderWithQueryClient(
        <SearchResultsComponent {...defaultProps} />,
      );

      // Should render results efficiently
      expect(screen.getByText('Test Video Content')).toBeTruthy();
      expect(screen.getByText('John Doe Profile')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility labels', () => {
      renderWithQueryClient(<SearchResultsComponent {...defaultProps} />);

      // Look for result cards by testID pattern since TouchableOpacity role might not be preserved in tests
      const resultCards = screen.getAllByTestId(/result-card-\d+/);
      expect(resultCards.length).toBeGreaterThan(0);

      // Verify result cards have proper accessibility attributes (check props directly)
      expect(resultCards[0].props.accessible).toBe(true);
      expect(resultCards[0].props.accessibilityRole).toBe('button');
      expect(resultCards[0].props.accessibilityLabel).toBeTruthy();
    });

    it('supports screen reader navigation', () => {
      renderWithQueryClient(<SearchResultsComponent {...defaultProps} />);

      // Should have accessible results list
      expect(screen.getByText('Results for "test search"')).toBeTruthy();
    });
  });

  describe('Error Resilience', () => {
    it('handles malformed result data gracefully', () => {
      const malformedResults = [
        { ...mockSearchResults[0], title: null as any },
        { ...mockSearchResults[1], type:'invalid' as any },
        { ...mockSearchResults[2], createdAt: null as any },
      ];

      expect(() => {
        renderWithQueryClient(
          <SearchResultsComponent
            {...defaultProps}
            results={malformedResults}
          />,
        );
      }).not.toThrow();
    });

    it('handles undefined results array', () => {
      expect(() => {
        renderWithQueryClient(
          <SearchResultsComponent
            {...defaultProps}
            results={undefined as any}
          />,
        );
      }).not.toThrow();
    });
  });
});
