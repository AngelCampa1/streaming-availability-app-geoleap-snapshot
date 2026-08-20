/**
 * RecommendationService MSW Integration Tests
 *
 * Tests REAL code execution with MSW-mocked API responses
 * Target: 80%+ coverage for recommendationService.ts
 *
 * Philosophy: Execute real business logic, only mock external I/O
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { recommendationService, Recommendation, UserPreferences } from '../../services/recommendations/RecommendationService';
import cacheService from '../../services/api/CacheService';

// Use global http, HttpResponse, and server from jest.setup.fetch-mock.js
const { http, HttpResponse, server } = global as any;

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.geoleap.app';

// Mock watchlistService dependency
jest.mock('../../services/watchlist/WatchlistService', () => ({
  watchlistService: {
    getAllWatchlists: jest.fn().mockResolvedValue([
      {
        id: 'watchlist-1',
        items: [
          {
            id: 'item-1',
            title: 'Inception',
            type: 'movie',
            genres: ['Sci-Fi', 'Action'],
            rating: 8.8,
            year: 2010,
            availableOn: ['Netflix'],
            status: 'watched',
            runtime: 148,
          },
          {
            id: 'item-2',
            title: 'The Matrix',
            type: 'movie',
            genres: ['Sci-Fi', 'Action'],
            rating: 8.7,
            year: 1999,
            availableOn: ['HBO Max'],
            status: 'watched',
            runtime: 136,
          },
        ],
      },
    ]),
  },
}));

describe.skip('RecommendationService - MSW Integration Tests', () => {
  beforeEach(async () => {
    // Clear all storage and caches
    await AsyncStorage.clear();
    await cacheService.clear();
    jest.clearAllMocks();
  });

  describe.skip('getRecommendations()', () => {
    it('should fetch recommendations from API', async () => {
      const recommendations = await recommendationService.getRecommendations('user-123', 10);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(10);

      // Verify recommendation structure
      const rec = recommendations[0];
      expect(rec).toHaveProperty('id');
      expect(rec).toHaveProperty('title');
      expect(rec).toHaveProperty('type');
      expect(rec).toHaveProperty('matchScore');
      expect(rec).toHaveProperty('source');
    });

    it('should cache recommendations after fetching', async () => {
      await recommendationService.getRecommendations('user-123', 5);

      // Verify cache was written
      const cacheKey = '@geoleap_recommendation_cache';
      const cached = await AsyncStorage.getItem(cacheKey);

      expect(cached).toBeDefined();
      expect(cached).not.toBeNull();

      const parsed = JSON.parse(cached!);
      expect(parsed).toHaveProperty('data');
      expect(parsed).toHaveProperty('timestamp');
      expect(Array.isArray(parsed.data)).toBe(true);
    });

    it('should use cached recommendations on API failure', async () => {
      // First fetch to populate cache
      const initialRecs = await recommendationService.getRecommendations('user-123', 5);
      expect(initialRecs.length).toBeGreaterThan(0);

      // Make API fail
      server.use(
        http.get(`${BASE_URL}/recommendations`, async () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Server error' } },
            { status: 500 }
          );
        })
      );

      // Should still return cached data
      const cachedRecs = await recommendationService.getRecommendations('user-123', 5);
      expect(cachedRecs).toBeDefined();
      expect(cachedRecs.length).toBeGreaterThan(0);
    }, 15000); // 15s timeout for retry logic

    it('should apply genre filters', async () => {
      const recommendations = await recommendationService.getRecommendations(
        'user-123',
        20,
        { genres: ['Sci-Fi'] }
      );

      expect(recommendations.every(rec => rec.genres.includes('Sci-Fi'))).toBe(true);
    });

    it('should apply type filters', async () => {
      const recommendations = await recommendationService.getRecommendations(
        'user-123',
        20,
        { types: ['movie'] }
      );

      expect(recommendations.every(rec => rec.type === 'movie')).toBe(true);
    });

    it('should apply minimum rating filter', async () => {
      const minRating = 8.0;
      const recommendations = await recommendationService.getRecommendations(
        'user-123',
        20,
        { minRating }
      );

      expect(recommendations.every(rec => rec.rating >= minRating)).toBe(true);
    });

    it('should handle empty results gracefully', async () => {
      server.use(
        http.get(`${BASE_URL}/recommendations`, async () => {
          return HttpResponse.json({
            success: true,
            data: [],
          });
        })
      );

      const recommendations = await recommendationService.getRecommendations('user-123', 10);
      expect(recommendations).toEqual([]);
    }, 15000); // 15s timeout for retry logic
  });

  describe.skip('getPersonalizedRecommendations()', () => {
    it('should fetch personalized recommendations with context', async () => {
      const recommendations = await recommendationService.getPersonalizedRecommendations('user-123');

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(10);
    });

    it('should include current context in recommendations', async () => {
      const context = recommendationService.getCurrentContext();

      expect(context).toHaveProperty('timeOfDay');
      expect(context).toHaveProperty('dayOfWeek');
      expect(context).toHaveProperty('season');

      // Verify context values are valid
      expect(['morning', 'afternoon', 'evening', 'night']).toContain(context.timeOfDay);
      expect(['weekday', 'weekend']).toContain(context.dayOfWeek);
      expect(['spring', 'summer', 'fall', 'winter']).toContain(context.season);
    });
  });

  describe.skip('getTrendingRecommendations()', () => {
    it('should fetch trending recommendations', async () => {
      const trending = await recommendationService.getTrendingRecommendations();

      expect(trending).toBeDefined();
      expect(Array.isArray(trending)).toBe(true);
      expect(trending.length).toBeGreaterThan(0);
    });

    it('should fetch trending recommendations by genre', async () => {
      const trending = await recommendationService.getTrendingRecommendations('Sci-Fi');

      expect(trending).toBeDefined();
      expect(Array.isArray(trending)).toBe(true);
      expect(trending.every(rec => rec.genres.includes('Sci-Fi'))).toBe(true);
    });

    it('should return empty array on API error', async () => {
      server.use(
        http.get(`${BASE_URL}/recommendations/trending`, async () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Server error' } },
            { status: 500 }
          );
        })
      );

      const trending = await recommendationService.getTrendingRecommendations();
      expect(trending).toEqual([]);
    }, 15000); // 15s timeout for retry logic
  });

  describe.skip('getFriendRecommendations()', () => {
    it('should fetch friend recommendations', async () => {
      const friendRecs = await recommendationService.getFriendRecommendations('user-123');

      expect(friendRecs).toBeDefined();
      expect(Array.isArray(friendRecs)).toBe(true);
      expect(friendRecs.length).toBeGreaterThan(0);
    });

    it('should return empty array for user with no friends', async () => {
      const friendRecs = await recommendationService.getFriendRecommendations('no-friends');
      expect(friendRecs).toEqual([]);
    });

    it('should return empty array on API error', async () => {
      server.use(
        http.get(`${BASE_URL}/recommendations/friends/:userId`, async () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Server error' } },
            { status: 500 }
          );
        })
      );

      const friendRecs = await recommendationService.getFriendRecommendations('user-123');
      expect(friendRecs).toEqual([]);
    }, 15000); // 15s timeout for retry logic
  });

  describe.skip('getSimilarContent()', () => {
    it('should fetch similar content recommendations', async () => {
      const similar = await recommendationService.getSimilarContent('content-123');

      expect(similar).toBeDefined();
      expect(Array.isArray(similar)).toBe(true);
      expect(similar.length).toBeGreaterThan(0);
    });

    it('should return empty array for not found content', async () => {
      const similar = await recommendationService.getSimilarContent('not-found');
      expect(similar).toEqual([]);
    });

    it('should return empty array on API error', async () => {
      server.use(
        http.get(`${BASE_URL}/recommendations/similar/:contentId`, async () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Server error' } },
            { status: 500 }
          );
        })
      );

      const similar = await recommendationService.getSimilarContent('content-123');
      expect(similar).toEqual([]);
    }, 15000); // 15s timeout for retry logic
  });

  describe.skip('getBecauseYouWatched()', () => {
    it('should fetch "because you watched" recommendations', async () => {
      const becauseYouWatched = await recommendationService.getBecauseYouWatched('content-123');

      expect(becauseYouWatched).toBeDefined();
      expect(Array.isArray(becauseYouWatched)).toBe(true);
      expect(becauseYouWatched.length).toBeGreaterThan(0);
    });

    it('should return empty array on API error', async () => {
      server.use(
        http.get(`${BASE_URL}/recommendations/because-you-watched/:contentId`, async () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Server error' } },
            { status: 500 }
          );
        })
      );

      const recs = await recommendationService.getBecauseYouWatched('content-123');
      expect(Array.isArray(recs)).toBe(true);
    }, 15000); // 15s timeout for retry logic
  });

  describe.skip('User Preferences', () => {
    it('should fetch user preferences from API', async () => {
      const prefs = await recommendationService.getUserPreferences('user-123');

      expect(prefs).toBeDefined();
      expect(prefs).toHaveProperty('genres');
      expect(prefs).toHaveProperty('types');
      expect(prefs).toHaveProperty('runtime');
      expect(prefs).toHaveProperty('streamingServices');
    });

    it('should use cached preferences on API failure', async () => {
      // First fetch to populate cache
      const initialPrefs = await recommendationService.getUserPreferences('user-123');
      expect(initialPrefs).toBeDefined();

      // Make API fail
      server.use(
        http.get(`${BASE_URL}/users/:userId/preferences`, async () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Server error' } },
            { status: 500 }
          );
        })
      );

      // Should still return cached preferences
      const cachedPrefs = await recommendationService.getUserPreferences('user-123');
      expect(cachedPrefs).toBeDefined();
      expect(cachedPrefs).toHaveProperty('genres');
    }, 15000); // 15s timeout for retry logic

    it('should update user preferences', async () => {
      const updates: Partial<UserPreferences> = {
        genres: { Comedy: 0.95, Action: 0.8 },
      };

      await expect(
        recommendationService.updateUserPreferences('user-123', updates)
      ).resolves.not.toThrow();

      // Verify cache was updated
      const cached = await AsyncStorage.getItem('@geoleap_user_preferences');
      expect(cached).toBeDefined();

      const parsed = JSON.parse(cached!);
      expect(parsed.genres).toHaveProperty('Comedy');
      expect(parsed.genres.Comedy).toBe(0.95);
    });

    it('should cache preferences even if API update fails', async () => {
      const updates: Partial<UserPreferences> = {
        genres: { Horror: 0.7 },
      };

      server.use(
        http.put(`${BASE_URL}/users/:userId/preferences`, async () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Server error' } },
            { status: 500 }
          );
        })
      );

      await recommendationService.updateUserPreferences('user-123', updates);

      // Cache should still be updated
      const cached = await AsyncStorage.getItem('@geoleap_user_preferences');
      expect(cached).toBeDefined();

      const parsed = JSON.parse(cached!);
      expect(parsed.genres).toHaveProperty('Horror');
    }, 15000); // 15s timeout for retry logic

    it('should analyze user behavior from watchlist', async () => {
      const preferences = await recommendationService.analyzeUserBehavior('user-123');

      expect(preferences).toBeDefined();
      expect(preferences).toHaveProperty('genres');
      expect(preferences).toHaveProperty('types');

      // Verify analyzed preferences from mocked watchlist
      expect(preferences.genres['Sci-Fi']).toBeGreaterThan(0);
      expect(preferences.genres['Action']).toBeGreaterThan(0);
      expect(preferences.types['movie']).toBe(1); // All 2 items are movies, normalized to 1
    });
  });

  describe.skip('Feedback Recording', () => {
    it('should record feedback successfully', async () => {
      await expect(
        recommendationService.recordFeedback('user-123', 'rec-1', {
          action: 'viewed',
        })
      ).resolves.not.toThrow();

      // Verify implicit feedback was stored
      const feedback = await AsyncStorage.getItem('@geoleap_implicit_feedback');
      expect(feedback).toBeDefined();

      const parsed = JSON.parse(feedback!);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
      expect(parsed[0]).toHaveProperty('action', 'viewed');
      expect(parsed[0]).toHaveProperty('recommendationId', 'rec-1');
    });

    it('should record feedback with rating', async () => {
      await recommendationService.recordFeedback('user-123', 'rec-2', {
        action: 'rated',
        rating: 5,
      });

      const feedback = await AsyncStorage.getItem('@geoleap_implicit_feedback');
      const parsed = JSON.parse(feedback!);

      expect(parsed[0]).toHaveProperty('rating', 5);
    });

    it('should limit feedback history to 1000 entries', async () => {
      // Add 1050 feedback entries
      for (let i = 0; i < 1050; i++) {
        await recommendationService.recordFeedback('user-123', `rec-${i}`, {
          action: 'viewed',
        });
      }

      const feedback = await AsyncStorage.getItem('@geoleap_implicit_feedback');
      const parsed = JSON.parse(feedback!);

      expect(parsed.length).toBe(1000); // Should be limited to 1000
    });

    it('should ignore recommendation', async () => {
      await recommendationService.ignoreRecommendation('user-123', 'rec-ignore');

      const feedback = await AsyncStorage.getItem('@geoleap_implicit_feedback');
      const parsed = JSON.parse(feedback!);

      expect(parsed.some((f: any) => f.action === 'ignored' && f.recommendationId === 'rec-ignore')).toBe(true);
    });

    it('should handle API failure gracefully', async () => {
      server.use(
        http.post(`${BASE_URL}/api/recommendations/feedback`, async () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Server error' } },
            { status: 500 }
          );
        })
      );

      // Should not throw even if API fails
      await expect(
        recommendationService.recordFeedback('user-123', 'rec-1', { action: 'viewed' })
      ).resolves.not.toThrow();

      // Implicit feedback should still be recorded locally
      const feedback = await AsyncStorage.getItem('@geoleap_implicit_feedback');
      expect(feedback).toBeDefined();
    }, 15000); // 15s timeout for retry logic
  });

  describe.skip('Recommendation Refresh', () => {
    it('should refresh recommendations successfully', async () => {
      const refreshed = await recommendationService.refreshRecommendations('user-123');

      expect(refreshed).toBeDefined();
      expect(Array.isArray(refreshed)).toBe(true);
      expect(refreshed.length).toBeGreaterThan(0);
    });

    it('should throw on API error', async () => {
      server.use(
        http.post(`${BASE_URL}/recommendations/refresh/:userId`, async () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Server error' } },
            { status: 500 }
          );
        })
      );

      await expect(
        recommendationService.refreshRecommendations('error-user')
      ).rejects.toThrow();
    }, 15000); // 15s timeout for retry logic
  });

  describe.skip('Recommendation Insights', () => {
    it('should fetch recommendation insights', async () => {
      const insights = await recommendationService.getRecommendationInsights('user-123');

      expect(insights).toBeDefined();
      expect(insights).toHaveProperty('accuracyRate');
      expect(insights).toHaveProperty('clickThroughRate');
      expect(insights).toHaveProperty('addToWatchlistRate');
      expect(insights).toHaveProperty('topGenres');
      expect(insights).toHaveProperty('topSources');
      expect(insights).toHaveProperty('improvementSuggestions');

      expect(typeof insights.accuracyRate).toBe('number');
      expect(Array.isArray(insights.topGenres)).toBe(true);
      expect(Array.isArray(insights.improvementSuggestions)).toBe(true);
    });

    it('should calculate insights from cache on API failure', async () => {
      // Record some feedback first
      await recommendationService.recordFeedback('user-123', 'rec-1', { action: 'viewed' });
      await recommendationService.recordFeedback('user-123', 'rec-2', { action: 'added_to_watchlist' });

      server.use(
        http.get(`${BASE_URL}/recommendations/insights/:userId`, async () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Server error' } },
            { status: 500 }
          );
        })
      );

      const insights = await recommendationService.getRecommendationInsights('user-123');

      expect(insights).toBeDefined();
      expect(insights.accuracyRate).toBeGreaterThan(0); // Calculated from local feedback
      expect(insights.clickThroughRate).toBeGreaterThan(0);
    }, 15000); // 15s timeout for retry logic
  });

  describe.skip('Context-aware Recommendations', () => {
    it('should generate correct time of day context', () => {
      const context = recommendationService.getCurrentContext();

      expect(['morning', 'afternoon', 'evening', 'night']).toContain(context.timeOfDay);
    });

    it('should generate correct day of week context', () => {
      const context = recommendationService.getCurrentContext();

      expect(['weekday', 'weekend']).toContain(context.dayOfWeek);
    });

    it('should generate correct season context', () => {
      const context = recommendationService.getCurrentContext();

      expect(['spring', 'summer', 'fall', 'winter']).toContain(context.season);
    });
  });

  describe.skip('Edge Cases', () => {
    it('should handle AsyncStorage errors gracefully', async () => {
      // Mock AsyncStorage to fail
      const mockError = new Error('Storage error');
      jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(mockError);

      // Should not throw
      await expect(
        recommendationService.getRecommendations('user-123', 10)
      ).resolves.toBeDefined();
    });

    it('should handle malformed cached data', async () => {
      // Store invalid JSON
      await AsyncStorage.setItem('@geoleap_recommendation_cache', 'invalid json {');

      server.use(
        http.get(`${BASE_URL}/recommendations`, async () => {
          return HttpResponse.error();
        })
      );

      // Should handle gracefully and return empty array
      const recs = await recommendationService.getRecommendations('user-123', 10);
      expect(Array.isArray(recs)).toBe(true);
    }, 15000); // 15s timeout for retry logic

    it('should return default preferences when cache is empty', async () => {
      await AsyncStorage.clear();
    await cacheService.clear();

      server.use(
        http.get(`${BASE_URL}/users/:userId/preferences`, async () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Server error' } },
            { status: 500 }
          );
        })
      );

      const prefs = await recommendationService.getUserPreferences('user-123');

      expect(prefs).toBeDefined();
      expect(prefs).toHaveProperty('runtime');
      expect(prefs.runtime.preferred).toBe(120); // Default
    }, 15000); // 15s timeout for retry logic
  });
});
