/**
 * Comprehensive tests for useSocialSharing.ts
 *
 * Coverage Target: 85%+
 * Strategy: Test all 4 hooks - useSocialSharing, useShareAnalytics, useMobileShare, useShareTracking
 * Testing: API mocking, preferences, platform configs, Web Share API, analytics, tracking
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useSocialSharing,
  useShareAnalytics,
  useMobileShare,
  useShareTracking,
} from '../useSocialSharing';
import * as socialSharingApi from '@/lib/social-sharing-api';
import type {
  ShareContentRequest,
  ShareLinkResponse,
  SocialSharingPreferences,
  SocialPlatformConfig,
  SocialShareMetrics,
} from '@/lib/types/social-sharing';

// Mock the social sharing API module
jest.mock('@/lib/social-sharing-api');

const mockApi = socialSharingApi as jest.Mocked<typeof socialSharingApi>;

// Test data
const mockPreferences: SocialSharingPreferences = {
  allowSocialSharing: true,
  shareWithPersonalInfo: false,
  allowShareAnalytics: true,
  autoGenerateHashtags: true,
};

const mockPlatforms: SocialPlatformConfig[] = [
  {
    id: 'twitter',
    platformName: 'twitter',
    displayName: 'Twitter',
    iconUrl: 'twitter.png',
    isEnabled: true,
    characterLimit: 280,
    supportsImages: true,
    supportsVideo: true,
    supportsHashtags: true,
    sortOrder: 1,
  },
  {
    id: 'facebook',
    platformName: 'facebook',
    displayName: 'Facebook',
    iconUrl: 'facebook.png',
    isEnabled: true,
    characterLimit: 5000,
    supportsImages: true,
    supportsVideo: true,
    supportsHashtags: false,
    sortOrder: 2,
  },
];

const mockShareRequest: ShareContentRequest = {
  platform: 'twitter',
  contentId: 'content-123',
  contentType: 'movie',
  customMessage: 'Check this out!',
};

const mockShareResponse: ShareLinkResponse = {
  shareUrl: 'https://example.com/share/abc123',
  shareMessage: 'Check this out!',
  shareEventId: 'event-123',
};

const mockMetrics: SocialShareMetrics = {
  contentId: 'content-123',
  contentTitle: 'Test Content',
  totalShares: 150,
  totalClicks: 600,
  platformBreakdown: {
    twitter: 80,
    facebook: 70,
  },
  conversionRate: 0.25,
  viralCoefficient: 1.5,
  lastSharedAt: '2024-12-31T23:59:59Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.getUserSharingPreferences.mockResolvedValue(mockPreferences);
  mockApi.getAvailablePlatforms.mockResolvedValue(mockPlatforms);
});

describe('useSocialSharing - Initialization', () => {
  it('should load preferences and platforms on mount', async () => {
    const { result } = renderHook(() => useSocialSharing());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.preferences).toEqual(mockPreferences);
    expect(result.current.availablePlatforms).toEqual(mockPlatforms);
    expect(result.current.error).toBeNull();
    expect(mockApi.getUserSharingPreferences).toHaveBeenCalled();
    expect(mockApi.getAvailablePlatforms).toHaveBeenCalled();
  });

  it('should handle initialization error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Failed to load');
    mockApi.getUserSharingPreferences.mockRejectedValue(error);

    const { result } = renderHook(() => useSocialSharing());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load');
    expect(result.current.preferences).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load sharing data:', error);

    consoleErrorSpy.mockRestore();
  });

  it('should handle non-Error exceptions', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockApi.getUserSharingPreferences.mockRejectedValue('string error');

    const { result } = renderHook(() => useSocialSharing());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load sharing data');

    consoleErrorSpy.mockRestore();
  });
});

describe('useSocialSharing - Share Content', () => {
  beforeEach(() => {
    mockApi.generateShareLink.mockResolvedValue(mockShareResponse);
    mockApi.trackShareEvent.mockReturnValue(undefined);
  });

  it('should share content successfully', async () => {
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useSocialSharing());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let response: ShareLinkResponse | null = null;
    await act(async () => {
      response = await result.current.shareContent(mockShareRequest, onSuccess);
    });

    expect(response).toEqual(mockShareResponse);
    expect(onSuccess).toHaveBeenCalledWith(mockShareResponse);
    expect(mockApi.generateShareLink).toHaveBeenCalledWith(mockShareRequest);
    expect(mockApi.trackShareEvent).toHaveBeenCalledWith(
      'share_initiated',
      'twitter',
      'content-123',
      'movie',
      'event-123'
    );
  });

  it('should reject sharing when disabled in preferences', async () => {
    const onError = jest.fn();
    mockApi.getUserSharingPreferences.mockResolvedValue({
      ...mockPreferences,
      allowSocialSharing: false,
    });

    const { result } = renderHook(() => useSocialSharing());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let response: ShareLinkResponse | null = null;
    await act(async () => {
      response = await result.current.shareContent(mockShareRequest, undefined, onError);
    });

    expect(response).toBeNull();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Social sharing is disabled in preferences',
      })
    );
    expect(mockApi.generateShareLink).not.toHaveBeenCalled();
  });

  it('should handle share error', async () => {
    const onError = jest.fn();
    const error = new Error('Share failed');
    mockApi.generateShareLink.mockRejectedValue(error);

    const { result } = renderHook(() => useSocialSharing());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let response: ShareLinkResponse | null = null;
    await act(async () => {
      response = await result.current.shareContent(mockShareRequest, undefined, onError);
    });

    expect(response).toBeNull();
    expect(result.current.error).toBe('Share failed');
    expect(onError).toHaveBeenCalledWith(error);
    expect(mockApi.trackShareEvent).toHaveBeenCalledWith(
      'share_failed',
      'twitter',
      'content-123',
      'movie',
      '',
      { error: 'Share failed' }
    );
  });

  it('should handle non-Error exceptions in share', async () => {
    const onError = jest.fn();
    mockApi.generateShareLink.mockRejectedValue('string error');

    const { result } = renderHook(() => useSocialSharing());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.shareContent(mockShareRequest, undefined, onError);
    });

    expect(result.current.error).toBe('Failed to generate share link');
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Failed to generate share link',
      })
    );
  });
});

describe('useSocialSharing - Update Preferences', () => {
  it('should update preferences successfully', async () => {
    const updatedPrefs = { ...mockPreferences, autoGenerateHashtags: false };
    mockApi.updateUserSharingPreferences.mockResolvedValue(updatedPrefs);

    const { result } = renderHook(() => useSocialSharing());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let response: SocialSharingPreferences | null = null;
    await act(async () => {
      response = await result.current.updatePreferences({ autoGenerateHashtags: false });
    });

    expect(response).toEqual(updatedPrefs);
    expect(result.current.preferences).toEqual(updatedPrefs);
    expect(result.current.error).toBeNull();
  });

  it('should not update when preferences is null', async () => {
    mockApi.getUserSharingPreferences.mockResolvedValue(null as any);

    const { result } = renderHook(() => useSocialSharing());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let response: SocialSharingPreferences | null = null;
    await act(async () => {
      response = await result.current.updatePreferences({ allowShareAnalytics: false });
    });

    expect(response).toBeNull();
    expect(mockApi.updateUserSharingPreferences).not.toHaveBeenCalled();
  });

  it('should handle update error', async () => {
    const error = new Error('Update failed');
    mockApi.updateUserSharingPreferences.mockRejectedValue(error);

    const { result } = renderHook(() => useSocialSharing());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let response: SocialSharingPreferences | null = null;
    await act(async () => {
      response = await result.current.updatePreferences({ shareWithPersonalInfo: true });
    });

    expect(response).toBeNull();
    expect(result.current.error).toBe('Update failed');
  });

  it('should handle non-Error exceptions in update', async () => {
    mockApi.updateUserSharingPreferences.mockRejectedValue('string error');

    const { result } = renderHook(() => useSocialSharing());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updatePreferences({ allowSocialSharing: false });
    });

    expect(result.current.error).toBe('Failed to update preferences');
  });
});

describe('useSocialSharing - Utilities', () => {
  it('should check if sharing is allowed', async () => {
    const { result } = renderHook(() => useSocialSharing());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.canShare()).toBe(true);
  });

  it('should return false when sharing is disabled', async () => {
    mockApi.getUserSharingPreferences.mockResolvedValue({
      ...mockPreferences,
      allowSocialSharing: false,
    });

    const { result } = renderHook(() => useSocialSharing());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.canShare()).toBe(false);
  });

  it('should get platform configuration', async () => {
    const { result } = renderHook(() => useSocialSharing());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const config = result.current.getPlatformConfig('twitter');
    expect(config).toEqual(mockPlatforms[0]);
  });

  it('should return undefined for non-existent platform', async () => {
    const { result } = renderHook(() => useSocialSharing());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const config = result.current.getPlatformConfig('nonexistent');
    expect(config).toBeUndefined();
  });

  it('should reload initial data', async () => {
    const { result } = renderHook(() => useSocialSharing());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear mock calls
    mockApi.getUserSharingPreferences.mockClear();
    mockApi.getAvailablePlatforms.mockClear();

    await act(async () => {
      await result.current.loadInitialData();
    });

    expect(mockApi.getUserSharingPreferences).toHaveBeenCalled();
    expect(mockApi.getAvailablePlatforms).toHaveBeenCalled();
  });
});

describe('useShareAnalytics', () => {
  beforeEach(() => {
    mockApi.getContentSharingMetrics.mockResolvedValue(mockMetrics);
  });

  it('should load analytics on mount', async () => {
    const { result } = renderHook(() => useShareAnalytics('content-123'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.analytics.totalShares).toBe(150);
    expect(result.current.analytics.platformBreakdown).toEqual({
      twitter: 80,
      facebook: 70,
    });
    expect(result.current.analytics.conversionRate).toBe(0.25);
    expect(mockApi.getContentSharingMetrics).toHaveBeenCalledWith('content-123');
  });

  it('should not load analytics without contentId', () => {
    const { result } = renderHook(() => useShareAnalytics());

    expect(result.current.isLoading).toBe(false);
    expect(mockApi.getContentSharingMetrics).not.toHaveBeenCalled();
  });

  it('should handle analytics error', async () => {
    const error = new Error('Analytics failed');
    mockApi.getContentSharingMetrics.mockRejectedValue(error);

    const { result } = renderHook(() => useShareAnalytics('content-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.analytics.error).toBe('Analytics failed');
  });

  it('should handle non-Error exceptions in analytics', async () => {
    mockApi.getContentSharingMetrics.mockRejectedValue('string error');

    const { result } = renderHook(() => useShareAnalytics('content-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.analytics.error).toBe('Failed to load analytics');
  });

  it('should refresh analytics', async () => {
    const { result } = renderHook(() => useShareAnalytics('content-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockApi.getContentSharingMetrics.mockClear();

    await act(async () => {
      result.current.refreshAnalytics();
    });

    await waitFor(() => {
      expect(mockApi.getContentSharingMetrics).toHaveBeenCalledWith('content-123');
    });
  });

  it('should reload analytics when contentId changes', async () => {
    const { result, rerender } = renderHook(({ id }) => useShareAnalytics(id), {
      initialProps: { id: 'content-123' },
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockApi.getContentSharingMetrics).toHaveBeenCalledWith('content-123');
    mockApi.getContentSharingMetrics.mockClear();

    // Change contentId
    rerender({ id: 'content-456' });

    await waitFor(() => {
      expect(mockApi.getContentSharingMetrics).toHaveBeenCalledWith('content-456');
    });
  });
});

describe('useMobileShare - Web Share API', () => {
  beforeEach(() => {
    // Reset navigator mocks
    delete (global.navigator as any).share;
    delete (global.navigator as any).canShare;
  });

  it('should detect Web Share API support', () => {
    (global.navigator as any).share = jest.fn();

    const { result } = renderHook(() => useMobileShare());

    expect(result.current.isSupported).toBe(true);
  });

  it('should detect lack of Web Share API support', () => {
    const { result } = renderHook(() => useMobileShare());

    expect(result.current.isSupported).toBe(false);
  });

  it('should share using native API', async () => {
    const mockShare = jest.fn().mockResolvedValue(undefined);
    (global.navigator as any).share = mockShare;

    const { result } = renderHook(() => useMobileShare());

    const shareData = {
      title: 'Test',
      text: 'Test content',
      url: 'https://example.com',
    };

    let success = false;
    await act(async () => {
      success = await result.current.nativeShare(shareData);
    });

    expect(success).toBe(true);
    expect(mockShare).toHaveBeenCalledWith(shareData);
  });

  it('should throw error when not supported', async () => {
    const { result } = renderHook(() => useMobileShare());

    await expect(
      act(async () => {
        await result.current.nativeShare({
          title: 'Test',
          url: 'https://example.com',
        });
      })
    ).rejects.toThrow('Web Share API not supported');
  });

  it('should handle user cancellation', async () => {
    const abortError = new Error('User cancelled');
    abortError.name = 'AbortError';
    const mockShare = jest.fn().mockRejectedValue(abortError);
    (global.navigator as any).share = mockShare;

    const { result } = renderHook(() => useMobileShare());

    let success = true;
    await act(async () => {
      success = await result.current.nativeShare({
        title: 'Test',
        url: 'https://example.com',
      });
    });

    expect(success).toBe(false);
  });

  it('should rethrow non-abort errors', async () => {
    const error = new Error('Network error');
    const mockShare = jest.fn().mockRejectedValue(error);
    (global.navigator as any).share = mockShare;

    const { result } = renderHook(() => useMobileShare());

    await expect(
      act(async () => {
        await result.current.nativeShare({
          title: 'Test',
          url: 'https://example.com',
        });
      })
    ).rejects.toThrow('Network error');
  });

  it('should check if sharing files is supported', () => {
    const mockCanShare = jest.fn().mockReturnValue(true);
    (global.navigator as any).share = jest.fn();
    (global.navigator as any).canShare = mockCanShare;

    const { result } = renderHook(() => useMobileShare());

    expect(result.current.canShareFiles()).toBe(true);
    expect(mockCanShare).toHaveBeenCalledWith({ files: [] });
  });

  it('should return false for file sharing when not supported', () => {
    const { result } = renderHook(() => useMobileShare());

    expect(result.current.canShareFiles()).toBe(false);
  });
});

describe('useShareTracking', () => {
  beforeEach(() => {
    mockApi.trackShareEvent.mockReturnValue(undefined);
  });

  it('should track share events', () => {
    const { result } = renderHook(() => useShareTracking());

    act(() => {
      result.current.trackShare(
        'share_initiated',
        'twitter',
        'content-123',
        'movie',
        'event-123',
        { extra: 'data' }
      );
    });

    expect(mockApi.trackShareEvent).toHaveBeenCalledWith(
      'share_initiated',
      'twitter',
      'content-123',
      'movie',
      'event-123',
      { extra: 'data' }
    );
  });

  it('should track share click', () => {
    const { result } = renderHook(() => useShareTracking());

    act(() => {
      result.current.trackShareClick('event-123', 'facebook');
    });

    expect(mockApi.trackShareEvent).toHaveBeenCalledWith(
      'share_initiated',
      'facebook',
      '',
      '',
      'event-123',
      undefined
    );
  });

  it('should track successful share completion', () => {
    const { result } = renderHook(() => useShareTracking());

    act(() => {
      result.current.trackShareComplete('event-123', 'twitter', true);
    });

    expect(mockApi.trackShareEvent).toHaveBeenCalledWith(
      'share_completed',
      'twitter',
      '',
      '',
      'event-123',
      { success: true }
    );
  });

  it('should track failed share completion', () => {
    const { result } = renderHook(() => useShareTracking());

    act(() => {
      result.current.trackShareComplete('event-123', 'twitter', false);
    });

    expect(mockApi.trackShareEvent).toHaveBeenCalledWith(
      'share_failed',
      'twitter',
      '',
      '',
      'event-123',
      { success: false }
    );
  });
});
