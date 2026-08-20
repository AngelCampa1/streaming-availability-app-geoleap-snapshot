/**
 * MSW Subscription Handlers
 *
 * Handles subscription and payment-related API mocking:
 * - Subscription status and details
 * - Purchase and cancellation flows
 * - Payment method management
 */

import { http, HttpResponse, delay } from 'msw';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.geoleap.app';

// Mock subscription data
export const mockSubscription = {
  id: 'sub-123',
  planId: 'premium-monthly',
  status: 'active',
  currentPeriodStart: '2025-01-01T00:00:00Z',
  currentPeriodEnd: '2025-02-01T00:00:00Z',
  cancelAtPeriodEnd: false,
  price: 9.99,
  currency: 'USD',
  interval: 'month',
};

// Mock subscription plans
export const mockSubscriptionPlans = [
  {
    id: 'premium-monthly',
    name: 'Premium Monthly',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    features: ['Unlimited streaming', 'VPN access', 'Ad-free', 'HD quality'],
  },
  {
    id: 'premium-yearly',
    name: 'Premium Yearly',
    price: 99.99,
    currency: 'USD',
    interval: 'year',
    features: ['Unlimited streaming', 'VPN access', 'Ad-free', 'HD quality', '2 months free'],
  },
];

// Track subscription state
let mockSubscriptionState = {
  hasSubscription: false,
  subscription: null as typeof mockSubscription | null,
};

export const subscriptionHandlers = [
  // GET /subscription - Get active subscription
  http.get(`${BASE_URL}/subscription`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');

    // Simulate unauthorized
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      subscription: mockSubscriptionState.subscription,
      status: mockSubscriptionState.hasSubscription ? 'active' : 'inactive',
    });
  }),

  // GET /subscription/plans - Get available plans
  http.get(`${BASE_URL}/subscription/plans`, async () => {
    await delay(100);

    return HttpResponse.json({
      plans: mockSubscriptionPlans,
    });
  }),

  // POST /subscription/purchase - Purchase subscription
  http.post(`${BASE_URL}/subscription/purchase`, async ({ request }) => {
    await delay(150);

    const body = await request.json() as { planId: string; paymentMethodId: string };

    // Simulate invalid payment method
    if (body.paymentMethodId === 'invalid-payment-method') {
      return HttpResponse.json(
        { error: 'Invalid payment method', code: 'INVALID_PAYMENT_METHOD' },
        { status: 400 }
      );
    }

    // Simulate payment failure
    if (body.paymentMethodId === 'fail-payment') {
      return HttpResponse.json(
        { error: 'Payment failed', code: 'PAYMENT_FAILED' },
        { status: 402 }
      );
    }

    // Find the plan
    const plan = mockSubscriptionPlans.find(p => p.id === body.planId);
    if (!plan) {
      return HttpResponse.json(
        { error: 'Plan not found', code: 'PLAN_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Successful purchase
    mockSubscriptionState = {
      hasSubscription: true,
      subscription: {
        ...mockSubscription,
        planId: body.planId,
        price: plan.price,
        interval: plan.interval,
      },
    };

    return HttpResponse.json({
      success: true,
      subscriptionId: mockSubscription.id,
      subscription: mockSubscriptionState.subscription,
    });
  }),

  // POST /subscription/cancel - Cancel subscription
  http.post(`${BASE_URL}/subscription/cancel`, async ({ request }) => {
    await delay(100);

    const body = await request.json() as { immediate?: boolean };

    // Simulate no active subscription
    if (!mockSubscriptionState.hasSubscription) {
      return HttpResponse.json(
        { error: 'No active subscription', code: 'NO_SUBSCRIPTION' },
        { status: 400 }
      );
    }

    // Immediate cancellation
    if (body.immediate) {
      mockSubscriptionState = {
        hasSubscription: false,
        subscription: null,
      };

      return HttpResponse.json({
        success: true,
        cancelledAt: new Date().toISOString(),
        immediate: true,
      });
    }

    // Cancel at period end
    if (mockSubscriptionState.subscription) {
      mockSubscriptionState.subscription.cancelAtPeriodEnd = true;
    }

    return HttpResponse.json({
      success: true,
      cancelAtPeriodEnd: true,
      periodEnd: mockSubscription.currentPeriodEnd,
    });
  }),

  // POST /subscription/reactivate - Reactivate cancelled subscription
  http.post(`${BASE_URL}/subscription/reactivate`, async () => {
    await delay(100);

    if (!mockSubscriptionState.subscription) {
      return HttpResponse.json(
        { error: 'No subscription to reactivate', code: 'NO_SUBSCRIPTION' },
        { status: 400 }
      );
    }

    mockSubscriptionState.subscription.cancelAtPeriodEnd = false;

    return HttpResponse.json({
      success: true,
      subscription: mockSubscriptionState.subscription,
    });
  }),

  // GET /subscription/payment-methods - Get saved payment methods
  http.get(`${BASE_URL}/subscription/payment-methods`, async () => {
    await delay(100);

    return HttpResponse.json({
      paymentMethods: [
        {
          id: 'pm-123',
          type: 'card',
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2025,
          isDefault: true,
        },
      ],
    });
  }),

  // POST /subscription/payment-method - Add payment method
  http.post(`${BASE_URL}/subscription/payment-method`, async ({ request }) => {
    await delay(150);

    const body = await request.json() as { token: string; setAsDefault?: boolean };

    // Simulate invalid token
    if (body.token === 'invalid-token') {
      return HttpResponse.json(
        { error: 'Invalid payment token', code: 'INVALID_TOKEN' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      paymentMethod: {
        id: 'pm-new',
        type: 'card',
        last4: '1234',
        brand: 'mastercard',
        isDefault: body.setAsDefault || false,
      },
    });
  }),
];

/**
 * Reset subscription state (for test cleanup)
 */
export function resetSubscriptionState() {
  mockSubscriptionState = {
    hasSubscription: false,
    subscription: null,
  };
}
