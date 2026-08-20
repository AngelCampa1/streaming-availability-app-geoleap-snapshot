/**
 * Mobile Analytics Type Definitions
 */

export interface QueuedEvent {
  id: string;
  timestamp: number;
  eventType: string;
  category: string;
  source: 'analytics' | 'viewing' | 'notifications' | 'user';
  data: Record<string, unknown>;
  retryCount: number;
}

export interface AnalyticsConfig {
  userId?: string;
  sessionId: string;
  deviceId: string;
  hasConsent: boolean;
  consentCategories: string;
}

export interface UserBehaviorEventRequest {
  eventType: string;
  category: string;
  userId?: string;
  sessionId: string;
  deviceId?: string;
  clientTimestamp: string; // ISO DateTime string
  properties: string; // JSON string
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  landingPage?: string;
  screenResolution?: string;
  viewportSize?: string;
  eventValue?: number;
  currency?: string;
  hasConsent: boolean;
  consentCategories?: string;
  platform?: string;
}

export interface ViewingSession {
  userId: string;
  contentId: string;
  source: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  completed: boolean;
}

// Storage keys
export const STORAGE_KEYS = {
  DEVICE_ID: '@geoleap_device_id',
  CONSENT: '@geoleap_consent',
  ANALYTICS_QUEUE: '@geoleap_analytics_queue',
  FAILED_QUEUE: '@geoleap_analytics_failed_queue',
} as const;

// Batch configuration
export const BATCH_CONFIG = {
  SIZE: 50,
  FLUSH_INTERVAL: 30000, // 30 seconds
  MAX_QUEUE_SIZE: 1000,
  MAX_RETRIES: 3,
} as const;

// Retry delays (exponential backoff: 1s, 2s, 4s)
export const RETRY_DELAYS = [1000, 2000, 4000];
