/**
 * Comprehensive Tests for useSubscription Hook
 * Tests in-app purchase flows, subscription management, and feature access
 *
 * Test Coverage:
 * - IAP connection initialization
 * - Product/subscription fetching
 * - Purchase flows (success/failure)
 * - Subscription state management
 * - Restore purchases
 * - Cancel subscription
 * - Feature access checks
 * - Cleanup and memory leaks
 */

// Mock logger before any other imports
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
  },
}));

// Mock AsyncStorage
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();
const mockClear = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  get default() {
    return {
      get getItem() { return mockGetItem; },
      get setItem() { return mockSetItem; },
      get removeItem() { return mockRemoveItem; },
      get clear() { return mockClear; },
    };
  },
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((obj) => obj.ios),
}));

// Mock useAuth from AuthContext
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    state: {
      user: { id: 'test-user-123' },
      isAuthenticated: true,
      isLoading: false,
    },
  }),
}));

// Mock types for react-native-iap (v14 API)
import type { Product, ProductSubscription as IAPSubscription, Purchase, PurchaseError } from 'react-native-iap';

// Mock products and subscriptions (using real product IDs from SUBSCRIPTION_PLANS)
const mockProducts: Product[] = [
  {
    id: 'com.geoleap.basic.monthly',
    productId: 'com.geoleap.basic.monthly',
    title: 'Basic Monthly',
    description: 'Basic plan monthly subscription',
    price: 4.99,
    displayPrice: '$4.99',
    currency: 'USD',
    type: 'in-app',
    platform: 'ios',
  } as Product,
];

const mockSubscriptions: IAPSubscription[] = [
  {
    id: 'com.geoleap.premium.yearly',
    productId: 'com.geoleap.premium.yearly',
    title: 'Premium Yearly',
    description: 'Premium plan yearly subscription',
    price: 99.99,
    displayPrice: '$99.99',
    currency: 'USD',
    type: 'subs',
    platform: 'ios',
    subscriptionOffers: [],
  } as IAPSubscription,
];

const mockPurchase: Purchase = {
  id: 'test-transaction-123',
  productId: 'com.geoleap.basic.monthly',
  transactionId: 'test-transaction-123',
  transactionDate: Date.now(),
  purchaseToken: 'mock-purchase-token',
  isAutoRenewing: true,
  purchaseState: 'purchased' as const,
  platform: 'ios' as const,
  store: 'apple' as const,
  quantity: 1,
} as Purchase;

// Mock react-native-iap
let purchaseUpdateCallback: ((purchase: Purchase) => void) | null = null;
let _purchaseErrorCallback: ((error: PurchaseError) => void) | null = null;

const mockInitConnection = jest.fn().mockResolvedValue(true);
const mockEndConnection = jest.fn().mockResolvedValue(undefined);
const mockFetchProducts = jest.fn().mockResolvedValue([...mockProducts, ...mockSubscriptions]);
const mockRequestPurchase = jest.fn().mockResolvedValue(undefined);
const mockFinishTransaction = jest.fn().mockResolvedValue(undefined);
const mockPurchaseUpdatedListener = jest.fn((callback) => {
  purchaseUpdateCallback = callback;
  return { remove: jest.fn() };
});
const mockPurchaseErrorListener = jest.fn((callback) => {
  _purchaseErrorCallback = callback;
  return { remove: jest.fn() };
});

jest.mock('react-native-iap', () => ({
  get initConnection() { return mockInitConnection; },
  get endConnection() { return mockEndConnection; },
  get fetchProducts() { return mockFetchProducts; },
  get requestPurchase() { return mockRequestPurchase; },
  get finishTransaction() { return mockFinishTransaction; },
  get purchaseUpdatedListener() { return mockPurchaseUpdatedListener; },
  get purchaseErrorListener() { return mockPurchaseErrorListener; },
}));

const mockValidateReceipt = jest.fn();

jest.mock('../../../services/payment/ReceiptValidationService', () => ({
  ReceiptValidationService: {
    getInstance: () => ({
      validateReceipt: mockValidateReceipt,
    }),
  },
}));

// Import after mocks are set up
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSubscription } from '../../../hooks/useSubscription';
import type { UserSubscription } from '../../../types/subscription.types';
import { getSubscriptionPlanByTier } from '../../../types/subscription.types';

