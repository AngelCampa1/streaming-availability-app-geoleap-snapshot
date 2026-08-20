import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../utils/logger';
import {
  recommendationService,
  Recommendation,
  UserPreferences,
  RecommendationFilter,
} from '../services/recommendations/RecommendationService';

interface UseRecommendationsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableCache?: boolean;
  contextAware?: boolean;
}

interface UseRecommendationsReturn {
  recommendations: Recommendation[];
  personalizedRecommendations: Recommendation[];
  trendingRecommendations: Recommendation[];
  friendRecommendations: Recommendation[];
  userPreferences: UserPreferences | null;
  loading: boolean;
  error: string | null;

  // Actions
  refreshRecommendations: () => Promise<void>;
  getRecommendations: (count?: number, filters?: RecommendationFilter) => Promise<Recommendation[]>;
  getTrending: (genre?: string) => Promise<Recommendation[]>;
  getFriendRecommendations: () => Promise<Recommendation[]>;
  getSimilarContent: (contentId: string) => Promise<Recommendation[]>;
  getBecauseYouWatched: (contentId: string) => Promise<Recommendation[]>;

  // Feedback
  recordFeedback: (
    recommendationId: string,
    feedback: {
      action: 'viewed' | 'added_to_watchlist' | 'ignored' | 'dismissed' | 'rated';
      rating?: number;
      timestamp?: string;
    }
  ) => Promise<void>;
  ignoreRecommendation: (recommendationId: string) => Promise<void>;

  // Preferences
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  analyzeUserBehavior: () => Promise<UserPreferences>;

  // Insights
  getInsights: () => Promise<{
    accuracyRate: number;
    clickThroughRate: number;
    addToWatchlistRate: number;
    topGenres: string[];
    topSources: string[];
    improvementSuggestions: string[];
  }>;
}

