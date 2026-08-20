/* eslint-disable @typescript-eslint/no-explicit-any */
// Support system types for customer billing support tools
export interface SupportTicket {
  id: string;
  title: string;
  customer: string;
  status: string;
  priority: string;
  createdAt: string;
  assignedTo?: string;
  description?: string;
}

export interface CustomerAccount {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  createdAt: string;
  status: 'active' | 'suspended' | 'cancelled';
  tier: 'free' | 'basic' | 'premium' | 'enterprise';
  totalPaid: number;
  lastPaymentDate?: string;
  nextBillingDate?: string;
  // Masked sensitive data
  maskedSSN?: string;
  maskedPhone?: string;
}

export interface SupportPaymentMethod {
  id: string;
  customerId: string;
  type: 'card' | 'bank_account' | 'paypal';
  // Masked card information
  maskedCardNumber: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  status: 'active' | 'expired' | 'declined' | 'requires_verification';
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  createdAt: string;
  lastUsed?: string;
}

export interface SupportSubscription {
  id: string;
  customerId: string;
  planId: string;
  planName: string;
  status: 'active' | 'past_due' | 'cancelled' | 'paused' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string;
  trialEnd?: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  discounts?: Array<{
    id: string;
    name: string;
    percentOff?: number;
    amountOff?: number;
  }>;
  features: string[];
  metadata?: Record<string, string>;
}

export interface SupportInvoice {
  id: string;
  customerId: string;
  number: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amount: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
  description?: string;
  lineItems: Array<{
    id: string;
    description: string;
    amount: number;
    quantity: number;
  }>;
  paymentUrl?: string;
  downloadUrl?: string;
}

export interface SupportTransaction {
  id: string;
  customerId: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'cancelled' | 'refunded';
  type: 'payment' | 'refund' | 'adjustment';
  method: 'card' | 'bank_transfer' | 'cash' | 'check' | 'other';
  description: string;
  failureReason?: string;
  refundAmount?: number;
  refundReason?: string;
  processedAt: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

export interface SupportRefund {
  id: string;
  transactionId: string;
  customerId: string;
  amount: number;
  currency: string;
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other';
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  requestedBy: string;
  approvedBy?: string;
  processedAt?: string;
  failureReason?: string;
  notes?: string;
  createdAt: string;
  requiresApproval: boolean;
  approvalWorkflow?: {
    status: 'pending' | 'approved' | 'rejected';
    reviewers: Array<{
      userId: string;
      name: string;
      decision?: 'approve' | 'reject';
      notes?: string;
      reviewedAt?: string;
    }>;
  };
}

export interface SupportAction {
  id: string;
  customerId: string;
  performedBy: string;
  performedByName: string;
  action:
    | 'payment_processed'
    | 'refund_issued'
    | 'subscription_modified'
    | 'payment_method_updated'
    | 'invoice_regenerated'
    | 'grace_period_extended'
    | 'account_suspended'
    | 'account_reactivated'
    | 'notes_added'
    | 'escalated';
  description: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
}

// Support Representative Permission System
export interface SupportPermission {
  id: string;
  name: string;
  description: string;
  category: 'billing' | 'account' | 'refunds' | 'reporting' | 'administration';
  level: 'read' | 'write' | 'approve' | 'admin';
}

export interface SupportRole {
  id: string;
  name: string;
  description: string;
  permissions: SupportPermission[];
  maxRefundAmount?: number;
  requiresApproval?: boolean;
}

export interface SupportUser {
  id: string;
  email: string;
  name: string;
  role: SupportRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

// Manual Payment Processing
export interface ManualPaymentRequest {
  customerId: string;
  amount: number;
  currency: string;
  method: 'card' | 'bank_transfer' | 'cash' | 'check' | 'wire_transfer';
  description: string;
  reference?: string;
  notes?: string;
  skipNotification?: boolean;
  markAsPaid?: boolean;
  dueDate?: string;
}

export interface ManualPaymentConfirmation {
  transactionId: string;
  confirmationType: 'immediate' | 'scheduled';
  confirmationRequired: boolean;
  estimatedProcessingTime: string;
  warnings?: string[];
  nextSteps: string[];
}

// Subscription Modification
export interface SubscriptionModificationRequest {
  subscriptionId: string;
  action: 'upgrade' | 'downgrade' | 'pause' | 'resume' | 'cancel' | 'extend_trial';
  newPlanId?: string;
  effectiveDate?: string;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  reason: string;
  notes?: string;
  notifyCustomer?: boolean;
}

export interface SubscriptionModificationPreview {
  currentAmount: number;
  newAmount: number;
  prorationAmount: number;
  effectiveDate: string;
  nextBillingDate: string;
  changes: Array<{
    item: string;
    oldValue: string;
    newValue: string;
  }>;
  warnings?: string[];
  requiresApproval: boolean;
}

// Data Masking Configuration
export interface DataMaskingConfig {
  maskCardNumbers: boolean;
  maskSSN: boolean;
  maskPhoneNumbers: boolean;
  maskEmailDomains: boolean;
  showFullDataRoles: string[];
}

export interface MaskedData {
  original: string;
  masked: string;
  canViewFull: boolean;
  maskType: 'card' | 'ssn' | 'phone' | 'email' | 'custom';
}

// Mobile Support Interface
export interface MobileSupportConfig {
  enabledFeatures: Array<'payments' | 'refunds' | 'subscriptions' | 'customer_lookup' | 'basic_info'>;
  quickActions: Array<{
    id: string;
    label: string;
    action: string;
    requiresConfirmation: boolean;
    permission?: string;
  }>;
}

// Filter and Search Options
export interface CustomerSearchFilters {
  email?: string;
  customerId?: string;
  subscriptionStatus?: string[];
  paymentStatus?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  amountRange?: {
    min: number;
    max: number;
  };
  tier?: string[];
}

export interface SupportDashboardFilters {
  timeRange: '24h' | '7d' | '30d' | '90d' | 'custom';
  customRange?: {
    start: string;
    end: string;
  };
  status?: string[];
  assignedTo?: string;
  priority?: string[];
}

// Analytics and Reporting
export interface SupportMetrics {
  totalCustomers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  pendingRefunds: number;
  failedPayments: number;
  supportTickets: number;
  averageResolutionTime: number;
  customerSatisfaction: number;
}

export interface SupportAnalytics {
  metrics: SupportMetrics;
  trends: Array<{
    metric: string;
    value: number;
    change: number;
    direction: 'up' | 'down' | 'stable';
  }>;
  topIssues: Array<{
    issue: string;
    count: number;
    percentage: number;
  }>;
  timeRange: {
    start: string;
    end: string;
  };
}

// API Response Types
export interface SupportApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Error Handling
export interface SupportError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
  retryable: boolean;
}

export type SupportErrorType =
  | 'permission_denied'
  | 'customer_not_found'
  | 'payment_failed'
  | 'refund_failed'
  | 'subscription_error'
  | 'validation_error'
  | 'network_error'
  | 'server_error';
