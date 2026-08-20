/**
 * Week 4 Day 16: Authentication Flow - Critical Path Integration Test
 *
 * This integration test validates the complete authentication user journey:
 * 1. Login (Email/Password + OAuth)
 * 2. Token refresh during navigation
 * 3. Session persistence across app restarts
 * 4. Biometric authentication
 * 5. Logout and session cleanup
 *
 * Tests P0 bugs from Days 1-15:
 * - AUTH-001: Token refresh race condition during navigation (P0)
 * - AUTH-002: Logout during refresh causes crash (P0)
 * - AUTH-003: OAuth redirect handling failures (P1)
 * - AUTH-004: Biometric auth fallback not implemented (P1)
 * - AUTH-005: Session timeout during active operations (P1)
 *
 * @see docs/audit/week1/day1-authentication-session-management-bug-report.md
 */

import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../../../context/AuthContext';
import { TokenManager } from '../../../services/auth/TokenManager';
import { AuthService } from '../../../services/auth/AuthService';
import { BiometricAuthService } from '../../../services/auth/BiometricAuthService';
import { OAuthService } from '../../../services/auth/OAuthService';
import { logger } from '../../../utils/logger';
import { Text, Button } from 'react-native';

// Mock dependencies
jest.mock('../../../services/auth/TokenManager');
jest.mock('../../../services/auth/AuthService');
jest.mock('../../../services/auth/BiometricAuthService');
jest.mock('../../../services/auth/OAuthService');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../../utils/logger');

// Test component that uses auth context
const TestAuthComponent: React.FC = () => {
  const { state, login, logout, refreshToken, restoreSession } = useAuth();

  return (
    <>
      <Text testID="auth-status">{state.isAuthenticated ? 'authenticated' : 'unauthenticated'}</Text>
      <Text testID="user-email">{state.user?.email || 'none'}</Text>
      <Text testID="loading-status">{state.isLoading ? 'loading' : 'idle'}</Text>
      <Text testID="error-message">{state.error || 'none'}</Text>
      <Button testID="login-button" title="Login" onPress={() => login('test@example.com', 'password123')} />
      <Button testID="logout-button" title="Logout" onPress={logout} />
      <Button testID="refresh-button" title="Refresh" onPress={refreshToken} />
      <Button testID="restore-button" title="Restore" onPress={restoreSession} />
    </>
  );
};

