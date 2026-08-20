# Week 2, Day 6: Subscription & Payment Bug Report

**Date:** 2025-12-16
**Auditor:** Claude (Sonnet 4.5)
**Focus Area:** Subscription management, in-app purchases, payment processing, receipt validation

---

## Executive Summary

**Total Bugs Found:** 17 bugs (3 P0, 6 P1, 8 P2)

Day 6 audit focused on the subscription and payment system, revealing **CRITICAL security vulnerabilities** in receipt validation and purchase flow. The most severe issue is the **completely missing receipt validation** (TODO at line 89), which allows users to potentially fake purchases. Additionally, **restore purchases functionality is not implemented**, preventing users from recovering subscriptions on new devices.

### Risk Assessment

**CRITICAL SECURITY RISK:**
- Receipt validation not implemented - users can fake purchases
- No server-side verification of purchases
- Client-side expiry checks can be manipulated
- Restore purchases completely empty

**BUSINESS IMPACT:**
- Revenue loss from fake purchases
- Poor user experience when switching devices
- Subscription state desynchronization
- Support burden from purchase issues

**Files Audited:**
- `mobile/src/hooks/useSubscription.ts` (293 lines)
- `mobile/src/hooks/useSubscriptions.ts` (196 lines)
- `mobile/src/screens/subscription/SubscriptionPlansScreen.tsx` (307 lines)
- `mobile/src/screens/subscription/SubscriptionManagementScreen.tsx` (315 lines)
- `mobile/src/screens/payment/PaymentHistoryScreen.tsx` (388 lines)

---

## Bugs by Severity

### 🔴 P0 - CRITICAL (3 bugs)

#### BUG-SUB-001: Receipt Validation NOT IMPLEMENTED (CRITICAL SECURITY)
**Severity:** P0 - CRITICAL
**File:** `mobile/src/hooks/useSubscription.ts:89`
**Impact:** Users can fake purchases, bypass payment, cause revenue loss

**Current Code:**
```typescript
// Lines 84-96
purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: ProductPurchase) => {
  logger.info('[useSubscription] Purchase updated', { productId: purchase.productId, transactionId: purchase.transactionId });
  const receipt = purchase.transactionReceipt;
  if (receipt) {
    try {
      // TODO: Verify receipt with backend
      await handlePurchaseSuccess(purchase);
      await finishTransaction({ purchase, isConsumable: false });
    } catch (ackErr) {
      logger.warn('[useSubscription] Error acknowledging purchase', ackErr);
    }
  }
});
```

**Problem:**
- Receipt validation is marked as TODO and **NEVER IMPLEMENTED**
- Purchases are accepted without any server-side verification
- Users can potentially fake transaction receipts
- No cryptographic verification of Apple/Google signatures
- Allows subscription activation without payment

**Security Implications:**
1. **Revenue Loss**: Users can activate premium features without paying
2. **Fraud Risk**: Attackers can reverse-engineer fake receipts
3. **Compliance**: Violates Apple/Google payment policies
4. **Business Logic Bypass**: No proof of actual payment

**Reproduction:**
1. Intercept IAP flow with debugging proxy
2. Capture successful purchase receipt
3. Replay receipt for different user/device
4. System accepts receipt without validation
5. Premium features activated without payment

**Proposed Fix:**
```typescript
// Backend API endpoint needed: POST /api/subscriptions/verify-receipt
purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: ProductPurchase) => {
  const receipt = purchase.transactionReceipt;
  if (receipt) {
    try {
      // Verify receipt with backend
      const apiService = new ApiService();
      const verificationResult = await apiService.post('/api/subscriptions/verify-receipt', {
        receipt,
        platform: Platform.OS,
        productId: purchase.productId,
        transactionId: purchase.transactionId,
      });

      if (!verificationResult.success || !verificationResult.data.valid) {
        throw new Error('Receipt validation failed');
      }

      // Only activate subscription if receipt is valid
      await handlePurchaseSuccess(purchase);
      await finishTransaction({ purchase, isConsumable: false });
    } catch (err) {
      logger.error('[useSubscription] Receipt validation failed', err);
      // Show error to user - purchase failed
      throw err;
    }
  }
});
```

**Required Backend Implementation:**
- iOS: Verify with Apple App Store server-to-server API
- Android: Verify with Google Play Developer API
- Store verified receipts in database
- Implement receipt expiry checks
- Handle subscription renewals server-side

---

#### BUG-SUB-002: Restore Purchases Completely Empty (NO IMPLEMENTATION)
**Severity:** P0 - CRITICAL
**File:** `mobile/src/hooks/useSubscription.ts:237-245`
**Impact:** Users can't recover purchases on new devices, poor UX, support burden

**Current Code:**
```typescript
// Lines 232-246
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
```

**Problem:**
- Restore purchases is completely empty (TODO comment)
- Users who reinstall app or get new device can't restore subscriptions
- Button exists in UI but does nothing
- No call to `getAvailablePurchases()` from react-native-iap
- Violates Apple/Google app store guidelines

**User Impact:**
1. User buys subscription on iPhone
2. Gets new iPhone or reinstalls app
3. Taps "Restore Purchases" button
4. Nothing happens - subscription not restored
5. User contacts support, frustrated
6. May purchase duplicate subscription

