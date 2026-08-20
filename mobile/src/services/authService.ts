import { TokenStorageService } from './tokenStorage';
import { BiometricAuthService } from './biometricAuth';
import { OAuthService } from './oauthService';
import ApiService from './api/ApiService';
import { LoginCredentials, AuthTokens, User, BiometricAuthResult, RegisterCredentials, ResetPasswordRequest } from '../types/auth';
import { endpoints } from '../config/api';
import { logger } from '../utils/logger';

class AuthService {
  private tokenStorage: TokenStorageService;
  private biometricAuth: BiometricAuthService;
  private currentTokens: AuthTokens | null = null;
  private currentUser: User | null = null;

  constructor() {
    this.tokenStorage = TokenStorageService.getInstance();
    this.biometricAuth = BiometricAuthService.getInstance();
  }

  /**
   * Save authentication tokens securely
   */
  async saveTokens(tokens: AuthTokens): Promise<void> {
    try {
      await this.tokenStorage.storeTokens(tokens);
      this.currentTokens = tokens;
    } catch (error) {
      logger.error('[AuthService] Failed to save tokens', error);
      throw new Error('Failed to save authentication tokens');
    }
  }

  /**
   * Get current tokens from memory
   */
  getCurrentTokens(): AuthTokens | null {
    return this.currentTokens;
  }

  /**
   * Get tokens from secure storage
   */
  async getTokens(): Promise<AuthTokens | null> {
    try {
      const tokens = await this.tokenStorage.getTokens();
      this.currentTokens = tokens;
      return tokens;
    } catch (error) {
      logger.error('[AuthService] Failed to get tokens', error);
      return null;
    }
  }

  /**
   * Save user data securely
   */
  async saveUser(user: User): Promise<void> {
    try {
      // Store user data as JSON string in keychain
      const userData = JSON.stringify(user);
      await this.tokenStorage.storeBiometricKey(userData);
      this.currentUser = user;
    } catch (error) {
      logger.error('[AuthService] Failed to save user', error);
      throw new Error('Failed to save user data');
    }
  }

  /**
   * Get current user from memory
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get user data from secure storage
   */
  async getUser(): Promise<User | null> {
    try {
      const userData = await this.tokenStorage.getBiometricKey();
      if (userData) {
        const user = JSON.parse(userData) as User;
        this.currentUser = user;
        return user;
      }
      return null;
    } catch (error) {
      logger.error('[AuthService] Failed to get user', error);
      return null;
    }
  }

  /**
   * Login with email and password
   * @deprecated Use services/api/AuthService.ts instead for new development
   */
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    try {
      // Input validation
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(credentials.email)) {
        throw new Error('Invalid email format');
      }

      logger.info('Attempting login for:', credentials.email);

      // Call real API
      const response = await ApiService.post<{ tokens: AuthTokens; user: User }>(
        endpoints.auth.login,
        {
          email: credentials.email,
          password: credentials.password,
          rememberMe: credentials.rememberMe || false,
        },
        {
          skipAuth: true,
          cacheTTL: 0, // Don't cache auth requests
        },
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Login failed');
      }

      // Save tokens and user data
      await this.saveTokens(response.data.tokens);
      if (response.data.user) {
        await this.saveUser(response.data.user);
      }

