import { Contact, PhoneNumber, EmailAddress } from '../services/contactIntegrationService';
import { CalendarEvent, CalendarReminder } from '../services/calendarIntegrationService';
import { ShareContent, ShareTarget } from '../services/nativeSharingService';
import { WidgetData, WidgetConfig, AppShortcut } from '../services/widgetService';
import { SyncTask, SyncConfig, SyncStats } from '../services/backgroundSyncService';

// Re-export all mobile feature types for convenience
export type {
  Contact,
  PhoneNumber,
  EmailAddress,
  CalendarEvent,
  CalendarReminder,
  ShareContent,
  ShareTarget,
  WidgetData,
  WidgetConfig,
  AppShortcut,
  SyncTask,
  SyncConfig,
  SyncStats,
};

// Mobile Features Hook Return Types
export interface UseMobileFeaturesReturn {
  // Offline functionality
  isOffline: boolean;
  cacheSize: number;
  pendingActionsCount: number;
  clearCache: () => Promise<void>;
  forceSyncOfflineActions: () => Promise<void>;

  // Native sharing
  shareContent: (content: ShareContent) => Promise<void>;
  shareToSocial: (content: ShareContent, target: ShareTarget) => Promise<void>;
  shareViaSMS: (content: ShareContent, phoneNumber?: string) => Promise<void>;
  shareViaEmail: (content: ShareContent, email?: string) => Promise<void>;
  copyToClipboard: (content: ShareContent) => Promise<void>;

  // Contact integration
  hasContactPermission: boolean;
  requestContactPermission: () => Promise<boolean>;
  getAllContacts: () => Promise<Contact[]>;
  searchContacts: (query: string) => Promise<Contact[]>;
  selectContactsForSharing: (maxContacts?: number) => Promise<Contact[]>;

  // Calendar integration
  hasCalendarPermission: boolean;
  requestCalendarPermission: () => Promise<boolean>;
  createContentReminder: (
    contentId: string,
    contentTitle: string,
    reminderDate: Date,
    type: 'watch' | 'release' | 'update' | 'custom'
  ) => Promise<string>;
  updateContentReminder: (contentId: string, newDate: Date) => Promise<void>;
  cancelContentReminder: (contentId: string) => Promise<void>;
  getActiveReminders: () => CalendarReminder[];

  // Appearance preferences
  setHighContrast: (enabled: boolean) => Promise<void>;

  // Widgets and shortcuts
  widgetData: WidgetData[];
  appShortcuts: AppShortcut[];
  refreshWidget: (widgetId: string) => Promise<void>;
  configureWidget: (widgetId: string, config: Partial<WidgetConfig>) => Promise<void>;
  toggleWidget: (widgetId: string, enabled: boolean) => Promise<void>;

  // Background sync
  syncStats: SyncStats;
  addSyncTask: (type: SyncTask['type'],
 data: unknown, priority?: SyncTask['priority']) => Promise<string>;
  forceSyncNow: () => Promise<void>;
  clearPendingTasks: () => Promise<void>;
  updateSyncConfig: (config: Partial<SyncConfig>) => Promise<void>;
}

// Mobile Features Configuration
export interface MobileFeaturesConfig {
  offline: {
    enabled: boolean;
    maxCacheSize: number; // in bytes
    autoSync: boolean;
    syncInterval: number; // in minutes
  };
  sharing: {
    enabled: boolean;
    enableNativeShare: boolean;
    enableSocialShare: boolean;
    enableDeepLinking: boolean;
    trackAnalytics: boolean;
  };
  contacts: {
    enabled: boolean;
    enableContactSelection: boolean;
    maxContactsSelection: number;
    autoSync: boolean;
    cacheContacts: boolean;
  };
  calendar: {
    enabled: boolean;
    defaultReminderTime: number; // minutes before
    enableNotifications: boolean;
    autoSync: boolean;
  };
  theme: {
    enabled: boolean;
    followSystemTheme: boolean;
    enableDynamicColors: boolean;
    supportHighContrast: boolean;
    supportReducedMotion: boolean;
  };
  widgets: {
    enabled: boolean;
    enableTrendingWidget: boolean;
    enableWatchlistWidget: boolean;
    enableSearchWidget: boolean;
    enableShortcuts: boolean;
    autoRefresh: boolean;
  };
  backgroundSync: {
    enabled: boolean;
    syncOnBackground: boolean;
    syncOnForeground: boolean;
    syncOnWifi: boolean;
    syncOnCellular: boolean;
    minimumInterval: number; // minutes
  };
}

