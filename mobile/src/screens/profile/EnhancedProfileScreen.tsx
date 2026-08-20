import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Image,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ProfileSettings } from '../../components/profile/ProfileSettings';
import { AccountSettings } from '../../components/profile/AccountSettings';
import { useWatchlist } from '../../hooks/useWatchlist';
import { useRecommendations } from '../../hooks/useRecommendations';
import { ViewingStats, ViewerProfile } from '../../services/analytics/UserAnalyticsService';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import StreamingServiceIcon from '../../components/subscription/StreamingServiceIcon';
import { useAuth, useIsAuthenticated, useCurrentUser } from '../../context/AuthContext';
import { logger } from '../../utils/logger';

// Default values for when user data is not available
const DEFAULT_PROFILE = {
  bio: '',
  location: '',
  website: '',
  plan: 'Free',
  level: 1,
  followers: 0,
  following: 0,
  publicProfile: true,
  showWatchlist: true,
  showStats: true,
  allowRecommendations: true,
};

const PROFILE_SECTIONS = [
  {
    id: 'overview',
    title: 'Profile Overview',
    icon: '👤',
  },
  {
    id: 'settings',
    title: 'Profile Settings',
    icon: '⚙️',
  },
  {
    id: 'account',
    title: 'Account Settings',
    icon: '🔐',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: '🔔',
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    icon: '🛡️',
  },
  {
    id: 'analytics',
    title: 'Analytics & Insights',
    icon: '📊',
  },
];

// Type imports
type MainTabParamList = {
  Profile: undefined;
  Favorites: undefined;
  NotificationPreferences: undefined;
  Analytics: undefined;
  Auth: undefined;
};

type EnhancedProfileScreenNavigationProp = StackNavigationProp<MainTabParamList, 'Profile'>;