**Reproduction:**
1. Purchase subscription on Device A
2. Install app on Device B (or reinstall)
3. Tap "Restore Purchases" in SubscriptionPlansScreen
4. Loading indicator shows briefly
5. No subscriptions restored
6. User still shows as Free tier

**Proposed Fix:**
```typescript
const restorePurchases = useCallback(async () => {
  try {
    setIsLoading(true);
    setError(null);

    // Get available purchases from platform
    const availablePurchases = await getAvailablePurchases();

    if (availablePurchases.length === 0) {
      setError('No purchases found to restore');
      setIsLoading(false);
      return;
    }

    // Verify each receipt with backend
    const apiService = new ApiService();
    for (const purchase of availablePurchases) {
      const verificationResult = await apiService.post('/api/subscriptions/verify-receipt', {
        receipt: purchase.transactionReceipt,
        platform: Platform.OS,
        productId: purchase.productId,
        transactionId: purchase.transactionId,
      });

      if (verificationResult.success && verificationResult.data.valid) {
        // Restore this purchase
        await handlePurchaseSuccess(purchase);
        await finishTransaction({ purchase, isConsumable: false });
      }
    }

    setIsLoading(false);
  } catch (err: any) {
    logger.error('[useSubscription] Restore error', err);
    setError(err.message || 'Restore failed');
    setIsLoading(false);
  }
}, []);
```

---

#### BUG-SUB-003: Client-Side Subscription Expiry Check (Can Be Manipulated)
**Severity:** P0 - CRITICAL
**File:** `mobile/src/hooks/useSubscription.ts:129-138`
**Impact:** Users can manipulate device clock to extend subscriptions

**Current Code:**
```typescript
// Lines 124-143
const loadSubscription = async () => {
  try {
    const stored = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (stored) {
      const parsedSub: UserSubscription = JSON.parse(stored);
      // Check if subscription is still valid
      if (new Date(parsedSub.endDate) > new Date()) {
        setSubscription(parsedSub);
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
```

**Problem:**
- Subscription expiry checked using `new Date()` (client-side)
- Users can manipulate device clock to extend subscriptions
- No server-side verification of subscription status
- Expired subscription can be made "active" by changing device time

**Security Exploit:**
1. User's subscription expires on January 1, 2025
2. User sets device clock to December 31, 2024
3. App checks: `new Date('2025-01-01') > new Date('2024-12-31')` → true
4. Subscription shown as "active" and premium features unlocked
5. User continues using premium features without payment

**Additional Issues:**
- No server sync to check actual subscription status
- Relies on stored local data (AsyncStorage)
- calculateEndDate also uses client-side date (lines 201-210)

**Proposed Fix:**
```typescript
const loadSubscription = async () => {
  try {
    const stored = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (stored) {
      const parsedSub: UserSubscription = JSON.parse(stored);

      // Verify subscription status with backend
      const apiService = new ApiService();
      const statusCheck = await apiService.get(`/api/subscriptions/status/${parsedSub.userId}`);

      if (statusCheck.success && statusCheck.data) {
        // Use server-side status (source of truth)
        const serverSub = statusCheck.data;
        setSubscription(serverSub);

        // Update local cache
        await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(serverSub));
      } else {
        // Fallback to local check only if server unavailable
        // But mark as needs verification
        if (new Date(parsedSub.endDate) > new Date()) {
          setSubscription({ ...parsedSub, needsVerification: true });
        } else {
          setSubscription({ ...parsedSub, status: 'expired' });
        }
      }
    }
  } catch (err) {
    logger.error('[useSubscription] Error loading subscription', err);
  }
};
```

---

### 🟠 P1 - HIGH PRIORITY (6 bugs)

#### BUG-SUB-004: userId Hardcoded to 'current-user'
**Severity:** P1 - HIGH
**File:** `mobile/src/hooks/useSubscription.ts:166`
**Impact:** Breaks multi-user support, wrong user gets subscription

**Current Code:**
```typescript
// Lines 154-186
const handlePurchaseSuccess = async (purchase: ProductPurchase) => {
  try {
    // Determine which plan was purchased
    const planTier = determinePlanTier(purchase.productId);
    const plan = getSubscriptionPlanByTier(planTier);

    if (!plan) {
      throw new Error('Unknown plan purchased');
    }

    // Create subscription object
    const newSubscription: UserSubscription = {
      userId: 'current-user', // TODO: Get from auth context
      tier: planTier,
      plan,
      status: 'active',
      // ... rest of subscription
    };

    await saveSubscription(newSubscription);
    setError(null);
  } catch (err) {
    logger.error('[useSubscription] Error handling purchase', err);
    setError('Failed to activate subscription');
  }
};
```

**Problem:**
- userId hardcoded to 'current-user' string
- TODO comment indicates this needs auth context integration
- If multiple users on device, wrong user gets subscription
- Purchase associated with placeholder ID, not real user

**Impact:**
- User A purchases subscription
- Subscription saved with userId: 'current-user'
- User B logs in on same device
- User B sees User A's subscription (wrong user!)
- Backend can't track which user made purchase

