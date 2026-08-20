/**
 * MSW Handlers for Support API
 *
 * Mock Service Worker handlers for all support-related API endpoints.
 * Use these in tests by calling server.use() with specific handlers.
 */

import { http, HttpResponse } from 'msw';
import {
  createMockMetrics,
  createMockCustomer,
  createMockTransactions,
  createMockSubscription,
  createMockInvoice,
  createMockPaymentMethod,
  createMockRefund,
  createMockAction,
  createMockCustomerWithBilling,
} from '../utils/mockFactories';

// ============================================================================
// Support Metrics
// ============================================================================

export const supportMetricsHandler = http.get('*/api/support/metrics', () => {
  return HttpResponse.json(createMockMetrics());
});

// ============================================================================
// Customer Search and Retrieval
// ============================================================================

export const customerSearchHandler = http.get('*/api/support/customers/search', ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  if (!query) {
    return HttpResponse.json({ data: [], success: true }, { status: 200 });
  }

  // Simulate finding a customer
  const customer = createMockCustomer({
    email: query.includes('@') ? query : 'customer@example.com',
    id: query.startsWith('cust-') ? query : 'cust-123',
  });

  return HttpResponse.json({ data: [customer], success: true });
});

export const customerByIdHandler = http.get('*/api/support/customers/:id', ({ params }) => {
  const { id } = params;

  if (id === 'not-found') {
    return HttpResponse.json(
      { success: false, message: 'Customer not found', errors: ['Customer not found'] },
      { status: 404 }
    );
  }

  const customer = createMockCustomer({ id: id as string });
  return HttpResponse.json({ data: customer, success: true });
});

// ============================================================================
// Billing Overview
// ============================================================================

export const billingOverviewHandler = http.get('*/api/support/customers/:id/billing-overview', ({ params }) => {
  const { id } = params;
  const billingData = createMockCustomerWithBilling();

  return HttpResponse.json({
    data: {
      customer: { ...billingData.customer, id },
      subscriptions: billingData.subscriptions,
      paymentMethods: billingData.paymentMethods,
      recentTransactions: billingData.transactions,
      invoices: billingData.invoices,
      totalPaid: billingData.customer.totalPaid,
      monthlySpend: 999,
      paymentSuccessRate: 98.5,
      outstandingBalance: 0,
      riskFactors: [],
    },
    success: true,
  });
});

// ============================================================================
// Transactions
// ============================================================================

export const transactionsHandler = http.get('*/api/support/customers/:id/transactions', ({ params, request }) => {
  const { id } = params;
  const url = new URL(request.url);
  const status = url.searchParams.get('status');

  let transactions = createMockTransactions(id as string, 5);

  if (status) {
    transactions = transactions.filter(t => t.status === status);
  }

  return HttpResponse.json({ data: transactions, success: true });
});

// ============================================================================
// Refunds
// ============================================================================

export const refundsListHandler = http.get('*/api/support/customers/:id/refunds', ({ params }) => {
  const { id } = params;
  const refunds = [createMockRefund({ customerId: id as string })];

  return HttpResponse.json({ data: refunds, success: true });
});

export const createRefundHandler = http.post('*/api/support/refunds', async ({ request }) => {
  const body = await request.json() as any;

  const refund = createMockRefund({
    transactionId: body.transactionId,
    amount: body.amount,
    reason: body.reason,
    status: 'pending',
    notes: body.notes,
  });

  return HttpResponse.json({ data: refund, success: true }, { status: 201 });
});

// ============================================================================
// Invoices
// ============================================================================

export const invoicesHandler = http.get('*/api/support/customers/:id/invoices', ({ params, request }) => {
  const { id } = params;
  const url = new URL(request.url);
  const status = url.searchParams.get('status');

  let invoices = [
    createMockInvoice({ customerId: id as string, status: 'open', amountDue: 999 }),
    createMockInvoice({ customerId: id as string, id: 'inv-002', status: 'uncollectible', amountDue: 1999 }),
  ];

  if (status) {
    const statuses = status.split(',');
    invoices = invoices.filter(inv => statuses.includes(inv.status));
  }

  return HttpResponse.json({ data: invoices, success: true });
});

// ============================================================================
// Payment Methods
// ============================================================================

export const paymentMethodsHandler = http.get('*/api/support/customers/:id/payment-methods', ({ params }) => {
  const { id } = params;
  const paymentMethods = [
    createMockPaymentMethod({ customerId: id as string }),
    createMockPaymentMethod({
      customerId: id as string,
      id: 'pm-002',
      isDefault: false,
      maskedCardNumber: '****-****-****-5555',
      brand: 'Mastercard',
    }),
  ];

  return HttpResponse.json({ data: paymentMethods, success: true });
});

// ============================================================================
// Manual Payments
// ============================================================================

