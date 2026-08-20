import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../api/ApiService';
import { watchlistService } from '../watchlist/WatchlistService';
import { logger } from '../../utils/logger';

export interface Recommendation {
  id: string;
  title: string;
  type: 'movie' | 'tv_series' | 'documentary' | 'anime' | 'other';
  rating: number;
  year: number;
  availableOn: string[];
  poster?: string;
  backdrop?: string;
  genres: string[];
  runtime?: number;
  seasons?: number;
  synopsis?: string;
  cast?: string[];
  director?: string[];
  reason: string;
  matchScore: number;
  confidence: number;
  source: 'collaborative' | 'content_based' | 'trending' | 'popular' | 'friends' | 'similar_users';
  metadata: {
    userPreferences?: UserPreferences;
    similarUsers?: string[];
    watchlistOverlap?: number;
    trendingRank?: number;
    popularityScore?: number;
    friendRecommendations?: number;
  };
  createdAt: string;
}

export interface UserPreferences {
  genres: Record<string, number>; // genre -> weight (0-1)
  types: Record<string, number>; // type -> weight
  ratings: Record<string, number>; // rating range -> weight
  decades: Record<string, number>; // decade -> weight
  runtime: {
    min: number;
    max: number;
    preferred: number;
  };
  streamingServices: Record<string, number>; // service -> weight
  actors: Record<string, number>; // actor -> weight
  directors: Record<string, number>; // director -> weight
  keywords: Record<string, number>; // keyword -> weight
}

export interface RecommendationContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: 'weekday' | 'weekend';
  season: 'spring' | 'summer' | 'fall' | 'winter';
  weather?: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  mood?: 'happy' | 'sad' | 'excited' | 'relaxed' | 'adventurous';
  company?: 'alone' | 'partner' | 'family' | 'friends';
  availableTime?: number; // minutes
}

export interface RecommendationFilter {
  genres?: string[];
  types?: string[];
  minRating?: number;
  maxRating?: number;
  yearRange?: [number, number];
  runtimeRange?: [number, number];
  streamingServices?: string[];
  excludeWatched?: boolean;
  excludeInWatchlist?: boolean;
  onlyAvailable?: boolean;
}

class RecommendationService {
  // Base storage key prefixes - userId is appended at runtime for user isolation
  private readonly STORAGE_KEY_PREFIXES = {
    USER_PREFERENCES: '@geoleap_user_preferences',
    RECOMMENDATION_CACHE: '@geoleap_recommendation_cache',
    RECOMMENDATION_HISTORY: '@geoleap_recommendation_history',
    USER_IMPLICIT_FEEDBACK: '@geoleap_implicit_feedback',
  };

  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  // Current user ID for scoping storage - MUST be set before using user-specific methods
  private currentUserId: string | null = null;

  /**
   * Set the current user ID. Call this on login.
   * All storage operations will be scoped to this user.
   */
  setCurrentUser(userId: string): void {
    this.currentUserId = userId;
  }

  /**
   * Clear all user-specific data. Call this on logout to prevent data leakage.
   * BUG-007 FIX: Ensures stale cache is cleared when user changes.
   */
  async clearUserData(userId?: string): Promise<void> {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      return;
    }

    try {
      const keys = [
        this.getUserPreferencesKey(targetUserId),
        this.getRecommendationCacheKey(targetUserId),
        this.getImplicitFeedbackKey(targetUserId),
      ];
      await AsyncStorage.multiRemove(keys);
      logger.debug('[RecommendationService] Cleared user data', { userId: targetUserId });
    } catch (error) {
      logger.warn('[RecommendationService] Failed to clear user data', error);
    }

