/**
 * Comprehensive Tests for useMobileFeatures Hook
 * Tests mobile-specific features integration (sharing, contacts, calendar, theme, widgets, sync)
 *
 * Test Coverage:
 * - Service initialization
 * - Permission handling (contacts, calendar)
 * - Native sharing operations
 * - Background sync functionality
 */

// Mock logger before any other imports
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
  },
}));

// Mock all services
const mockOfflineService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  clearAllCache: jest.fn().mockResolvedValue(undefined),
  syncOfflineActions: jest.fn().mockResolvedValue(undefined),
};

const mockNativeSharingService = {
  shareContent: jest.fn().mockResolvedValue(undefined),
  shareToSocial: jest.fn().mockResolvedValue(undefined),
  shareViaSMS: jest.fn().mockResolvedValue(undefined),
  shareViaEmail: jest.fn().mockResolvedValue(undefined),
  copyToClipboard: jest.fn().mockResolvedValue(undefined),
};

const mockContactIntegrationService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  checkPermission: jest.fn().mockResolvedValue(false),
  requestPermissions: jest.fn().mockResolvedValue(true),
  getAllContacts: jest.fn().mockResolvedValue([]),
  searchContacts: jest.fn().mockResolvedValue([]),
  selectContactsForSharing: jest.fn().mockResolvedValue([]),
};

const mockCalendarIntegrationService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  checkPermissions: jest.fn().mockResolvedValue(false),
  requestPermissions: jest.fn().mockResolvedValue(true),
  createContentReminder: jest.fn().mockResolvedValue('reminder-123'),
  updateContentReminder: jest.fn().mockResolvedValue(undefined),
  cancelContentReminder: jest.fn().mockResolvedValue(undefined),
  getActiveReminders: jest.fn().mockReturnValue([]),
};


const mockWidgetService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  refreshWidget: jest.fn().mockResolvedValue(undefined),
  configureWidget: jest.fn().mockResolvedValue(undefined),
  toggleWidget: jest.fn().mockResolvedValue(undefined),
};

const mockBackgroundSyncService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  getSyncStats: jest.fn().mockReturnValue({
    totalTasks: 10,
    successfulSyncs: 8,
    failedSyncs: 2,
    lastSyncTime: Date.now(),
    averageSyncDuration: 500,
  }),
  addSyncTask: jest.fn().mockResolvedValue('task-123'),
  forceSyncNow: jest.fn().mockResolvedValue(undefined),
  clearPendingTasks: jest.fn().mockResolvedValue(undefined),
  updateSyncConfig: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../../services/api/OfflineService', () => ({
  __esModule: true,
  get default() {
    return mockOfflineService;
  },
}));

jest.mock('../../../services/nativeSharingService', () => ({
  __esModule: true,
  get nativeSharingService() {
    return mockNativeSharingService;
  },
}));

jest.mock('../../../services/contactIntegrationService', () => ({
  __esModule: true,
  get contactIntegrationService() {
    return mockContactIntegrationService;
  },
}));

jest.mock('../../../services/calendarIntegrationService', () => ({
  __esModule: true,
  get calendarIntegrationService() {
    return mockCalendarIntegrationService;
  },
}));


jest.mock('../../../services/widgetService', () => ({
  __esModule: true,
  get widgetService() {
    return mockWidgetService;
  },
}));

jest.mock('../../../services/backgroundSyncService', () => ({
  __esModule: true,
  get backgroundSyncService() {
    return mockBackgroundSyncService;
  },
}));

// Import after mocks
import { renderHook, waitFor } from '@testing-library/react-native';
import { useMobileFeatures } from '../../../hooks/useMobileFeatures';

