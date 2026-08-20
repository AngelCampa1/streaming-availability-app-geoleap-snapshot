import React, { useState, useCallback, useMemo } from 'react';
import { MainTabParamList } from '../../navigation/types';
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
import { useRecommendations } from '../../hooks/useRecommendations';
import { useWatchlist } from '../../hooks/useWatchlist';
import { Recommendation } from '../../services/recommendations/RecommendationService';
import { WatchlistItem } from '../../services/watchlist/WatchlistService';
import { logger } from '../../utils/logger';

const { width: _width } = Dimensions.get('window');

interface RecommendationsSectionProps {
  title?: string;
  type?: 'personalized' | 'trending' | 'friends' | 'all';
  maxItems?: number;
  horizontal?: boolean;
  showReason?: boolean;
  showMatchScore?: boolean;
  genre?: string;
}

type RecommendationsSectionNavigationProp = StackNavigationProp<MainTabParamList, 'Dashboard'>;

export const RecommendationsSection: React.FC<RecommendationsSectionProps> = React.memo(({
  title = 'Recommended for You',
  type = 'personalized',
  maxItems = 6,
  horizontal = true,
  showReason = true,
  showMatchScore = true,
  genre,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const _navigation = useNavigation<RecommendationsSectionNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);

  const {
    personalizedRecommendations,
    trendingRecommendations,
    friendRecommendations,
    getRecommendations,
    getTrending,
    getFriendRecommendations,
    recordFeedback,
    ignoreRecommendation,
    loading,
    error,
  } = useRecommendations();

  const { addToWatchlist, currentWatchlist } = useWatchlist();

  const recommendations = useMemo(() => {
    const getRecommendationsByType = () => {
      switch (type) {
        case 'personalized':
          return personalizedRecommendations;
        case 'trending':
          return genre
            ? trendingRecommendations.filter(r => r.genres.includes(genre))
            : trendingRecommendations;
        case 'friends':
          return friendRecommendations;
        case 'all':
          return [
            ...personalizedRecommendations.slice(0, 3),
            ...trendingRecommendations.slice(0, 3),
          ].sort((a, b) => b.matchScore - a.matchScore);
        default:
          return personalizedRecommendations;
      }
    };

    return getRecommendationsByType().slice(0, maxItems);
  }, [type, genre, personalizedRecommendations, trendingRecommendations, friendRecommendations, maxItems]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      switch (type) {
        case 'personalized':
          await getRecommendations(maxItems);
          break;
        case 'trending':
          await getTrending(genre);
          break;
        case 'friends':
          await getFriendRecommendations();
          break;
        default:
          await getRecommendations(maxItems);
      }
    } finally {
      setRefreshing(false);
    }
  }, [type, maxItems, genre, getRecommendations, getTrending, getFriendRecommendations]);

  const handleItemPress = useCallback(async (recommendation: Recommendation) => {
    try {
      await recordFeedback(recommendation.id, { action: 'viewed' });
      _navigation.navigate('ContentDetail', { item: recommendation });
    } catch (error) {
      logger.error('[RecommendationsSection] Failed to record feedback', error);
      _navigation.navigate('ContentDetail', { item: recommendation });
    }
  }, [_navigation, recordFeedback]);

  const handleAddToWatchlist = useCallback(async (recommendation: Recommendation) => {
    if (!currentWatchlist) {return;}

    try {
      const watchlistItem: Omit<WatchlistItem, 'id' | 'addedAt'> = {
        title: recommendation.title,
        type: recommendation.type,
        rating: recommendation.rating,
        year: recommendation.year,
        availableOn: recommendation.availableOn,
        poster: recommendation.poster,
        backdrop: recommendation.backdrop,
        genres: recommendation.genres,
        runtime: recommendation.runtime,
        seasons: recommendation.seasons,
        status: 'to_watch',
        priority: 'medium',
      };

      await addToWatchlist(currentWatchlist.id, watchlistItem);
      await recordFeedback(recommendation.id, { action: 'added_to_watchlist' });
    } catch (error) {
      logger.error('[RecommendationsSection] Failed to add to watchlist', error);
    }
  }, [currentWatchlist, addToWatchlist, recordFeedback]);

  const handleIgnore = useCallback(async (recommendation: Recommendation) => {
    try {
      await ignoreRecommendation(recommendation.id);
    } catch (error) {
      logger.error('[RecommendationsSection] Failed to ignore recommendation', error);
    }
  }, [ignoreRecommendation]);

  const getSourceIcon = useCallback((source: Recommendation['source']) => {
    switch (source) {
      case 'collaborative': return '👥';
      case 'content_based': return '🎯';
      case 'trending': return '🔥';
      case 'popular': return '⭐';
      case 'friends': return '👫';
      case 'similar_users': return '🔗';
      default: return '💡';
    }
  }, []);

  const getMatchScoreColor = useCallback((score: number) => {
    if (score >= 0.9) {return theme.colors.success[500];}
    if (score >= 0.7) {return theme.colors.primary[500];}
    if (score >= 0.5) {return theme.colors.secondary[500];}
    return theme.semantic.text.secondary;
  }, [theme]);

  const renderRecommendation = useCallback(({ item }: { item: Recommendation }) => (
    <TouchableOpacity
      style={[
        styles.recommendationContainer,
        horizontal && styles.horizontalRecommendationContainer,
      ]}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      <Card variant="elevated" style={styles.card}>
        {/* Poster/Thumbnail */}
        <View style={styles.posterContainer}>
          {item.poster ? (
            <Image source={{ uri: item.poster }} style={styles.poster} />
          ) : (
            <View style={[styles.posterPlaceholder, { backgroundColor: theme.semantic.background.primary }]}>
              <Text style={styles.posterPlaceholderText}>
                {item.type === 'movie' ? '🎬' : item.type === 'tv_series' ? '📺' : '🎭'}
              </Text>
            </View>
          )}

          {/* Match Score Badge */}
          {showMatchScore && (
            <View style={[styles.matchScoreBadge, { backgroundColor: getMatchScoreColor(item.matchScore) }]}>
              <Text style={styles.matchScoreText}>
                {Math.round(item.matchScore * 100)}%
              </Text>
            </View>
          )}

          {/* Source Badge */}
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText}>
              {getSourceIcon(item.source)}
            </Text>
          </View>
        </View>

        {/* Content Info */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.meta}>
            {item.type.replace('_', ' ')} • {item.year} • ⭐ {item.rating.toFixed(1)}
          </Text>

          {/* Reason */}
          {showReason && item.reason && (
            <Text style={styles.reason} numberOfLines={2}>
              {item.reason}
            </Text>
          )}

          {/* Genres */}
          <View style={styles.genresContainer}>
            {item.genres.slice(0, 3).map((genre, index) => (
              <View key={index} style={styles.genreBadge}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
            {item.genres.length > 3 && (
              <Text style={styles.moreGenresText}>+{item.genres.length - 3}</Text>
            )}
          </View>

          {/* Available On */}
          {item.availableOn.length > 0 && (
            <Text style={styles.availableOn} numberOfLines={1}>
              Available on {item.availableOn.slice(0, 2).join(', ')}
              {item.availableOn.length > 2 && ` +${item.availableOn.length - 2}`}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              title="Add to Watchlist"
              onPress={() => handleAddToWatchlist(item)}
              variant="outline"
              size="small"
              style={styles.addButton}
            />

            <TouchableOpacity
              style={styles.ignoreButton}
              onPress={() => handleIgnore(item)}
            >
              <Text style={styles.ignoreButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  ), [styles, horizontal, handleItemPress, showMatchScore, getMatchScoreColor, getSourceIcon, theme, showReason, handleAddToWatchlist, handleIgnore]);

  const renderHorizontalRecommendation = useCallback(({ item }: { item: Recommendation }) => (
    <TouchableOpacity
      style={styles.horizontalRecommendation}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      <Card variant="elevated" style={styles.horizontalCard}>
        {/* Poster */}
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

          {/* Match Score */}
          {showMatchScore && (
            <View style={[styles.horizontalMatchBadge, { backgroundColor: getMatchScoreColor(item.matchScore) }]}>
              <Text style={styles.horizontalMatchText}>
                {Math.round(item.matchScore * 100)}%
              </Text>
            </View>
          )}
        </View>

        {/* Content Info */}
        <View style={styles.horizontalContent}>
          <Text style={styles.horizontalTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.horizontalMeta}>
            {item.year} • ⭐ {item.rating.toFixed(1)}
          </Text>

          {showReason && item.reason && (
            <Text style={styles.horizontalReason} numberOfLines={2}>
              {item.reason}
            </Text>
          )}

          {/* Source */}
          <View style={styles.horizontalSource}>
            <Text style={styles.horizontalSourceText}>
              {getSourceIcon(item.source)} {item.source.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  ), [styles, handleItemPress, theme, showMatchScore, getMatchScoreColor, showReason, getSourceIcon]);

  if (error) {
    return (
      <Card style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load recommendations</Text>
        <Button title="Retry" onPress={onRefresh} variant="outline" size="small" />
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No recommendations available</Text>
        <Text style={styles.emptyText}>
          Start watching and rating content to get personalized recommendations
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          {type === 'trending' && genre && (
            <Text style={styles.sectionSubtitle}>Trending in {genre}</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={loading || refreshing}
        >
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>

      {horizontal ? (
        <FlatList
          data={recommendations}
          renderItem={renderHorizontalRecommendation}
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
          initialNumToRender={6}
          getItemLayout={(data, index) => ({
            length: theme.spacing[6] * 8, // spacing[6] = 24px
            offset: (theme.spacing[6] * 8 + theme.spacing[4]) * index, // spacing[4] = 16px
            index,
          })}
        />
      ) : (
        <FlatList
          data={recommendations}
          renderItem={renderRecommendation}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={5}
          initialNumToRender={6}
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
  sectionTitle: {
    ...theme.typography.h5,
    color: theme.semantic.text.primary,
    fontWeight: '600',
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.semantic.text.secondary,
    marginTop: theme.spacing.xs,
  },
  refreshButton: {
    width: theme.spacing.xl * 2,
    height: theme.spacing.xl * 2,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.semantic.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  refreshText: {
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.primary,
  },
  recommendationContainer: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
  },
  horizontalRecommendationContainer: {
    marginHorizontal: theme.spacing.sm,
    marginVertical: 0,
  },
  card: {
    overflow: 'hidden',
  },
  posterContainer: {
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: theme.spacing.xl * 10,
    borderRadius: theme.borderRadius.lg,
  },
  posterPlaceholder: {
    width: '100%',
    height: theme.spacing.xl * 10,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderText: {
    fontSize: theme.typography.fontSize['4xl'],
  },
  matchScoreBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  matchScoreText: {
    ...theme.typography.caption,
    color: theme.semantic.background.primary,
    fontWeight: '600',
  },
  sourceBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    width: theme.spacing.xl * 1.5,
    height: theme.spacing.xl * 1.5,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.overlay.lightest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceBadgeText: {
    fontSize: theme.typography.fontSize.lg,
  },
  content: {
    padding: theme.spacing.md,
  },
  title: {
    ...theme.typography.subtitle1,
    color: theme.semantic.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  meta: {
    ...theme.typography.caption,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  reason: {
    ...theme.typography.body2,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing.sm,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.sm,
  },
  genreBadge: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  genreText: {
    ...theme.typography.overline,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  moreGenresText: {
    ...theme.typography.overline,
    color: theme.semantic.text.secondary,
    fontWeight: '500',
    alignSelf: 'center',
  },
  availableOn: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  ignoreButton: {
    width: theme.spacing.xl * 1.75,
    height: theme.spacing.xl * 1.75,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.semantic.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ignoreButtonText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.semantic.text.secondary,
  },
  horizontalList: {
    paddingHorizontal: theme.spacing.lg,
  },
  horizontalRecommendation: {
    width: theme.spacing.xl * 8,
    marginRight: theme.spacing.md,
  },
  horizontalCard: {
    height: '100%',
  },
  horizontalPosterContainer: {
    position: 'relative',
  },
  horizontalPoster: {
    width: theme.spacing.xl * 8,
    height: theme.spacing.xl * 12,
    borderRadius: theme.borderRadius.lg,
  },
  horizontalPosterPlaceholder: {
    width: theme.spacing.xl * 8,
    height: theme.spacing.xl * 12,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalPosterPlaceholderText: {
    fontSize: theme.typography.fontSize['4xl'],
  },
  horizontalMatchBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.xs,
  },
  horizontalMatchText: {
    ...theme.typography.overline,
    color: theme.semantic.background.primary,
    fontWeight: '600',
  },
  horizontalContent: {
    padding: theme.spacing.sm,
  },
  horizontalTitle: {
    ...theme.typography.subtitle2,
    color: theme.semantic.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  horizontalMeta: {
    ...theme.typography.caption,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  horizontalReason: {
    ...theme.typography.caption,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing.xs,
  },
  horizontalSource: {
    marginTop: theme.spacing.xs,
  },
  horizontalSourceText: {
    ...theme.typography.overline,
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
  },
});