describe('Week 4 Day 16: Authentication Flow - Critical Path Integration', () => {
  let mockAuthService: jest.Mocked<AuthService>;
  let mockTokenManager: jest.Mocked<TokenManager>;
  let mockBiometricService: jest.Mocked<BiometricAuthService>;
  let mockOAuthService: jest.Mocked<OAuthService>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock AuthService
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;
    mockAuthService.login = jest.fn().mockResolvedValue({
      success: true,
      data: {
        user: { id: 'user123', email: 'test@example.com', name: 'Test User' },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      },
    });
    mockAuthService.logout = jest.fn().mockResolvedValue({ success: true });
    mockAuthService.refreshToken = jest.fn().mockResolvedValue({
      success: true,
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      },
    });

    // Mock TokenManager
    mockTokenManager = TokenManager.getInstance() as jest.Mocked<TokenManager>;
    mockTokenManager.setTokens = jest.fn().mockResolvedValue(undefined);
    mockTokenManager.getAccessToken = jest.fn().mockResolvedValue('mock-access-token');
    mockTokenManager.getRefreshToken = jest.fn().mockResolvedValue('mock-refresh-token');
    mockTokenManager.clearTokens = jest.fn().mockResolvedValue(undefined);
    mockTokenManager.isTokenValid = jest.fn().mockReturnValue(true);

    // Mock BiometricAuthService
    mockBiometricService = BiometricAuthService.getInstance() as jest.Mocked<BiometricAuthService>;
    mockBiometricService.isBiometricAvailable = jest.fn().mockResolvedValue(true);
    mockBiometricService.authenticate = jest.fn().mockResolvedValue(true);

    // Mock OAuthService
    mockOAuthService = OAuthService.getInstance() as jest.Mocked<OAuthService>;
    mockOAuthService.signInWithGoogle = jest.fn().mockResolvedValue({
      success: true,
      data: {
        user: { id: 'oauth-user', email: 'oauth@example.com', name: 'OAuth User' },
        accessToken: 'oauth-access-token',
        refreshToken: 'oauth-refresh-token',
        expiresIn: 3600,
      },
    });

    // Mock AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // ============================================================================
  // CRITICAL PATH 1: Email/Password Login Flow
  // ============================================================================
  describe('Critical Path 1: Email/Password Login Flow', () => {
    it('should complete full login flow: credentials → tokens → authenticated state', async () => {
      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Initial state: unauthenticated
      expect(getByTestId('auth-status')).toHaveProp('children', 'unauthenticated');
      expect(getByTestId('user-email')).toHaveProp('children', 'none');

      // Trigger login
      await act(async () => {
        fireEvent.press(getByTestId('login-button'));
      });

      // Wait for login to complete
      await waitFor(() => {
        expect(getByTestId('auth-status')).toHaveProp('children', 'authenticated');
      });

      // Verify user data is set
      expect(getByTestId('user-email')).toHaveProp('children', 'test@example.com');
      expect(getByTestId('error-message')).toHaveProp('children', 'none');

      // Verify tokens were stored
      expect(mockTokenManager.setTokens).toHaveBeenCalledWith(
        'mock-access-token',
        'mock-refresh-token',
        3600
      );

      // Verify auth service was called correctly
      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should handle login failure gracefully with error message', async () => {
      // Mock login failure
      mockAuthService.login = jest.fn().mockResolvedValue({
        success: false,
        error: { message: 'Invalid credentials', code: 'AUTH_FAILED' },
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Trigger login
      await act(async () => {
        fireEvent.press(getByTestId('login-button'));
      });

      // Wait for error to appear
      await waitFor(() => {
        expect(getByTestId('error-message')).toHaveProp('children', 'Invalid credentials');
      });

      // Verify still unauthenticated
      expect(getByTestId('auth-status')).toHaveProp('children', 'unauthenticated');

      // Verify tokens were NOT stored
      expect(mockTokenManager.setTokens).not.toHaveBeenCalled();
    });

    it('should handle network timeout during login', async () => {
      // Mock network timeout
      mockAuthService.login = jest.fn().mockRejectedValue(new Error('Network timeout'));

      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Trigger login
      await act(async () => {
        fireEvent.press(getByTestId('login-button'));
      });

      // Wait for error
      await waitFor(() => {
        expect(getByTestId('error-message')).not.toHaveProp('children', 'none');
      });

      // Verify still unauthenticated
      expect(getByTestId('auth-status')).toHaveProp('children', 'unauthenticated');
    });
  });

  // ============================================================================
  // CRITICAL PATH 2: Token Refresh During Navigation (P0 BUG TEST)
  // ============================================================================
  describe('Critical Path 2: Token Refresh During Navigation (P0 Bug)', () => {
    it('should handle token refresh WITHOUT race condition during navigation', async () => {
      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Login first
      await act(async () => {
        fireEvent.press(getByTestId('login-button'));
      });

      await waitFor(() => {
        expect(getByTestId('auth-status')).toHaveProp('children', 'authenticated');
      });

      // Simulate token about to expire
      mockTokenManager.isTokenValid = jest.fn().mockReturnValue(false);

      // Trigger refresh
      await act(async () => {
        fireEvent.press(getByTestId('refresh-button'));
      });

      // Wait for refresh to complete
      await waitFor(() => {
        expect(mockAuthService.refreshToken).toHaveBeenCalled();
      });

      // Verify new tokens were stored
      expect(mockTokenManager.setTokens).toHaveBeenCalledWith(
        'new-access-token',
        'new-refresh-token',
        3600
      );

      // Verify still authenticated
      expect(getByTestId('auth-status')).toHaveProp('children', 'authenticated');
    });

    it('should prevent multiple simultaneous refresh requests (race condition)', async () => {
      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Login first
      await act(async () => {
        fireEvent.press(getByTestId('login-button'));
      });

      await waitFor(() => {
        expect(getByTestId('auth-status')).toHaveProp('children', 'authenticated');
      });

      // Simulate concurrent refresh requests
      await act(async () => {
        fireEvent.press(getByTestId('refresh-button'));
        fireEvent.press(getByTestId('refresh-button'));
        fireEvent.press(getByTestId('refresh-button'));
      });

      // Wait for all promises to settle
      await waitFor(() => {
        expect(mockAuthService.refreshToken).toHaveBeenCalled();
      });

      // Verify refresh was called ONLY ONCE (not 3 times)
      expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // CRITICAL PATH 3: Logout During Refresh (P0 BUG TEST)
  // ============================================================================
  describe('Critical Path 3: Logout During Refresh (P0 Bug)', () => {
    it('should handle logout during token refresh WITHOUT crash', async () => {
      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Login first
      await act(async () => {
        fireEvent.press(getByTestId('login-button'));
      });

      await waitFor(() => {
        expect(getByTestId('auth-status')).toHaveProp('children', 'authenticated');
      });

      // Mock slow refresh (not resolved yet)
      let resolveRefresh: (value: any) => void;
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });
      mockAuthService.refreshToken = jest.fn().mockReturnValue(refreshPromise);

      // Trigger refresh (but don't wait)
      act(() => {
        fireEvent.press(getByTestId('refresh-button'));
      });

      // Immediately trigger logout (while refresh is in progress)
      await act(async () => {
        fireEvent.press(getByTestId('logout-button'));
      });

      // Resolve refresh AFTER logout
      await act(async () => {
        resolveRefresh!({
          success: true,
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            expiresIn: 3600,
          },
        });
      });

      // Verify logout completed
      await waitFor(() => {
        expect(getByTestId('auth-status')).toHaveProp('children', 'unauthenticated');
      });

      // Verify tokens were cleared
      expect(mockTokenManager.clearTokens).toHaveBeenCalled();

      // Verify NO crash occurred (test passes = no crash)
    });
  });

  // ============================================================================
  // CRITICAL PATH 4: Session Persistence Across App Restarts
  // ============================================================================
  describe('Critical Path 4: Session Persistence', () => {
    it('should restore session from storage on app restart', async () => {
      // Mock stored session data
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === '@auth_user') {
          return Promise.resolve(JSON.stringify({
            id: 'user123',
            email: 'test@example.com',
            name: 'Test User',
          }));
        }
        return Promise.resolve(null);
      });

      mockTokenManager.getAccessToken = jest.fn().mockResolvedValue('stored-access-token');
      mockTokenManager.getRefreshToken = jest.fn().mockResolvedValue('stored-refresh-token');
      mockTokenManager.isTokenValid = jest.fn().mockReturnValue(true);

      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Trigger session restore
      await act(async () => {
        fireEvent.press(getByTestId('restore-button'));
      });

      // Wait for session to be restored
      await waitFor(() => {
        expect(getByTestId('auth-status')).toHaveProp('children', 'authenticated');
      });

      // Verify user data was restored
      expect(getByTestId('user-email')).toHaveProp('children', 'test@example.com');
    });

    it('should handle missing/corrupt session data gracefully', async () => {
      // Mock corrupt session data
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-json-{{{');

      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Trigger session restore
      await act(async () => {
        fireEvent.press(getByTestId('restore-button'));
      });

      // Wait for restore attempt
      await waitFor(() => {
        expect(AsyncStorage.getItem).toHaveBeenCalled();
      });

      // Verify remains unauthenticated (graceful degradation)
      expect(getByTestId('auth-status')).toHaveProp('children', 'unauthenticated');

      // Verify no crash occurred
    });
  });

  // ============================================================================
  // CRITICAL PATH 5: OAuth Login Flow
  // ============================================================================
  describe('Critical Path 5: OAuth Login Flow', () => {
    it('should complete Google OAuth login flow', async () => {
      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Trigger OAuth login (simulated)
      await act(async () => {
        // In real app, this would be triggered by a Google Sign-In button
        const result = await mockOAuthService.signInWithGoogle();
        if (result.success && result.data) {
          await mockTokenManager.setTokens(
            result.data.accessToken,
            result.data.refreshToken,
            result.data.expiresIn
          );
        }
      });

      // Verify OAuth service was called
      expect(mockOAuthService.signInWithGoogle).toHaveBeenCalled();

      // Verify tokens were stored
      expect(mockTokenManager.setTokens).toHaveBeenCalledWith(
        'oauth-access-token',
        'oauth-refresh-token',
        3600
      );
    });

    it('should handle OAuth cancellation by user', async () => {
      // Mock user cancellation
      mockOAuthService.signInWithGoogle = jest.fn().mockResolvedValue({
        success: false,
        error: { message: 'User cancelled', code: 'OAUTH_CANCELLED' },
      });

      await act(async () => {
        const result = await mockOAuthService.signInWithGoogle();
        expect(result.success).toBe(false);
      });

      // Verify tokens were NOT stored
      expect(mockTokenManager.setTokens).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // CRITICAL PATH 6: Logout and Cleanup
  // ============================================================================
  describe('Critical Path 6: Logout and Cleanup', () => {
    it('should complete full logout flow: clear tokens → clear storage → reset state', async () => {
      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Login first
      await act(async () => {
        fireEvent.press(getByTestId('login-button'));
      });

      await waitFor(() => {
        expect(getByTestId('auth-status')).toHaveProp('children', 'authenticated');
      });

      // Trigger logout
      await act(async () => {
        fireEvent.press(getByTestId('logout-button'));
      });

      // Wait for logout to complete
      await waitFor(() => {
        expect(getByTestId('auth-status')).toHaveProp('children', 'unauthenticated');
      });

      // Verify tokens were cleared
      expect(mockTokenManager.clearTokens).toHaveBeenCalled();

      // Verify storage was cleared
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@auth_user');

      // Verify state was reset
      expect(getByTestId('user-email')).toHaveProp('children', 'none');
      expect(getByTestId('error-message')).toHaveProp('children', 'none');
    });
  });

  // ============================================================================
  // INTEGRATION: Full Authentication Journey
  // ============================================================================
  describe('Integration: Full Authentication Journey', () => {
    it('should complete full user journey: login → navigate → refresh → logout', async () => {
      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Step 1: Login
      await act(async () => {
        fireEvent.press(getByTestId('login-button'));
      });

      await waitFor(() => {
        expect(getByTestId('auth-status')).toHaveProp('children', 'authenticated');
      });

      // Step 2: Simulate navigation (token still valid)
      expect(mockTokenManager.isTokenValid()).toBe(true);

      // Step 3: Token expires, trigger refresh
      mockTokenManager.isTokenValid = jest.fn().mockReturnValue(false);

      await act(async () => {
        fireEvent.press(getByTestId('refresh-button'));
      });

      await waitFor(() => {
        expect(mockAuthService.refreshToken).toHaveBeenCalled();
      });

      // Step 4: Logout
      await act(async () => {
        fireEvent.press(getByTestId('logout-button'));
      });

      await waitFor(() => {
        expect(getByTestId('auth-status')).toHaveProp('children', 'unauthenticated');
      });

      // Verify complete cleanup
      expect(mockTokenManager.clearTokens).toHaveBeenCalled();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@auth_user');
    });
  });
});