      logger.info('Login successful for:', credentials.email);
      return response.data.tokens;
    } catch (error: any) {
      logger.error('Login failed:', { email: credentials.email, error: error.message });

      // Provide more user-friendly error messages
      if (error.status === 401) {
        throw new Error('Invalid email or password');
      } else if (error.status === 429) {
        throw new Error('Too many login attempts. Please try again later.');
      } else if (error.code === 'NETWORK_ERROR') {
        throw new Error('Network error. Please check your connection and try again.');
      }

      throw error;
    }
  }

  /**
   * Logout and clear all stored data
   */
  async logout(): Promise<void> {
    try {
      logger.info('Attempting logout');

      // Clear from API if possible
      try {
        await ApiService.post(endpoints.auth.logout, {}, { skipCache: true });
        logger.info('API logout successful');
      } catch (error) {
        // Continue with local logout even if API call fails
        logger.warn('API logout failed, continuing with local logout:', error);
      }

      // Clear stored data
      await this.tokenStorage.removeTokens();
      await this.tokenStorage.removeBiometricKey();

      // Clear memory
      this.currentTokens = null;
      this.currentUser = null;

      // Disable biometric auth if enabled
      try {
        const isBiometricEnabled = await this.biometricAuth.isBiometricEnabled();
        if (isBiometricEnabled) {
          await this.biometricAuth.disableBiometric();
        }
      } catch (error) {
        logger.warn('Failed to disable biometric auth during logout:', error);
      }

      logger.info('Logout completed successfully');
    } catch (error) {
      logger.error('Logout failed:', error);
      throw new Error('Failed to logout');
    }
  }

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const tokens = await this.getTokens();
      if (!tokens) {
        return false;
      }

      // Check if token is expired
      if (tokens.expiresAt && Date.now() >= tokens.expiresAt) {
        // Try to refresh token
        try {
          const refreshedTokens = await this.refreshTokens();
          return !!refreshedTokens;
        } catch (error) {
          // Refresh failed, user is not authenticated
          logger.warn('Token refresh failed during auth check:', error);
          await this.logout();
          return false;
        }
      }

      // Optionally validate token with API
      try {
        const response = await ApiService.get(endpoints.auth.profile, {
          skipCache: true,
          retryAttempts: 1,
        });

        return response.success;
      } catch (error) {
        logger.warn('Token validation failed:', error);
        // Token might be invalid even if not expired
        return false;
      }
    } catch (error) {
      logger.error('Authentication check failed:', error);
      return false;
    }
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometricAuth(): Promise<BiometricAuthResult> {
    try {
      await this.biometricAuth.createKeys();
      return { success: true };
    } catch (error) {
      logger.error('[AuthService] Failed to enable biometric auth', error);
      return { success: false, error: (error as Error)?.message || 'Failed to enable biometric authentication' };
    }
  }

  /**
   * Authenticate using biometrics
   */
  async authenticateWithBiometric(): Promise<BiometricAuthResult> {
    try {
      // Check if biometric is enabled
      const isEnabled = await this.biometricAuth.isBiometricEnabled();
      if (!isEnabled) {
        throw new Error('Biometric authentication is not enabled');
      }

      // Perform biometric authentication
      const result = await this.biometricAuth.authenticate('Authenticate to access your account');

      if (result.success && result.signature) {
        // Verify signature with backend if needed
        // For now, just return success
        return result;
      }

      return { success: false, error: 'Biometric authentication failed' };
    } catch (error) {
      logger.error('[AuthService] Biometric authentication failed', error);
      return { success: false, error: (error as Error)?.message || 'Biometric authentication failed' };
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(): Promise<AuthTokens | null> {
    try {
      const currentTokens = await this.getTokens();
      if (!currentTokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      logger.info('Attempting token refresh');

      const response = await ApiService.post<{ tokens: AuthTokens }>(
        endpoints.auth.refresh,
        {
          refreshToken: currentTokens.refreshToken,
        },
        {
          skipAuth: true,
          cacheTTL: 0,
          retryAttempts: 2,
        },
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Token refresh failed');
      }

      await this.saveTokens(response.data.tokens);
      logger.info('Token refresh successful');
      return response.data.tokens;
    } catch (error: any) {
      logger.error('Token refresh failed:', error);

      // If refresh fails, logout user
      if (error.status === 401 || error.code === 'AUTHENTICATION_ERROR') {
        await this.logout();
      }

      return null;
    }
  }

  /**
   * Register new user
   */
  async register(userData: RegisterCredentials): Promise<AuthTokens> {
    try {
      logger.info('Attempting user registration:', userData.email);

      const response = await ApiService.post<{ tokens: AuthTokens; user: User }>(
        endpoints.auth.register,
        userData,
        {
          skipAuth: true,
          cacheTTL: 0,
        },
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Registration failed');
      }

      // Save tokens and user data
      await this.saveTokens(response.data.tokens);
      if (response.data.user) {
        await this.saveUser(response.data.user);
      }

      logger.info('Registration successful for:', userData.email);
      return response.data.tokens;
    } catch (error: any) {
      logger.error('Registration failed:', { email: userData.email, error: error.message });

      // Provide more user-friendly error messages
      if (error.status === 409) {
        throw new Error('An account with this email already exists');
      } else if (error.status === 422) {
        throw new Error('Please check your input and try again');
      } else if (error.code === 'NETWORK_ERROR') {
        throw new Error('Network error. Please check your connection and try again.');
      }

      throw error;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(request: ResetPasswordRequest): Promise<void> {
    try {
      logger.info('Attempting password reset with token:', request.token.substring(0, 10) + '...');

      const response = await ApiService.post(
        endpoints.auth.resetPassword,
        request,
        {
          skipAuth: true,
          cacheTTL: 0,
        },
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Password reset failed');
      }

      logger.info('Password reset completed');
    } catch (error: any) {
      logger.error('Password reset failed:', { token: request.token.substring(0, 10) + '...', error: error.message });

      // Provide more user-friendly error messages
      if (error.status === 404) {
        throw new Error('Invalid or expired reset token');
      } else if (error.status === 429) {
        throw new Error('Too many password reset attempts. Please try again later.');
      } else if (error.code === 'NETWORK_ERROR') {
        throw new Error('Network error. Please check your connection and try again.');
      }

      throw error;
    }
  }

  /**
   * OAuth login with Google
   */
  async loginWithGoogle(): Promise<AuthTokens> {
    try {
      const result = await OAuthService.signInWithGoogle();
      if (result && result.tokens) {
        const authTokens: AuthTokens = {
          accessToken: result.tokens.idToken,
          refreshToken: result.tokens.refreshToken || '',
          expiresAt: result.tokens.expiresAt,
          tokenType: 'Bearer',
        };
        await this.saveTokens(authTokens);
        if (result.user) {
          const user: User = {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.name.split(' ')[0] || result.user.name,
            lastName: result.user.name.split(' ').slice(1).join(' ') || undefined,
            avatar: result.user.photo || undefined,
            emailVerified: true,
            biometricEnabled: false,
            twoFactorEnabled: false,
            socialConnections: [],
            createdAt: new Date().toISOString(),
          };
          await this.saveUser(user);
        }
        return authTokens;
      }
      throw new Error('Google login failed');
    } catch (error) {
      logger.error('[AuthService] Google login failed', error);
      throw error;
    }
  }

  /**
   * OAuth login with Apple
   */
  async loginWithApple(): Promise<AuthTokens> {
    try {
      const result = await OAuthService.signInWithApple();
      if (result && result.tokens) {
        const authTokens: AuthTokens = {
          accessToken: result.tokens.idToken,
          refreshToken: result.tokens.refreshToken || '',
          expiresAt: result.tokens.expiresAt,
          tokenType: 'Bearer',
        };
        await this.saveTokens(authTokens);
        if (result.user) {
          const user: User = {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.name.split(' ')[0] || result.user.name,
            lastName: result.user.name.split(' ').slice(1).join(' ') || undefined,
            avatar: result.user.photo || undefined,
            emailVerified: true,
            biometricEnabled: false,
            twoFactorEnabled: false,
            socialConnections: [],
            createdAt: new Date().toISOString(),
          };
          await this.saveUser(user);
        }
        return authTokens;
      }
      throw new Error('Apple login failed');
    } catch (error) {
      logger.error('[AuthService] Apple login failed', error);
      throw error;
    }
  }

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<{ available: boolean; type: string }> {
    try {
      const result = await this.biometricAuth.isAvailable();
      return {
        available: result.available,
        type: result.biometryType,
      };
    } catch (error) {
      logger.error('[AuthService] Failed to check biometric availability', error);
      return { available: false, type: 'None' };
    }
  }

  /**
   * Initialize authentication state
   */
  async initializeAuth(): Promise<void> {
    try {
      // Load tokens and user data from storage
      await this.getTokens();
      await this.getUser();
    } catch (error) {
      logger.error('[AuthService] Failed to initialize auth', error);
    }
  }
}

// Export singleton instance
const authService = new AuthService();
export default authService;
