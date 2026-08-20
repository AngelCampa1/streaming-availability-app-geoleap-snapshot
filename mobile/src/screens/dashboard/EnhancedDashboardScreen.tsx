import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../hooks/useTheme';
import { designTokens } from '../../tokens/designTokens';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ErrorBoundary, DashboardErrorFallback } from '../../components/common/ErrorBoundary';
import { WatchlistSection } from '../../components/dashboard/WatchlistSection';
import { RecommendationsSection } from '../../components/dashboard/RecommendationsSection';
import { ViewingHistory } from '../../components/dashboard/ViewingHistory';
import { CurrentlyWatching } from '../../components/dashboard/CurrentlyWatching';
import { useWatchlist } from '../../hooks/useWatchlist';
import { useRecommendations } from '../../hooks/useRecommendations';
import { WatchlistStats } from '../../services/watchlist/WatchlistService';
import { ViewerProfile } from '../../services/analytics/UserAnalyticsService';
import { GenreStatsCard } from '../../components/dashboard/GenreStatsCard';
import { TopServicesCard } from '../../components/dashboard/TopServicesCard';
import { logger } from '../../utils/logger';

const { width: _width, height: _height } = Dimensions.get('window');

// Type imports
type MainTabParamList = {
  Dashboard: undefined;
  Home: undefined;
  Search: undefined;
  Favorites: undefined;
  Profile: undefined;
  NotificationPreferences: undefined;
  Analytics: undefined;
};

type EnhancedDashboardScreenNavigationProp = StackNavigationProp<MainTabParamList, 'Dashboard'>;

const MOCK_USER = {
  id: 'user_123',
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar: null,
  memberSince: 'January 2024',
  plan: 'Premium',
  level: 12, // User engagement level
  streak: 7, // Daily watch streak
};

// Mock data for genre stats
const MOCK_GENRE_STATS = [
  { name: 'Action', count: 45, percentage: 28, color: designTokens.colors.error[500] },
  { name: 'Comedy', count: 32, percentage: 20, color: designTokens.colors.warning[500] },
  { name: 'Drama', count: 28, percentage: 17, color: designTokens.colors.primary[500] },
  { name: 'Sci-Fi', count: 24, percentage: 15, color: designTokens.colors.info[500] },
  { name: 'Horror', count: 18, percentage: 11, color: designTokens.colors.neutral[500] },
  { name: 'Romance', count: 14, percentage: 9, color: designTokens.colors.primary[300] },
];

// Mock data for top services
const MOCK_TOP_SERVICES = [
  { id: 'netflix', name: 'Netflix', watchCount: 48, hoursWatched: 124, color: designTokens.colors.streamingServices.netflix },
  { id: 'disney', name: 'Disney+', watchCount: 32, hoursWatched: 86, color: designTokens.colors.streamingServices.disney },
  { id: 'prime', name: 'Prime Video', watchCount: 28, hoursWatched: 72, color: designTokens.colors.streamingServices.prime },
  { id: 'hbo', name: 'HBO Max', watchCount: 22, hoursWatched: 58, color: designTokens.colors.streamingServices.hbo },
  { id: 'hulu', name: 'Hulu', watchCount: 15, hoursWatched: 38, color: designTokens.colors.streamingServices.hulu },
];