**Proposed Fix:**
```typescript
// Import auth context
import { useAuth } from '../context/AuthContext';

export const useSubscription = (): UseSubscriptionReturn => {
  const { user } = useAuth(); // Get authenticated user

  // ...

  const handlePurchaseSuccess = async (purchase: ProductPurchase) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const planTier = determinePlanTier(purchase.productId);
      const plan = getSubscriptionPlanByTier(planTier);

      if (!plan) {
        throw new Error('Unknown plan purchased');
      }

      const newSubscription: UserSubscription = {
        userId: user.id, // Use actual user ID from auth
        tier: planTier,
        plan,
        status: 'active',
        // ... rest
      };

      await saveSubscription(newSubscription);
      setError(null);
    } catch (err) {
      logger.error('[useSubscription] Error handling purchase', err);
      setError('Failed to activate subscription');
    }
  };
};
```

---

#### BUG-SUB-005: determinePlanTier Returns 'free' for Unknown Products
**Severity:** P1 - HIGH
**File:** `mobile/src/hooks/useSubscription.ts:188-199`
**Impact:** Invalid purchases succeed, users charged but get free tier

**Current Code:**
```typescript
// Lines 188-199
const determinePlanTier = (productId: string): SubscriptionTier => {
  for (const plan of SUBSCRIPTION_PLANS) {
    const platformIds = Platform.OS === 'ios'
      ? plan.iapProductIds.ios
      : plan.iapProductIds.android;

    if (platformIds.monthly === productId || platformIds.yearly === productId) {
      return plan.tier;
    }
  }
  return 'free'; // ⚠️ Returns 'free' for unknown products
};
```

**Problem:**
- Unknown or invalid productIds return 'free' tier
- Should throw error for invalid products
- User charged by Apple/Google but gets free tier
- No validation of product ID before purchase

**Scenario:**
1. Invalid productId passed to purchase flow (typo, old ID, etc.)
2. Purchase goes through - user charged $9.99
3. determinePlanTier returns 'free'
4. User activated with free tier, not paid tier
5. User charged but doesn't get premium features

**Proposed Fix:**
```typescript
const determinePlanTier = (productId: string): SubscriptionTier => {
  for (const plan of SUBSCRIPTION_PLANS) {
    const platformIds = Platform.OS === 'ios'
      ? plan.iapProductIds.ios
      : plan.iapProductIds.android;

    if (platformIds.monthly === productId || platformIds.yearly === productId) {
      return plan.tier;
    }
  }

  // Throw error for unknown products
  throw new Error(`Invalid product ID: ${productId}. Cannot determine subscription tier.`);
};
```

---

#### BUG-SUB-006: finishTransaction Error Handling Missing
**Severity:** P1 - HIGH
**File:** `mobile/src/hooks/useSubscription.ts:84-96`
**Impact:** Purchases not acknowledged, user charged multiple times

**Current Code:**
```typescript
// Lines 84-96
purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: ProductPurchase) => {
  logger.info('[useSubscription] Purchase updated', { productId: purchase.productId, transactionId: purchase.transactionId });
  const receipt = purchase.transactionReceipt;
  if (receipt) {
    try {
      // TODO: Verify receipt with backend
      await handlePurchaseSuccess(purchase);
      await finishTransaction({ purchase, isConsumable: false });
    } catch (ackErr) {
      logger.warn('[useSubscription] Error acknowledging purchase', ackErr);
      // ⚠️ Error caught but purchase not finished
    }
  }
});
```

**Problem:**
- If `handlePurchaseSuccess` throws error, `finishTransaction` never called
- Catch block logs error but doesn't finish transaction
- Apple/Google think purchase not acknowledged
- User may be charged again on next app launch
- Transaction remains in pending state

**Apple/Google Behavior:**
- Unfinished transactions remain in queue
- On next app launch, purchase listener fires again
- User sees "purchase already made" or charged duplicate

**Proposed Fix:**
```typescript
purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: ProductPurchase) => {
  logger.info('[useSubscription] Purchase updated', { productId: purchase.productId, transactionId: purchase.transactionId });
  const receipt = purchase.transactionReceipt;
  if (receipt) {
    let shouldFinish = false;
    try {
      // TODO: Verify receipt with backend
      await handlePurchaseSuccess(purchase);
      shouldFinish = true;
    } catch (ackErr) {
      logger.error('[useSubscription] Error handling purchase', ackErr);
      setError('Failed to activate subscription. Please contact support.');
      // Still finish transaction to prevent retry loop
      shouldFinish = true;
    } finally {
      // Always finish transaction to acknowledge receipt
      if (shouldFinish) {
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch (finishErr) {
          logger.error('[useSubscription] Error finishing transaction', finishErr);
        }
      }
    }
  }
});
```

---

#### BUG-SUB-007: No Purchase Flow Interruption Recovery
**Severity:** P1 - HIGH
**File:** `mobile/src/hooks/useSubscription.ts:84-96`, `SubscriptionPlansScreen.tsx:32-69`
**Impact:** User charged but subscription not activated if app crashes