describe('useSubscription Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockInitConnection.mockResolvedValue(true);
    mockFetchProducts.mockResolvedValue([...mockProducts, ...mockSubscriptions]);
    mockRequestPurchase.mockResolvedValue(undefined);
    mockValidateReceipt.mockResolvedValue({
      valid: true,
      transactionId: 'verified-transaction-123',
      expiryDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    // Reset callbacks
    purchaseUpdateCallback = null;
    _purchaseErrorCallback = null;
  });

  // ============================================
  // Initialization Tests (2 tests)
  // ============================================

  it('should initialize IAP connection successfully', async () => {
    const { result } = renderHook(() => useSubscription());

    // Wait for initialization to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

    expect(mockInitConnection).toHaveBeenCalled();
    expect(mockFetchProducts).toHaveBeenCalled();
    expect(result.current.products).toHaveLength(1);
    expect(result.current.subscriptions).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('should handle IAP connection initialization failure', async () => {
    const errorMessage = 'IAP connection failed';
    mockInitConnection.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to initialize in-app purchases');
    expect(result.current.products).toHaveLength(0);
  });

  // ============================================
  // Product Fetching Tests (2 tests)
  // ============================================

  it('should fetch products and subscriptions', async () => {
    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products).toEqual(mockProducts);
    expect(result.current.subscriptions).toEqual(mockSubscriptions);
  });

  it('should handle product fetch errors gracefully', async () => {
    mockFetchProducts.mockRejectedValue(new Error('Product fetch failed'));

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to initialize in-app purchases');
  });

  // ============================================
  // Purchase Flow Tests (3 tests)
  // ============================================

  it('should handle subscription purchase successfully', async () => {
    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Trigger purchase
    await act(async () => {
      await result.current.purchaseSubscription('com.geoleap.basic.monthly', 'basic');
    });

    expect(mockRequestPurchase).toHaveBeenCalledWith({
      request: { ios: { sku: 'com.geoleap.basic.monthly' } },
      type: 'subs',
    });
  });

  it('should handle purchase failure with error state', async () => {
    const errorMessage = 'User canceled purchase';
    mockRequestPurchase.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.purchaseSubscription('com.geoleap.basic.monthly', 'basic');
    });

    await waitFor(() => expect(result.current.error).toBe(errorMessage));
  });

  it('should process verified purchase update and save subscription', async () => {
    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Simulate purchase update
    await act(async () => {
      if (purchaseUpdateCallback) {
        await purchaseUpdateCallback(mockPurchase);
      }
    });

    // Should save subscription
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalled();
      expect(result.current.subscription).not.toBeNull();
      expect(result.current.subscription?.status).toBe('active');
      expect(result.current.subscription?.productId).toBe('com.geoleap.basic.monthly');
    });

    expect(mockValidateReceipt).toHaveBeenCalledWith(expect.objectContaining({
      transactionId: 'test-transaction-123',
      productId: 'com.geoleap.basic.monthly',
      receiptData: 'mock-purchase-token',
      platform: 'ios',
    }));

    // Should finish transaction
    expect(mockFinishTransaction).toHaveBeenCalledWith({
      purchase: mockPurchase,
      isConsumable: false,
    });
  });

  it('should not activate or finish purchase when receipt validation fails', async () => {
    mockValidateReceipt.mockResolvedValueOnce({
      valid: false,
      error: 'Invalid receipt',
    });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      if (purchaseUpdateCallback) {
        await purchaseUpdateCallback(mockPurchase);
      }
    });

    await waitFor(() => expect(result.current.error).toBe('Failed to activate subscription'));

    expect(mockSetItem).not.toHaveBeenCalledWith('@user_subscription', expect.any(String));
    expect(result.current.subscription).toBeNull();
    expect(result.current.isPremium).toBe(false);
    expect(mockFinishTransaction).not.toHaveBeenCalled();
  });

  // ============================================
  // Subscription State Tests (3 tests)
  // ============================================

  it('should load saved subscription from storage', async () => {
    const basicPlan = getSubscriptionPlanByTier('basic')!;
    const savedSubscription: UserSubscription = {
      userId: 'test-user',
      tier: 'basic',
      plan: basicPlan,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: true,
      platform: 'ios',
      productId: 'com.geoleap.basic.monthly',
      transactionId: 'saved-transaction',
      originalTransactionId: 'original-saved',
      receipt: 'saved-receipt',
    };

    mockGetItem.mockResolvedValue(JSON.stringify(savedSubscription));

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.subscription).not.toBeNull();
    expect(result.current.subscription?.tier).toBe('basic');
    expect(result.current.subscription?.status).toBe('active');
  });

  it('should mark expired subscription as expired', async () => {
    const basicPlan = getSubscriptionPlanByTier('basic')!;
    const expiredSubscription: UserSubscription = {
      userId: 'test-user',
      tier: 'basic',
      plan: basicPlan,
      status: 'active',
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Expired 30 days ago
      autoRenew: true,
      platform: 'ios',
      productId: 'com.geoleap.basic.monthly',
      transactionId: 'expired-transaction',
      originalTransactionId: 'original-expired',
      receipt: 'expired-receipt',
    };

    mockGetItem.mockResolvedValue(JSON.stringify(expiredSubscription));

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.subscription?.status).toBe('expired');
    expect(result.current.isPremium).toBe(false);
  });

  it('should handle subscription storage errors gracefully', async () => {
    mockGetItem.mockRejectedValue(new Error('Storage error'));

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should continue without crashing
    expect(result.current.subscription).toBeNull();
  });

  // ============================================
  // Restore Purchases Test (1 test)
  // ============================================

  it('should handle restore purchases request', async () => {
    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.restorePurchases();
    });

    // Should complete without errors
    expect(result.current.error).toBeNull();
  });

  // ============================================
  // Cancel Subscription Test (1 test)
  // ============================================

  it('should cancel subscription and update status', async () => {
    const basicPlan = getSubscriptionPlanByTier('basic')!;
    const activeSubscription: UserSubscription = {
      userId: 'test-user',
      tier: 'basic',
      plan: basicPlan,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: true,
      platform: 'ios',
      productId: 'com.geoleap.basic.monthly',
      transactionId: 'active-transaction',
      originalTransactionId: 'original-active',
      receipt: 'active-receipt',
    };

    mockGetItem.mockResolvedValue(JSON.stringify(activeSubscription));

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.subscription?.status).toBe('active'));

    await act(async () => {
      await result.current.cancelSubscription();
    });

    await waitFor(() => {
      expect(result.current.subscription?.status).toBe('canceled');
      expect(result.current.subscription?.autoRenew).toBe(false);
    });
  });

  // ============================================
  // Feature Access Tests (2 tests)
  // ============================================

  it('should correctly determine premium status', async () => {
    const premiumPlan = getSubscriptionPlanByTier('premium')!;
    const premiumSubscription: UserSubscription = {
      userId: 'test-user',
      tier: 'premium',
      plan: premiumPlan,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: true,
      platform: 'ios',
      productId: 'com.geoleap.premium.monthly',
      transactionId: 'premium-transaction',
      originalTransactionId: 'original-premium',
      receipt: 'premium-receipt',
    };
    (premiumSubscription as any).serverVerified = true;
    (premiumSubscription as any).verifiedAt = new Date().toISOString();

    mockGetItem.mockResolvedValue(JSON.stringify(premiumSubscription));

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isPremium).toBe(true);
  });

  it('should not trust unverified cached premium subscription for local entitlement', async () => {
    const premiumPlan = getSubscriptionPlanByTier('premium')!;
    const tamperedSubscription: UserSubscription = {
      userId: 'test-user',
      tier: 'premium',
      plan: premiumPlan,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: true,
      platform: 'ios',
      productId: 'com.geoleap.premium.monthly',
      transactionId: 'tampered-transaction',
      originalTransactionId: 'original-tampered',
      receipt: 'tampered-receipt',
    };

    mockGetItem.mockResolvedValue(JSON.stringify(tamperedSubscription));

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.subscription).toBeNull();
    expect(result.current.isPremium).toBe(false);
  });

  it('should check feature availability correctly', async () => {
    const basicPlan = getSubscriptionPlanByTier('basic')!;
    const subscriptionWithFeatures: UserSubscription = {
      userId: 'test-user',
      tier: 'basic',
      plan: basicPlan,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: true,
      platform: 'ios',
      productId: 'com.geoleap.basic.monthly',
      transactionId: 'feature-transaction',
      originalTransactionId: 'original-feature',
      receipt: 'feature-receipt',
    };

    mockGetItem.mockResolvedValue(JSON.stringify(subscriptionWithFeatures));

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Test with real basic plan features (ads, unlimited-services, vpn-all, watchlist-50)
    expect(result.current.hasFeature('ads')).toBe(true);
    expect(result.current.hasFeature('unlimited-services')).toBe(true);
    expect(result.current.hasFeature('notifications')).toBe(false); // Not in basic plan
    expect(result.current.hasFeature('unknown_feature')).toBe(false);
  });

  // ============================================
  // Cleanup Test (1 test)
  // ============================================

  it('should cleanup listeners and connection on unmount', async () => {
    const { unmount } = renderHook(() => useSubscription());

    await waitFor(() => expect(mockInitConnection).toHaveBeenCalled());

    unmount();

    expect(mockEndConnection).toHaveBeenCalled();
  });
});
