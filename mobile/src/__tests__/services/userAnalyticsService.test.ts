/**
 * UserAnalyticsService Integration Tests
 *
 * Tests the user analytics service for tracking viewing behavior, generating insights,
 * and managing user viewing data.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../../services/api/ApiService';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../services/api/ApiService');

// Mock AnalyticsManager module - this mock is hoisted by Jest and runs BEFORE any imports
jest.mock('../../services/analytics/AnalyticsManager', () => {
  // Create mock functions inside the factory
  const trackEvent = jest.fn().mockResolvedValue(undefined);
  const flushQueue = jest.fn().mockResolvedValue(undefined);

  // Create a mock instance
  const mockInstance = {
    trackEvent,
    flushQueue,
    initialize: jest.fn().mockResolvedValue(undefined),
    setConsent: jest.fn().mockResolvedValue(undefined),
    getDeviceId: jest.fn().mockReturnValue('mock-device-id'),
    getSessionId: jest.fn().mockReturnValue('mock-session-id'),
    hasUserConsent: jest.fn().mockReturnValue(true),
    setUserId: jest.fn(),
    dispose: jest.fn(),
  };

  return {
    __esModule: true,
    AnalyticsManager: {
      getInstance: jest.fn(() => mockInstance),
    },
    default: {
      getInstance: jest.fn(() => mockInstance),
    },
  };
});

jest.mock('../../utils/logger');

// Import service and AnalyticsManager after mocks are set up
import { _userAnalyticsService as userAnalyticsService } from '../../services/analytics/UserAnalyticsService';
import { AnalyticsManager } from '../../services/analytics/AnalyticsManager';

// Get the mock instance for assertions
const mockAnalyticsInstance = AnalyticsManager.getInstance();

describe('UserAnalyticsService Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    (mockAnalyticsInstance.trackEvent as jest.Mock).mockResolvedValue(undefined);
    (mockAnalyticsInstance.flushQueue as jest.Mock).mockResolvedValue(undefined);

    // Mock AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('trackViewingSession', () => {
    it('should track viewing session successfully', async () => {
      (ApiService.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {},
      });

      const session = {
        contentId: 'movie-123',
        title: 'Test Movie',
        type: 'movie' as const,
        startTime: '2024-01-01T10:00:00Z',
        duration: 120,
        watchedPercentage: 95,
        pausedCount: 2,
        seekCount: 1,
        device: 'iPhone 14',
        platform: 'ios',
        completed: true,
        sessionId: 'session-123',
      };

      await userAnalyticsService.trackViewingSession(session);

      expect(ApiService.post).toHaveBeenCalledWith(
        '/api/analytics/viewing-sessions',
        expect.objectContaining({
          ...session,
          id: expect.any(String),
        })
      );

      // Should cache session
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@geoleap_viewing_sessions',
        expect.stringContaining('movie-123')
      );
    });

    it('should queue failed session for retry', async () => {
      (ApiService.post as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: { message: 'Network error' },
      });

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('[]');

      const session = {
        contentId: 'movie-123',
        title: 'Test Movie',
        type: 'movie' as const,
        startTime: '2024-01-01T10:00:00Z',
        duration: 120,
        watchedPercentage: 95,
        pausedCount: 2,
        seekCount: 1,
        device: 'iPhone 14',
        platform: 'ios',
        completed: true,
        sessionId: 'session-123',
      };

      await userAnalyticsService.trackViewingSession(session);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to track viewing session on server'),
        expect.any(Error)
      );

      // Should queue for retry
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'failed_tracking_queue',
        expect.stringContaining('viewing_session')
      );
    });

    it('should update local stats after tracking', async () => {
      (ApiService.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {},
      });

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('[]') // viewing sessions
        .mockResolvedValueOnce(JSON.stringify({ // viewing stats
          totalWatchTime: 100,
          totalSessions: 5,
          averageSessionDuration: 20,
          completionRate: 80,
          favoriteGenres: [],
          favoriteTypes: [],
          watchingHabits: { timeOfDay: {}, dayOfWeek: {}, monthlyTrends: [] },
          streamingServiceUsage: [],
          contentDiscovery: { searchUsage: 0, recommendationUsage: 0, browsingUsage: 0, socialDiscovery: 0 },
          engagement: { ratingsGiven: 0, reviewsWritten: 0, watchlistItemsAdded: 0, contentShared: 0 },
        }));

      const session = {
        contentId: 'movie-123',
        title: 'Test Movie',
        type: 'movie' as const,
        startTime: '2024-01-01T10:00:00Z',
        duration: 60,
        watchedPercentage: 100,
        pausedCount: 0,
        seekCount: 0,
        device: 'iPhone 14',
        platform: 'ios',
        completed: true,
        sessionId: 'session-123',
      };

      await userAnalyticsService.trackViewingSession(session);

      // Should update stats
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@geoleap_viewing_stats',
        expect.stringContaining('"totalWatchTime":160')
      );
    });

    it('should limit cached sessions to 1000', async () => {
      (ApiService.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {},
      });

      const existingSessions = Array.from({ length: 1000 }, (_, i) => ({
        id: `session-${i}`,
        contentId: `content-${i}`,
        duration: 60,
      }));

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(existingSessions)
      );

      const session = {
        contentId: 'movie-new',
        title: 'New Movie',
        type: 'movie' as const,
        startTime: '2024-01-01T10:00:00Z',
        duration: 60,
        watchedPercentage: 100,
        pausedCount: 0,
        seekCount: 0,
        device: 'iPhone 14',
        platform: 'ios',
        completed: true,
        sessionId: 'session-new',
      };

      await userAnalyticsService.trackViewingSession(session);

      // Should have exactly 1000 sessions (removed oldest one)
      const savedSessions = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          call => call[0] === '@geoleap_viewing_sessions'
        )[1]
      );

      expect(savedSessions.length).toBe(1000);
      expect(savedSessions[savedSessions.length - 1].contentId).toBe('movie-new');
    });
  });

  describe('updateViewingSession', () => {
    it('should update viewing session successfully', async () => {
      (ApiService.put as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {},
      });

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([{ id: 'session-123', contentId: 'movie-123', duration: 60 }])
      );

      await userAnalyticsService.updateViewingSession('session-123', {
        duration: 120,
        watchedPercentage: 100,
      });

      expect(ApiService.put).toHaveBeenCalledWith(
        '/analytics/viewing-sessions/session-123',
        { duration: 120, watchedPercentage: 100 }
      );

      // Should update cached session
      const savedSessions = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedSessions[0].duration).toBe(120);
    });

    it('should handle update failure gracefully', async () => {
      (ApiService.put as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: { message: 'Not found' },
      });

      await userAnalyticsService.updateViewingSession('session-123', { duration: 120 });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update viewing session'),
        expect.objectContaining({ error: 'Not found' })
      );
    });
  });

  describe('completeViewingSession', () => {
    it('should mark session as completed', async () => {
      (ApiService.put as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {},
      });

      await userAnalyticsService.completeViewingSession('session-123');

      expect(ApiService.put).toHaveBeenCalledWith(
        '/analytics/viewing-sessions/session-123',
        expect.objectContaining({
          endTime: expect.any(String),
          completed: true,
        })
      );
    });
  });

  describe('getViewingStats', () => {
    it('should fetch viewing stats from API', async () => {
      const mockStats = {
        totalWatchTime: 500,
        totalSessions: 25,
        averageSessionDuration: 20,
        completionRate: 85,
        favoriteGenres: [{ genre: 'Action', count: 10, percentage: 40 }],
        favoriteTypes: [{ type: 'movie', count: 15, percentage: 60 }],
        watchingHabits: {
          timeOfDay: { morning: 5, evening: 20 },
          dayOfWeek: { monday: 3, friday: 7 },
          monthlyTrends: [{ month: 'Jan', minutes: 500 }],
        },
        streamingServiceUsage: [
          { service: 'Netflix', minutes: 300, percentage: 60, count: 15 },
        ],
        contentDiscovery: {
          searchUsage: 10,
          recommendationUsage: 15,
          browsingUsage: 5,
          socialDiscovery: 2,
        },
        engagement: {
          ratingsGiven: 20,
          reviewsWritten: 5,
          watchlistItemsAdded: 30,
          contentShared: 8,
        },
      };

      (ApiService.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockStats,
      });

      const stats = await userAnalyticsService.getViewingStats('user-123', 'month');

      expect(ApiService.get).toHaveBeenCalledWith(
        '/analytics/viewing-stats/user-123?period=month'
      );
      expect(stats).toEqual(mockStats);
    });

    it('should fall back to cached stats on API failure', async () => {
      (ApiService.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const cachedStats = {
        totalWatchTime: 100,
        totalSessions: 5,
        averageSessionDuration: 20,
        completionRate: 80,
        favoriteGenres: [],
        favoriteTypes: [],
        watchingHabits: { timeOfDay: {}, dayOfWeek: {}, monthlyTrends: [] },
        streamingServiceUsage: [],
        contentDiscovery: { searchUsage: 0, recommendationUsage: 0, browsingUsage: 0, socialDiscovery: 0 },
        engagement: { ratingsGiven: 0, reviewsWritten: 0, watchlistItemsAdded: 0, contentShared: 0 },
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(cachedStats)
      );

      const stats = await userAnalyticsService.getViewingStats('user-123');

      expect(logger.warn).toHaveBeenCalled();
      expect(stats).toEqual(cachedStats);
    });

    it('should return default stats if no cache', async () => {
      (ApiService.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const stats = await userAnalyticsService.getViewingStats('user-123');

      expect(stats.totalWatchTime).toBe(0);
      expect(stats.totalSessions).toBe(0);
    });
  });

  describe('getViewerProfile', () => {
    it('should fetch viewer profile from API', async () => {
      const mockProfile = {
        viewingPersonality: 'enthusiast' as const,
        contentPreference: 'mixed' as const,
        viewingPace: 'moderate' as const,
        genreDiversity: 0.7,
        loyaltyScore: 0.85,
        adventureScore: 0.6,
        socialInfluence: 0.4,
        peakHours: ['Evening (5PM-9PM)', 'Night (9PM-6AM)'],
        preferredSessionLength: 90,
        seasonalPreferences: { winter: ['Drama', 'Thriller'] },
      };

      (ApiService.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockProfile,
      });

      const profile = await userAnalyticsService.getViewerProfile('user-123');

      expect(ApiService.get).toHaveBeenCalledWith('/analytics/viewer-profile/user-123');
      expect(profile).toEqual(mockProfile);
    });

    it('should analyze profile locally on API failure', async () => {
      (ApiService.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const mockSessions = [
        { id: '1', contentId: 'movie-1', duration: 120, completed: true, startTime: '2024-01-01T20:00:00Z' },
        { id: '2', contentId: 'movie-2', duration: 90, completed: true, startTime: '2024-01-02T21:00:00Z' },
        { id: '3', contentId: 'movie-3', duration: 110, completed: false, startTime: '2024-01-03T19:00:00Z' },
      ];

      const mockStats = {
        totalWatchTime: 320,
        totalSessions: 3,
        averageSessionDuration: 106,
        completionRate: 67,
        favoriteGenres: [
          { genre: 'Action', count: 2, percentage: 67 },
          { genre: 'Drama', count: 1, percentage: 33 },
        ],
        favoriteTypes: [],
        watchingHabits: { timeOfDay: {}, dayOfWeek: {}, monthlyTrends: [] },
        streamingServiceUsage: [],
        contentDiscovery: { searchUsage: 0, recommendationUsage: 0, browsingUsage: 0, socialDiscovery: 0 },
        engagement: { ratingsGiven: 0, reviewsWritten: 0, watchlistItemsAdded: 0, contentShared: 0 },
      };

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockSessions))
        .mockResolvedValueOnce(JSON.stringify(mockStats));

      const profile = await userAnalyticsService.getViewerProfile('user-123');

      expect(logger.warn).toHaveBeenCalled();
      // With 2 genres, totalWatchTime < 500, it's classified as 'specialist' (genres <= 2)
      expect(profile.viewingPersonality).toBe('specialist');
      expect(profile.loyaltyScore).toBeCloseTo(0.667, 2); // 2/3 completed
      expect(profile.genreDiversity).toBeCloseTo(0.2, 1); // 2 genres / 10
      // Peak hours depend on timezone, just check they're populated
      expect(profile.peakHours.length).toBeGreaterThan(0);
    });

    it('should classify as binge_watcher for high watch time', async () => {
      (ApiService.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const mockSessions = Array.from({ length: 50 }, (_, i) => ({
        id: `session-${i}`,
        contentId: `movie-${i}`,
        duration: 120,
        completed: true,
        startTime: `2024-01-${(i % 30) + 1}T20:00:00Z`,
      }));

      const mockStats = {
        totalWatchTime: 6000, // Over 1000 minutes
        totalSessions: 50,
        averageSessionDuration: 120,
        completionRate: 100,
        favoriteGenres: [{ genre: 'Drama', count: 50, percentage: 100 }],
        favoriteTypes: [],
        watchingHabits: { timeOfDay: {}, dayOfWeek: {}, monthlyTrends: [] },
        streamingServiceUsage: [],
        contentDiscovery: { searchUsage: 0, recommendationUsage: 0, browsingUsage: 0, socialDiscovery: 0 },
        engagement: { ratingsGiven: 0, reviewsWritten: 0, watchlistItemsAdded: 0, contentShared: 0 },
      };

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockSessions))
        .mockResolvedValueOnce(JSON.stringify(mockStats));

      const profile = await userAnalyticsService.getViewerProfile('user-123');

      expect(profile.viewingPersonality).toBe('binge_watcher'); // Over 1000 minutes + 80% completion
      expect(profile.loyaltyScore).toBe(1.0);
    });
  });

  describe('getContentInsights', () => {
    it('should fetch content insights from API', async () => {
      const mockInsights = {
        contentId: 'movie-123',
        title: 'Popular Movie',
        watchTime: 5000,
        viewerCount: 100,
        averageCompletionRate: 85,
        dropOffPoints: [30, 60, 90],
        viewerDemographics: {
          ageGroups: { '18-24': 30, '25-34': 50, '35-44': 20 },
        },
        satisfactionScore: 4.5,
        trendingScore: 0.85,
        retentionScore: 0.90,
      };

      (ApiService.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockInsights,
      });

      const insights = await userAnalyticsService.getContentInsights('movie-123');

      expect(ApiService.get).toHaveBeenCalledWith('/analytics/content-insights/movie-123');
      expect(insights).toEqual(mockInsights);
    });

    it('should return null on API failure', async () => {
      (ApiService.get as jest.Mock).mockRejectedValueOnce(new Error('Not found'));

      const insights = await userAnalyticsService.getContentInsights('movie-123');

      expect(logger.warn).toHaveBeenCalled();
      expect(insights).toBeNull();
    });
  });

  describe('getPersonalizedInsights', () => {
    it('should fetch personalized insights from API', async () => {
      const mockInsights = {
        viewingTrends: [
          { date: '2024-01-01', minutes: 120, sessions: 3 },
          { date: '2024-01-02', minutes: 90, sessions: 2 },
        ],
        genreEvolution: [
          {
            genre: 'Action',
            monthlyData: [{ month: 'Jan', count: 10 }],
          },
        ],
        recommendations: ['Try "Inception" based on your viewing history'],
        achievements: [
          {
            type: 'streak',
            title: '7-Day Streak',
            description: 'Watched content for 7 days straight',
            unlockedAt: '2024-01-07T00:00:00Z',
          },
        ],
        upcomingTrends: [
          { genre: 'Sci-Fi', score: 0.85, reason: 'Based on your recent interests' },
        ],
      };

      (ApiService.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockInsights,
      });

      const insights = await userAnalyticsService.getPersonalizedInsights('user-123');

      expect(ApiService.get).toHaveBeenCalledWith('/analytics/personalized-insights/user-123');
      expect(insights).toEqual(mockInsights);
    });

    it('should return basic insights on API failure', async () => {
      (ApiService.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const insights = await userAnalyticsService.getPersonalizedInsights('user-123');

      expect(logger.warn).toHaveBeenCalled();
      expect(insights.recommendations).toHaveLength(3);
      expect(insights.viewingTrends).toEqual([]);
    });
  });

  describe('trackContentView', () => {
    it('should track content view via AnalyticsManager', async () => {
      await userAnalyticsService.trackContentView('movie-123', 'search', 30);

      expect(mockAnalyticsInstance.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          timestamp: expect.any(Number),
          eventType: 'content_view',
          category: 'engagement',
          source: 'viewing',
          data: expect.objectContaining({
            contentId: 'movie-123',
            source: 'search',
            duration: 30,
          }),
        })
      );
    });

    it('should track with zero duration', async () => {
      await userAnalyticsService.trackContentView('movie-123', 'recommendations');

      const trackCall = (mockAnalyticsInstance.trackEvent as jest.Mock).mock.calls[0][0];
      expect(trackCall.data.duration).toBe(0);
    });
  });

  describe('trackUserAction', () => {
    it('should track share action', async () => {
      await userAnalyticsService.trackUserAction({
        type: 'share',
        metadata: { contentId: 'movie-123', platform: 'twitter' },
      });

      expect(mockAnalyticsInstance.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'user_action_share',
          category: 'engagement',
          data: expect.objectContaining({
            type: 'share',
            metadata: { contentId: 'movie-123', platform: 'twitter' },
          }),
        })
      );
    });

    it('should categorize search action correctly', async () => {
      await userAnalyticsService.trackUserAction({
        type: 'search',
        metadata: { query: 'inception' },
      });

      const trackCall = (mockAnalyticsInstance.trackEvent as jest.Mock).mock.calls[0][0];
      expect(trackCall.eventType).toBe('user_action_search');
      expect(trackCall.category).toBe('search');
    });

    it('should categorize filter action correctly', async () => {
      await userAnalyticsService.trackUserAction({
        type: 'filter',
        metadata: { genre: 'action' },
      });

      const trackCall = (mockAnalyticsInstance.trackEvent as jest.Mock).mock.calls[0][0];
      expect(trackCall.category).toBe('search');
    });

    it('should categorize add_to_watchlist action correctly', async () => {
      await userAnalyticsService.trackUserAction({
        type: 'add_to_watchlist',
        metadata: { contentId: 'movie-123' },
      });

      const trackCall = (mockAnalyticsInstance.trackEvent as jest.Mock).mock.calls[0][0];
      expect(trackCall.category).toBe('content');
    });
  });

  describe('exportUserData', () => {
    it('should export user data as JSON', async () => {
      const mockExport = {
        userId: 'user-123',
        stats: { totalWatchTime: 500 },
        sessions: [{ id: 'session-1' }],
      };

      (ApiService.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockExport,
      });

      const data = await userAnalyticsService.exportUserData('user-123', 'json');

      expect(ApiService.get).toHaveBeenCalledWith('/analytics/export/user-123?format=json');
      expect(data).toEqual(mockExport);
    });

    it('should export user data as CSV', async () => {
      const mockCSV = 'date,watch_time\n2024-01-01,120\n';

      (ApiService.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockCSV,
      });

      const data = await userAnalyticsService.exportUserData('user-123', 'csv');

      expect(ApiService.get).toHaveBeenCalledWith('/analytics/export/user-123?format=csv');
      expect(data).toBe(mockCSV);
    });

    it('should throw error on export failure', async () => {
      (ApiService.get as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: { message: 'Export failed' },
      });

      await expect(
        userAnalyticsService.exportUserData('user-123')
      ).rejects.toThrow('Export failed');
    });
  });

  describe('deleteUserData', () => {
    it('should delete user data from server and local storage', async () => {
      (ApiService.delete as jest.Mock).mockResolvedValueOnce({
        success: true,
      });

      await userAnalyticsService.deleteUserData('user-123');

      expect(ApiService.delete).toHaveBeenCalledWith('/analytics/user-data/user-123');

      // Should clear all local storage keys
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@geoleap_viewing_sessions');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@geoleap_viewing_stats');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@geoleap_viewer_profile');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@geoleap_analytics_cache');
    });

    it('should throw error on delete failure', async () => {
      (ApiService.delete as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: { message: 'Delete failed' },
      });

      await expect(
        userAnalyticsService.deleteUserData('user-123')
      ).rejects.toThrow('Delete failed');
    });

    it('should clear local data even if some keys fail', async () => {
      (ApiService.delete as jest.Mock).mockResolvedValueOnce({
        success: true,
      });

      (AsyncStorage.removeItem as jest.Mock)
        .mockResolvedValueOnce(undefined) // First key succeeds
        .mockRejectedValueOnce(new Error('Storage error')) // Second key fails
        .mockResolvedValueOnce(undefined) // Third key succeeds
        .mockResolvedValueOnce(undefined); // Fourth key succeeds

      await userAnalyticsService.deleteUserData('user-123');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to clear'),
        expect.any(Error)
      );

      // Should attempt all 4 keys
      expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(4);
    });
  });

  describe('syncTrackingData', () => {
    it('should flush AnalyticsManager queue', async () => {
      await userAnalyticsService.syncTrackingData();

      expect(mockAnalyticsInstance.flushQueue).toHaveBeenCalled();
    });
  });

  describe('generateViewingReport', () => {
    it('should generate comprehensive viewing report', async () => {
      const mockStats = {
        totalWatchTime: 1200,
        totalSessions: 50,
        averageSessionDuration: 24,
        completionRate: 85,
        favoriteGenres: [
          { genre: 'Action', count: 20, percentage: 40 },
          { genre: 'Drama', count: 15, percentage: 30 },
        ],
        favoriteTypes: [{ type: 'movie', count: 35, percentage: 70 }],
        watchingHabits: {
          timeOfDay: { evening: 30, night: 20 },
          dayOfWeek: { friday: 10, saturday: 12 },
          monthlyTrends: [
            { month: 'Jan', minutes: 400 },
            { month: 'Feb', minutes: 800 },
          ],
        },
        streamingServiceUsage: [
          { service: 'Netflix', minutes: 400, percentage: 33, count: 20 },
          { service: 'Disney+', minutes: 300, percentage: 25, count: 15 },
          { service: 'Hulu', minutes: 300, percentage: 25, count: 10 },
          { service: 'Prime Video', minutes: 200, percentage: 17, count: 5 },
        ],
        contentDiscovery: {
          searchUsage: 15,
          recommendationUsage: 25,
          browsingUsage: 10,
          socialDiscovery: 5,
        },
        engagement: {
          ratingsGiven: 25,
          reviewsWritten: 10,
          watchlistItemsAdded: 40,
          contentShared: 15,
        },
      };

      const mockProfile = {
        viewingPersonality: 'enthusiast' as const,
        contentPreference: 'mixed' as const,
        viewingPace: 'moderate' as const,
        genreDiversity: 0.8,
        loyaltyScore: 0.85,
        adventureScore: 0.7,
        socialInfluence: 0.5,
        peakHours: ['Evening (5PM-9PM)'],
        preferredSessionLength: 90,
        seasonalPreferences: {},
      };

      const mockInsights = {
        viewingTrends: [],
        genreEvolution: [],
        recommendations: [],
        achievements: [],
        upcomingTrends: [],
      };

      (ApiService.get as jest.Mock)
        .mockResolvedValueOnce({ success: true, data: mockStats })
        .mockResolvedValueOnce({ success: true, data: mockProfile })
        .mockResolvedValueOnce({ success: true, data: mockInsights });

      const report = await userAnalyticsService.generateViewingReport('user-123', 'month');

      expect(report.summary).toEqual(mockStats);
      expect(report.insights).toContain('You\'re a dedicated viewer with over 16 hours of content watched!');
      expect(report.insights).toContain('You have excellent completion rate - you really finish what you start!');
      expect(report.insights).toContain('You\'re an adventurous viewer with diverse taste in content!');
      expect(report.insights).toContain('You make great use of multiple streaming services!');

      expect(report.recommendations).toBeDefined();

      expect(report.charts.genreDistribution).toHaveLength(2);
      expect(report.charts.viewingTrends).toHaveLength(2);
      expect(report.charts.serviceUsage).toHaveLength(4);
    });

    it('should generate recommendations based on profile', async () => {
      const mockStats = {
        totalWatchTime: 100,
        totalSessions: 10,
        averageSessionDuration: 10,
        completionRate: 40,
        favoriteGenres: [{ genre: 'Action', count: 10, percentage: 100 }],
        favoriteTypes: [],
        watchingHabits: { timeOfDay: {}, dayOfWeek: {}, monthlyTrends: [] },
        streamingServiceUsage: [],
        contentDiscovery: {
          searchUsage: 5,
          recommendationUsage: 0.2, // < 0.3 to trigger recommendation
          browsingUsage: 4,
          socialDiscovery: 0,
        },
        engagement: {
          ratingsGiven: 2,
          reviewsWritten: 0,
          watchlistItemsAdded: 5,
          contentShared: 1,
        },
      };

      const mockProfile = {
        viewingPersonality: 'specialist' as const,
        contentPreference: 'mixed' as const,
        viewingPace: 'fast' as const,
        genreDiversity: 0.1, // Low diversity
        loyaltyScore: 0.4, // Low completion
        adventureScore: 0.1,
        socialInfluence: 0.3,
        peakHours: [],
        preferredSessionLength: 30,
        seasonalPreferences: {},
      };

      (ApiService.get as jest.Mock)
        .mockResolvedValueOnce({ success: true, data: mockStats })
        .mockResolvedValueOnce({ success: true, data: mockProfile })
        .mockResolvedValueOnce({ success: true, data: { viewingTrends: [], genreEvolution: [], recommendations: [], achievements: [], upcomingTrends: [] } });

      const report = await userAnalyticsService.generateViewingReport('user-123', 'week');

      // Should suggest exploring new genres
      expect(report.recommendations).toContain('Try exploring new genres to discover hidden gems');
      // Should suggest shorter content
      expect(report.recommendations).toContain('Consider shorter content or better matching your preferences');
      // Should suggest rating more
      expect(report.recommendations).toContain('Rate more content to improve personalized recommendations');
      // Should suggest using recommendations
      expect(report.recommendations).toContain('Check out personalized recommendations for better matches');
    });
  });
});