describe('useMobileFeatures Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Initialization Test (1 test)
  // ============================================

  it('should initialize all services on mount', async () => {
    const { result } = renderHook(() => useMobileFeatures());

    // Wait for initialization
    await waitFor(() => {
      expect(mockOfflineService.initialize).toHaveBeenCalled();
      expect(mockContactIntegrationService.initialize).toHaveBeenCalled();
      expect(mockCalendarIntegrationService.initialize).toHaveBeenCalled();
      expect(mockWidgetService.initialize).toHaveBeenCalled();
      expect(mockBackgroundSyncService.initialize).toHaveBeenCalled();
    });

    // Verify initial state loaded
    expect(result.current.hasContactPermission).toBe(false);
    expect(result.current.hasCalendarPermission).toBe(false);

    // Wait for sync stats to update
    await waitFor(() => {
      expect(result.current.syncStats.totalTasks).toBe(10);
    });

    expect(result.current.syncStats).toMatchObject({
      totalTasks: 10,
      successfulSyncs: 8,
      failedSyncs: 2,
    });
  });

  // ============================================
  // Permission Handling Test (1 test)
  // ============================================

  it('should handle permission requests for contacts and calendar', async () => {
    const { result } = renderHook(() => useMobileFeatures());

    // Wait for initialization
    await waitFor(() => {
      expect(mockContactIntegrationService.initialize).toHaveBeenCalled();
    });

    // Request contact permission
    const contactGranted = await result.current.requestContactPermission();
    expect(contactGranted).toBe(true);
    expect(mockContactIntegrationService.requestPermissions).toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.hasContactPermission).toBe(true);
    });

    // Request calendar permission
    const calendarGranted = await result.current.requestCalendarPermission();
    expect(calendarGranted).toBe(true);
    expect(mockCalendarIntegrationService.requestPermissions).toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.hasCalendarPermission).toBe(true);
    });
  });

  // ============================================
  // Native Sharing Test (1 test)
  // ============================================

  it('should handle native sharing operations', async () => {
    const { result } = renderHook(() => useMobileFeatures());

    const shareContent = {
      title: 'Test Content',
      message: 'Check this out!',
      url: 'https://example.com',
    };

    // Test shareContent
    await result.current.shareContent(shareContent);
    expect(mockNativeSharingService.shareContent).toHaveBeenCalledWith(shareContent);

    // Test shareToSocial
    await result.current.shareToSocial(shareContent, 'facebook');
    expect(mockNativeSharingService.shareToSocial).toHaveBeenCalledWith(shareContent, 'facebook');

    // Test shareViaSMS
    await result.current.shareViaSMS(shareContent, '+1234567890');
    expect(mockNativeSharingService.shareViaSMS).toHaveBeenCalledWith(shareContent, '+1234567890');

    // Test shareViaEmail
    await result.current.shareViaEmail(shareContent, 'test@example.com');
    expect(mockNativeSharingService.shareViaEmail).toHaveBeenCalledWith(shareContent, 'test@example.com');

    // Test copyToClipboard
    await result.current.copyToClipboard(shareContent);
    expect(mockNativeSharingService.copyToClipboard).toHaveBeenCalledWith(shareContent);
  });

  // ============================================
  // Background Sync Test (1 test)
  // ============================================

  it('should handle background sync operations', async () => {
    const { result } = renderHook(() => useMobileFeatures());

    // Wait for initialization and sync stats to update
    await waitFor(() => {
      expect(mockBackgroundSyncService.initialize).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.syncStats.totalTasks).toBe(10);
    });

    // Verify initial sync stats
    expect(result.current.syncStats).toMatchObject({
      totalTasks: 10,
      successfulSyncs: 8,
      failedSyncs: 2,
    });

    // Add sync task
    const taskId = await result.current.addSyncTask('watchlist', { contentId: '123' }, 'high');
    expect(taskId).toBe('task-123');
    expect(mockBackgroundSyncService.addSyncTask).toHaveBeenCalledWith('watchlist', { contentId: '123' }, 'high');

    // Force sync now
    await result.current.forceSyncNow();
    expect(mockBackgroundSyncService.forceSyncNow).toHaveBeenCalled();
    expect(mockBackgroundSyncService.getSyncStats).toHaveBeenCalledTimes(2); // initial + after forceSyncNow

    // Clear pending tasks
    await result.current.clearPendingTasks();
    expect(mockBackgroundSyncService.clearPendingTasks).toHaveBeenCalled();
    expect(mockBackgroundSyncService.getSyncStats).toHaveBeenCalledTimes(3); // initial + forceSyncNow + clearPendingTasks
  });
});