export const EnhancedDashboardScreen: React.FC = () => {
  const navigation = useNavigation<EnhancedDashboardScreenNavigationProp>();
  const { theme: unifiedTheme } = useTheme();
  const styles = createStyles(unifiedTheme);

  const QUICK_ACTIONS = [
    {
      id: 'search',
      title: 'Search',
      icon: '🔍',
      color: unifiedTheme.colors.primary,
      screen: 'Search' as keyof MainTabParamList,
    },
    {
      id: 'browse',
      title: 'Browse',
      icon: '🎬',
      color: unifiedTheme.colors.secondary,
      screen: 'Home' as keyof MainTabParamList,
    },
    {
      id: 'favorites',
      title: 'Watchlist',
      icon: '❤️',
      color: unifiedTheme.colors.accent,
      screen: 'Favorites' as keyof MainTabParamList,
    },
    {
      id: 'profile',
      title: 'Profile',
      icon: '👤',
      color: unifiedTheme.colors.info,
      screen: 'Profile' as keyof MainTabParamList,
    },
  ];
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'watching' | 'history' | 'recommendations'>('overview');
  const [userStats, setUserStats] = useState<WatchlistStats | null>(null);
  const [_viewerProfile, _setViewerProfile] = useState<ViewerProfile | null>(null);

  const {
    stats: watchlistStats,
    loading: watchlistLoading,
    error: watchlistError,
    refreshWatchlists,
  } = useWatchlist();

  const {
    personalizedRecommendations: _personalizedRecommendations,
    trendingRecommendations: _trendingRecommendations,
    getRecommendations,
    loading: recommendationsLoading,
    error: recommendationsError,
  } = useRecommendations();

  useEffect(() => {
    // Load additional dashboard data
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // In a real implementation, this would load user analytics and profile data
      // For now, we'll use mock data
      setUserStats(watchlistStats);
    } catch (error) {
      logger.error('[EnhancedDashboardScreen] Failed to load dashboard data', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshWatchlists(),
        getRecommendations(),
        loadDashboardData(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleQuickAction = (screen: keyof MainTabParamList) => {
    navigation.navigate(screen);
  };

  const renderUserHeader = () => (
    <LinearGradient
      colors={[unifiedTheme.colors.primary[500], unifiedTheme.colors.secondary[500]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.userHeader}
    >
      <View style={styles.userContent}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {MOCK_USER.avatar ? (
              <Text style={styles.avatarPlaceholderText}>📷</Text>
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: unifiedTheme.colors.overlay.light }]}>
                <Text style={styles.avatarPlaceholderText}>👤</Text>
              </View>
            )}
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Lvl {MOCK_USER.level}</Text>
            </View>
          </View>

          <View style={styles.userDetails}>
            <Text style={styles.userName}>Welcome back, {MOCK_USER.name}!</Text>
            <Text style={styles.userEmail}>{MOCK_USER.email}</Text>
            <View style={styles.userMeta}>
              <Text style={styles.userMetaText}>
                {MOCK_USER.plan} • {MOCK_USER.memberSince}
              </Text>
              <View style={styles.streakContainer}>
                <Text style={styles.streakText}>🔥 {MOCK_USER.streak} day streak</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.notificationsButton}
          onPress={() => navigation.navigate('NotificationPreferences' as any)}
        >
          <Text style={styles.notificationsIcon}>🔔</Text>
          <View style={styles.notificationsBadge}>
            <Text style={styles.notificationsBadgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.quickActionCard, { backgroundColor: (typeof action.color === "string" ? action.color : action.color[500]) + "20" }]}
            onPress={() => handleQuickAction(action.screen)}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: (typeof action.color === "string" ? action.color : action.color[500]) }]}>
              <Text style={styles.quickActionIconText}>{action.icon}</Text>
            </View>
            <Text style={styles.quickActionTitle}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStatsOverview = () => {
    if (!userStats) {return null;}

    const statItems = [
      {
        label: 'Watchlist',
        value: userStats.totalItems.toString(),
        icon: '📝',
        color: unifiedTheme.colors.primary,
        trend: '+2 this week',
      },
      {
        label: 'Watched',
        value: userStats.watchedItems.toString(),
        icon: '✅',
        color: unifiedTheme.colors.success,
        trend: '+5 this week',
      },
      {
        label: 'Hours',
        value: Math.round(userStats.totalTimeWatched / 60).toString(),
        icon: '⏰',
        color: unifiedTheme.colors.secondary,
        trend: '+12h this month',
      },
      {
        label: 'Rating',
        value: userStats.averageRating.toFixed(1),
        icon: '⭐',
        color: unifiedTheme.colors.accent,
        trend: 'Great taste!',
      },
    ];

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          {statItems.map((stat, index) => (
            <Card key={index} style={styles.statCard}>
              <View style={styles.statContent}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <Text style={[styles.statValue, { color: (typeof stat.color === "string" ? stat.color : stat.color[500]) }]}>
                  {stat.value}
                </Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statTrend}>{stat.trend}</Text>
              </View>
            </Card>
          ))}
        </View>
      </View>
    );
  };

  const renderTabSelector = () => (
    <View style={styles.tabSelector}>
      {[
        { key: 'overview', label: 'Overview' },
        { key: 'watching', label: 'Watching' },
        { key: 'history', label: 'History' },
        { key: 'recommendations', label: 'For You' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tabButton,
            selectedTab === tab.key && styles.tabButtonActive,
          ]}
          onPress={() => setSelectedTab(tab.key as any)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabButtonText,
              selectedTab === tab.key && styles.tabButtonTextActive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      <ErrorBoundary fallback={() => <DashboardErrorFallback />}>
        <CurrentlyWatching maxItems={3} horizontal={true} />
      </ErrorBoundary>

      {/* Genre Stats and Top Services - Sprint 3 Enhancement */}
      <View style={styles.insightsSection}>
        <Text style={styles.sectionTitle}>Your Insights</Text>
        <View style={styles.insightsGrid}>
          <View style={styles.insightCard}>
            <GenreStatsCard
              genres={MOCK_GENRE_STATS}
              totalWatched={161}
            />
          </View>
          <View style={styles.insightCard}>
            <TopServicesCard
              services={MOCK_TOP_SERVICES}
            />
          </View>
        </View>
      </View>

      <ErrorBoundary fallback={() => <DashboardErrorFallback />}>
        <RecommendationsSection
          title="Recommended for You"
          type="personalized"
          maxItems={6}
          horizontal={true}
        />
      </ErrorBoundary>
      <WatchlistSection
        maxItems={3}
        horizontal={true}
        showHeader={true}
        showViewAll={true}
      />
      <ErrorBoundary fallback={() => <DashboardErrorFallback />}>
        <RecommendationsSection
          title="Trending Now"
          type="trending"
          maxItems={6}
          horizontal={true}
          showReason={false}
        />
      </ErrorBoundary>
    </View>
  );

  const renderWatchingTab = () => (
    <View style={styles.tabContent}>
      <ErrorBoundary fallback={() => <DashboardErrorFallback />}>
        <CurrentlyWatching maxItems={10} horizontal={false} />
      </ErrorBoundary>
    </View>
  );

  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      <ErrorBoundary fallback={() => <DashboardErrorFallback />}>
        <ViewingHistory
          maxItems={20}
          showStats={true}
          showFilters={true}
        />
      </ErrorBoundary>
    </View>
  );

  const renderRecommendationsTab = () => (
    <View style={styles.tabContent}>
      <ErrorBoundary fallback={() => <DashboardErrorFallback />}>
        <RecommendationsSection
          title="Personalized for You"
          type="personalized"
          maxItems={10}
          horizontal={false}
          showReason={true}
          showMatchScore={true}
        />
      </ErrorBoundary>
      <ErrorBoundary fallback={() => <DashboardErrorFallback />}>
        <RecommendationsSection
          title="Trending in Your Favorite Genres"
          type="trending"
          maxItems={8}
          horizontal={true}
          showReason={false}
        />
      </ErrorBoundary>
      <ErrorBoundary fallback={() => <DashboardErrorFallback />}>
        <RecommendationsSection
          title="Friends Are Watching"
          type="friends"
          maxItems={6}
          horizontal={true}
          showReason={true}
        />
      </ErrorBoundary>
    </View>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'overview':
        return renderOverviewTab();
      case 'watching':
        return renderWatchingTab();
      case 'history':
        return renderHistoryTab();
      case 'recommendations':
        return renderRecommendationsTab();
      default:
        return renderOverviewTab();
    }
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingText}>Loading your dashboard...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Failed to load dashboard</Text>
      <Button
        title="Retry"
        onPress={onRefresh}
        variant="primary"
        size="small"
      />
    </View>
  );

  if (watchlistLoading && recommendationsLoading) {
    return renderLoadingState();
  }

  if (watchlistError || recommendationsError) {
    return renderErrorState();
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={'dark-content'}
        backgroundColor={unifiedTheme.colors.primary[500]}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* User Header */}
        {renderUserHeader()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Stats Overview */}
        {renderStatsOverview()}

        {/* Tab Selector */}
        {renderTabSelector()}

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  userHeader: {
    paddingTop: theme.spacing[8],
    paddingBottom: theme.spacing[6],
    paddingHorizontal: theme.spacing[4],
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing[4],
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: theme.typography.fontSize['2xl'],
  },
  levelBadge: {
    position: 'absolute',
    bottom: -theme.spacing[2],
    right: -theme.spacing[2],
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
  },
  levelText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.inverse,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.semantic.text.inverse,
    fontWeight: 'bold',
    marginBottom: theme.spacing[2],
  },
  userEmail: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.inverse,
    opacity: 0.9,
    marginBottom: theme.spacing[3],
  },
  userMeta: {
    alignItems: 'flex-start',
  },
  userMetaText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.inverse,
    opacity: 0.8,
    marginBottom: theme.spacing[2],
  },
  streakContainer: {
    backgroundColor: theme.colors.overlay.light,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.sm,
  },
  streakText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.inverse,
    fontWeight: '600',
  },
  notificationsButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.overlay.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationsIcon: {
    fontSize: theme.typography.fontSize.lg,
  },
  notificationsBadge: {
    position: 'absolute',
    top: -theme.spacing[2],
    right: -theme.spacing[2],
    width: 20,
    height: 20,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationsBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.inverse,
    fontWeight: '600',
  },
  quickActionsContainer: {
    padding: theme.spacing[4],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.semantic.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing[4],
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: theme.spacing[1] },
    shadowOpacity: 0.1,
    shadowRadius: theme.spacing[2],
    elevation: 2,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  quickActionIconText: {
    fontSize: theme.typography.fontSize.lg,
  },
  quickActionTitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  statsContainer: {
    padding: theme.spacing[4],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: theme.spacing[4],
  },
  statContent: {
    alignItems: 'center',
    padding: theme.spacing[4],
  },
  statIcon: {
    fontSize: theme.typography.fontSize.xl,
    marginBottom: theme.spacing[3],
  },
  statValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: 'bold',
    marginBottom: theme.spacing[2],
  },
  statLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[2],
  },
  statTrend: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: theme.semantic.background.secondary,
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[4],
  },
  tabButton: {
    flex: 1,
    paddingVertical: theme.spacing[3],
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabButtonText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    paddingBottom: theme.spacing[8],
  },
  insightsSection: {
    padding: theme.spacing[4],
  },
  insightsGrid: {
    gap: theme.spacing[4],
  },
  insightCard: {
    marginBottom: theme.spacing[2],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[4],
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing[4],
  },
});
