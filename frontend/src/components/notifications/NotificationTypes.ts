'use client';

// Core notification interfaces
export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'destructive';
  url?: string;
  action?: () => void;
  icon?: React.ReactNode;
  requiresConfirmation?: boolean;
  confirmationText?: string;
}

export interface NotificationMetadata {
  contentId?: string;
  userId?: string;
  source?: string;
  referenceId?: string;
  imageUrl?: string;
  url?: string;
  deviceType?: 'mobile' | 'desktop';
  browser?: string;
  location?: string;
  platform?: string;
  version?: string;
  timestamp?: string;
  retry?: number;
  maxRetries?: number;
}

export interface BaseNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  timestamp: Date;
  read: boolean;
  archived: boolean;
  starred: boolean;
  actionable: boolean;
  actions?: NotificationAction[];
  metadata?: NotificationMetadata;
}

// Notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export type NotificationCategory =
  | 'watchlist'
  | 'system'
  | 'security'
  | 'social'
  | 'billing'
  | 'content'
  | 'performance'
  | 'marketing'
  | 'support';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export type NotificationChannel = 'push' | 'email' | 'in-app' | 'sms' | 'webhook';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'expired';

// Delivery and tracking
export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  attempts: number;
  lastAttempt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  category: NotificationCategory;
  type: NotificationType;
  priority: NotificationPriority;
  template: {
    title: string;
    message: string;
    actions?: Omit<NotificationAction, 'action'>[];
  };
  channels: NotificationChannel[];
  variables: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// User preferences
export interface NotificationPreference {
  id: string;
  category: NotificationCategory;
  name: string;
  description: string;
  channels: Record<NotificationChannel, boolean>;
  priority: NotificationPriority;
  frequency: NotificationFrequency;
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone?: string;
  };
  conditions?: string[];
  enabled: boolean;
}

export type NotificationFrequency = 'instant' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'never';

export interface NotificationSettings {
  id: string;
  userId: string;
  globalEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  emailDigest: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'never';
    time: string;
    timezone?: string;
  };
  preferences: NotificationPreference[];
  customRules: NotificationRule[];
  blockedSources: string[];
  allowedSources: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationRule {
  id: string;
  name: string;
  description?: string;
  conditions: NotificationRuleCondition[];
  actions: NotificationRuleAction[];
  enabled: boolean;
  priority: number;
  createdAt: Date;
}

export interface NotificationRuleCondition {
  field: 'category' | 'type' | 'priority' | 'source' | 'title' | 'message' | 'time' | 'user' | 'content';
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'starts_with'
    | 'ends_with'
    | 'greater_than'
    | 'less_than'
    | 'in'
    | 'not_in';
  value: string | string[] | number | boolean;
  caseSensitive?: boolean;
}

export interface NotificationRuleAction {
  type: 'block' | 'allow' | 'modify_priority' | 'modify_channel' | 'add_tag' | 'forward' | 'delay';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: Record<string, any>;
}

// Analytics and metrics
export interface NotificationAnalytics {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  dismissed: number;
  failed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  dismissalRate: number;
  avgResponseTime: number;
  categoryBreakdown: Record<
    NotificationCategory,
    {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
    }
  >;
  channelBreakdown: Record<
    NotificationChannel,
    {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
    }
  >;
  hourlyStats: Array<{
    hour: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }>;
  dailyStats: Array<{
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }>;
  topSources: Array<{
    source: string;
    count: number;
    engagementRate: number;
  }>;
  deviceBreakdown: Record<'mobile' | 'desktop' | 'tablet', number>;
  browserBreakdown: Record<string, number>;
}

// Real-time connection
export interface NotificationConnectionState {
  isConnected: boolean;
  connectionType: 'websocket' | 'signalr' | 'sse' | 'polling';
  lastHeartbeat: Date;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  connectionId?: string;
  userId?: string;
  subscriptions: string[];
}

// Push notifications
export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  deviceInfo?: {
    type: 'mobile' | 'desktop' | 'tablet';
    os: string;
    browser: string;
    version: string;
  };
  createdAt: Date;
  lastUsed?: Date;
  active: boolean;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  vibrate?: number[];
}