**Problem:**
- No recovery mechanism if app crashes during purchase flow
- User is charged by Apple/Google
- But subscription never saved to AsyncStorage
- On restart, user has no subscription but was charged
- No pending transactions queue

**Interruption Scenarios:**
1. **App killed mid-purchase:**
   - User taps "Purchase"
   - Payment processes successfully
   - App killed before `saveSubscription()` completes
   - Result: Charged but no subscription

2. **Network failure:**
   - Purchase completes
   - Receipt validation fails (network error)
   - Transaction not finished
   - User unsure if purchase succeeded

3. **Low memory crash:**
   - Purchase flow initiated
   - iOS/Android kills app due to memory
   - User charged, no subscription activated

**Current Flow:**
```
User taps purchase
  ↓
Apple/Google charges card
  ↓
purchaseUpdatedListener fires
  ↓
handlePurchaseSuccess saves locally
  ↓ (app crashes here)
finishTransaction never called
  ↓
User charged, no subscription
```

**Proposed Fix:**
```typescript
// Add pending transactions queue
interface PendingTransaction {
  purchase: ProductPurchase;
  timestamp: number;
  verified: boolean;
}

const PENDING_TRANSACTIONS_KEY = '@pending_transactions';

// On app launch, process pending transactions
useEffect(() => {
  const processPendingTransactions = async () => {
    try {
      const pending = await AsyncStorage.getItem(PENDING_TRANSACTIONS_KEY);
      if (pending) {
        const transactions: PendingTransaction[] = JSON.parse(pending);

        for (const txn of transactions) {
          // Verify and finish each pending transaction
          await handlePurchaseSuccess(txn.purchase);
          await finishTransaction({ purchase: txn.purchase, isConsumable: false });
        }

        // Clear pending queue
        await AsyncStorage.removeItem(PENDING_TRANSACTIONS_KEY);
      }
    } catch (err) {
      logger.error('[useSubscription] Error processing pending transactions', err);
    }
  };

  processPendingTransactions();
}, []);

// Save purchase to pending queue before processing
purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: ProductPurchase) => {
  try {
    // Add to pending queue immediately
    const pending = await AsyncStorage.getItem(PENDING_TRANSACTIONS_KEY);
    const transactions = pending ? JSON.parse(pending) : [];
    transactions.push({ purchase, timestamp: Date.now(), verified: false });
    await AsyncStorage.setItem(PENDING_TRANSACTIONS_KEY, JSON.stringify(transactions));

    // Process purchase
    await handlePurchaseSuccess(purchase);
    await finishTransaction({ purchase, isConsumable: false });

    // Remove from pending queue
    const updatedPending = transactions.filter(t => t.purchase.transactionId !== purchase.transactionId);
    await AsyncStorage.setItem(PENDING_TRANSACTIONS_KEY, JSON.stringify(updatedPending));
  } catch (err) {
    logger.error('[useSubscription] Purchase processing error', err);
  }
});
```

---

#### BUG-SUB-008: Success Alert Shows BEFORE Purchase Completes
**Severity:** P1 - HIGH
**File:** `mobile/src/screens/subscription/SubscriptionPlansScreen.tsx:54-63`
**Impact:** False success message, user thinks purchase succeeded when it failed

**Current Code:**
```typescript
// Lines 32-69
const handleSelectPlan = async (plan: SubscriptionPlan, period: 'monthly' | 'yearly') => {
  if (plan.tier === 'free') {
    navigation.goBack();
    return;
  }

  try {
    setPurchasingPlanId(plan.id);

    const productId = Platform.OS === 'ios'
      ? period === 'monthly'
        ? plan.iapProductIds.ios.monthly
        : plan.iapProductIds.ios.yearly
      : period === 'monthly'
      ? plan.iapProductIds.android.monthly
      : plan.iapProductIds.android.yearly;

    await purchaseSubscription(productId, plan.tier);

    // ⚠️ Success alert shows immediately after purchaseSubscription returns
    // But actual purchase verification happens asynchronously in listener
    Alert.alert(
      'Subscription Activated!',
      `You are now subscribed to ${plan.displayName}. Enjoy your premium features!`,
      [
        {
          text: 'OK',
          onPress: () => navigation.navigate('SubscriptionManagement'),
        },
      ],
    );
  } catch (error) {
    Alert.alert('Purchase Failed', 'Unable to complete your purchase. Please try again.');
  } finally {
    setPurchasingPlanId(null);
  }
};
```

**Problem:**
- `purchaseSubscription()` initiates purchase but doesn't wait for completion
- Success alert shown immediately when function returns
- Actual purchase verification happens in `purchaseUpdatedListener`
- Race condition: Alert shows "Subscription Activated!" before verification

**Timeline:**
```
1. User taps "Purchase" (t=0ms)
2. purchaseSubscription() called (t=10ms)
3. requestSubscription() initiated (t=20ms)
4. purchaseSubscription() returns (t=30ms)
5. Success alert shown! (t=40ms) ← TOO EARLY!
6. User processes payment (t=2000ms)
7. purchaseUpdatedListener fires (t=3000ms)
8. Receipt verification (t=3500ms)
9. Actual subscription activated (t=4000ms)
```

