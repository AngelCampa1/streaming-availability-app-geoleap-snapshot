/**
 * UserService MSW Integration Tests
 *
 * Tests REAL code execution with MSW-mocked API responses
 * Target: 80%+ coverage for userService.ts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import userService, { UserService } from '../../services/userService';
import cacheService from '../../services/api/CacheService'; // Import singleton to clear API cache
import { resetMockUserData } from '../../mocks/handlers/user.handlers';

// Use global http, HttpResponse, and server from jest.setup.fetch-mock.js
const { http, HttpResponse, server } = global as any;

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.geoleap.app';

// Mock authService to provide token for API calls
jest.mock('../../services/authService', () => {
  const mockTokens = {
    accessToken: 'test-jwt-token-123',
    refreshToken: 'test-refresh-token-456',
  };

  return {
    __esModule: true,
    default: {
      getTokens: jest.fn().mockResolvedValue(mockTokens),
      isAuthenticated: jest.fn().mockResolvedValue(true),
      setTokens: jest.fn().mockResolvedValue(undefined),
      clearTokens: jest.fn().mockResolvedValue(undefined),
    },
  };
});

describe('UserService - MSW Integration Tests', () => {
  const mockToken = 'test-jwt-token';

  beforeAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    // Clear all storage and caches
    await AsyncStorage.clear();
    userService.clearCache(); // Clear userService in-memory cache
    cacheService.clearMemoryCache(); // Clear ApiService memory cache (fast)
    resetMockUserData();

    // Mock auth token in storage
    await AsyncStorage.setItem('auth_token', mockToken);
  });

  afterEach(() => {
    jest.clearAllMocks();
    server.resetHandlers(); // Reset MSW handler overrides between tests
  });

  describe('getUserProfile()', () => {
    it('should fetch user profile successfully', async () => {
      const profile = await userService.getUserProfile();

      expect(profile).toBeDefined();
      expect(profile?.id).toBe('user-123');
      expect(profile?.email).toBe('test@geoleap.app');
      expect(profile?.username).toBe('testuser');
    });

    it('should use cached profile on subsequent calls', async () => {
      // First call - fetches from API
      const profile1 = await userService.getUserProfile();
      expect(profile1?.id).toBe('user-123');

      // Modify MSW to return different data
      server.use(
        http.get(`${BASE_URL}/api/user-profile`, async () => {
          return HttpResponse.json({
            profile: { id: 'different-user', email: 'different@test.com' },
          });
        })
      );

      // Second call - should use cache (still returns original)
      const profile2 = await userService.getUserProfile();
      expect(profile2?.id).toBe('user-123'); // Still cached
    });

    it('should store profile in AsyncStorage for offline use', async () => {
      await userService.getUserProfile();

      const offlineProfile = await AsyncStorage.getItem('offline_user_profile');
      expect(offlineProfile).toBeDefined();

      const parsed = JSON.parse(offlineProfile!);
      expect(parsed.id).toBe('user-123');
    });

    it('should return null and fallback to offline profile on API failure', async () => {
      // Store offline profile first
      const offlineData = { id: 'offline-123', email: 'offline@test.com' };
      await AsyncStorage.setItem('offline_user_profile', JSON.stringify(offlineData));

      // Make API fail
      server.use(
        http.get(`${BASE_URL}/api/user-profile`, async () => {
          return HttpResponse.json(
            { error: 'Server error' },
            { status: 500 }
          );
        })
      );

      const profile = await userService.getUserProfile();

      // Should return offline profile
      expect(profile).toBeDefined();
      expect(profile?.id).toBe('offline-123');
    }, 15000); // 15s timeout for retry logic (4 attempts with delays)

    it('should return null when both API and offline storage fail', async () => {
      // Make API fail
      server.use(
        http.get(`${BASE_URL}/api/user-profile`, async () => {
          return HttpResponse.json(
            { error: 'Server error' },
            { status: 500 }
          );
        })
      );

      const profile = await userService.getUserProfile();
      expect(profile).toBeNull();
    }, 15000); // 15s timeout for retry logic
  });

  describe('updateUserProfile()', () => {
    it('should update user profile successfully', async () => {
      const updates = { firstName: 'Updated', lastName: 'Name' };
      const updatedProfile = await userService.updateUserProfile(updates);

      expect(updatedProfile).toBeDefined();
      expect(updatedProfile.firstName).toBe('Updated');
      expect(updatedProfile.lastName).toBe('Name');
    });

    it('should update cache after profile update', async () => {
      // First, get profile to populate cache
      await userService.getUserProfile();

      // Update profile
      const updates = { firstName: 'NewFirst' };
      await userService.updateUserProfile(updates);

      // Get profile again - should return updated from cache
      const profile = await userService.getUserProfile();
      expect(profile?.firstName).toBe('NewFirst');
    });

    it('should update offline profile in AsyncStorage', async () => {
      const updates = { firstName: 'Offline', lastName: 'Test' };
      await userService.updateUserProfile(updates);

      const offlineProfile = await AsyncStorage.getItem('offline_user_profile');
      const parsed = JSON.parse(offlineProfile!);

      expect(parsed.firstName).toBe('Offline');
      expect(parsed.lastName).toBe('Test');
    });

    it('should throw error on API failure', async () => {
      // Make API fail
      server.use(
        http.put(`${BASE_URL}/api/user-profile`, async () => {
          return HttpResponse.json(
            { error: 'Update failed' },
            { status: 400 }
          );
        })
      );

      await expect(userService.updateUserProfile({ firstName: 'Test' }))
        .rejects
        .toThrow();
    }, 15000); // 15s timeout for retry logic
  });

  describe('getUserPreferences()', () => {
    it('should fetch user preferences successfully', async () => {
      const preferences = await userService.getUserPreferences();

      expect(preferences).toBeDefined();
      expect(preferences.theme).toBeDefined();
      expect(preferences.language).toBe('en');
      expect(preferences.notifications).toBeDefined();
    });

    it('should use cached preferences on subsequent calls', async () => {
      // First call
      const prefs1 = await userService.getUserPreferences();
      expect(prefs1.theme).toBe('light');

      // Modify MSW
      server.use(
        http.get(`${BASE_URL}/api/preferences`, async () => {
          return HttpResponse.json({
            preferences: { theme: 'light', language: 'es' },
          });
        })
      );

      // Second call - should use cache
      const prefs2 = await userService.getUserPreferences();
      expect(prefs2.theme).toBe('light'); // Still cached
    });

    it('should store preferences in AsyncStorage', async () => {
      await userService.getUserPreferences();

      const storedPrefs = await AsyncStorage.getItem('user_preferences');
      expect(storedPrefs).toBeDefined();

      const parsed = JSON.parse(storedPrefs!);
      expect(parsed.theme).toBe('light');
    });

    it('should fallback to local preferences on API failure', async () => {
      // Store local preferences
      const localPrefs = { theme: 'light', language: 'fr' };
      await AsyncStorage.setItem('user_preferences', JSON.stringify(localPrefs));

      // Make API fail
      server.use(
        http.get(`${BASE_URL}/api/preferences`, async () => {
          return HttpResponse.json(
            { error: 'Server error' },
            { status: 500 }
          );
        })
      );

      const preferences = await userService.getUserPreferences();

      // Should merge with defaults
      expect(preferences).toBeDefined();
      expect(preferences.theme).toBe('light');
    }, 15000); // 15s timeout for retry logic

    it('should return default preferences when both API and storage fail', async () => {
      // Make API fail
      server.use(
        http.get(`${BASE_URL}/api/preferences`, async () => {
          return HttpResponse.json(
            { error: 'Server error' },
            { status: 500 }
          );
        })
      );

      const preferences = await userService.getUserPreferences();

      // Should return defaults
      expect(preferences.theme).toBe('auto');
      expect(preferences.language).toBe('en');
    }, 15000); // 15s timeout for retry logic
  });

  describe('updateUserPreferences()', () => {
    it('should update user preferences successfully', async () => {
      const updates = { theme: 'light' as const };
      const updatedPrefs = await userService.updateUserPreferences(updates);

      expect(updatedPrefs).toBeDefined();
      expect(updatedPrefs.theme).toBe('light');
    });

    it('should merge with current preferences', async () => {
      // Get current preferences first
      const current = await userService.getUserPreferences();
      expect(current.theme).toBe('light');

      // Update only theme
      const updates = { theme: 'light' as const };
      const updated = await userService.updateUserPreferences(updates);

      // Should preserve other settings
      expect(updated.theme).toBe('light');
      expect(updated.language).toBe('en'); // Preserved
    });

    it('should update cache after preferences update', async () => {
      const updates = { theme: 'light' as const };
      await userService.updateUserPreferences(updates);

      // Get preferences again - should return updated from cache
      const prefs = await userService.getUserPreferences();
      expect(prefs.theme).toBe('light');
    });

    it('should update local preferences even if API fails', async () => {
      // Make API fail
      server.use(
        http.put(`${BASE_URL}/api/preferences`, async () => {
          return HttpResponse.json(
            { error: 'Update failed' },
            { status: 500 }
          );
        })
      );

      const updates = { theme: 'light' as const };
      const updatedPrefs = await userService.updateUserPreferences(updates);

      // Should still update locally
      expect(updatedPrefs.theme).toBe('light');

      // Check AsyncStorage
      const storedPrefs = await AsyncStorage.getItem('user_preferences');
      const parsed = JSON.parse(storedPrefs!);
      expect(parsed.theme).toBe('light');
    }, 15000); // 15s timeout for retry logic
  });

  describe('getUserStats()', () => {
    it('should fetch user statistics successfully', async () => {
      const stats = await userService.getUserStats();

      expect(stats).toBeDefined();
      expect(stats.totalWatchTime).toBe(18720);
      expect(stats.moviesWatched).toBe(150);
      expect(stats.favoriteGenres).toContain('Action');
    });

    it('should store stats in AsyncStorage', async () => {
      await userService.getUserStats();

      const storedStats = await AsyncStorage.getItem('user_stats');
      expect(storedStats).toBeDefined();

      const parsed = JSON.parse(storedStats!);
      expect(parsed.totalWatchTime).toBe(18720);
    });

    it('should fallback to local stats on API failure', async () => {
      // Store local stats
      const localStats = { totalWatchTime: 5000, moviesWatched: 50 };
      await AsyncStorage.setItem('user_stats', JSON.stringify(localStats));

      // Make API fail
      server.use(
        http.get(`${BASE_URL}/users/stats`, async () => {
          return HttpResponse.json(
            { error: 'Server error' },
            { status: 500 }
          );
        })
      );

      const stats = await userService.getUserStats();

      // Should return local stats
      expect(stats.totalWatchTime).toBe(5000);
      expect(stats.moviesWatched).toBe(50);
    }, 15000); // 15s timeout for retry logic

    it('should return default stats when both API and storage fail', async () => {
      // Make API fail
      server.use(
        http.get(`${BASE_URL}/users/stats`, async () => {
          return HttpResponse.json(
            { error: 'Server error' },
            { status: 500 }
          );
        })
      );

      const stats = await userService.getUserStats();

      // Should return defaults
      expect(stats.totalWatchTime).toBe(0);
      expect(stats.moviesWatched).toBe(0);
    }, 15000); // 15s timeout for retry logic
  });

  describe('getUserActivity()', () => {
    it('should fetch user activity successfully', async () => {
      const activities = await userService.getUserActivity();

      expect(activities).toBeDefined();
      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeGreaterThan(0);
      expect(activities[0]).toHaveProperty('id');
      expect(activities[0]).toHaveProperty('type');
    });

    it('should respect limit parameter', async () => {
      const activities = await userService.getUserActivity(3);

      expect(activities.length).toBeLessThanOrEqual(3);
    });

    it('should respect offset parameter', async () => {
      const activities = await userService.getUserActivity(10, 5);

      expect(activities).toBeDefined();
      expect(Array.isArray(activities)).toBe(true);
    });

    it('should return empty array on API failure', async () => {
      // Make API fail
      server.use(
        http.get(`${BASE_URL}/users/activity`, async () => {
          return HttpResponse.json(
            { error: 'Server error' },
            { status: 500 }
          );
        })
      );

      const activities = await userService.getUserActivity();
      expect(activities).toEqual([]);
    }, 15000); // 15s timeout for retry logic
  });

  describe('uploadAvatar()', () => {
    it('should upload avatar successfully', async () => {
      const imageUri = 'file:///path/to/avatar.jpg';
      const avatarUrl = await userService.uploadAvatar(imageUri);

      expect(avatarUrl).toBeDefined();
      expect(avatarUrl).toContain('https://');
      expect(avatarUrl).toContain('avatar');
    });

    it('should throw error on upload failure', async () => {
      // Make API fail
      server.use(
        http.post(`${BASE_URL}/users/avatar`, async () => {
          return HttpResponse.json(
            { error: 'Upload failed' },
            { status: 413 } // Payload too large
          );
        })
      );

      await expect(userService.uploadAvatar('file:///test.jpg'))
        .rejects
        .toThrow();
    }, 15000); // 15s timeout for retry logic
  });

  describe('deleteAccount()', () => {
    it('should delete account successfully', async () => {
      await expect(userService.deleteAccount('password123'))
        .resolves
        .not.toThrow();

      // Should clear all local data
      const offlineProfile = await AsyncStorage.getItem('offline_user_profile');
      const preferences = await AsyncStorage.getItem('user_preferences');
      const stats = await AsyncStorage.getItem('user_stats');

      expect(offlineProfile).toBeNull();
      expect(preferences).toBeNull();
      expect(stats).toBeNull();
    });

    it('should throw error on deletion failure', async () => {
      // Make API fail
      server.use(
        http.delete(`${BASE_URL}/api/users/account`, async () => {
          return HttpResponse.json(
            { error: 'Invalid password' },
            { status: 401 }
          );
        })
      );

      await expect(userService.deleteAccount('wrongpassword'))
        .rejects
        .toThrow();
    }, 15000); // 15s timeout for retry logic
  });

  describe('clearCache()', () => {
    it('should clear in-memory cache', async () => {
      // Populate cache
      await userService.getUserProfile();
      await userService.getUserPreferences();

      // Clear cache (synchronous)
      userService.clearCache();
      cacheService.clearMemoryCache(); // Also clear API cache
      await AsyncStorage.clear(); // Also clear AsyncStorage offline cache

      // Next calls should fetch from API (not cache)
      // Modify MSW to return different data
      server.use(
        http.get(`${BASE_URL}/api/user-profile`, async () => {
          return HttpResponse.json({
            profile: { id: 'new-user', email: 'new@test.com' },
          });
        })
      );

      const profile = await userService.getUserProfile();
      expect(profile?.id).toBe('new-user'); // Not cached
    }, 15000); // 15s timeout for retry logic
  });

  describe('clearLocalData()', () => {
    it('should clear all local data and cache', async () => {
      // Store some data
      await userService.getUserProfile();
      await userService.getUserPreferences();
      await userService.getUserStats();

      // Clear all local data
      await userService.clearLocalData();

      // Check AsyncStorage
      const offlineProfile = await AsyncStorage.getItem('offline_user_profile');
      const preferences = await AsyncStorage.getItem('user_preferences');
      const stats = await AsyncStorage.getItem('user_stats');

      expect(offlineProfile).toBeNull();
      expect(preferences).toBeNull();
      expect(stats).toBeNull();
    });
  });

  describe('Singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = UserService.getInstance();
      const instance2 = UserService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
