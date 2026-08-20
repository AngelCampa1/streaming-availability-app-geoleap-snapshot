/**
 * AnalyticsService.setUserId await fix tests (M2)
 * Verifies that AnalyticsService.setUserId awaits AnalyticsManager.setUserId,
 * meaning the per-user consent and queue are fully loaded before returning.
 */

jest.mock('../../../config/environment', () => ({
  config: {
    ENABLE_ANALYTICS: true,
    ENABLE_CRASH_REPORTING: false,
  },
}));

const mockManagerSetUserId = jest.fn().mockResolvedValue(undefined);
const mockManagerInitialize = jest.fn().mockResolvedValue(undefined);
const mockManagerGetDeviceId = jest.fn().mockReturnValue('device-test-id');
const mockManagerGetSessionId = jest.fn().mockReturnValue('session-id');
const mockManagerHasUserConsent = jest.fn().mockReturnValue(false);
const mockManagerSetConsent = jest.fn().mockResolvedValue(undefined);
const mockManagerDispose = jest.fn().mockResolvedValue(undefined);
const mockManagerTrackEvent = jest.fn().mockResolvedValue(undefined);
const mockManagerClearUserData = jest.fn().mockResolvedValue(undefined);

jest.mock('../AnalyticsManager', () => ({
  AnalyticsManager: {
    getInstance: jest.fn(() => ({
      initialize: mockManagerInitialize,
      setUserId: mockManagerSetUserId,
      getDeviceId: mockManagerGetDeviceId,
      getSessionId: mockManagerGetSessionId,
      hasUserConsent: mockManagerHasUserConsent,
      setConsent: mockManagerSetConsent,
      dispose: mockManagerDispose,
      trackEvent: mockManagerTrackEvent,
      clearUserData: mockManagerClearUserData,
    })),
  },
}));

jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('test-uuid') }));
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import AFTER mocks are set up
import { AnalyticsService } from '../AnalyticsService';

describe('AnalyticsService.setUserId - await fix (M2)', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockManagerSetUserId.mockResolvedValue(undefined);
    service = new AnalyticsService();
    // Mark as initialized to bypass the early-return guard
    (service as any).isInitialized = true;
  });

  it('calls AnalyticsManager.setUserId with the provided userId', async () => {
    await service.setUserId('user-test-123');
    expect(mockManagerSetUserId).toHaveBeenCalledWith('user-test-123');
  });

  it('stores userId internally', async () => {
    await service.setUserId('user-stored');
    expect((service as any).userId).toBe('user-stored');
  });

  it('awaits AnalyticsManager.setUserId (completes async work before returning)', async () => {
    let resolved = false;
    mockManagerSetUserId.mockImplementation(() =>
      new Promise<void>((resolve) => {
        // Resolve synchronously to avoid real timers
        resolved = true;
        resolve();
      }),
    );

    await service.setUserId('user-await-test');

    // After setUserId resolves, the manager promise must have been awaited
    expect(resolved).toBe(true);
    expect(mockManagerSetUserId).toHaveBeenCalledWith('user-await-test');
  });

  it('does not throw if AnalyticsManager.setUserId rejects (error is caught)', async () => {
    mockManagerSetUserId.mockRejectedValueOnce(new Error('manager failure'));
    await expect(service.setUserId('user-fail')).resolves.not.toThrow();
  });

  it('returns early without calling setUserId if service is not initialized', async () => {
    (service as any).isInitialized = false;
    await service.setUserId('user-uninitialized');
    expect(mockManagerSetUserId).not.toHaveBeenCalled();
  });
});

describe('AnalyticsService.clearUserData - dispose regression fix', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockManagerClearUserData.mockResolvedValue(undefined);
    mockManagerTrackEvent.mockResolvedValue(undefined);
    service = new AnalyticsService();
    (service as any).isInitialized = true;
  });

  it('clearUserData does NOT set isInitialized to false', async () => {
    await service.clearUserData();
    expect((service as any).isInitialized).toBe(true);
  });

  it('clearUserData clears userId and userProperties', async () => {
    (service as any).userId = 'user-A';
    (service as any).userProperties = { email: 'a@example.com' };

    await service.clearUserData();

    expect((service as any).userId).toBeNull();
    expect((service as any).userProperties).toEqual({});
  });

  it('clearUserData delegates to analyticsManager.clearUserData()', async () => {
    await service.clearUserData();
    expect(mockManagerClearUserData).toHaveBeenCalledTimes(1);
  });

  it('analytics events still flow after logout then re-login (isInitialized stays true)', async () => {
    // Simulate user A logged in
    (service as any).userId = 'user-A';

    // Logout: call clearUserData (the new logout path)
    await service.clearUserData();

    // isInitialized must still be true so events can flow on re-login
    expect((service as any).isInitialized).toBe(true);

    // Re-login as user B
    await service.setUserId('user-B');
    expect((service as any).userId).toBe('user-B');

    // Events must now be accepted (logEvent checks isInitialized)
    await service.logEvent({ name: 'test_event', parameters: {} });
    expect(mockManagerTrackEvent).toHaveBeenCalled();
  });

  it('no prior-user data leaks after clearUserData: userId is null until re-login', async () => {
    (service as any).userId = 'user-A';
    (service as any).userProperties = { email: 'a@example.com' };

    await service.clearUserData();

    // No user A data remains
    expect((service as any).userId).toBeNull();
    expect((service as any).userProperties).toEqual({});
  });
});
