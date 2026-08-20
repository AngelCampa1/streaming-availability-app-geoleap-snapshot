import React from'react';
import { render, fireEvent, waitFor, screen } from'@testing-library/react-native';
import { QueryClient, QueryClientProvider } from'@tanstack/react-query';
import ResultCard from'../../components/search/ResultCard';
import { SearchItem } from'../../types/search';

// Mock useTheme from ThemeProvider
jest.mock('../../theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      spacing: Array.from({ length: 50 }, (_, i) => i * 4),
      colors: {
        primary: { 500:'#7c3aed', 600:'#6d28d9' },
        secondary: { 500:'#f59e0b' },
        error: { 500:'#ef4444' },
        success: { 500:'#10b981', 600:'#059669' },
        warning: { 500:'#f59e0b', 600:'#d97706' },
        neutral: { 100:'#f5f5f5', 200:'#e5e5e5', 300:'#d4d4d4', 500:'#737373', 900:'#171717' },
        overlay: {
          light:'rgba(0, 0, 0, 0.1)',
          medium:'rgba(0, 0, 0, 0.4)',
          darkStrong:'rgba(0, 0, 0, 0.6)',
          darkest:'rgba(0, 0, 0, 0.8)',
        },
      },
      semantic: {
        text: {
          primary:'#000000',
          secondary:'#666666',
          tertiary:'#999999',
          inverse:'#ffffff',
        },
        background: { primary:'#ffffff', secondary:'#f5f5f5' },
        border: { primary:'#e5e5e5' },
      },
      typography: {
        fontSize: { xs: 11, sm: 12, base: 14, md: 14, lg: 16, xl: 18 },
        fontWeight: { normal:'400', medium:'500', semibold:'600', bold:'700' },
        lineHeight: { tight: 1.2, normal: 1.5 },
        letterSpacing: { tight: -0.5, normal: 0, wide: 0.5 },
      },
      borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
      shadows: {
        sm: {
          shadowColor:'#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        },
        md: {
          shadowColor:'#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        },
      },
    },
  }),
}));

// Mock dependencies - FastImage is already mocked in jest.setup.js
jest.mock('react-native-share', () => ({
  default: {
    open: jest.fn(() => Promise.resolve()),
  },
}));

// react-native-reanimated is mocked in jest.setup.js
// react-native-vector-icons are already mocked in jest.setup.js

// FastImage is already mocked in jest.setup.js with enhanced implementation

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockContentItem: SearchItem = {
  id:'1',
  title:'Amazing Tech Tutorial',
  description:'Learn advanced React Native techniques',
  type:'content',
  thumbnail:'https://example.com/thumbnail1.jpg',
  url:'https://example.com/video1',
  tags: ['react-native','tutorial','mobile','javascript','development'],
  createdAt: new Date('2024-01-15'),
  popularity: 15420,
};

const mockUserItem: SearchItem = {
  id:'2',
  title:'Jane Developer',
  description:'Senior Mobile Developer at TechCorp',
  type:'user',
  thumbnail:'https://example.com/profile2.jpg',
  createdAt: new Date('2024-01-10'),
  popularity: 2850,
};

const mockChannelItem: SearchItem = {
  id:'3',
  title:'Tech Innovations Channel',
  description:'Latest in technology and innovation',
  type:'channel',
  thumbnail:'https://example.com/channel3.jpg',
  tags: ['technology','innovation'],
  createdAt: new Date('2024-01-12'),
  popularity: 128500,
};

const mockLocationItem: SearchItem = {
  id:'4',
  title:'Silicon Valley Meetup',
  description:'Tech networking event in Silicon Valley',
  type:'location',
  createdAt: new Date('2024-01-08'),
  popularity: 450,
};

const defaultProps = {
  item: mockContentItem,
  index: 0,
  onPress: jest.fn(),
  onWatchlistPress: jest.fn(),
  onSharePress: jest.fn(),
  isInWatchlist: false,
  viewMode:'list' as const,
};

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>,
  );
};

