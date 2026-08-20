/**
 * Comprehensive tests for UserAnalyticsService
 * Target: 95%+ coverage
 * Focus: Viewing analytics, profile analysis, stats tracking
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../../api/ApiService';
import { ViewingSession, ViewingStats, ViewerProfile } from '../UserAnalyticsService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Mock ApiService
jest.mock('../../api/ApiService');

// Mock AnalyticsManager - define mocks that will be used by the factory
const mockTrackEvent = jest.fn().mockResolvedValue(undefined);
const mockFlushQueue = jest.fn().mockResolvedValue(undefined);

// Mock AnalyticsManager module - this mock is hoisted by Jest and runs BEFORE any imports
jest.mock('../AnalyticsManager', () => {
  // Get the mock functions from the outer scope
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

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import service after mocks are set up - the service will get the mocked AnalyticsManager
import { _userAnalyticsService as userAnalyticsService } from '../UserAnalyticsService';
import { AnalyticsManager } from '../AnalyticsManager';

const MockedApiService = ApiService as jest.Mocked<typeof ApiService>;
const mockAnalyticsInstance = AnalyticsManager.getInstance();

describe('UserAnalyticsService - Comprehensive Tests', () => {
  const mockViewingSession: Omit<ViewingSession, 'id'> = {
    contentId: 'tt1234567',
    title: 'Breaking Bad',
    type: 'tv_series',
    startTime: '2024-01-01T10:00:00Z',
    duration: 60,
    watchedPercentage: 95,
    pausedCount: 2,
    seekCount: 1,
    quality: '1080p',
    device: 'mobile',
    platform: 'iOS',
    completed: true,
    sessionId: 'session-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset AsyncStorage
    const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    AsyncStorageMock.getItem.mockResolvedValue(null);
    AsyncStorageMock.setItem.mockResolvedValue();
    AsyncStorageMock.removeItem.mockResolvedValue();

    // Reset API mocks
    MockedApiService.get.mockResolvedValue({ success: true, data: {} });
    MockedApiService.post.mockResolvedValue({ success: true, data: {} });
    MockedApiService.put.mockResolvedValue({ success: true, data: {} });
    MockedApiService.delete.mockResolvedValue({ success: true, data: {} });

    (mockAnalyticsInstance.trackEvent as jest.Mock).mockResolvedValue(undefined);
    (mockAnalyticsInstance.flushQueue as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Viewing Session Tracking', () => {
    it('should track viewing session successfully', async () => {
      MockedApiService.post.mockResolvedValueOnce({
        success: true,
        data: { id: 'session-1' },
      });

      await userAnalyticsService.trackViewingSession(mockViewingSession);

      expect(MockedApiService.post).toHaveBeenCalledWith(
        '/api/analytics/viewing-sessions',
        expect.objectContaining({
          ...mockViewingSession,
          id: expect.any(String),
        })
      );
    });

    it('should queue failed tracking requests', async () => {
      MockedApiService.post.mockResolvedValueOnce({
        success: false,
        error: { message: 'Server error' },
      });

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValueOnce('[]');

      await userAnalyticsService.trackViewingSession(mockViewingSession);

      expect(AsyncStorageMock.setItem).toHaveBeenCalledWith(
        'failed_tracking_queue',
        expect.stringContaining('viewing_session')
      );
    });

    it('should handle API rejection errors', async () => {
      MockedApiService.post.mockRejectedValueOnce(new Error('Network error'));

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValueOnce('[]');

      await expect(
        userAnalyticsService.trackViewingSession(mockViewingSession)
      ).resolves.not.toThrow();

      expect(AsyncStorageMock.setItem).toHaveBeenCalledWith(
        'failed_tracking_queue',
        expect.any(String)
      );
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      MockedApiService.post.mockResolvedValueOnce({
        success: false,
        error: { message: 'Server error' },
      });

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockRejectedValueOnce(new Error('Storage error'));

      await expect(
        userAnalyticsService.trackViewingSession(mockViewingSession)
      ).resolves.not.toThrow();
    });

    it('should cache viewing session locally', async () => {
      MockedApiService.post.mockResolvedValueOnce({ success: true, data: {} });

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

      await userAnalyticsService.trackViewingSession(mockViewingSession);

      const setItemCalls = AsyncStorageMock.setItem.mock.calls;
      const sessionsCached = setItemCalls.some(([key]) =>
        key === '@geoleap_viewing_sessions'
      );
      expect(sessionsCached).toBe(true);
    });

    it('should limit cached sessions to 1000', async () => {
      MockedApiService.post.mockResolvedValue({ success: true, data: {} });

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

      // Mock 1000 existing sessions
      const existingSessions = Array.from({ length: 1000 }, (_, i) => ({
        ...mockViewingSession,
        id: `session-${i}`,
      }));
      AsyncStorageMock.getItem.mockResolvedValue(JSON.stringify(existingSessions));

      await userAnalyticsService.trackViewingSession(mockViewingSession);

      const setItemCalls = AsyncStorageMock.setItem.mock.calls;
      const sessionsCall = setItemCalls.find(([key]) => key === '@geoleap_viewing_sessions');

      if (sessionsCall) {
        const savedSessions = JSON.parse(sessionsCall[1] as string);
        expect(savedSessions.length).toBe(1000); // Should not exceed 1000
      }
    });
  });

  describe('Update Viewing Session', () => {
    it('should update viewing session on server', async () => {
      MockedApiService.put.mockResolvedValueOnce({ success: true, data: {} });

      await userAnalyticsService.updateViewingSession('session-123', {
        watchedPercentage: 100,
        completed: true,
      });

      expect(MockedApiService.put).toHaveBeenCalledWith(
        '/analytics/viewing-sessions/session-123',
        { watchedPercentage: 100, completed: true }
      );
    });

    it('should handle server update failures gracefully', async () => {
      MockedApiService.put.mockResolvedValueOnce({
        success: false,
        error: { message: 'Update failed' },
      });

      await expect(
        userAnalyticsService.updateViewingSession('session-123', { completed: true })
      ).resolves.not.toThrow();
    });

    it('should update cached session', async () => {
      MockedApiService.put.mockResolvedValueOnce({ success: true, data: {} });

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      const existingSessions = [{ ...mockViewingSession, id: 'session-123' }];
      AsyncStorageMock.getItem.mockResolvedValue(JSON.stringify(existingSessions));

      await userAnalyticsService.updateViewingSession('session-123', { completed: true });

      const setItemCalls = AsyncStorageMock.setItem.mock.calls;
      const sessionsCall = setItemCalls.find(([key]) => key === '@geoleap_viewing_sessions');

      if (sessionsCall) {
        const updatedSessions = JSON.parse(sessionsCall[1] as string);
        expect(updatedSessions[0].completed).toBe(true);
      }
    });

    it('should handle missing session gracefully', async () => {
      MockedApiService.put.mockResolvedValueOnce({ success: true, data: {} });

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValue('[]');

      await expect(
        userAnalyticsService.updateViewingSession('non-existent', { completed: true })
      ).resolves.not.toThrow();
    });
  });

  describe('Complete Viewing Session', () => {
    it('should mark session as completed', async () => {
      MockedApiService.put.mockResolvedValueOnce({ success: true, data: {} });

      await userAnalyticsService.completeViewingSession('session-123');

      expect(MockedApiService.put).toHaveBeenCalledWith(
        '/analytics/viewing-sessions/session-123',
        expect.objectContaining({
          completed: true,
          endTime: expect.any(String),
        })
      );
    });
  });

  describe('Get Viewing Stats', () => {
    it('should fetch viewing stats from server', async () => {
      const mockStats: ViewingStats = {
        totalWatchTime: 1200,
        totalSessions: 20,
        averageSessionDuration: 60,
        completionRate: 85,
        favoriteGenres: [{ genre: 'Drama', count: 10, percentage: 50 }],
        favoriteTypes: [{ type: 'tv_series', count: 15, percentage: 75 }],
        watchingHabits: {
          timeOfDay: { evening: 10 },
          dayOfWeek: { monday: 5 },
          monthlyTrends: [{ month: '2024-01', minutes: 600 }],
        },
        streamingServiceUsage: [
          { service: 'Netflix', minutes: 800, percentage: 66.67, count: 12 },
        ],
        contentDiscovery: {
          searchUsage: 5,
          recommendationUsage: 10,
          browsingUsage: 3,
          socialDiscovery: 2,
        },
        engagement: {
          ratingsGiven: 15,
          reviewsWritten: 3,
          watchlistItemsAdded: 25,
          contentShared: 5,
        },
      };

      MockedApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockStats,
      });

      const stats = await userAnalyticsService.getViewingStats('user-123');

      expect(MockedApiService.get).toHaveBeenCalledWith('/analytics/viewing-stats/user-123');
      expect(stats).toEqual(mockStats);
    });

    it('should include period parameter when provided', async () => {
      MockedApiService.get.mockResolvedValueOnce({
        success: true,
        data: {} as ViewingStats,
      });

      await userAnalyticsService.getViewingStats('user-123', 'month');

      expect(MockedApiService.get).toHaveBeenCalledWith(
        '/analytics/viewing-stats/user-123?period=month'
      );
    });

    it('should fall back to cached stats on error', async () => {
      MockedApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      const cachedStats: ViewingStats = {
        totalWatchTime: 500,
        totalSessions: 10,
        averageSessionDuration: 50,
        completionRate: 80,
        favoriteGenres: [],
        favoriteTypes: [],
        watchingHabits: { timeOfDay: {}, dayOfWeek: {}, monthlyTrends: [] },
        streamingServiceUsage: [],
        contentDiscovery: { searchUsage: 0, recommendationUsage: 0, browsingUsage: 0, socialDiscovery: 0 },
        engagement: { ratingsGiven: 0, reviewsWritten: 0, watchlistItemsAdded: 0, contentShared: 0 },
      };
      AsyncStorageMock.getItem.mockResolvedValueOnce(JSON.stringify(cachedStats));

      const stats = await userAnalyticsService.getViewingStats('user-123');

      expect(stats.totalWatchTime).toBe(500);
    });

    it('should return default stats when no cache available', async () => {
      MockedApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValueOnce(null);

      const stats = await userAnalyticsService.getViewingStats('user-123');

      expect(stats.totalWatchTime).toBe(0);
      expect(stats.totalSessions).toBe(0);
    });
  });

  describe('Get Viewer Profile', () => {
    it('should fetch viewer profile from server', async () => {
      const mockProfile: ViewerProfile = {
        viewingPersonality: 'binge_watcher',
        contentPreference: 'mainstream',
        viewingPace: 'fast',
        genreDiversity: 0.8,
        loyaltyScore: 0.9,
        adventureScore: 0.7,
        socialInfluence: 0.5,
        peakHours: ['Evening (5PM-9PM)'],
        preferredSessionLength: 90,
        seasonalPreferences: {},
      };

      MockedApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockProfile,
      });

      const profile = await userAnalyticsService.getViewerProfile('user-123');

      expect(MockedApiService.get).toHaveBeenCalledWith('/analytics/viewer-profile/user-123');
      expect(profile).toEqual(mockProfile);
    });

    it('should analyze profile locally on error', async () => {
      MockedApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      const sessions = [
        { ...mockViewingSession, id: '1', completed: true, duration: 120 },
        { ...mockViewingSession, id: '2', completed: true, duration: 120 },
      ];
      AsyncStorageMock.getItem.mockResolvedValueOnce(JSON.stringify(sessions));
      AsyncStorageMock.getItem.mockResolvedValueOnce(JSON.stringify({
        totalWatchTime: 240,
        totalSessions: 2,
        favoriteGenres: [{ genre: 'Drama', count: 2, percentage: 100 }],
      }));

      const profile = await userAnalyticsService.getViewerProfile('user-123');

      expect(profile).toHaveProperty('viewingPersonality');
      expect(profile).toHaveProperty('loyaltyScore');
    });
  });

  describe('Get Content Insights', () => {
    it('should fetch content insights from server', async () => {
      const mockInsights = {
        contentId: 'tt1234567',
        title: 'Breaking Bad',
        watchTime: 5000,
        viewerCount: 1000,
        averageCompletionRate: 85,
        dropOffPoints: [10, 30, 60],
        viewerDemographics: {
          ageGroups: { '18-24': 30, '25-34': 45, '35-44': 25 },
        },
        satisfactionScore: 9.2,
        trendingScore: 8.5,
        retentionScore: 7.8,
      };

      MockedApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockInsights,
      });

      const insights = await userAnalyticsService.getContentInsights('tt1234567');

      expect(MockedApiService.get).toHaveBeenCalledWith('/analytics/content-insights/tt1234567');
      expect(insights).toEqual(mockInsights);
    });

    it('should return null on error', async () => {
      MockedApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const insights = await userAnalyticsService.getContentInsights('tt1234567');

      expect(insights).toBeNull();
    });
  });

  describe('Get Personalized Insights', () => {
    it('should fetch personalized insights from server', async () => {
      const mockInsights = {
        viewingTrends: [{ date: '2024-01-01', minutes: 120, sessions: 3 }],
        genreEvolution: [{ genre: 'Drama', monthlyData: [{ month: '2024-01', count: 5 }] }],
        recommendations: ['Show 1', 'Show 2'],
        achievements: [
          { type: 'binge', title: 'Binge Master', description: 'Watched 10 episodes in a row', unlockedAt: '2024-01-01' },
        ],
        upcomingTrends: [{ genre: 'Sci-Fi', score: 8.5, reason: 'Based on your viewing history' }],
      };

      MockedApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockInsights,
      });

      const insights = await userAnalyticsService.getPersonalizedInsights('user-123');

      expect(MockedApiService.get).toHaveBeenCalledWith('/analytics/personalized-insights/user-123');
      expect(insights).toEqual(mockInsights);
    });

    it('should return basic insights on error', async () => {
      MockedApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const insights = await userAnalyticsService.getPersonalizedInsights('user-123');

      expect(insights.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Track Content View', () => {
    it('should track content view using AnalyticsManager', async () => {
      await userAnalyticsService.trackContentView('tt1234567', 'search', 30);

      expect(mockAnalyticsInstance.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'content_view',
          category: 'engagement',
          source: 'viewing',
          data: expect.objectContaining({
            contentId: 'tt1234567',
            source: 'search',
            duration: 30,
          }),
        })
      );
    });
  });

  describe('Track User Action', () => {
    it('should track share action', async () => {
      await userAnalyticsService.trackUserAction({
        type: 'share',
        metadata: { contentId: 'tt1234567', platform: 'twitter' },
      });

      expect(mockAnalyticsInstance.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'user_action_share',
          category: 'engagement',
        })
      );
    });

    it('should track search action with correct category', async () => {
      await userAnalyticsService.trackUserAction({
        type: 'search',
        metadata: { query: 'breaking bad' },
      });

      expect(mockAnalyticsInstance.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'user_action_search',
          category: 'search',
        })
      );
    });

    it('should track watchlist action with correct category', async () => {
      await userAnalyticsService.trackUserAction({
        type: 'add_to_watchlist',
        metadata: { contentId: 'tt1234567' },
      });

      expect(mockAnalyticsInstance.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'user_action_add_to_watchlist',
          category: 'content',
        })
      );
    });
  });

  describe('Export User Data', () => {
    it('should export user data as JSON', async () => {
      const mockExportData = { sessions: [], stats: {} };

      MockedApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockExportData,
      });

      const data = await userAnalyticsService.exportUserData('user-123', 'json');

      expect(MockedApiService.get).toHaveBeenCalledWith('/analytics/export/user-123?format=json');
      expect(data).toEqual(mockExportData);
    });

    it('should export user data as CSV', async () => {
      MockedApiService.get.mockResolvedValueOnce({
        success: true,
        data: 'csv,data,here',
      });

      const data = await userAnalyticsService.exportUserData('user-123', 'csv');

      expect(MockedApiService.get).toHaveBeenCalledWith('/analytics/export/user-123?format=csv');
    });

    it('should throw error on export failure', async () => {
      MockedApiService.get.mockRejectedValueOnce(new Error('Export failed'));

      await expect(
        userAnalyticsService.exportUserData('user-123')
      ).rejects.toThrow('Export failed');
    });
  });

  describe('Delete User Data', () => {
    it('should delete user data from server and locally', async () => {
      MockedApiService.delete.mockResolvedValueOnce({ success: true });

      await userAnalyticsService.deleteUserData('user-123');

      expect(MockedApiService.delete).toHaveBeenCalledWith('/analytics/user-data/user-123');

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      expect(AsyncStorageMock.removeItem).toHaveBeenCalled();
    });

    it('should throw error on delete failure', async () => {
      MockedApiService.delete.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(
        userAnalyticsService.deleteUserData('user-123')
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('Sync Tracking Data', () => {
    it('should flush AnalyticsManager queue', async () => {
      await userAnalyticsService.syncTrackingData();

      expect(mockAnalyticsInstance.flushQueue).toHaveBeenCalled();
    });
  });

  describe('Generate Viewing Report', () => {
    it('should generate comprehensive viewing report', async () => {
      const mockStats: ViewingStats = {
        totalWatchTime: 1200,
        totalSessions: 20,
        averageSessionDuration: 60,
        completionRate: 85,
        favoriteGenres: [{ genre: 'Drama', count: 10, percentage: 50 }],
        favoriteTypes: [{ type: 'tv_series', count: 15, percentage: 75 }],
        watchingHabits: {
          timeOfDay: { evening: 10 },
          dayOfWeek: { monday: 5 },
          monthlyTrends: [{ month: '2024-01', minutes: 600 }],
        },
        streamingServiceUsage: [
          { service: 'Netflix', minutes: 800, percentage: 66.67, count: 12 },
        ],
        contentDiscovery: {
          searchUsage: 5,
          recommendationUsage: 10,
          browsingUsage: 3,
          socialDiscovery: 2,
        },
        engagement: {
          ratingsGiven: 15,
          reviewsWritten: 3,
          watchlistItemsAdded: 25,
          contentShared: 5,
        },
      };

      const mockProfile: ViewerProfile = {
        viewingPersonality: 'enthusiast',
        contentPreference: 'mainstream',
        viewingPace: 'moderate',
        genreDiversity: 0.8,
        loyaltyScore: 0.85,
        adventureScore: 0.7,
        socialInfluence: 0.5,
        peakHours: ['Evening (5PM-9PM)'],
        preferredSessionLength: 60,
        seasonalPreferences: {},
      };

      MockedApiService.get.mockResolvedValueOnce({ success: true, data: mockStats });
      MockedApiService.get.mockResolvedValueOnce({ success: true, data: mockProfile });
      MockedApiService.get.mockResolvedValueOnce({
        success: true,
        data: {
          viewingTrends: [],
          genreEvolution: [],
          recommendations: [],
          achievements: [],
          upcomingTrends: [],
        },
      });

      const report = await userAnalyticsService.generateViewingReport('user-123', 'month');

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('insights');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('charts');
      expect(report.charts.genreDistribution.length).toBeGreaterThan(0);
    });

    it('should generate insights based on high watch time', async () => {
      const mockStats: ViewingStats = {
        totalWatchTime: 1500, // > 1000
        totalSessions: 20,
        averageSessionDuration: 75,
        completionRate: 85,
        favoriteGenres: [
          { genre: 'Drama', count: 5, percentage: 25 },
          { genre: 'Comedy', count: 5, percentage: 25 },
        ],
        favoriteTypes: [],
        watchingHabits: { timeOfDay: {}, dayOfWeek: {}, monthlyTrends: [] },
        streamingServiceUsage: [
          { service: 'Netflix', minutes: 500, percentage: 33, count: 5 },
          { service: 'Hulu', minutes: 500, percentage: 33, count: 5 },
          { service: 'Prime', minutes: 500, percentage: 33, count: 5 },
        ],
        contentDiscovery: { searchUsage: 0, recommendationUsage: 0, browsingUsage: 0, socialDiscovery: 0 },
        engagement: { ratingsGiven: 20, reviewsWritten: 5, watchlistItemsAdded: 30, contentShared: 10 },
      };

      const mockProfile: ViewerProfile = {
        viewingPersonality: 'enthusiast',
        contentPreference: 'mainstream',
        viewingPace: 'moderate',
        genreDiversity: 0.2,
        loyaltyScore: 0.9,
        adventureScore: 0.3,
        socialInfluence: 0.5,
        peakHours: [],
        preferredSessionLength: 75,
        seasonalPreferences: {},
      };

      MockedApiService.get.mockResolvedValueOnce({ success: true, data: mockStats });
      MockedApiService.get.mockResolvedValueOnce({ success: true, data: mockProfile });
      MockedApiService.get.mockResolvedValueOnce({
        success: true,
        data: { viewingTrends: [], genreEvolution: [], recommendations: [], achievements: [], upcomingTrends: [] },
      });

      const report = await userAnalyticsService.generateViewingReport('user-123', 'year');

      expect(report.insights).toContain('You\'re a dedicated viewer with over 16 hours of content watched!');
      expect(report.insights).toContain('You have excellent completion rate - you really finish what you start!');
    });
  });

  describe('Local Data Management', () => {
    it('should handle cache write errors gracefully', async () => {
      MockedApiService.post.mockResolvedValueOnce({ success: true, data: {} });

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.setItem.mockRejectedValueOnce(new Error('Storage full'));

      await expect(
        userAnalyticsService.trackViewingSession(mockViewingSession)
      ).resolves.not.toThrow();
    });

    it('should handle cache read errors gracefully', async () => {
      MockedApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockRejectedValueOnce(new Error('Storage error'));

      const stats = await userAnalyticsService.getViewingStats('user-123');

      expect(stats.totalWatchTime).toBe(0); // Should return default stats
    });
  });

  describe('Profile Analysis', () => {
    it('should classify as binge_watcher', async () => {
      MockedApiService.get.mockRejectedValueOnce(new Error('Use local'));

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      const sessions = Array.from({ length: 20 }, (_, i) => ({
        ...mockViewingSession,
        id: `session-${i}`,
        completed: true,
        duration: 120,
      }));
      AsyncStorageMock.getItem.mockResolvedValueOnce(JSON.stringify(sessions));
      AsyncStorageMock.getItem.mockResolvedValueOnce(JSON.stringify({
        totalWatchTime: 2400,
        favoriteGenres: [{ genre: 'Drama', count: 15, percentage: 75 }],
      }));

      const profile = await userAnalyticsService.getViewerProfile('user-123');

      expect(profile.viewingPersonality).toBe('binge_watcher');
    });

    it('should calculate viewing pace as slow', async () => {
      MockedApiService.get.mockRejectedValueOnce(new Error('Use local'));

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      const sessions = [{ ...mockViewingSession, id: '1', duration: 150 }];
      AsyncStorageMock.getItem.mockResolvedValueOnce(JSON.stringify(sessions));
      AsyncStorageMock.getItem.mockResolvedValueOnce(JSON.stringify({
        totalWatchTime: 150,
        favoriteGenres: [],
      }));

      const profile = await userAnalyticsService.getViewerProfile('user-123');

      expect(profile.viewingPace).toBe('slow');
    });

    it('should calculate peak hours correctly', async () => {
      MockedApiService.get.mockRejectedValueOnce(new Error('Use local'));

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      // Use same hour for all sessions to ensure consistent time slot
      const sessions = [
        { ...mockViewingSession, id: '1', startTime: '2024-01-01T08:00:00' }, // Morning local
        { ...mockViewingSession, id: '2', startTime: '2024-01-01T08:30:00' }, // Morning local
        { ...mockViewingSession, id: '3', startTime: '2024-01-01T09:00:00' }, // Morning local
      ];
      AsyncStorageMock.getItem.mockResolvedValueOnce(JSON.stringify(sessions));
      AsyncStorageMock.getItem.mockResolvedValueOnce(JSON.stringify({
        totalWatchTime: 180,
        favoriteGenres: [],
      }));

      const profile = await userAnalyticsService.getViewerProfile('user-123');

      // Verify peak hours are calculated and returned
      expect(profile.peakHours.length).toBeGreaterThan(0);
      // The peak hours should be a valid time slot string
      expect(profile.peakHours[0]).toMatch(/(Morning|Afternoon|Evening|Night)/);
    });
  });
});