export const calculatePaymentHandler = http.post('*/api/support/payments/calculate', async ({ request }) => {
  const body = await request.json() as any;

  const subtotal = body.amount;
  const fees = Math.round(subtotal * 0.029 + 30); // 2.9% + $0.30
  const tax = Math.round(subtotal * 0.08); // 8% tax
  const total = subtotal + fees + tax;

  return HttpResponse.json({
    data: {
      subtotal,
      fees,
      tax,
      total,
      breakdown: {
        processingFee: fees,
        salesTax: tax,
      },
    },
    success: true,
  });
});

export const processManualPaymentHandler = http.post('*/api/support/payments/manual', async ({ request }) => {
  const body = await request.json() as any;

  const transaction = createMockTransactions(body.customerId, 1)[0];
  transaction.amount = body.amount;
  transaction.method = body.method;
  transaction.description = body.description;

  return HttpResponse.json({
    data: {
      transaction,
      confirmation: {
        transactionId: transaction.id,
        confirmationType: 'immediate',
        confirmationRequired: false,
        estimatedProcessingTime: '1-2 business days',
        nextSteps: ['Payment has been recorded', 'Customer will receive confirmation email'],
      },
    },
    success: true,
  }, { status: 201 });
});

// ============================================================================
// Subscriptions
// ============================================================================

export const subscriptionsHandler = http.get('*/api/support/customers/:id/subscriptions', ({ params }) => {
  const { id } = params;
  const subscriptions = [createMockSubscription({ customerId: id as string })];

  return HttpResponse.json({ data: subscriptions, success: true });
});

export const subscriptionPlansHandler = http.get('*/api/support/plans', () => {
  const plans = [
    { id: 'plan-basic', name: 'Basic Monthly', amount: 499, interval: 'month' },
    { id: 'plan-premium', name: 'Premium Monthly', amount: 999, interval: 'month' },
    { id: 'plan-premium-annual', name: 'Premium Annual', amount: 9999, interval: 'year' },
  ];

  return HttpResponse.json({ data: plans, success: true });
});

export const subscriptionPreviewHandler = http.post('*/api/support/subscriptions/preview', async ({ request }) => {
  const body = await request.json() as any;

  const preview = {
    currentAmount: 999,
    newAmount: body.action === 'upgrade' ? 1999 : 499,
    prorationAmount: body.action === 'upgrade' ? 500 : -500,
    effectiveDate: new Date().toISOString(),
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    changes: [
      { item: 'Plan', oldValue: 'Premium Monthly', newValue: body.action === 'upgrade' ? 'Enterprise' : 'Basic' },
      { item: 'Price', oldValue: '$9.99', newValue: body.action === 'upgrade' ? '$19.99' : '$4.99' },
    ],
    warnings: body.action === 'downgrade' ? ['Some features will be removed'] : [],
    requiresApproval: body.action === 'upgrade' && body.newAmount > 5000,
  };

  return HttpResponse.json({ data: preview, success: true });
});

export const modifySubscriptionHandler = http.post('*/api/support/subscriptions/modify', async ({ request }) => {
  const body = await request.json() as any;

  const subscription = createMockSubscription({
    id: body.subscriptionId,
    status: body.action === 'pause' ? 'paused' : 'active',
  });

  return HttpResponse.json({ data: subscription, success: true }, { status: 200 });
});

// ============================================================================
// Action History
// ============================================================================

export const actionHistoryHandler = http.get('*/api/support/customers/:id/actions', ({ params }) => {
  const { id } = params;
  const actions = [
    createMockAction({ customerId: id as string }),
    createMockAction({
      customerId: id as string,
      id: 'act-002',
      action: 'refund_issued',
      description: 'Issued refund for failed transaction',
    }),
  ];

  return HttpResponse.json({ data: actions, success: true });
});

// ============================================================================
// Error Handlers (for testing error states)
// ============================================================================

export const networkErrorHandler = http.get('*/api/support/*', () => {
  return HttpResponse.error();
});

export const serverErrorHandler = http.get('*/api/support/*', () => {
  return HttpResponse.json(
    { success: false, message: 'Internal server error', errors: ['Server error'] },
    { status: 500 }
  );
});

export const unauthorizedHandler = http.get('*/api/support/*', () => {
  return HttpResponse.json(
    { success: false, message: 'Unauthorized', errors: ['Permission denied'] },
    { status: 403 }
  );
});

// ============================================================================
// Combined Handlers Export
// ============================================================================

export const supportHandlers = [
  supportMetricsHandler,
  customerSearchHandler,
  customerByIdHandler,
  billingOverviewHandler,
  transactionsHandler,
  refundsListHandler,
  createRefundHandler,
  invoicesHandler,
  paymentMethodsHandler,
  calculatePaymentHandler,
  processManualPaymentHandler,
  subscriptionsHandler,
  subscriptionPlansHandler,
  subscriptionPreviewHandler,
  modifySubscriptionHandler,
  actionHistoryHandler,
];
