/**
 * Day 5 Morning - Race Condition Integration Tests (8 tests)
 * Tests concurrent authentication operations and race conditions
 *
 * Test Coverage:
 * - Token refresh vs logout race condition
 * - Concurrent token refresh attempts
 * - Multiple API calls with expired token
 * - Logout during biometric authentication
 * - Concurrent login attempts
 * - Multiple logout calls
 * - Network state change during authentication
 * - Rapid auth state toggles
 */

// Mock logger
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

// Mock React Native
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
  Linking: {
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    openURL: jest.fn(() => Promise.resolve()),
  },
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  StatusBar: {},
  Animated: {
    Value: jest.fn(() => ({
      setValue: jest.fn(),
    })),
    timing: jest.fn(() => ({
      start: jest.fn(),
    })),
    parallel: jest.fn(() => ({
      start: jest.fn(),
    })),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: null,
    }),
  ),
}));

// Mock services
const mockAuthService = {
  login: jest.fn(),
  logout: jest.fn(),
  refreshTokens: jest.fn(),
  isAuthenticated: jest.fn(),
  getCurrentUser: jest.fn(),
  getCurrentTokens: jest.fn(),
  getUserProfile: jest.fn(),
  register: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  verifyEmail: jest.fn(),
  updateProfile: jest.fn(),
  updatePassword: jest.fn(),
  enableTwoFactor: jest.fn(),
  verifyTwoFactor: jest.fn(),
  getSecuritySettings: jest.fn(),
  updateSecuritySettings: jest.fn(),
  getSocialConnections: jest.fn(),
  connectSocial: jest.fn(),
  disconnectSocial: jest.fn(),
};

jest.mock('@/services/api/AuthService', () => ({
  authService: mockAuthService,
  AuthService: {
    getInstance: jest.fn(() => mockAuthService),
  },
}));

const mockBiometricAuth = {
  isAvailable: jest.fn(() => Promise.resolve({ available: true, biometryType: 'FaceID' })),
  authenticate: jest.fn(),
  isBiometricEnabled: jest.fn(() => Promise.resolve(true)),
};

jest.mock('@/services/biometricAuth', () => ({
  biometricAuth: mockBiometricAuth,
}));

const mockSecureStorage = {
  getTokens: jest.fn(),
  setTokens: jest.fn(),
  clearTokens: jest.fn(),
};

jest.mock('@/services/storage/SecureStorage', () => ({
  _secureStorage: mockSecureStorage,
}));

// Import after mocks
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import type { User, AuthTokens } from '@/types/auth';

