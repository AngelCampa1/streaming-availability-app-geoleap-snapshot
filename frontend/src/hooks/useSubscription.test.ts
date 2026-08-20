import { renderHook, waitFor } from '@testing-library/react';
import { useSubscription, SubscriptionFeature } from './useSubscription';
import { SubscriptionTier } from '@/lib/types/paywall';

// Mock the API calls
jest.mock('@/lib/api', () => ({
  getUserSubscription: jest.fn(),
  getUserUsage: jest.fn(),
}));

import { getUserSubscription, getUserUsage } from '@/lib/api';

const mockGetUserSubscription = getUserSubscription as jest.MockedFunction<typeof getUserSubscription>;
const mockGetUserUsage = getUserUsage as jest.MockedFunction<typeof getUserUsage>;

const mockUsage = {
  searchesUsed: 0,
  resultsViewed: 0,
  resetTime: new Date(Date.now() + 86400000).toISOString(),
};

describe('useSubscription', () => {
  let getItemSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserUsage.mockResolvedValue(mockUsage);
    // Simulate authenticated user with a session
    getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      if (key === 'sessionFingerprint') return 'test-fingerprint';
      return null;
    });
  });

  afterEach(() => {
    getItemSpy.mockRestore();
  });

  it('Free tier returns unlimited searches (-1)', async () => {
    mockGetUserSubscription.mockResolvedValue({
      id: '1',
      userId: 'u1',
      tier: SubscriptionTier.Free,
      isActive: true,
      startDate: new Date().toISOString(),
      autoRenew: false,
    });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.remainingSearches).toBe(-1);
  });

  it('Premium tier returns unlimited searches (-1)', async () => {
    mockGetUserSubscription.mockResolvedValue({
      id: '1',
      userId: 'u1',
      tier: SubscriptionTier.Premium,
      isActive: true,
      startDate: new Date().toISOString(),
      autoRenew: false,
    });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.remainingSearches).toBe(-1);
  });

  it('Free tier does NOT have AdFree feature access', async () => {
    mockGetUserSubscription.mockResolvedValue({
      id: '1',
      userId: 'u1',
      tier: SubscriptionTier.Free,
      isActive: true,
      startDate: new Date().toISOString(),
      autoRenew: false,
    });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasFeatureAccess(SubscriptionFeature.AdFree)).toBe(false);
  });

  it('Premium tier HAS AdFree feature access', async () => {
    mockGetUserSubscription.mockResolvedValue({
      id: '1',
      userId: 'u1',
      tier: SubscriptionTier.Premium,
      isActive: true,
      startDate: new Date().toISOString(),
      autoRenew: false,
    });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasFeatureAccess(SubscriptionFeature.AdFree)).toBe(true);
  });

  it('isUnlimited is true for Free tier', async () => {
    mockGetUserSubscription.mockResolvedValue({
      id: '1',
      userId: 'u1',
      tier: SubscriptionTier.Free,
      isActive: true,
      startDate: new Date().toISOString(),
      autoRenew: false,
    });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isUnlimited).toBe(true);
  });
});