export const EnhancedProfileScreen: React.FC = () => {
  const navigation = useNavigation<EnhancedProfileScreenNavigationProp>();
  const { theme: unifiedTheme } = useTheme();
  const [selectedSection, setSelectedSection] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [_currentSettings, _setCurrentSettings] = useState('profile');

  // Auth context hooks
  const { state: authState, logout } = useAuth();
  const isAuthenticated = useIsAuthenticated();
  const user = useCurrentUser();
  const authLoading = authState.isLoading;

  const {
    stats: _watchlistStats,
    loading: __watchlistLoading,
    refreshWatchlists,
  } = useWatchlist();

  const {
    userPreferences: _userPreferences,
    getInsights: _getInsights,
    loading: __recommendationsLoading,
  } = useRecommendations();

  const {
    subscriptions,
    loading: subscriptionsLoading,
  } = useSubscriptions();

  const [viewingStats, setViewingStats] = useState<ViewingStats | null>(null);
  const [viewerProfile, setViewerProfile] = useState<ViewerProfile | null>(null);
  const [recommendationInsights, setRecommendationInsights] = useState<any>(null);

  // Derived user data with defaults
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
  const userProfile = {
    id: user?.id || '',
    username: user?.username || user?.email?.split('@')[0] || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    name: fullName,
    email: user?.email || '',
    avatar: user?.avatar || null,
    bio: DEFAULT_PROFILE.bio,
    location: DEFAULT_PROFILE.location,
    website: DEFAULT_PROFILE.website,
    memberSince: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'New Member',
    plan: DEFAULT_PROFILE.plan,
    level: DEFAULT_PROFILE.level,
    followers: DEFAULT_PROFILE.followers,
    following: DEFAULT_PROFILE.following,
    publicProfile: DEFAULT_PROFILE.publicProfile,
    showWatchlist: DEFAULT_PROFILE.showWatchlist,
    showStats: DEFAULT_PROFILE.showStats,
    allowRecommendations: DEFAULT_PROFILE.allowRecommendations,
    isVerified: user?.emailVerified || false,
    createdAt: user?.createdAt || new Date().toISOString(),
    updatedAt: user?.createdAt || new Date().toISOString(), // Use createdAt as fallback since updatedAt doesn't exist
  };

  const loadProfileData = async () => {
    try {
      // In a real implementation, this would load actual analytics data
      const mockViewingStats: ViewingStats = {
        totalWatchTime: 1250,
        totalSessions: 45,
        averageSessionDuration: 28,
        completionRate: 0.78,
        favoriteGenres: [
          { genre: 'Drama', count: 12, percentage: 0.35 },
          { genre: 'Action', count: 8, percentage: 0.25 },
          { genre: 'Comedy', count: 7, percentage: 0.20 },
        ],
        favoriteTypes: [
          { type: 'movie', count: 25, percentage: 0.60 },
          { type: 'tv_series', count: 15, percentage: 0.35 },
        ],
        watchingHabits: {
          timeOfDay: {
            'Evening (5PM-9PM)': 18,
            'Night (9PM-6AM)': 12,
            'Afternoon (12PM-5PM)': 10,
            'Morning (6AM-12PM)': 5,
          },
          dayOfWeek: {
            'Weekend': 28,
            'Weekday': 17,
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
      };

      const mockViewerProfile: ViewerProfile = {
        viewingPersonality: 'enthusiast',
        contentPreference: 'mixed',
        viewingPace: 'moderate',
        genreDiversity: 0.7,
        loyaltyScore: 0.85,
        adventureScore: 0.6,
        socialInfluence: 0.3,
        peakHours: ['Evening (5PM-9PM)', 'Night (9PM-6AM)'],
        preferredSessionLength: 45,
        seasonalPreferences: {
          winter: ['Drama', 'Thriller'],
          summer: ['Action', 'Comedy'],
          spring: ['Romance', 'Drama'],
          fall: ['Horror', 'Mystery'],
        },
      };

      const mockInsights = {
        accuracyRate: 0.85,
        clickThroughRate: 0.72,
        addToWatchlistRate: 0.45,
        topGenres: ['Drama', 'Action', 'Comedy'],
        topSources: ['collaborative', 'content_based', 'trending'],
        improvementSuggestions: [
          'Rate more content to improve recommendations',
          'Try content from different genres',
          'Add more items to your watchlist',
        ],
      };

      setViewingStats(mockViewingStats);
      setViewerProfile(mockViewerProfile);
      setRecommendationInsights(mockInsights);
    } catch (error) {
      logger.error('[EnhancedProfileScreen] Failed to load profile data', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshWatchlists(),
        loadProfileData(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveProfileSettings = async (updates: any) => {
    try {
      // In a real implementation, this would save to the backend
      logger.log('[EnhancedProfileScreen] Saving profile settings', { updates });
      Alert.alert('Success', 'Profile updated successfully!');
      setSettingsModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleSaveAccountSettings = async (updates: any) => {
    try {
      // In a real implementation, this would save to the backend
      logger.log('[EnhancedProfileScreen] Saving account settings', { updates });
      Alert.alert('Success', 'Account settings updated successfully!');
      setAccountModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update account settings. Please try again.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // BUG-002 FIX: Explicitly reset navigation to Auth screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' as any }],
              });
            } catch (error) {
              logger.error('[EnhancedProfileScreen] Logout failed', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ],
    );
  };

  const renderProfileHeader = () => (
    <LinearGradient
      colors={[unifiedTheme.colors.primary[500], unifiedTheme.colors.secondary[500]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.profileHeader}
    >
      <View style={styles.profileContent}>
        <View style={styles.avatarSection}>
          {userProfile.avatar ? (
            <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: unifiedTheme.colors.overlay.light }]}>
              <Icon name="person" size={40} color={unifiedTheme.semantic.text.inverse} />
            </View>
          )}
          <TouchableOpacity style={styles.editAvatarButton}>
            <Icon name="edit" size={14} color={unifiedTheme.semantic.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{userProfile.name}</Text>
          <Text style={styles.userEmail}>{userProfile.email}</Text>

          {userProfile.bio ? (
            <Text style={styles.userBio} numberOfLines={3}>
              {userProfile.bio}
            </Text>
          ) : null}

          <View style={styles.userMeta}>
            {userProfile.location ? (
              <Text style={styles.userMetaText}>
                📍 {userProfile.location}
              </Text>
            ) : null}
            {userProfile.website ? (
              <Text style={styles.userMetaText}>
                🌐 {userProfile.website}
              </Text>
            ) : null}
            <Text style={styles.userMetaText}>
              📅 {userProfile.memberSince}
            </Text>
          </View>

          <View style={styles.userStats}>
            <View style={styles.userStatItem}>
              <Text style={styles.userStatValue}>{userProfile.followers}</Text>
              <Text style={styles.userStatLabel}>Followers</Text>
            </View>
            <View style={styles.userStatItem}>
              <Text style={styles.userStatValue}>{userProfile.following}</Text>
              <Text style={styles.userStatLabel}>Following</Text>
            </View>
            <View style={styles.userStatItem}>
              <Text style={styles.userStatValue}>Lvl {userProfile.level}</Text>
              <Text style={styles.userStatLabel}>Level</Text>
            </View>
          </View>

          <View style={styles.subscriptionStatus}>
            <View style={styles.subscriptionBadge}>
              <Text style={styles.subscriptionBadgeText}>⭐ {userProfile.plan}</Text>
            </View>
            <TouchableOpacity
              style={styles.manageSubscriptionButton}
              onPress={() => Alert.alert('Manage Subscription', 'Subscription management will open pricing page')}
            >
              <Text style={styles.manageSubscriptionText}>Manage Subscription</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.shareButton}>
        <Text style={styles.shareButtonText}>📤 Share Profile</Text>
      </TouchableOpacity>
    </LinearGradient>
  );

  const renderSectionSelector = () => (
    <View style={styles.sectionSelector}>
      {PROFILE_SECTIONS.map((section) => (
        <TouchableOpacity
          key={section.id}
          style={[
            styles.sectionButton,
            selectedSection === section.id && styles.sectionButtonActive,
          ]}
          onPress={() => setSelectedSection(section.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionIcon}>{section.icon}</Text>
          <Text
            style={[
              styles.sectionButtonText,
              selectedSection === section.id && styles.sectionButtonTextActive,
            ]}
          >
            {section.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverviewSection = () => (
    <View style={styles.sectionContent}>
      {/* Viewing Stats Summary */}
      {viewingStats && (
        <Card style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Viewing Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {Math.round(viewingStats.totalWatchTime / 60)}h
              </Text>
              <Text style={styles.statLabel}>Total Time</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{viewingStats.totalSessions}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {Math.round(viewingStats.completionRate * 100)}%
              </Text>
              <Text style={styles.statLabel}>Completion</Text>
            </View>
          </View>

          <Text style={styles.subsectionTitle}>Top Genres</Text>
          <View style={styles.genreList}>
            {viewingStats.favoriteGenres.slice(0, 3).map((genre, index) => (
              <View key={index} style={styles.genreBadge}>
                <Text style={styles.genreText}>{genre.genre}</Text>
                <Text style={styles.genreCount}>{genre.count}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Streaming Subscriptions */}
      <Card style={styles.subscriptionsCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>My Streaming Services</Text>
          <TouchableOpacity onPress={() => (navigation as any).navigate('SubscriptionManagement')}>
            <Text style={styles.manageLink}>Manage →</Text>
          </TouchableOpacity>
        </View>

        {subscriptionsLoading ? (
          <Text style={styles.loadingText}>Loading subscriptions...</Text>
        ) : subscriptions.length > 0 ? (
          <>
            <View style={styles.subscriptionIcons}>
              {subscriptions.slice(0, 6).map((sub) => (
                <View key={sub.id} style={styles.subscriptionIconWrapper}>
                  <StreamingServiceIcon serviceId={sub.serviceId} size="small" />
                </View>
              ))}
            </View>
            <Text style={styles.subscriptionCount}>
              {subscriptions.length} active subscription{subscriptions.length !== 1 ? 's' : ''}
            </Text>
          </>
        ) : (
          <View style={styles.emptySubscriptions}>
            <Text style={styles.emptySubscriptionsText}>
              No subscriptions added yet. Add your streaming services to see personalized content availability across VPN regions.
            </Text>
            <TouchableOpacity
              style={styles.addSubscriptionButton}
              onPress={() => (navigation as any).navigate('SubscriptionManagement')}
            >
              <Text style={styles.addSubscriptionButtonText}>+ Add Services</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* Viewer Profile */}
      {viewerProfile && (
        <Card style={styles.profileCard}>
          <Text style={styles.sectionTitle}>Viewing Personality</Text>
          <View style={styles.personalityBadge}>
            <Text style={styles.personalityText}>
              {viewerProfile.viewingPersonality.replace('_', ' ').charAt(0).toUpperCase() +
                viewerProfile.viewingPersonality.replace('_', ' ').slice(1)}
            </Text>
          </View>
          <Text style={styles.personalityDescription}>
            {viewerProfile.viewingPersonality === 'enthusiast' &&
              'You\'re a passionate viewer with diverse interests and high engagement.'}
            {viewerProfile.viewingPersonality === 'casual' &&
              'You enjoy content at a relaxed pace with occasional viewing sessions.'}
            {viewerProfile.viewingPersonality === 'binge_watcher' &&
              'You love diving deep into series and watching multiple episodes in one sitting.'}
            {viewerProfile.viewingPersonality === 'explorer' &&
              'You have eclectic taste and love discovering new content across genres.'}
            {viewerProfile.viewingPersonality === 'specialist' &&
              'You have refined taste and prefer content in specific genres or styles.'}
          </Text>
        </Card>
      )}

      {/* Quick Actions */}
      <Card style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => setSettingsModalVisible(true)}
          >
            <Text style={styles.quickActionIcon}>✏️</Text>
            <Text style={styles.quickActionText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => setAccountModalVisible(true)}
          >
            <Text style={styles.quickActionIcon}>⚙️</Text>
            <Text style={styles.quickActionText}>Account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => (navigation as any).navigate('SubscriptionManagement')}
          >
            <Text style={styles.quickActionIcon}>📺</Text>
            <Text style={styles.quickActionText}>Subscriptions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Favorites')}
          >
            <Text style={styles.quickActionIcon}>❤️</Text>
            <Text style={styles.quickActionText}>Watchlist</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('NotificationPreferences' as any)}
          >
            <Text style={styles.quickActionIcon}>🔔</Text>
            <Text style={styles.quickActionText}>Notifications</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );

  const renderSettingsSection = () => (
    <View style={styles.sectionContent}>
      <Text style={styles.modalSectionTitle}>Profile Settings</Text>
      <ProfileSettings
        initialProfile={{
          id: userProfile.id,
          username: userProfile.username,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          name: userProfile.name,
          email: userProfile.email,
          bio: userProfile.bio,
          location: userProfile.location,
          website: userProfile.website,
          publicProfile: userProfile.publicProfile,
          showWatchlist: userProfile.showWatchlist,
          showStats: userProfile.showStats,
          allowRecommendations: userProfile.allowRecommendations,
          isVerified: userProfile.isVerified,
          createdAt: userProfile.createdAt,
          updatedAt: userProfile.updatedAt,
        }}
        onSave={handleSaveProfileSettings}
        onCancel={() => setSelectedSection('overview')}
      />
    </View>
  );

  const renderAnalyticsSection = () => (
    <View style={styles.sectionContent}>
      <Card style={styles.analyticsCard}>
        <Text style={styles.sectionTitle}>Recommendation Insights</Text>
        {recommendationInsights && (
          <View>
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>Accuracy Rate</Text>
              <Text style={styles.insightValue}>
                {Math.round(recommendationInsights.accuracyRate * 100)}%
              </Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>Click-Through Rate</Text>
              <Text style={styles.insightValue}>
                {Math.round(recommendationInsights.clickThroughRate * 100)}%
              </Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>Add to Watchlist Rate</Text>
              <Text style={styles.insightValue}>
                {Math.round(recommendationInsights.addToWatchlistRate * 100)}%
              </Text>
            </View>
          </View>
        )}
      </Card>

      <Button
        title="View Detailed Analytics"
        onPress={() => navigation.navigate('Analytics' as any)}
        style={styles.analyticsButton}
      />
    </View>
  );

  const renderSectionContent = () => {
    switch (selectedSection) {
      case 'overview':
        return renderOverviewSection();
      case 'settings':
        return renderSettingsSection();
      case 'account':
        return (
          <View style={styles.sectionContent}>
            <AccountSettings
              onSave={handleSaveAccountSettings}
              onEnable2FA={async () => Alert.alert('2FA', 'Feature coming soon!')}
              onDisable2FA={async () => Alert.alert('2FA', 'Feature coming soon!')}
              onDeleteAccount={async () => Alert.alert('Delete', 'Feature coming soon!')}
            />
          </View>
        );
      case 'notifications':
        return (
          <View style={styles.sectionContent}>
            <Card style={styles.placeholderCard}>
              <Text style={styles.placeholderTitle}>Notification Settings</Text>
              <Text style={styles.placeholderText}>
                Notification preferences will be available soon.
              </Text>
            </Card>
          </View>
        );
      case 'privacy':
        return (
          <View style={styles.sectionContent}>
            <Card style={styles.placeholderCard}>
              <Text style={styles.placeholderTitle}>Privacy & Security</Text>
              <Text style={styles.placeholderText}>
                Privacy and security settings will be available soon.
              </Text>
            </Card>
          </View>
        );
      case 'analytics':
        return renderAnalyticsSection();
      default:
        return renderOverviewSection();
    }
  };

  const styles = createStyles(unifiedTheme);

  // Loading state
  if (authLoading) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle={'dark-content'}
          backgroundColor={unifiedTheme.colors.primary[500]}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={unifiedTheme.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  // Unauthenticated state
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle={'dark-content'}
          backgroundColor={unifiedTheme.colors.primary[500]}
        />
        <View style={styles.unauthContainer}>
          <Icon name="account-circle" size={80} color={unifiedTheme.semantic.border.primary} />
          <Text style={styles.unauthTitle}>Sign in to view your profile</Text>
          <Text style={styles.unauthSubtitle}>
            Access your profile, viewing stats, and personalized settings
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate('Auth' as any)}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
        {renderProfileHeader()}
        {renderSectionSelector()}
        {renderSectionContent()}

        <View style={styles.logoutContainer}>
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="outline"
            style={styles.logoutButton}
          />
        </View>
      </ScrollView>

      {/* Profile Settings Modal */}
      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setSettingsModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Profile Settings</Text>
            <View style={styles.modalSpacer} />
          </View>
          <ProfileSettings
            initialProfile={{
              id: userProfile.id,
              name: userProfile.name,
              email: userProfile.email,
              username: userProfile.username,
              firstName: userProfile.firstName,
              lastName: userProfile.lastName,
              bio: userProfile.bio,
              location: userProfile.location,
              website: userProfile.website,
              publicProfile: userProfile.publicProfile,
              showWatchlist: userProfile.showWatchlist,
              showStats: userProfile.showStats,
              allowRecommendations: userProfile.allowRecommendations,
            }}
            onSave={handleSaveProfileSettings}
            onCancel={() => setSettingsModalVisible(false)}
          />
        </View>
      </Modal>

      {/* Account Settings Modal */}
      <Modal
        visible={accountModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setAccountModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Account Settings</Text>
            <View style={styles.modalSpacer} />
          </View>
          <AccountSettings
            onSave={handleSaveAccountSettings}
            onEnable2FA={async () => Alert.alert('2FA', 'Feature coming soon!')}
            onDisable2FA={async () => Alert.alert('2FA', 'Feature coming soon!')}
            onDeleteAccount={async () => Alert.alert('Delete', 'Feature coming soon!')}
          />
        </View>
      </Modal>
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
  profileHeader: {
    paddingTop: theme.spacing[8],
    paddingBottom: theme.spacing[6],
    paddingHorizontal: theme.spacing[4],
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarSection: {
    position: 'relative',
    marginRight: theme.spacing[6],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: theme.typography.fontSize.xxxl,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: -theme.spacing[2],
    right: -theme.spacing[2],
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: theme.spacing[0.5],
    borderColor: theme.semantic.text.inverse,
  },
  editAvatarText: {
    fontSize: theme.typography.fontSize.sm,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: theme.typography.fontSize.xl,
    color: theme.semantic.text.inverse,
    fontWeight: 'bold',
    marginBottom: theme.spacing[2],
  },
  userEmail: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.inverse,
    opacity: theme.colors.opacity.high,
    marginBottom: theme.spacing[3],
  },
  userBio: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.inverse,
    opacity: theme.colors.opacity.high,
    marginBottom: theme.spacing[3],
  },
  userMeta: {
    marginBottom: theme.spacing[4],
  },
  userMetaText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.inverse,
    opacity: theme.colors.opacity.medium,
    marginBottom: theme.spacing[2],
  },
  userStats: {
    flexDirection: 'row',
    gap: theme.spacing[4],
  },
  userStatItem: {
    alignItems: 'center',
  },
  userStatValue: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.semantic.text.inverse,
    fontWeight: 'bold',
  },
  userStatLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.inverse,
    opacity: theme.colors.opacity.medium,
  },
  shareButton: {
    alignSelf: 'center',
    marginTop: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    backgroundColor: theme.colors.overlay.light,
    borderRadius: theme.borderRadius.sm,
  },
  shareButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.inverse,
    fontWeight: '500',
  },
  sectionSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing[4],
    gap: theme.spacing[3],
  },
  sectionButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.semantic.background.secondary,
    borderWidth: theme.spacing[0.25],
    borderColor: theme.semantic.border.primary,
    minWidth: 100,
  },
  sectionButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sectionIcon: {
    fontSize: theme.typography.fontSize.lg,
    marginBottom: theme.spacing[2],
  },
  sectionButtonText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
    fontWeight: '500',
  },
  sectionButtonTextActive: {
    color: theme.semantic.text.inverse,
  },
  sectionContent: {
    padding: theme.spacing[4],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.semantic.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing[4],
  },
  subsectionTitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.primary,
    fontWeight: '600',
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[3],
  },
  statsCard: {
    marginBottom: theme.spacing[6],
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing[6],
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.secondary,
    marginTop: theme.spacing[2],
  },
  genreList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
  },
  genreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.sm,
  },
  genreText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: '600',
    marginRight: theme.spacing[2],
  },
  genreCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
  },
  profileCard: {
    marginBottom: theme.spacing[6],
  },
  subscriptionsCard: {
    marginBottom: theme.spacing[6],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  manageLink: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    paddingVertical: theme.spacing[6],
  },
  subscriptionIcons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[4],
    marginBottom: theme.spacing[3],
  },
  subscriptionIconWrapper: {
    // Wrapper for spacing
  },
  subscriptionCount: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    marginTop: theme.spacing[2],
  },
  emptySubscriptions: {
    paddingVertical: theme.spacing[6],
    alignItems: 'center',
  },
  emptySubscriptionsText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
  },
  addSubscriptionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
  },
  addSubscriptionButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.semantic.text.inverse,
  },
  personalityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing[4],
  },
  personalityText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.inverse,
    fontWeight: '600',
  },
  personalityDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.primary,
    lineHeight: 22,
  },
  actionsCard: {
    marginBottom: theme.spacing[6],
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: theme.spacing[6],
    backgroundColor: theme.semantic.background.secondary,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing[4],
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: theme.spacing[1] },
    shadowOpacity: theme.colors.opacity.subtle,
    shadowRadius: theme.spacing[2],
    elevation: theme.spacing[0.5],
  },
  quickActionIcon: {
    fontSize: theme.typography.fontSize.xl,
    marginBottom: theme.spacing[3],
  },
  quickActionText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.semantic.text.primary,
    fontWeight: '500',
  },
  analyticsCard: {
    marginBottom: theme.spacing[6],
  },
  insightItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    borderBottomWidth: theme.spacing[0.25],
    borderBottomColor: theme.semantic.border.primary,
  },
  insightLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.primary,
  },
  insightValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  analyticsButton: {
    marginBottom: theme.spacing[8],
  },
  placeholderCard: {
    padding: theme.spacing[8],
    alignItems: 'center',
  },
  placeholderTitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[3],
  },
  placeholderText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
  },
  logoutContainer: {
    padding: theme.spacing[4],
    paddingTop: 0,
  },
  logoutButton: {
    borderColor: theme.colors.error,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing[4],
    borderBottomWidth: theme.spacing[0.25],
    borderBottomColor: theme.semantic.border.primary,
  },
  modalCloseButton: {
    width: theme.spacing[10],
    height: theme.spacing[10],
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.semantic.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.semantic.text.primary,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.semantic.text.primary,
    fontWeight: '600',
  },
  modalSpacer: {
    width: theme.spacing[10],
  },
  modalSectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.semantic.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing[6],
    paddingHorizontal: theme.spacing[4],
  },
  subscriptionStatus: {
    marginTop: theme.spacing[4],
    alignItems: 'center',
  },
  subscriptionBadge: {
    backgroundColor: theme.colors.overlay.light,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing[3],
  },
  subscriptionBadgeText: {
    color: theme.semantic.text.inverse,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
  },
  manageSubscriptionButton: {
    backgroundColor: theme.colors.overlay.lighter,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.spacing[0.25],
    borderColor: theme.colors.overlay.light,
  },
  manageSubscriptionText: {
    color: theme.semantic.text.inverse,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '500',
  },
  // Loading state styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Note: loadingText is already defined above for subscriptions loading
  // Unauthenticated state styles
  unauthContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[8],
  },
  unauthTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginTop: theme.spacing[6],
    marginBottom: theme.spacing[3],
    textAlign: 'center',
  },
  unauthSubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing[8],
    paddingHorizontal: theme.spacing[4],
  },
  signInButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing[8],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
  },
  signInButtonText: {
    color: theme.semantic.text.inverse,
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
  },
});
