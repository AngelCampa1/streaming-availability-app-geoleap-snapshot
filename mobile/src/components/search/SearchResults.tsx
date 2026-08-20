import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ViewStyle,
  TextStyle,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,

} from 'react-native';
import { SvgXml } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SearchResult } from '../../types/streaming';
import { useTheme } from '../../theme/ThemeProvider';
import { getStreamingLogo } from '@/assets';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMoreResults?: boolean;
  searchError?: Error | null;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  onResultPress?: (result: SearchResult) => void;
  onWatchlistToggle?: (result: SearchResult) => void;
  onShare?: (result: SearchResult) => void;
  viewMode?: 'list' | 'grid';
  onViewModeChange?: (mode: 'list' | 'grid') => void;
  style?: ViewStyle;
  testID?: string;
}

const { width: screenWidth } = Dimensions.get('window');
const numColumns = 2;
const itemWidth = (screenWidth - 48) / numColumns; // 48 = padding + gaps

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isLoading = false,
  isLoadingMore = false,
  hasMoreResults = false,
  searchError = null,
  onLoadMore,
  onRefresh,
  onResultPress,
  onWatchlistToggle,
  onShare,
  viewMode = 'list',
  onViewModeChange,
  style,
  testID = 'search-results',
}) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedResult, setSelectedResult] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handleResultPress = useCallback((result: SearchResult) => {
    setSelectedResult(result.content.id);
    onResultPress?.(result);

    // Clear selection after animation
    setTimeout(() => setSelectedResult(null), 300);
  }, [onResultPress]);

  const handleWatchlistToggle = useCallback((result: SearchResult, event?: any) => {
    event?.stopPropagation();
    onWatchlistToggle?.(result);
  }, [onWatchlistToggle]);

  const handleShare = useCallback((result: SearchResult, event?: any) => {
    event?.stopPropagation();
    onShare?.(result);
  }, [onShare]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const renderListItem = useCallback(({ item, index }: { item: SearchResult; index: number }) => (
    <TouchableOpacity
      style={[
        styles.listItem,
        selectedResult === item.content.id && styles.listItemSelected,
      ]}
      onPress={() => handleResultPress(item)}
      testID={`${testID}-item-${index}`}
    >
      {/* Poster */}
      <Image
        source={{ uri: item.content.poster || 'https://via.placeholder.com/80x120?text=No+Image' }}
        style={styles.listItemPoster as any}
      />

      {/* Content */}
      <View style={styles.listItemContent}>
        {/* Title and Type */}
        <View style={styles.listItemHeader}>
          <Text style={styles.listItemTitle} numberOfLines={2}>
            {item.content.title}
          </Text>
          <View style={styles.contentTypeBadge}>
            <Text style={styles.contentTypeBadgeText}>
              {item.content.type.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Metadata */}
        <View style={styles.listItemMetadata}>
          {item.content.releaseYear && (
            <Text style={styles.metadataText}>{item.content.releaseYear}</Text>
          )}
          {item.content.rating && (
            <>
              <Icon name="star" size={12} color={theme.colors.warning[500]} style={styles.ratingIcon as any} />
              <Text style={styles.metadataText}>{item.content.rating.toFixed(1)}</Text>
            </>
          )}
          {item.content.duration && (
            <Text style={styles.metadataText}>
              {Math.floor(item.content.duration / 60)}h {item.content.duration % 60}m
            </Text>
          )}
        </View>

        {/* Description */}
        {item.content.description && (
          <Text style={styles.listItemDescription} numberOfLines={3}>
            {item.content.description}
          </Text>
        )}

        {/* Availability */}
        <View style={styles.availabilityContainer}>
          <Text style={styles.availabilityLabel}>Available on:</Text>
          <View style={styles.serviceBadges}>
            {item.availability.slice(0, 3).map((avail, idx) => {
              const logo = getStreamingLogo(avail.service.id);
              return (
                <View key={idx} style={styles.serviceBadge}>
                  {logo?.svg ? (
                    <View style={[styles.serviceIcon as any, { backgroundColor: logo.color, justifyContent: 'center', alignItems: 'center' }]}>
                      <SvgXml xml={logo.svg} width={10} height={10} />
                    </View>
                  ) : (
                    <View style={[styles.serviceIcon as any, { backgroundColor: theme.semantic.border.primary, justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{ color: theme.semantic.text.primary, fontSize: 8, fontWeight: '600' }}>
                        {avail.service.name.charAt(0)}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.serviceName}>{avail.service.name}</Text>
                  {avail.quality && (
                    <Text style={styles.qualityText}>{avail.quality}</Text>
                  )}
                </View>
              );
            })}
            {item.availability.length > 3 && (
              <Text style={styles.moreServicesText}>
                +{item.availability.length - 3} more
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.listItemActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              item.watchlistAdded && styles.actionButtonActive,
            ]}
            onPress={(e) => handleWatchlistToggle(item, e)}
            testID={`${testID}-watchlist-${index}`}
          >
            <Icon
              name={item.watchlistAdded ? 'bookmark' : 'bookmark-border'}
              size={18}
              color={item.watchlistAdded ? theme.colors.primary[500] : theme.semantic.text.secondary}
            />
            <Text style={[
              styles.actionButtonText,
              item.watchlistAdded && styles.actionButtonTextActive,
            ]}>
              {item.watchlistAdded ? 'Added' : 'Watchlist'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => handleShare(item, e)}
            testID={`${testID}-share-${index}`}
          >
            <Icon name="share" size={18} color={theme.semantic.text.secondary} />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  ), [selectedResult, handleResultPress, handleWatchlistToggle, handleShare, testID]);

  const renderGridItem = useCallback(({ item, index }: { item: SearchResult; index: number }) => (
    <TouchableOpacity
      style={[
        styles.gridItem,
        selectedResult === item.content.id && styles.gridItemSelected,
      ]}
      onPress={() => handleResultPress(item)}
      testID={`${testID}-grid-item-${index}`}
    >
      {/* Poster */}
      <View style={styles.gridItemPosterContainer}>
        <Image
          source={{ uri: item.content.poster || 'https://via.placeholder.com/150x225?text=No+Image' }}
          style={styles.gridItemPoster as any}
        />

        {/* Overlay with rating */}
        {item.content.rating && (
          <View style={styles.gridItemRating}>
            <Icon name="star" size={12} color={theme.colors.warning[500]} />
            <Text style={styles.gridItemRatingText}>{item.content.rating.toFixed(1)}</Text>
          </View>
        )}

        {/* Type badge */}
        <View style={styles.gridItemTypeBadge}>
          <Text style={styles.gridItemTypeBadgeText}>
            {item.content.type.toUpperCase().charAt(0)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.gridItemContent}>
        <Text style={styles.gridItemTitle} numberOfLines={2}>
          {item.content.title}
        </Text>

        {item.content.releaseYear && (
          <Text style={styles.gridItemYear}>{item.content.releaseYear}</Text>
        )}

        {/* Quick actions */}
        <View style={styles.gridItemActions}>
          <TouchableOpacity
            style={styles.gridActionButton}
            onPress={(e) => handleWatchlistToggle(item, e)}
          >
            <Icon
              name={item.watchlistAdded ? 'bookmark' : 'bookmark-border'}
              size={14}
              color={item.watchlistAdded ? theme.colors.primary[500] : theme.semantic.text.secondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gridActionButton}
            onPress={(e) => handleShare(item, e)}
          >
            <Icon name="share" size={14} color={theme.semantic.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  ), [selectedResult, handleResultPress, handleWatchlistToggle, handleShare, testID]);

  const renderFooter = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading more results...</Text>
        </View>
      );
    }

    if (!hasMoreResults && results.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {results.length} results found
          </Text>
        </View>
      );
    }

    return null;
  }, [isLoadingMore, hasMoreResults, results.length]);

  const keyExtractor = useCallback((item: SearchResult) => item.content.id, []);

  const renderEmptyState = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    if (searchError) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color={theme.colors.error[500]} />
          <Text style={styles.errorTitle}>Search Failed</Text>
          <Text style={styles.errorMessage}>
            {searchError.message || 'An error occurred while searching'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Icon name="search-off" size={48} color={theme.semantic.text.tertiary} />
        <Text style={styles.emptyTitle}>No Results Found</Text>
        <Text style={styles.emptyMessage}>
          Try different keywords or adjust your filters
        </Text>
      </View>
    );
  }, [isLoading, searchError, handleRefresh, theme, styles]);

  const renderViewModeToggle = useCallback(() => (
    <View style={styles.viewModeToggle}>
      <TouchableOpacity
        style={[
          styles.viewModeButton,
          viewMode === 'list' && styles.viewModeButtonActive,
        ]}
        onPress={() => onViewModeChange?.('list')}
      >
        <Icon
          name="view-list"
          size={20}
          color={viewMode === 'list' ? theme.colors.primary[500] : theme.semantic.text.secondary}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.viewModeButton,
          viewMode === 'grid' && styles.viewModeButtonActive,
        ]}
        onPress={() => onViewModeChange?.('grid')}
      >
        <Icon
          name="grid-view"
          size={20}
          color={viewMode === 'grid' ? theme.colors.primary[500] : theme.semantic.text.secondary}
        />
      </TouchableOpacity>
    </View>
  ), [viewMode, onViewModeChange]);

  if (viewMode === 'grid') {
    return (
      <View style={[styles.container, style]} testID={testID}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.resultsCount}>
            {results.length} {results.length === 1 ? 'result' : 'results'}
          </Text>
          {renderViewModeToggle()}
        </View>

        {/* Grid List */}
        <FlatList
          data={results}
          renderItem={renderGridItem}
          keyExtractor={keyExtractor}
          numColumns={numColumns}
          contentContainerStyle={styles.gridContainer}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            ) : undefined
          }
          onEndReached={hasMoreResults ? onLoadMore : undefined}
          onEndReachedThreshold={0.1}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.resultsCount}>
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </Text>
        {renderViewModeToggle()}
      </View>

      {/* List */}
      <FlatList
        data={results}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          ) : undefined
        }
        onEndReached={hasMoreResults ? onLoadMore : undefined}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.semantic.border.primary,
  } as ViewStyle,
  resultsCount: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: theme.semantic.text.primary,
  } as TextStyle,
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[0.5],
  } as ViewStyle,
  viewModeButton: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1.5],
    borderRadius: theme.borderRadius.sm,
  } as ViewStyle,
  viewModeButtonActive: {
    backgroundColor: theme.semantic.background.primary,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,

  // List styles
  listContainer: {
    paddingHorizontal: theme.spacing[4],
  } as ViewStyle,
  listItem: {
    flexDirection: 'row',
    backgroundColor: theme.semantic.background.primary,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.semantic.border.primary,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[3],
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,
  listItemSelected: {
    borderColor: theme.colors.primary[500],
    shadowColor: theme.colors.primary[500],
    shadowOpacity: 0.2,
  } as ViewStyle,
  listItemPoster: {
    width: 80,
    height: 120,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.semantic.border.primary,
  } as ViewStyle,
  listItemContent: {
    flex: 1,
    marginLeft: theme.spacing[3],
  } as ViewStyle,
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[1],
  } as ViewStyle,
  listItemTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginRight: theme.spacing[2],
  } as TextStyle,
  contentTypeBadge: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing[1.5],
    paddingVertical: theme.spacing[0.5],
    borderRadius: theme.borderRadius.sm,
  } as ViewStyle,
  contentTypeBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[50],
    fontWeight: '600',
  } as TextStyle,
  listItemMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[1.5],
  } as ViewStyle,
  metadataText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    marginRight: theme.spacing[3],
  } as TextStyle,
  ratingIcon: {
    marginRight: theme.spacing[0.5],
  } as ViewStyle,
  listItemDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    lineHeight: 18,
    marginBottom: theme.spacing[2],
  } as TextStyle,
  availabilityContainer: {
    marginBottom: theme.spacing[2],
  } as ViewStyle,
  availabilityLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.tertiary,
    marginBottom: theme.spacing[1],
  } as TextStyle,
  serviceBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[1.5],
  } as ViewStyle,
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.semantic.background.secondary,
    paddingHorizontal: theme.spacing[1.5],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  } as ViewStyle,
  serviceIcon: {
    width: 16,
    height: 16,
    borderRadius: theme.borderRadius.xs,
    marginRight: theme.spacing[1],
  } as ViewStyle,
  serviceName: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.primary,
    fontWeight: '500',
  } as TextStyle,
  qualityText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
    marginLeft: theme.spacing[1],
    fontWeight: '600',
  } as TextStyle,
  moreServicesText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
    fontStyle: 'italic',
  } as TextStyle,
  listItemActions: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  } as ViewStyle,
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1.5],
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.semantic.background.secondary,
    borderWidth: 1,
    borderColor: theme.semantic.border.primary,
  } as ViewStyle,
  actionButtonActive: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[500],
  } as ViewStyle,
  actionButtonText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
    marginLeft: theme.spacing[1],
    fontWeight: '500',
  } as TextStyle,
  actionButtonTextActive: {
    color: theme.colors.primary[500],
  } as TextStyle,

  // Grid styles
  gridContainer: {
    paddingHorizontal: theme.spacing[4],
  } as ViewStyle,
  gridItem: {
    width: itemWidth,
    backgroundColor: theme.semantic.background.primary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.semantic.border.primary,
    margin: theme.spacing[1],
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,
  gridItemSelected: {
    borderColor: theme.colors.primary[500],
    shadowColor: theme.colors.primary[500],
    shadowOpacity: 0.2,
  } as ViewStyle,
  gridItemPosterContainer: {
    position: 'relative',
  } as ViewStyle,
  gridItemPoster: {
    width: '100%',
    height: itemWidth * 1.5,
    borderTopLeftRadius: theme.borderRadius.md,
    borderTopRightRadius: theme.borderRadius.md,
    backgroundColor: theme.semantic.border.primary,
  } as ViewStyle,
  gridItemRating: {
    position: 'absolute',
    top: theme.spacing[1.5],
    right: theme.spacing[1.5],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.overlay.lightest,
    paddingHorizontal: theme.spacing[1.5],
    paddingVertical: theme.spacing[0.5],
    borderRadius: theme.borderRadius.full,
  } as ViewStyle,
  gridItemRatingText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[50],
    marginLeft: theme.spacing[0.5],
    fontWeight: '600',
  } as TextStyle,
  gridItemTypeBadge: {
    position: 'absolute',
    top: theme.spacing[1.5],
    left: theme.spacing[1.5],
    backgroundColor: theme.colors.primary[500],
    width: 20,
    height: 20,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  gridItemTypeBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral[50],
    fontWeight: '600',
  } as TextStyle,
  gridItemContent: {
    padding: theme.spacing[2],
  } as ViewStyle,
  gridItemTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  } as TextStyle,
  gridItemYear: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing[1.5],
  } as TextStyle,
  gridItemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  } as ViewStyle,
  gridActionButton: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.semantic.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,

  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing[10],
  } as ViewStyle,
  loadingText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.semantic.text.secondary,
    marginTop: theme.spacing[3],
  } as TextStyle,
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing[10],
    paddingHorizontal: theme.spacing[5],
  } as ViewStyle,
  errorTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  } as TextStyle,
  errorMessage: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing[5],
  } as TextStyle,
  retryButton: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[2.5],
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.md,
  } as ViewStyle,
  retryButtonText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.neutral[50],
    fontWeight: '600',
  } as TextStyle,
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing[10],
    paddingHorizontal: theme.spacing[5],
  } as ViewStyle,
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  } as TextStyle,
  emptyMessage: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
  } as TextStyle,
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing[5],
  } as ViewStyle,
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing[5],
  } as ViewStyle,
  footerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  } as TextStyle,
});

export default SearchResults;
