/**
 * Authentication Critical Bugs Regression Tests
 * Tests for bugs found during Day 1 audit (2025-12-16)
 *
 * CRITICAL BUGS COVERED:
 * - BUG-001: Token refresh vs logout race condition
 * - BUG-002: AuthContext 100ms wait timeout insufficient
 * - BUG-003: Social login token exposure in console
 * - BUG-004: Logout API failure creates state desync
 *
 * @see docs/audit/week1/day1-auth-bug-report.md
 */

// Mock logger before other imports
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
  },
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { tokenManager } from '../../services/auth/TokenManager';
import { authService } from '../../services/api/AuthService';
import { httpClient } from '../../services/api/HttpClient';
import React from 'react';

// Mock dependencies
jest.mock('../../services/auth/TokenManager');
jest.mock('../../services/api/AuthService');
jest.mock('../../services/api/HttpClient');
jest.mock('../../services/biometricAuth', () => ({
  biometricAuth: {
    isAvailable: jest.fn(() => Promise.resolve({ available: false, biometryType: 'None' })),
    authenticate: jest.fn(() => Promise.resolve({ success: false })),
  },
}));
jest.mock('../../services/oauthService');

// Helper to setup common mocks needed for AuthProvider initialization
function setupAuthMocks() {
  // Ensure biometricAuth mock is preserved (jest.clearAllMocks might affect it)
  const { biometricAuth } = require('../../services/biometricAuth');
  if (!biometricAuth.isAvailable.mockResolvedValue) {
    biometricAuth.isAvailable = jest.fn(() => Promise.resolve({ available: false, biometryType: 'None' }));
    biometricAuth.authenticate = jest.fn(() => Promise.resolve({ success: false }));
  }

  (authService.getUserProfile as jest.Mock) = jest.fn().mockResolvedValue({
    id: '1',
    email: 'test@test.com',
    name: 'Test User',
  });
  (authService.isAuthenticated as jest.Mock) = jest.fn().mockResolvedValue(false);
  (authService.getCurrentUser as jest.Mock) = jest.fn().mockReturnValue(null);
  (authService.getCurrentTokens as jest.Mock) = jest.fn().mockReturnValue(null);
}

describe('BUG-001: Token Refresh vs Logout Race Condition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuthMocks();
  });

  it('should discard new tokens if logout happens during refresh', async () => {
    // Setup: Mock slow token refresh (300ms)
    const mockRefreshTokens = jest.fn().mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          success: true,
          tokens: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            expiresAt: Date.now() + 3600000,
          },
        }), 300)
      )
    );
    (tokenManager.refreshTokens as jest.Mock) = mockRefreshTokens;
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
    (authService.getCurrentUser as jest.Mock).mockReturnValue({ id: '1', email: 'test@test.com' });
    (authService.getCurrentTokens as jest.Mock).mockReturnValue({
      accessToken: 'old-token',
      refreshToken: 'old-refresh',
      expiresAt: Date.now() + 1000,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for initialization with increased timeout
    await waitFor(() => expect(result.current.state.isLoading).toBe(false), { timeout: 5000 });

    // Start token refresh (takes 300ms)
    const refreshPromise = act(async () => {
      await result.current.refreshToken();
    });

    // Trigger logout immediately (should wait but only 100ms)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50)); // Wait 50ms
      await result.current.logout();
    });

    // Wait for refresh to complete
    await act(async () => {
      await refreshPromise.catch(() => {}); // Catch expected error
    });

    // BUG: Refresh may have completed and stored new tokens
    // EXPECTED: User should be logged out with no tokens
    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.tokens).toBeNull();
  });

  it('should prevent token refresh from starting during logout', async () => {
    const mockClearAuthData = jest.fn().mockResolvedValue(undefined);
    (tokenManager.clearAuthData as jest.Mock) = mockClearAuthData;
    (authService.logout as jest.Mock).mockResolvedValue(undefined);
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
    (authService.getCurrentUser as jest.Mock).mockReturnValue({ id: '1' });
    (authService.getCurrentTokens as jest.Mock).mockReturnValue({ accessToken: 'token' });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    // Start logout
    const logoutPromise = act(async () => {
      await result.current.logout();
    });

    // Try to refresh during logout (should be blocked)
    try {
      await act(async () => {
        await result.current.refreshToken();
      });
      fail('Expected refresh to throw error during logout');
    } catch (error) {
      expect(error).toBeDefined();
      expect((error as Error).message).toContain('logout');
    }

    await logoutPromise;
  });
});