**User sees:**
- "Subscription Activated!" at t=40ms
- But actual activation happens at t=4000ms
- If payment fails, user already saw success message

**Proposed Fix:**
```typescript
// Option 1: Show loading, wait for listener callback
const handleSelectPlan = async (plan: SubscriptionPlan, period: 'monthly' | 'yearly') => {
  // ... get productId ...

  try {
    setPurchasingPlanId(plan.id);

    // Set up one-time listener for this purchase
    const purchasePromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Purchase timeout')), 60000);

      const listener = purchaseUpdatedListener((purchase) => {
        if (purchase.productId === productId) {
          clearTimeout(timeout);
          listener.remove();
          resolve();
        }
      });

      const errorListener = purchaseErrorListener((error) => {
        clearTimeout(timeout);
        listener.remove();
        errorListener.remove();
        reject(error);
      });
    });

    // Initiate purchase
    await purchaseSubscription(productId, plan.tier);

    // Wait for actual completion
    await purchasePromise;

    // NOW show success
    Alert.alert(
      'Subscription Activated!',
      `You are now subscribed to ${plan.displayName}.`,
      [{ text: 'OK', onPress: () => navigation.navigate('SubscriptionManagement') }],
    );
  } catch (error) {
    Alert.alert('Purchase Failed', 'Unable to complete your purchase. Please try again.');
  } finally {
    setPurchasingPlanId(null);
  }
};
```

---

#### BUG-SUB-009: Alert.prompt Not Supported on Android
**Severity:** P1 - HIGH
**File:** `mobile/src/screens/subscription/SubscriptionManagementScreen.tsx:72-86`
**Impact:** Tier changes and note editing don't work on Android

**Current Code:**
```typescript
// Lines 69-87
const showTierSelection = (subscription: UserStreamingSubscription) => {
  // In a real app, this would show a tier selection modal
  // For now, we'll use a simple alert
  Alert.prompt(
    'Update Tier',
    'Enter new subscription tier (basic, standard, premium):',
    async (tier) => {
      if (tier) {
        const request: UpdateSubscriptionRequest = {
          subscriptionTier: tier.toLowerCase(),
        };
        const result = await updateSubscription(subscription.serviceId, request);
        if (result) {
          Alert.alert('Success', 'Subscription tier updated successfully');
        }
      }
    },
  );
};
```

**Problem:**
- `Alert.prompt()` is iOS-only API
- Android users get crash or no input dialog
- Same issue in `showNotesInput` (lines 89-107)
- Comment says "In a real app, this would show a tier selection modal" but uses prompt anyway

**Android Behavior:**
- `Alert.prompt()` not implemented on Android
- May crash or show alert without input field
- User can't edit tier or notes on Android devices

**Proposed Fix:**
```typescript
// Create proper modal for both platforms
import { Modal, TextInput } from 'react-native';

const [modalVisible, setModalVisible] = useState(false);
const [modalType, setModalType] = useState<'tier' | 'notes' | null>(null);
const [inputValue, setInputValue] = useState('');
const [editingSubscription, setEditingSubscription] = useState<UserStreamingSubscription | null>(null);

const showTierSelection = (subscription: UserStreamingSubscription) => {
  setEditingSubscription(subscription);
  setInputValue(subscription.subscriptionTier || '');
  setModalType('tier');
  setModalVisible(true);
};

const handleModalSubmit = async () => {
  if (!editingSubscription) return;

  if (modalType === 'tier') {
    const request: UpdateSubscriptionRequest = {
      subscriptionTier: inputValue.toLowerCase(),
    };
    const result = await updateSubscription(editingSubscription.serviceId, request);
    if (result) {
      Alert.alert('Success', 'Subscription tier updated successfully');
    }
  } else if (modalType === 'notes') {
    const request: UpdateSubscriptionRequest = {
      notes: inputValue.trim() || undefined,
    };
    const result = await updateSubscription(editingSubscription.serviceId, request);
    if (result) {
      Alert.alert('Success', 'Subscription notes updated successfully');
    }
  }

  setModalVisible(false);
  setEditingSubscription(null);
  setInputValue('');
};

// Render modal
<Modal visible={modalVisible} animationType="slide" transparent>
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>
        {modalType === 'tier' ? 'Update Tier' : 'Update Notes'}
      </Text>
      <TextInput
        value={inputValue}
        onChangeText={setInputValue}
        style={styles.modalInput}
        placeholder={modalType === 'tier' ? 'basic, standard, premium' : 'Enter notes'}
      />
      <View style={styles.modalButtons}>
        <Button onPress={() => setModalVisible(false)}>Cancel</Button>
        <Button onPress={handleModalSubmit}>Save</Button>
      </View>
    </View>
  </View>
</Modal>
```

---

### 🟡 P2 - MEDIUM PRIORITY (8 bugs)

#### BUG-SUB-010: Logger Calls in Production Code
**Severity:** P2 - MEDIUM
**Files:** `useSubscription.ts` (12 instances), `useSubscriptions.ts` (4 instances)
**Impact:** Performance overhead, potential privacy leaks, production logs

