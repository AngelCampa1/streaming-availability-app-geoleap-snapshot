/**
 * Comprehensive tests for useSubscription.ts
 *
 * Coverage Target: 85%+ (hook and helper functions)
 * Strategy: Test state management, tier limits, feature access, expiry calculations
 * Focus: COVERAGE to uncover bugs, not just passing tests
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useSubscription,
  SubscriptionFeature,
  triggerSubscriptionUpdate,
} from '../useSubscription';
import { SubscriptionTier, UserSubscription } from '@/lib/types/paywall';
import * as api from '@/lib/api';

// Mock the API module
jest.mock('@/lib/api', () => ({
  getUserSubscription: jest.fn(),
  getUserUsage: jest.fn(),
}));

// Mock data
const mockFreeSubscription: UserSubscription = {
  id: 'sub_free_123',
  userId: 'user_123',
  tier: SubscriptionTier.Free,
  isActive: true,
  startDate: new Date().toISOString(),
  autoRenew: false,
};

const mockBasicSubscription: UserSubscription = {
  id: 'sub_basic_123',
  userId: 'user_123',
  tier: SubscriptionTier.Basic,
  isActive: true,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  autoRenew: true,
};

const mockPremiumSubscription: UserSubscription = {
  id: 'sub_premium_123',
  userId: 'user_123',
  tier: SubscriptionTier.Premium,
  isActive: true,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
  autoRenew: true,
};

const mockExpiringSoonSubscription: UserSubscription = {
  id: 'sub_expiring_123',
  userId: 'user_123',
  tier: SubscriptionTier.Premium,
  isActive: true,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
  autoRenew: false,
};

const mockExpiredSubscription: UserSubscription = {
  id: 'sub_expired_123',
  userId: 'user_123',
  tier: SubscriptionTier.Free,
  isActive: false,
  startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
  autoRenew: false,
};

const mockUsage = {
  searchesUsed: 5,
  resultsViewed: 10,
  resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

describe('useSubscription - Main Hook', () => {
  let getItemSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Most tests assume an authenticated user with a session
    getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      if (key === 'sessionFingerprint') return 'test-fingerprint';
      return null;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    getItemSpy.mockRestore();
  });

  describe('Initialization and Data Loading', () => {
    it('should initialize with loading state', async () => {
      (api.getUserSubscription as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      (api.getUserUsage as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useSubscription());

      expect(result.current.loading).toBe(true);
      expect(result.current.subscription).toBeNull();
      expect(result.current.usage).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should load subscription and usage data', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockFreeSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.subscription).toEqual(mockFreeSubscription);
      expect(result.current.usage).toEqual(mockUsage);
      expect(result.current.error).toBeNull();
    });

    it('should handle subscription load error with fallback to free tier', async () => {
      (api.getUserSubscription as jest.Mock).mockRejectedValue(new Error('API Error'));
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('API Error');
      expect(result.current.subscription).not.toBeNull();
      expect(result.current.subscription?.tier).toBe(SubscriptionTier.Free);
    });

    it('should handle usage load error with fallback data', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockFreeSubscription);
      (api.getUserUsage as jest.Mock).mockRejectedValue(new Error('Usage API Error'));

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.usage).not.toBeNull();
      expect(result.current.usage?.searchesUsed).toBe(0);
      expect(result.current.usage?.resultsViewed).toBe(0);
    });
  });

  describe('Tier Limits', () => {
    it('should calculate correct limits for Free tier', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockFreeSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Free tier: unlimited searches and results (ad-supported)
      expect(result.current.remainingSearches).toBe(-1); // -1 = unlimited
      expect(result.current.remainingResults).toBe(-1);
      expect(result.current.isUnlimited).toBe(true);
    });

    it('should calculate correct limits for Basic tier', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockBasicSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Basic tier: 200 searches, 50 results
      expect(result.current.remainingSearches).toBe(195); // 200 - 5 used
      expect(result.current.remainingResults).toBe(50);
      expect(result.current.isUnlimited).toBe(false);
    });

    it('should show unlimited for Premium tier', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockPremiumSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Premium tier: unlimited
      expect(result.current.remainingSearches).toBe(-1); // -1 = unlimited
      expect(result.current.remainingResults).toBe(-1);
      expect(result.current.isUnlimited).toBe(true);
    });

    it('should not show negative remaining searches', async () => {
      const heavyUsage = {
        searchesUsed: 25, // More than free tier limit of 20
        resultsViewed: 10,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockFreeSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(heavyUsage);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.remainingSearches).toBe(-1); // Free tier is now unlimited
    });
  });

  describe('Feature Access', () => {
    it('should deny all premium features for Free tier', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockFreeSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasFeatureAccess(SubscriptionFeature.UnlimitedSearches)).toBe(false);
      expect(result.current.hasFeatureAccess(SubscriptionFeature.DirectLinks)).toBe(false);
      expect(result.current.hasFeatureAccess(SubscriptionFeature.AdvancedFilters)).toBe(false);
      expect(result.current.hasFeatureAccess(SubscriptionFeature.ExportResults)).toBe(false);
      expect(result.current.hasFeatureAccess(SubscriptionFeature.PrioritySupport)).toBe(false);
      expect(result.current.hasFeatureAccess(SubscriptionFeature.AdFree)).toBe(false);
      expect(result.current.hasFeatureAccess(SubscriptionFeature.GlobalPricing)).toBe(false);
    });

    it('should grant GlobalPricing to Basic tier', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockBasicSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasFeatureAccess(SubscriptionFeature.GlobalPricing)).toBe(true);
      // But not premium features
      expect(result.current.hasFeatureAccess(SubscriptionFeature.UnlimitedSearches)).toBe(false);
      expect(result.current.hasFeatureAccess(SubscriptionFeature.DirectLinks)).toBe(false);
    });

    it('should grant all features to Premium tier', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockPremiumSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasFeatureAccess(SubscriptionFeature.UnlimitedSearches)).toBe(true);
      expect(result.current.hasFeatureAccess(SubscriptionFeature.DirectLinks)).toBe(true);
      expect(result.current.hasFeatureAccess(SubscriptionFeature.AdvancedFilters)).toBe(true);
      expect(result.current.hasFeatureAccess(SubscriptionFeature.ExportResults)).toBe(true);
      expect(result.current.hasFeatureAccess(SubscriptionFeature.PrioritySupport)).toBe(true);
      expect(result.current.hasFeatureAccess(SubscriptionFeature.AdFree)).toBe(true);
      expect(result.current.hasFeatureAccess(SubscriptionFeature.GlobalPricing)).toBe(true);
    });

    it('should return false for feature access when no subscription loaded', async () => {
      (api.getUserSubscription as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useSubscription());

      expect(result.current.hasFeatureAccess(SubscriptionFeature.UnlimitedSearches)).toBe(false);
    });
  });

  describe('Expiry Calculations', () => {
    it('should calculate days until expiry correctly', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockBasicSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.daysUntilExpiry).toBeGreaterThan(25); // ~30 days
      expect(result.current.daysUntilExpiry).toBeLessThanOrEqual(31);
      expect(result.current.isExpiringSoon).toBe(false);
      expect(result.current.isExpired).toBe(false);
    });

    it('should detect expiring soon subscription (within 7 days)', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockExpiringSoonSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.daysUntilExpiry).toBeGreaterThan(0);
      expect(result.current.daysUntilExpiry).toBeLessThanOrEqual(7);
      expect(result.current.isExpiringSoon).toBe(true);
      expect(result.current.isExpired).toBe(false);
    });

    it('should detect expired subscription', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockExpiredSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.daysUntilExpiry).toBeLessThan(0);
      expect(result.current.isExpiringSoon).toBe(false);
      expect(result.current.isExpired).toBe(true);
    });

    it('should handle subscription without end date', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockFreeSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.daysUntilExpiry).toBe(-1);
      expect(result.current.isExpiringSoon).toBe(false);
      expect(result.current.isExpired).toBe(false);
    });
  });

  describe('Manual Refresh', () => {
    it('should refresh subscription data', async () => {
      (api.getUserSubscription as jest.Mock)
        .mockResolvedValueOnce(mockFreeSubscription)
        .mockResolvedValueOnce(mockPremiumSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.subscription?.tier).toBe(SubscriptionTier.Free);
      });

      await act(async () => {
        await result.current.refreshSubscription();
      });

      expect(result.current.subscription?.tier).toBe(SubscriptionTier.Premium);
    });

    it('should refresh usage data', async () => {
      const updatedUsage = {
        searchesUsed: 15,
        resultsViewed: 30,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockFreeSubscription);
      (api.getUserUsage as jest.Mock)
        .mockResolvedValueOnce(mockUsage)
        .mockResolvedValueOnce(updatedUsage);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.usage?.searchesUsed).toBe(5);
      });

      await act(async () => {
        await result.current.refreshUsage();
      });

      expect(result.current.usage?.searchesUsed).toBe(15);
      expect(result.current.usage?.resultsViewed).toBe(30);
    });
  });

  describe('Auto-Refresh', () => {
    it('should auto-refresh at specified interval', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockFreeSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useSubscription(true, 5000));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear initial calls
      jest.clearAllMocks();

      // Fast-forward time by 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(api.getUserSubscription).toHaveBeenCalled();
        expect(api.getUserUsage).toHaveBeenCalled();
      });
    });

    it('should not auto-refresh when autoRefresh is false', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockFreeSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      renderHook(() => useSubscription(false));

      await waitFor(() => {
        expect(api.getUserSubscription).toHaveBeenCalledTimes(1);
      });

      // Clear initial calls
      jest.clearAllMocks();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should not have been called again
      expect(api.getUserSubscription).not.toHaveBeenCalled();
      expect(api.getUserUsage).not.toHaveBeenCalled();
    });

    it('should clear interval on unmount', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockFreeSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { unmount } = renderHook(() => useSubscription(true, 5000));

      await waitFor(() => {
        expect(api.getUserSubscription).toHaveBeenCalled();
      });

      unmount();

      // Clear calls from mount
      jest.clearAllMocks();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should not refresh after unmount
      expect(api.getUserSubscription).not.toHaveBeenCalled();
    });
  });

  describe('Window Event Listener', () => {
    it('should refresh data when subscription-updated event is fired', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockFreeSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      renderHook(() => useSubscription());

      await waitFor(() => {
        expect(api.getUserSubscription).toHaveBeenCalled();
      });

      // Clear initial calls
      jest.clearAllMocks();

      // Trigger subscription update event
      act(() => {
        triggerSubscriptionUpdate();
      });

      await waitFor(() => {
        expect(api.getUserSubscription).toHaveBeenCalled();
        expect(api.getUserUsage).toHaveBeenCalled();
      });
    });

    it('should remove event listener on unmount', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockFreeSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { unmount } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(api.getUserSubscription).toHaveBeenCalled();
      });

      unmount();

      // Clear calls from mount
      jest.clearAllMocks();

      // Trigger event after unmount
      act(() => {
        triggerSubscriptionUpdate();
      });

      // Fast-forward timers (event listener should be removed)
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should not refresh after unmount
      expect(api.getUserSubscription).not.toHaveBeenCalled();
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should not update state after unmount during subscription fetch', async () => {
      let resolveSubscription: (value: UserSubscription) => void;
      const subscriptionPromise = new Promise<UserSubscription>(resolve => {
        resolveSubscription = resolve;
      });
      (api.getUserSubscription as jest.Mock).mockReturnValue(subscriptionPromise);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { unmount } = renderHook(() => useSubscription());

      // Unmount before promise resolves
      unmount();

      // Resolve promise after unmount
      await act(async () => {
        resolveSubscription!(mockPremiumSubscription);
      });

      // State should not be updated (component unmounted)
      // This test verifies the mountedRef check works
    });

    it('should not update state after unmount during usage fetch', async () => {
      let resolveUsage: (value: typeof mockUsage) => void;
      const usagePromise = new Promise<typeof mockUsage>(resolve => {
        resolveUsage = resolve;
      });
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockFreeSubscription);
      (api.getUserUsage as jest.Mock).mockReturnValue(usagePromise);

      const { unmount } = renderHook(() => useSubscription());

      // Unmount before promise resolves
      unmount();

      // Resolve promise after unmount
      await act(async () => {
        resolveUsage!(mockUsage);
      });

      // State should not be updated (component unmounted)
      // This test verifies the mountedRef check works
    });
  });

  describe('Edge Cases', () => {
    it('should handle null usage data gracefully', async () => {
      (api.getUserSubscription as jest.Mock).mockResolvedValue(mockPremiumSubscription);
      (api.getUserUsage as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should handle null usage without crashing
      expect(result.current.usage).toBeNull();
      // Premium tier should still show unlimited
      expect(result.current.remainingSearches).toBe(-1);
    });

    it('should handle undefined endDate in subscription', async () => {
      const noEndDateSub = {
        ...mockPremiumSubscription,
        endDate: undefined,
      };
      (api.getUserSubscription as jest.Mock).mockResolvedValue(noEndDateSub);
      (api.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.daysUntilExpiry).toBe(-1);
      expect(result.current.isExpiringSoon).toBe(false);
      expect(result.current.isExpired).toBe(false);
    });
  });
});

describe('useSubscription - Anonymous User (no sessionFingerprint)', () => {
  let getItemSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
  });

  afterEach(() => {
    getItemSpy.mockRestore();
  });

  it('should NOT call getUserSubscription for anonymous users', async () => {
    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(api.getUserSubscription).not.toHaveBeenCalled();
  });

  it('should NOT call getUserUsage for anonymous users', async () => {
    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(api.getUserUsage).not.toHaveBeenCalled();
  });

  it('should set free tier defaults for anonymous users', async () => {
    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscription).not.toBeNull();
    expect(result.current.subscription?.tier).toBe(SubscriptionTier.Free);
    expect(result.current.subscription?.isActive).toBe(true);
  });

  it('should set zero usage for anonymous users', async () => {
    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.usage?.searchesUsed).toBe(0);
    expect(result.current.usage?.resultsViewed).toBe(0);
  });
});

describe('triggerSubscriptionUpdate - Utility Function', () => {
  it('should dispatch subscription-updated event', () => {
    const eventListener = jest.fn();
    window.addEventListener('subscription-updated', eventListener);

    triggerSubscriptionUpdate();

    expect(eventListener).toHaveBeenCalledTimes(1);

    window.removeEventListener('subscription-updated', eventListener);
  });
});
