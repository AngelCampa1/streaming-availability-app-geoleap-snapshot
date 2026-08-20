import React, { useState, useCallback, useMemo } from 'react';
import { RootStackParamList } from '../../navigation/types';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,

  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useWatchlist } from '../../hooks/useWatchlist';
import { WatchlistItem } from '../../services/watchlist/WatchlistService';
import { logger } from '../../utils/logger';

const { width: _width } = Dimensions.get('window');

interface CurrentlyWatchingProps {
  maxItems?: number;
  showProgress?: boolean;
  showNextEpisode?: boolean;
  horizontal?: boolean;
}

type CurrentlyWatchingNavigationProp = StackNavigationProp<RootStackParamList, 'Dashboard'>;

export const CurrentlyWatching: React.FC<CurrentlyWatchingProps> = React.memo(({
  maxItems = 5,
  showProgress = true,
  showNextEpisode = true,
  horizontal = true,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const _navigation = useNavigation<CurrentlyWatchingNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);

  const {
    currentWatchlist: _currentWatchlist,
    watchlists,
    updateWatchlistItem,
    refreshWatchlists,
    loading,
    error,
  } = useWatchlist();

  // Get items currently being watched
  const currentlyWatchingItems = useMemo(
    () => watchlists
      .flatMap(w => w.items.map(item => ({ ...item, watchlistId: w.id })))
      .filter(item => item.status === 'watching')
      .slice(0, maxItems),
    [watchlists, maxItems]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWatchlists();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWatchlists]);

  const handleItemPress = useCallback((item: WatchlistItem & { watchlistId: string }) => {
    _navigation.navigate('ContentDetail', { item });
  }, [_navigation]);

  const handleContinueWatching = useCallback(async (item: WatchlistItem & { watchlistId: string }) => {
    if (!item.watchlistId) {return;}

    try {
      // Simulate opening the content for viewing
      await updateWatchlistItem(item.watchlistId, item.id, {
        progress: {
          ...item.progress,
          current: Math.min((item.progress?.current || 0) + 1, item.progress?.total || 1),
        },
      });
    } catch (error) {
      logger.error('[CurrentlyWatching] Failed to update progress', error);
    }
  }, [updateWatchlistItem]);

  const handleMarkComplete = useCallback(async (item: WatchlistItem & { watchlistId: string }) => {
    if (!item.watchlistId) {return;}

    try {
      await updateWatchlistItem(item.watchlistId, item.id, {
        status: 'watched',
        watchedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[CurrentlyWatching] Failed to mark as complete', error);
    }
  }, [updateWatchlistItem]);

  const handleMarkOnHold = useCallback(async (item: WatchlistItem & { watchlistId: string }) => {
    if (!item.watchlistId) {return;}

    try {
      await updateWatchlistItem(item.watchlistId, item.id, {
        status: 'on_hold',
      });
    } catch (error) {
      logger.error('[CurrentlyWatching] Failed to mark as on hold', error);
    }
  }, [updateWatchlistItem]);

  const formatProgress = useCallback((current?: number, total?: number) => {
    if (!current || !total) {return '0%';}
    return `${Math.round((current / total) * 100)}%`;
  }, []);

  const formatTimeRemaining = useCallback((total?: number, current?: number) => {
    if (!total || !current) {return 'Unknown';}
    const remaining = total - current;
    if (remaining <= 0) {return 'Completed';}

    if (remaining < 60) {return `${remaining}m left`;}
    const hours = Math.floor(remaining / 60);
    const mins = remaining % 60;
    return `${hours}h ${mins}m left`;
  }, []);

  const renderCurrentlyWatchingItem = useCallback(({ item }: { item: WatchlistItem & { watchlistId: string } }) => (
    <TouchableOpacity
      style={[
        styles.itemContainer,
        horizontal && styles.horizontalItemContainer,
      ]}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      <Card variant="elevated" style={styles.card}>
        {/* Content Header */}
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.title}
            </Text>

            <Text style={styles.itemMeta}>
              {item.type.replace('_', ' ')} • {item.year}
            </Text>

            {item.progress?.episode && (
              <Text style={styles.episodeInfo}>
                Season {item.progress.season || 1}, Episode {item.progress.episode}
              </Text>
            )}
          </View>

          <View style={styles.itemActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.continueButton]}
              onPress={() => handleContinueWatching(item)}
            >
              <Text style={styles.actionButtonText}>▶️ Continue</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Section */}
        {showProgress && item.progress && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                {formatProgress(item.progress.current, item.progress.total)} Complete
              </Text>
              <Text style={styles.timeRemainingText}>
                {formatTimeRemaining(item.progress.total, item.progress.current)}
              </Text>
            </View>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(item.progress.current || 0) / (item.progress.total || 1) * 100}%`,
                    backgroundColor: theme.colors.primary[500],
                  },
                ]}
              />
            </View>

            {/* Progress details */}
            <View style={styles.progressDetails}>
              <Text style={styles.progressDetailText}>
                {item.progress.current || 0} / {item.progress.total || 0}
                {(item.progress as any)?.runtime && ` • ${(item.progress as any).runtime} min episodes`}
              </Text>
            </View>
          </View>
        )}

        {/* Next Episode Preview */}
        {showNextEpisode && item.type === 'tv_series' && item.progress && (
          <View style={styles.nextEpisodeSection}>
            <Text style={styles.nextEpisodeTitle}>Next Episode</Text>
            <View style={styles.nextEpisodeInfo}>
              <Text style={styles.nextEpisodeText}>
                Episode {((item.progress.episode || 0) + 1)} • Coming up next
              </Text>
              <TouchableOpacity
                style={styles.playNextButton}
                onPress={() => handleContinueWatching(item)}
              >
                <Text style={styles.playNextButtonText}>Play Next →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Content Actions */}
        <View style={styles.contentActions}>
          <TouchableOpacity
            style={[styles.secondaryActionButton, { backgroundColor: theme.colors.success + '20' }]}
            onPress={() => handleMarkComplete(item)}
          >
            <Text style={[styles.secondaryActionText, { color: theme.colors.success }]}>
              ✓ Mark Complete
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryActionButton, { backgroundColor: theme.colors.warning + '20' }]}
            onPress={() => handleMarkOnHold(item)}
          >
            <Text style={[styles.secondaryActionText, { color: theme.colors.warning }]}>
              ⏸ On Hold
            </Text>
          </TouchableOpacity>
        </View>

        {/* Additional Info */}
        <View style={styles.additionalInfo}>
          {item.availableOn.length > 0 && (
            <Text style={styles.availableOnText}>
              Available on {item.availableOn.slice(0, 2).join(', ')}
              {item.availableOn.length > 2 && ` +${item.availableOn.length - 2}`}
            </Text>
          )}

          {item.addedAt && (
            <Text style={styles.addedAtText}>
              Added {new Date(item.addedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  ), [styles, horizontal, handleItemPress, showProgress, theme, formatProgress, formatTimeRemaining, showNextEpisode, handleContinueWatching, handleMarkComplete, handleMarkOnHold]);

  const renderHorizontalItem = useCallback(({ item }: { item: WatchlistItem & { watchlistId: string } }) => (
    <TouchableOpacity
      style={styles.horizontalItem}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      <Card variant="elevated" style={styles.horizontalCard}>
        {/* Poster/Image */}
        <View style={styles.horizontalPosterContainer}>
          {item.poster ? (
            <Image source={{ uri: item.poster }} style={styles.horizontalPoster} />
          ) : (
            <View style={[styles.horizontalPosterPlaceholder, { backgroundColor: theme.semantic.background.primary }]}>
              <Text style={styles.horizontalPosterPlaceholderText}>
                {item.type === 'movie' ? '🎬' : item.type === 'tv_series' ? '📺' : '🎭'}
              </Text>
            </View>
          )}

          {/* Progress Overlay */}
          {showProgress && item.progress && (
            <View style={styles.horizontalProgressOverlay}>
              <View style={styles.horizontalProgressBar}>
                <View
                  style={[
                    styles.horizontalProgressFill,
                    {
                      width: `${(item.progress.current || 0) / (item.progress.total || 1) * 100}%`,
                      backgroundColor: theme.colors.primary[500],
                    },
                  ]}
                />
              </View>
              <Text style={styles.horizontalProgressText}>
                {formatProgress(item.progress.current, item.progress.total)}
              </Text>
            </View>
          )}
        </View>

        {/* Content Info */}
        <View style={styles.horizontalContent}>
          <Text style={styles.horizontalTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {item.progress?.episode && (
            <Text style={styles.horizontalEpisode}>
              S{item.progress.season || 1}E{item.progress.episode}
            </Text>
          )}

          <Text style={styles.horizontalMeta}>
            {item.year} • ⭐ {item.rating.toFixed(1)}
          </Text>

          <TouchableOpacity
            style={styles.horizontalContinueButton}
            onPress={() => handleContinueWatching(item)}
          >
            <Text style={styles.horizontalContinueText}>▶️ Continue</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </TouchableOpacity>
  ), [styles, handleItemPress, theme, showProgress, formatProgress, handleContinueWatching]);

  if (loading && currentlyWatchingItems.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading currently watching...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <Card style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load currently watching</Text>
        <Button title="Retry" onPress={refreshWatchlists} variant="outline" size="small" />
      </Card>
    );
  }

  if (currentlyWatchingItems.length === 0) {
    return (
      <Card style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Nothing currently watching</Text>
        <Text style={styles.emptyText}>
          Start watching content from your watchlist to see it here
        </Text>
        <Button
          title="Browse Watchlist"
          onPress={() => _navigation.navigate('Favorites')}
          variant="primary"
          size="small"
        />
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Continue Watching</Text>
        <Text style={styles.subtitle}>
          {currentlyWatchingItems.length} items in progress
        </Text>
      </View>

      {/* Content List */}
      {horizontal ? (
        <FlatList
          data={currentlyWatchingItems}
          renderItem={renderHorizontalItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={5}
          getItemLayout={(_data, index) => ({
            length: 160,
            offset: (160 + theme.spacing[4]) * index, // spacing[4] = 16px
            index,
          })}
        />
      ) : (
        <FlatList
          data={currentlyWatchingItems}
          renderItem={renderCurrentlyWatchingItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.verticalList}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={5}
          initialNumToRender={5}
        />
      )}
    </View>
  );
});

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    marginVertical: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h5,
    color: theme.semantic.text.primary,
    fontWeight: '600',
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.semantic.text.secondary,
  },
  itemContainer: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
  },
  horizontalItemContainer: {
    marginHorizontal: theme.spacing.sm,
    marginVertical: 0,
  },
  card: {
    overflow: 'hidden',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    ...theme.typography.subtitle1,
    color: theme.semantic.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  itemMeta: {
    ...theme.typography.caption,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  episodeInfo: {
    ...theme.typography.body2,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  itemActions: {
    marginLeft: theme.spacing.md,
  },
  actionButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
  },
  actionButtonText: {
    ...theme.typography.caption,
    color: theme.semantic.background.primary,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: theme.spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressText: {
    ...theme.typography.body2,
    color: theme.semantic.text.primary,
    fontWeight: '500',
  },
  timeRemainingText: {
    ...theme.typography.caption,
    color: theme.semantic.text.secondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.semantic.background.primary,
    borderRadius: 4,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressDetails: {
    marginBottom: theme.spacing.sm,
  },
  progressDetailText: {
    ...theme.typography.caption,
    color: theme.semantic.text.secondary,
  },
  nextEpisodeSection: {
    backgroundColor: theme.semantic.background.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
  },
  nextEpisodeTitle: {
    ...theme.typography.subtitle2,
    color: theme.semantic.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  nextEpisodeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextEpisodeText: {
    ...theme.typography.body2,
    color: theme.semantic.text.secondary,
    flex: 1,
  },
  playNextButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
  },
  playNextButtonText: {
    ...theme.typography.caption,
    color: theme.semantic.background.primary,
    fontWeight: '600',
  },
  contentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  secondaryActionButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    marginHorizontal: theme.spacing.xs,
  },
  secondaryActionText: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
  additionalInfo: {
    gap: theme.spacing.xs,
  },
  availableOnText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
  },
  addedAtText: {
    ...theme.typography.caption,
    color: theme.semantic.text.secondary,
  },
  horizontalList: {
    paddingHorizontal: theme.spacing.lg,
  },
  horizontalItem: {
    width: 160,
    marginRight: theme.spacing.md,
  },
  horizontalCard: {
    height: '100%',
  },
  horizontalPosterContainer: {
    position: 'relative',
    marginBottom: theme.spacing.sm,
  },
  horizontalPoster: {
    width: 160,
    height: 240,
    borderRadius: theme.borderRadius.lg,
  },
  horizontalPosterPlaceholder: {
    width: 160,
    height: 240,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalPosterPlaceholderText: {
    fontSize: 48,
  },
  horizontalProgressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.overlay.lightest,
    padding: theme.spacing.sm,
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
  },
  horizontalProgressBar: {
    height: 4,
    backgroundColor: theme.colors.overlay.lightMedium,
    borderRadius: 2,
    marginBottom: theme.spacing.xs,
  },
  horizontalProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  horizontalProgressText: {
    ...theme.typography.overline,
    color: theme.semantic.background.primary,
    textAlign: 'center',
  },
  horizontalContent: {
    paddingHorizontal: theme.spacing.xs,
  },
  horizontalTitle: {
    ...theme.typography.subtitle2,
    color: theme.semantic.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  horizontalEpisode: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '500',
    marginBottom: theme.spacing.xs,
  },
  horizontalMeta: {
    ...theme.typography.caption,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  horizontalContinueButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  horizontalContinueText: {
    ...theme.typography.caption,
    color: theme.semantic.background.primary,
    fontWeight: '600',
  },
  verticalList: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  loadingContainer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body2,
    color: theme.semantic.text.secondary,
  },
  errorContainer: {
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    ...theme.typography.body2,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyContainer: {
    margin: theme.spacing.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...theme.typography.h6,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body2,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
});
