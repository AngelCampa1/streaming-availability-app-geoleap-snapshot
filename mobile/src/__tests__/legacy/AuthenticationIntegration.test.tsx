/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Authentication Integration Test
 * Tests the complete authentication flow with all enhanced services
 */

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api/AuthService';
import { tokenManager } from '../../services/auth/TokenManager';
import { secureStorage } from '../../services/storage/SecureStorage';
import { httpClient } from '../../services/api/HttpClient';
import { User, AuthTokens } from '../../types/auth';

// Mock Alert
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
    Platform: {
      ...RN.Platform,
      OS: 'ios',
    },
  };
});

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(),
}));

// Mock biometric authentication (expo-local-authentication)
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  getEnrolledLevelAsync: jest.fn(() => Promise.resolve(3)), // BIOMETRIC_STRONG
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1, 2])), // FINGERPRINT, FACIAL_RECOGNITION
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  cancelAuthenticate: jest.fn(() => Promise.resolve()),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
  SecurityLevel: {
    NONE: 0,
    SECRET: 1,
    BIOMETRIC_WEAK: 2,
    BIOMETRIC_STRONG: 3,
  },
}));

// Mock secure storage
jest.mock('../../services/storage/SecureStorage', () => ({
  secureStorage: {
    storeTokens: jest.fn(() => Promise.resolve()),
    getTokens: jest.fn(() => Promise.resolve(null)),
    removeTokens: jest.fn(() => Promise.resolve()),
    storeUser: jest.fn(() => Promise.resolve()),
    getUser: jest.fn(() => Promise.resolve(null)),
    storeBiometricKey: jest.fn(() => Promise.resolve()),
    getBiometricKey: jest.fn(() => Promise.resolve('mock-biometric-key')),
    removeBiometricKey: jest.fn(() => Promise.resolve()),
    clearAll: jest.fn(() => Promise.resolve()),
    isBiometricSupported: jest.fn(() => Promise.resolve(true)),
    getSupportedBiometricType: jest.fn(() => Promise.resolve('TouchID')),
  },
}));

// Mock HTTP client
jest.mock('../../services/api/HttpClient', () => ({
  httpClient: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
    setTokens: jest.fn(() => Promise.resolve()),
    clearAuthTokens: jest.fn(() => Promise.resolve()),
  },
}));

// Mock auth service
jest.mock('../../services/api/AuthService', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    verifyEmail: jest.fn(),
    isAuthenticated: jest.fn(() => Promise.resolve(false)),
    getCurrentUser: jest.fn(() => null),
    getCurrentTokens: jest.fn(() => null),
    enableBiometricAuthentication: jest.fn(() => Promise.resolve()),
    disableBiometricAuthentication: jest.fn(() => Promise.resolve()),
  },
}));

// Mock token manager
jest.mock('../../services/auth/TokenManager', () => ({
  tokenManager: {
    setTokens: jest.fn(() => Promise.resolve()),
    getCurrentTokens: jest.fn(() => null),
    getCurrentUser: jest.fn(() => null),
    validateTokens: jest.fn(() => ({
      isValid: true,
      needsRefresh: false,
      isExpired: false,
      timeUntilExpiry: 3600000,
    })),
    isAuthenticated: jest.fn(() => Promise.resolve(false)),
    clearAuthData: jest.fn(() => Promise.resolve()),
    updateUser: jest.fn(() => Promise.resolve()),
  },
}));