    if (userId === this.currentUserId || !userId) {
      this.currentUserId = null;
    }
  }

  /**
   * Get user-scoped storage key for preferences.
   * BUG-008 FIX: Ensures preferences are isolated per user.
   */
  private getUserPreferencesKey(userId: string): string {
    return `${this.STORAGE_KEY_PREFIXES.USER_PREFERENCES}_${userId}`;
  }

  /**
   * Get user-scoped storage key for recommendation cache.
   * BUG-006 FIX: Ensures recommendations are isolated per user.
   */
  private getRecommendationCacheKey(userId: string): string {
    return `${this.STORAGE_KEY_PREFIXES.RECOMMENDATION_CACHE}_${userId}`;
  }

  /**
   * Get user-scoped storage key for implicit feedback.
   * BUG-009 FIX: Ensures feedback history is isolated per user.
   */
  private getImplicitFeedbackKey(userId: string): string {
    return `${this.STORAGE_KEY_PREFIXES.USER_IMPLICIT_FEEDBACK}_${userId}`;
  }

  async getRecommendations(
    userId: string,
    count: number = 20,
    filters?: RecommendationFilter,
    context?: RecommendationContext,
  ): Promise<Recommendation[]> {
    // Set current user for storage scoping
    this.setCurrentUser(userId);

    try {
      // Build query parameters
      const params = new URLSearchParams({
        userId,
        count: count.toString(),
        filters: JSON.stringify(filters || {}),
        context: JSON.stringify(context || {}),
      });

      const response = await ApiService.get<Recommendation[]>(
        `/recommendations?${params.toString()}`,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch recommendations');
      }

      const recommendations = response.data;
      // BUG-006 FIX: Pass userId for user-scoped caching
      await this.cacheRecommendations(recommendations, userId);
      return recommendations;
    } catch (error) {
      logger.warn('[RecommendationService] Failed to fetch recommendations from server, using cache', error);
      // BUG-006 FIX: Pass userId for user-scoped cache lookup
      return this.getCachedRecommendations(count, filters, context, userId);
    }
  }

  async getPersonalizedRecommendations(userId: string): Promise<Recommendation[]> {
    const context = this.getCurrentContext();
    return this.getRecommendations(userId, 10, undefined, context);
  }

  async getTrendingRecommendations(genre?: string): Promise<Recommendation[]> {
    try {
      const url = genre
        ? `/recommendations/trending?genre=${encodeURIComponent(genre)}`
        : '/recommendations/trending';

      const response = await ApiService.get<Recommendation[]>(url);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch trending recommendations');
      }

      return response.data;
    } catch (error) {
      logger.warn('[RecommendationService] Failed to fetch trending recommendations', error);
      return [];
    }
  }

  async getFriendRecommendations(userId: string): Promise<Recommendation[]> {
    try {
      const response = await ApiService.get<Recommendation[]>(
        `/recommendations/friends/${userId}`,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch friend recommendations');
      }

      return response.data;
    } catch (error) {
      logger.warn('[RecommendationService] Failed to fetch friend recommendations', error);
      return [];
    }
  }

  async getSimilarContent(contentId: string): Promise<Recommendation[]> {
    try {
      const response = await ApiService.get<Recommendation[]>(
        `/recommendations/similar/${contentId}`,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch similar content');
      }

      return response.data;
    } catch (error) {
      logger.warn('[RecommendationService] Failed to fetch similar content', error);
      return [];
    }
  }

  async getBecauseYouWatched(contentId: string): Promise<Recommendation[]> {
    try {
      const response = await ApiService.get<Recommendation[]>(
        `/recommendations/because-you-watched/${contentId}`,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch "because you watched" recommendations');
      }

      return response.data;
    } catch (error) {
      logger.warn('[RecommendationService] Failed to fetch "because you watched" recommendations', error);
      return [];
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    // Set current user for storage scoping
    this.setCurrentUser(userId);

    try {
      const response = await ApiService.put(
        `/users/${userId}/preferences`,
        preferences,
      );

      if (!response.success) {
        logger.warn('[RecommendationService] Failed to update preferences on server', { error: response.error?.message });
      }
    } catch (error) {
      logger.warn('[RecommendationService] Failed to update preferences on server', error);
    }
    // BUG-008 FIX: Pass userId for user-scoped preferences storage
    await this.cacheUserPreferences(preferences, userId);
  }

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const response = await ApiService.get<UserPreferences>(
        `/users/${userId}/preferences`,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch user preferences');
      }

      return response.data;
    } catch (error) {
      logger.warn('[RecommendationService] Failed to fetch user preferences, using cache', error);
      return this.getCachedUserPreferences();
    }
  }

  async recordFeedback(
    userId: string,
    recommendationId: string,
    feedback: {
      action: 'viewed' | 'added_to_watchlist' | 'ignored' | 'dismissed' | 'rated';
      rating?: number;
      timestamp?: string;
    },
  ): Promise<void> {
    // Set current user for storage scoping
    this.setCurrentUser(userId);

    const feedbackData = {
      ...feedback,
      timestamp: feedback.timestamp || new Date().toISOString(),
    };

    try {
      const response = await ApiService.post('/api/recommendations/feedback', {
        userId,
        recommendationId,
        ...feedbackData,
      });

      if (!response.success) {
        logger.warn('[RecommendationService] Failed to record feedback', { error: response.error?.message });
      }
    } catch (error) {
      logger.warn('[RecommendationService] Failed to record feedback', error);
    }

    // BUG-009 FIX: Pass userId for user-scoped feedback storage
    await this.recordImplicitFeedback(recommendationId, feedbackData, userId);
  }

  async ignoreRecommendation(userId: string, recommendationId: string): Promise<void> {
    await this.recordFeedback(userId, recommendationId, {
      action: 'ignored',
    });
  }

  async refreshRecommendations(userId: string): Promise<Recommendation[]> {
    try {
      const response = await ApiService.post(`/recommendations/refresh/${userId}`, {});

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to refresh recommendations');
      }

      return this.getRecommendations(userId);
    } catch (err) {
      logger.warn('[RecommendationService] Failed to refresh recommendations', err);
      throw err;
    }
  }

  async getRecommendationInsights(userId: string): Promise<{
    accuracyRate: number;
    clickThroughRate: number;
    addToWatchlistRate: number;
    topGenres: string[];
    topSources: string[];
    improvementSuggestions: string[];
  }> {
    // Set current user for storage scoping
    this.setCurrentUser(userId);

    try {
      const response = await ApiService.get<{
        accuracyRate: number;
        clickThroughRate: number;
        addToWatchlistRate: number;
        topGenres: string[];
        topSources: string[];
        improvementSuggestions: string[];
      }>(`/recommendations/insights/${userId}`);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch recommendation insights');
      }

      return response.data;
    } catch (error) {
      logger.warn('[RecommendationService] Failed to fetch recommendation insights', error);
      // BUG-009 FIX: Pass userId for user-scoped insights lookup
      return this.getInsightsFromCache(userId);
    }
  }

  async analyzeUserBehavior(userId: string): Promise<UserPreferences> {
    // Set current user for storage scoping
    this.setCurrentUser(userId);

    const watchlists = await watchlistService.getAllWatchlists();
    const watchedItems = watchlists.flatMap(w => w.items)
      .filter(item => item.status === 'watched');

    const preferences: UserPreferences = {
      genres: {},
      types: {},
      ratings: {},
      decades: {},
      runtime: {
        min: 0,
        max: 300,
        preferred: 120,
      },
      streamingServices: {},
      actors: {},
      directors: {},
      keywords: {},
    };

    // Analyze genres
    watchedItems.forEach(item => {
      item.genres.forEach(genre => {
        preferences.genres[genre] = (preferences.genres[genre] || 0) + 1;
      });

      // Analyze types
      preferences.types[item.type] = (preferences.types[item.type] || 0) + 1;

      // Analyze ratings
      if (item.rating) {
        const ratingRange = this.getRatingRange(item.rating);
        preferences.ratings[ratingRange] = (preferences.ratings[ratingRange] || 0) + 1;
      }

      // Analyze decades
      const decade = this.getDecade(item.year);
      preferences.decades[decade] = (preferences.decades[decade] || 0) + 1;

      // Analyze streaming services
      item.availableOn.forEach(service => {
        preferences.streamingServices[service] = (preferences.streamingServices[service] || 0) + 1;
      });
    });

    // Normalize weights
    Object.keys(preferences.genres).forEach(genre => {
      preferences.genres[genre] = preferences.genres[genre] / watchedItems.length;
    });

    Object.keys(preferences.types).forEach(type => {
      preferences.types[type] = preferences.types[type] / watchedItems.length;
    });

    Object.keys(preferences.ratings).forEach(range => {
      preferences.ratings[range] = preferences.ratings[range] / watchedItems.length;
    });

    Object.keys(preferences.decades).forEach(decade => {
      preferences.decades[decade] = preferences.decades[decade] / watchedItems.length;
    });

    Object.keys(preferences.streamingServices).forEach(service => {
      preferences.streamingServices[service] = preferences.streamingServices[service] / watchedItems.length;
    });

    await this.updateUserPreferences(userId, preferences);
    return preferences;
  }

  public getCurrentContext(): RecommendationContext {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    return {
      timeOfDay: this.getTimeOfDay(hour),
      dayOfWeek: this.getDayOfWeek(dayOfWeek),
      season: this.getSeason(now.getMonth()),
    };
  }

  private getTimeOfDay(hour: number): RecommendationContext['timeOfDay'] {
    if (hour >= 6 && hour < 12) {return 'morning';}
    if (hour >= 12 && hour < 17) {return 'afternoon';}
    if (hour >= 17 && hour < 21) {return 'evening';}
    return 'night';
  }

  private getDayOfWeek(day: number): RecommendationContext['dayOfWeek'] {
    return day >= 1 && day <= 5 ? 'weekday' : 'weekend';
  }

  private getSeason(month: number): RecommendationContext['season'] {
    if (month >= 3 && month <= 5) {return 'spring';}
    if (month >= 6 && month <= 8) {return 'summer';}
    if (month >= 9 && month <= 11) {return 'fall';}
    return 'winter';
  }

  private getRatingRange(rating: number): string {
    if (rating >= 4.5) {return 'excellent';}
    if (rating >= 4.0) {return 'very_good';}
    if (rating >= 3.5) {return 'good';}
    if (rating >= 3.0) {return 'average';}
    return 'below_average';
  }

  private getDecade(year: number): string {
    const decadeStart = Math.floor(year / 10) * 10;
    return `${decadeStart}s`;
  }

  private async getCachedRecommendations(
    count: number,
    filters?: RecommendationFilter,
    context?: RecommendationContext,
    userId?: string,
  ): Promise<Recommendation[]> {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      logger.warn('[RecommendationService] No user ID for cache lookup');
      return [];
    }

    try {
      // BUG-006 FIX: Use user-scoped cache key
      const cached = await AsyncStorage.getItem(this.getRecommendationCacheKey(targetUserId));
      if (!cached) {return [];}

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > this.CACHE_DURATION) {
        return [];
      }

      let recommendations = data;

      // Apply filters
      if (filters) {
        recommendations = this.applyFilters(recommendations, filters);
      }

      // Apply context
      if (context) {
        recommendations = this.applyContext(recommendations, context);
      }

      return recommendations.slice(0, count);
    } catch (error) {
      logger.warn('[RecommendationService] Failed to get cached recommendations', error);
      return [];
    }
  }

  private async cacheRecommendations(recommendations: Recommendation[], userId?: string): Promise<void> {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      logger.warn('[RecommendationService] No user ID for caching recommendations');
      return;
    }

    try {
      // BUG-006 FIX: Use user-scoped cache key
      await AsyncStorage.setItem(
        this.getRecommendationCacheKey(targetUserId),
        JSON.stringify({
          data: recommendations,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      logger.warn('[RecommendationService] Failed to cache recommendations', error);
    }
  }

  private async cacheUserPreferences(preferences: Partial<UserPreferences>, userId?: string): Promise<void> {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      logger.warn('[RecommendationService] No user ID for caching preferences');
      return;
    }

    try {
      const existing = await this.getCachedUserPreferences(targetUserId);
      const updated = { ...existing, ...preferences };
      // BUG-008 FIX: Use user-scoped preferences key
      await AsyncStorage.setItem(
        this.getUserPreferencesKey(targetUserId),
        JSON.stringify(updated),
      );
    } catch (error) {
      logger.warn('[RecommendationService] Failed to cache user preferences', error);
    }
  }

  private async getCachedUserPreferences(userId?: string): Promise<UserPreferences> {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      logger.warn('[RecommendationService] No user ID for getting cached preferences');
      return this.getDefaultPreferences();
    }

    try {
      // BUG-008 FIX: Use user-scoped preferences key
      const cached = await AsyncStorage.getItem(this.getUserPreferencesKey(targetUserId));
      return cached ? JSON.parse(cached) : this.getDefaultPreferences();
    } catch (error) {
      logger.warn('[RecommendationService] Failed to get cached user preferences', error);
      return this.getDefaultPreferences();
    }
  }

  private async recordImplicitFeedback(
    recommendationId: string,
    feedback: any,
    userId?: string,
  ): Promise<void> {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      logger.warn('[RecommendationService] No user ID for recording feedback');
      return;
    }

    try {
      // BUG-009 FIX: Use user-scoped feedback key
      const existing = await AsyncStorage.getItem(this.getImplicitFeedbackKey(targetUserId));
      const feedbackHistory = existing ? JSON.parse(existing) : [];

      feedbackHistory.push({
        recommendationId,
        ...feedback,
      });

      // Keep only last 1000 feedback entries
      if (feedbackHistory.length > 1000) {
        feedbackHistory.splice(0, feedbackHistory.length - 1000);
      }

      await AsyncStorage.setItem(
        this.getImplicitFeedbackKey(targetUserId),
        JSON.stringify(feedbackHistory),
      );
    } catch (error) {
      logger.warn('[RecommendationService] Failed to record implicit feedback', error);
    }
  }

  private applyFilters(
    recommendations: Recommendation[],
    filters: RecommendationFilter,
  ): Recommendation[] {
    return recommendations.filter(rec => {
      if (filters.genres && !filters.genres.some(g => rec.genres.includes(g))) {
        return false;
      }

      if (filters.types && !filters.types.includes(rec.type)) {
        return false;
      }

      if (filters.minRating && rec.rating < filters.minRating) {
        return false;
      }

      if (filters.maxRating && rec.rating > filters.maxRating) {
        return false;
      }

      if (filters.yearRange) {
        const [min, max] = filters.yearRange;
        if (rec.year < min || rec.year > max) {
          return false;
        }
      }

      if (filters.runtimeRange && rec.runtime) {
        const [min, max] = filters.runtimeRange;
        if (rec.runtime < min || rec.runtime > max) {
          return false;
        }
      }

      if (filters.streamingServices) {
        const hasService = filters.streamingServices.some(service =>
          rec.availableOn.includes(service),
        );
        if (!hasService) {
          return false;
        }
      }

      return true;
    });
  }

  private applyContext(
    recommendations: Recommendation[],
    context: RecommendationContext,
  ): Recommendation[] {
    return recommendations.map(rec => {
      let score = rec.matchScore;

      // Adjust score based on time of day
      if (context.timeOfDay === 'night' && rec.genres.includes('Horror')) {
        score += 0.1;
      }

      if (context.timeOfDay === 'morning' && rec.genres.includes('Comedy')) {
        score += 0.05;
      }

      // Adjust score based on day of week
      if (context.dayOfWeek === 'weekend' && rec.runtime && rec.runtime > 120) {
        score += 0.05;
      }

      return {
        ...rec,
        matchScore: Math.min(score, 1.0),
      };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }

  private async getInsightsFromCache(userId?: string) {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      logger.warn('[RecommendationService] No user ID for getting insights');
      return {
        accuracyRate: 0,
        clickThroughRate: 0,
        addToWatchlistRate: 0,
        topGenres: [],
        topSources: [],
        improvementSuggestions: [],
      };
    }

    try {
      // BUG-009 FIX: Use user-scoped feedback key
      const cached = await AsyncStorage.getItem(this.getImplicitFeedbackKey(targetUserId));
      const feedback = cached ? JSON.parse(cached) : [];

      const total = feedback.length;
      const viewed = feedback.filter((f: any) => f.action === 'viewed').length;
      const added = feedback.filter((f: any) => f.action === 'added_to_watchlist').length;

      return {
        accuracyRate: total > 0 ? viewed / total : 0,
        clickThroughRate: total > 0 ? viewed / total : 0,
        addToWatchlistRate: total > 0 ? added / total : 0,
        topGenres: [],
        topSources: [],
        improvementSuggestions: [
          'Rate more content to improve recommendations',
          'Add more items to your watchlist',
          'Provide feedback on recommendations',
        ],
      };
    } catch (error) {
      logger.warn('[RecommendationService] Failed to get insights from cache', error);
      return {
        accuracyRate: 0,
        clickThroughRate: 0,
        addToWatchlistRate: 0,
        topGenres: [],
        topSources: [],
        improvementSuggestions: [],
      };
    }
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      genres: {},
      types: {},
      ratings: {},
      decades: {},
      runtime: {
        min: 0,
        max: 300,
        preferred: 120,
      },
      streamingServices: {},
      actors: {},
      directors: {},
      keywords: {},
    };
  }
}

export const recommendationService = new RecommendationService();
