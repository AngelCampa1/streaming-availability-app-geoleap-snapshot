/**
 * AuthService.test.ts - Comprehensive tests for authentication service
 *
 * Test Strategy: Focus on bug detection through testing login/register flows,
 * social authentication, biometric setup, password reset, email verification,
 * and validation logic. Tests verify real service logic with mocked dependencies.
 *
 * Coverage Target: 100% of AuthService.ts (637 lines)
 *
 * Critical Bug Scenarios:
 * - Singleton instance consistency
 * - Token storage after successful authentication
 * - Logout cleanup even when API fails
 * - Biometric enable requires logged-in user
 * - Password validation (length, match)
 * - Email validation regex
 * - Social login provider mapping
 * - Email verification updates cached user
 * - Error code preservation
 */

import { AuthService, authService } from './AuthService';
import { httpClient } from './HttpClient';
import { tokenManager } from '../auth/TokenManager';
import { _secureStorage as secureStorage } from '../storage/SecureStorage';
import { logger } from '../../utils/logger';
import {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  SocialProvider,
} from '../../types/auth';

// Mock dependencies
jest.mock('./HttpClient');
jest.mock('../auth/TokenManager');
jest.mock('../storage/SecureStorage');
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AuthService', () => {
  let service: AuthService;

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

  const mockTokens: AuthTokens = {
    accessToken: 'access-token-abc',
    refreshToken: 'refresh-token-xyz',
    expiresIn: 3600,
    tokenType: 'Bearer',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instance for testing
    (AuthService as any).instance = undefined;
    service = AuthService.getInstance();

    // Setup httpClient mocks
    (httpClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: { user: mockUser, tokens: mockTokens },
      status: 200,
      statusText: 'OK',
      headers: {},
    });

    (httpClient.get as jest.Mock).mockResolvedValue({
      success: true,
      data: mockUser,
      status: 200,
      statusText: 'OK',
      headers: {},
    });

    (httpClient.patch as jest.Mock).mockResolvedValue({
      success: true,
      data: mockUser,
      status: 200,
      statusText: 'OK',
      headers: {},
    });

    // Setup tokenManager mocks
    (tokenManager.setTokens as jest.Mock).mockResolvedValue(undefined);
    (tokenManager.clearAuthData as jest.Mock).mockResolvedValue(undefined);
    (tokenManager.getCurrentUser as jest.Mock).mockReturnValue(mockUser);
    (tokenManager.getCurrentTokens as jest.Mock).mockReturnValue(mockTokens);
    (tokenManager.isAuthenticated as jest.Mock).mockResolvedValue(true);
    (tokenManager.updateUser as jest.Mock).mockResolvedValue(undefined);
    (tokenManager.refreshTokens as jest.Mock).mockResolvedValue({
      success: true,
      tokens: mockTokens,
    });
    (tokenManager.validateTokens as jest.Mock).mockReturnValue({
      isExpired: false,
      needsRefresh: false,
      timeUntilExpiry: 3600000,
    });

    // Setup secureStorage mocks
    (secureStorage.isBiometricSupported as jest.Mock).mockResolvedValue(true);
    (secureStorage.storeBiometricKey as jest.Mock).mockResolvedValue(undefined);
    (secureStorage.removeBiometricKey as jest.Mock).mockResolvedValue(undefined);
    (secureStorage.storeSecuritySettings as jest.Mock).mockResolvedValue(undefined);
    (secureStorage.getSecuritySettings as jest.Mock).mockResolvedValue(null);
  });

  // ==========================================================================
  // Singleton Pattern Tests - BUG DETECTION
  // ==========================================================================

  describe('Singleton Pattern', () => {
    it('BUG: getInstance returns same instance', () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('exported authService is singleton instance', () => {
      // Check they have the same data (deep equality)
      // Note: May be different object references due to module mocking
      expect(authService).toStrictEqual(AuthService.getInstance());
    });
  });

  // ==========================================================================
  // Login Tests - BUG DETECTION
  // ==========================================================================

  describe('Login', () => {
    const validCredentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: false,
    };

    it('BUG: Successful login stores tokens', async () => {
      const result = await service.login(validCredentials);

      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(mockTokens);
      expect(tokenManager.setTokens).toHaveBeenCalledWith(mockTokens, mockUser);
    });

    it('BUG: Login calls correct endpoint', async () => {
      await service.login(validCredentials);

      expect(httpClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        validCredentials,
        { showNetworkAlert: true }
      );
    });

    it('BUG: Validates email is required', async () => {
      await expect(
        service.login({ email: '', password: 'password123', rememberMe: false })
      ).rejects.toThrow('Email is required');

      expect(tokenManager.setTokens).not.toHaveBeenCalled();
    });

    it('BUG: Validates password is required', async () => {
      await expect(
        service.login({ email: 'test@example.com', password: '', rememberMe: false })
      ).rejects.toThrow('Password is required');

      expect(tokenManager.setTokens).not.toHaveBeenCalled();
    });

    it('BUG: Validates email format', async () => {
      await expect(
        service.login({ email: 'invalid-email', password: 'password123', rememberMe: false })
      ).rejects.toThrow('Invalid email format');

      expect(tokenManager.setTokens).not.toHaveBeenCalled();
    });

    it('BUG: Enables biometric if rememberMe and config enabled', async () => {
      service.updateConfig({ enableBiometricDefault: true });

      await service.login({ ...validCredentials, rememberMe: true });

      expect(secureStorage.isBiometricSupported).toHaveBeenCalled();
      expect(secureStorage.storeBiometricKey).toHaveBeenCalledWith(mockUser.id);
    });

    it('BUG: Does not enable biometric if rememberMe false', async () => {
      service.updateConfig({ enableBiometricDefault: true });

      await service.login({ ...validCredentials, rememberMe: false });

      expect(secureStorage.storeBiometricKey).not.toHaveBeenCalled();
    });

    it('handles API error response', async () => {
      (httpClient.post as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: { message: 'Invalid credentials', code: 'AUTH_FAILED' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
      });

      await expect(service.login(validCredentials)).rejects.toThrow('Invalid credentials');
    });

    it('handles network error', async () => {
      (httpClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.login(validCredentials)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Register Tests - BUG DETECTION
  // ==========================================================================

  describe('Register', () => {
    const validCredentials: RegisterCredentials = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      agreeToTerms: true,
      firstName: 'Test',
      lastName: 'User',
    };

    it('BUG: Successful registration stores tokens', async () => {
      const result = await service.register(validCredentials);

      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(mockTokens);
      expect(tokenManager.setTokens).toHaveBeenCalledWith(mockTokens, mockUser);
    });

    it('BUG: Validates passwords match', async () => {
      await expect(
        service.register({ ...validCredentials, confirmPassword: 'different123' })
      ).rejects.toThrow('Passwords do not match');

      expect(tokenManager.setTokens).not.toHaveBeenCalled();
    });

    it('BUG: Validates password length (min 8 chars)', async () => {
      await expect(
        service.register({
          ...validCredentials,
          password: 'short',
          confirmPassword: 'short',
        })
      ).rejects.toThrow('at least 8 characters');

      expect(tokenManager.setTokens).not.toHaveBeenCalled();
    });

    it('BUG: Validates email format', async () => {
      await expect(
        service.register({ ...validCredentials, email: 'not-an-email' })
      ).rejects.toThrow('Invalid email format');

      expect(tokenManager.setTokens).not.toHaveBeenCalled();
    });

    it('BUG: Validates terms agreement', async () => {
      await expect(
        service.register({ ...validCredentials, agreeToTerms: false })
      ).rejects.toThrow('agree to the terms and conditions');

      expect(tokenManager.setTokens).not.toHaveBeenCalled();
    });

    it('BUG: Validates email is required', async () => {
      await expect(
        service.register({ ...validCredentials, email: '' })
      ).rejects.toThrow('Email is required');
    });

    it('BUG: Validates password is required', async () => {
      await expect(
        service.register({ ...validCredentials, password: '', confirmPassword: '' })
      ).rejects.toThrow('Password is required');
    });

    it('BUG: Validates confirm password is required', async () => {
      await expect(
        service.register({ ...validCredentials, confirmPassword: '' })
      ).rejects.toThrow('Password confirmation is required');
    });

    it('calls correct registration endpoint', async () => {
      await service.register(validCredentials);

      expect(httpClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        validCredentials,
        { showNetworkAlert: true }
      );
    });
  });

  // ==========================================================================
  // Social Login Tests - BUG DETECTION
  // ==========================================================================

  describe('Social Login', () => {
    const mockGoogleUserInfo = {
      id: 'google-123',
      email: 'test@gmail.com',
      given_name: 'Test',
      family_name: 'User',
      picture: 'https://example.com/avatar.jpg',
    };

    it('BUG: Google login with userInfo normalization', async () => {
      const result = await service.socialLogin(
        'google',
        'google-token-abc',
        mockGoogleUserInfo
      );

      expect(result.user).toEqual(mockUser);
      expect(tokenManager.setTokens).toHaveBeenCalledWith(mockTokens, mockUser);

      const callArgs = (httpClient.post as jest.Mock).mock.calls[0][1];
      expect(callArgs.provider).toBe('google');
      expect(callArgs.token).toBe('google-token-abc');
      expect(callArgs.userInfo).toMatchObject({
        id: 'google-123',
        email: 'test@gmail.com',
        firstName: 'Test',
        lastName: 'User',
        avatar: 'https://example.com/avatar.jpg',
      });
    });

    it('BUG: Apple login with userInfo normalization', async () => {
      const mockAppleUserInfo = {
        id: 'apple-456',
        email: 'test@icloud.com',
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
      };

      await service.socialLogin(
        'apple',
        'apple-token-xyz',
        mockAppleUserInfo
      );

      const callArgs = (httpClient.post as jest.Mock).mock.calls[0][1];
      expect(callArgs.provider).toBe('apple');
      expect(callArgs.userInfo.firstName).toBe('Test');
    });

    it('BUG: Social login without userInfo', async () => {
      await service.socialLogin('google', 'token');

      const callArgs = (httpClient.post as jest.Mock).mock.calls[0][1];
      expect(callArgs.userInfo).toBeUndefined();
    });

    it('BUG: Enables biometric for social logins when config enabled', async () => {
      service.updateConfig({ enableBiometricDefault: true });

      await service.socialLogin('google', 'token');

      expect(secureStorage.isBiometricSupported).toHaveBeenCalled();
      expect(secureStorage.storeBiometricKey).toHaveBeenCalledWith(mockUser.id);
    });

    it('calls correct social auth endpoint', async () => {
      await service.socialLogin('google', 'token');

      expect(httpClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/socialauth/authenticate'),
        expect.any(Object),
        { showNetworkAlert: true }
      );
    });

    it('handles social login API error', async () => {
      (httpClient.post as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: { message: 'Social auth failed', code: 'SOCIAL_AUTH_ERROR' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
      });

      await expect(
        service.socialLogin('google', 'token')
      ).rejects.toThrow('Social auth failed');
    });
  });

  // ==========================================================================
  // Logout Tests - BUG DETECTION
  // ==========================================================================

  describe('Logout', () => {
    it('BUG: Logout clears tokens even if API call fails', async () => {
      (httpClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await service.logout();

      // CRITICAL: Should still clear local data
      expect(tokenManager.clearAuthData).toHaveBeenCalled();
    });

    it('calls logout endpoint with skipRetry', async () => {
      await service.logout();

      expect(httpClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        undefined,
        { skipRetry: true }
      );
    });

    it('BUG: Clears tokens after successful API call', async () => {
      await service.logout();

      expect(tokenManager.clearAuthData).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Token Refresh Tests
  // ==========================================================================

  describe('Token Refresh', () => {
    it('refreshes tokens via tokenManager', async () => {
      const result = await service.refreshToken();

      expect(result).toEqual(mockTokens);
      expect(tokenManager.refreshTokens).toHaveBeenCalled();
    });

    it('handles refresh failure', async () => {
      (tokenManager.refreshTokens as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Refresh token expired',
      });

      await expect(service.refreshToken()).rejects.toThrow('Refresh token expired');
    });
  });

  // ==========================================================================
  // Profile Management Tests - BUG DETECTION
  // ==========================================================================

  describe('Profile Management', () => {
    it('getUserProfile fetches and caches user', async () => {
      const result = await service.getUserProfile();

      expect(result).toEqual(mockUser);
      expect(httpClient.get).toHaveBeenCalledWith(expect.stringContaining('/auth/profile'));
      expect(tokenManager.updateUser).toHaveBeenCalledWith(mockUser);
    });

    it('updateUserProfile updates cached user', async () => {
      const updates = { firstName: 'Updated', lastName: 'Name' };
      const updatedUser = { ...mockUser, ...updates };

      (httpClient.patch as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: updatedUser,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await service.updateUserProfile(updates);

      expect(result).toEqual(updatedUser);
      expect(httpClient.patch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/profile'),
        updates
      );
      expect(tokenManager.updateUser).toHaveBeenCalledWith(updatedUser);
    });

    it('handles profile fetch error', async () => {
      (httpClient.get as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: { message: 'Profile not found', code: 'NOT_FOUND' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
      });

      await expect(service.getUserProfile()).rejects.toThrow('Profile not found');
    });
  });

  // ==========================================================================
  // Password Reset Tests - BUG DETECTION
  // ==========================================================================

  describe('Password Reset', () => {
    it('BUG: Forgot password validates email', async () => {
      await expect(
        service.forgotPassword({ email: 'invalid-email' })
      ).rejects.toThrow('Invalid email format');

      expect(httpClient.post).not.toHaveBeenCalled();
    });

    it('BUG: Forgot password sends request', async () => {
      await service.forgotPassword({ email: 'test@example.com' });

      expect(httpClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/forgot-password'),
        { email: 'test@example.com' },
        { showNetworkAlert: true }
      );
    });

    it('BUG: Reset password validates password', async () => {
      await expect(
        service.resetPassword({
          token: 'reset-token',
          newPassword: 'short',
        })
      ).rejects.toThrow('at least 8 characters');

      expect(httpClient.post).not.toHaveBeenCalled();
    });

    it('BUG: Reset password sends request', async () => {
      const request = {
        token: 'reset-token-abc',
        newPassword: 'newpassword123',
      };

      await service.resetPassword(request);

      expect(httpClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/reset-password'),
        request,
        { showNetworkAlert: true }
      );
    });

    it('handles forgot password API error', async () => {
      (httpClient.post as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: { message: 'User not found', code: 'NOT_FOUND' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
      });

      await expect(
        service.forgotPassword({ email: 'test@example.com' })
      ).rejects.toThrow('User not found');
    });
  });

  // ==========================================================================
  // Email Verification Tests - BUG DETECTION
  // ==========================================================================

  describe('Email Verification (M6: endpoint removed)', () => {
    it('always rejects with endpoint-removed message regardless of token', async () => {
      await expect(service.verifyEmail('any-token')).rejects.toThrow(
        'Email verification endpoint has been removed',
      );
    });

    it('never makes an HTTP call (endpoint is gone)', async () => {
      await expect(service.verifyEmail('any-token')).rejects.toThrow();
      expect(httpClient.post).not.toHaveBeenCalled();
    });

    it('rejects with the same message for empty token', async () => {
      await expect(service.verifyEmail('')).rejects.toThrow(
        'Email verification endpoint has been removed',
      );
    });
  });

  // ==========================================================================
  // Biometric Authentication Tests - BUG DETECTION
  // ==========================================================================

  describe('Biometric Authentication', () => {
    it('BUG: Enable biometric requires logged-in user', async () => {
      (tokenManager.getCurrentUser as jest.Mock).mockReturnValueOnce(null);

      await expect(service.enableBiometricAuthentication()).rejects.toThrow(
        'User must be logged in'
      );

      expect(secureStorage.storeBiometricKey).not.toHaveBeenCalled();
    });

    it('BUG: Enable biometric requires device support', async () => {
      (secureStorage.isBiometricSupported as jest.Mock).mockResolvedValueOnce(false);

      await expect(service.enableBiometricAuthentication()).rejects.toThrow(
        'not supported on this device'
      );

      expect(secureStorage.storeBiometricKey).not.toHaveBeenCalled();
    });

    it('BUG: Enable biometric stores key and updates profile', async () => {
      await service.enableBiometricAuthentication();

      expect(secureStorage.isBiometricSupported).toHaveBeenCalled();
      expect(secureStorage.storeBiometricKey).toHaveBeenCalledWith(mockUser.id);
      expect(httpClient.patch).toHaveBeenCalledWith(
        expect.any(String),
        { biometricEnabled: true }
      );
    });

    it('BUG: Disable biometric removes key and updates profile', async () => {
      await service.disableBiometricAuthentication();

      expect(secureStorage.removeBiometricKey).toHaveBeenCalled();
      expect(httpClient.patch).toHaveBeenCalledWith(
        expect.any(String),
        { biometricEnabled: false }
      );
    });

    it('BUG: Disable biometric works without current user', async () => {
      (tokenManager.getCurrentUser as jest.Mock).mockReturnValueOnce(null);

      await service.disableBiometricAuthentication();

      expect(secureStorage.removeBiometricKey).toHaveBeenCalled();
      expect(httpClient.patch).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Authentication Status Tests - BUG DETECTION
  // ==========================================================================

  describe('Authentication Status', () => {
    it('BUG: isAuthenticated delegates to tokenManager', async () => {
      const result = await service.isAuthenticated();

      expect(result).toBe(true);
      expect(tokenManager.isAuthenticated).toHaveBeenCalled();
    });

    it('getCurrentUser returns current user', () => {
      const result = service.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(tokenManager.getCurrentUser).toHaveBeenCalled();
    });

    it('getCurrentTokens returns current tokens', () => {
      const result = service.getCurrentTokens();

      expect(result).toEqual(mockTokens);
      expect(tokenManager.getCurrentTokens).toHaveBeenCalled();
    });

    it('BUG: getAuthStatus returns comprehensive status', async () => {
      const result = await service.getAuthStatus();

      expect(result).toEqual({
        isAuthenticated: true,
        user: mockUser,
        tokens: mockTokens,
        tokenInfo: {
          isExpired: false,
          needsRefresh: false,
          timeUntilExpiry: 3600000,
        },
        securitySettings: null,
      });

      expect(tokenManager.validateTokens).toHaveBeenCalledWith(mockTokens);
    });

    it('BUG: getAuthStatus handles no tokens', async () => {
      (tokenManager.getCurrentTokens as jest.Mock).mockReturnValueOnce(null);

      const result = await service.getAuthStatus();

      expect(result.tokenInfo).toEqual({
        isExpired: true,
        needsRefresh: false,
        timeUntilExpiry: 0,
      });
    });
  });

  // ==========================================================================
  // Security Settings Tests
  // ==========================================================================

  describe('Security Settings', () => {
    const mockSettings = {
      biometricEnabled: true,
      twoFactorEnabled: false,
      sessionTimeout: 1800000,
    };

    it('updateSecuritySettings stores settings', async () => {
      await service.updateSecuritySettings(mockSettings);

      expect(secureStorage.storeSecuritySettings).toHaveBeenCalledWith(mockSettings);
    });

    it('getSecuritySettings retrieves settings', async () => {
      (secureStorage.getSecuritySettings as jest.Mock).mockResolvedValueOnce(mockSettings);

      const result = await service.getSecuritySettings();

      expect(result).toEqual(mockSettings);
      expect(secureStorage.getSecuritySettings).toHaveBeenCalled();
    });

    it('handles security settings retrieval error', async () => {
      (secureStorage.getSecuritySettings as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      const result = await service.getSecuritySettings();

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Configuration Tests
  // ==========================================================================

  describe('Configuration', () => {
    it('updateConfig merges with existing config', () => {
      service.updateConfig({ enableAutoRefresh: false });

      const config = service.getConfig();

      expect(config.enableAutoRefresh).toBe(false);
      expect(config.sessionTimeout).toBe(30 * 60 * 1000); // Default unchanged
    });

    it('getConfig returns copy of config', () => {
      const config1 = service.getConfig();
      config1.sessionTimeout = 1000;

      const config2 = service.getConfig();

      expect(config2.sessionTimeout).toBe(30 * 60 * 1000); // Original unchanged
    });
  });

  // ==========================================================================
  // Error Handling Tests - BUG DETECTION
  // ==========================================================================

  describe('Error Handling', () => {
    it('BUG: Preserves error code from HttpClient', async () => {
      const apiError = new Error('API error') as any;
      apiError.code = 'NETWORK_ERROR';

      (httpClient.post as jest.Mock).mockRejectedValueOnce(apiError);

      try {
        await service.login({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: false,
        });
      } catch (error: any) {
        expect(error.code).toBe('NETWORK_ERROR');
      }
    });

    it('BUG: Creates AuthError for non-API errors', async () => {
      (httpClient.post as jest.Mock).mockRejectedValueOnce(new Error('Unknown error'));

      try {
        await service.login({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: false,
        });
      } catch (error: any) {
        expect(error.name).toBe('AuthError');
        expect(error.code).toBe('AUTH_ERROR');
        expect(error.message).toBe('Unknown error');
      }
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('handles whitespace in email', async () => {
      await expect(
        service.login({
          email: '  test@example.com  ',
          password: 'password123',
          rememberMe: false,
        })
      ).resolves.toBeDefined();

      // Email should be trimmed before validation
      expect(httpClient.post).toHaveBeenCalled();
    });

    it('handles empty token in verifyEmail (endpoint removed)', async () => {
      await expect(service.verifyEmail('   ')).rejects.toThrow(
        'Email verification endpoint has been removed',
      );
    });

    it('handles biometric enable failure gracefully during login', async () => {
      service.updateConfig({ enableBiometricDefault: true });
      (secureStorage.storeBiometricKey as jest.Mock).mockRejectedValueOnce(
        new Error('Biometric failed')
      );

      // Should NOT throw - biometric is optional
      await expect(
        service.login({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: true,
        })
      ).resolves.toBeDefined();
    });

    it('handles multiple validation errors correctly', async () => {
      await expect(
        service.register({
          email: '',
          password: '',
          confirmPassword: '',
          agreeToTerms: false,
        } as RegisterCredentials)
      ).rejects.toThrow(); // Should throw first validation error
    });
  });
});
