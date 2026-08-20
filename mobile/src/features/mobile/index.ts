// Mobile Features - US-11.6 Implementation
// Comprehensive mobile-specific features for GeoLeap

// Services
export { offlineService } from '../../services/offlineService';
export { nativeSharingService } from '../../services/nativeSharingService';
export { contactIntegrationService } from '../../services/contactIntegrationService';
export { calendarIntegrationService } from '../../services/calendarIntegrationService';
export { widgetService } from '../../services/widgetService';
export { backgroundSyncService } from '../../services/backgroundSyncService';

// Hook
export { useMobileFeatures } from '../../hooks/useMobileFeatures';

// Types
export * from '../../types/mobileFeatures';

// Feature status
export const MOBILE_FEATURES_VERSION = '1.0.0';
export const FEATURES_IMPLEMENTED = [
  'offline-functionality',
  'native-sharing',
  'contact-integration',
  'calendar-integration',
  'theme-system',
  'platform-widgets',
  'app-shortcuts',
  'background-sync',
] as const;

export const FEATURE_CAPABILITIES = {
  offlineSync: {
    name: 'Offline Synchronization',
    description: 'Cache content and sync actions when offline',
    dependencies: ['@react-native-async-storage/async-storage', '@react-native-community/netinfo'],
    permissions: [],
    status: 'implemented',
  },
  nativeSharing: {
    name: 'Native Sharing',
    description: 'Share content using native platform sharing',
    dependencies: ['react-native-share'],
    permissions: [],
    status: 'implemented',
  },
  contactIntegration: {
    name: 'Contact Integration',
    description: 'Access and share with device contacts',
    dependencies: ['react-native-contacts'],
    permissions: ['contacts'],
    status: 'implemented',
  },
  calendarIntegration: {
    name: 'Calendar Integration',
    description: 'Create reminders and calendar events',
    dependencies: ['react-native-calendar-events'],
    permissions: ['calendar'],
    status: 'implemented',
  },
  themeSystem: {
    name: 'Theme System',
    description: 'Dynamic theming with system preference detection',
    dependencies: [],
    permissions: [],
    status: 'implemented',
  },
  platformWidgets: {
    name: 'Platform Widgets',
    description: 'iOS Today Extension and Android App Widgets',
    dependencies: [],
    permissions: [],
    status: 'implemented',
  },
  appShortcuts: {
    name: 'App Shortcuts',
    description: 'Quick actions and shortcuts',
    dependencies: [],
    permissions: [],
    status: 'implemented',
  },
  backgroundSync: {
    name: 'Background Sync',
    description: 'Sync data in background',
    dependencies: ['react-native-background-fetch'],
    permissions: [],
    status: 'implemented',
  },
} as const;

// Utility functions
export const checkFeatureSupport = (feature: keyof typeof FEATURE_CAPABILITIES) => {
  return FEATURE_CAPABILITIES[feature];
};

export const getAllImplementedFeatures = () => {
  return Object.entries(FEATURE_CAPABILITIES)
    .filter(([_, config]) => config.status === 'implemented')
    .map(([key, config]) => ({ key, ...config }));
};

export const getFeaturePermissions = () => {
  return Object.values(FEATURE_CAPABILITIES)
    .flatMap(feature => feature.permissions)
    .filter((permission, index, array) => array.indexOf(permission) === index);
};

export const getFeatureDependencies = () => {
  return Object.values(FEATURE_CAPABILITIES)
    .flatMap(feature => feature.dependencies)
    .filter((dependency, index, array) => array.indexOf(dependency) === index);
};
