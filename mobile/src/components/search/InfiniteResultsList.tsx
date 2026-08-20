import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SearchItem, SearchResults } from '../../types/search';
import ResultCard from './ResultCard';
import { useTheme } from '../../theme/ThemeProvider';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

interface InfiniteResultsListProps {
  searchResults: SearchResults;
  isLoading: boolean;
  isLoadingMore: boolean;
  onResultPress: (item: SearchItem) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  onWatchlistPress?: (item: SearchItem) => void;
  onSharePress?: (item: SearchItem) => void;
  getIsInWatchlist?: (item: SearchItem) => boolean;
  viewMode?: 'list' | 'grid';
  onViewModeChange?: (mode: 'list' | 'grid') => void;
  showScrollToTop?: boolean;
  style?: any;
}

const { width } = Dimensions.get('window');
const isTablet = width > 768;

const InfiniteResultsList: React.FC<InfiniteResultsListProps> = ({
  searchResults,
  isLoading,
  isLoadingMore,
  onResultPress,
  onLoadMore,
  onRefresh,
  onWatchlistPress,
  onSharePress,
  getIsInWatchlist,
  viewMode = isTablet ? 'grid' : 'list',
  onViewModeChange,
  showScrollToTop = false,
  style,
}) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(showScrollToTop || false);
  const scrollY = useSharedValue(0);
  const flashListRef = React.useRef<any>(null);

  // Show scroll button immediately when showScrollToTop prop is true
  useEffect(() => {
    setShowScrollButton(showScrollToTop);
  }, [showScrollToTop]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;

      if (showScrollToTop) {
        runOnJS(setShowScrollButton)(event.contentOffset.y > 500);
      }
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }, [onRefresh]);

  const handleEndReached = useCallback(() => {
    if (!isLoading && !isLoadingMore && searchResults.hasMore) {
      onLoadMore();
    }
  }, [isLoading, isLoadingMore, searchResults.hasMore, onLoadMore]);

  const handleScrollToTop = useCallback(() => {
    flashListRef.current?.scrollToOffset?.({ offset: 0, animated: true });
  }, []);

  const renderItem = useCallback(({ item, index }: { item: SearchItem; index: number }) => (
    <ResultCard
      item={item}
      index={index}
      onPress={onResultPress}
      onWatchlistPress={onWatchlistPress}
      onSharePress={onSharePress}
      isInWatchlist={getIsInWatchlist?.(item) || false}
      viewMode={viewMode}
    />
  ), [onResultPress, onWatchlistPress, onSharePress, getIsInWatchlist, viewMode]);

  const keyExtractor = useCallback((item: SearchItem) => item.id, []);

  const renderHeader = useCallback(() => {
    return (
      <View  style={styles.header}>
        <View  style={styles.resultsInfo}>
          <Text  style={styles.resultsQuery}>
            Results for "{searchResults.query || ''}"
          </Text>
          <Text  style={styles.resultsCount}>
            {searchResults.totalCount} results found
          </Text>
          {Object.keys(searchResults.filters || {}).length > 0 && (
            <Text  style={styles.filtersInfo}>Filters applied</Text>
          )}
        </View>
        {onViewModeChange && isTablet && (
          <View  style={styles.viewModeToggle}>
            <TouchableOpacity
               style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
              onPress={() => onViewModeChange('list')}
            >
              <Icon name="view-list" size={20} color={viewMode === 'list' ? theme.colors.primary[500] : theme.semantic.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
               style={[styles.viewModeButton, viewMode === 'grid' && styles.viewModeButtonActive]}
              onPress={() => onViewModeChange('grid')}
            >
              <Icon name="view-module" size={20} color={viewMode === 'grid' ? theme.colors.primary[500] : theme.semantic.text.secondary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [searchResults.query, searchResults.totalCount, searchResults.filters, onViewModeChange, viewMode, theme]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) {return null;}

    return (
      <View  style={styles.footer}>
        <Text
          style={styles.loadingText}
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
        >
          Loading more results...
        </Text>
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View  style={styles.loadingContainer}>
          <Text  style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    return (
      <View  style={styles.emptyContainer}>
        <Icon name="search-off" size={64} color={theme.semantic.border.primary} />
        <Text
          style={styles.emptyTitle}
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          accessibilityLabel="No results found"
          accessible={true}
        >
          No Results Found
        </Text>
        <Text
          style={styles.emptyText}
          accessibilityRole="text"
        >
          Try adjusting your search or filters
        </Text>
      </View>
    );
  }, [isLoading, theme]);

  const _scrollButtonStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(showScrollButton ? 1 : 0, {
          damping: 15,
          stiffness: 200,
        }),
      },
    ],
    opacity: withSpring(showScrollButton ? 1 : 0),
  }));

  const styles = useMemo(() => createStyles(theme), [theme]);

  const numColumns = viewMode === 'grid' ? (isTablet ? 3 : 2) : 1;
  const _estimatedItemSize = viewMode === 'grid' ? 280 : 120;

  const contentContainerStyle = useMemo(() => ({
    padding: 16,
    minHeight: searchResults.items.length === 0 ? 400 : undefined,
  }), [searchResults.items.length]);

  return (
    <View  style={[styles.container, style]}>
      <AnimatedFlashList
        ref={flashListRef}
        data={searchResults.items}
        renderItem={renderItem as any}
        keyExtractor={keyExtractor as any}
        numColumns={numColumns}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={contentContainerStyle}
        testID="search-results-list"
        nativeID="flash-list"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
            progressBackgroundColor={theme.semantic.background.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
      />

      {showScrollToTop && (
        <View
          testID="scroll-to-top-button"
          style={[styles.scrollButton, { opacity: 1 }]}
        >
          <TouchableOpacity
            style={styles.scrollButtonInner}
            onPress={handleScrollToTop}
            accessibilityLabel="keyboard-arrow-up"
            accessibilityRole="button"
            testID="scroll-to-top-touchable"
          >
            <Icon name="keyboard-arrow-up" size={24} color={theme.semantic.background.primary} testID="scroll-to-top-icon" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  resultsInfo: {
    flex: 1,
  },
  resultsQuery: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginBottom: 4,
  },
  resultsCount: {
    fontSize: 14,
    color: theme.semantic.text.secondary,
    marginBottom: 2,
  },
  filtersInfo: {
    fontSize: 12,
    color: theme.colors.primary[500],
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: 8,
    padding: 2,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral[900],
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  viewModeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewModeButtonActive: {
    backgroundColor: theme.semantic.background.primary,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.semantic.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
  scrollButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});

export default InfiniteResultsList;
