// Export all notification components for easy importing
export { NotificationCenter } from './NotificationCenter';
export { NotificationPreferences } from './NotificationPreferences';
export { NotificationHistory } from './NotificationHistory';
export { PushNotificationSetup } from './PushNotificationSetup';
export { EmailTemplatePreview } from './EmailTemplatePreview';
export { NotificationSettingsIntegration } from './NotificationSettingsIntegration';
export { RealTimeNotificationProvider, useRealTimeNotifications } from './RealTimeNotificationProvider';
export { NotificationToast, ToastContainer, useToastNotifications } from './NotificationToast';
export { NotificationModal } from './NotificationModal';

// Export new components
export { NotificationBadge, useNotificationBadge } from './NotificationBadge';
export { NotificationSound, useNotificationSound } from './NotificationSound';
export { NotificationPermissionManager } from './NotificationPermissionManager';
export { NotificationMobile, useNotificationMobile } from './NotificationMobile';
export { NotificationTestSuite } from './NotificationTestSuite';

// Export API and utilities
export { notificationAPI, useNotificationAPI, NotificationHelpers } from './NotificationAPI';
export * from './NotificationTypes';

// Export default notification configuration
export const defaultNotificationSettings = {
  globalEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  emailDigest: {
    enabled: true,
    frequency: 'daily' as const,
    time: '09:00',
  },
  preferences: [],
  customRules: [],
};

// Utility function to determine if notifications are supported
export const isNotificationSupported = (): boolean => {
  return (
    typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
  );
};

// Utility function to check notification permission
export const checkNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};

// Utility function to request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    throw new Error('Notifications are not supported in this browser');
  }

  return await Notification.requestPermission();
};

// Common notification presets
export const NotificationPresets = {
  watchlistUpdate: (title: string, platform: string) => ({
    title: 'Watchlist Update',
    message: `${title} is now available on ${platform}`,
    type: 'info' as const,
    category: 'watchlist' as const,
    priority: 'medium' as const,
  }),

  securityAlert: (message: string) => ({
    title: 'Security Alert',
    message,
    type: 'warning' as const,
    category: 'security' as const,
    priority: 'high' as const,
  }),

  systemMaintenance: (startTime: string, duration: string) => ({
    title: 'System Maintenance',
    message: `Scheduled maintenance from ${startTime} (duration: ${duration})`,
    type: 'info' as const,
    category: 'system' as const,
    priority: 'low' as const,
  }),

  paymentIssue: (reason: string) => ({
    title: 'Payment Issue',
    message: `Payment failed: ${reason}`,
    type: 'error' as const,
    category: 'billing' as const,
    priority: 'critical' as const,
  }),
};