export const useRecommendations = (
  userId?: string,
  options: UseRecommendationsOptions = {},
): UseRecommendationsReturn => {
  const {
    autoRefresh = true,
    refreshInterval = 60000, // 1 minute
    enableCache: _enableCache = true,
    contextAware = true,
  } = options;

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [personalizedRecommendations, setPersonalizedRecommendations] = useState<Recommendation[]>([]);
  const [trendingRecommendations, setTrendingRecommendations] = useState<Recommendation[]>([]);
  const [friendRecommendations, setFriendRecommendations] = useState<Recommendation[]>([]);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stabilize userId reference to prevent infinite loops
  const currentUserId = useMemo(() => userId || 'current-user', [userId]);

  const refreshRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        personalized,
        trending,
        friends,
        preferences,
      ] = await Promise.all([
        recommendationService.getPersonalizedRecommendations(currentUserId),
        recommendationService.getTrendingRecommendations(),
        recommendationService.getFriendRecommendations(currentUserId),
        recommendationService.getUserPreferences(currentUserId),
      ]);

      setPersonalizedRecommendations(personalized);
      setTrendingRecommendations(trending);
      setFriendRecommendations(friends);
      setUserPreferences(preferences);
      setRecommendations(personalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
      logger.error('[useRecommendations] Failed to refresh recommendations', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const getRecommendations = useCallback(async (
    count: number = 20,
    filters?: RecommendationFilter,
  ): Promise<Recommendation[]> => {
    try {
      const context = contextAware ? recommendationService.getCurrentContext?.() : undefined;
      const recs = await recommendationService.getRecommendations(
        currentUserId,
        count,
        filters,
        context,
      );
      setRecommendations(recs);
      return recs;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get recommendations';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUserId, contextAware]);

  const getTrending = useCallback(async (genre?: string): Promise<Recommendation[]> => {
    try {
      const trending = await recommendationService.getTrendingRecommendations(genre);
      setTrendingRecommendations(trending);
      return trending;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get trending recommendations';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getFriendRecommendations = useCallback(async (): Promise<Recommendation[]> => {
    try {
      const friends = await recommendationService.getFriendRecommendations(currentUserId);
      setFriendRecommendations(friends);
      return friends;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get friend recommendations';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUserId]);

  const getSimilarContent = useCallback(async (contentId: string): Promise<Recommendation[]> => {
    try {
      return await recommendationService.getSimilarContent(contentId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get similar content';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getBecauseYouWatched = useCallback(async (contentId: string): Promise<Recommendation[]> => {
    try {
      return await recommendationService.getBecauseYouWatched(contentId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get "because you watched" recommendations';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const recordFeedback = useCallback(async (
    recommendationId: string,
    feedback: {
      action: 'viewed' | 'added_to_watchlist' | 'ignored' | 'dismissed' | 'rated';
      rating?: number;
      timestamp?: string;
    },
  ): Promise<void> => {
    try {
      await recommendationService.recordFeedback(currentUserId, recommendationId, feedback);

      // Update local state if needed
      if (feedback.action === 'ignored') {
        setRecommendations(prev => prev.filter(r => r.id !== recommendationId));
        setPersonalizedRecommendations(prev => prev.filter(r => r.id !== recommendationId));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record feedback';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUserId]);

  const ignoreRecommendation = useCallback(async (recommendationId: string): Promise<void> => {
    await recordFeedback(recommendationId, { action: 'ignored' });
  }, [recordFeedback]);

  const updatePreferences = useCallback(async (
    preferences: Partial<UserPreferences>,
  ): Promise<void> => {
    try {
      await recommendationService.updateUserPreferences(currentUserId, preferences);
      const updated = await recommendationService.getUserPreferences(currentUserId);
      setUserPreferences(updated);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUserId]);

  const analyzeUserBehavior = useCallback(async (): Promise<UserPreferences> => {
    try {
      const analyzed = await recommendationService.analyzeUserBehavior(currentUserId);
      setUserPreferences(analyzed);
      return analyzed;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze user behavior';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUserId]);

  const _getInsights = useCallback(async () => {
    try {
      return await recommendationService.getRecommendationInsights(currentUserId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get recommendation insights';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUserId]);

  // Initial load
  useEffect(() => {
    refreshRecommendations();
  }, [refreshRecommendations]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) {return;}

    const interval = setInterval(() => {
      refreshRecommendations();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshRecommendations]);

  return {
    recommendations,
    personalizedRecommendations,
    trendingRecommendations,
    friendRecommendations,
    userPreferences,
    loading,
    error,
    refreshRecommendations,
    getRecommendations,
    getTrending,
    getFriendRecommendations,
    getSimilarContent,
    getBecauseYouWatched,
    recordFeedback,
    ignoreRecommendation,
    updatePreferences,
    analyzeUserBehavior,
    getInsights: _getInsights,
  };
};

// Hook for personalized recommendations only
export const usePersonalizedRecommendations = (
  userId?: string,
  count: number = 10,
) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stabilize userId reference
  const currentUserId = useMemo(() => userId || 'current-user', [userId]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const recs = await recommendationService.getPersonalizedRecommendations(currentUserId);
      setRecommendations(recs.slice(0, count));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch personalized recommendations');
      logger.error('[useRecommendations] Failed to refresh personalized recommendations', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, count]); // ✅ Now stable with useMemo

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    recommendations,
    loading,
    error,
    refresh,
  };
};

// Hook for trending recommendations
export const useTrendingRecommendations = (genre?: string, limit: number = 10) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const recs = await recommendationService.getTrendingRecommendations(genre);
      setRecommendations(recs.slice(0, limit));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trending recommendations');
      logger.error('[useRecommendations] Failed to refresh trending recommendations', err);
    } finally {
      setLoading(false);
    }
  }, [genre, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    recommendations,
    loading,
    error,
    refresh,
  };
};

// Hook for recommendation insights
export const useRecommendationInsights = (userId?: string) => {
  const [insights, setInsights] = useState<{
    accuracyRate: number;
    clickThroughRate: number;
    addToWatchlistRate: number;
    topGenres: string[];
    topSources: string[];
    improvementSuggestions: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stabilize userId reference
  const currentUserId = useMemo(() => userId || 'current-user', [userId]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await recommendationService.getRecommendationInsights(currentUserId);
      setInsights(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendation insights');
      logger.error('[useRecommendations] Failed to refresh insights', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]); // ✅ Now stable with useMemo

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    insights,
    loading,
    error,
    refresh,
  };
};