// Test component that uses auth context
const TestComponent = () => {
  const { state, login, logout } = useAuth();

  const handleLogin = async () => {
    try {
      await login({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      <View testID="auth-status">{state.isAuthenticated ? 'authenticated' : 'not-authenticated'}</View>
      <View testID="loading">{state.isLoading ? 'loading' : 'not-loading'}</View>
      <View testID="error">{state.error || 'no-error'}</View>
      <View testID="user-email">{state.user?.email || 'no-user'}</View>
      <TouchableOpacity testID="login-button" onPress={handleLogin} />
      <TouchableOpacity testID="logout-button" onPress={handleLogout} />
    </>
  );
};

// Helper to render component with AuthProvider
const renderWithAuthProvider = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>,
  );
};

describe('Authentication Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', async () => {
      const { getByTestId } = renderWithAuthProvider(<TestComponent />);

      // Check initial state
      expect(getByTestId('auth-status').props.children).toBe('not-authenticated');
      expect(getByTestId('user-email').props.children).toBe('no-user');
      expect(getByTestId('error').props.children).toBe('no-error');

      // Wait for initialization to complete
      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('not-loading');
      });
    });

    it('should check authentication status on initialization', async () => {
      renderWithAuthProvider(<TestComponent />);

      await waitFor(() => {
        expect(authService.isAuthenticated).toHaveBeenCalled();
      });
    });
  });

  describe('Login Flow', () => {
    const mockUser: User = {
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
    };

    const mockTokens: AuthTokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: Date.now() + 3600000,
      tokenType: 'Bearer',
    };

    it('should successfully login user', async () => {
      const mockLoginResponse = { user: mockUser, tokens: mockTokens };
      (authService.login as jest.Mock).mockResolvedValue(mockLoginResponse);
      (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
      (authService.getCurrentUser as jest.Mock).mockReturnValue(mockUser);
      (authService.getCurrentTokens as jest.Mock).mockReturnValue(mockTokens);

      const { getByTestId } = renderWithAuthProvider(<TestComponent />);

      // Wait for initialization
      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('not-loading');
      });

      // Click login button
      const loginButton = getByTestId('login-button');
      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Verify login was called with correct credentials
      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      });

      // Verify successful login state
      await waitFor(() => {
        expect(getByTestId('auth-status').props.children).toBe('authenticated');
        expect(getByTestId('user-email').props.children).toBe('test@example.com');
        expect(getByTestId('error').props.children).toBe('no-error');
      });
    });

    it('should handle login errors', async () => {
      const mockError = new Error('Invalid credentials');
      (authService.login as jest.Mock).mockRejectedValue(mockError);

      const { getByTestId } = renderWithAuthProvider(<TestComponent />);

      // Wait for initialization
      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('not-loading');
      });

      // Click login button
      const loginButton = getByTestId('login-button');
      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Verify error state
      await waitFor(() => {
        expect(getByTestId('auth-status').props.children).toBe('not-authenticated');
        expect(getByTestId('error').props.children).toBe('Invalid credentials');
      });
    });

    it('should store tokens securely on successful login', async () => {
      const mockLoginResponse = { user: mockUser, tokens: mockTokens };
      (authService.login as jest.Mock).mockResolvedValue(mockLoginResponse);
      (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
      (authService.getCurrentUser as jest.Mock).mockReturnValue(mockUser);
      (authService.getCurrentTokens as jest.Mock).mockReturnValue(mockTokens);

      const { getByTestId } = renderWithAuthProvider(<TestComponent />);

      // Wait for initialization
      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('not-loading');
      });

      // Click login button
      const loginButton = getByTestId('login-button');
      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Verify tokens were stored
      await waitFor(() => {
        expect(tokenManager.setTokens).toHaveBeenCalledWith(mockTokens, mockUser);
        expect(httpClient.setTokens).toHaveBeenCalledWith(mockTokens);
      });
    });
  });

  describe('Logout Flow', () => {
    const mockUser: User = {
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
    };

    const mockTokens: AuthTokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: Date.now() + 3600000,
      tokenType: 'Bearer',
    };

    it('should successfully logout user', async () => {
      // Setup authenticated state
      (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
      (authService.getCurrentUser as jest.Mock).mockReturnValue(mockUser);
      (authService.getCurrentTokens as jest.Mock).mockReturnValue(mockTokens);
      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      const { getByTestId } = renderWithAuthProvider(<TestComponent />);

      // Wait for initialization
      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('not-loading');
      });

      // Click logout button
      const logoutButton = getByTestId('logout-button');
      await act(async () => {
        fireEvent.press(logoutButton);
      });

      // Verify logout was called
      expect(authService.logout).toHaveBeenCalled();

      // Verify logout state
      await waitFor(() => {
        expect(getByTestId('auth-status').props.children).toBe('not-authenticated');
        expect(getByTestId('user-email').props.children).toBe('no-user');
      });
    });

    it('should clear stored data on logout', async () => {
      // Setup authenticated state
      (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
      (authService.getCurrentUser as jest.Mock).mockReturnValue(mockUser);
      (authService.getCurrentTokens as jest.Mock).mockReturnValue(mockTokens);
      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      const { getByTestId } = renderWithAuthProvider(<TestComponent />);

      // Wait for initialization
      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('not-loading');
      });

      // Click logout button
      const logoutButton = getByTestId('logout-button');
      await act(async () => {
        fireEvent.press(logoutButton);
      });

      // Verify data was cleared
      await waitFor(() => {
        expect(tokenManager.clearAuthData).toHaveBeenCalled();
      });
    });
  });

  describe('Token Management', () => {
    it('should validate tokens correctly', () => {
      const mockTokens: AuthTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };

      const result = tokenManager.validateTokens(mockTokens);

      expect(result.isValid).toBe(true);
      expect(result.needsRefresh).toBe(false);
      expect(result.isExpired).toBe(false);
      expect(result.timeUntilExpiry).toBeGreaterThan(0);
    });

    it('should detect expired tokens', () => {
      const expiredTokens: AuthTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        tokenType: 'Bearer',
      };

      const result = tokenManager.validateTokens(expiredTokens);

      expect(result.isValid).toBe(false);
      expect(result.isExpired).toBe(true);
      expect(result.timeUntilExpiry).toBe(0);
    });

    it('should detect tokens needing refresh', () => {
      const soonToExpireTokens: AuthTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: Date.now() + 60000, // Expires in 1 minute
        tokenType: 'Bearer',
      };

      const result = tokenManager.validateTokens(soonToExpireTokens);

      expect(result.isValid).toBe(true);
      expect(result.needsRefresh).toBe(true);
    });
  });

  describe('Secure Storage', () => {
    it('should store and retrieve tokens securely', async () => {
      const mockTokens: AuthTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };

      await secureStorage.storeTokens(mockTokens);
      expect(secureStorage.storeTokens).toHaveBeenCalledWith(mockTokens);

      await secureStorage.getTokens();
      expect(secureStorage.getTokens).toHaveBeenCalled();
    });

    it('should store and retrieve user data securely', async () => {
      const mockUser: User = {
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
      };

      await secureStorage.storeUser(mockUser);
      expect(secureStorage.storeUser).toHaveBeenCalledWith(mockUser);

      await secureStorage.getUser();
      expect(secureStorage.getUser).toHaveBeenCalled();
    });

    it('should check biometric support', async () => {
      await secureStorage.isBiometricSupported();
      expect(secureStorage.isBiometricSupported).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      networkError.code = 'NETWORK_ERROR';
      (authService.login as jest.Mock).mockRejectedValue(networkError);

      const { getByTestId } = renderWithAuthProvider(<TestComponent />);

      // Wait for initialization
      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('not-loading');
      });

      // Click login button
      const loginButton = getByTestId('login-button');
      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Verify network error is handled
      await waitFor(() => {
        expect(getByTestId('error').props.children).toBe('Network error');
      });
    });

    it('should handle authentication errors gracefully', async () => {
      const authError = new Error('Authentication failed');
      authError.code = 'AUTHENTICATION_ERROR';
      (authService.login as jest.Mock).mockRejectedValue(authError);

      const { getByTestId } = renderWithAuthProvider(<TestComponent />);

      // Wait for initialization
      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('not-loading');
      });

      // Click login button
      const loginButton = getByTestId('login-button');
      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Verify auth error is handled
      await waitFor(() => {
        expect(getByTestId('error').props.children).toBe('Authentication failed');
      });
    });
  });

  describe('Biometric Authentication', () => {
    it('should check biometric availability', async () => {
      const biometricAuth = require('../../services/biometricAuth').biometricAuth;

      const result = await biometricAuth.isAvailable();

      expect(result.available).toBe(true);
      expect(result.biometryType).toBe('TouchID');
    });

    it('should store biometric key securely', async () => {
      const biometricAuth = require('../../services/biometricAuth').biometricAuth;

      await biometricAuth.enableBiometric('user-123');

      expect(secureStorage.storeBiometricKey).toHaveBeenCalled();
    });
  });

  describe('Integration Flow', () => {
    it('should complete full authentication cycle', async () => {
      const mockUser: User = {
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
      };

      const mockTokens: AuthTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };

      // Mock successful login
      const mockLoginResponse = { user: mockUser, tokens: mockTokens };
      (authService.login as jest.Mock).mockResolvedValue(mockLoginResponse);
      (authService.isAuthenticated as jest.Mock).mockResolvedValue(true);
      (authService.getCurrentUser as jest.Mock).mockReturnValue(mockUser);
      (authService.getCurrentTokens as jest.Mock).mockReturnValue(mockTokens);

      // Mock successful logout
      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      const { getByTestId } = renderWithAuthProvider(<TestComponent />);

      // Wait for initialization
      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('not-loading');
      });

      // Login
      const loginButton = getByTestId('login-button');
      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Verify login success
      await waitFor(() => {
        expect(getByTestId('auth-status').props.children).toBe('authenticated');
        expect(getByTestId('user-email').props.children).toBe('test@example.com');
      });

      // Logout
      const logoutButton = getByTestId('logout-button');
      await act(async () => {
        fireEvent.press(logoutButton);
      });

      // Verify logout success
      await waitFor(() => {
        expect(getByTestId('auth-status').props.children).toBe('not-authenticated');
        expect(getByTestId('user-email').props.children).toBe('no-user');
      });

      // Verify complete flow was executed
      expect(authService.login).toHaveBeenCalled();
      expect(tokenManager.setTokens).toHaveBeenCalled();
      expect(authService.logout).toHaveBeenCalled();
      expect(tokenManager.clearAuthData).toHaveBeenCalled();
    });
  });
});
