/**
 * Custom hook for managing in-app purchases and subscriptions
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Purchase,
  type Product,
  type ProductSubscription as IAPSubscription,
  type PurchaseError,
} from 'react-native-iap';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserSubscription,
  SubscriptionTier,
  SUBSCRIPTION_PLANS,
  getSubscriptionPlanByTier,
} from '../types/subscription.types';
import { useAuth } from '../context/AuthContext';
import { ReceiptValidationService } from '../services/payment/ReceiptValidationService';

const SUBSCRIPTION_STORAGE_KEY = '@user_subscription';
const VERIFIED_ENTITLEMENT_TTL_MS = 15 * 60 * 1000;
const VERIFIED_ENTITLEMENT_CLOCK_SKEW_MS = 2 * 60 * 1000;

interface UseSubscriptionReturn {
  subscription: UserSubscription | null;
  isLoading: boolean;
  error: string | null;
  products: Product[];
  subscriptions: IAPSubscription[];
  purchaseSubscription: (productId: string, planTier: SubscriptionTier) => Promise<void>;
  restorePurchases: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  isPremium: boolean;
  hasFeature: (featureId: string) => boolean;
}

export const useSubscription = (): UseSubscriptionReturn => {
  const { state: authState } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [subscriptions, setSubscriptions] = useState<IAPSubscription[]>([]);

  // Initialize IAP connection
  useEffect(() => {
    let purchaseUpdateSubscription: any;
    let purchaseErrorSubscription: any;

    const initIAP = async () => {
      try {
        await initConnection();
        logger.info('[useSubscription] IAP connection initialized');

        // Get product IDs for current platform
        const productIds = SUBSCRIPTION_PLANS.flatMap(plan => {
          const platformProducts = Platform.OS === 'ios'
            ? [plan.iapProductIds.ios.monthly, plan.iapProductIds.ios.yearly]
            : [plan.iapProductIds.android.monthly, plan.iapProductIds.android.yearly];
          return platformProducts;
        });

        // Fetch products and subscriptions using fetchProducts
        const allProducts = await fetchProducts({ skus: productIds, type: 'all' });
        const fetchedProducts = (allProducts || []).filter(p => p.type === 'in-app') as Product[];
        const fetchedSubs = (allProducts || []).filter(p => p.type === 'subs') as IAPSubscription[];

        setProducts(fetchedProducts);
        setSubscriptions(fetchedSubs);

        // Load saved subscription
        await loadSubscription();

        // Set up purchase listeners
        purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: Purchase) => {
          logger.info('[useSubscription] Purchase updated', { productId: purchase.productId, transactionId: purchase.transactionId });
          const receiptData = purchase.purchaseToken || (purchase as any).transactionReceipt;
          if (receiptData) {
            try {
              await handlePurchaseSuccess(purchase);
              await finishTransaction({ purchase, isConsumable: false });
            } catch (ackErr) {
              logger.warn('[useSubscription] Error acknowledging purchase', ackErr);
            }
          }
        });

        purchaseErrorSubscription = purchaseErrorListener((error: PurchaseError) => {
          logger.warn('[useSubscription] Purchase error', error);
          setError(error.message);
        });

        setIsLoading(false);
      } catch (err) {
        logger.error('[useSubscription] Error initializing IAP', err);
        setError('Failed to initialize in-app purchases');
        setIsLoading(false);
      }
    };

    initIAP();

    return () => {
      if (purchaseUpdateSubscription) {
        purchaseUpdateSubscription.remove();
      }
      if (purchaseErrorSubscription) {
        purchaseErrorSubscription.remove();
      }
      endConnection();
    };
  }, []);

  const loadSubscription = async () => {
    try {
      const stored = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (stored) {
        const parsedSub: UserSubscription = JSON.parse(stored);
        // Check if subscription is still valid
        if (new Date(parsedSub.endDate) > new Date()) {
          if (isStoredSubscriptionTrusted(parsedSub)) {
            setSubscription(parsedSub);
          } else {
            setSubscription(null);
          }
        } else {
          // Subscription expired
          setSubscription({
            ...parsedSub,
            status: 'expired',
          });
        }
      }
    } catch (err) {
      logger.error('[useSubscription] Error loading subscription', err);
    }
  };

  const saveSubscription = async (sub: UserSubscription) => {
    try {
      await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(sub));
      setSubscription(sub);
    } catch (err) {
      logger.error('[useSubscription] Error saving subscription', err);
    }
  };

  const isStoredSubscriptionTrusted = (sub: UserSubscription): boolean => {
    if ((sub.tier !== 'premium' && sub.tier !== 'pro') || sub.status !== 'active') {
      return true;
    }

    const verifiedAt = Date.parse(sub.verifiedAt || '');
    const age = Date.now() - verifiedAt;
    return sub.serverVerified === true
      && Number.isFinite(verifiedAt)
      && age >= -VERIFIED_ENTITLEMENT_CLOCK_SKEW_MS
      && age <= VERIFIED_ENTITLEMENT_TTL_MS;
  };

  const handlePurchaseSuccess = async (purchase: Purchase) => {
    try {
      // Determine which plan was purchased
      const planTier = determinePlanTier(purchase.productId);
      const plan = getSubscriptionPlanByTier(planTier);

      if (!plan) {
        throw new Error('Unknown plan purchased');
      }

      const receiptData = purchase.purchaseToken || (purchase as any).transactionReceipt || '';
      const validation = await ReceiptValidationService.getInstance().validateReceipt({
        transactionId: purchase.transactionId || purchase.id || '',
        productId: purchase.productId,
        purchaseDate: purchase.transactionDate || Date.now(),
        platform: Platform.OS as 'ios' | 'android',
        receiptData,
      });

      if (!validation.valid) {
        throw new Error(validation.error || 'Receipt validation failed');
      }
      if (!Number.isFinite(validation.expiryDate) || validation.expiryDate <= Date.now()) {
        throw new Error('Receipt validation did not return a future subscription expiry');
      }

      // Create subscription object
      const newSubscription: UserSubscription = {
        userId: authState.user?.id ?? 'anonymous',
        tier: planTier,
        plan,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(validation.expiryDate).toISOString(),
        autoRenew: true,
        platform: Platform.OS as 'ios' | 'android',
        productId: purchase.productId,
        transactionId: validation.transactionId || purchase.transactionId || purchase.id,
        originalTransactionId: (purchase as any).originalTransactionIdentifierIOS || purchase.transactionId || purchase.id || "",
        receipt: receiptData,
        ...(planTier === 'premium' || planTier === 'pro'
          ? {
              serverVerified: true,
              verifiedAt: new Date().toISOString(),
            }
          : {}),
      };

      await saveSubscription(newSubscription);
      setError(null);
    } catch (err) {
      logger.error('[useSubscription] Error handling purchase', err);
      setError('Failed to activate subscription');
      throw err;
    }
  };

  const determinePlanTier = (productId: string): SubscriptionTier => {
    for (const plan of SUBSCRIPTION_PLANS) {
      const platformIds = Platform.OS === 'ios'
        ? plan.iapProductIds.ios
        : plan.iapProductIds.android;

      if (platformIds.monthly === productId || platformIds.yearly === productId) {
        return plan.tier;
      }
    }
    return 'free';
  };

  const calculateEndDate = (productId: string): string => {
    const isYearly = productId.includes('yearly');
    const now = new Date();
    if (isYearly) {
      now.setFullYear(now.getFullYear() + 1);
    } else {
      now.setMonth(now.getMonth() + 1);
    }
    return now.toISOString();
  };

  const purchaseSubscription = useCallback(
    async (productId: string, _planTier: SubscriptionTier) => {
      try {
        setIsLoading(true);
        setError(null);

        // v14 API uses requestPurchase with platform-specific params
        if (Platform.OS === 'ios') {
          await requestPurchase({
            request: { ios: { sku: productId } },
            type: 'subs',
          });
        } else {
          await requestPurchase({
            request: { android: { skus: [productId] } },
            type: 'subs',
          });
        }
        setIsLoading(false);
      } catch (err: any) {
        logger.error('[useSubscription] Purchase error', err);
        setError(err.message || 'Purchase failed');
        setIsLoading(false);
      }
    },
    [],
  );

  const restorePurchases = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Implement restore purchases
      // This requires calling getAvailablePurchases() and verifying receipts

      setIsLoading(false);
    } catch (err: any) {
      logger.error('[useSubscription] Restore error', err);
      setError(err.message || 'Restore failed');
      setIsLoading(false);
    }
  }, []);

  const cancelSubscription = useCallback(async () => {
    try {
      if (!subscription) return;

      // Update subscription status
      const updatedSub: UserSubscription = {
        ...subscription,
        status: 'canceled',
        autoRenew: false,
      };

      await saveSubscription(updatedSub);
    } catch (err) {
      logger.error('[useSubscription] Cancel error', err);
      setError('Failed to cancel subscription');
    }
  }, [subscription]);

  const isPremium = subscription?.tier !== 'free' && subscription?.status === 'active';

  const hasFeature = useCallback(
    (featureId: string): boolean => {
      if (!subscription) return false;

      const plan = subscription.plan;
      const feature = plan.features.find(f => f.id === featureId);

      return feature?.included || false;
    },
    [subscription],
  );

  return {
    subscription,
    isLoading,
    error,
    products,
    subscriptions,
    purchaseSubscription,
    restorePurchases,
    cancelSubscription,
    isPremium,
    hasFeature,
  };
};
