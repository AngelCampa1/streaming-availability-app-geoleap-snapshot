/**
 * TokenManager.test.ts - Comprehensive tests for token management
 *
 * Test Strategy: Focus on bug detection through testing token validation,
 * automatic refresh, concurrent refresh prevention, session timeout,
 * app state monitoring, security events, and suspicious activity detection.
 *
 * Coverage Target: 100% of TokenManager.ts (573 lines)
 *
 * Critical Bug Scenarios:
 * - Concurrent refresh prevention (race condition)
 * - No refresh token available
 * - Token expiry auto-refresh
 * - Session timeout force logout
 * - Security event limit (max 100)
 * - Suspicious activity detection (3+ failures)
 * - Token validation threshold (5 minutes)
 * - Null token handling after async ops
 * - Force logout on refresh failure
 * - App state changes validation
 */

// Mock dependencies BEFORE imports to prevent initialization
jest.mock('../storage/SecureStorage', () => ({
  _secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    getTokens: jest.fn(),
    getUser: jest.fn(),
    storeTokens: jest.fn(),
    storeUser: jest.fn(),
    clearAll: jest.fn(),
  },
}));
jest.mock('../api/HttpClient', () => ({
  httpClient: {
    post: jest.fn(),
    setTokens: jest.fn(),
    clearAuthTokens: jest.fn(),
  },
}));
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('../../utils/DelayService', () => ({
  delayService: {
    wait: jest.fn().mockResolvedValue(undefined),
    timeout: jest.fn().mockReturnValue({
      id: 123,
      clear: jest.fn(),
    }),
    interval: jest.fn().mockReturnValue({
      id: 456,
      clear: jest.fn(),
    }),
    clear: jest.fn(),
  },
  DelayService: {
    getInstance: jest.fn().mockReturnValue({
      wait: jest.fn().mockResolvedValue(undefined),
      timeout: jest.fn().mockReturnValue({
        id: 123,
        clear: jest.fn(),
      }),
      interval: jest.fn().mockReturnValue({
        id: 456,
        clear: jest.fn(),
      }),
      clear: jest.fn(),
    }),
    resetInstance: jest.fn(),
  },
}));

// Mock React Native modules
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

import { TokenManager, tokenManager, SecurityEventType } from './TokenManager';
import { _secureStorage } from '../storage/SecureStorage';
import { httpClient } from '../api/HttpClient';
import { AuthTokens, User } from '../../types/auth';
import { AppState, Alert } from 'react-native';
import { logger } from '../../utils/logger';
import { delayService } from '../../utils/DelayService';

