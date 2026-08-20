/**
 * AuthService Integration Tests
 *
 * Tests authentication functionality with mocked external dependencies.
 * Executes REAL AuthService business logic with mocked HttpClient.
 *
 * Coverage Target: 80-90% of AuthService.ts (637 LOC)
 * Test Philosophy: Coverage > Pass Rate (mock only external I/O)
 *
 * Note: MSW v2 in Node.js doesn't intercept axios, so we mock httpClient directly.
 */

import { authService, AuthService } from '../../services/api/AuthService';
import type { LoginCredentials, RegisterCredentials, SocialProvider } from '../../types/auth';

// Mock dependencies
jest.mock('../../services/auth/TokenManager');
jest.mock('../../services/storage/SecureStorage');
jest.mock('../../utils/logger');
jest.mock('../../services/api/HttpClient');

// Import mocked modules
import { tokenManager } from '../../services/auth/TokenManager';
import { _secureStorage as secureStorage } from '../../services/storage/SecureStorage';
import { httpClient } from '../../services/api/HttpClient';

// Mock data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  emailVerified: true,
  biometricEnabled: false,
  twoFactorEnabled: false,
  socialConnections: [],
  createdAt: '2024-01-01T00:00:00Z',
  lastLoginAt: '2025-01-01T00:00:00Z',
};

const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresAt: Date.now() + 3600000,
  tokenType: 'Bearer' as const,
};

