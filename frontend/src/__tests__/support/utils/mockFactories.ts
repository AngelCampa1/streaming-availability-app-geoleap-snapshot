/**
 * Mock Data Factories for Testing
 *
 * Provides factory functions to create mock data objects for all test suites.
 * Use these factories to create consistent, realistic test data.
 */

import type {
  CustomerAccount,
  SupportMetrics,
  SupportUser,
  SupportRole,
  SupportPermission,
  SupportTransaction,
  SupportRefund,
  SupportSubscription,
  SupportInvoice,
  SupportPaymentMethod,
  SupportAction,
} from '@/lib/types/support';

import type {
  CountryRecommendation,
  VpnProviderSummary,
  CountriesForContentResponse,
} from '@/types/vpn-country';

// ============================================================================
// Support System Mocks
// ============================================================================

export const createMockPermission = (overrides: Partial<SupportPermission> = {}): SupportPermission => ({
  id: 'perm-1',
  name: 'view_customer_data',
  description: 'Can view customer information',
  category: 'billing',
  level: 'read',
  ...overrides,
});

export const createMockRole = (overrides: Partial<SupportRole> = {}): SupportRole => ({
  id: 'role-1',
  name: 'Support Agent',
  description: 'Standard support agent role',
  permissions: [createMockPermission()],
  maxRefundAmount: 1000,
  requiresApproval: true,
  ...overrides,
});

