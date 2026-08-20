/**
 * useSearchLimit Hook Tests
 * Day 5 Continuation - Remaining Hooks
 *
 * Tests for search limit tracking and enforcement by subscription tier
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSearchLimit, SEARCH_LIMITS } from '../../../hooks/useSearchLimit';
import { SubscriptionTier } from '../../../types/subscription.types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock auth and subscription state
let mockAuthState = {
  isAuthenticated: false,
  user: null,
};

let mockSubscription = null;

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    state: mockAuthState,
  }),
}));

jest.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => ({
    subscription: mockSubscription,
  }),
}));

describe('useSearchLimit Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = { isAuthenticated: false, user: null };
    mockSubscription = null;
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Tier Detection', () => {
    it('should detect anonymous tier when not authenticated', async () => {
      mockAuthState = { isAuthenticated: false, user: null };

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tier).toBe('anonymous');
      expect(result.current.searchLimit).toBe(SEARCH_LIMITS.anonymous.searches);
      expect(result.current.resultsLimit).toBe(SEARCH_LIMITS.anonymous.results);
    });

    it('should detect free tier when authenticated without subscription', async () => {
      mockAuthState = { isAuthenticated: true, user: { id: '1', email: 'test@example.com' } };
      mockSubscription = null;

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tier).toBe('free');
      expect(result.current.searchLimit).toBe(SEARCH_LIMITS.free.searches);
      expect(result.current.resultsLimit).toBe(SEARCH_LIMITS.free.results);
    });

    it('should detect basic tier when user has basic subscription', async () => {
      mockAuthState = { isAuthenticated: true, user: { id: '1', email: 'test@example.com' } };
      mockSubscription = { tier: 'basic' as SubscriptionTier };

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tier).toBe('basic');
      expect(result.current.searchLimit).toBe(SEARCH_LIMITS.basic.searches);
      expect(result.current.resultsLimit).toBe(SEARCH_LIMITS.basic.results);
    });

    it('should detect premium tier when user has premium subscription', async () => {
      mockAuthState = { isAuthenticated: true, user: { id: '1', email: 'test@example.com' } };
      mockSubscription = {
        tier: 'premium' as SubscriptionTier,
        status: 'active',
        serverVerified: true,
        verifiedAt: new Date().toISOString(),
      };

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tier).toBe('premium');
      expect(result.current.searchLimit).toBe(Infinity);
      expect(result.current.resultsLimit).toBe(Infinity);
    });

    it('should detect pro tier when user has pro subscription', async () => {
      mockAuthState = { isAuthenticated: true, user: { id: '1', email: 'test@example.com' } };
      mockSubscription = {
        tier: 'pro' as SubscriptionTier,
        status: 'active',
        serverVerified: true,
        verifiedAt: new Date().toISOString(),
      };

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tier).toBe('pro');
      expect(result.current.searchLimit).toBe(Infinity);
      expect(result.current.resultsLimit).toBe(Infinity);
    });
  });

  describe('Search Limits by Tier', () => {
    it('should enforce anonymous limits: 3 searches, 5 results', async () => {
      mockAuthState = { isAuthenticated: false, user: null };

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.searchLimit).toBe(3);
      expect(result.current.resultsLimit).toBe(5);
    });

    it('should enforce free limits: 20 searches, 5 results', async () => {
      mockAuthState = { isAuthenticated: true, user: { id: '1' } };
      mockSubscription = null;

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.searchLimit).toBe(20);
      expect(result.current.resultsLimit).toBe(5);
    });

    it('should enforce basic limits: 200 searches, 50 results', async () => {
      mockAuthState = { isAuthenticated: true, user: { id: '1' } };
      mockSubscription = { tier: 'basic' as SubscriptionTier };

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.searchLimit).toBe(200);
      expect(result.current.resultsLimit).toBe(50);
    });

    it('should enforce premium unlimited: Infinity searches and results', async () => {
      mockAuthState = { isAuthenticated: true, user: { id: '1' } };
      mockSubscription = {
        tier: 'premium' as SubscriptionTier,
        status: 'active',
        serverVerified: true,
        verifiedAt: new Date().toISOString(),
      };

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.searchLimit).toBe(Infinity);
      expect(result.current.resultsLimit).toBe(Infinity);
    });

    it('should enforce pro unlimited: Infinity searches and results', async () => {
      mockAuthState = { isAuthenticated: true, user: { id: '1' } };
      mockSubscription = {
        tier: 'pro' as SubscriptionTier,
        status: 'active',
        serverVerified: true,
        verifiedAt: new Date().toISOString(),
      };

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.searchLimit).toBe(Infinity);
      expect(result.current.resultsLimit).toBe(Infinity);
    });
  });

  describe('Search Count Management', () => {
    it('should start with 0 searches used', async () => {
      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.searchesUsed).toBe(0);
    });

    it('should increment search count', async () => {
      mockAuthState = { isAuthenticated: false, user: null }; // Anonymous: 3 searches

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let allowed = false;
      await act(async () => {
        allowed = await result.current.incrementSearchCount();
      });

      expect(allowed).toBe(true);
      expect(result.current.searchesUsed).toBe(1);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@search_count', '1');
    });

    it('should not increment beyond search limit', async () => {
      mockAuthState = { isAuthenticated: false, user: null }; // Anonymous: 3 searches
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@search_count') return Promise.resolve('3');
        if (key === '@search_date') return Promise.resolve(new Date().toDateString());
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.searchesUsed).toBe(3);

      let allowed = false;
      await act(async () => {
        allowed = await result.current.incrementSearchCount();
      });

      expect(allowed).toBe(false);
      expect(result.current.searchesUsed).toBe(3); // Unchanged
    });

    it('should reset search count', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@search_count') return Promise.resolve('5');
        if (key === '@search_date') return Promise.resolve(new Date().toDateString());
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.searchesUsed).toBe(5);

      await act(async () => {
        await result.current.resetSearchCount();
      });

      expect(result.current.searchesUsed).toBe(0);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@search_count', '0');
    });

    it('should load search count from storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@search_count') return Promise.resolve('7');
        if (key === '@search_date') return Promise.resolve(new Date().toDateString());
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.searchesUsed).toBe(7);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@search_count');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@search_date');
    });

    it('should calculate remaining searches correctly', async () => {
      mockAuthState = { isAuthenticated: false, user: null }; // Anonymous: 3 searches
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@search_count') return Promise.resolve('2');
        if (key === '@search_date') return Promise.resolve(new Date().toDateString());
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.searchesUsed).toBe(2);
      expect(result.current.searchLimit).toBe(3);
      expect(result.current.remainingSearches).toBe(1);
    });
  });

  describe('Limit Checks', () => {
    it('should return true from canPerformSearch when below limit', async () => {
      mockAuthState = { isAuthenticated: false, user: null }; // Anonymous: 3 searches

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canPerformSearch()).toBe(true);
    });

    it('should return false from canPerformSearch when at limit', async () => {
      mockAuthState = { isAuthenticated: false, user: null }; // Anonymous: 3 searches
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@search_count') return Promise.resolve('3');
        if (key === '@search_date') return Promise.resolve(new Date().toDateString());
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canPerformSearch()).toBe(false);
    });

    it('should set hasReachedLimit to true when at limit', async () => {
      mockAuthState = { isAuthenticated: false, user: null }; // Anonymous: 3 searches
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@search_count') return Promise.resolve('3');
        if (key === '@search_date') return Promise.resolve(new Date().toDateString());
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasReachedLimit).toBe(true);
    });

    it('should set isApproachingLimit when within 5 searches of limit', async () => {
      mockAuthState = { isAuthenticated: true, user: { id: '1' } }; // Free: 20 searches
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@search_count') return Promise.resolve('17');
        if (key === '@search_date') return Promise.resolve(new Date().toDateString());
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.remainingSearches).toBe(3); // 20 - 17 = 3
      expect(result.current.isApproachingLimit).toBe(true);
      expect(result.current.hasReachedLimit).toBe(false);
    });

    it('should always allow search for unlimited tiers', async () => {
      mockAuthState = { isAuthenticated: true, user: { id: '1' } };
      mockSubscription = {
        tier: 'premium' as SubscriptionTier,
        status: 'active',
        serverVerified: true,
        verifiedAt: new Date().toISOString(),
      };

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canPerformSearch()).toBe(true);
      expect(result.current.hasReachedLimit).toBe(false);
      expect(result.current.isApproachingLimit).toBe(false);
    });
  });

  describe('Reset Time', () => {
    it('should calculate reset time as midnight tomorrow', async () => {
      mockAuthState = { isAuthenticated: false, user: null }; // Anonymous: 3 searches

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.resetTime).toBeInstanceOf(Date);

      const resetTime = result.current.resetTime!;
      expect(resetTime.getHours()).toBe(0);
      expect(resetTime.getMinutes()).toBe(0);
      expect(resetTime.getSeconds()).toBe(0);
      expect(resetTime.getMilliseconds()).toBe(0);
    });

    it('should have null reset time for unlimited tiers', async () => {
      mockAuthState = { isAuthenticated: true, user: { id: '1' } };
      mockSubscription = {
        tier: 'premium' as SubscriptionTier,
        status: 'active',
        serverVerified: true,
        verifiedAt: new Date().toISOString(),
      };

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.resetTime).toBeNull();
    });
  });

  describe('Results Limit', () => {
    it('should return correct results limit via getResultsLimit', async () => {
      mockAuthState = { isAuthenticated: false, user: null }; // Anonymous: 5 results

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.getResultsLimit()).toBe(5);
    });

    it('should vary results limit by tier', async () => {
      // Test anonymous
      mockAuthState = { isAuthenticated: false, user: null };
      const { result: result1 } = renderHook(() => useSearchLimit());
      await waitFor(() => expect(result1.current.isLoading).toBe(false));
      expect(result1.current.resultsLimit).toBe(5);

      // Test basic
      mockAuthState = { isAuthenticated: true, user: { id: '1' } };
      mockSubscription = { tier: 'basic' as SubscriptionTier };
      const { result: result2 } = renderHook(() => useSearchLimit());
      await waitFor(() => expect(result2.current.isLoading).toBe(false));
      expect(result2.current.resultsLimit).toBe(50);

      // Test premium
      mockSubscription = {
        tier: 'premium' as SubscriptionTier,
        status: 'active',
        serverVerified: true,
        verifiedAt: new Date().toISOString(),
      };
      const { result: result3 } = renderHook(() => useSearchLimit());
      await waitFor(() => expect(result3.current.isLoading).toBe(false));
      expect(result3.current.resultsLimit).toBe(Infinity);
    });

    it('should not grant unlimited search for unverified premium subscription cache', async () => {
      mockAuthState = { isAuthenticated: true, user: { id: '1' } };
      mockSubscription = { tier: 'premium' as SubscriptionTier, status: 'active' };

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tier).toBe('free');
      expect(result.current.searchLimit).toBe(SEARCH_LIMITS.free.searches);
      expect(result.current.resultsLimit).toBe(SEARCH_LIMITS.free.results);
      expect(result.current.canPerformSearch()).toBe(true);
    });

    it('should not grant unlimited search for future-dated verifiedAt cache', async () => {
      mockAuthState = { isAuthenticated: true, user: { id: '1' } };
      mockSubscription = {
        tier: 'premium' as SubscriptionTier,
        status: 'active',
        serverVerified: true,
        verifiedAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tier).toBe('free');
      expect(result.current.searchLimit).toBe(SEARCH_LIMITS.free.searches);
    });
  });

  describe('Loading State', () => {
    it('should start with isLoading true', () => {
      const { result } = renderHook(() => useSearchLimit());

      expect(result.current.isLoading).toBe(true);
    });

    it('should set isLoading to false after loading', async () => {
      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Daily Reset', () => {
    it('should reset count on new day', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@search_count') return Promise.resolve('5');
        if (key === '@search_date') return Promise.resolve(yesterday.toDateString());
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useSearchLimit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have reset to 0 because it's a new day
      expect(result.current.searchesUsed).toBe(0);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@search_date', new Date().toDateString());
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@search_count', '0');
    });
  });
});