// Server-sent events
export interface NotificationEvent {
  type: 'notification' | 'update' | 'delete' | 'clear' | 'settings_change' | 'connection_status';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

// Batch operations
export interface NotificationBatchOperation {
  type: 'mark_read' | 'mark_unread' | 'archive' | 'unarchive' | 'delete' | 'star' | 'unstar';
  notificationIds: string[];
  userId: string;
  timestamp: Date;
}

export interface NotificationBatchResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{
    notificationId: string;
    error: string;
  }>;
}

// Error handling
export interface NotificationError {
  code: string;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  notificationId?: string;
  recoverable: boolean;
  retryAfter?: number;
}

// Watchlist integration
export interface WatchlistNotification extends BaseNotification {
  category: 'watchlist';
  metadata: NotificationMetadata & {
    contentId: string;
    contentTitle: string;
    contentType: 'movie' | 'tv_show' | 'documentary' | 'anime';
    platform: string;
    availabilityType: 'new' | 'returning' | 'expiring' | 'price_change';
    expiryDate?: string;
    previousPrice?: number;
    currentPrice?: number;
    genres?: string[];
    rating?: number;
    releaseYear?: number;
  };
}

// Security notifications
export interface SecurityNotification extends BaseNotification {
  category: 'security';
  metadata: NotificationMetadata & {
    securityEventType:
      | 'login'
      | 'password_change'
      | 'email_change'
      | 'suspicious_activity'
      | 'data_breach'
      | 'account_locked';
    ipAddress?: string;
    userAgent?: string;
    location?: {
      city: string;
      country: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
    };
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    actionRequired: boolean;
  };
}

// System notifications
export interface SystemNotification extends BaseNotification {
  category: 'system';
  metadata: NotificationMetadata & {
    systemEventType: 'maintenance' | 'outage' | 'update' | 'announcement' | 'feature' | 'deprecation';
    affectedServices?: string[];
    scheduledTime?: string;
    duration?: number;
    workaround?: string;
    moreInfoUrl?: string;
  };
}

// Billing notifications
export interface BillingNotification extends BaseNotification {
  category: 'billing';
  metadata: NotificationMetadata & {
    billingEventType:
      | 'payment_success'
      | 'payment_failed'
      | 'subscription_expired'
      | 'subscription_renewed'
      | 'invoice_generated'
      | 'refund_processed';
    amount?: number;
    currency?: string;
    invoiceId?: string;
    subscriptionId?: string;
    nextBillingDate?: string;
    paymentMethod?: string;
  };
}

// Type guards
export const isWatchlistNotification = (notification: BaseNotification): notification is WatchlistNotification => {
  return notification.category === 'watchlist';
};

export const isSecurityNotification = (notification: BaseNotification): notification is SecurityNotification => {
  return notification.category === 'security';
};

export const isSystemNotification = (notification: BaseNotification): notification is SystemNotification => {
  return notification.category === 'system';
};

export const isBillingNotification = (notification: BaseNotification): notification is BillingNotification => {
  return notification.category === 'billing';
};

// Utility functions
export const getNotificationIcon = (notification: BaseNotification): string => {
  switch (notification.type) {
    case 'success':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'error':
      return '❌';
    default:
      return 'ℹ️';
  }
};

export const getNotificationColor = (notification: BaseNotification): string => {
  switch (notification.type) {
    case 'success':
      return 'green';
    case 'warning':
      return 'yellow';
    case 'error':
      return 'red';
    default:
      return 'blue';
  }
};

export const getPriorityWeight = (priority: NotificationPriority): number => {
  switch (priority) {
    case 'low':
      return 1;
    case 'medium':
      return 2;
    case 'high':
      return 3;
    case 'critical':
      return 4;
    default:
      return 1;
  }
};