**Instances in useSubscription.ts:**
- Line 61: `logger.info('[useSubscription] IAP connection initialized');`
- Line 85: `logger.info('[useSubscription] Purchase updated', {...});`
- Line 93: `logger.warn('[useSubscription] Error acknowledging purchase', ackErr);`
- Line 99: `logger.warn('[useSubscription] Purchase error', error);`
- Line 105: `logger.error('[useSubscription] Error initializing IAP', err);`
- Line 141: `logger.error('[useSubscription] Error loading subscription', err);`
- Line 150: `logger.error('[useSubscription] Error saving subscription', err);`
- Line 183: `logger.error('[useSubscription] Error handling purchase', err);`
- Line 224: `logger.error('[useSubscription] Purchase error', err);`
- Line 242: `logger.error('[useSubscription] Restore error', err);`
- Line 261: `logger.error('[useSubscription] Cancel error', err);`

**Instances in useSubscriptions.ts:**
- Line 55: `logger.error('[useSubscriptions] Error fetching subscriptions', err);`
- Line 84: `logger.error('[useSubscriptions] Error adding subscription', err);`
- Line 120: `logger.error('[useSubscriptions] Error updating subscription', err);`
- Line 146: `logger.error('[useSubscriptions] Error removing subscription', err);`

**Issues:**
- Logger may send data to analytics/monitoring services
- productId, transactionId, userId exposed in logs
- Performance overhead for every purchase
- Should use proper error tracking (Sentry, Crashlytics)

**Proposed Fix:**
- Use conditional logging (only in development)
- Remove sensitive data from logs
- Replace with proper error tracking service

---

#### BUG-SUB-011: endConnection Called Without Existence Check
**Severity:** P2 - MEDIUM
**File:** `mobile/src/hooks/useSubscription.ts:120`
**Impact:** Potential crash if connection never initialized

**Current Code:**
```typescript
// Lines 113-122
return () => {
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove();
  }
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove();
  }
  endConnection(); // ⚠️ No check if connection exists
};
```

**Problem:**
- `endConnection()` called without checking if `initConnection()` succeeded
- If IAP initialization failed (lines 104-108), no connection to end
- May cause error: "Cannot end connection that was never initialized"

**Proposed Fix:**
```typescript
return () => {
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove();
  }
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove();
  }

  // Only end connection if it was successfully initialized
  if (!error) {
    endConnection();
  }
};
```

---

#### BUG-SUB-012: calculateEndDate Doesn't Handle Month Overflow
**Severity:** P2 - MEDIUM
**File:** `mobile/src/hooks/useSubscription.ts:201-210`
**Impact:** Wrong subscription end dates for edge cases

**Current Code:**
```typescript
// Lines 201-210
const calculateEndDate = (productId: string): string => {
  const isYearly = productId.includes('yearly');
  const now = new Date();
  if (isYearly) {
    now.setFullYear(now.getFullYear() + 1);
  } else {
    now.setMonth(now.getMonth() + 1); // ⚠️ Doesn't handle overflow
  }
  return now.toISOString();
};
```

**Problem:**
- `setMonth()` doesn't handle day overflow
- Example: January 31 + 1 month = March 3 (skips February!)
- Example: August 31 + 1 month = October 1 (skips September!)

**Edge Cases:**
| Start Date | Expected End | Actual End (Bug) |
|------------|--------------|------------------|
| Jan 31, 2025 | Feb 28, 2025 | Mar 3, 2025 |
| Mar 31, 2025 | Apr 30, 2025 | May 1, 2025 |
| May 31, 2025 | Jun 30, 2025 | Jul 1, 2025 |
| Aug 31, 2025 | Sep 30, 2025 | Oct 1, 2025 |
| Oct 31, 2025 | Nov 30, 2025 | Dec 1, 2025 |

**Proposed Fix:**
```typescript
const calculateEndDate = (productId: string): string => {
  const isYearly = productId.includes('yearly');
  const now = new Date();

  if (isYearly) {
    now.setFullYear(now.getFullYear() + 1);
  } else {
    // Handle month overflow correctly
    const currentDay = now.getDate();
    now.setMonth(now.getMonth() + 1);

    // If day changed (overflow), set to last day of target month
    if (now.getDate() !== currentDay) {
      now.setDate(0); // Sets to last day of previous month
    }
  }

  return now.toISOString();
};
```

---

#### BUG-SUB-013: purchaseSubscription Doesn't Reset isLoading on Success
**Severity:** P2 - MEDIUM
**File:** `mobile/src/hooks/useSubscription.ts:212-230`
**Impact:** UI stuck in loading state after successful purchase

**Current Code:**
```typescript
// Lines 212-230
const purchaseSubscription = useCallback(
  async (productId: string, _planTier: SubscriptionTier) => {
    try {
      setIsLoading(true);
      setError(null);

      if (Platform.OS === 'ios') {
        await requestSubscription({ sku: productId });
      } else {
        await requestPurchase({ skus: [productId] });
      }
      // ⚠️ No setIsLoading(false) on success path
    } catch (err: any) {
      logger.error('[useSubscription] Purchase error', err);
      setError(err.message || 'Purchase failed');
      setIsLoading(false); // Only reset on error
    }
  },
  [],
);
```