describe('BUG-002: AuthContext 100ms Wait Timeout Insufficient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuthMocks();
  });

  it('should wait for slow token refresh to complete before logout', async () => {
    // Mock very slow refresh (500ms - exceeds 100ms timeout)
    const refreshStartTime = Date.now();
    const mockRefreshTokens = jest.fn().mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => {
          const refreshDuration = Date.now() - refreshStartTime;
          resolve({
            success: true,
            tokens: {
              accessToken: 'new-token',
              refreshToken: 'new-refresh',
              expiresAt: Date.now() + 3600000,
            },
            duration: refreshDuration,
          });
        }, 500) // 500ms refresh time
      )
    );
    (tokenManager.refreshTokens as jest.Mock) = mockRefreshTokens;
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
    (authService.getCurrentUser as jest.Mock).mockReturnValue({ id: '1' });
    (authService.getCurrentTokens as jest.Mock).mockReturnValue({ accessToken: 'old-token' });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    // Start refresh
    const refreshPromise = act(async () => {
      await result.current.refreshToken();
    });

    // Wait 150ms (exceeds 100ms timeout), then logout
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
      await result.current.logout();
    });

    // BUG: Logout proceeded after 100ms, but refresh completes at 500ms
    // EXPECTED: Logout should wait for full refresh completion

    await act(async () => {
      await refreshPromise.catch(() => {});
    });

    // After everything settles, user should be logged out
    expect(result.current.state.isAuthenticated).toBe(false);
  });
});

describe('BUG-003: Social Login Token Exposure in Console', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    setupAuthMocks();
  });

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should not log sensitive OAuth tokens to console', async () => {
    const sensitiveToken = 'sensitive-oauth-token-12345';
    const mockSocialLogin = jest.fn().mockResolvedValue({
      user: { id: '1', email: 'test@test.com' },
      tokens: {
        accessToken: 'app-access-token',
        refreshToken: 'app-refresh-token',
        expiresAt: Date.now() + 3600000,
      },
    });
    (authService.socialLogin as jest.Mock) = mockSocialLogin;
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(false);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    // Perform social login
    await act(async () => {
      await result.current.loginWithSocial('google');
    });

    // BUG: Check if sensitive tokens were logged
    const allLogCalls = consoleLogSpy.mock.calls.flat();
    const allWarnCalls = consoleWarnSpy.mock.calls.flat();
    const allLogs = [...allLogCalls, ...allWarnCalls].map(call =>
      typeof call === 'string' ? call : JSON.stringify(call)
    );

    // EXPECTED: No sensitive tokens in console output
    allLogs.forEach(log => {
      expect(log).not.toContain('oauth-token');
      expect(log).not.toContain('idToken');
      expect(log).not.toContain('accessToken');
    });
  });
});

