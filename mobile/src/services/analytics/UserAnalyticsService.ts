import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../api/ApiService';
import { AnalyticsManager } from './AnalyticsManager';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

export interface ViewingSession {
  id: string;
  contentId: string;
  title: string;
  type: 'movie' | 'tv_series' | 'documentary' | 'anime' | 'other';
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  watchedPercentage: number; // 0-100
  pausedCount: number;
  seekCount: number;
  quality?: string;
  device: string;
  platform: string;
  completed: boolean;
  sessionId: string;
}

export interface ViewingStats {
  totalWatchTime: number; // in minutes
  totalSessions: number;
  averageSessionDuration: number;
  completionRate: number; // percentage
  favoriteGenres: Array<{ genre: string; count: number; percentage: number }>;
  favoriteTypes: Array<{ type: string; count: number; percentage: number }>;
  watchingHabits: {
    timeOfDay: Record<string, number>;
    dayOfWeek: Record<string, number>;
    monthlyTrends: Array<{ month: string; minutes: number }>;
  };
  streamingServiceUsage: Array<{
    service: string;
    minutes: number;
    percentage: number;
    count: number;
  }>;
  contentDiscovery: {
    searchUsage: number;
    recommendationUsage: number;
    browsingUsage: number;
    socialDiscovery: number;
  };
  engagement: {
    ratingsGiven: number;
    reviewsWritten: number;
    watchlistItemsAdded: number;
    contentShared: number;
  };
}

export interface ViewerProfile {
  viewingPersonality: 'casual' | 'enthusiast' | 'binge_watcher' | 'explorer' | 'specialist';
  contentPreference: 'mainstream' | 'indie' | 'mixed';
  viewingPace: 'slow' | 'moderate' | 'fast';
  genreDiversity: number; // 0-1 scale
  loyaltyScore: number; // How likely to finish content
  adventureScore: number; // How likely to try new content
  socialInfluence: number; // How influenced by others
  peakHours: string[];
  preferredSessionLength: number;
  seasonalPreferences: Record<string, string[]>;
}

export interface ContentInsight {
  contentId: string;
  title: string;
  watchTime: number;
  viewerCount: number;
  averageCompletionRate: number;
  dropOffPoints: number[];
  viewerDemographics: {
    ageGroups: Record<string, number>;
    genderDistribution?: Record<string, number>;
    locationDistribution?: Record<string, number>;
  };
  satisfactionScore: number;
  trendingScore: number;
  retentionScore: number;
}

class UserAnalyticsService {
  private readonly STORAGE_KEYS = {
    VIEWING_SESSIONS: '@geoleap_viewing_sessions',
    VIEWING_STATS: '@geoleap_viewing_stats',
    VIEWER_PROFILE: '@geoleap_viewer_profile',
    ANALYTICS_CACHE: '@geoleap_analytics_cache',
  };

  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour
  private analyticsManager: AnalyticsManager;

  constructor() {
    this.analyticsManager = AnalyticsManager.getInstance();
  }

  async trackViewingSession(session: Omit<ViewingSession, 'id'>): Promise<void> {
    const viewingSession: ViewingSession = {
      ...session,
      id: this.generateId(),
    };

    try {
      const response = await ApiService.post('/api/analytics/viewing-sessions', viewingSession);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to track viewing session');
      }
    } catch (error) {
      logger.warn('[UserAnalyticsService] Failed to track viewing session on server, will retry on next sync', error);
      // Store failed request for retry - using AsyncStorage for offline persistence
      try {
        const failed = await AsyncStorage.getItem('failed_tracking_queue') || '[]';
        const queue = JSON.parse(failed);
        queue.push({ type: 'viewing_session', data: viewingSession, timestamp: Date.now() });
        await AsyncStorage.setItem('failed_tracking_queue', JSON.stringify(queue));
      } catch (storageError) {
        logger.warn('[UserAnalyticsService] Failed to queue tracking data', storageError);
      }
    }

