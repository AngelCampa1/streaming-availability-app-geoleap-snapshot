/**
 * Comprehensive Tests for useAuth Hook
 * Tests authentication state management, race conditions, and cleanup
 *
 * Test Coverage:
 * - Login flows (email/password, biometric, OAuth)
 * - Logout with state cleanup
 * - Token refresh lifecycle
 * - Race conditions (logout during refresh)
 * - Concurrent auth operations
 * - Memory leak prevention
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

// Import types for mock data
import type { User, AuthTokens } from '../../../types/auth';

// Mock user and tokens for testing
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  biometricEnabled: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockTokens: AuthTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3600,
  tokenType: 'Bearer',
};

// Create mock service instances
let mockAuthService = {
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  refreshToken: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  socialLogin: jest.fn(),
  isAuthenticated: jest.fn(),
  getCurrentUser: jest.fn(),
  getCurrentTokens: jest.fn(),
  getUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
  enableBiometricAuthentication: jest.fn(),
  disableBiometricAuthentication: jest.fn(),
};

let mockTokenManager = {
  setTokens: jest.fn(),
  getTokens: jest.fn(),
  clearTokens: jest.fn(),
  isTokenExpired: jest.fn(),
};

let mockSecureStorage = {
  getTokens: jest.fn(),
  setTokens: jest.fn(),
  clearTokens: jest.fn(),
};

let mockBiometricAuth = {
  isAvailable: jest.fn(),
  isBiometricEnabled: jest.fn(),
  authenticate: jest.fn(),
  setBiometricEnabled: jest.fn(),
};

let mockOAuthService = {
  signInWithGoogle: jest.fn(),
  signInWithApple: jest.fn(),
};

// Mock service modules with factory functions
jest.mock('@/services/api/AuthService', () => ({
  get authService() {
    return mockAuthService;
  },
}));

jest.mock('@/services/auth/TokenManager', () => ({
  get tokenManager() {
    return mockTokenManager;
  },
}));

jest.mock('@/services/storage/SecureStorage', () => ({
  get _secureStorage() {
    return mockSecureStorage;
  },
}));

jest.mock('@/services/biometricAuth', () => ({
  get biometricAuth() {
    return mockBiometricAuth;
  },
}));

jest.mock('@/services/oauthService', () => ({
  get OAuthService() {
    return mockOAuthService;
  },
}));

// Import after mocks are set up
import React from 'react';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react-native';
import { AuthProvider, useAuth, useIsAuthenticated, useCurrentUser } from '../../../context/AuthContext';

describe('useAuth Hook', () => {
  beforeEach(() => {
    // Use real timers for auth tests - AuthContext uses setTimeout internally
    jest.useRealTimers();
    jest.clearAllMocks();

    // Recreate mock instances for each test
    // NOTE: All async mocks must resolve immediately to prevent unmounted renderer access
    mockAuthService = {
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      socialLogin: jest.fn(),
      isAuthenticated: jest.fn().mockResolvedValue(false),
      getCurrentUser: jest.fn().mockReturnValue(null),
      getCurrentTokens: jest.fn().mockReturnValue(null),
      getUserProfile: jest.fn().mockResolvedValue(null), // Must resolve to prevent hanging
      updateUserProfile: jest.fn().mockResolvedValue(null),
      enableBiometricAuthentication: jest.fn().mockResolvedValue(undefined),
      disableBiometricAuthentication: jest.fn().mockResolvedValue(undefined),
    };

    mockTokenManager = {
      setTokens: jest.fn(),
      getTokens: jest.fn(),
      clearTokens: jest.fn(),
      isTokenExpired: jest.fn(),
    };

    mockSecureStorage = {
      getTokens: jest.fn(),
      setTokens: jest.fn(),
      clearTokens: jest.fn(),
    };

    mockBiometricAuth = {
      isAvailable: jest.fn().mockResolvedValue({
        available: true,
        biometryType: 'FaceID',
      }),
      isBiometricEnabled: jest.fn(),
      authenticate: jest.fn(),
      setBiometricEnabled: jest.fn(),
    };

    mockOAuthService = {
      signInWithGoogle: jest.fn(),
      signInWithApple: jest.fn(),
    };
  });

  afterEach(async () => {
    // Cleanup React components/hooks to prevent unmounted renderer access
    cleanup();
    // Clear any pending timers
    jest.clearAllTimers();
    // Allow pending microtasks to flush to prevent unmounted renderer access
    await new Promise(resolve => setImmediate(resolve));
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  // ============================================
  // Login Flow Tests (3 tests)
  // ============================================

  it('should handle email/password login successfully', async () => {
    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for initialization
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    expect(result.current.state.isAuthenticated).toBe(false);

    // Perform login
    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.current.state.isAuthenticated).toBe(true);
    expect(result.current.state.user).toEqual(mockUser);
    expect(result.current.state.tokens).toEqual(mockTokens);
    expect(result.current.state.error).toBeNull();
  });

  it('should handle login failure with error state', async () => {
    const errorMessage = 'Invalid credentials';
    mockAuthService.login.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    await act(async () => {
      try {
        await result.current.login({
          email: 'test@example.com',
          password: 'wrong-password',
        });
      } catch (_error) {
        // Expected error
      }
    });

    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.user).toBeNull();
    expect(result.current.state.error).toBe(errorMessage);
  });

  it('should handle biometric login successfully', async () => {
    mockBiometricAuth.isBiometricEnabled.mockResolvedValue(true);
    mockBiometricAuth.authenticate.mockResolvedValue({ success: true });
    mockSecureStorage.getTokens.mockResolvedValue(mockTokens);
    mockTokenManager.setTokens.mockResolvedValue(undefined);
    mockAuthService.getUserProfile.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    await act(async () => {
      await result.current.loginWithBiometric();
    });

    expect(mockBiometricAuth.authenticate).toHaveBeenCalledWith('Authenticate to sign in');
    expect(mockSecureStorage.getTokens).toHaveBeenCalled();
    expect(result.current.state.isAuthenticated).toBe(true);
    expect(result.current.state.user).toEqual(mockUser);
  });

  // ============================================
  // OAuth Login Tests (2 tests)
  // ============================================

  it('should handle Google OAuth login successfully', async () => {
    const mockOAuthResult = {
      user: {
        id: 'google-123',
        email: 'test@gmail.com',
        name: 'Test User',
        photo: 'https://example.com/photo.jpg',
      },
      tokens: {
        idToken: 'google-id-token',
        accessToken: 'google-access-token',
      },
    };

    mockOAuthService.signInWithGoogle.mockResolvedValue(mockOAuthResult);
    mockAuthService.socialLogin.mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    await act(async () => {
      await result.current.loginWithSocial('google');
    });

    expect(mockOAuthService.signInWithGoogle).toHaveBeenCalled();
    expect(mockAuthService.socialLogin).toHaveBeenCalledWith(
      'google',
      'google-id-token',
      {
        id: 'google-123',
        email: 'test@gmail.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      }
    );
    expect(result.current.state.isAuthenticated).toBe(true);
  });

  it('should handle OAuth login failure', async () => {
    mockOAuthService.signInWithGoogle.mockRejectedValue(new Error('OAuth failed'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    await act(async () => {
      try {
        await result.current.loginWithSocial('google');
      } catch (_error) {
        // Expected error
      }
    });

    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.error).toBe('OAuth failed');
  });

  // ============================================
  // Logout Tests (2 tests)
  // ============================================

  it('should handle logout with state cleanup', async () => {
    // Setup authenticated state
    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    // Login first
    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(result.current.state.isAuthenticated).toBe(true);

    // Perform logout
    mockAuthService.logout.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.logout();
    });

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.user).toBeNull();
    expect(result.current.state.tokens).toBeNull();
  });

  it('should prevent concurrent logout calls', async () => {
    // Setup authenticated state
    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });
    // Use immediate resolution instead of setTimeout (fake timers don't advance automatically)
    mockAuthService.logout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    // Login first
    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    // Trigger multiple concurrent logouts
    await act(async () => {
      await Promise.all([
        result.current.logout(),
        result.current.logout(),
        result.current.logout(),
      ]);
    });

    // Should only call logout once due to guard
    expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
  });

  // ============================================
  // Token Refresh Tests (2 tests)
  // ============================================

  it('should refresh token successfully', async () => {
    // Setup authenticated state
    mockAuthService.isAuthenticated.mockResolvedValue(true);
    mockAuthService.getCurrentUser.mockReturnValue(mockUser);
    mockAuthService.getCurrentTokens.mockReturnValue(mockTokens);
    mockAuthService.getUserProfile.mockResolvedValue(mockUser);

    const newTokens: AuthTokens = {
      ...mockTokens,
      accessToken: 'new-access-token',
    };
    mockAuthService.refreshToken.mockResolvedValue(newTokens);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.refreshToken();
    });

    expect(mockAuthService.refreshToken).toHaveBeenCalled();
    expect(result.current.state.tokens?.accessToken).toBe('new-access-token');
  });

  it('should logout on token refresh failure', async () => {
    // Setup authenticated state
    mockAuthService.isAuthenticated.mockResolvedValue(true);
    mockAuthService.getCurrentUser.mockReturnValue(mockUser);
    mockAuthService.getCurrentTokens.mockReturnValue(mockTokens);
    mockAuthService.getUserProfile.mockResolvedValue(mockUser);
    mockAuthService.refreshToken.mockRejectedValue(new Error('Refresh failed'));
    mockAuthService.logout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isAuthenticated).toBe(true));

    await act(async () => {
      try {
        await result.current.refreshToken();
      } catch (_error) {
        // Expected error
      }
    });

    // Should trigger logout on refresh failure
    await waitFor(() => expect(result.current.state.isAuthenticated).toBe(false));
  });

  // ============================================
  // Race Condition Tests (3 tests)
  // ============================================

  it('CRITICAL: should prevent token refresh during logout', async () => {
    // Setup authenticated state
    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });
    mockAuthService.logout.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 200))
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    // Login first
    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    // Start logout (slow operation)
    const logoutPromise = act(async () => {
      await result.current.logout();
    });

    // Try to refresh token during logout (should be prevented)
    await act(async () => {
      try {
        await result.current.refreshToken();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('logout');
      }
    });

    await logoutPromise;

    // Refresh should not have been called
    expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
  });

  it('should prevent concurrent token refresh attempts', async () => {
    // Setup authenticated state
    mockAuthService.isAuthenticated.mockResolvedValue(true);
    mockAuthService.getCurrentUser.mockReturnValue(mockUser);
    mockAuthService.getCurrentTokens.mockReturnValue(mockTokens);
    mockAuthService.getUserProfile.mockResolvedValue(mockUser);
    mockAuthService.refreshToken.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockTokens), 100))
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isAuthenticated).toBe(true));

    // Trigger multiple concurrent refresh attempts
    await act(async () => {
      const results = await Promise.allSettled([
        result.current.refreshToken(),
        result.current.refreshToken(),
        result.current.refreshToken(),
      ]);

      // First one should succeed, others should fail
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(succeeded).toBe(1);
      expect(failed).toBe(2);
    });

    // Should only call refresh once due to guard
    expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(1);
  });

  // BUG FIXED: Race condition now handled with hasLoggedOut persistent flag
  // The hasLoggedOut flag remains true even after isLoggingOut is cleared,
  // so refreshToken can detect that logout occurred and discard new tokens.
  // FIX APPLIED: Added hasLoggedOut flag to AuthOperationGuards, set on logout, checked before setting tokens
  it('should handle logout during token refresh', async () => {
    // Setup authenticated state
    mockAuthService.isAuthenticated.mockResolvedValue(true);
    mockAuthService.getCurrentUser.mockReturnValue(mockUser);
    mockAuthService.getCurrentTokens.mockReturnValue(mockTokens);
    mockAuthService.getUserProfile.mockResolvedValue(mockUser);

    const newTokens: AuthTokens = {
      ...mockTokens,
      accessToken: 'new-access-token',
    };

    // Slow refresh to allow logout to happen during it
    mockAuthService.refreshToken.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(newTokens), 200))
    );
    mockAuthService.logout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isAuthenticated).toBe(true));

    // Start token refresh
    const refreshPromise = act(async () => {
      await result.current.refreshToken();
    });

    // Trigger logout while refresh is in progress
    await new Promise(resolve => setTimeout(resolve, 50));
    await act(async () => {
      await result.current.logout();
    });

    await refreshPromise;

    // Should be logged out, new tokens should be discarded
    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.tokens).toBeNull();
  });

  // ============================================
  // Password Reset Tests (2 tests)
  // ============================================

  it('should handle forgot password request', async () => {
    mockAuthService.forgotPassword.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    await act(async () => {
      await result.current.forgotPassword({ email: 'test@example.com' });
    });

    expect(mockAuthService.forgotPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
    expect(result.current.state.error).toBeNull();
  });

  it('should handle password reset', async () => {
    mockAuthService.resetPassword.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    await act(async () => {
      await result.current.resetPassword({
        token: 'reset-token',
        newPassword: 'newPassword123',
      });
    });

    expect(mockAuthService.resetPassword).toHaveBeenCalledWith({
      token: 'reset-token',
      newPassword: 'newPassword123',
    });
    expect(result.current.state.error).toBeNull();
  });

  // ============================================
  // Error Handling Test (1 test)
  // ============================================

  it('should clear error state', async () => {
    mockAuthService.login.mockRejectedValue(new Error('Test error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    // Trigger error
    await act(async () => {
      try {
        await result.current.login({
          email: 'test@example.com',
          password: 'wrong',
        });
      } catch (_error) {
        // Expected
      }
    });

    expect(result.current.state.error).toBe('Test error');

    // Clear error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.state.error).toBeNull();
  });

  // ============================================
  // Biometric Authentication Tests (5 tests) - NEW
  // ============================================

  it('should enable biometric authentication successfully', async () => {
    // Setup authenticated state
    mockAuthService.isAuthenticated.mockResolvedValue(true);
    mockAuthService.getCurrentUser.mockReturnValue(mockUser);
    mockAuthService.getCurrentTokens.mockReturnValue(mockTokens);
    mockAuthService.getUserProfile.mockResolvedValue(mockUser);
    mockAuthService.enableBiometricAuthentication.mockResolvedValue(undefined);
    mockAuthService.updateUserProfile.mockResolvedValue({
      ...mockUser,
      biometricEnabled: true,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.enableBiometric();
    });

    expect(mockAuthService.enableBiometricAuthentication).toHaveBeenCalled();
    expect(mockAuthService.updateUserProfile).toHaveBeenCalledWith({
      biometricEnabled: true,
    });
    expect(result.current.state.user?.biometricEnabled).toBe(true);
  });

  it('should fail to enable biometric when not logged in', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    await act(async () => {
      try {
        await result.current.enableBiometric();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('logged in');
      }
    });

    expect(mockAuthService.enableBiometricAuthentication).not.toHaveBeenCalled();
  });

  it('should disable biometric authentication successfully', async () => {
    // Setup authenticated state with biometric enabled
    const userWithBiometric = { ...mockUser, biometricEnabled: true };
    mockAuthService.isAuthenticated.mockResolvedValue(true);
    mockAuthService.getCurrentUser.mockReturnValue(userWithBiometric);
    mockAuthService.getCurrentTokens.mockReturnValue(mockTokens);
    mockAuthService.getUserProfile.mockResolvedValue(userWithBiometric);
    mockAuthService.disableBiometricAuthentication.mockResolvedValue(undefined);
    mockAuthService.updateUserProfile.mockResolvedValue({
      ...mockUser,
      biometricEnabled: false,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.disableBiometric();
    });

    expect(mockAuthService.disableBiometricAuthentication).toHaveBeenCalled();
    expect(mockAuthService.updateUserProfile).toHaveBeenCalledWith({
      biometricEnabled: false,
    });
    expect(result.current.state.user?.biometricEnabled).toBe(false);
  });

  it('should handle enable biometric failure', async () => {
    mockAuthService.isAuthenticated.mockResolvedValue(true);
    mockAuthService.getCurrentUser.mockReturnValue(mockUser);
    mockAuthService.getCurrentTokens.mockReturnValue(mockTokens);
    mockAuthService.getUserProfile.mockResolvedValue(mockUser);
    mockAuthService.enableBiometricAuthentication.mockRejectedValue(
      new Error('Biometric hardware not available')
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isAuthenticated).toBe(true));

    await act(async () => {
      try {
        await result.current.enableBiometric();
      } catch (_error) {
        // Expected error
      }
    });

    expect(result.current.state.error).toBe('Biometric hardware not available');
  });

  it('should handle disable biometric failure', async () => {
    const userWithBiometric = { ...mockUser, biometricEnabled: true };
    mockAuthService.isAuthenticated.mockResolvedValue(true);
    mockAuthService.getCurrentUser.mockReturnValue(userWithBiometric);
    mockAuthService.getCurrentTokens.mockReturnValue(mockTokens);
    mockAuthService.getUserProfile.mockResolvedValue(userWithBiometric);
    mockAuthService.disableBiometricAuthentication.mockRejectedValue(
      new Error('Failed to disable biometric')
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isAuthenticated).toBe(true));

    await act(async () => {
      try {
        await result.current.disableBiometric();
      } catch (_error) {
        // Expected error
      }
    });

    expect(result.current.state.error).toBe('Failed to disable biometric');
  });

  // ============================================
  // Additional OAuth Tests (2 tests) - NEW
  // ============================================

  it('should handle Apple OAuth login successfully', async () => {
    const mockOAuthResult = {
      user: {
        id: 'apple-123',
        email: 'test@privaterelay.appleid.com',
        name: 'Test User',
      },
      tokens: {
        idToken: 'apple-id-token',
        accessToken: 'apple-access-token',
      },
    };

    mockOAuthService.signInWithApple.mockResolvedValue(mockOAuthResult);
    mockAuthService.socialLogin.mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    await act(async () => {
      await result.current.loginWithSocial('apple');
    });

    expect(mockOAuthService.signInWithApple).toHaveBeenCalled();
    expect(mockAuthService.socialLogin).toHaveBeenCalledWith(
      'apple',
      'apple-id-token',
      {
        id: 'apple-123',
        email: 'test@privaterelay.appleid.com',
        name: 'Test User',
        picture: undefined,
      }
    );
    expect(result.current.state.isAuthenticated).toBe(true);
  });

  it('should handle unsupported OAuth provider', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    await act(async () => {
      try {
        await result.current.loginWithSocial('facebook' as any);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Unsupported provider');
      }
    });

    expect(result.current.state.isAuthenticated).toBe(false);
  });

  // ============================================
  // Registration Tests (2 tests) - NEW
  // ============================================

  it('should handle registration successfully', async () => {
    mockAuthService.register.mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    await act(async () => {
      await result.current.register({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      });
    });

    expect(mockAuthService.register).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
    });
    expect(result.current.state.isAuthenticated).toBe(true);
    expect(result.current.state.user).toEqual(mockUser);
    expect(result.current.state.tokens).toEqual(mockTokens);
  });

  it('should handle registration failure', async () => {
    mockAuthService.register.mockRejectedValue(new Error('Email already exists'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    await act(async () => {
      try {
        await result.current.register({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Existing User',
        });
      } catch (_error) {
        // Expected error
      }
    });

    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.error).toBe('Email already exists');
  });

  // ============================================
  // Password Reset Error Tests (2 tests) - NEW
  // ============================================

  it('should handle forgot password failure', async () => {
    mockAuthService.forgotPassword.mockRejectedValue(new Error('Email not found'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    await act(async () => {
      try {
        await result.current.forgotPassword({ email: 'unknown@example.com' });
      } catch (_error) {
        // Expected error
      }
    });

    expect(result.current.state.error).toBe('Email not found');
  });

  it('should handle reset password failure', async () => {
    mockAuthService.resetPassword.mockRejectedValue(new Error('Invalid or expired token'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    await act(async () => {
      try {
        await result.current.resetPassword({
          token: 'expired-token',
          newPassword: 'newPassword123',
        });
      } catch (_error) {
        // Expected error
      }
    });

    expect(result.current.state.error).toBe('Invalid or expired token');
  });

  // Helper Hooks Tests
  it('useIsAuthenticated returns correct boolean', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useIsAuthenticated(), { wrapper });

    // Initially not authenticated (after initialization)
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('useCurrentUser returns correct user object', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    // Initially no user (after initialization)
    await waitFor(() => expect(result.current).toBeNull());
  });
});
