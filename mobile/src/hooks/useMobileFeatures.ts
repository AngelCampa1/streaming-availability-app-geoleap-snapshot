import { useState, useEffect, useCallback } from 'react';
import OfflineService from '../services/api/OfflineService';
import { nativeSharingService, ShareContent, ShareTarget } from '../services/nativeSharingService';
import { contactIntegrationService, Contact } from '../services/contactIntegrationService';
import { calendarIntegrationService, CalendarReminder } from '../services/calendarIntegrationService';
import { useColorScheme } from 'react-native';
import { widgetService, WidgetData, AppShortcut, WidgetConfig } from '../services/widgetService';
import { backgroundSyncService, SyncStats, SyncTask } from '../services/backgroundSyncService';
import { logger } from '../utils/logger';

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

  // Theme system
  setFollowSystemTheme: (follow: boolean) => Promise<void>;
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
  updateSyncConfig: (  config: unknown) => Promise<void>;
}

export interface UseMobileFeaturesOptions {
  autoInitialize?: boolean;
  enableAnalytics?: boolean;
  trackErrors?: boolean;
  persistConfig?: boolean;
  persistAnalytics?: boolean;
}

export function useMobileFeatures(options: UseMobileFeaturesOptions = {}): UseMobileFeaturesReturn {
  const [isOffline, _setIsOffline] = useState(false);
  const [cacheSize, setCacheSize] = useState(0);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);
  const [hasContactPermission, setHasContactPermission] = useState(false);
  const [hasCalendarPermission, setHasCalendarPermission] = useState(false);
  const colorScheme = useColorScheme();
  const [widgetData, _setWidgetData] = useState<WidgetData[]>([]);
  const [appShortcuts, _setAppShortcuts] = useState<AppShortcut[]>([]);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalTasks: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    lastSyncTime: null,
    averageSyncDuration: 0,
  });

  // Initialize all services
  const initialize = useCallback(async () => {
    try {
      await Promise.all([
        OfflineService.initialize(),
        contactIntegrationService.initialize(),
        calendarIntegrationService.initialize(),
        widgetService.initialize(),
        backgroundSyncService.initialize(),
      ]);

      // Update initial state
      const contactPermission = await contactIntegrationService.checkPermission();
      const calendarPermission = await calendarIntegrationService.checkPermissions();

      setHasContactPermission(contactPermission);
      setHasCalendarPermission(calendarPermission);

      const _stats = backgroundSyncService.getSyncStats();
      setSyncStats(_stats);

      logger.log('[useMobileFeatures] Mobile features initialized successfully');
    } catch (error) {
      logger.error('[useMobileFeatures] Failed to initialize mobile features', error);
    }
  }, []);

  useEffect(() => {
    if (options.autoInitialize !== false) {
      initialize();
    }
  }, [initialize, options.autoInitialize]);

  // Offline functionality
  const clearCache = useCallback(async () => {
    await OfflineService.clearAllCache();
    setCacheSize(0);
  }, []);

  const forceSyncOfflineActions = useCallback(async () => {
    await OfflineService.syncOfflineActions();
    setPendingActionsCount(0);
  }, []);

  // Native sharing
  const shareContent = useCallback(async (content: ShareContent) => {
    await nativeSharingService.shareContent(content);
  }, []);

  const shareToSocial = useCallback(async (content: ShareContent, target: ShareTarget) => {
    await nativeSharingService.shareToSocial(content, target);
  }, []);

  const shareViaSMS = useCallback(async (content: ShareContent, phoneNumber?: string) => {
    await nativeSharingService.shareViaSMS(content, phoneNumber);
  }, []);

  const shareViaEmail = useCallback(async (content: ShareContent, email?: string) => {
    await nativeSharingService.shareViaEmail(content, email);
  }, []);

  const copyToClipboard = useCallback(async (content: ShareContent) => {
    await nativeSharingService.copyToClipboard(content);
  }, []);

  // Contact integration
  const requestContactPermission = useCallback(async () => {
    const granted = await contactIntegrationService.requestPermissions();
    setHasContactPermission(granted);
    return granted;
  }, []);

  const getAllContacts = useCallback(async () => {
    return await contactIntegrationService.getAllContacts();
  }, []);

  const searchContacts = useCallback(async (query: string) => {
    return await contactIntegrationService.searchContacts(query);
  }, []);

  const selectContactsForSharing = useCallback(async (maxContacts?: number) => {
    return await contactIntegrationService.selectContactsForSharing(maxContacts);
  }, []);

  // Calendar integration
  const requestCalendarPermission = useCallback(async () => {
    const granted = await calendarIntegrationService.requestPermissions();
    setHasCalendarPermission(granted);
    return granted;
  }, []);

  const createContentReminder = useCallback(async (
    contentId: string,
    contentTitle: string,
    reminderDate: Date,
    type: 'watch' | 'release' | 'update' | 'custom',
  ) => {
    return await calendarIntegrationService.createContentReminder(contentId, contentTitle, reminderDate, type);
  }, []);

  const updateContentReminder = useCallback(async (contentId: string, newDate: Date) => {
    await calendarIntegrationService.updateContentReminder(contentId, newDate);
  }, []);

  const cancelContentReminder = useCallback(async (contentId: string) => {
    await calendarIntegrationService.cancelContentReminder(contentId);
  }, []);

  const getActiveReminders = useCallback(() => {
    return calendarIntegrationService.getActiveReminders();
  }, []);

  // Theme system — managed by ThemeProvider; these are no-ops for API compatibility
  const setFollowSystemTheme = useCallback(async (_follow: boolean) => {}, []);
  const setHighContrast = useCallback(async (_enabled: boolean) => {}, []);

  // Widgets and shortcuts
  const refreshWidget = useCallback(async (widgetId: string) => {
    await widgetService.refreshWidget(widgetId);
  }, []);

  const configureWidget = useCallback(async (widgetId: string, config: Partial<WidgetConfig>) => {
    await widgetService.configureWidget(widgetId, config);
  }, []);

  const toggleWidget = useCallback(async (widgetId: string, enabled: boolean) => {
    await widgetService.toggleWidget(widgetId, enabled);
  }, []);

  // Background sync
  const addSyncTask = useCallback(async (type: SyncTask['type'],
 data: unknown, priority?: SyncTask['priority']) => {
    return await backgroundSyncService.addSyncTask(type, data, priority);
  }, []);

  const forceSyncNow = useCallback(async () => {
    await backgroundSyncService.forceSyncNow();
    const stats = backgroundSyncService.getSyncStats();
    setSyncStats(stats);
  }, []);

  const clearPendingTasks = useCallback(async () => {
    await backgroundSyncService.clearPendingTasks();
    const stats = backgroundSyncService.getSyncStats();
    setSyncStats(stats);
  }, []);

  const updateSyncConfig = useCallback(async (  config: unknown) => {
    await backgroundSyncService.updateSyncConfig(config);
  }, []);

  return {
    // Offline functionality
    isOffline,
    cacheSize,
    pendingActionsCount,
    clearCache,
    forceSyncOfflineActions,

    // Native sharing
    shareContent,
    shareToSocial,
    shareViaSMS,
    shareViaEmail,
    copyToClipboard,

    // Contact integration
    hasContactPermission,
    requestContactPermission,
    getAllContacts,
    searchContacts,
    selectContactsForSharing,

    // Calendar integration
    hasCalendarPermission,
    requestCalendarPermission,
    createContentReminder,
    updateContentReminder,
    cancelContentReminder,
    getActiveReminders,

    // Theme system
    setFollowSystemTheme,
    setHighContrast,

    // Widgets and shortcuts
    widgetData,
    appShortcuts,
    refreshWidget,
    configureWidget,
    toggleWidget,

    // Background sync
    syncStats,
    addSyncTask,
    forceSyncNow,
    clearPendingTasks,
    updateSyncConfig,
  };
}
