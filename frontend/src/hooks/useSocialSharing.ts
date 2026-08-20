/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShareContentRequest,
  ShareLinkResponse,
  SocialSharingPreferences,
  ShareAnalyticsData,
  SocialPlatformConfig,
} from '../lib/types/social-sharing';
import {
  generateShareLink,
  getUserSharingPreferences,
  updateUserSharingPreferences,
  getContentSharingMetrics,
  getAvailablePlatforms,
  trackShareEvent,
} from '../lib/social-sharing-api';

// Hook for managing social sharing functionality
export const useSocialSharing = (_contentId?: string, _contentType?: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<SocialSharingPreferences | null>(null);
  const [availablePlatforms, setAvailablePlatforms] = useState<SocialPlatformConfig[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load user preferences and available platforms on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [userPrefs, platforms] = await Promise.all([getUserSharingPreferences(), getAvailablePlatforms()]);

      setPreferences(userPrefs);
      setAvailablePlatforms(platforms);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sharing data');
      console.error('Failed to load sharing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Share content to a specific platform
  const shareContent = useCallback(
    async (
      request: ShareContentRequest,
      onSuccess?: (response: ShareLinkResponse) => void,
      onError?: (error: Error) => void
    ) => {
      if (!preferences?.allowSocialSharing) {
        const error = new Error('Social sharing is disabled in preferences');
        onError?.(error);
        return null;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Generate share link
        const response = await generateShareLink(request);

        // Track the share initiation
        trackShareEvent(
          'share_initiated',
          request.platform,
          request.contentId,
          request.contentType,
          response.shareEventId
        );

        onSuccess?.(response);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to generate share link');
        setError(error.message);

        // Track the failure
        trackShareEvent('share_failed', request.platform, request.contentId, request.contentType, '', {
          error: error.message,
        });

        onError?.(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [preferences]
  );

  // Update user sharing preferences
  const updatePreferences = useCallback(
    async (updates: Partial<SocialSharingPreferences>) => {
      if (!preferences) return null;

      try {
        setIsLoading(true);
        const updatedPrefs = await updateUserSharingPreferences({ ...preferences, ...updates });
        setPreferences(updatedPrefs);
        setError(null);
        return updatedPrefs;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to update preferences';
        setError(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [preferences]
  );

  // Check if sharing is available
  const canShare = useCallback(() => {
    return preferences?.allowSocialSharing === true;
  }, [preferences]);

  // Get platform configuration
  const getPlatformConfig = useCallback(
    (platformName: string) => {
      return availablePlatforms.find(p => p.platformName === platformName);
    },
    [availablePlatforms]
  );

  return {
    // State
    isLoading,
    preferences,
    availablePlatforms,
    error,

    // Actions
    shareContent,
    updatePreferences,
    loadInitialData,

    // Utilities
    canShare,
    getPlatformConfig,
  };
};

// Hook for sharing analytics
export const useShareAnalytics = (contentId?: string) => {
  const [analytics, setAnalytics] = useState<ShareAnalyticsData>({
    totalShares: 0,
    platformBreakdown: {},
    recentShares: [],
    conversionRate: 0,
    isLoading: false,
    error: null,
  });

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    if (!contentId) return;

    setAnalytics(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const metrics = await getContentSharingMetrics(contentId);

      setAnalytics(prev => ({
        ...prev,
        totalShares: metrics.totalShares,
        platformBreakdown: metrics.platformBreakdown,
        conversionRate: metrics.conversionRate,
        isLoading: false,
      }));
    } catch (error) {
      setAnalytics(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load analytics',
      }));
    }
  }, [contentId]);

  // Load analytics on mount and when contentId changes
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Refresh analytics data
  const refreshAnalytics = useCallback(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    analytics,
    refreshAnalytics,
    isLoading: analytics.isLoading,
  };
};

// Hook for mobile-specific sharing functionality
export const useMobileShare = () => {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if Web Share API is supported
    const checkSupport = () => {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        setIsSupported(true);
      }
    };

    checkSupport();
  }, []);

  const nativeShare = useCallback(
    async (data: { title: string; text?: string; url: string; files?: File[] }) => {
      if (!isSupported) {
        throw new Error('Web Share API not supported');
      }

      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          // User cancelled the share
          return false;
        }
        throw error;
      }
    },
    [isSupported]
  );

  // Check if sharing files is supported
  const canShareFiles = useCallback(() => {
    return isSupported && navigator.canShare && navigator.canShare({ files: [] });
  }, [isSupported]);

  return {
    isSupported,
    nativeShare,
    canShareFiles,
  };
};

// Hook for tracking share performance
export const useShareTracking = () => {
  const trackShare = useCallback(
    (
      eventType: 'share_initiated' | 'share_completed' | 'share_failed' | 'share_cancelled',
      platform: string,
      contentId: string,
      contentType: string,
      shareEventId?: string,
      metadata?: Record<string, any>
    ) => {
      trackShareEvent(eventType, platform, contentId, contentType, shareEventId || '', metadata);
    },
    []
  );

  const trackShareClick = useCallback(
    (shareEventId: string, platform: string) => {
      // This would typically be called when user clicks on a share button
      trackShare('share_initiated', platform, '', '', shareEventId);
    },
    [trackShare]
  );

  const trackShareComplete = useCallback(
    (shareEventId: string, platform: string, success: boolean) => {
      trackShare(success ? 'share_completed' : 'share_failed', platform, '', '', shareEventId, { success });
    },
    [trackShare]
  );

  return {
    trackShare,
    trackShareClick,
    trackShareComplete,
  };
};

export default useSocialSharing;