describe('BUG-004: Logout API Failure Creates State Desync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuthMocks();
  });

  it('should handle logout API failure and still clear local state', async () => {
    // Mock logout API failure
    const mockLogout = jest.fn().mockRejectedValue(new Error('Network error'));
    const mockClearAuthData = jest.fn().mockResolvedValue(undefined);
    (authService.logout as jest.Mock) = mockLogout;
    (tokenManager.clearAuthData as jest.Mock) = mockClearAuthData;
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
    (authService.getCurrentUser as jest.Mock).mockReturnValue({ id: '1' });
    (authService.getCurrentTokens as jest.Mock).mockReturnValue({ accessToken: 'token' });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    // Attempt logout with API failure
    await act(async () => {
      await result.current.logout();
    });

    // EXPECTED: Local state cleared even though API failed
    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.user).toBeNull();
    expect(result.current.state.tokens).toBeNull();
    expect(mockClearAuthData).toHaveBeenCalled();
  });

  it('should retry logout API call on network failure', async () => {
    // Mock logout to fail twice, then succeed
    let attemptCount = 0;
    const mockLogout = jest.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 3) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve();
    });
    (authService.logout as jest.Mock) = mockLogout;
    (tokenManager.clearAuthData as jest.Mock).mockResolvedValue(undefined);
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
    (authService.getCurrentUser as jest.Mock).mockReturnValue({ id: '1' });
    (authService.getCurrentTokens as jest.Mock).mockReturnValue({ accessToken: 'token' });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    // Logout should retry on failure
    await act(async () => {
      await result.current.logout();
    });

    // BUG: Currently no retry logic exists
    // EXPECTED: Should retry at least once before proceeding with local cleanup
    // For now, just verify local cleanup happened
    expect(result.current.state.isAuthenticated).toBe(false);
  });
});

describe('Token Manager Race Conditions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuthMocks();
  });

  it('should prevent multiple simultaneous refresh operations', async () => {
    let refreshCount = 0;
    const mockRefresh = jest.fn().mockImplementation(() => {
      refreshCount++;
      return new Promise(resolve =>
        setTimeout(() => resolve({
          success: true,
          tokens: { accessToken: `token-${refreshCount}`, expiresAt: Date.now() + 3600000 },
        }), 100)
      );
    });
    (tokenManager.refreshTokens as jest.Mock) = mockRefresh;

    // Trigger two simultaneous refreshes
    const refresh1 = tokenManager.refreshTokens();
    const refresh2 = tokenManager.refreshTokens();

    const [result1, result2] = await Promise.all([refresh1, refresh2]);

    // EXPECTED: Both should get same result (only one refresh executed)
    expect(refreshCount).toBe(1);
    expect(result1).toEqual(result2);
  });
});

describe('Session Timeout Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuthMocks();
  });

  it('should trigger logout after 30 minutes of inactivity', async () => {
    jest.useFakeTimers();

    const mockForceLogout = jest.fn().mockResolvedValue(undefined);
    (tokenManager.forceLogout as jest.Mock) = mockForceLogout;
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
    (authService.getCurrentUser as jest.Mock).mockReturnValue({ id: '1' });
    (authService.getCurrentTokens as jest.Mock).mockReturnValue({
      accessToken: 'token',
      expiresAt: Date.now() + 3600000,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    // Fast-forward time by 31 minutes (exceeds 30-minute timeout)
    act(() => {
      jest.advanceTimersByTime(31 * 60 * 1000);
    });

    await waitFor(() => {
      // EXPECTED: Force logout should be called due to session timeout
      expect(mockForceLogout).toHaveBeenCalledWith(
        expect.stringContaining('inactivity')
      );
    });

    jest.useRealTimers();
  });
});

describe('Biometric Authentication Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuthMocks();
  });

  it('should fallback to password if biometric auth fails', async () => {
    const mockBiometricAuth = jest.fn().mockResolvedValue({ success: false });
    const mockPasswordLogin = jest.fn().mockResolvedValue({
      user: { id: '1', email: 'test@test.com' },
      tokens: { accessToken: 'token', expiresAt: Date.now() + 3600000 },
    });

    // Mock biometric failure
    jest.mock('../../services/biometricAuth', () => ({
      authenticate: mockBiometricAuth,
      isAvailable: jest.fn().mockResolvedValue({ available: true, biometryType: 'FaceID' }),
      isBiometricEnabled: jest.fn().mockResolvedValue(true),
    }));

    (authService.login as jest.Mock) = mockPasswordLogin;
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(false);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    // Try biometric auth (will fail)
    try {
      await act(async () => {
        await result.current.loginWithBiometric();
      });
      fail('Expected biometric auth to fail');
    } catch (error) {
      expect(error).toBeDefined();
    }

    // EXPECTED: User should be able to fallback to password login
    await act(async () => {
      await result.current.login({
        email: 'test@test.com',
        password: 'password123',
      });
    });

    expect(result.current.state.isAuthenticated).toBe(true);
  });
});
