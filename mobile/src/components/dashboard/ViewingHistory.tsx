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
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { ViewingSession, ViewingStats } from '../../services/analytics/UserAnalyticsService';
import { logger } from '../../utils/logger';

const { width: _width } = Dimensions.get('window');

interface ViewingHistoryProps {
  userId?: string;
  maxItems?: number;
  showStats?: boolean;
  showFilters?: boolean;
}

type ViewingHistoryNavigationProp = StackNavigationProp<MainTabParamList, 'Dashboard'>;

export const ViewingHistory: React.FC<ViewingHistoryProps> = React.memo(({
  userId,
  maxItems = 10,
  showStats = true,
  showFilters = true,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const _navigation = useNavigation<ViewingHistoryNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [viewingSessions, setViewingSessions] = useState<ViewingSession[]>([]);
  const [stats, setStats] = useState<ViewingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');

  const _currentUserId = userId || 'current-user';

  const loadViewingData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real implementation, these would be actual API calls
      const [_sessionsData, statsData] = await Promise.all([
        // await userAnalyticsService.getViewingSessions(currentUserId, selectedPeriod),
        // await userAnalyticsService.getViewingStats(currentUserId, selectedPeriod),
        Promise.resolve([]), // Mock data for now
        Promise.resolve({
          totalWatchTime: 1250, // minutes
          totalSessions: 45,
          averageSessionDuration: 28,
          completionRate: 0.78,
          favoriteGenres: [
            { genre: 'Drama', count: 12, percentage: 0.35 },
            { genre: 'Action', count: 8, percentage: 0.25 },
            { genre: 'Comedy', count: 7, percentage: 0.20 },
            { genre: 'Thriller', count: 5, percentage: 0.15 },
          ],
          favoriteTypes: [
            { type: 'movie', count: 25, percentage: 0.60 },
            { type: 'tv_series', count: 15, percentage: 0.35 },
            { type: 'documentary', count: 3, percentage: 0.05 },
          ],
          watchingHabits: {
            timeOfDay: {
              'Morning (6AM-12PM)': 8,
              'Afternoon (12PM-5PM)': 12,
              'Evening (5PM-9PM)': 18,
              'Night (9PM-6AM)': 7,
            },
            dayOfWeek: {
              'Weekday': 25,
              'Weekend': 20,
            },
            monthlyTrends: [
              { month: 'Jan', minutes: 280 },
              { month: 'Feb', minutes: 320 },
              { month: 'Mar', minutes: 350 },
              { month: 'Apr', minutes: 300 },
            ],
          },
          streamingServiceUsage: [
            { service: 'Netflix', minutes: 450, percentage: 0.36, count: 15 },
            { service: 'HBO Max', minutes: 380, percentage: 0.30, count: 12 },
            { service: 'Disney+', minutes: 250, percentage: 0.20, count: 8 },
            { service: 'Hulu', minutes: 170, percentage: 0.14, count: 10 },
          ],
          contentDiscovery: {
            searchUsage: 15,
            recommendationUsage: 20,
            browsingUsage: 8,
            socialDiscovery: 2,
          },
          engagement: {
            ratingsGiven: 28,
            reviewsWritten: 5,
            watchlistItemsAdded: 45,
            contentShared: 8,
          },
        }),
      ]);

      // Mock some viewing sessions
      const mockSessions: ViewingSession[] = [
        {
          id: '1',
          contentId: '1',
          title: 'Stranger Things',
          type: 'tv_series',
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          duration: 60,
          watchedPercentage: 100,
          pausedCount: 2,
          seekCount: 1,
          quality: '1080p',
          device: 'iPhone 14',
          platform: 'iOS',
          completed: true,
          sessionId: 'session_1',
        },
        {
          id: '2',
          contentId: '2',
          title: 'The Batman',
          type: 'movie',
          startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
          duration: 115,
          watchedPercentage: 85,
          pausedCount: 3,
          seekCount: 2,
          quality: '4K',
          device: 'Apple TV',
          platform: 'tvOS',
          completed: false,
          sessionId: 'session_2',
        },
        {
          id: '3',
          contentId: '3',
          title: 'Wednesday',
          type: 'tv_series',
          startTime: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
          duration: 50,
          watchedPercentage: 100,
          pausedCount: 1,
          seekCount: 0,
          quality: '1080p',
          device: 'iPad Pro',
          platform: 'iPadOS',
          completed: true,
          sessionId: 'session_3',
        },
      ];

      setViewingSessions(mockSessions.slice(0, maxItems));
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load viewing data');
      logger.error('[ViewingHistory] Failed to load viewing data', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, maxItems]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadViewingData();
    } finally {
      setRefreshing(false);
    }
  }, [loadViewingData]);

  const formatDuration = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }, []);

  const formatTimeAgo = useCallback((timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {return 'Just now';}
    if (diffInHours < 24) {return `${diffInHours}h ago`;}
    if (diffInHours < 168) {return `${Math.floor(diffInHours / 24)}d ago`;}
    return `${Math.floor(diffInHours / 168)}w ago`;
  }, []);

  const getCompletionColor = useCallback((percentage: number) => {
    if (percentage === 100) {return theme.colors.success[500];}
    if (percentage >= 75) {return theme.colors.primary[500];}
    if (percentage >= 50) {return theme.colors.secondary[500];}
    return theme.semantic.text.secondary;
  }, [theme]);

  const renderSessionItem = useCallback(({ item }: { item: ViewingSession }) => (
    <TouchableOpacity
      style={styles.sessionItem}
      onPress={() => _navigation.navigate('ContentDetail', { item })}
      activeOpacity={0.7}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle}>{item.title}</Text>
          <Text style={styles.sessionMeta}>
            {item.type.replace('_', ' ')} • {formatDuration(item.duration)} • {formatTimeAgo(item.startTime)}
          </Text>
        </View>

        <View style={styles.sessionStatus}>
          <View style={[styles.completionBadge, { backgroundColor: getCompletionColor(item.watchedPercentage) + '20' }]}>
            <Text style={[styles.completionText, { color: getCompletionColor(item.watchedPercentage) }]}>
              {item.watchedPercentage}%
            </Text>
          </View>

          {item.completed && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>✓</Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${item.watchedPercentage}%`,
              backgroundColor: getCompletionColor(item.watchedPercentage),
            },
          ]}
        />
      </View>

      {/* Session Details */}
      <View style={styles.sessionDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Device</Text>
          <Text style={styles.detailValue}>{item.device}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Quality</Text>
          <Text style={styles.detailValue}>{item.quality || 'Auto'}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Interactions</Text>
          <Text style={styles.detailValue}>{item.pausedCount + item.seekCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  ), [styles, _navigation, formatDuration, formatTimeAgo, getCompletionColor, theme]);

  const renderStatsCard = useCallback(() => {
    if (!stats) {return null;}

    return (
      <Card style={styles.statsCard}>
        <Text style={styles.statsTitle}>Your Viewing Stats</Text>

        {/* Top Stats */}
        <View style={styles.topStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDuration(stats.totalWatchTime)}</Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(stats.completionRate * 100)}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
        </View>

        {/* Favorite Genres */}
        <View style={styles.genreSection}>
          <Text style={styles.sectionTitle}>Top Genres</Text>
          <View style={styles.genreList}>
            {stats.favoriteGenres.slice(0, 3).map((genre, index) => (
              <View key={index} style={styles.genreItem}>
                <Text style={styles.genreName}>{genre.genre}</Text>
                <Text style={styles.genreCount}>{genre.count} items</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Service Usage */}
        <View style={styles.serviceSection}>
          <Text style={styles.sectionTitle}>Streaming Services</Text>
          <View style={styles.serviceList}>
            {stats.streamingServiceUsage.slice(0, 3).map((service, index) => (
              <View key={index} style={styles.serviceItem}>
                <View style={styles.serviceBar}>
                  <View
                    style={[
                      styles.serviceBarFill,
                      { width: `${service.percentage * 100}%`, backgroundColor: theme.colors.primary[500] },
                    ]}
                  />
                </View>
                <Text style={styles.serviceName}>{service.service}</Text>
                <Text style={styles.servicePercentage}>{Math.round(service.percentage * 100)}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* View More Button */}
        <TouchableOpacity
          style={styles.viewMoreButton}
          onPress={() => _navigation.navigate('Profile' as any)}
        >
          <Text style={styles.viewMoreText}>View Detailed Analytics</Text>
        </TouchableOpacity>
      </Card>
    );
  }, [stats, styles, formatDuration, theme, _navigation]);

  const renderPeriodFilter = useCallback(() => {
    if (!showFilters) {return null;}

    return (
      <View style={styles.filterContainer}>
        {(['day', 'week', 'month'] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.filterButton,
              selectedPeriod === period && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedPeriod === period && styles.filterButtonTextActive,
              ]}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [showFilters, styles, selectedPeriod]);

  if (loading && viewingSessions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading viewing history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <Card style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load viewing history</Text>
        <Button title="Retry" onPress={loadViewingData} variant="outline" size="small" />
      </Card>
    );
  }

  if (viewingSessions.length === 0) {
    return (
      <Card style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No viewing history yet</Text>
        <Text style={styles.emptyText}>
          Start watching content to see your viewing history and stats here
        </Text>
        <Button
          title="Browse Content"
          onPress={() => _navigation.navigate('Search')}
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
        <Text style={styles.title}>Viewing History</Text>
      </View>

      {/* Period Filter */}
      {renderPeriodFilter()}

      {/* Stats Card */}
      {showStats && renderStatsCard()}

      {/* Recent Sessions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        <FlatList
          data={viewingSessions}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.sessionList}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={5}
          initialNumToRender={10}
        />
      </View>
    </View>
  );
});

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h4,
    color: theme.semantic.text.primary,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  filterButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.semantic.background.secondary,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterButtonText: {
    ...theme.typography.body2,
    color: theme.semantic.text.secondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: theme.semantic.background.primary,
  },
  statsCard: {
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  statsTitle: {
    ...theme.typography.h5,
    color: theme.semantic.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.lg,
  },
  topStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...theme.typography.h3,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.semantic.text.secondary,
    marginTop: theme.spacing.xs,
  },
  genreSection: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.subtitle1,
    color: theme.semantic.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  genreList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  genreItem: {
    alignItems: 'center',
  },
  genreName: {
    ...theme.typography.body2,
    color: theme.semantic.text.primary,
    fontWeight: '500',
  },
  genreCount: {
    ...theme.typography.caption,
    color: theme.semantic.text.secondary,
    marginTop: theme.spacing.xs,
  },
  serviceSection: {
    marginBottom: theme.spacing.lg,
  },
  serviceList: {
    gap: theme.spacing.sm,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.semantic.background.primary,
    borderRadius: 4,
    marginRight: theme.spacing.md,
    overflow: 'hidden',
  },
  serviceBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  serviceName: {
    ...theme.typography.body2,
    color: theme.semantic.text.primary,
    width: 80,
  },
  servicePercentage: {
    ...theme.typography.caption,
    color: theme.semantic.text.secondary,
    width: 40,
    textAlign: 'right',
  },
  viewMoreButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  viewMoreText: {
    ...theme.typography.body2,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
  },
  sessionList: {
    paddingBottom: theme.spacing.xl,
  },
  sessionItem: {
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    ...theme.typography.subtitle1,
    color: theme.semantic.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  sessionMeta: {
    ...theme.typography.caption,
    color: theme.semantic.text.secondary,
  },
  sessionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completionBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
  },
  completionText: {
    ...theme.typography.overline,
    fontWeight: '600',
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedText: {
    ...theme.typography.caption,
    color: theme.semantic.background.primary,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.semantic.background.primary,
    borderRadius: 3,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    ...theme.typography.overline,
    color: theme.semantic.text.secondary,
  },
  detailValue: {
    ...theme.typography.caption,
    color: theme.semantic.text.primary,
    fontWeight: '500',
    marginTop: theme.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body1,
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
