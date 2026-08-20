/**
 * AnalyticsManager Tests - TDD RED PHASE
 * Write tests FIRST before implementation
 * These tests will FAIL until AnalyticsManager is implemented
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AnalyticsManager } from '../AnalyticsManager';
import { AnalyticsApiClient } from '../AnalyticsApiClient';

// Mock logger before other imports
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
  },
}));

// Mock config to enable analytics in tests
jest.mock('../../../config/environment', () => ({
  config: {
    ENABLE_ANALYTICS: true,
    ENABLE_CRASH_REPORTING: true,
    API_URL: 'http://localhost:8020',
  },
}));

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()), // Return unsubscribe function
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
}));

jest.mock('../AnalyticsApiClient');

describe('AnalyticsManager', () => {
  let manager: AnalyticsManager;
  const mockApiClient = AnalyticsApiClient as jest.MockedClass<typeof AnalyticsApiClient>;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    // Reset singleton instance
    (AnalyticsManager as any).instance = null;

    // Get fresh instance
    manager = AnalyticsManager.getInstance();
    await manager.initialize();

    // Set consent to allow events to be queued (required after consent check was added)
    await manager.setConsent(true, ['analytics']);
  });

  afterEach(() => {
    manager.dispose();
    jest.clearAllMocks();
  });

  it('should generate deviceId on first initialization', async () => {
    const deviceId = manager.getDeviceId();

    expect(deviceId).toBeDefined();
    // deviceId now uses uuid v4: device_<uuid>
    expect(deviceId).toMatch(/^device_[0-9a-f-]{36}$/);
  });

  it('should persist deviceId to AsyncStorage', async () => {
    await manager.initialize();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@geoleap_device_id',
      expect.stringMatching(/^device_[0-9a-f-]{36}$/)
    );
  });

  it('should load deviceId from AsyncStorage on subsequent initializations', async () => {
    const existingDeviceId = 'device_123456_abc123';
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(existingDeviceId);

    // Reset and create new instance
    (AnalyticsManager as any).instance = null;
    const newManager = AnalyticsManager.getInstance();
    await newManager.initialize();

    expect(newManager.getDeviceId()).toBe(existingDeviceId);
  });

  it('should generate new sessionId per initialization', async () => {
    const sessionId1 = manager.getSessionId();

    // Reset and create new instance
    (AnalyticsManager as any).instance = null;
    const newManager = AnalyticsManager.getInstance();
    await newManager.initialize();

    const sessionId2 = newManager.getSessionId();

    expect(sessionId1).not.toBe(sessionId2);
    expect(sessionId1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(sessionId2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('should add events to queue', async () => {
    const event = {
      id: 'event-1',
      timestamp: Date.now(),
      eventType: 'test_event',
      category: 'test',
      source: 'test',
      data: { foo: 'bar' },
      retryCount: 0,
    };

    await manager.trackEvent(event);

    // Queue should be persisted to AsyncStorage
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@geoleap_analytics_queue',
      expect.stringContaining('test_event')
    );
  });

  it('should trigger flush when batch size reaches 50', async () => {
    const flushSpy = jest.spyOn(manager, 'flushQueue');

    // Add 50 events
    for (let i = 0; i < 50; i++) {
      await manager.trackEvent({
        id: `event-${i}`,
        timestamp: Date.now(),
        eventType: `test_event_${i}`,
        category: 'test',
        source: 'test',
        data: {},
        retryCount: 0,
      });
    }

    expect(flushSpy).toHaveBeenCalled();
  });

  it('should trigger flush after 30 seconds', async () => {
    jest.useFakeTimers();

    // Create a new instance with fake timers active
    (AnalyticsManager as any).instance = null;
    const timerManager = AnalyticsManager.getInstance();
    await timerManager.initialize();
    await timerManager.setConsent(true, ['analytics']);

    const flushSpy = jest.spyOn(timerManager, 'flushQueue');

    // Add one event
    await timerManager.trackEvent({
      id: 'event-1',
      timestamp: Date.now(),
      eventType: 'test_event',
      category: 'test',
      source: 'test',
      data: {},
      retryCount: 0,
    });

    // Fast-forward time by 30 seconds
    jest.advanceTimersByTime(30000);

    expect(flushSpy).toHaveBeenCalled();

    timerManager.dispose();
    jest.useRealTimers();
  });

  it('should transform events to backend format', async () => {
    // Set consent to allow flushing
    await manager.setConsent(true, ['analytics']);

    const mockTransform = jest.fn().mockReturnValue({
      eventType: 'test_event',
      category: 'test',
      clientTimestamp: new Date().toISOString(),
      properties: '{}',
      hasConsent: true,
      sessionId: manager.getSessionId(),
      deviceId: manager.getDeviceId(),
    });

    // Mock transformer
    (manager as any).transformer = { toUserBehaviorEvent: mockTransform };

    await manager.trackEvent({
      id: 'event-1',
      timestamp: Date.now(),
      eventType: 'test_event',
      category: 'test',
      source: 'test',
      data: {},
      retryCount: 0,
    });

    await manager.flushQueue();

    expect(mockTransform).toHaveBeenCalled();
  });

  it('should enforce consent before sending events', async () => {
    // Set consent to false
    await manager.setConsent(false, []);

    const apiClientInstance = mockApiClient.mock.instances[0];
    const batchTrackSpy = jest.spyOn(apiClientInstance, 'batchTrackUserBehavior');

    await manager.trackEvent({
      id: 'event-1',
      timestamp: Date.now(),
      eventType: 'test_event',
      category: 'test',
      source: 'test',
      data: {},
      retryCount: 0,
    });

    await manager.flushQueue();

    // Should NOT send to backend without consent
    expect(batchTrackSpy).not.toHaveBeenCalled();
  });

  it('should retry failed uploads with exponential backoff', async () => {
    // Set consent to allow flushing
    await manager.setConsent(true, ['analytics']);

    // Mock the delay method to avoid real waits
    jest.spyOn(manager as any, 'delay').mockResolvedValue(undefined);

    const apiClientInstance = mockApiClient.mock.instances[0];

    // Mock failure on first 2 attempts, success on 3rd
    jest
      .spyOn(apiClientInstance, 'batchTrackUserBehavior')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(undefined);

    await manager.trackEvent({
      id: 'event-1',
      timestamp: Date.now(),
      eventType: 'test_event',
      category: 'test',
      source: 'test',
      data: {},
      retryCount: 0,
    });

    await manager.flushQueue();

    // Should retry with exponential backoff
    expect(apiClientInstance.batchTrackUserBehavior).toHaveBeenCalledTimes(3);
  });

  it('should move events to failed queue after 3 retries', async () => {
    // Set consent to allow flushing
    await manager.setConsent(true, ['analytics']);

    // Mock the delay method to avoid real waits
    jest.spyOn(manager as any, 'delay').mockResolvedValue(undefined);

    const apiClientInstance = mockApiClient.mock.instances[0];

    // Mock failure on all attempts
    jest.spyOn(apiClientInstance, 'batchTrackUserBehavior').mockRejectedValue(new Error('Network error'));

    await manager.trackEvent({
      id: 'event-1',
      timestamp: Date.now(),
      eventType: 'test_event',
      category: 'test',
      source: 'test',
      data: {},
      retryCount: 0,
    });

    await manager.flushQueue();

    // Should move to failed queue after 3 retries
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@geoleap_analytics_failed_queue',
      expect.stringContaining('test_event')
    );
  });

  it('should flush queue on network reconnect', async () => {
    const flushSpy = jest.spyOn(manager, 'flushQueue');

    // Simulate network state change listener
    const networkListener = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];

    // Trigger network reconnect
    networkListener({ isConnected: true, isInternetReachable: true });

    expect(flushSpy).toHaveBeenCalled();
  });
});
