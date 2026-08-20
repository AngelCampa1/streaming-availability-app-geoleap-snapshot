import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api/AuthService';
import { tokenManager } from '../../services/auth/TokenManager';
import { secureStorage } from '../../services/storage/SecureStorage';
import { biometricAuth } from '../../services/biometricAuth';
import { oauthService } from '../../services/oauthService';
import { LoginCredentials, RegisterCredentials, User, AuthTokens } from '../../types/auth';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    request: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

// Mock dependencies - mock the actual modules that AuthContext imports
jest.mock('../../services/api/AuthService', () => ({
  authService: {
    // Async methods
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getUserProfile: jest.fn(),
    socialLogin: jest.fn(),
    updateUserProfile: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    verifyEmail: jest.fn(),
    isAuthenticated: jest.fn(),
    updateSecuritySettings: jest.fn(),
    getSecuritySettings: jest.fn(),
    enableBiometricAuthentication: jest.fn(),
    disableBiometricAuthentication: jest.fn(),
    refreshToken: jest.fn(),
    getAuthStatus: jest.fn(),

    // Sync methods
    getCurrentUser: jest.fn(),
    getCurrentTokens: jest.fn(),
    updateConfig: jest.fn(),
    getConfig: jest.fn(),
  },
}));

jest.mock('../../services/auth/TokenManager', () => ({
  tokenManager: {
    getTokens: jest.fn(),
    setTokens: jest.fn(),
    clearTokens: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

jest.mock('../../services/storage/SecureStorage', () => ({
  secureStorage: {
    getTokens: jest.fn(),
    storeTokens: jest.fn(),
    removeTokens: jest.fn(),
    isBiometricSupported: jest.fn(),
  },
}));

jest.mock('../../services/biometricAuth', () => ({
  biometricAuth: {
    isAvailable: jest.fn(),
    authenticate: jest.fn(),
    isBiometricEnabled: jest.fn(),
    enableBiometric: jest.fn(),
    disableBiometric: jest.fn(),
  },
}));

jest.mock('../../services/oauthService', () => ({
  oauthService: {
    signInWithGoogle: jest.fn(),
    signOutAll: jest.fn(),
  },
}));

// The services are already imported at the top of the file
// and are properly mocked via jest.mock() above

const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  emailVerified: true,
  biometricEnabled: false,
  twoFactorEnabled: false,
  socialConnections: [],
  createdAt: '2023-01-01T00:00:00Z',
};

const mockTokens: AuthTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: Date.now() + 3600000,
  tokenType: 'Bearer',
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations using the imported mocked services
    (biometricAuth.isAvailable as jest.Mock).mockResolvedValue({
      available: true,
      biometryType: 'TouchID',
    });

    // Mock token manager
    (tokenManager.getTokens as jest.Mock).mockResolvedValue(null);
    (tokenManager.setTokens as jest.Mock).mockResolvedValue(undefined);
    (tokenManager.clearTokens as jest.Mock).mockResolvedValue(undefined);
    (tokenManager.getCurrentUser as jest.Mock).mockResolvedValue(null);

    // Mock secure storage
    (secureStorage.getTokens as jest.Mock).mockResolvedValue(null);
    (secureStorage.storeTokens as jest.Mock).mockResolvedValue(undefined);
    (secureStorage.removeTokens as jest.Mock).mockResolvedValue(undefined);
    (secureStorage.isBiometricSupported as jest.Mock).mockResolvedValue(true);

    // Mock auth service
    (authService.isAuthenticated as jest.Mock).mockResolvedValue(false);
    (authService.getCurrentUser as jest.Mock).mockReturnValue(null);
    (authService.getCurrentTokens as jest.Mock).mockReturnValue(null);
    (authService.login as jest.Mock).mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });
    (authService.register as jest.Mock).mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });
    (authService.logout as jest.Mock).mockResolvedValue(undefined);
    (authService.getUserProfile as jest.Mock).mockResolvedValue(mockUser);
    (authService.socialLogin as jest.Mock).mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });
    (authService.updateUserProfile as jest.Mock).mockResolvedValue({
      ...mockUser,
      biometricEnabled: true,
    });
    (authService.enableBiometricAuthentication as jest.Mock).mockResolvedValue(undefined);
    (authService.disableBiometricAuthentication as jest.Mock).mockResolvedValue(undefined);

    // Mock oauth service
    (oauthService.signInWithGoogle as jest.Mock).mockResolvedValue({
      success: true,
      provider: 'google' as const,
      token: 'google-token',
      userInfo: {
        id: 'google-id',
        email: 'test@gmail.com',
        name: 'Test User',
      },
    });
    (oauthService.signOutAll as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Initialization', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.state.isLoading).toBe(true);
      expect(result.current.state.isAuthenticated).toBe(false);
      expect(result.current.state.user).toBeNull();
    });

    it('should check biometric availability on init', async () => {
      renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(biometricAuth.isAvailable).toHaveBeenCalled();
    });

    it('should restore user session if tokens exist', async () => {
      // Mock the authService methods that AuthContext actually uses
      (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
      (authService.getCurrentUser as jest.Mock).mockReturnValue(mockUser);
      (authService.getCurrentTokens as jest.Mock).mockReturnValue(mockTokens);
      (authService.getUserProfile as jest.Mock).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.state.isAuthenticated).toBe(true);
      expect(result.current.state.user).toEqual(mockUser);
      expect(result.current.state.isLoading).toBe(false);
    });
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      };

      (authService.login as jest.Mock).mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(authService.login).toHaveBeenCalledWith(credentials);
      expect(result.current.state.isAuthenticated).toBe(true);
      expect(result.current.state.user).toEqual(mockUser);
      expect(result.current.state.error).toBeNull();
    });

    it('should handle login failure', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const error = new Error('Invalid credentials');
      (authService.login as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.login(credentials);
        } catch (error) {
          // Expected error for invalid credentials
        }
      });

      expect(result.current.state.isAuthenticated).toBe(false);
      expect(result.current.state.error).toBe('Invalid credentials');
    });
  });

  describe('Biometric Login', () => {
    it('should login with biometric successfully', async () => {
      (biometricAuth.isBiometricEnabled as jest.Mock).mockResolvedValue(true);
      (biometricAuth.authenticate as jest.Mock).mockResolvedValue({ success: true });
      (secureStorage.getTokens as jest.Mock).mockResolvedValue(mockTokens);
      (tokenManager.setTokens as jest.Mock).mockResolvedValue(undefined);
      (authService.getUserProfile as jest.Mock).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.loginWithBiometric();
      });

      expect(biometricAuth.authenticate).toHaveBeenCalled();
      expect(result.current.state.isAuthenticated).toBe(true);
    });

    it('should fail if biometric is not enabled', async () => {
      (biometricAuth.isBiometricEnabled as jest.Mock).mockResolvedValue(false);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.loginWithBiometric();
        } catch (error) {
          // Expected error for biometric not enabled
        }
      });

      expect(result.current.state.error).toBe('Biometric authentication is not enabled');
    });
  });

  describe('Social Login', () => {
    it('should throw error for unimplemented OAuth', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.loginWithSocial('google');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('OAuth integration for google is not yet implemented. Please use email/password login.');
        }
      });

      expect(result.current.state.error).toBe('OAuth integration for google is not yet implemented. Please use email/password login.');
    });
  });

  describe('Registration', () => {
    it('should register successfully', async () => {
      const credentials: RegisterCredentials = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        firstName: 'Test',
        lastName: 'User',
        agreeToTerms: true,
      };

      (authService.register as jest.Mock).mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register(credentials);
      });

      expect(authService.register).toHaveBeenCalledWith(credentials);
      expect(result.current.state.isAuthenticated).toBe(true);
      expect(result.current.state.user).toEqual(mockUser);
    });
  });

  describe('Logout', () => {
    it('should logout successfully', async () => {
      // First login
      (authService.login as jest.Mock).mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      // Then logout
      await act(async () => {
        await result.current.logout();
      });

      expect(authService.logout).toHaveBeenCalled();
      expect(result.current.state.isAuthenticated).toBe(false);
      expect(result.current.state.user).toBeNull();
    });
  });

  describe('Biometric Management', () => {
    it('should enable biometric authentication', async () => {
      (authService.enableBiometricAuthentication as jest.Mock).mockResolvedValue(undefined);
      (authService.updateUserProfile as jest.Mock).mockResolvedValue({
        ...mockUser,
        biometricEnabled: true,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // First, we need to simulate a logged-in user state
      // We do this by mocking the initial authentication flow
      (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
      (authService.getCurrentUser as jest.Mock).mockReturnValue(mockUser);
      (authService.getCurrentTokens as jest.Mock).mockReturnValue(mockTokens);

      // Initialize the auth context with the logged-in user
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Now enable biometric authentication
      await act(async () => {
        await result.current.enableBiometric();
      });

      expect(authService.enableBiometricAuthentication).toHaveBeenCalled();
      expect(authService.updateUserProfile).toHaveBeenCalledWith({
        biometricEnabled: true,
      });
    });

    it('should disable biometric authentication', async () => {
      (authService.disableBiometricAuthentication as jest.Mock).mockResolvedValue(undefined);
      (authService.updateUserProfile as jest.Mock).mockResolvedValue({
        ...mockUser,
        biometricEnabled: false,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Mock a logged in user for this test too
      (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
      (authService.getCurrentUser as jest.Mock).mockReturnValue(mockUser);
      (authService.getCurrentTokens as jest.Mock).mockReturnValue(mockTokens);

      // Initialize the auth context with the logged-in user
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.disableBiometric();
      });

      expect(authService.disableBiometricAuthentication).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should clear errors', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.state.error).toBeNull();
    });
  });
});