export const createMockSupportUser = (overrides: Partial<SupportUser> = {}): SupportUser => ({
  id: 'user-1',
  email: 'support@example.com',
  name: 'Support Agent',
  role: createMockRole(),
  isActive: true,
  lastLogin: new Date().toISOString(),
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

export const createMockCustomer = (overrides: Partial<CustomerAccount> = {}): CustomerAccount => ({
  id: 'cust-123',
  email: 'customer@example.com',
  name: 'John Doe',
  phone: '+1234567890',
  createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'active',
  tier: 'premium',
  totalPaid: 299.97,
  lastPaymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  maskedSSN: '***-**-1234',
  maskedPhone: '***-***-7890',
  ...overrides,
});

export const createMockMetrics = (overrides: Partial<SupportMetrics> = {}): SupportMetrics => ({
  totalCustomers: 15420,
  activeSubscriptions: 12350,
  monthlyRevenue: 123450.00,
  pendingRefunds: 23,
  failedPayments: 45,
  supportTickets: 127,
  averageResolutionTime: 4.5,
  customerSatisfaction: 4.7,
  ...overrides,
});

export const createMockTransaction = (overrides: Partial<SupportTransaction> = {}): SupportTransaction => ({
  id: 'txn-001',
  customerId: 'cust-123',
  invoiceId: 'inv-001',
  amount: 9.99,
  currency: 'usd',
  status: 'succeeded',
  type: 'payment',
  method: 'card',
  description: 'Monthly subscription payment',
  processedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const createMockRefund = (overrides: Partial<SupportRefund> = {}): SupportRefund => ({
  id: 'ref-001',
  transactionId: 'txn-001',
  customerId: 'cust-123',
  amount: 9.99,
  currency: 'usd',
  reason: 'requested_by_customer',
  status: 'succeeded',
  requestedBy: 'user-1',
  createdAt: new Date().toISOString(),
  requiresApproval: false,
  ...overrides,
});

export const createMockSubscription = (overrides: Partial<SupportSubscription> = {}): SupportSubscription => ({
  id: 'sub-001',
  customerId: 'cust-123',
  planId: 'plan-premium',
  planName: 'Premium Monthly',
  status: 'active',
  currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  cancelAtPeriodEnd: false,
  amount: 999,
  currency: 'usd',
  interval: 'month',
  features: ['Unlimited searches', 'VPN recommendations', 'No ads'],
  ...overrides,
});

export const createMockInvoice = (overrides: Partial<SupportInvoice> = {}): SupportInvoice => ({
  id: 'inv-001',
  customerId: 'cust-123',
  number: 'INV-2024-001',
  status: 'paid',
  amount: 999,
  amountPaid: 999,
  amountDue: 0,
  currency: 'usd',
  paidAt: new Date().toISOString(),
  createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  description: 'Premium Monthly Subscription',
  lineItems: [
    {
      id: 'li-001',
      description: 'Premium Monthly Plan',
      amount: 999,
      quantity: 1,
    },
  ],
  ...overrides,
});

export const createMockPaymentMethod = (overrides: Partial<SupportPaymentMethod> = {}): SupportPaymentMethod => ({
  id: 'pm-001',
  customerId: 'cust-123',
  type: 'card',
  maskedCardNumber: '****-****-****-4242',
  brand: 'Visa',
  expiryMonth: 12,
  expiryYear: 2025,
  isDefault: true,
  status: 'active',
  billingAddress: {
    line1: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'US',
  },
  createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  lastUsed: new Date().toISOString(),
  ...overrides,
});

export const createMockAction = (overrides: Partial<SupportAction> = {}): SupportAction => ({
  id: 'act-001',
  customerId: 'cust-123',
  performedBy: 'user-1',
  performedByName: 'Support Agent',
  action: 'payment_processed',
  description: 'Processed manual payment',
  timestamp: new Date().toISOString(),
  success: true,
  ...overrides,
});

// ============================================================================
// VPN System Mocks
// ============================================================================

export const createMockVpnProvider = (overrides: Partial<VpnProviderSummary> = {}): VpnProviderSummary => ({
  vpnProviderId: 'vpn-001',
  vpnProviderName: 'ExpressVPN',
  vpnProviderLogoUrl: 'https://example.com/expressvpn-logo.png',
  rating: 4.7,
  price: 12.95,
  currency: 'USD',
  serverCount: 3000,
  affiliateLink: 'https://example.com/expressvpn-affiliate',
  speedMbps: 950,
  features: ['Kill Switch', 'No-Logs Policy', '24/7 Support'],
  ...overrides,
});

export const createMockCountryRecommendation = (
  overrides: Partial<CountryRecommendation> = {}
): CountryRecommendation => ({
  countryCode: 'US',
  countryName: 'United States',
  countryFlag: '🇺🇸',
  audioLanguages: ['en'],
  subtitleLanguages: ['en', 'es'],
  languageScore: 100,
  languageMatchQuality: 'Perfect',
  languageHighlights: ['Perfect audio match', 'All preferred subtitles available'],
  availableVpnProviders: [createMockVpnProvider()],
  streamingServices: ['Netflix', 'Hulu', 'Disney+'],
  rank: 1,
  ...overrides,
});

export const createMockCountriesResponse = (
  overrides: Partial<CountriesForContentResponse> = {}
): CountriesForContentResponse => ({
  contentId: 'content-123',
  contentTitle: 'Stranger Things',
  userAudioLanguages: ['en'],
  userSubtitleLanguages: ['en'],
  countries: [
    createMockCountryRecommendation(),
    createMockCountryRecommendation({
      countryCode: 'GB',
      countryName: 'United Kingdom',
      countryFlag: '🇬🇧',
      rank: 2,
    }),
  ],
  totalCountries: 2,
  generatedAt: new Date().toISOString(),
  ...overrides,
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates multiple mock customers with incremental IDs
 */
export const createMockCustomers = (count: number): CustomerAccount[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockCustomer({
      id: `cust-${i + 1}`,
      email: `customer${i + 1}@example.com`,
      name: `Customer ${i + 1}`,
    })
  );
};

/**
 * Creates multiple mock transactions for a customer
 */
export const createMockTransactions = (customerId: string, count: number): SupportTransaction[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockTransaction({
      id: `txn-${i + 1}`,
      customerId,
      amount: (i + 1) * 9.99,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    })
  );
};

/**
 * Creates a mock customer with full billing data
 */
export const createMockCustomerWithBilling = () => {
  const customer = createMockCustomer();
  return {
    customer,
    transactions: createMockTransactions(customer.id, 5),
    subscriptions: [createMockSubscription({ customerId: customer.id })],
    paymentMethods: [createMockPaymentMethod({ customerId: customer.id })],
    invoices: [createMockInvoice({ customerId: customer.id })],
  };
};
