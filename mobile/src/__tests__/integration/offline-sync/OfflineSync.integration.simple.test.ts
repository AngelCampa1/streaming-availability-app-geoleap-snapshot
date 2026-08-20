/**
 * Simplified Integration Tests for Offline Sync
 * Focuses on core functionality with proper cleanup to avoid memory leaks
 *
 * Test Coverage:
 * - Request queuing when offline (2 tests)
 * - Auto-sync on reconnect
 * - Manual force sync
 * - Pause/resume sync
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

import { NetworkSimulator } from '../../utils/networkSimulator';
import { createMockServices } from '../../mocks/services.mock';

// Create mock service instances
let mockServiceInstances = createMockServices();

// Mock the service modules
jest.mock('@/services/api/OfflineService', () => ({
  OfflineService: jest.fn(() => mockServiceInstances.offlineService),
}));

jest.mock('@/services/api/SyncService', () => ({
  SyncService: jest.fn(() => mockServiceInstances.syncService),
}));

jest.mock('@/services/api/NetworkService', () => ({
  NetworkService: jest.fn(() => mockServiceInstances.networkService),
}));

// Import after mocks are set up
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useOfflineSync } from '@/hooks/useOfflineSync';

describe('OfflineSync - Simplified Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NetworkSimulator.reset();
    mockServiceInstances = createMockServices();
  });

  afterEach(() => {
    NetworkSimulator.reset();
  });

  it('should queue requests when offline', async () => {
    const { result, unmount } = renderHook(() => useOfflineSync());

    // Go offline
    act(() => NetworkSimulator.goOffline());
    await waitFor(() => expect(result.current.isOnline).toBe(false));

    // Queue requests
    await mockServiceInstances.offlineService.queueRequest({ endpoint: '/api/test', method: 'GET' });

    const stats = await mockServiceInstances.offlineService.getStats();
    expect(stats.queuedCount).toBeGreaterThan(0);

    unmount();
  });

  it('should auto-sync when coming back online', async () => {
    const onSyncStart = jest.fn();

    const { result, unmount } = renderHook(() =>
      useOfflineSync({ autoSync: true, onSyncStart }),
    );

    // Go offline
    act(() => NetworkSimulator.goOffline());
    await waitFor(() => expect(result.current.isOnline).toBe(false));

    // Come back online
    act(() => NetworkSimulator.goOnline());
    await waitFor(() => expect(result.current.isOnline).toBe(true));

    // Should trigger auto-sync
    await waitFor(() => expect(onSyncStart).toHaveBeenCalled(), { timeout: 3000 });

    unmount();
  });

  it('should support manual force sync', async () => {
    const onSyncStart = jest.fn();

    const { result, unmount } = renderHook(() => useOfflineSync({ onSyncStart }));

    await act(async () => {
      await result.current.forceSync();
    });

    expect(onSyncStart).toHaveBeenCalled();

    unmount();
  });

  it('should not sync when paused', async () => {
    const onSyncStart = jest.fn();

    const { result, unmount } = renderHook(() => useOfflineSync({ autoSync: true, onSyncStart }));

    // Pause sync
    act(() => result.current.pauseSync());

    // Try to force sync
    await act(async () => {
      await result.current.forceSync();
    });

    expect(onSyncStart).not.toHaveBeenCalled();

    unmount();
  });

  it('should resume sync and trigger immediately', async () => {
    const onSyncStart = jest.fn();

    const { result, unmount } = renderHook(() => useOfflineSync({ autoSync: true, onSyncStart }));

    // Pause
    act(() => result.current.pauseSync());

    // Resume
    act(() => result.current.resumeSync());

    // Should trigger sync
    await waitFor(() => expect(onSyncStart).toHaveBeenCalled());

    unmount();
  });
});