    await this.cacheViewingSession(viewingSession);
    await this.updateLocalStats(viewingSession);
  }

  async updateViewingSession(
    sessionId: string,
    updates: Partial<ViewingSession>,
  ): Promise<void> {
    try {
      const response = await ApiService.put(
        `/analytics/viewing-sessions/${sessionId}`,
        updates,
      );

      if (!response.success) {
        logger.warn('[UserAnalyticsService] Failed to update viewing session on server', { error: response.error?.message });
      }
    } catch (error) {
      logger.warn('[UserAnalyticsService] Failed to update viewing session on server', error);
    }

    await this.updateCachedSession(sessionId, updates);
  }

  async completeViewingSession(sessionId: string): Promise<void> {
    await this.updateViewingSession(sessionId, {
      endTime: new Date().toISOString(),
      completed: true,
    });
  }

  async getViewingStats(userId: string, period?: 'week' | 'month' | 'year'): Promise<ViewingStats> {
    try {
      const url = period
        ? `/analytics/viewing-stats/${userId}?period=${period}`
        : `/analytics/viewing-stats/${userId}`;

      const response = await ApiService.get<ViewingStats>(url);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch viewing stats');
      }

      return response.data;
    } catch (error) {
      logger.warn('[UserAnalyticsService] Failed to fetch viewing stats from server, using cache', error);
      return this.getCachedViewingStats();
    }
  }

  async getViewerProfile(userId: string): Promise<ViewerProfile> {
    try {
      const response = await ApiService.get<ViewerProfile>(
        `/analytics/viewer-profile/${userId}`,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch viewer profile');
      }

      return response.data;
    } catch (error) {
      logger.warn('[UserAnalyticsService] Failed to fetch viewer profile from server, analyzing locally', error);
      return this.analyzeViewerProfile();
    }
  }

  async getContentInsights(contentId: string): Promise<ContentInsight | null> {
    try {
      const response = await ApiService.get<ContentInsight>(
        `/analytics/content-insights/${contentId}`,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch content insights');
      }

      return response.data;
    } catch (error) {
      logger.warn('[UserAnalyticsService] Failed to fetch content insights', error);
      return null;
    }
  }

  async getPersonalizedInsights(userId: string): Promise<{
    viewingTrends: Array<{
      date: string;
      minutes: number;
      sessions: number;
    }>;
    genreEvolution: Array<{
      genre: string;
      monthlyData: Array<{ month: string; count: number }>;
    }>;
    recommendations: string[];
    achievements: Array<{
      type: string;
      title: string;
      description: string;
      unlockedAt: string;
    }>;
    upcomingTrends: Array<{
      genre: string;
      score: number;
      reason: string;
    }>;
  }> {
    try {
      const response = await ApiService.get<{
        viewingTrends: Array<{
          date: string;
          minutes: number;
          sessions: number;
        }>;
        genreEvolution: Array<{
          genre: string;
          monthlyData: Array<{ month: string; count: number }>;
        }>;
        recommendations: string[];
        achievements: Array<{
          type: string;
          title: string;
          description: string;
          unlockedAt: string;
        }>;
        upcomingTrends: Array<{
          genre: string;
          score: number;
          reason: string;
        }>;
      }>(`/analytics/personalized-insights/${userId}`);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch personalized insights');
      }

      return response.data;
    } catch (error) {
      logger.warn('[UserAnalyticsService] Failed to fetch personalized insights', error);
      return this.generateBasicInsights();
    }
  }

  async trackContentView(contentId: string, source: string, duration: number = 0): Promise<void> {
    const trackingData = {
      contentId,
      source, // 'search', 'recommendations', 'watchlist', 'trending', etc.
      duration,
      timestamp: new Date().toISOString(),
    };

    // Use AnalyticsManager for unified backend sync
    await this.analyticsManager.trackEvent({
      id: uuidv4(),
      timestamp: Date.now(),
      eventType: 'content_view',
      category: 'engagement',
      source: 'viewing',
      data: trackingData,
      retryCount: 0,
    });
  }

  async trackUserAction(action: {
    type: 'share' | 'rate' | 'review' | 'add_to_watchlist' | 'search' | 'filter';
    metadata: Record<string, any>;
  }): Promise<void> {
    const trackingData = {
      ...action,
      timestamp: new Date().toISOString(),
    };

    // Map action type to category
    const category = action.type === 'search' ? 'search' :
                    action.type === 'filter' ? 'search' :
                    action.type === 'add_to_watchlist' ? 'content' :
                    'engagement';

    // Use AnalyticsManager for unified backend sync
    await this.analyticsManager.trackEvent({
      id: uuidv4(),
      timestamp: Date.now(),
      eventType: `user_action_${action.type}`,
      category,
      source: 'user',
      data: trackingData,
      retryCount: 0,
    });
  }

  async exportUserData(userId: string, format: 'json' | 'csv' = 'json'): Promise<any> {
    try {
      const response = await ApiService.get<any>(
        `/analytics/export/${userId}?format=${format}`,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to export user data');
      }

      return response.data;
    } catch (error) {
      logger.warn('[UserAnalyticsService] Failed to export user data', error);
      throw error;
    }
  }

  async deleteUserData(userId: string): Promise<void> {
    try {
      const response = await ApiService.delete(`/analytics/user-data/${userId}`);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete user data');
      }
    } catch (error) {
      logger.warn('[UserAnalyticsService] Failed to delete user data', error);
      throw error;
    }

    // Clear local data
    await this.clearLocalData();
  }

  async syncTrackingData(): Promise<void> {
    // Sync is now handled by AnalyticsManager's periodic flush and network monitoring
    await this.analyticsManager.flushQueue();
  }

  async generateViewingReport(
    userId: string,
    period: 'week' | 'month' | 'year',
  ): Promise<{
    summary: ViewingStats;
    insights: string[];
    recommendations: string[];
    charts: {
      genreDistribution: Array<{ genre: string; value: number }>;
      viewingTrends: Array<{ date: string; minutes: number }>;
      serviceUsage: Array<{ service: string; minutes: number }>;
    };
  }> {
    const stats = await this.getViewingStats(userId, period);
    const profile = await this.getViewerProfile(userId);
    const _insights = await this.getPersonalizedInsights(userId);

    return {
      summary: stats,
      insights: this.generateInsights(stats, profile),
      recommendations: this.generateRecommendations(stats, profile),
      charts: {
        genreDistribution: stats.favoriteGenres.map(g => ({
          genre: g.genre,
          value: g.count,
        })),
        viewingTrends: stats.watchingHabits.monthlyTrends.map(t => ({
          date: t.month,
          minutes: t.minutes,
        })),
        serviceUsage: stats.streamingServiceUsage.map(s => ({
          service: s.service,
          minutes: s.minutes,
        })),
      },
    };
  }

  private async cacheViewingSession(session: ViewingSession): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem(this.STORAGE_KEYS.VIEWING_SESSIONS);
      const sessions = existing ? JSON.parse(existing) : [];
      sessions.push(session);

      // Keep only last 1000 sessions
      if (sessions.length > 1000) {
        sessions.splice(0, sessions.length - 1000);
      }

      await AsyncStorage.setItem(
        this.STORAGE_KEYS.VIEWING_SESSIONS,
        JSON.stringify(sessions),
      );
    } catch (error) {
      logger.warn('[UserAnalyticsService] Failed to cache viewing session', error);
    }
  }

  private async updateCachedSession(sessionId: string, updates: Partial<ViewingSession>): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem(this.STORAGE_KEYS.VIEWING_SESSIONS);
      const sessions = existing ? JSON.parse(existing) : [];

      const sessionIndex = sessions.findIndex((s: ViewingSession) => s.id === sessionId);
      if (sessionIndex !== -1) {
        sessions[sessionIndex] = { ...sessions[sessionIndex], ...updates };
        await AsyncStorage.setItem(
          this.STORAGE_KEYS.VIEWING_SESSIONS,
          JSON.stringify(sessions),
        );
      }
    } catch (error) {
      logger.warn('[UserAnalyticsService] Failed to update cached session', error);
    }
  }

  private async updateLocalStats(session: ViewingSession): Promise<void> {
    const existingStats = await this.getCachedViewingStats();

    const updatedStats: ViewingStats = {
      ...existingStats,
      totalWatchTime: existingStats.totalWatchTime + session.duration,
      totalSessions: existingStats.totalSessions + 1,
      averageSessionDuration: (existingStats.totalWatchTime + session.duration) / (existingStats.totalSessions + 1),
    };

    await this.cacheViewingStats(updatedStats);
  }

  private async getCachedViewingStats(): Promise<ViewingStats> {
    try {
      const cached = await AsyncStorage.getItem(this.STORAGE_KEYS.VIEWING_STATS);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('[UserAnalyticsService] Failed to get cached viewing stats', error);
    }

    return this.getDefaultStats();
  }

  private async cacheViewingStats(stats: ViewingStats): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.VIEWING_STATS,
        JSON.stringify(stats),
      );
    } catch (error) {
      logger.warn('[UserAnalyticsService] Failed to cache viewing stats', error);
    }
  }

  private async analyzeViewerProfile(): Promise<ViewerProfile> {
    const sessions = await this.getViewingSessions();
    const stats = await this.getCachedViewingStats();

    // Analyze viewing patterns
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.completed).length;
    const averageSessionLength = sessions.reduce((sum, s) => sum + s.duration, 0) / totalSessions;

    // Determine viewing personality
    let personality: ViewerProfile['viewingPersonality'] = 'casual';
    if (stats.totalWatchTime > 1000 && completedSessions / totalSessions > 0.8) {
      personality = 'binge_watcher';
    } else if (stats.totalWatchTime > 500) {
      personality = 'enthusiast';
    } else if (stats.favoriteGenres.length > 5) {
      personality = 'explorer';
    } else if (stats.favoriteGenres.length <= 2) {
      personality = 'specialist';
    }

    // Determine viewing pace
    let pace: ViewerProfile['viewingPace'] = 'moderate';
    if (averageSessionLength > 120) {
      pace = 'slow';
    } else if (averageSessionLength < 60) {
      pace = 'fast';
    }

    // Calculate genre diversity
    const genreDiversity = Math.min(stats.favoriteGenres.length / 10, 1);

    // Calculate loyalty score
    const loyaltyScore = completedSessions / totalSessions;

    return {
      viewingPersonality: personality,
      contentPreference: 'mixed',
      viewingPace: pace,
      genreDiversity,
      loyaltyScore,
      adventureScore: genreDiversity,
      socialInfluence: 0.5,
      peakHours: this.calculatePeakHours(sessions),
      preferredSessionLength: Math.round(averageSessionLength),
      seasonalPreferences: {},
    };
  }

  private async getViewingSessions(): Promise<ViewingSession[]> {
    try {
      const cached = await AsyncStorage.getItem(this.STORAGE_KEYS.VIEWING_SESSIONS);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      logger.warn('[UserAnalyticsService] Failed to get viewing sessions', error);
      return [];
    }
  }

  private calculatePeakHours(sessions: ViewingSession[]): string[] {
    const hourCounts: Record<string, number> = {};

    sessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      const timeSlot = this.getTimeSlot(hour);
      hourCounts[timeSlot] = (hourCounts[timeSlot] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => hour);
  }

  private getTimeSlot(hour: number): string {
    if (hour >= 6 && hour < 12) {return 'Morning (6AM-12PM)';}
    if (hour >= 12 && hour < 17) {return 'Afternoon (12PM-5PM)';}
    if (hour >= 17 && hour < 21) {return 'Evening (5PM-9PM)';}
    return 'Night (9PM-6AM)';
  }

  // Queue management is now handled by AnalyticsManager

  private async clearLocalData(): Promise<void> {
    const keys = [
      this.STORAGE_KEYS.VIEWING_SESSIONS,
      this.STORAGE_KEYS.VIEWING_STATS,
      this.STORAGE_KEYS.VIEWER_PROFILE,
      this.STORAGE_KEYS.ANALYTICS_CACHE,
    ];

    for (const key of keys) {
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {
        logger.warn(`[UserAnalyticsService] Failed to clear ${key}`, error);
      }
    }
  }

  private getDefaultStats(): ViewingStats {
    return {
      totalWatchTime: 0,
      totalSessions: 0,
      averageSessionDuration: 0,
      completionRate: 0,
      favoriteGenres: [],
      favoriteTypes: [],
      watchingHabits: {
        timeOfDay: {},
        dayOfWeek: {},
        monthlyTrends: [],
      },
      streamingServiceUsage: [],
      contentDiscovery: {
        searchUsage: 0,
        recommendationUsage: 0,
        browsingUsage: 0,
        socialDiscovery: 0,
      },
      engagement: {
        ratingsGiven: 0,
        reviewsWritten: 0,
        watchlistItemsAdded: 0,
        contentShared: 0,
      },
    };
  }

  private generateBasicInsights() {
    return {
      viewingTrends: [],
      genreEvolution: [],
      recommendations: [
        'Continue exploring new genres to expand your viewing experience',
        'Try content recommended based on your viewing history',
        'Consider watching trending content in your favorite genres',
      ],
      achievements: [],
      upcomingTrends: [],
    };
  }

  private generateInsights(stats: ViewingStats, profile: ViewerProfile): string[] {
    const insights = [];

    if (stats.totalWatchTime > 1000) {
      insights.push('You\'re a dedicated viewer with over 16 hours of content watched!');
    }

    if (profile.loyaltyScore > 0.8) {
      insights.push('You have excellent completion rate - you really finish what you start!');
    }

    if (profile.genreDiversity > 0.7) {
      insights.push('You\'re an adventurous viewer with diverse taste in content!');
    }

    if (stats.streamingServiceUsage.length > 3) {
      insights.push('You make great use of multiple streaming services!');
    }

    return insights;
  }

  private generateRecommendations(stats: ViewingStats, profile: ViewerProfile): string[] {
    const recommendations = [];

    if (profile.genreDiversity < 0.3) {
      recommendations.push('Try exploring new genres to discover hidden gems');
    }

    if (profile.loyaltyScore < 0.5) {
      recommendations.push('Consider shorter content or better matching your preferences');
    }

    if (stats.engagement.ratingsGiven < 10) {
      recommendations.push('Rate more content to improve personalized recommendations');
    }

    if (stats.contentDiscovery.recommendationUsage < 0.3) {
      recommendations.push('Check out personalized recommendations for better matches');
    }

    return recommendations;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}

export const _userAnalyticsService = new UserAnalyticsService();
