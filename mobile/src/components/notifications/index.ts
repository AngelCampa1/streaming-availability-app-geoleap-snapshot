// Notification Components
export { NotificationPermissionModal } from './NotificationPermissionModal';
export { NotificationPreferencesScreen } from './NotificationPreferencesScreen';

// Notification Services
export { default as NotificationService } from '../../services/notificationService';
export { NotificationTemplates } from '../../services/notificationTemplates';
export { default as DeepLinkingService } from '../../services/deepLinkingService';
export { default as BackgroundTaskService } from '../../services/backgroundTaskService';
export { default as NotificationAnalytics } from '../../services/notificationAnalytics';

// Types
export type {
  NotificationData,
  NotificationAction,
  NotificationPreferences,
} from '../../services/notificationService';

export type {
  NotificationTemplate,
} from '../../services/notificationTemplates';

export type {
  DeepLinkRoute,
} from '../../services/deepLinkingService';

export type {
  BackgroundTaskConfig,
  QueuedNotification,
} from '../../services/backgroundTaskService';

export type {
  NotificationEvent,
  NotificationMetrics,
  AnalyticsConfig,
} from '../../services/notificationAnalytics';

// Hooks for notification functionality
export { useNotifications } from './hooks/useNotifications';
export { useNotificationPermission } from './hooks/useNotificationPermission';
export { useNotificationAnalytics } from './hooks/useNotificationAnalytics';
