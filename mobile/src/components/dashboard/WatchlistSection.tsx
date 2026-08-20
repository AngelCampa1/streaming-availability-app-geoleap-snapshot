import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
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
import { MainTabParamList } from '../../navigation/types';

const { width: _width } = Dimensions.get('window');

interface WatchlistSectionProps {
  watchlistId?: string;
  maxItems?: number;
  showHeader?: boolean;
  showViewAll?: boolean;
  horizontal?: boolean;
}

type WatchlistSectionNavigationProp = StackNavigationProp<MainTabParamList, 'Dashboard'>;

export const WatchlistSection: React.FC<WatchlistSectionProps> = ({
  watchlistId,
  maxItems = 5,
  showHeader = true,
  showViewAll = true,
  horizontal = true,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation<WatchlistSectionNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);

  const {
    currentWatchlist,
    watchlists,
    updateWatchlistItem,
    removeFromWatchlist,
    refreshWatchlists,
    loading: _loading,
    error,
  } = useWatchlist();

  const targetWatchlist = watchlistId
    ? watchlists.find(w => w.id === watchlistId)
    : currentWatchlist;

  const items = targetWatchlist?.items.slice(0, maxItems) || [];

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshWatchlists();
    } finally {
      setRefreshing(false);
    }
  };

  const handleItemPress = (item: WatchlistItem) => {
    navigation.navigate('ContentDetail', { item });
  };

  const handleStatusChange = async (item: WatchlistItem, newStatus: WatchlistItem['status']) => {
    if (!targetWatchlist) {return;}

    try {
      await updateWatchlistItem(targetWatchlist.id, item.id, { status: newStatus });
    } catch (error) {
      Alert.alert('Error', 'Failed to update item status');
    }
  };

  const handleRemoveItem = async (item: WatchlistItem) => {
    if (!targetWatchlist) {return;}

    Alert.alert(
      'Remove Item',
      `Are you sure you want to remove "${item.title}" from your watchlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromWatchlist(targetWatchlist.id, item.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove item');
            }
          },
        },
      ],
    );
  };

  const getStatusColor = (status: WatchlistItem['status']) => {
    switch (status) {
      case 'to_watch': return theme.colors.primary[500];
      case 'watching': return theme.colors.secondary[500];
      case 'watched': return theme.colors.success[500];
      case 'on_hold': return theme.colors.warning[500];
      case 'dropped': return theme.colors.error[500];
      default: return theme.semantic.text.secondary;
    }
  };

  const getStatusText = (status: WatchlistItem['status']) => {
    switch (status) {
      case 'to_watch': return 'To Watch';
      case 'watching': return 'Watching';
      case 'watched': return 'Watched';
      case 'on_hold': return 'On Hold';
      case 'dropped': return 'Dropped';
      default: return status;
    }
  };

  const renderWatchlistItem = ({ item }: { item: WatchlistItem }) => (
    <View
      style={[
        styles.itemContainer,
        horizontal && styles.horizontalItemContainer,
      ]}
    >
      <View style={styles.itemContent}>
        {/* Poster/Thumbnail - Clickable to navigate */}
        <TouchableOpacity
          style={styles.posterContainer}
          onPress={() => handleItemPress(item)}
          activeOpacity={0.7}
          accessibilityLabel={`View details for ${item.title}`}
          accessibilityRole="button"
        >
          {item.poster ? (
            <Image source={{ uri: item.poster }} style={styles.poster} />
          ) : (
            <View style={[styles.posterPlaceholder, { backgroundColor: theme.semantic.background.primary }]}>
              <Text style={styles.posterPlaceholderText}>
                {item.type === 'movie' ? '🎬' : item.type === 'tv_series' ? '📺' : '🎭'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Content Info - Clickable to navigate */}
        <TouchableOpacity
          style={styles.itemInfo}
          onPress={() => handleItemPress(item)}
          activeOpacity={0.7}
          accessibilityLabel={`${item.title}, ${item.type}`}
          accessibilityRole="button"
        >
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.itemMeta}>
            {item.type.replace('_', ' ')} • {item.year}
          </Text>

          <Text style={styles.itemRating}>
            ⭐ {item.rating.toFixed(1)}
          </Text>

          {item.availableOn.length > 0 && (
            <Text style={styles.itemAvailable} numberOfLines={1}>
              Available on {item.availableOn.slice(0, 2).join(', ')}
              {item.availableOn.length > 2 && ` +${item.availableOn.length - 2}`}
            </Text>
          )}

          {/* Progress indicator for currently watching */}
          {item.status === 'watching' && item.progress && (
            <View style={styles.progressContainer}>
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
              <Text style={styles.progressText}>
                {item.progress.current || 0}/{item.progress.total || 0}
                {item.progress.episode && ` • S${item.progress.season || 1}E${item.progress.episode}`}
              </Text>
            </View>
          )}

          {/* Status indicator */}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action buttons - Separate touchable area */}
        <View style={styles.itemActions}>
          {item.status === 'to_watch' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.primary[500] }]}
              onPress={() => handleStatusChange(item, 'watching')}
              accessibilityLabel={`Start watching ${item.title}`}
              accessibilityRole="button"
            >
              <Text style={[styles.actionButtonText, { color: theme.semantic.background.primary }]}>▶️</Text>
            </TouchableOpacity>
          )}

          {item.status === 'watching' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.success[500] }]}
              onPress={() => handleStatusChange(item, 'watched')}
              accessibilityLabel={`Mark ${item.title} as watched`}
              accessibilityRole="button"
            >
              <Text style={[styles.actionButtonText, { color: theme.semantic.background.primary }]}>✓</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.semantic.background.secondary }]}
            onPress={() => handleRemoveItem(item)}
            accessibilityLabel={`Remove ${item.title} from watchlist`}
            accessibilityRole="button"
          >
            <Text style={[styles.actionButtonText, { color: theme.colors.error[500] }]}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderHorizontalItem = ({ item }: { item: WatchlistItem }) => (
    <TouchableOpacity
      style={styles.horizontalItem}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
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
      </View>

      <Text style={styles.horizontalItemTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <Text style={styles.horizontalItemMeta}>
        {item.year} • ⭐ {item.rating.toFixed(1)}
      </Text>

      <View style={[styles.horizontalStatusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
        <Text style={[styles.horizontalStatusText, { color: getStatusColor(item.status) }]}>
          {getStatusText(item.status)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (error) {
    return (
      <Card style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load watchlist</Text>
        <Button title="Retry" onPress={refreshWatchlists} variant="outline" size="small" />
      </Card>
    );
  }

  if (!targetWatchlist || items.length === 0) {
    return (
      <Card style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Your watchlist is empty</Text>
        <Text style={styles.emptyText}>
          Start adding content to your watchlist to see it here
        </Text>
        <Button
          title="Browse Content"
          onPress={() => navigation.navigate('Search')}
          variant="primary"
          size="small"
        />
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              {targetWatchlist.name || 'My Watchlist'}
            </Text>
            <Text style={styles.subtitle}>
              {targetWatchlist.items.length} items
            </Text>
          </View>

          {showViewAll && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Favorites')}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {horizontal ? (
        <FlatList
          data={items}
          renderItem={renderHorizontalItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <FlatList
          data={items}
          renderItem={renderWatchlistItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {targetWatchlist.items.length > maxItems && showViewAll && (
        <TouchableOpacity
          style={styles.seeMoreButton}
          onPress={() => navigation.navigate('Favorites')}
        >
          <Text style={styles.seeMoreText}>
            See all {targetWatchlist.items.length} items
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

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
    marginTop: theme.spacing.xs,
  },
  viewAllButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  viewAllText: {
    ...theme.typography.body2,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  itemContainer: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
  },
  horizontalItemContainer: {
    marginHorizontal: theme.spacing.sm,
    marginVertical: 0,
  },
  itemContent: {
    flexDirection: 'row',
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  posterContainer: {
    marginRight: theme.spacing.md,
  },
  poster: {
    width: theme.spacing[20], // 80px
    height: theme.spacing[30], // 120px
    borderRadius: theme.borderRadius.sm,
  },
  posterPlaceholder: {
    width: theme.spacing[20], // 80px
    height: theme.spacing[30], // 120px
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderText: {
    fontSize: theme.typography.fontSize['5xl'],
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
  itemRating: {
    ...theme.typography.caption,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing.xs,
  },
  itemAvailable: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  progressContainer: {
    marginVertical: theme.spacing.sm,
  },
  progressBar: {
    height: theme.spacing[1], // 4px
    backgroundColor: theme.semantic.background.primary,
    borderRadius: theme.borderRadius.xs,
    marginBottom: theme.spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.xs,
  },
  progressText: {
    ...theme.typography.caption,
    color: theme.semantic.text.secondary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
  },
  statusText: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
  itemActions: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: theme.spacing.md,
  },
  actionButton: {
    width: theme.spacing[9], // 36px
    height: theme.spacing[9], // 36px
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  actionButtonText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
  },
  horizontalList: {
    paddingHorizontal: theme.spacing.lg,
  },
  horizontalItem: {
    width: theme.spacing[30], // 120px
    marginRight: theme.spacing.md,
  },
  horizontalPosterContainer: {
    marginBottom: theme.spacing.sm,
  },
  horizontalPoster: {
    width: theme.spacing[30], // 120px
    height: theme.spacing[45], // 180px
    borderRadius: theme.borderRadius.sm,
  },
  horizontalPosterPlaceholder: {
    width: theme.spacing[30], // 120px
    height: theme.spacing[45], // 180px
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalPosterPlaceholderText: {
    fontSize: theme.typography.fontSize['6xl'],
  },
  horizontalItemTitle: {
    ...theme.typography.subtitle2,
    color: theme.semantic.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  horizontalItemMeta: {
    ...theme.typography.caption,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  horizontalStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing[0.5], // 2px
    borderRadius: theme.borderRadius.xs,
  },
  horizontalStatusText: {
    ...theme.typography.overline,
    fontWeight: '600',
  },
  seeMoreButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  seeMoreText: {
    ...theme.typography.body2,
    color: theme.colors.primary,
    fontWeight: '500',
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