// Mobile Features Analytics
export interface MobileFeaturesAnalytics {
  offline: {
    cacheHitRate: number;
    offlineActionsCount: number;
    lastSyncTime: Date | null;
    syncSuccessRate: number;
  };
  sharing: {
    totalShares: number;
    sharesByPlatform: Record<string, number>;
    sharesByType: Record<string, number>;
    successRate: number;
  };
  contacts: {
    totalContacts: number;
    permissionGranted: boolean;
    lastAccessTime: Date | null;
    sharingUsage: number;
  };
  calendar: {
    totalReminders: number;
    activeReminders: number;
    permissionGranted: boolean;
    lastEventCreated: Date | null;
  };
  theme: {
    currentMode: string;
    followsSystem: boolean;
    themeChanges: number;
    lastChanged: Date | null;
  };
  widgets: {
    enabledWidgets: number;
    totalRefreshes: number;
    lastRefreshTime: Date | null;
    mostUsedWidget: string | null;
  };
  backgroundSync: {
    totalTasks: number;
    successfulSyncs: number;
    failedSyncs: number;
    lastSyncTime: Date | null;
    averageSyncDuration: number;
  };
}

// Error Types
export class MobileFeatureError extends Error {
  constructor(
    message: string,
    public feature: string,
    public code: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'MobileFeatureError';
  }
}

export class PermissionError extends MobileFeatureError {
  constructor(message: string, feature: string, details?: any) {
    super(message, feature, 'PERMISSION_DENIED', details);
    this.name = 'PermissionError';
  }
}

export class NetworkError extends MobileFeatureError {
  constructor(message: string, feature: string, details?: any) {
    super(message, feature, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

export class StorageError extends MobileFeatureError {
  constructor(message: string, feature: string, details?: any) {
    super(message, feature, 'STORAGE_ERROR', details);
    this.name = 'StorageError';
  }
}

// Event Types
export interface MobileFeatureEvent {
  type: string;
  feature: string;
  data: unknown;
  timestamp: Date;
}

export interface ShareEvent extends MobileFeatureEvent {
  type: 'share_initiated' | 'share_completed' | 'share_failed';
  feature: 'sharing';
  data: {
    contentId: string;
    shareType: string;
    platform: string;
    success: boolean;
    error?: string;
  };
}

export interface ThemeEvent extends MobileFeatureEvent {
  type: 'theme_changed' | 'theme_config_updated';
  feature: 'theme';
  data: {
    oldMode: string;
    newMode: string;
    followsSystem: boolean;
  };
}

export interface SyncEvent extends MobileFeatureEvent {
  type: 'sync_started' | 'sync_completed' | 'sync_failed';
  feature: 'backgroundSync';
  data: {
    taskCount: number;
    successCount: number;
    failureCount: number;
    duration: number;
  };
}

export interface WidgetEvent extends MobileFeatureEvent {
  type: 'widget_refreshed' | 'widget_configured' | 'widget_error';
  feature: 'widgets';
  data: {
    widgetId: string;
    widgetType: string;
    success: boolean;
    error?: string;
  };
}

// Platform Detection
export interface PlatformCapabilities {
  hasContactsPermission: boolean;
  hasCalendarPermission: boolean;
  hasNotificationPermission: boolean;
  supportsBackgroundFetch: boolean;
  supportsWidgets: boolean;
  supportsAppShortcuts: boolean;
  supportsNativeSharing: boolean;
  supportsDynamicColors: boolean;
  supportsSystemTheme: boolean;
}

// Mobile Features State
export interface MobileFeaturesState {
  isInitialized: boolean;
  isLoading: boolean;
  config: MobileFeaturesConfig;
  analytics: MobileFeaturesAnalytics;
  capabilities: PlatformCapabilities;
  errors: MobileFeatureError[];
  lastUpdated: Date | null;
}

// Hook Configuration
export interface UseMobileFeaturesOptions {
  autoInitialize?: boolean;
  enableAnalytics?: boolean;
  trackErrors?: boolean;
  persistConfig?: boolean;
  persistAnalytics?: boolean;
}

// Utility Types
export type MobileFeatureName =
  | 'offline'
  | 'sharing'
  | 'contacts'
  | 'calendar'
  | 'theme'
  | 'widgets'
  | 'backgroundSync';

export type MobileFeatureStatus = 'enabled' | 'disabled' | 'unavailable' | 'permission_required';

export interface MobileFeatureInfo {
  name: MobileFeatureName;
  status: MobileFeatureStatus;
  description: string;
  permissions: string[];
  dependencies: string[];
  version: string;
}

export type MobileFeatureEventListener<T extends MobileFeatureEvent = MobileFeatureEvent> = (event: T) => void;

export interface MobileFeatureEventEmitter {
  addEventListener: <T extends MobileFeatureEvent>(type: string, listener: MobileFeatureEventListener<T>) => void;
  removeEventListener: <T extends MobileFeatureEvent>(type: string, listener: MobileFeatureEventListener<T>) => void;
  emit: <T extends MobileFeatureEvent>(event: T) => void;
}