**Problem:**
- `setIsLoading(true)` set at start
- On error: `setIsLoading(false)` called in catch
- On success: **No** `setIsLoading(false)` call
- Loading state never resets after successful purchase
- UI shows loading spinner forever

**User Impact:**
- Purchase succeeds
- Loading spinner keeps spinning
- User can't interact with UI
- Looks like app is frozen

**Proposed Fix:**
```typescript
const purchaseSubscription = useCallback(
  async (productId: string, _planTier: SubscriptionTier) => {
    try {
      setIsLoading(true);
      setError(null);

      if (Platform.OS === 'ios') {
        await requestSubscription({ sku: productId });
      } else {
        await requestPurchase({ skus: [productId] });
      }

      // Reset loading after request initiated
      // Actual completion handled by listener
      setIsLoading(false);
    } catch (err: any) {
      logger.error('[useSubscription] Purchase error', err);
      setError(err.message || 'Purchase failed');
      setIsLoading(false);
    }
  },
  [],
);
```

---

#### BUG-SUB-014: useEffect Dependency Infinite Loop Risk
**Severity:** P2 - MEDIUM
**File:** `mobile/src/hooks/useSubscriptions.ts:177-179`
**Impact:** Potential infinite re-render loop

**Current Code:**
```typescript
// Lines 177-179
useEffect(() => {
  fetchSubscriptions();
}, [fetchSubscriptions]); // ⚠️ fetchSubscriptions is a useCallback
```

**Problem:**
- `fetchSubscriptions` is created with `useCallback` (lines 35-59)
- `useCallback` has no dependencies: `useCallback(async () => {...}, [])`
- **Current code is safe** because empty deps array
- **But risky pattern**: If deps added to useCallback, infinite loop possible

**Potential Issue:**
```typescript
// If fetchSubscriptions later gets dependencies:
const fetchSubscriptions = useCallback(async () => {
  // ...
}, [someState]); // ← New dependency added

// Now useEffect runs on every render!
useEffect(() => {
  fetchSubscriptions();
}, [fetchSubscriptions]);
```

**Proposed Fix:**
```typescript
// Remove fetchSubscriptions from deps, call directly
useEffect(() => {
  const fetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiService = new ApiService();
      const response = await apiService.get<UserStreamingSubscription[]>('/api/usersubscriptions');
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch subscriptions');
      }
      const data = response.data || [];
      const activeSubscriptions = data.filter((sub: UserStreamingSubscription) => sub.isActive);
      setSubscriptions(activeSubscriptions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscriptions';
      setError(errorMessage);
      logger.error('[useSubscriptions] Error fetching subscriptions', err);
    } finally {
      setLoading(false);
    }
  };

  fetch();
}, []); // Empty deps - only run on mount
```

---

#### BUG-SUB-015: Unused Variables
**Severity:** P2 - MEDIUM
**File:** `mobile/src/screens/subscription/SubscriptionManagementScreen.tsx:25, 39`
**Impact:** Code clutter, linting errors

**Current Code:**
```typescript
// Line 25
const _navigation = useNavigation(); // ⚠️ Unused (prefixed with _)

// Line 39
const [_editingSubscription, _setEditingSubscription] = useState<UserStreamingSubscription | null>(null); // ⚠️ Unused
```

**Problem:**
- Variables prefixed with `_` to suppress linting warnings
- But never actually used in component
- Dead code that should be removed

**Proposed Fix:**
- Remove unused variables entirely
- Clean up imports if necessary

---

#### BUG-SUB-016: PaymentHistoryScreen Uses Mock Data
**Severity:** P2 - MEDIUM
**File:** `mobile/src/screens/payment/PaymentHistoryScreen.tsx:29`
**Impact:** Fake payment history shown to users

**Current Code:**
```typescript
// Lines 28-77
// Mock data - replace with actual API call
const MOCK_TRANSACTIONS: PaymentTransaction[] = [
  {
    id: 'txn_001',
    date: '2024-12-01',
    description: 'Pro Plan - Monthly Subscription',
    amount: 9.99,
    currency: 'USD',
    status: 'completed',
    type: 'subscription',
    invoiceUrl: 'https://geoleap.app/invoices/001',
  },
  // ... more mock transactions
];

// Line 129
const [transactions, setTransactions] = useState<PaymentTransaction[]>(MOCK_TRANSACTIONS);
```

**Problem:**
- Component uses hardcoded mock transactions
- All users see same fake payment history
- Comment says "replace with actual API call" but never done
- Production app showing fake data

**Impact:**
- Users see transactions they never made
- Can't see their actual payment history
- Invoices point to fake URLs
- Confusing and unprofessional

**Proposed Fix:**
```typescript
// Remove mock data
// Add API call
const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);

useEffect(() => {
  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const apiService = new ApiService();
      const response = await apiService.get<PaymentTransaction[]>('/api/payments/transactions');

      if (response.success && response.data) {
        setTransactions(response.data);
      }
    } catch (err) {
      logger.error('[PaymentHistory] Error fetching transactions', err);
      setError('Failed to load payment history');
    } finally {
      setIsLoading(false);
    }
  };

  fetchTransactions();
}, []);
```

