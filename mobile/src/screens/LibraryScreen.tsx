import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { logger } from '../utils/logger';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useWatchlist } from '../hooks/useWatchlist';
import { useIsAuthenticated } from '../hooks/useAuth';
import { WatchlistItem } from '../services/watchlist/WatchlistService';

export interface LibraryItem {
  id: string;
  title: string;
  year?: number;
  rating?: number;
  poster?: string;
  type: 'movie' | 'show';
  addedAt: number;
  lastWatched?: number;
  watchProgress?: number; // 0-100
  streamingServices?: string[];
}

export interface LibraryScreenState {
  activeTab: 'watchlist' | 'history';
  isRefreshing: boolean;
}

/**
 * Convert WatchlistItem to LibraryItem for display
 */
const convertToLibraryItem = (item: WatchlistItem): LibraryItem => {
  // Calculate watch progress from progress object if available
  let watchProgress: number | undefined;
  if (item.progress?.current && item.progress?.total) {
    watchProgress = Math.round((item.progress.current / item.progress.total) * 100);
  }

  return {
    id: item.id,
    title: item.title,
    year: item.year,
    rating: item.userRating || item.rating,
    poster: item.poster,
    type: item.type === 'tv_series' || item.type === 'anime' ? 'show' : 'movie',
    addedAt: new Date(item.addedAt).getTime(),
    lastWatched: item.watchedAt ? new Date(item.watchedAt).getTime() : undefined,
    watchProgress,
    streamingServices: item.availableOn,
  };
};