export const sortNotificationsByPriority = (notifications: BaseNotification[]): BaseNotification[] => {
  return notifications.sort((a, b) => {
    const priorityDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    if (priorityDiff !== 0) return priorityDiff;

    // If same priority, sort by timestamp (newest first)
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
};

export const filterNotificationsByCategory = (
  notifications: BaseNotification[],
  category: NotificationCategory | 'all'
): BaseNotification[] => {
  if (category === 'all') return notifications;
  return notifications.filter(n => n.category === category);
};

export const getUnreadCount = (notifications: BaseNotification[]): number => {
  return notifications.filter(n => !n.read && !n.archived).length;
};

export const getCriticalCount = (notifications: BaseNotification[]): number => {
  return notifications.filter(n => n.priority === 'critical' && !n.read && !n.archived).length;
};

// Validation functions
export const validateNotification = (notification: Partial<BaseNotification>): string[] => {
  const errors: string[] = [];

  if (!notification.title || notification.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!notification.message || notification.message.trim().length === 0) {
    errors.push('Message is required');
  }

  if (notification.title && notification.title.length > 100) {
    errors.push('Title must be 100 characters or less');
  }

  if (notification.message && notification.message.length > 500) {
    errors.push('Message must be 500 characters or less');
  }

  const validTypes: NotificationType[] = ['info', 'success', 'warning', 'error'];
  if (notification.type && !validTypes.includes(notification.type)) {
    errors.push('Invalid notification type');
  }

  const validCategories: NotificationCategory[] = [
    'watchlist',
    'system',
    'security',
    'social',
    'billing',
    'content',
    'performance',
    'marketing',
    'support',
  ];
  if (notification.category && !validCategories.includes(notification.category)) {
    errors.push('Invalid notification category');
  }

  const validPriorities: NotificationPriority[] = ['low', 'medium', 'high', 'critical'];
  if (notification.priority && !validPriorities.includes(notification.priority)) {
    errors.push('Invalid notification priority');
  }

  return errors;
};

// Default factory functions
export const createDefaultNotification = (overrides: Partial<BaseNotification> = {}): BaseNotification => {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36),
    title: 'Notification',
    message: 'You have a new notification',
    type: 'info',
    category: 'system',
    priority: 'medium',
    timestamp: new Date(),
    read: false,
    archived: false,
    starred: false,
    actionable: false,
    ...overrides,
  };
};

export const createWatchlistNotification = (
  contentTitle: string,
  platform: string,
  contentId: string,
  availabilityType: 'new' | 'returning' | 'expiring' | 'price_change' = 'new'
): WatchlistNotification => {
  return {
    ...createDefaultNotification(),
    category: 'watchlist',
    title: `${availabilityType === 'expiring' ? 'Content Expiring' : 'Watchlist Update'}`,
    message:
      availabilityType === 'expiring'
        ? `${contentTitle} is leaving ${platform} soon`
        : `${contentTitle} is now available on ${platform}`,
    type: availabilityType === 'expiring' ? 'warning' : 'info',
    priority: availabilityType === 'expiring' ? 'high' : 'medium',
    actionable: true,
    actions: [
      {
        id: 'watch-now',
        label: 'Watch Now',
        type: 'primary',
        url: `/watch/${contentId}`,
      },
      {
        id: 'view-details',
        label: 'View Details',
        type: 'secondary',
        url: `/content/${contentId}`,
      },
    ],
    metadata: {
      contentId,
      contentTitle,
      contentType: 'movie',
      platform,
      availabilityType,
      source: platform,
      imageUrl: `/api/content/${contentId}/thumbnail`,
    },
  } as WatchlistNotification;
};

export const createSecurityNotification = (
  eventType: SecurityNotification['metadata']['securityEventType'],
  riskLevel: SecurityNotification['metadata']['riskLevel'] = 'medium'
): SecurityNotification => {
  const messages = {
    login: 'New login detected from an unrecognized device',
    password_change: 'Your password has been changed successfully',
    email_change: 'Your email address has been updated',
    suspicious_activity: 'Suspicious activity detected on your account',
    data_breach: 'Security incident detected - please review your account',
    account_locked: 'Your account has been temporarily locked for security',
  };

  return {
    ...createDefaultNotification(),
    category: 'security',
    title: 'Security Alert',
    message: messages[eventType],
    type: riskLevel === 'critical' ? 'error' : 'warning',
    priority: riskLevel === 'low' ? 'medium' : riskLevel,
    actionable: true,
    actions: [
      {
        id: 'review-security',
        label: 'Review Security',
        type: 'primary',
        url: '/account/security',
      },
      {
        id: 'contact-support',
        label: 'Contact Support',
        type: 'secondary',
        url: '/support',
      },
    ],
    metadata: {
      securityEventType: eventType,
      riskLevel,
      actionRequired: riskLevel === 'high' || riskLevel === 'critical',
      source: 'security-system',
    },
  } as SecurityNotification;
};

// Export all types for easy importing
export type { BaseNotification as AppNotification };