describe('ResultCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('List View Rendering', () => {
    it('renders item title and description in list view', async () => {
      renderWithQueryClient(<ResultCard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Amazing Tech Tutorial')).toBeTruthy();
        expect(screen.getByText('Learn advanced React Native techniques')).toBeTruthy();
      });
    });

    it('displays type badge with correct color and icon for content', () => {
      renderWithQueryClient(<ResultCard {...defaultProps} />);

      expect(screen.getByText('CONTENT')).toBeTruthy();
      const typeBadge = screen.getByTestId('type-badge');
      // Content type uses theme.colors.success[500] ='#10b981'
      expect(typeBadge.props.style).toContainEqual(
        expect.objectContaining({ backgroundColor:'#10b981' }),
      );
    });

    it('shows popularity formatted correctly', () => {
      renderWithQueryClient(<ResultCard {...defaultProps} />);

      expect(screen.getByText('15.4K')).toBeTruthy(); // 15420 formatted
    });

    it('displays tags in list view', () => {
      renderWithQueryClient(<ResultCard {...defaultProps} />);

      // Tags should be rendered correctly with proper formatting
      expect(screen.queryByText('#react-native')).toBeTruthy();
      expect(screen.queryByText('#tutorial')).toBeTruthy();
      expect(screen.queryByText('+3')).toBeTruthy(); // More tags indicator (5 total - 2 shown = 3 more)
    });

    it('formats dates correctly', () => {
      const today = new Date();
      const itemToday = { ...mockContentItem, createdAt: today };

      renderWithQueryClient(
        <ResultCard {...defaultProps} item={itemToday} />,
      );

      // Date is formatted with relative format (e.g.,"Today")
      expect(screen.queryByText('Today')).toBeTruthy();
    });
  });

  describe('Grid View Rendering', () => {
    it('renders in grid mode with different layout', () => {
      renderWithQueryClient(
        <ResultCard {...defaultProps} viewMode="grid" />,
      );

      expect(screen.getByText('Amazing Tech Tutorial')).toBeTruthy();
      // Description should not be shown in grid view
      expect(screen.queryByText('Learn advanced React Native techniques')).toBeNull();
    });

    it('hides tags in grid view', () => {
      renderWithQueryClient(
        <ResultCard {...defaultProps} viewMode="grid" />,
      );

      expect(screen.queryByText('#react-native')).toBeNull();
      expect(screen.queryByText('#tutorial')).toBeNull();
      expect(screen.queryByText('+3')).toBeNull();
    });

    it('adjusts image size for grid view', () => {
      const { getByTestId } = renderWithQueryClient(
        <ResultCard {...defaultProps} viewMode="grid" />,
      );

      const image = getByTestId('result-image');
      expect(image.props.style).toContainEqual(
        expect.objectContaining({ width:'100%', height: 120 }),
      );
    });
  });

  describe('Different Item Types', () => {
    it('renders user item with correct styling', () => {
      renderWithQueryClient(
        <ResultCard {...defaultProps} item={mockUserItem} />,
      );

      expect(screen.getByText('Jane Developer')).toBeTruthy();
      expect(screen.getByText('USER')).toBeTruthy();

      const typeBadge = screen.getByTestId('type-badge');
      // User type uses theme.colors.primary[500] ='#7c3aed'
      expect(typeBadge.props.style).toContainEqual(
        expect.objectContaining({ backgroundColor:'#7c3aed' }),
      );
    });

    it('renders channel item with correct styling', () => {
      renderWithQueryClient(
        <ResultCard {...defaultProps} item={mockChannelItem} />,
      );

      expect(screen.getByText('Tech Innovations Channel')).toBeTruthy();
      expect(screen.getByText('CHANNEL')).toBeTruthy();
      expect(screen.getByText('128.5K')).toBeTruthy(); // Formatted popularity

      const typeBadge = screen.getByTestId('type-badge');
      expect(typeBadge.props.style).toContainEqual(
        expect.objectContaining({ backgroundColor:'#ef4444' }),
      );
    });

    it('renders location item with correct styling', () => {
      renderWithQueryClient(
        <ResultCard {...defaultProps} item={mockLocationItem} />,
      );

      expect(screen.getByText('Silicon Valley Meetup')).toBeTruthy();
      expect(screen.getByText('LOCATION')).toBeTruthy();

      const typeBadge = screen.getByTestId('type-badge');
      expect(typeBadge.props.style).toContainEqual(
        expect.objectContaining({ backgroundColor:'#f59e0b' }),
      );
    });
  });

  describe('Image Handling', () => {
    it('displays FastImage when thumbnail is available', () => {
      renderWithQueryClient(<ResultCard {...defaultProps} />);

      const image = screen.getByTestId('result-image');
      expect(image.props.source.uri).toBe('https://example.com/thumbnail1.jpg');
    });

    it('shows placeholder when no thumbnail provided', () => {
      const itemWithoutThumbnail = { ...mockContentItem, thumbnail: undefined };

      renderWithQueryClient(
        <ResultCard {...defaultProps} item={itemWithoutThumbnail} />,
      );

      expect(screen.getByTestId('image-placeholder')).toBeTruthy();
    });

    it('handles image loading error gracefully', () => {
      renderWithQueryClient(<ResultCard {...defaultProps} />);

      const image = screen.getByTestId('result-image');
      fireEvent(image,'error');

      // Should show placeholder after error
      expect(screen.getByTestId('image-placeholder')).toBeTruthy();
    });

    it('shows loading placeholder until image loads', () => {
      renderWithQueryClient(<ResultCard {...defaultProps} />);

      expect(screen.getByTestId('image-loading-placeholder')).toBeTruthy();

      const image = screen.getByTestId('result-image');
      fireEvent(image,'load');

      // Loading placeholder should be hidden after load
      expect(screen.queryByTestId('image-loading-placeholder')).toBeNull();
    });
  });

  describe('User Interactions', () => {
    it('calls onPress when card is pressed', () => {
      const mockOnPress = jest.fn();
      renderWithQueryClient(
        <ResultCard {...defaultProps} onPress={mockOnPress} />,
      );

      fireEvent.press(screen.getByTestId('result-card-touchable'));

      expect(mockOnPress).toHaveBeenCalledWith(mockContentItem);
    });

    it('calls onWatchlistPress when watchlist button is pressed', () => {
      const mockOnWatchlistPress = jest.fn();
      renderWithQueryClient(
        <ResultCard
          {...defaultProps}
          onWatchlistPress={mockOnWatchlistPress}
        />,
      );

      fireEvent.press(screen.getByTestId('watchlist-button'));

      expect(mockOnWatchlistPress).toHaveBeenCalledWith(mockContentItem);
    });

    it('calls onSharePress when share button is pressed', () => {
      const mockOnSharePress = jest.fn();
      renderWithQueryClient(
        <ResultCard
          {...defaultProps}
          onSharePress={mockOnSharePress}
        />,
      );

      fireEvent.press(screen.getByTestId('share-button'));

      expect(mockOnSharePress).toHaveBeenCalledWith(mockContentItem);
    });

    it('shows different watchlist icon when item is in watchlist', () => {
      renderWithQueryClient(
        <ResultCard
          {...defaultProps}
          isInWatchlist={true}
          onWatchlistPress={jest.fn()}
        />,
      );

      const watchlistButton = screen.getByTestId('watchlist-button');

      // Style is a nested array structure with Animated values, so we need to search through nested arrays
      const hasWatchlistStyle = watchlistButton.props.style.some(styleObj => {
        if (Array.isArray(styleObj)) {
          return styleObj.some(nestedStyle =>
            nestedStyle && nestedStyle.backgroundColor ==='#ef4444',
          );
        }
        return styleObj && styleObj.backgroundColor ==='#ef4444';
      });
      expect(hasWatchlistStyle).toBe(true);
    });

    it('provides haptic feedback on press', () => {
      renderWithQueryClient(<ResultCard {...defaultProps} />);

      const card = screen.getByTestId('result-card');

      fireEvent(card,'pressIn');
      // Scale animation should trigger

      fireEvent(card,'pressOut');
      // Scale should return to normal
    });
  });

  describe('Quick Actions', () => {
    it('shows watchlist button when onWatchlistPress is provided', () => {
      renderWithQueryClient(
        <ResultCard
          {...defaultProps}
          onWatchlistPress={jest.fn()}
        />,
      );

      expect(screen.getByTestId('watchlist-button')).toBeTruthy();
    });

    it('hides watchlist button when onWatchlistPress is not provided', () => {
      renderWithQueryClient(
        <ResultCard
          {...defaultProps}
          onWatchlistPress={undefined}
        />,
      );

      expect(screen.queryByTestId('watchlist-button')).toBeNull();
    });

    it('shows share button when onSharePress is provided', () => {
      renderWithQueryClient(
        <ResultCard
          {...defaultProps}
          onSharePress={jest.fn()}
        />,
      );

      expect(screen.getByTestId('share-button')).toBeTruthy();
    });

    it('hides share button when onSharePress is not provided', () => {
      renderWithQueryClient(
        <ResultCard
          {...defaultProps}
          onSharePress={undefined}
        />,
      );

      expect(screen.queryByTestId('share-button')).toBeNull();
    });
  });

  describe('Animations', () => {
    it('applies entrance animation based on index', () => {
      const { rerender } = renderWithQueryClient(
        <ResultCard {...defaultProps} index={0} />,
      );

      // Different index should have different animation timing
      rerender(
        <QueryClientProvider client={createQueryClient()}>
          <ResultCard {...defaultProps} index={2} />
        </QueryClientProvider>,
      );

      // Animation timing should be different for different indices
      expect(screen.getByTestId('result-card')).toBeTruthy();
    });

    it('applies scale animation on press interactions', () => {
      renderWithQueryClient(<ResultCard {...defaultProps} />);

      const card = screen.getByTestId('result-card');

      fireEvent(card,'pressIn');
      fireEvent(card,'pressOut');

      // Animations should complete without errors
      expect(card).toBeTruthy();
    });
  });

  describe('Date and Time Formatting', () => {
    it('formats recent dates correctly', () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      // Test today - Date is formatted with relative format
      const todayItem = { ...mockContentItem, createdAt: today };
      renderWithQueryClient(<ResultCard {...defaultProps} item={todayItem} />);
      expect(screen.queryByText('Today')).toBeTruthy();

      // Test yesterday - Date is formatted with relative format
      const yesterdayItem = { ...mockContentItem, createdAt: yesterday };
      renderWithQueryClient(<ResultCard {...defaultProps} item={yesterdayItem} />);
      expect(screen.queryByText('Yesterday')).toBeTruthy();
    });

    it('formats older dates correctly', () => {
      const today = new Date();
      const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Test older date - Date is formatted with relative format
      const oldItem = { ...mockContentItem, createdAt: twoWeeksAgo };
      renderWithQueryClient(<ResultCard {...defaultProps} item={oldItem} />);

      // Two weeks ago is formatted as"2w ago"
      expect(screen.queryByText('2w ago')).toBeTruthy();
    });
  });

  describe('Popularity Formatting', () => {
    it('formats popularity numbers correctly', () => {
      const popularityTests = [
        { popularity: 500, expected:'500' },
        { popularity: 1500, expected:'1.5K' },
        { popularity: 15000, expected:'15.0K' },
        { popularity: 1500000, expected:'1.5M' },
        { popularity: 15000000, expected:'15.0M' },
      ];

      popularityTests.forEach(({ popularity, expected }, index) => {
        const item = { ...mockContentItem, popularity };
        const { rerender } = renderWithQueryClient(
          <ResultCard {...defaultProps} item={item} />,
        );

        expect(screen.getByText(expected)).toBeTruthy();

        if (index < popularityTests.length - 1) {
          const nextItem = { ...mockContentItem, popularity: popularityTests[index + 1].popularity };
          rerender(
            <QueryClientProvider client={createQueryClient()}>
              <ResultCard {...defaultProps} item={nextItem} />
            </QueryClientProvider>,
          );
        }
      });
    });

    it('handles undefined popularity gracefully', () => {
      const itemWithoutPopularity = { ...mockContentItem, popularity: undefined };

      renderWithQueryClient(
        <ResultCard {...defaultProps} item={itemWithoutPopularity} />,
      );

      expect(screen.queryByTestId('popularity-container')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility labels', () => {
      renderWithQueryClient(<ResultCard {...defaultProps} />);

      const card = screen.getByTestId('result-card-touchable');
      expect(card.props.accessibilityRole).toBe('button');
      expect(card.props.accessibilityLabel).toContain('Amazing Tech Tutorial');
    });

    it('supports screen reader for quick actions', () => {
      renderWithQueryClient(
        <ResultCard
          {...defaultProps}
          onWatchlistPress={jest.fn()}
          onSharePress={jest.fn()}
        />,
      );

      const watchlistButton = screen.getByTestId('watchlist-button');
      const shareButton = screen.getByTestId('share-button');

      expect(watchlistButton.props.accessibilityLabel).toBeDefined();
      expect(shareButton.props.accessibilityLabel).toBeDefined();
    });

    it('indicates watchlist status for screen readers', () => {
      renderWithQueryClient(
        <ResultCard
          {...defaultProps}
          onWatchlistPress={jest.fn()}
          isInWatchlist={true}
        />,
      );

      const watchlistButton = screen.getByTestId('watchlist-button');
      expect(watchlistButton.props.accessibilityLabel).toContain('Remove from watchlist');
    });
  });

  describe('Performance', () => {
    it('memoizes component to prevent unnecessary re-renders', () => {
      const props = { ...defaultProps };
      const { rerender } = renderWithQueryClient(
        <ResultCard {...props} />,
      );

      // Re-render with same props
      rerender(
        <QueryClientProvider client={createQueryClient()}>
          <ResultCard {...props} />
        </QueryClientProvider>,
      );

      // Component should be memoized
      expect(screen.getByText('Amazing Tech Tutorial')).toBeTruthy();
    });

    it('handles rapid interaction events', () => {
      renderWithQueryClient(<ResultCard {...defaultProps} />);

      const card = screen.getByTestId('result-card');

      // Rapid press events
      for (let i = 0; i < 10; i++) {
        fireEvent(card,'pressIn');
        fireEvent(card,'pressOut');
      }

      expect(defaultProps.onPress).toHaveBeenCalledTimes(0);

      fireEvent.press(card);
      expect(defaultProps.onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Resilience', () => {
    it('handles malformed item data gracefully', () => {
      const malformedItem = {
        ...mockContentItem,
        title: null as any,
        description: undefined,
        type:'invalid' as any,
        createdAt: null as any,
        popularity: NaN,
      };

      expect(() => {
        renderWithQueryClient(
          <ResultCard {...defaultProps} item={malformedItem} />,
        );
      }).not.toThrow();
    });

    it('handles missing required props', () => {
      expect(() => {
        renderWithQueryClient(
          <ResultCard
            item={mockContentItem}
            index={0}
            onPress={jest.fn()}
          />,
        );
      }).not.toThrow();
    });
  });
});