describe('TokenManager', () => {
  let manager: TokenManager;
  let appStateChangeHandler: ((state: string) => void) | null = null;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    emailVerified: true,
    biometricEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const createMockTokens = (expiresInMs: number): AuthTokens => ({
    accessToken: 'access-token-abc',
    refreshToken: 'refresh-token-xyz',
    expiresAt: Date.now() + expiresInMs,
    expiresIn: Math.floor(expiresInMs / 1000),
    tokenType: 'Bearer',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Capture app state change handler
    (AppState.addEventListener as jest.Mock).mockImplementation((event, handler) => {
      appStateChangeHandler = handler;
      return { remove: jest.fn() };
    });

    // Reset singleton instance for testing
    (TokenManager as any).instance = undefined;

    // Setup secureStorage mocks
    (_secureStorage.getTokens as jest.Mock).mockResolvedValue(null);
    (_secureStorage.getUser as jest.Mock).mockResolvedValue(null);
    (_secureStorage.storeTokens as jest.Mock).mockResolvedValue(undefined);
    (_secureStorage.storeUser as jest.Mock).mockResolvedValue(undefined);
    (_secureStorage.clearAll as jest.Mock).mockResolvedValue(undefined);

    // Setup httpClient mocks
    (httpClient.setTokens as jest.Mock).mockResolvedValue(undefined);
    (httpClient.clearAuthTokens as jest.Mock).mockResolvedValue(undefined);
    (httpClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: createMockTokens(3600000), // 1 hour
      status: 200,
      statusText: 'OK',
      headers: {},
    });

    manager = TokenManager.getInstance();
  });

  afterEach(() => {
    jest.useRealTimers();
    appStateChangeHandler = null;
  });

  // ==========================================================================
  // Singleton Pattern Tests
  // ==========================================================================

  describe('Singleton Pattern', () => {
    it('BUG: getInstance returns same instance', () => {
      const instance1 = TokenManager.getInstance();
      const instance2 = TokenManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('exported tokenManager is singleton instance', () => {
      // Note: tokenManager is created at module load, beforeEach resets singleton
      // So we compare the fresh instance created in beforeEach
      expect(manager).toBe(TokenManager.getInstance());
    });
  });

  // ==========================================================================
  // Token Validation Tests - BUG DETECTION
  // ==========================================================================

  describe('Token Validation', () => {
    it('BUG: Validates token with no expiresAt', () => {
      const tokens: any = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 3600,
        tokenType: 'Bearer',
      };

      const result = manager.validateTokens(tokens);

      expect(result.isValid).toBe(false);
      expect(result.needsRefresh).toBe(true);
      expect(result.error).toContain('no expiration time');
    });

    it('BUG: Detects expired token (timeUntilExpiry <= 0)', () => {
      const tokens = createMockTokens(-1000); // Expired 1 second ago

      const result = manager.validateTokens(tokens);

      expect(result.isValid).toBe(false);
      expect(result.isExpired).toBe(true);
      expect(result.needsRefresh).toBe(false); // Expired tokens don't "need" refresh
      expect(result.timeUntilExpiry).toBe(0); // Clamped to 0
    });

    it('BUG: Detects token needs refresh (<5 minutes remaining)', () => {
      const tokens = createMockTokens(4 * 60 * 1000); // 4 minutes (< 5 minute threshold)

      const result = manager.validateTokens(tokens);

      expect(result.isValid).toBe(true);
      expect(result.isExpired).toBe(false);
      expect(result.needsRefresh).toBe(true);
    });

    it('BUG: Valid token with sufficient time remaining', () => {
      const tokens = createMockTokens(10 * 60 * 1000); // 10 minutes

      const result = manager.validateTokens(tokens);

      expect(result.isValid).toBe(true);
      expect(result.isExpired).toBe(false);
      expect(result.needsRefresh).toBe(false);
      expect(result.timeUntilExpiry).toBeGreaterThan(5 * 60 * 1000);
    });

    it('BUG: Refresh threshold exactly at 5 minutes', () => {
      const tokens = createMockTokens(5 * 60 * 1000); // Exactly 5 minutes

      const result = manager.validateTokens(tokens);

      expect(result.isValid).toBe(true);
      expect(result.needsRefresh).toBe(true); // <= threshold
    });
  });

  // ==========================================================================
  // Set Tokens Tests - BUG DETECTION
  // ==========================================================================

  describe('Set Tokens', () => {
    it('BUG: Stores tokens in secure storage', async () => {
      const tokens = createMockTokens(3600000);

      await manager.setTokens(tokens, mockUser);

      expect(_secureStorage.storeTokens).toHaveBeenCalledWith(tokens);
      expect(_secureStorage.storeUser).toHaveBeenCalledWith(mockUser);
      expect(httpClient.setTokens).toHaveBeenCalledWith(tokens);
    });

    it('BUG: Updates HTTP client with tokens', async () => {
      const tokens = createMockTokens(3600000);

      await manager.setTokens(tokens);

      expect(httpClient.setTokens).toHaveBeenCalledWith(tokens);
    });

    it('BUG: Stores tokens without user', async () => {
      const tokens = createMockTokens(3600000);

      await manager.setTokens(tokens);

      expect(_secureStorage.storeTokens).toHaveBeenCalledWith(tokens);
      expect(_secureStorage.storeUser).not.toHaveBeenCalled();
    });

    it('getCurrentTokens returns current tokens', async () => {
      const tokens = createMockTokens(3600000);
      await manager.setTokens(tokens);

      const result = manager.getCurrentTokens();

      expect(result).toEqual(tokens);
    });

    it('getCurrentUser returns current user', async () => {
      const tokens = createMockTokens(3600000);
      await manager.setTokens(tokens, mockUser);

      const result = manager.getCurrentUser();

      expect(result).toEqual(mockUser);
    });
  });

  // ==========================================================================
  // Token Refresh Tests - BUG DETECTION
  // ==========================================================================

  describe('Token Refresh', () => {
    it('BUG: Prevents concurrent refresh (returns same promise)', async () => {
      const tokens = createMockTokens(3600000);
      await manager.setTokens(tokens, mockUser);

      // Mock delayed refresh response
      (httpClient.post as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: createMockTokens(3600000),
          status: 200,
          statusText: 'OK',
          headers: {},
        }), 100))
      );

      // Start 3 concurrent refresh calls
      const promise1 = manager.refreshTokens();
      const promise2 = manager.refreshTokens();
      const promise3 = manager.refreshTokens();

      jest.advanceTimersByTime(100);
      await Promise.all([promise1, promise2, promise3]);

      // Should only make ONE HTTP call
      expect(httpClient.post).toHaveBeenCalledTimes(1);
    });

    it('BUG: Throws error when no refresh token available', async () => {
      const tokens: any = {
        accessToken: 'token',
        expiresAt: Date.now() + 3600000,
        expiresIn: 3600,
        tokenType: 'Bearer',
        // No refreshToken
      };

      await manager.setTokens(tokens);

      const result = await manager.refreshTokens();

      expect(result.success).toBe(false);
      expect(result.error).toContain('No refresh token available');
    });

    it('BUG: Successful refresh updates tokens', async () => {
      const oldTokens = createMockTokens(3600000);
      const newTokens = createMockTokens(7200000); // 2 hours

      await manager.setTokens(oldTokens, mockUser);

      (httpClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: newTokens,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await manager.refreshTokens();

      expect(result.success).toBe(true);
      expect(result.tokens).toEqual(newTokens);
      expect(_secureStorage.storeTokens).toHaveBeenCalledWith(newTokens);
    });

    it('BUG: Force logout on refresh failure', async () => {
      const tokens = createMockTokens(3600000);
      await manager.setTokens(tokens, mockUser);

      (httpClient.post as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: { message: 'Refresh token expired', code: 'TOKEN_EXPIRED' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
      });

      const result = await manager.refreshTokens();

      expect(result.success).toBe(false);
      expect(_secureStorage.clearAll).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('calls correct refresh endpoint', async () => {
      const tokens = createMockTokens(3600000);
      await manager.setTokens(tokens, mockUser);

      await manager.refreshTokens();

      expect(httpClient.post).toHaveBeenCalledWith(
        '/api/auth/refresh',
        { refreshToken: tokens.refreshToken }
      );
    });
  });

  // ==========================================================================
  // Is Authenticated Tests - BUG DETECTION
  // ==========================================================================

  describe('Is Authenticated', () => {
    it('BUG: Returns false when no tokens', async () => {
      const result = await manager.isAuthenticated();

      expect(result).toBe(false);
    });

    it('BUG: Loads tokens from storage if not in memory', async () => {
      const tokens = createMockTokens(3600000);

      (_secureStorage.getTokens as jest.Mock).mockResolvedValueOnce(tokens);
      (_secureStorage.getUser as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await manager.isAuthenticated();

      expect(result).toBe(true);
      expect(_secureStorage.getTokens).toHaveBeenCalled();
    });

    it('BUG: Auto-refreshes expired tokens', async () => {
      const expiredTokens = createMockTokens(-1000); // Expired
      const newTokens = createMockTokens(3600000);

      await manager.setTokens(expiredTokens, mockUser);

      (httpClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: newTokens,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await manager.isAuthenticated();

      expect(httpClient.post).toHaveBeenCalledWith(
        '/api/auth/refresh',
        expect.any(Object)
      );
      expect(result).toBe(true);
    });

    it('BUG: Returns false when tokens invalid and cannot refresh', async () => {
      const expiredTokens = createMockTokens(-1000);

      await manager.setTokens(expiredTokens, mockUser);

      (httpClient.post as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: { message: 'Refresh failed', code: 'TOKEN_EXPIRED' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
      });

      const result = await manager.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Get Valid Access Token Tests - BUG DETECTION
  // ==========================================================================

  describe('Get Valid Access Token', () => {
    it('BUG: Returns token when valid and not expiring soon', async () => {
      const tokens = createMockTokens(10 * 60 * 1000); // 10 minutes
      await manager.setTokens(tokens, mockUser);

      const result = await manager.getValidAccessToken();

      expect(result).toBe(tokens.accessToken);
      expect(httpClient.post).not.toHaveBeenCalled(); // No refresh needed
    });

    it('BUG: Auto-refreshes when token needs refresh', async () => {
      const oldTokens = createMockTokens(4 * 60 * 1000); // 4 minutes (< 5 min threshold)
      const newTokens = createMockTokens(60 * 60 * 1000);

      await manager.setTokens(oldTokens, mockUser);

      (httpClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: newTokens,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await manager.getValidAccessToken();

      expect(httpClient.post).toHaveBeenCalled();
      expect(result).toBe(newTokens.accessToken);
    });

    it('BUG: Returns null when no tokens available', async () => {
      const result = await manager.getValidAccessToken();

      expect(result).toBeNull();
    });

    it('BUG: Returns null when refresh fails', async () => {
      const expiredTokens = createMockTokens(-1000);
      await manager.setTokens(expiredTokens, mockUser);

      (httpClient.post as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: { message: 'Refresh failed', code: 'TOKEN_EXPIRED' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
      });

      const result = await manager.getValidAccessToken();

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Session Timeout Tests - BUG DETECTION
  // ==========================================================================

  describe('Session Timeout', () => {
    it('BUG: Force logout after 30 minutes of inactivity', async () => {
      const tokens = createMockTokens(3600000);
      await manager.setTokens(tokens, mockUser);

      // Debug: Check how many times interval was called
      const intervalCalls = (delayService.interval as jest.Mock).mock.calls;
      expect(intervalCalls.length).toBeGreaterThan(0); // Should have been called in constructor

      // Get the interval callback that was set up in constructor
      const intervalCallback = intervalCalls[0][0];

      // Advance time by 31 minutes (> 30 minute timeout)
      jest.advanceTimersByTime(31 * 60 * 1000);

      // Manually invoke the interval callback (simulating timeout check)
      // Note: checkSessionTimeout() calls forceLogout() without await
      intervalCallback();

      // Wait for all async operations to complete (forceLogout is async but not awaited)
      // We need to flush the promise queue multiple times to ensure forceLogout completes
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }

      // Should have cleared auth data
      expect(_secureStorage.clearAll).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Session Ended',
        expect.stringContaining('inactivity'),
        expect.any(Array)
      );
    });

    it('BUG: Does not logout if activity within timeout', async () => {
      const tokens = createMockTokens(3600000);
      await manager.setTokens(tokens, mockUser);

      // Advance time by 29 minutes (< 30 minute timeout)
      jest.advanceTimersByTime(29 * 60 * 1000);

      expect(_secureStorage.clearAll).not.toHaveBeenCalled();
    });

    it('BUG: Activity monitoring checks every minute', async () => {
      const tokens = createMockTokens(3600000);
      await manager.setTokens(tokens, mockUser);

      // Advance by 1 minute intervals
      jest.advanceTimersByTime(60000); // 1 minute
      jest.advanceTimersByTime(60000); // 2 minutes
      jest.advanceTimersByTime(60000); // 3 minutes

      // Should have checked 3 times (60s interval)
      // Logout not triggered yet (< 30 minutes)
      expect(_secureStorage.clearAll).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // App State Monitoring Tests - BUG DETECTION
  // ==========================================================================

  describe('App State Monitoring', () => {
    it('BUG: Validates tokens when app becomes active', async () => {
      const tokens = createMockTokens(3600000);
      await manager.setTokens(tokens, mockUser);

      // Simulate app becoming active
      if (appStateChangeHandler) {
        appStateChangeHandler('active');
      }

      // Should have validated tokens (no refresh needed for valid tokens)
      expect(httpClient.post).not.toHaveBeenCalled();
    });

    it('BUG: Checks session timeout when app goes to background', async () => {
      const tokens = createMockTokens(3600000);
      await manager.setTokens(tokens, mockUser);

      // Simulate app going to background
      if (appStateChangeHandler) {
        appStateChangeHandler('background');
      }

      // Session timeout check should run
      // (No logout yet - just started)
      expect(_secureStorage.clearAll).not.toHaveBeenCalled();
    });

    it('BUG: Auto-refreshes expired tokens when app becomes active', async () => {
      const expiredTokens = createMockTokens(-1000);
      const newTokens = createMockTokens(3600000);

      await manager.setTokens(expiredTokens, mockUser);

      (httpClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: newTokens,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      // Simulate app becoming active
      if (appStateChangeHandler) {
        appStateChangeHandler('active');
      }

      // Let async validation complete
      await Promise.resolve();

      expect(httpClient.post).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Security Events Tests - BUG DETECTION
  // ==========================================================================

  describe('Security Events', () => {
    it('BUG: Logs security events with user ID', async () => {
      const tokens = createMockTokens(-1000); // Expired
      await manager.setTokens(tokens, mockUser);

      (httpClient.post as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: { message: 'Refresh failed', code: 'TOKEN_EXPIRED' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
      });

      await manager.refreshTokens();

      const events = manager.getSecurityEvents();
      const refreshFailedEvent = events.find(
        e => e.type === SecurityEventType.TOKEN_REFRESH_FAILED
      );

      expect(refreshFailedEvent).toBeDefined();
      expect(refreshFailedEvent!.userId).toBe(mockUser.id);
    });

    it('BUG: Limits security events to 100', async () => {
      // Create many security events by triggering refresh failures
      for (let i = 0; i < 150; i++) {
        const tokens = createMockTokens(-1000);
        (TokenManager as any).instance = undefined; // Reset instance
        manager = TokenManager.getInstance();
        await manager.setTokens(tokens, mockUser);

        (httpClient.post as jest.Mock).mockResolvedValueOnce({
          success: false,
          error: { message: 'Refresh failed', code: 'TOKEN_EXPIRED' },
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
        });

        try {
          await manager.refreshTokens();
        } catch (e) {
          // Expected failures
        }
      }

      const events = manager.getSecurityEvents();

      expect(events.length).toBeLessThanOrEqual(100);
    });

    it('BUG: Suspicious activity detection (3+ refresh failures in 1 minute)', async () => {
      const tokens = createMockTokens(3600000);
      await manager.setTokens(tokens, mockUser);

      // Trigger 3 failed refreshes
      for (let i = 0; i < 3; i++) {
        (httpClient.post as jest.Mock).mockResolvedValueOnce({
          success: false,
          error: { message: 'Refresh failed', code: 'TOKEN_EXPIRED' },
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
        });

        try {
          await manager.refreshTokens();
        } catch (e) {
          // Expected
        }
      }

      const events = manager.getSecurityEvents();
      const suspiciousEvent = events.find(
        e => e.type === SecurityEventType.SUSPICIOUS_ACTIVITY
      );

      expect(suspiciousEvent).toBeDefined();
      expect(suspiciousEvent!.details).toMatchObject({
        reason: 'Multiple token refresh failures',
        count: 3,
      });

      // Should also force logout
      expect(Alert.alert).toHaveBeenCalledWith(
        'Session Ended',
        expect.stringContaining('Suspicious activity'),
        expect.any(Array)
      );
    });

    it('clearSecurityEvents clears all events', async () => {
      const tokens = createMockTokens(-1000);
      await manager.setTokens(tokens, mockUser);

      (httpClient.post as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: { message: 'Refresh failed', code: 'TOKEN_EXPIRED' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
      });

      await manager.refreshTokens();

      expect(manager.getSecurityEvents().length).toBeGreaterThan(0);

      manager.clearSecurityEvents();

      expect(manager.getSecurityEvents()).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Clear Auth Data Tests - BUG DETECTION
  // ==========================================================================

  describe('Clear Auth Data', () => {
    it('BUG: Clears all storage and HTTP client tokens', async () => {
      const tokens = createMockTokens(3600000);
      await manager.setTokens(tokens, mockUser);

      await manager.clearAuthData();

      expect(_secureStorage.clearAll).toHaveBeenCalled();
      expect(httpClient.clearAuthTokens).toHaveBeenCalled();
      expect(manager.getCurrentTokens()).toBeNull();
      expect(manager.getCurrentUser()).toBeNull();
    });

    it('BUG: Clears refresh promise', async () => {
      const tokens = createMockTokens(3600000);
      await manager.setTokens(tokens, mockUser);

      // Start refresh
      const refreshPromise = manager.refreshTokens();

      // Clear auth data (should clear promise)
      await manager.clearAuthData();

      // Original promise should still resolve/reject
      await expect(refreshPromise).resolves.toBeDefined();
    });
  });

  // ==========================================================================
  // Update User Tests
  // ==========================================================================

  describe('Update User', () => {
    it('updates user and stores in secure storage', async () => {
      const updatedUser = { ...mockUser, firstName: 'Updated' };

      await manager.updateUser(updatedUser);

      expect(manager.getCurrentUser()).toEqual(updatedUser);
      expect(_secureStorage.storeUser).toHaveBeenCalledWith(updatedUser);
    });

    it('handles storage error', async () => {
      (_secureStorage.storeUser as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      await expect(manager.updateUser(mockUser)).rejects.toThrow('Storage error');
    });
  });

  // ==========================================================================
  // Token Info Tests
  // ==========================================================================

  describe('Token Info', () => {
    it('BUG: Returns comprehensive token info', async () => {
      const tokens = createMockTokens(10 * 60 * 1000); // 10 minutes
      await manager.setTokens(tokens, mockUser);

      const info = manager.getTokenInfo();

      expect(info.hasTokens).toBe(true);
      expect(info.isExpired).toBe(false);
      expect(info.needsRefresh).toBe(false);
      expect(info.timeUntilExpiry).toBeGreaterThan(5 * 60 * 1000);
      expect(info.sessionTimeRemaining).toBeGreaterThan(0);
    });

    it('BUG: Returns info when no tokens', () => {
      const info = manager.getTokenInfo();

      expect(info.hasTokens).toBe(false);
      expect(info.isExpired).toBe(true);
      expect(info.needsRefresh).toBe(false);
      expect(info.timeUntilExpiry).toBe(0);
      expect(info.sessionTimeRemaining).toBe(0);
    });
  });

  // ==========================================================================
  // Cleanup Tests
  // ==========================================================================

  describe('Cleanup', () => {
    it('BUG: Removes event listeners and clears timers', () => {
      const removeSubscription = jest.fn();
      (AppState.addEventListener as jest.Mock).mockReturnValueOnce({
        remove: removeSubscription,
      });

      // Create new instance to get subscription
      (TokenManager as any).instance = undefined;
      const newManager = TokenManager.getInstance();

      newManager.cleanup();

      expect(removeSubscription).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('handles refresh when tokens become null during operation', async () => {
      const tokens = createMockTokens(3600000);
      await manager.setTokens(tokens, mockUser);

      // Simulate tokens being cleared during refresh
      (httpClient.post as jest.Mock).mockImplementationOnce(async () => {
        await manager.clearAuthData();
        return {
          success: true,
          data: createMockTokens(3600000),
          status: 200,
          statusText: 'OK',
          headers: {},
        };
      });

      const result = await manager.refreshTokens();

      // Should handle gracefully
      expect(result).toBeDefined();
    });

    it('handles concurrent refreshes with same result', async () => {
      const tokens = createMockTokens(3600000);
      const newTokens = createMockTokens(7200000);

      await manager.setTokens(tokens, mockUser);

      // Reset and set up fresh mock (not "Once" to avoid consumption issues)
      (httpClient.post as jest.Mock).mockReset();
      (httpClient.post as jest.Mock).mockResolvedValue({
        success: true,
        data: newTokens,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const results = await Promise.all([
        manager.refreshTokens(),
        manager.refreshTokens(),
        manager.refreshTokens(),
      ]);

      // All should return same new tokens
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.tokens).toEqual(newTokens);
      });
    });

    it('handles network errors during refresh', async () => {
      const tokens = createMockTokens(3600000);
      await manager.setTokens(tokens, mockUser);

      // Reset and set up fresh mock to reject
      (httpClient.post as jest.Mock).mockReset();
      (httpClient.post as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const result = await manager.refreshTokens();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });
});
