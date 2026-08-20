/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Stripe } from '@stripe/stripe-js';

// Base payment interfaces matching backend models
export interface PaymentTransaction {
  id: string;
  userId: string;
  stripePaymentIntentId: string;
  status: string;
  amount: number;
  currency: string;
  description?: string;
  paymentMethodId?: string;
  failureReason?: string;
  createdAt: string;
  processedAt?: string;
  clientSecret?: string;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  type: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: string;
}

export interface StripeCustomer {
  id: string;
  userId: string;
  stripeCustomerId: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

// API Request/Response types
export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  description?: string;
  paymentMethodId?: string;
  confirmPayment?: boolean;
}

export interface PaymentMethodRequest {
  stripePaymentMethodId: string;
  setAsDefault?: boolean;
}

// Frontend-specific types
export interface PaymentFormData {
  amount: number;
  currency: string;
  description: string;
  savePaymentMethod: boolean;
}

export interface PaymentFormErrors {
  general?: string;
  amount?: string;
  card?: string;
  processing?: string;
}

export interface PaymentState {
  isProcessing: boolean;
  isConfirming: boolean;
  error: string | null;
  success: boolean;
  transaction: PaymentTransaction | null;
  paymentMethods: PaymentMethod[];
  stripeCustomer: StripeCustomer | null;
}

export interface StripeElementsProps {
  stripe: Stripe | null;
  elements: any;
  loading: boolean;
}

export interface PaymentConfirmation {
  transaction: PaymentTransaction;
  receiptUrl?: string;
  nextSteps?: string[];
  isSubscription?: boolean;
}

// Subscription-related types (for future user stories)
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
}

export interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod;
  isDefault?: boolean;
  onSetDefault?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  loading?: boolean;
}

export interface PaymentFormProps {
  amount?: number;
  currency?: string;
  description?: string;
  onSuccess?: (transaction: PaymentTransaction) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  showSavePaymentMethod?: boolean;
  prefilledPaymentMethodId?: string;
}

export interface PaymentHistoryProps {
  userId: string;
  page?: number;
  pageSize?: number;
}

// Stripe webhook event types
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

// Error types specific to payments
export enum PaymentErrorType {
  CARD_DECLINED = 'card_declined',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  INVALID_CARD = 'invalid_card',
  PROCESSING_ERROR = 'processing_error',
  NETWORK_ERROR = 'network_error',
  AUTHENTICATION_REQUIRED = 'authentication_required',
  UNKNOWN = 'unknown',
}

export interface PaymentError {
  type: PaymentErrorType;
  message: string;
  code?: string;
  param?: string;
  declineCode?: string;
}

// Payment analytics types
export interface PaymentAnalytics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalAmount: number;
  averageTransactionAmount: number;
  mostUsedPaymentMethod: string;
  conversionRate: number;
  timeRange: {
    start: string;
    end: string;
  };
}

// Failed Payment & Dunning types
export interface FailedPayment {
  id: string;
  userId: string;
  paymentTransactionId: string;
  subscriptionId?: string;
  failureType: string;
  declineCode: string;
  failureMessage: string;
  retryCount: number;
  isRetriable: boolean;
  recoveryStatus: string;
  lastRetryAt?: string;
  nextRetryAt?: string;
  resolvedAt?: string;
  resolutionMethod?: string;
  gracePeriodId?: string;
  createdAt: string;
  updatedAt: string;
  // Navigation properties
  paymentTransaction?: PaymentTransaction;
  gracePeriod?: GracePeriod;
  retryAttempts?: PaymentRetryAttempt[];
  dunningCampaigns?: DunningCampaign[];
}

export interface PaymentRetryAttempt {
  id: string;
  failedPaymentId: string;
  attemptNumber: number;
  status: string;
  retryMethod: string;
  failureReason?: string;
  stripePaymentIntentId?: string;
  triggeredBy: string;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GracePeriod {
  id: string;
  failedPaymentId: string;
  userId: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  status: string;
  extendedAt?: string;
  extendedBy?: string;
  extensionReason?: string;
  endedAt?: string;
  endReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DunningCampaign {
  id: string;
  failedPaymentId: string;
  campaignName: string;
  customerSegment: string;
  status: string;
  triggerEvent: string;
  startDate: string;
  endDate?: string;
  completionReason?: string;
  createdAt: string;
  updatedAt: string;
  dunningSteps?: DunningStep[];
  dunningExecutions?: DunningCampaignExecution[];
}

export interface DunningStep {
  id: string;
  dunningCampaignId: string;
  stepNumber: number;
  delayDays: number;
  notificationChannel: string;
  messageTemplate: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface DunningCampaignExecution {
  id: string;
  dunningCampaignId: string;
  dunningStepId: string;
  status: string;
  scheduledAt: string;
  executedAt?: string;
  notificationId?: string;
  failureReason?: string;
  correlationId: string;
  metadata?: Record<string, any>;
}

export interface PaymentRecoverySession {
  id: string;
  failedPaymentId: string;
  sessionToken: string;
  status: string;
  expiresAt: string;
  completedAt?: string;
  completionMethod?: string;
  accessCount: number;
  createdAt: string;
  updatedAt: string;
}

// Request/Response DTOs for payment recovery
export interface ManualPaymentRetryRequest {
  reason?: string;
}

export interface CompleteRecoverySessionRequest {
  completionType: string;
}

export interface UpdateGracePeriodRequest {
  extendDays?: number;
  reason?: string;
}

export interface RetryAnalytics {
  totalFailedPayments: number;
  totalRetryAttempts: number;
  successfulRecoveries: number;
  recoveryRate: number;
  averageRetriesToRecovery: number;
  topFailureReasons: Array<{ reason: string; count: number; percentage: number }>;
  retryMethodEffectiveness: Array<{ method: string; successRate: number; averageTime: number }>;
  timeToRecoveryDistribution: Array<{ timeBucket: string; count: number; percentage: number }>;
}

export interface GracePeriodAnalytics {
  totalGracePeriods: number;
  activeGracePeriods: number;
  expiredGracePeriods: number;
  resolvedGracePeriods: number;
  averageGracePeriodDuration: number;
  gracePeriodResolutionRate: number;
  extensionRate: number;
  topEndReasons: Array<{ reason: string; count: number; percentage: number }>;
}

export interface RecoveryMetrics {
  retry_analytics: RetryAnalytics;
  grace_period_analytics: GracePeriodAnalytics;
  period: {
    start: string;
    end: string;
  };
}

// Configuration types
export interface StripeConfig {
  publishableKey: string;
  apiVersion: string;
  appearance?: {
    theme?: 'stripe' | 'night' | 'flat' | 'none';
    labels?: 'above' | 'floating';
    variables?: Record<string, string>;
    rules?: Record<string, Record<string, string>>;
  };
  clientSecret?: string;
}

export interface PaymentConfig {
  stripe: StripeConfig;
  supportedCurrencies: string[];
  minimumAmount: number;
  maximumAmount: number;
  defaultCurrency: string;
  enableSavePaymentMethod: boolean;
}