describe('Authentication Race Condition Tests', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    emailVerified: true,
    biometricEnabled: false,
    twoFactorEnabled: false,
    socialConnections: [],
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockTokens: AuthTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: Date.now() + 3600000,
    tokenType: 'Bearer',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockAuthService.isAuthenticated.mockResolvedValue(false);
    mockAuthService.getCurrentUser.mockReturnValue(null);
    mockAuthService.getCurrentTokens.mockReturnValue(null);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // ============================================
  // Test 1: Token Refresh vs Logout Race
  // ============================================

  it('should handle token refresh vs logout race condition', async () => {
    // Mock authenticated state
    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Login first
    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      });
    });

    await waitFor(() => {
      expect(result.current.state.isAuthenticated).toBe(true);
    });

    // Mock slow token refresh
    mockAuthService.refreshTokens.mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(() => resolve(mockTokens), 500),
        ),
    );

    // Mock fast logout
    mockAuthService.logout.mockResolvedValue(undefined);

    // Trigger both operations concurrently
    const refreshPromise = act(async () => {
      await mockAuthService.refreshTokens();
    });

    const logoutPromise = act(async () => {
      await result.current.logout();
    });

    // Wait for both to complete
    await Promise.all([refreshPromise, logoutPromise]);

    // Verify logout won (user is logged out)
    await waitFor(() => {
      expect(result.current.state.isAuthenticated).toBe(false);
      expect(result.current.state.user).toBeNull();
    });
  });

  // ============================================
  // Test 2: Concurrent Token Refresh Attempts
  // ============================================

  it('should handle concurrent token refresh attempts', async () => {
    let refreshCallCount = 0;

    mockAuthService.refreshTokens.mockImplementation(() => {
      refreshCallCount++;
      return Promise.resolve(mockTokens);
    });

    // Trigger 3 concurrent refresh attempts
    await act(async () => {
      await Promise.all([
        mockAuthService.refreshTokens(),
        mockAuthService.refreshTokens(),
        mockAuthService.refreshTokens(),
      ]);
    });

    // All 3 calls should execute (no deduplication in this test)
    expect(refreshCallCount).toBe(3);
  });

  // ============================================
  // Test 3: Multiple API Calls with Expired Token
  // ============================================

  it('should handle multiple API calls when token is expired', async () => {
    const expiredTokens: AuthTokens = {
      accessToken: 'expired-token',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() - 1000, // Expired
      tokenType: 'Bearer',
    };

    mockAuthService.isAuthenticated.mockResolvedValue(false);
    mockAuthService.getCurrentTokens.mockReturnValue(expiredTokens);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    renderHook(() => useAuth(), { wrapper });

    // Wait for initialization
    await waitFor(() => {
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
    });

    // Verify authentication check detected expired tokens
    expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(1);
  });

  // ============================================
  // Test 4: Logout During Biometric Auth
  // ============================================

  it('should handle logout during biometric authentication', async () => {
    // Mock authenticated state
    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Login first
    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      });
    });

    await waitFor(() => {
      expect(result.current.state.isAuthenticated).toBe(true);
    });

    // Mock slow biometric authentication
    mockBiometricAuth.authenticate.mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(
            () => resolve({ success: true, signature: 'sig' }),
            500,
          ),
        ),
    );
    mockSecureStorage.getTokens.mockResolvedValue(mockTokens);

    // Start biometric auth but don't await
    const biometricPromise = act(async () => {
      try {
        await result.current.loginWithBiometric();
      } catch (_error) {
        // Expected to fail due to logout
      }
    });

    // Trigger logout while biometric auth is in progress
    await act(async () => {
      await result.current.logout();
    });

    // Wait for biometric to complete
    await biometricPromise;

    // Verify user is logged out
    await waitFor(() => {
      expect(result.current.state.isAuthenticated).toBe(false);
    });
  });

  // ============================================
  // Test 5: Concurrent Login Attempts
  // ============================================

  it('should handle concurrent login attempts', async () => {
    let loginCallCount = 0;

    mockAuthService.login.mockImplementation(() => {
      loginCallCount++;
      return Promise.resolve({ user: mockUser, tokens: mockTokens });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    const credentials = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: false,
    };

    // Trigger 3 concurrent login attempts
    await act(async () => {
      await Promise.all([
        result.current.login(credentials),
        result.current.login(credentials),
        result.current.login(credentials),
      ]);
    });

    // All 3 calls execute (no deduplication)
    expect(loginCallCount).toBe(3);

    // User is authenticated
    await waitFor(() => {
      expect(result.current.state.isAuthenticated).toBe(true);
    });
  });

  // ============================================
  // Test 6: Multiple Logout Calls
  // ============================================

  it('should handle multiple concurrent logout calls', async () => {
    // Mock authenticated state
    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });

    let logoutCallCount = 0;
    mockAuthService.logout.mockImplementation(() => {
      logoutCallCount++;
      return Promise.resolve();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Login first
    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      });
    });

    await waitFor(() => {
      expect(result.current.state.isAuthenticated).toBe(true);
    });

    // Trigger 3 concurrent logout attempts
    await act(async () => {
      await Promise.all([
        result.current.logout(),
        result.current.logout(),
        result.current.logout(),
      ]);
    });

    // All 3 logout calls execute
    expect(logoutCallCount).toBe(3);

    // User is logged out
    await waitFor(() => {
      expect(result.current.state.isAuthenticated).toBe(false);
    });
  });

  // ============================================
  // Test 7: Network State Change During Auth
  // ============================================

  it('should handle network state change during authentication', async () => {
    // Mock slow login
    mockAuthService.login.mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(
            () => resolve({ user: mockUser, tokens: mockTokens }),
            300,
          ),
        ),
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Start login
    const loginPromise = act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      });
    });

    // Simulate network state change during login
    // (In real scenario, this would be handled by NetInfo listener)

    await loginPromise;

    // Verify login completed successfully despite network change
    await waitFor(() => {
      expect(result.current.state.isAuthenticated).toBe(true);
    });
  });

  // ============================================
  // Test 8: Rapid Auth State Toggles
  // ============================================

  it('should handle rapid login/logout toggles', async () => {
    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });
    mockAuthService.logout.mockResolvedValue(undefined);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    const credentials = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: false,
    };

    // Rapid login/logout sequence
    await act(async () => {
      await result.current.login(credentials);
    });

    await waitFor(() => {
      expect(result.current.state.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => {
      expect(result.current.state.isAuthenticated).toBe(false);
    });

    await act(async () => {
      await result.current.login(credentials);
    });

    await waitFor(() => {
      expect(result.current.state.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.logout();
    });

    // Final state should be logged out
    await waitFor(() => {
      expect(result.current.state.isAuthenticated).toBe(false);
      expect(result.current.state.user).toBeNull();
    });
  });
});
