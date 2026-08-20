/**
 * AuthService Tests
 * Comprehensive test coverage for authentication service
 */

// Mock ApiService
const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
jest.mock('../api/ApiService', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock TokenStorageService
const mockStoreTokens = jest.fn();
const mockGetTokens = jest.fn();
const mockRemoveTokens = jest.fn();
const mockStoreBiometricKey = jest.fn();
const mockGetBiometricKey = jest.fn();
const mockRemoveBiometricKey = jest.fn();
jest.mock('../tokenStorage', () => ({
  TokenStorageService: {
    getInstance: () => ({
      storeTokens: (...args: unknown[]) => mockStoreTokens(...args),
      getTokens: (...args: unknown[]) => mockGetTokens(...args),
      removeTokens: (...args: unknown[]) => mockRemoveTokens(...args),
      storeBiometricKey: (...args: unknown[]) => mockStoreBiometricKey(...args),
      getBiometricKey: (...args: unknown[]) => mockGetBiometricKey(...args),
      removeBiometricKey: (...args: unknown[]) => mockRemoveBiometricKey(...args),
      hasTokens: jest.fn(),
    }),
  },
}));

// Mock BiometricAuthService
const mockIsAvailable = jest.fn();
const mockIsBiometricEnabled = jest.fn();
const mockCreateKeys = jest.fn();
const mockAuthenticate = jest.fn();
const mockDisableBiometric = jest.fn();
jest.mock('../biometricAuth', () => ({
  BiometricAuthService: {
    getInstance: () => ({
      isAvailable: (...args: unknown[]) => mockIsAvailable(...args),
      isBiometricEnabled: (...args: unknown[]) => mockIsBiometricEnabled(...args),
      createKeys: (...args: unknown[]) => mockCreateKeys(...args),
      authenticate: (...args: unknown[]) => mockAuthenticate(...args),
      disableBiometric: (...args: unknown[]) => mockDisableBiometric(...args),
    }),
  },
}));

// Mock OAuthService
const mockSignInWithGoogle = jest.fn();
const mockSignInWithApple = jest.fn();
jest.mock('../oauthService', () => ({
  OAuthService: {
    signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
    signInWithApple: (...args: unknown[]) => mockSignInWithApple(...args),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../config/api', () => ({
  endpoints: {
    auth: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      register: '/api/auth/register',
      refresh: '/api/auth/refresh',
      profile: '/api/auth/profile',
      resetPassword: '/api/auth/reset-password',
    },
  },
}));

import authService from '../authService';
import { LoginCredentials, AuthTokens, User, RegisterCredentials, ResetPasswordRequest } from '../../types/auth';

describe('AuthService', () => {
  const mockTokens: AuthTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: Date.now() + 3600000,
    tokenType: 'Bearer' as const,
  };

  const mockUser: User = {
    id: '123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    emailVerified: true,
    biometricEnabled: false,
    twoFactorEnabled: false,
    socialConnections: [],
    createdAt: new Date().toISOString(),
  };

  const mockLoginCredentials: LoginCredentials = {
    email: 'test@example.com',
    password: 'password123',
    rememberMe: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreTokens.mockResolvedValue(undefined);
    mockGetTokens.mockResolvedValue(null);
    mockRemoveTokens.mockResolvedValue(undefined);
    mockStoreBiometricKey.mockResolvedValue(undefined);
    mockGetBiometricKey.mockResolvedValue(null);
    mockRemoveBiometricKey.mockResolvedValue(undefined);
    mockIsBiometricEnabled.mockResolvedValue(false);
    mockDisableBiometric.mockResolvedValue(undefined);
    mockCreateKeys.mockResolvedValue(undefined);
    mockIsAvailable.mockResolvedValue({ available: true, biometryType: 'FaceID' });
    mockAuthenticate.mockResolvedValue({ success: true, signature: 'biometric-signature' });
  });

  describe('saveTokens', () => {
    it('should save tokens to storage and memory', async () => {
      await authService.saveTokens(mockTokens);
      expect(mockStoreTokens).toHaveBeenCalledWith(mockTokens);
      expect(authService.getCurrentTokens()).toEqual(mockTokens);
    });

    it('should throw error if token storage fails', async () => {
      mockStoreTokens.mockRejectedValue(new Error('Storage failed'));
      await expect(authService.saveTokens(mockTokens)).rejects.toThrow('Failed to save authentication tokens');
    });
  });

  describe('getTokens', () => {
    it('should retrieve tokens from storage', async () => {
      mockGetTokens.mockResolvedValue(mockTokens);
      const tokens = await authService.getTokens();
      expect(mockGetTokens).toHaveBeenCalled();
      expect(tokens).toEqual(mockTokens);
    });

    it('should return null if no tokens in storage', async () => {
      mockGetTokens.mockResolvedValue(null);
      const tokens = await authService.getTokens();
      expect(tokens).toBeNull();
    });

    it('should return null if storage retrieval fails', async () => {
      mockGetTokens.mockRejectedValue(new Error('Storage error'));
      const tokens = await authService.getTokens();
      expect(tokens).toBeNull();
    });
  });

  describe('saveUser', () => {
    it('should save user to storage and memory', async () => {
      await authService.saveUser(mockUser);
      expect(mockStoreBiometricKey).toHaveBeenCalledWith(JSON.stringify(mockUser));
      expect(authService.getCurrentUser()).toEqual(mockUser);
    });

    it('should throw error if user storage fails', async () => {
      mockStoreBiometricKey.mockRejectedValue(new Error('Storage failed'));
      await expect(authService.saveUser(mockUser)).rejects.toThrow('Failed to save user data');
    });
  });

  describe('getUser', () => {
    it('should retrieve user from storage', async () => {
      mockGetBiometricKey.mockResolvedValue(JSON.stringify(mockUser));
      const user = await authService.getUser();
      expect(mockGetBiometricKey).toHaveBeenCalled();
      expect(user).toEqual(mockUser);
    });

    it('should return null if no user in storage', async () => {
      mockGetBiometricKey.mockResolvedValue(null);
      const user = await authService.getUser();
      expect(user).toBeNull();
    });

    it('should return null if storage retrieval fails', async () => {
      mockGetBiometricKey.mockRejectedValue(new Error('Storage error'));
      const user = await authService.getUser();
      expect(user).toBeNull();
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      mockApiPost.mockResolvedValue({
        success: true,
        data: { tokens: mockTokens, user: mockUser },
      });
      const tokens = await authService.login(mockLoginCredentials);
      expect(mockApiPost).toHaveBeenCalledWith(
        expect.stringContaining('/login'),
        expect.objectContaining({ email: mockLoginCredentials.email }),
        expect.any(Object)
      );
      expect(tokens).toEqual(mockTokens);
    });

    it('should throw error if email is missing', async () => {
      await expect(authService.login({ ...mockLoginCredentials, email: '' })).rejects.toThrow('Email and password are required');
    });

    it('should throw error if password is missing', async () => {
      await expect(authService.login({ ...mockLoginCredentials, password: '' })).rejects.toThrow('Email and password are required');
    });

    it('should throw error if email format is invalid', async () => {
      await expect(authService.login({ ...mockLoginCredentials, email: 'invalid' })).rejects.toThrow('Invalid email format');
    });

    it('should throw user-friendly error for 401', async () => {
      mockApiPost.mockRejectedValue({ status: 401 });
      await expect(authService.login(mockLoginCredentials)).rejects.toThrow('Invalid email or password');
    });

    it('should throw user-friendly error for 429', async () => {
      mockApiPost.mockRejectedValue({ status: 429 });
      await expect(authService.login(mockLoginCredentials)).rejects.toThrow('Too many login attempts');
    });

    it('should throw user-friendly error for network errors', async () => {
      mockApiPost.mockRejectedValue({ code: 'NETWORK_ERROR' });
      await expect(authService.login(mockLoginCredentials)).rejects.toThrow('Network error');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockApiPost.mockResolvedValue({ success: true });
      await authService.logout();
      expect(mockRemoveTokens).toHaveBeenCalled();
      expect(mockRemoveBiometricKey).toHaveBeenCalled();
      expect(authService.getCurrentTokens()).toBeNull();
    });

    it('should complete logout even if API fails', async () => {
      mockApiPost.mockRejectedValue(new Error('API failed'));
      await authService.logout();
      expect(mockRemoveTokens).toHaveBeenCalled();
    });

    it('should disable biometric if enabled', async () => {
      mockApiPost.mockResolvedValue({ success: true });
      mockIsBiometricEnabled.mockResolvedValue(true);
      await authService.logout();
      expect(mockDisableBiometric).toHaveBeenCalled();
    });
  });

  describe('isAuthenticated', () => {
    it('should return false if no tokens', async () => {
      mockGetTokens.mockResolvedValue(null);
      expect(await authService.isAuthenticated()).toBe(false);
    });

    it('should return true if tokens valid', async () => {
      mockGetTokens.mockResolvedValue(mockTokens);
      mockApiGet.mockResolvedValue({ success: true });
      expect(await authService.isAuthenticated()).toBe(true);
    });

    it('should refresh expired tokens', async () => {
      mockGetTokens.mockResolvedValue({ ...mockTokens, expiresAt: Date.now() - 1000 });
      mockApiPost.mockResolvedValue({ success: true, data: { tokens: mockTokens } });
      expect(await authService.isAuthenticated()).toBe(true);
    });

    it('should return false if refresh fails', async () => {
      mockGetTokens.mockResolvedValue({ ...mockTokens, expiresAt: Date.now() - 1000 });
      mockApiPost.mockRejectedValueOnce(new Error('fail')).mockResolvedValue({ success: true });
      expect(await authService.isAuthenticated()).toBe(false);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens', async () => {
      mockGetTokens.mockResolvedValue(mockTokens);
      mockApiPost.mockResolvedValue({ success: true, data: { tokens: mockTokens } });
      const tokens = await authService.refreshTokens();
      expect(tokens).toEqual(mockTokens);
    });

    it('should return null if no refresh token', async () => {
      mockGetTokens.mockResolvedValue({ ...mockTokens, refreshToken: '' });
      expect(await authService.refreshTokens()).toBeNull();
    });
  });

  describe('register', () => {
    const mockRegisterData: RegisterCredentials = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
    };

    it('should register successfully', async () => {
      mockApiPost.mockResolvedValue({ success: true, data: { tokens: mockTokens, user: mockUser } });
      const tokens = await authService.register(mockRegisterData);
      expect(tokens).toEqual(mockTokens);
    });

    it('should throw for 409 (email exists)', async () => {
      mockApiPost.mockRejectedValue({ status: 409 });
      await expect(authService.register(mockRegisterData)).rejects.toThrow('already exists');
    });

    it('should throw for 422 (validation)', async () => {
      mockApiPost.mockRejectedValue({ status: 422 });
      await expect(authService.register(mockRegisterData)).rejects.toThrow('check your input');
    });
  });

  describe('resetPassword', () => {
    const mockResetRequest: ResetPasswordRequest = {
      token: 'reset-token',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    };

    it('should reset password', async () => {
      mockApiPost.mockResolvedValue({ success: true });
      await authService.resetPassword(mockResetRequest);
      expect(mockApiPost).toHaveBeenCalledWith(expect.stringContaining('/reset-password'), mockResetRequest, expect.any(Object));
    });

    it('should throw for 404 (invalid token)', async () => {
      mockApiPost.mockRejectedValue({ status: 404 });
      await expect(authService.resetPassword(mockResetRequest)).rejects.toThrow('Invalid or expired');
    });
  });

  describe('OAuth - Google', () => {
    it('should login with Google', async () => {
      mockSignInWithGoogle.mockResolvedValue({
        user: { id: '123', email: 'test@gmail.com', name: 'Test', photo: '' },
        tokens: { idToken: 'google-token', expiresAt: Date.now() + 3600000 },
      });
      const tokens = await authService.loginWithGoogle();
      expect(tokens.accessToken).toBe('google-token');
    });

    it('should throw if Google fails', async () => {
      mockSignInWithGoogle.mockResolvedValue(null);
      await expect(authService.loginWithGoogle()).rejects.toThrow('Google login failed');
    });
  });

  describe('OAuth - Apple', () => {
    it('should login with Apple', async () => {
      mockSignInWithApple.mockResolvedValue({
        user: { id: '123', email: 'test@apple.com', name: 'Test' },
        tokens: { idToken: 'apple-token', expiresAt: Date.now() + 3600000 },
      });
      const tokens = await authService.loginWithApple();
      expect(tokens.accessToken).toBe('apple-token');
    });

    it('should throw if Apple fails', async () => {
      mockSignInWithApple.mockResolvedValue(null);
      await expect(authService.loginWithApple()).rejects.toThrow('Apple login failed');
    });
  });

  describe('Biometric Authentication', () => {
    it('should enable biometric auth', async () => {
      const result = await authService.enableBiometricAuth();
      expect(mockCreateKeys).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should return error if enable fails', async () => {
      mockCreateKeys.mockRejectedValue(new Error('not supported'));
      const result = await authService.enableBiometricAuth();
      expect(result.success).toBe(false);
    });

    it('should authenticate with biometric', async () => {
      mockIsBiometricEnabled.mockResolvedValue(true);
      const result = await authService.authenticateWithBiometric();
      expect(result.success).toBe(true);
    });

    it('should fail if biometric not enabled', async () => {
      mockIsBiometricEnabled.mockResolvedValue(false);
      const result = await authService.authenticateWithBiometric();
      expect(result.success).toBe(false);
    });

    it('should check biometric availability', async () => {
      const result = await authService.isBiometricAvailable();
      expect(result.available).toBe(true);
    });
  });

  describe('initializeAuth', () => {
    it('should initialize auth state', async () => {
      mockGetTokens.mockResolvedValue(mockTokens);
      mockGetBiometricKey.mockResolvedValue(JSON.stringify(mockUser));
      await authService.initializeAuth();
      expect(mockGetTokens).toHaveBeenCalled();
      expect(authService.getCurrentTokens()).toEqual(mockTokens);
    });

    it('should handle errors gracefully', async () => {
      mockGetTokens.mockRejectedValue(new Error('Init failed'));
      await expect(authService.initializeAuth()).resolves.not.toThrow();
    });
  });
});