describe('AuthService - Integration Tests', () => {
  let service: AuthService;

  beforeEach(() => {
    // Reset service instance
    service = AuthService.getInstance();

    // Reset mocks
    jest.clearAllMocks();

    // Setup tokenManager mock defaults
    (tokenManager.setTokens as jest.Mock).mockResolvedValue(undefined);
    (tokenManager.clearAuthData as jest.Mock).mockResolvedValue(undefined);
    (tokenManager.refreshTokens as jest.Mock).mockResolvedValue({
      success: true,
      tokens: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      },
    });
    (tokenManager.updateUser as jest.Mock).mockResolvedValue(undefined);
    (tokenManager.isAuthenticated as jest.Mock).mockResolvedValue(true);
    (tokenManager.getCurrentUser as jest.Mock).mockReturnValue(mockUser);
    (tokenManager.getCurrentTokens as jest.Mock).mockReturnValue(mockTokens);
    (tokenManager.validateTokens as jest.Mock).mockReturnValue({
      isExpired: false,
      needsRefresh: false,
      timeUntilExpiry: 3600000,
    });

    // Setup secureStorage mock defaults
    (secureStorage.isBiometricSupported as jest.Mock).mockResolvedValue(true);
    (secureStorage.storeBiometricKey as jest.Mock).mockResolvedValue(undefined);
    (secureStorage.removeBiometricKey as jest.Mock).mockResolvedValue(undefined);
    (secureStorage.storeSecuritySettings as jest.Mock).mockResolvedValue(undefined);
    (secureStorage.getSecuritySettings as jest.Mock).mockResolvedValue({
      biometricEnabled: false,
      twoFactorEnabled: false,
      autoLockTimeout: 300000,
    });

    // Setup httpClient mock defaults (replace MSW handlers since MSW v2 doesn't intercept axios)
    (httpClient.post as jest.Mock).mockImplementation(async (url: string, data?: any) => {
      // Login
      if (url.includes('/auth/login')) {
        const credentials = data as LoginCredentials;
        if (credentials.password === 'wrongpassword') {
          return {
            success: false,
            error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
          };
        }
        return {
          success: true,
          data: { user: mockUser, tokens: mockTokens },
        };
      }

      // Register
      if (url.includes('/auth/register')) {
        const credentials = data as any;
        if (credentials.email === 'existing@test.com') {
          return {
            success: false,
            error: { message: 'Email already registered', code: 'EMAIL_EXISTS' },
          };
        }
        return {
          success: true,
          data: { user: { ...mockUser, email: credentials.email }, tokens: mockTokens },
        };
      }

      // Social login
      if (url.includes('/socialauth/authenticate')) {
        if (data.token === 'invalid-token') {
          return {
            success: false,
            error: { message: 'Invalid social token', code: 'INVALID_TOKEN' },
          };
        }
        return {
          success: true,
          data: { user: { ...mockUser, socialConnections: [data.provider] }, tokens: mockTokens },
        };
      }

      // Logout
      if (url.includes('/auth/logout')) {
        return { success: true };
      }

      // Forgot password
      if (url.includes('/forgot-password')) {
        if (data.email === 'notfound@test.com') {
          return {
            success: false,
            error: { message: 'User not found', code: 'USER_NOT_FOUND' },
          };
        }
        return { success: true };
      }

      // Reset password
      if (url.includes('/reset-password')) {
        if (data.token === 'invalid-token') {
          return {
            success: false,
            error: { message: 'Invalid reset token', code: 'INVALID_TOKEN' },
          };
        }
        return { success: true };
      }

      // Verify email
      if (url.includes('/verify-email')) {
        if (data.token === 'invalid-token') {
          return {
            success: false,
            error: { message: 'Invalid verification token', code: 'INVALID_TOKEN' },
          };
        }
        return { success: true };
      }

      return { success: true };
    });

    (httpClient.get as jest.Mock).mockImplementation(async (url: string) => {
      // Get profile
      if (url.includes('/auth/profile')) {
        return { success: true, data: mockUser };
      }
      return { success: true, data: {} };
    });

    (httpClient.patch as jest.Mock).mockImplementation(async (url: string, data?: any) => {
      // Update profile
      if (url.includes('/auth/profile') || url.includes('/updateProfile')) {
        return { success: true, data: { ...mockUser, ...data } };
      }
      return { success: true, data: {} };
    });
  });

  describe('login()', () => {
    it('should successfully login with valid credentials', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await service.login(credentials);

      expect(response.user).toEqual(mockUser);
      expect(response.tokens).toEqual(mockTokens);
      expect(tokenManager.setTokens).toHaveBeenCalledWith(mockTokens, mockUser);
    });

    it('should handle invalid credentials', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      await expect(service.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    it('should validate email format', async () => {
      const credentials: LoginCredentials = {
        email: 'invalid-email',
        password: 'password123',
      };

      await expect(service.login(credentials)).rejects.toThrow('Invalid email format');
    });

    it('should validate email is required', async () => {
      const credentials: LoginCredentials = {
        email: '',
        password: 'password123',
      };

      await expect(service.login(credentials)).rejects.toThrow('Email is required');
    });

    it('should validate password is required', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: '',
      };

      await expect(service.login(credentials)).rejects.toThrow('Password is required');
    });

    it('should handle network errors', async () => {
      (httpClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      await expect(service.login(credentials)).rejects.toThrow();
    });
  });

  describe('register()', () => {
    it('should successfully register new user', async () => {
      const credentials: RegisterCredentials = {
        email: 'newuser@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        username: 'newuser',
        agreeToTerms: true,
      };

      const response = await service.register(credentials);

      expect(response.user.email).toBe('newuser@example.com');
      expect(response.tokens).toEqual(mockTokens);
      expect(tokenManager.setTokens).toHaveBeenCalledWith(
        mockTokens,
        expect.objectContaining({ email: 'newuser@example.com' })
      );
    });

    it('should handle existing email', async () => {
      const credentials: RegisterCredentials = {
        email: 'existing@test.com',
        password: 'password123',
        confirmPassword: 'password123',
        username: 'testuser',
        agreeToTerms: true,
      };

      await expect(service.register(credentials)).rejects.toThrow('Email already registered');
    });

    it('should validate password match', async () => {
      const credentials: RegisterCredentials = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'different',
        username: 'testuser',
        agreeToTerms: true,
      };

      await expect(service.register(credentials)).rejects.toThrow('Passwords do not match');
    });

    it('should validate password length', async () => {
      const credentials: RegisterCredentials = {
        email: 'test@example.com',
        password: 'short',
        confirmPassword: 'short',
        username: 'testuser',
        agreeToTerms: true,
      };

      await expect(service.register(credentials)).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });

    it('should validate terms agreement', async () => {
      const credentials: RegisterCredentials = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        username: 'testuser',
        agreeToTerms: false,
      };

      await expect(service.register(credentials)).rejects.toThrow(
        'You must agree to the terms and conditions'
      );
    });

    it('should validate email format', async () => {
      const credentials: RegisterCredentials = {
        email: 'invalid-email',
        password: 'password123',
        confirmPassword: 'password123',
        username: 'testuser',
        agreeToTerms: true,
      };

      await expect(service.register(credentials)).rejects.toThrow('Invalid email format');
    });

    it('should handle network errors', async () => {
      (httpClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const credentials: RegisterCredentials = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        username: 'testuser',
        agreeToTerms: true,
      };

      await expect(service.register(credentials)).rejects.toThrow();
    });
  });

  describe('socialLogin()', () => {
    it('should successfully login with Google', async () => {
      const response = await service.socialLogin('google' as SocialProvider, 'google-token', {
        id: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(response.user).toBeDefined();
      expect(response.tokens).toEqual(mockTokens);
      expect(tokenManager.setTokens).toHaveBeenCalled();
    });

    it('should successfully login with Apple', async () => {
      const response = await service.socialLogin('apple' as SocialProvider, 'apple-token', {
        id: 'apple-123',
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(response.user).toBeDefined();
      expect(response.tokens).toEqual(mockTokens);
      expect(tokenManager.setTokens).toHaveBeenCalled();
    });

    it('should handle invalid social token', async () => {
      await expect(
        service.socialLogin('google' as SocialProvider, 'invalid-token')
      ).rejects.toThrow('Invalid social token');
    });

    it('should handle network errors', async () => {
      (httpClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        service.socialLogin('google' as SocialProvider, 'google-token')
      ).rejects.toThrow();
    });
  });

  describe('logout()', () => {
    it('should successfully logout', async () => {
      await service.logout();

      expect(tokenManager.clearAuthData).toHaveBeenCalled();
    });

    it('should clear local data even if API fails', async () => {
      (httpClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await service.logout();

      expect(tokenManager.clearAuthData).toHaveBeenCalled();
    });

    it('should clear local data on server error', async () => {
      (httpClient.post as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: { message: 'Server error', code: 'SERVER_ERROR' },
      });

      await service.logout();

      expect(tokenManager.clearAuthData).toHaveBeenCalled();
    });
  });

  describe('refreshToken()', () => {
    it('should successfully refresh tokens', async () => {
      const response = await service.refreshToken();

      expect(response.accessToken).toBe('new-access-token');
      expect(tokenManager.refreshTokens).toHaveBeenCalled();
    });

    it('should handle expired refresh token', async () => {
      (tokenManager.refreshTokens as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Refresh token expired',
      });

      await expect(service.refreshToken()).rejects.toThrow('Refresh token expired');
    });

    it('should handle network errors', async () => {
      (tokenManager.refreshTokens as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(service.refreshToken()).rejects.toThrow('Network error');
    });
  });

  describe('getUserProfile()', () => {
    it('should successfully get user profile', async () => {
      const response = await service.getUserProfile();

      expect(response).toEqual(mockUser);
      expect(tokenManager.updateUser).toHaveBeenCalledWith(mockUser);
    });

    it('should handle unauthorized error', async () => {
      (httpClient.get as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
      });

      await expect(service.getUserProfile()).rejects.toThrow('Unauthorized');
    });

    it('should handle network errors', async () => {
      (httpClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getUserProfile()).rejects.toThrow();
    });
  });

  describe('updateUserProfile()', () => {
    it('should successfully update user profile', async () => {
      const updates = { firstName: 'Updated', lastName: 'Name' };
      const response = await service.updateUserProfile(updates);

      expect(response).toMatchObject({ firstName: 'Updated', lastName: 'Name' });
      expect(tokenManager.updateUser).toHaveBeenCalled();
    });

    it('should handle unauthorized error', async () => {
      (httpClient.patch as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
      });

      await expect(service.updateUserProfile({ firstName: 'Test' })).rejects.toThrow(
        'Unauthorized'
      );
    });

    it('should handle network errors', async () => {
      (httpClient.patch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.updateUserProfile({ firstName: 'Test' })).rejects.toThrow();
    });
  });

  describe('forgotPassword()', () => {
    it('should successfully send reset email', async () => {
      await service.forgotPassword({ email: 'test@example.com' });

      // Should not throw
    });

    it('should handle user not found', async () => {
      await expect(service.forgotPassword({ email: 'notfound@test.com' })).rejects.toThrow(
        'User not found'
      );
    });

    it('should validate email format', async () => {
      await expect(service.forgotPassword({ email: 'invalid-email' })).rejects.toThrow(
        'Invalid email format'
      );
    });

    it('should handle network errors', async () => {
      (httpClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.forgotPassword({ email: 'test@example.com' })).rejects.toThrow();
    });
  });

  describe('resetPassword()', () => {
    it('should successfully reset password', async () => {
      await service.resetPassword({
        token: 'valid-token',
        newPassword: 'newpassword123',
      });

      // Should not throw
    });

    it('should handle invalid reset token', async () => {
      await expect(
        service.resetPassword({
          token: 'invalid-token',
          newPassword: 'newpassword123',
        })
      ).rejects.toThrow('Invalid reset token');
    });

    it('should validate password length', async () => {
      await expect(
        service.resetPassword({
          token: 'valid-token',
          newPassword: 'short',
        })
      ).rejects.toThrow('Password must be at least 8 characters long');
    });

    it('should handle network errors', async () => {
      (httpClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        service.resetPassword({
          token: 'valid-token',
          newPassword: 'newpassword123',
        })
      ).rejects.toThrow();
    });
  });

  describe('verifyEmail() (M6: endpoint removed)', () => {
    it('always rejects with endpoint-removed message', async () => {
      await expect(service.verifyEmail('valid-token')).rejects.toThrow(
        'Email verification endpoint has been removed',
      );
    });

    it('rejects for invalid token too', async () => {
      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        'Email verification endpoint has been removed',
      );
    });

    it('rejects for empty token', async () => {
      await expect(service.verifyEmail('')).rejects.toThrow(
        'Email verification endpoint has been removed',
      );
    });

    it('never calls httpClient.post', async () => {
      await expect(service.verifyEmail('valid-token')).rejects.toThrow();
      expect(httpClient.post).not.toHaveBeenCalled();
    });
  });

  describe('isAuthenticated()', () => {
    it('should return true when authenticated', async () => {
      (tokenManager.isAuthenticated as jest.Mock).mockResolvedValue(true);

      const result = await service.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when not authenticated', async () => {
      (tokenManager.isAuthenticated as jest.Mock).mockResolvedValue(false);

      const result = await service.isAuthenticated();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (tokenManager.isAuthenticated as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await service.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('getCurrentUser()', () => {
    it('should return current user when available', () => {
      (tokenManager.getCurrentUser as jest.Mock).mockReturnValue(mockUser);

      const result = service.getCurrentUser();

      expect(result).toEqual(mockUser);
    });

    it('should return null when no user', () => {
      (tokenManager.getCurrentUser as jest.Mock).mockReturnValue(null);

      const result = service.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('getCurrentTokens()', () => {
    it('should return current tokens when available', () => {
      (tokenManager.getCurrentTokens as jest.Mock).mockReturnValue(mockTokens);

      const result = service.getCurrentTokens();

      expect(result).toEqual(mockTokens);
    });

    it('should return null when no tokens', () => {
      (tokenManager.getCurrentTokens as jest.Mock).mockReturnValue(null);

      const result = service.getCurrentTokens();

      expect(result).toBeNull();
    });
  });

  describe('enableBiometricAuthentication()', () => {
    it('should successfully enable biometric auth', async () => {
      (tokenManager.getCurrentUser as jest.Mock).mockReturnValue(mockUser);

      await service.enableBiometricAuthentication();

      expect(secureStorage.isBiometricSupported).toHaveBeenCalled();
      expect(secureStorage.storeBiometricKey).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw error when not supported', async () => {
      (secureStorage.isBiometricSupported as jest.Mock).mockResolvedValue(false);

      await expect(service.enableBiometricAuthentication()).rejects.toThrow(
        'Biometric authentication is not supported on this device'
      );
    });

    it('should throw error when not logged in', async () => {
      (tokenManager.getCurrentUser as jest.Mock).mockReturnValue(null);

      await expect(service.enableBiometricAuthentication()).rejects.toThrow(
        'User must be logged in to enable biometric authentication'
      );
    });
  });

  describe('disableBiometricAuthentication()', () => {
    it('should successfully disable biometric auth', async () => {
      (tokenManager.getCurrentUser as jest.Mock).mockReturnValue(mockUser);

      await service.disableBiometricAuthentication();

      expect(secureStorage.removeBiometricKey).toHaveBeenCalled();
    });

    it('should handle when user is not logged in', async () => {
      (tokenManager.getCurrentUser as jest.Mock).mockReturnValue(null);

      await service.disableBiometricAuthentication();

      expect(secureStorage.removeBiometricKey).toHaveBeenCalled();
    });
  });

  describe('getSecuritySettings()', () => {
    it('should return security settings', async () => {
      const mockSettings = {
        biometricEnabled: false,
        twoFactorEnabled: false,
        autoLockTimeout: 300000,
      };
      (secureStorage.getSecuritySettings as jest.Mock).mockResolvedValue(mockSettings);

      const result = await service.getSecuritySettings();

      expect(result).toEqual(mockSettings);
    });

    it('should return null on error', async () => {
      (secureStorage.getSecuritySettings as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const result = await service.getSecuritySettings();

      expect(result).toBeNull();
    });
  });

  describe('updateSecuritySettings()', () => {
    it('should successfully update security settings', async () => {
      const settings = {
        biometricEnabled: true,
        twoFactorEnabled: false,
        autoLockTimeout: 600000,
      };

      await service.updateSecuritySettings(settings);

      expect(secureStorage.storeSecuritySettings).toHaveBeenCalledWith(settings);
    });

    it('should handle storage errors', async () => {
      (secureStorage.storeSecuritySettings as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      await expect(
        service.updateSecuritySettings({
          biometricEnabled: true,
          twoFactorEnabled: false,
          autoLockTimeout: 600000,
        })
      ).rejects.toThrow('Failed to update security settings');
    });
  });

  describe('getAuthStatus()', () => {
    it('should return complete auth status', async () => {
      (tokenManager.isAuthenticated as jest.Mock).mockResolvedValue(true);
      (tokenManager.getCurrentUser as jest.Mock).mockReturnValue(mockUser);
      (tokenManager.getCurrentTokens as jest.Mock).mockReturnValue(mockTokens);
      (tokenManager.validateTokens as jest.Mock).mockReturnValue({
        isExpired: false,
        needsRefresh: false,
        timeUntilExpiry: 3600000,
      });

      const status = await service.getAuthStatus();

      expect(status.isAuthenticated).toBe(true);
      expect(status.user).toEqual(mockUser);
      expect(status.tokens).toEqual(mockTokens);
      expect(status.tokenInfo.isExpired).toBe(false);
      expect(status.tokenInfo.needsRefresh).toBe(false);
    });

    it('should handle unauthenticated state', async () => {
      (tokenManager.isAuthenticated as jest.Mock).mockResolvedValue(false);
      (tokenManager.getCurrentUser as jest.Mock).mockReturnValue(null);
      (tokenManager.getCurrentTokens as jest.Mock).mockReturnValue(null);

      const status = await service.getAuthStatus();

      expect(status.isAuthenticated).toBe(false);
      expect(status.user).toBeNull();
      expect(status.tokens).toBeNull();
    });
  });

  describe('Configuration', () => {
    it('should allow updating configuration', () => {
      service.updateConfig({
        enableAutoRefresh: false,
        sessionTimeout: 60000,
      });

      const config = service.getConfig();

      expect(config.enableAutoRefresh).toBe(false);
      expect(config.sessionTimeout).toBe(60000);
    });

    it('should return current configuration', () => {
      const config = service.getConfig();

      expect(config).toHaveProperty('enableAutoRefresh');
      expect(config).toHaveProperty('enableBiometricDefault');
      expect(config).toHaveProperty('sessionTimeout');
      expect(config).toHaveProperty('maxRetryAttempts');
    });
  });
});