const LibraryScreen: React.FC = () => {
  const { theme } = useTheme();
  const isAuthenticated = useIsAuthenticated();

  // Use the watchlist hook for real data
  const {
    watchlists,
    loading: isLoading,
    error,
    refreshWatchlists,
    removeFromWatchlist,
  } = useWatchlist({ autoRefresh: false });

  const [state, setState] = useState<LibraryScreenState>({
    activeTab: 'watchlist',
    isRefreshing: false,
  });

  // Combine all watchlist items
  const allItems = useMemo(() => {
    return watchlists.flatMap(w => w.items);
  }, [watchlists]);

  // Filter items for watchlist tab (to_watch, watching, on_hold)
  const watchlistItems = useMemo(() => {
    return allItems
      .filter(item => ['to_watch', 'watching', 'on_hold'].includes(item.status))
      .map(convertToLibraryItem)
      .sort((a, b) => b.addedAt - a.addedAt);
  }, [allItems]);

  // Filter items for history tab (watched items with watchedAt date)
  const historyItems = useMemo(() => {
    return allItems
      .filter(item => item.status === 'watched' || item.watchedAt)
      .map(convertToLibraryItem)
      .sort((a, b) => (b.lastWatched || b.addedAt) - (a.lastWatched || a.addedAt));
  }, [allItems]);

  const handleRefresh = useCallback(async () => {
    setState(prev => ({ ...prev, isRefreshing: true }));
    try {
      await refreshWatchlists();
    } finally {
      setState(prev => ({ ...prev, isRefreshing: false }));
    }
  }, [refreshWatchlists]);

  const handleItemPress = useCallback((item: LibraryItem) => {
    logger.log('[LibraryScreen] Library item pressed', { itemTitle: item.title });
    // Navigate to content details
  }, []);

  const handleRemoveFromWatchlist = useCallback((item: LibraryItem) => {
    // Find the watchlist that contains this item
    const parentWatchlist = watchlists.find(w => w.items.some(i => i.id === item.id));
    if (!parentWatchlist) {
      logger.error('[LibraryScreen] Could not find parent watchlist for item', { itemId: item.id });
      return;
    }

    Alert.alert(
      'Remove from Watchlist',
      `Remove "${item.title}" from your watchlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromWatchlist(parentWatchlist.id, item.id);
            } catch (err) {
              logger.error('[LibraryScreen] Failed to remove item', err);
              Alert.alert('Error', 'Failed to remove item from watchlist');
            }
          },
        },
      ],
    );
  }, [watchlists, removeFromWatchlist]);

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      'Clear History',
      'This feature is not yet available. Your viewing history is stored on the server.',
      [{ text: 'OK', style: 'default' }],
    );
  }, []);

  const renderLibraryItem = useCallback(({ item }: { item: LibraryItem }) => (
    <TouchableOpacity
      style={styles.libraryItem}
      onPress={() => handleItemPress(item)}
      testID={`library-item-${item.id}`}
      accessibilityLabel={`${item.title}, ${item.type}`}
      accessibilityRole="button"
    >
      <View style={styles.itemPoster}>
        {item.poster ? (
          <Image
            source={{ uri: item.poster }}
            style={styles.posterImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Icon name={item.type === 'movie' ? 'movie' : 'tv'} size={32} color={theme.colors.primary[500]} />
        )}
      </View>

      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>

        <View style={styles.itemMeta}>
          {item.year && (
            <Text style={styles.itemYear}>{item.year}</Text>
          )}
          {item.rating && (
            <View style={styles.itemRating}>
              <Icon name="star" size={12} color={theme.colors.warning[400]} />
              <Text style={styles.itemRatingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
          <Text style={styles.itemType}>{item.type.toUpperCase()}</Text>
        </View>

        {item.streamingServices && item.streamingServices.length > 0 && (
          <Text style={styles.itemServices} numberOfLines={1}>
            {item.streamingServices.join(', ')}
          </Text>
        )}

        {item.watchProgress !== undefined && item.watchProgress > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${item.watchProgress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{item.watchProgress}%</Text>
          </View>
        )}

        {item.lastWatched && (
          <Text style={styles.itemLastWatched}>
            Watched {getRelativeTime(item.lastWatched)}
          </Text>
        )}
      </View>

      {state.activeTab === 'watchlist' && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFromWatchlist(item)}
          testID={`remove-${item.id}`}
          accessibilityLabel="Remove from watchlist"
          accessibilityRole="button"
        >
          <Icon name="close" size={20} color={theme.semantic.text.tertiary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  ), [state.activeTab, handleItemPress, handleRemoveFromWatchlist]);

  const getRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  const currentItems = state.activeTab === 'watchlist' ? watchlistItems : historyItems;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.semantic.background.primary,
    } as ViewStyle,
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing[4],
      paddingTop: theme.spacing[4],
      paddingBottom: theme.spacing[3],
    } as ViewStyle,
    headerTitle: {
      fontSize: theme.typography.fontSize['4xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.semantic.text.primary,
    } as TextStyle,
    clearButton: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary[500],
      fontWeight: theme.typography.fontWeight.semibold,
    } as TextStyle,
    tabContainer: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.semantic.border.primary,
    } as ViewStyle,
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing[3],
      gap: theme.spacing[2],
    } as ViewStyle,
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: theme.colors.primary[500],
    } as ViewStyle,
    tabText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      fontWeight: theme.typography.fontWeight.medium,
    } as TextStyle,
    activeTabText: {
      color: theme.colors.primary[500],
      fontWeight: theme.typography.fontWeight.semibold,
    } as TextStyle,
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,
    loadingText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.semantic.text.secondary,
      marginTop: theme.spacing[3],
    } as TextStyle,
    errorContainer: {
      backgroundColor: theme.colors.error[50],
      margin: theme.spacing[4],
      padding: theme.spacing[4],
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.error[200],
      alignItems: 'center',
    } as ViewStyle,
    errorText: {
      color: theme.colors.error[500],
      fontSize: theme.typography.fontSize.sm,
      textAlign: 'center',
      marginBottom: theme.spacing[3],
    } as TextStyle,
    retryButton: {
      backgroundColor: theme.colors.primary[500],
      paddingHorizontal: theme.spacing[6],
      paddingVertical: theme.spacing[3],
      borderRadius: theme.borderRadius.lg,
    } as ViewStyle,
    retryButtonText: {
      color: theme.semantic.background.primary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    } as TextStyle,
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing[8],
    } as ViewStyle,
    emptyTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
      marginTop: theme.spacing[4],
    } as TextStyle,
    emptySubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
      marginTop: theme.spacing[2],
    } as TextStyle,
    listContent: {
      padding: theme.spacing[4],
    } as ViewStyle,
    libraryItem: {
      flexDirection: 'row',
      backgroundColor: theme.semantic.background.secondary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[3],
      marginBottom: theme.spacing[3],
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
    } as ViewStyle,
    itemPoster: {
      width: 60,
      height: 90,
      backgroundColor: theme.semantic.border.primary,
      borderRadius: theme.borderRadius.base,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing[3],
      overflow: 'hidden',
    } as ViewStyle,
    posterImage: {
      width: '100%',
      height: '100%',
    },
    itemInfo: {
      flex: 1,
      justifyContent: 'center',
    } as ViewStyle,
    itemTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
      marginBottom: theme.spacing[1],
    } as TextStyle,
    itemMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2],
      marginBottom: theme.spacing[1],
    } as ViewStyle,
    itemYear: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
    } as TextStyle,
    itemRating: {
      flexDirection: 'row',
      alignItems: 'center',
    } as ViewStyle,
    itemRatingText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
      marginLeft: theme.spacing[1],
    } as TextStyle,
    itemType: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.tertiary,
      fontWeight: theme.typography.fontWeight.bold,
    } as TextStyle,
    itemServices: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
      marginBottom: theme.spacing[1],
    } as TextStyle,
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing[1],
    } as ViewStyle,
    progressBar: {
      flex: 1,
      height: theme.spacing[1],
      backgroundColor: theme.semantic.border.primary,
      borderRadius: theme.borderRadius.sm,
      marginRight: theme.spacing[2],
    } as ViewStyle,
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary[500],
      borderRadius: theme.borderRadius.sm,
    } as ViewStyle,
    progressText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.secondary,
      fontWeight: theme.typography.fontWeight.semibold,
      minWidth: 32,
    } as TextStyle,
    itemLastWatched: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.semantic.text.tertiary,
      marginTop: theme.spacing[1],
    } as TextStyle,
    removeButton: {
      padding: theme.spacing[2],
      alignSelf: 'flex-start',
    } as ViewStyle,
    unauthContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing[8],
    } as ViewStyle,
    unauthTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.semantic.text.primary,
      marginTop: theme.spacing[4],
      textAlign: 'center',
    } as TextStyle,
    unauthSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
      marginTop: theme.spacing[2],
      marginBottom: theme.spacing[6],
    } as TextStyle,
    signInButton: {
      backgroundColor: theme.colors.primary[500],
      paddingHorizontal: theme.spacing[8],
      paddingVertical: theme.spacing[3],
      borderRadius: theme.borderRadius.lg,
    } as ViewStyle,
    signInButtonText: {
      color: theme.semantic.text.inverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    } as TextStyle,
  }), [theme]);

  // Show unauthenticated state
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} testID="library-screen">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Library</Text>
        </View>
        <View style={styles.unauthContainer}>
          <Icon name="lock" size={64} color={theme.semantic.border.primary} />
          <Text style={styles.unauthTitle}>Sign in to view your library</Text>
          <Text style={styles.unauthSubtitle}>
            Your watchlist and viewing history will appear here once you sign in
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            testID="sign-in-button"
            accessibilityLabel="Sign in"
            accessibilityRole="button"
            onPress={() => {
              logger.log('[LibraryScreen] Navigate to sign in');
              // TODO: Navigate to login screen
            }}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} testID="library-screen">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading library...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="library-screen">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Library</Text>
        {state.activeTab === 'history' && historyItems.length > 0 && (
          <TouchableOpacity
            onPress={handleClearHistory}
            testID="clear-history-button"
            accessibilityLabel="Clear history"
            accessibilityRole="button"
          >
            <Text style={styles.clearButton}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            state.activeTab === 'watchlist' && styles.activeTab,
          ]}
          onPress={() => setState(prev => ({ ...prev, activeTab: 'watchlist' }))}
          testID="watchlist-tab"
          accessibilityLabel="Watchlist tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: state.activeTab === 'watchlist' }}
        >
          <Icon
            name="bookmark"
            size={20}
            color={state.activeTab === 'watchlist' ? theme.colors.primary[500] : theme.semantic.text.secondary}
          />
          <Text
            style={[
              styles.tabText,
              state.activeTab === 'watchlist' && styles.activeTabText,
            ]}
          >
            Watchlist ({watchlistItems.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            state.activeTab === 'history' && styles.activeTab,
          ]}
          onPress={() => setState(prev => ({ ...prev, activeTab: 'history' }))}
          testID="history-tab"
          accessibilityLabel="History tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: state.activeTab === 'history' }}
        >
          <Icon
            name="history"
            size={20}
            color={state.activeTab === 'history' ? theme.colors.primary[500] : theme.semantic.text.secondary}
          />
          <Text
            style={[
              styles.tabText,
              state.activeTab === 'history' && styles.activeTabText,
            ]}
          >
            History ({historyItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={refreshWatchlists}
            testID="retry-button"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty State */}
      {currentItems.length === 0 && !error && (
        <View style={styles.emptyContainer}>
          <Icon
            name={state.activeTab === 'watchlist' ? 'bookmark-border' : 'history'}
            size={64}
            color={theme.semantic.border.primary}
          />
          <Text style={styles.emptyTitle}>
            {state.activeTab === 'watchlist'
              ? 'No items in watchlist'
              : 'No viewing history'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {state.activeTab === 'watchlist'
              ? 'Add movies and shows to your watchlist to see them here'
              : 'Your recently watched content will appear here'}
          </Text>
        </View>
      )}

      {/* Content List */}
      {currentItems.length > 0 && (
        <FlatList
          data={currentItems}
          renderItem={renderLibraryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          testID={`${state.activeTab}-list`}
          refreshControl={
            <RefreshControl
              refreshing={state.isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary[500]]}
              tintColor={theme.colors.primary[500]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

export default LibraryScreen;