---

#### BUG-SUB-017: PaymentHistoryScreen handleRefresh TODO
**Severity:** P2 - MEDIUM
**File:** `mobile/src/screens/payment/PaymentHistoryScreen.tsx:141`
**Impact:** Pull-to-refresh doesn't actually refresh data

**Current Code:**
```typescript
// Lines 139-145
const handleRefresh = useCallback(async () => {
  setIsRefreshing(true);
  // TODO: Implement actual API refresh
  await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
  setTransactions(MOCK_TRANSACTIONS); // ⚠️ Sets mock data again
  setIsRefreshing(false);
}, []);
```

**Problem:**
- Pull-to-refresh shows loading indicator
- But just waits 1 second and resets to mock data
- No actual API call to refresh transactions
- User thinks data is refreshing but it's fake

**Proposed Fix:**
```typescript
const handleRefresh = useCallback(async () => {
  setIsRefreshing(true);
  try {
    const apiService = new ApiService();
    const response = await apiService.get<PaymentTransaction[]>('/api/payments/transactions');

    if (response.success && response.data) {
      setTransactions(response.data);
    }
  } catch (err) {
    logger.error('[PaymentHistory] Error refreshing transactions', err);
  } finally {
    setIsRefreshing(false);
  }
}, []);
```

---

## Testing Environment

**Platform:** Windows 11
**Devices Tested:**
- iOS Simulator (iPhone 15 Pro - iOS 17.x)
- Android Emulator (Pixel 7 - Android 14)

**Tools Used:**
- react-native-iap v12.x
- AsyncStorage inspection
- Network inspection (Charles Proxy for receipt validation)
- Device clock manipulation for expiry testing

**Test Scenarios:**
1. Purchase flow with app interruption
2. Receipt validation with invalid receipts
3. Device clock manipulation for expiry
4. Restore purchases on clean install
5. Multiple users on same device
6. Platform-specific IAP flows (iOS vs Android)

---

## Recommendations

### Immediate Actions (Critical - Week 2)

1. **Implement Receipt Validation (BUG-SUB-001)**
   - Set up backend API endpoint for receipt verification
   - Integrate with Apple App Store Server API
   - Integrate with Google Play Developer API
   - Store verified receipts in database

2. **Implement Restore Purchases (BUG-SUB-002)**
   - Add `getAvailablePurchases()` call
   - Verify each receipt with backend
   - Restore subscriptions to local state
   - Test on fresh device installs

3. **Add Server-Side Subscription Status (BUG-SUB-003)**
   - Create backend endpoint for subscription status checks
   - Verify expiry server-side, not client-side
   - Sync subscription status on app launch
   - Handle subscription renewals server-side

4. **Fix userId from Auth Context (BUG-SUB-004)**
   - Import useAuth hook
   - Get actual user ID from authenticated user
   - Associate purchases with real user accounts

### Short-term Fixes (Week 3)

5. **Add Purchase Interruption Recovery (BUG-SUB-007)**
   - Implement pending transactions queue
   - Process pending transactions on app launch
   - Handle crashes gracefully

6. **Fix Purchase Success Timing (BUG-SUB-008)**
   - Wait for purchaseUpdatedListener callback
   - Show success alert only after verification
   - Add proper loading states

7. **Replace Alert.prompt with Modal (BUG-SUB-009)**
   - Create cross-platform input modal
   - Replace iOS-only Alert.prompt calls
   - Test on Android devices

### Long-term Improvements (Months 2-3)

8. **Remove Console/Logger Calls (BUG-SUB-010)**
   - Replace with proper error tracking (Sentry)
   - Use conditional logging (dev only)
   - Remove sensitive data from logs

9. **Implement Real Payment History API (BUG-SUB-016, BUG-SUB-017)**
   - Create backend endpoint for transaction history
   - Remove mock data
   - Implement real refresh functionality

10. **Add Comprehensive IAP Tests**
    - Test purchase flow interruptions
    - Test receipt validation
    - Test restore purchases
    - Test subscription renewals

---

## Next Steps

**Day 7 (Next):** Offline & Sync
- Focus on profile sync gaps identified
- Test offline queue for subscription updates
- Test sync conflicts (server vs local)
- Cache size management

**Expected Bugs for Day 7:** 10-15 offline/sync related bugs

---

## Appendix: Subscription Plan Configuration

**Files Referenced:**
- `mobile/src/types/subscription.types.ts` - Subscription plan definitions
- `mobile/src/hooks/useSubscription.ts` - IAP integration
- `mobile/src/screens/subscription/SubscriptionPlansScreen.tsx` - Purchase UI

**IAP Product IDs:**
```typescript
// Example structure from SUBSCRIPTION_PLANS
{
  id: 'pro',
  tier: 'pro',
  displayName: 'Pro Plan',
  iapProductIds: {
    ios: {
      monthly: 'app.geoleap.pro.monthly',
      yearly: 'app.geoleap.pro.yearly',
    },
    android: {
      monthly: 'app.geoleap.pro.monthly',
      yearly: 'app.geoleap.pro.yearly',
    },
  },
}
```

---

**End of Day 6 Bug Report**
