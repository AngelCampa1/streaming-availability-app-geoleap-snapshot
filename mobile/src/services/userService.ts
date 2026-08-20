/**
 * User Service for GeoLeap Mobile App
 * Handles user profile management, preferences, and settings
 * Integrates with .NET backend API
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './api/ApiService';
import { endpoints } from '../config/api';
import { logger } from '../utils/logger';

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatar?: string;
  bio?: string;
  dateOfBirth?: string;
  location?: string;
  website?: string;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  showWatchlist?: boolean;
  showStats?: boolean;
  allowRecommendations?: boolean;
  publicProfile?: boolean;
  // Additional optional properties for compatibility
  [key: string]: any;
}

export interface UserPreferences {
  theme: 'light' |  'auto';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
    updates: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    showOnlineStatus: boolean;
    showWatchlist: boolean;
    allowRecommendations: boolean;
  };
  streaming: {
    defaultQuality: 'auto' | 'low' | 'medium' | 'high' | 'ultra';
    autoplay: boolean;
    subtitles: boolean;
    subtitleLanguage: string;
    downloadQuality: 'low' | 'medium' | 'high';
  };
  ui: {
    compactMode: boolean;
    showRatings: boolean;
    showDescriptions: boolean;
    gridColumns: number;
  };
}

export interface UserStats {
  totalWatchTime: number; // in minutes
  moviesWatched: number;
  episodesWatched: number;
  averageRating: number;
  favoriteGenres: string[];
  watchStreak: number;
  joinDate: string;
}

export interface UserActivity {
  id: string;
  type: 'watched' | 'rated' | 'reviewed' | 'added_to_watchlist' | 'completed';
  itemType: 'movie' | 'tv_series' | 'documentary' | 'anime';
  itemId: string;
  itemTitle: string;
  itemPoster?: string;
  rating?: number;
  review?: string;
  progress?: {
    current?: number;
    total?: number;
  };
  timestamp: string;
}

class UserService {
  private static instance: UserService;
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private userProfileCache: { data: UserProfile | null; timestamp: number } | null = null;
  private preferencesCache: { data: UserPreferences | null; timestamp: number } | null = null;

  private readonly STORAGE_KEYS = {
    USER_PREFERENCES: 'user_preferences',
    USER_STATS: 'user_stats',
    OFFLINE_PROFILE: 'offline_user_profile',
  };

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Get current user profile
   */
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      // Check cache first
      if (this.userProfileCache &&
          Date.now() - this.userProfileCache.timestamp < this.cacheExpiry) {
        return this.userProfileCache.data;
      }

      logger.info('Fetching user profile');

      const response = await ApiService.get<{ profile: UserProfile }>(
        endpoints.users.profile,
        {
          cacheTTL: this.cacheExpiry,
        },
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch user profile');
      }

      this.userProfileCache = {
        data: response.data.profile,
        timestamp: Date.now(),
      };

      // Store offline copy
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.OFFLINE_PROFILE,
        JSON.stringify(response.data.profile),
      );

      logger.info('User profile fetched successfully');
      return response.data.profile;

    } catch (error: any) {
      logger.error('Failed to fetch user profile:', error);

      // Fallback to offline copy
      try {
        const offlineProfile = await AsyncStorage.getItem(this.STORAGE_KEYS.OFFLINE_PROFILE);
        if (offlineProfile) {
          logger.warn('Using offline user profile');
          return JSON.parse(offlineProfile);
        }
      } catch (offlineError) {
        logger.error('Failed to load offline profile:', offlineError);
      }

      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      logger.info('Updating user profile:', { fields: Object.keys(updates) });

      const response = await ApiService.put<{ profile: UserProfile }>(
        endpoints.users.profile,
        updates,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update user profile');
      }

      // Update cache
      this.userProfileCache = {
        data: response.data.profile,
        timestamp: Date.now(),
      };

      // Update offline copy
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.OFFLINE_PROFILE,
        JSON.stringify(response.data.profile),
      );

      logger.info('User profile updated successfully');
      return response.data.profile;

    } catch (error: any) {
      logger.error('Failed to update user profile:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(): Promise<UserPreferences> {
    try {
      // Check cache first
      if (this.preferencesCache &&
          Date.now() - this.preferencesCache.timestamp < this.cacheExpiry) {
        return this.preferencesCache.data || this.getDefaultPreferences();
      }

      logger.info('Fetching user preferences');

      const response = await ApiService.get<{ preferences: UserPreferences }>(
        endpoints.users.preferences,
        {
          cacheTTL: this.cacheExpiry,
        },
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch user preferences');
      }

      this.preferencesCache = {
        data: response.data.preferences,
        timestamp: Date.now(),
      };

      // Store locally
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(response.data.preferences),
      );

      logger.info('User preferences fetched successfully');
      return response.data.preferences;

    } catch (error: any) {
      logger.error('Failed to fetch user preferences:', error);

      // Fallback to local preferences
      try {
        const localPreferences = await AsyncStorage.getItem(this.STORAGE_KEYS.USER_PREFERENCES);
        if (localPreferences) {
          logger.warn('Using local user preferences');
          return { ...this.getDefaultPreferences(), ...JSON.parse(localPreferences) };
        }
      } catch (localError) {
        logger.error('Failed to load local preferences:', localError);
      }

      return this.getDefaultPreferences();
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      logger.info('Updating user preferences:', { fields: Object.keys(updates) });

      const currentPreferences = await this.getUserPreferences();
      const updatedPreferences = { ...currentPreferences, ...updates };

      const response = await ApiService.put<{ preferences: UserPreferences }>(
        endpoints.users.preferences,
        updatedPreferences,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update user preferences');
      }

      // Update cache
      this.preferencesCache = {
        data: response.data.preferences,
        timestamp: Date.now(),
      };

      // Update local preferences
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(response.data.preferences),
      );

      logger.info('User preferences updated successfully');
      return response.data.preferences;

    } catch (error: any) {
      logger.error('Failed to update user preferences:', error);

      // Update local preferences even if API fails
      try {
        const currentPreferences = await this.getUserPreferences();
        const updatedPreferences = { ...currentPreferences, ...updates };
        await AsyncStorage.setItem(
          this.STORAGE_KEYS.USER_PREFERENCES,
          JSON.stringify(updatedPreferences),
        );
        logger.warn('Updated local preferences despite API failure');
        return updatedPreferences;
      } catch (localError) {
        logger.error('Failed to update local preferences:', localError);
        throw new Error(error.message || 'Failed to update preferences');
      }
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    try {
      logger.info('Fetching user statistics');

      const response = await ApiService.get<{ stats: UserStats }>(
        '/users/stats',
        {
          cacheTTL: 60000, // 1 minute cache for stats
        },
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch user statistics');
      }

      // Store locally
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.USER_STATS,
        JSON.stringify(response.data.stats),
      );

      logger.info('User statistics fetched successfully');
      return response.data.stats;

    } catch (error: any) {
      logger.error('Failed to fetch user statistics:', error);

      // Fallback to local stats
      try {
        const localStats = await AsyncStorage.getItem(this.STORAGE_KEYS.USER_STATS);
        if (localStats) {
          logger.warn('Using local user statistics');
          return JSON.parse(localStats);
        }
      } catch (localError) {
        logger.error('Failed to load local statistics:', localError);
      }

      // Return default stats
      return this.getDefaultStats();
    }
  }

  /**
   * Get user activity
   */
  async getUserActivity(limit: number = 20, offset: number = 0): Promise<UserActivity[]> {
    try {
      logger.info('Fetching user activity:', { limit, offset });

      const response = await ApiService.get<{ activities: UserActivity[] }>(
        '/users/activity',
        {
          params: { limit, offset },
          cacheTTL: 120000, // 2 minutes cache for activity
        },
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch user activity');
      }

      logger.info('User activity fetched successfully:', { count: response.data.activities.length });
      return response.data.activities;

    } catch (error: any) {
      logger.error('Failed to fetch user activity:', error);
      return [];
    }
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(imageUri: string): Promise<string> {
    try {
      logger.info('Uploading user avatar');

      const formData = new FormData();
      formData.append('avatar', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);

      const response = await ApiService.upload<{ avatarUrl: string }>(
        '/users/avatar',
        formData as any, // React Native FormData needs to be cast for compatibility
        {
          onProgress: (progress) => {
            logger.debug('Avatar upload progress:', progress);
          },
        },
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to upload avatar');
      }

      logger.info('Avatar uploaded successfully');
      return response.data.avatarUrl;

    } catch (error: any) {
      logger.error('Failed to upload avatar:', error);
      throw new Error(error.message || 'Failed to upload avatar');
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(password: string): Promise<void> {
    try {
      logger.info('Deleting user account');

      const response = await ApiService.delete('/api/users/account', {
        body: { password },
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete account');
      }

      // Clear all local data
      await this.clearLocalData();

      logger.info('User account deleted successfully');

    } catch (error: any) {
      logger.error('Failed to delete user account:', error);
      throw new Error(error.message || 'Failed to delete account');
    }
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.userProfileCache = null;
    this.preferencesCache = null;
    logger.info('User service cache cleared');
  }

  /**
   * Clear all local data
   */
  async clearLocalData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.USER_PREFERENCES,
        this.STORAGE_KEYS.USER_STATS,
        this.STORAGE_KEYS.OFFLINE_PROFILE,
      ]);

      this.clearCache();
      logger.info('All user local data cleared');

    } catch (error) {
      logger.error('Failed to clear local user data:', error);
    }
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'auto',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        marketing: false,
        updates: true,
      },
      privacy: {
        profileVisibility: 'public',
        showOnlineStatus: true,
        showWatchlist: true,
        allowRecommendations: true,
      },
      streaming: {
        defaultQuality: 'auto',
        autoplay: true,
        subtitles: false,
        subtitleLanguage: 'en',
        downloadQuality: 'medium',
      },
      ui: {
        compactMode: false,
        showRatings: true,
        showDescriptions: true,
        gridColumns: 2,
      },
    };
  }

  /**
   * Get default stats
   */
  private getDefaultStats(): UserStats {
    return {
      totalWatchTime: 0,
      moviesWatched: 0,
      episodesWatched: 0,
      averageRating: 0,
      favoriteGenres: [],
      watchStreak: 0,
      joinDate: new Date().toISOString(),
    };
  }
}

// Export singleton instance
const userService = UserService.getInstance();
export default userService;
export { UserService };
