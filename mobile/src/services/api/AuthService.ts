/**
 * Enhanced Authentication API Service
 * Integrates with .NET backend for complete authentication functionality
 */

import {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  SocialProvider,
  SecuritySettings,
} from '../../types/auth';
import { httpClient, ApiResponse } from './HttpClient';
import { endpoints } from '../../config/api';
import { tokenManager } from '../auth/TokenManager';
import { _secureStorage as secureStorage } from '../storage/SecureStorage';
import { logger } from '../../utils/logger';

// Authentication response interface
interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// Social auth request interface
interface SocialAuthRequest {
  provider: SocialProvider;
  token: string;
  userInfo?: {
    id: string;
    email?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}

// Authentication service configuration
interface AuthServiceConfig {
  enableAutoRefresh: boolean;
  enableBiometricDefault: boolean;
  sessionTimeout: number;
  maxRetryAttempts: number;
}

export class AuthService {
  private static instance: AuthService;
  private config: AuthServiceConfig;

  private constructor() {
    this.config = {
      enableAutoRefresh: true,
      enableBiometricDefault: false,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      maxRetryAttempts: 3,
    };
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Validate input
      this.validateLoginCredentials(credentials);

      logger.info('[AuthService] Attempting login', { email: credentials.email });

      const response: ApiResponse<AuthResponse> = await httpClient.post(
        endpoints.auth.login,
        credentials,
        {
          showNetworkAlert: true,
        },
      );

      if (response.success && response.data) {
        const { user, tokens } = response.data;

        // Store tokens and user data
        await tokenManager.setTokens(tokens, user);

        // Enable biometric if requested and supported
        if (credentials.rememberMe && this.config.enableBiometricDefault) {
          await this.enableBiometricIfNeeded();
        }

        logger.info('[AuthService] Login successful', { userId: user.id });
        return { user, tokens };
      } else {
        throw new Error(response.error?.message || 'Login failed');
      }
    } catch (error) {
      logger.error('[AuthService] Login error', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Register new user
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      // Validate input
      this.validateRegisterCredentials(credentials);

      logger.info('[AuthService] Attempting registration', { email: credentials.email });

      const response: ApiResponse<AuthResponse> = await httpClient.post(
        endpoints.auth.register,
        credentials,
        {
          showNetworkAlert: true,
        },
      );

      if (response.success && response.data) {
        const { user, tokens } = response.data;

        // Store tokens and user data
        await tokenManager.setTokens(tokens, user);

        logger.info('[AuthService] Registration successful', { userId: user.id });
        return { user, tokens };
      } else {
        throw new Error(response.error?.message || 'Registration failed');
      }
    } catch (error) {
      logger.error('[AuthService] Registration error', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Social login with provider
   */
  async socialLogin(provider: SocialProvider, socialToken: string, userInfo?: any): Promise<AuthResponse> {
    try {
      logger.info('[AuthService] Attempting social login', { provider });

      const request: SocialAuthRequest = {
        provider,
        token: socialToken,
        userInfo: userInfo ? {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          firstName: userInfo.firstName || userInfo.given_name,
          lastName: userInfo.lastName || userInfo.family_name,
          avatar: userInfo.picture || userInfo.avatar,
        } : undefined,
      };

      const response: ApiResponse<AuthResponse> = await httpClient.post(
        endpoints.social.authenticate,
        request,
        {
          showNetworkAlert: true,
        },
      );

      if (response.success && response.data) {
        const { user, tokens } = response.data;

        // Store tokens and user data
        await tokenManager.setTokens(tokens, user);

        // Enable biometric for social logins by default
        if (this.config.enableBiometricDefault) {
          await this.enableBiometricIfNeeded();
        }

        logger.info('[AuthService] Social login successful', { provider, userId: user.id });
        return { user, tokens };
      } else {
        throw new Error(response.error?.message || `${provider} login failed`);
      }
    } catch (error) {
      logger.error('[AuthService] Social login error', { provider, error });
      throw this.handleAuthError(error);
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      logger.info('[AuthService] Logging out user');

      // Call logout endpoint
      await httpClient.post(endpoints.auth.logout, undefined, {
        skipRetry: true, // Don't retry logout requests
      });

      logger.info('[AuthService] Logout API call successful');
    } catch (error) {
      logger.warn('[AuthService] Logout API call failed', error);
      // Continue with local cleanup even if API call fails
    } finally {
      // Clear local data
      await tokenManager.clearAuthData();
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshToken(): Promise<AuthTokens> {
    try {
      logger.info('[AuthService] Refreshing tokens via API');

      const result = await tokenManager.refreshTokens();

      if (result.success && result.tokens) {
        return result.tokens;
      } else {
        throw new Error(result.error || 'Token refresh failed');
      }
    } catch (error) {
      logger.error('[AuthService] Token refresh error', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Get current user profile
   */
  async getUserProfile(): Promise<User> {
    try {
      const response: ApiResponse<User> = await httpClient.get(endpoints.auth.profile);

      if (response.success && response.data) {
        // Update cached user data
        await tokenManager.updateUser(response.data);
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to fetch user profile');
      }
    } catch (error) {
      logger.error('[AuthService] Get user profile error', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(updates: Partial<User>): Promise<User> {
    try {
      const response: ApiResponse<User> = await httpClient.patch(
        endpoints.auth.updateProfile,
        updates,
      );

      if (response.success && response.data) {
        // Update cached user data
        await tokenManager.updateUser(response.data);
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to update user profile');
      }
    } catch (error) {
      logger.error('[AuthService] Update user profile error', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(request: ForgotPasswordRequest): Promise<void> {
    try {
      this.validateEmail(request.email);

      const response: ApiResponse<void> = await httpClient.post(
        endpoints.auth.forgotPassword,
        request,
        {
          showNetworkAlert: true,
        },
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to send reset email');
      }

      logger.info('[AuthService] Password reset email sent', { email: request.email });
    } catch (error) {
      logger.error('[AuthService] Forgot password error', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(request: ResetPasswordRequest): Promise<void> {
    try {
      this.validatePassword(request.newPassword);

      const response: ApiResponse<void> = await httpClient.post(
        endpoints.auth.resetPassword,
        request,
        {
          showNetworkAlert: true,
        },
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Password reset failed');
      }

      logger.info('[AuthService] Password reset successful');
    } catch (error) {
      logger.error('[AuthService] Reset password error', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Verify email - REMOVED 2025-11-06
   * The /api/auth/verify-email endpoint no longer exists on the backend.
   * Email verification now happens automatically on registration.
   * @deprecated This method is kept for backwards compatibility only.
   * Calling it will always throw an error indicating the endpoint is gone.
   */
  async verifyEmail(_token: string): Promise<void> {
    throw new Error(
      'Email verification endpoint has been removed. Emails are verified automatically on registration.',
    );
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      return await tokenManager.isAuthenticated();
    } catch (error) {
      logger.error('[AuthService] Authentication check error', error);
      return false;
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return tokenManager.getCurrentUser();
  }

  /**
   * Get current tokens
   */
  getCurrentTokens(): AuthTokens | null {
    return tokenManager.getCurrentTokens();
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(settings: SecuritySettings): Promise<void> {
    try {
      await secureStorage.storeSecuritySettings(settings);
      logger.info('[AuthService] Security settings updated');
    } catch (error) {
      logger.error('[AuthService] Failed to update security settings', error);
      throw new Error('Failed to update security settings');
    }
  }

  /**
   * Get security settings
   */
  async getSecuritySettings(): Promise<SecuritySettings | null> {
    try {
      return await secureStorage.getSecuritySettings();
    } catch (error) {
      logger.error('[AuthService] Failed to get security settings', error);
      return null;
    }
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometricAuthentication(): Promise<void> {
    try {
      const biometricSupported = await secureStorage.isBiometricSupported();
      if (!biometricSupported) {
        throw new Error('Biometric authentication is not supported on this device');
      }

      const currentUser = tokenManager.getCurrentUser();
      if (!currentUser) {
        throw new Error('User must be logged in to enable biometric authentication');
      }

      // Store biometric key
      await secureStorage.storeBiometricKey(currentUser.id);

      // Update user profile
      await this.updateUserProfile({ biometricEnabled: true });

      logger.info('[AuthService] Biometric authentication enabled');
    } catch (error) {
      logger.error('[AuthService] Failed to enable biometric authentication', error);
      throw error;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometricAuthentication(): Promise<void> {
    try {
      await secureStorage.removeBiometricKey();

      const currentUser = tokenManager.getCurrentUser();
      if (currentUser) {
        await this.updateUserProfile({ biometricEnabled: false });
      }

      logger.info('[AuthService] Biometric authentication disabled');
    } catch (error) {
      logger.error('[AuthService] Failed to disable biometric authentication', error);
      throw error;
    }
  }

  /**
   * Validate login credentials
   */
  private validateLoginCredentials(credentials: LoginCredentials): void {
    if (!credentials.email || credentials.email.trim().length === 0) {
      throw new Error('Email is required');
    }

    if (!credentials.password || credentials.password.length === 0) {
      throw new Error('Password is required');
    }

    this.validateEmail(credentials.email);
  }

  /**
   * Validate register credentials
   */
  private validateRegisterCredentials(credentials: RegisterCredentials): void {
    if (!credentials.email || credentials.email.trim().length === 0) {
      throw new Error('Email is required');
    }

    if (!credentials.password || credentials.password.length === 0) {
      throw new Error('Password is required');
    }

    if (!credentials.confirmPassword || credentials.confirmPassword.length === 0) {
      throw new Error('Password confirmation is required');
    }

    if (credentials.password !== credentials.confirmPassword) {
      throw new Error('Passwords do not match');
    }

    if (credentials.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!credentials.agreeToTerms) {
      throw new Error('You must agree to the terms and conditions');
    }

    this.validateEmail(credentials.email);
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): void {
    if (!password || password.length === 0) {
      throw new Error('Password is required');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Additional password validation can be added here
  }

  /**
   * Enable biometric authentication if supported
   */
  private async enableBiometricIfNeeded(): Promise<void> {
    try {
      const biometricSupported = await secureStorage.isBiometricSupported();
      if (biometricSupported) {
        await this.enableBiometricAuthentication();
      }
    } catch (error) {
      logger.warn('[AuthService] Failed to enable biometric authentication', error);
      // Don't throw error, just continue without biometric
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any): Error {
    if (error.code) {
      // Network or API error from HttpClient
      return error;
    }

    // Create authentication-specific error
    class AuthErrorInstance extends Error {
      code: string;
      field?: string;

      constructor(message: string, code: string, field?: string) {
        super(message);
        this.name = 'AuthError';
        this.code = code;
        this.field = field;
      }
    }

    const authError = new AuthErrorInstance(
      error.message || 'Authentication failed',
      'AUTH_ERROR',
      undefined,
    );

    return authError;
  }

  /**
   * Get authentication status information
   */
  async getAuthStatus(): Promise<{
    isAuthenticated: boolean;
    user: User | null;
    tokens: AuthTokens | null;
    tokenInfo: {
      isExpired: boolean;
      needsRefresh: boolean;
      timeUntilExpiry: number;
    };
    securitySettings: SecuritySettings | null;
  }> {
    const isAuthenticated = await this.isAuthenticated();
    const user = this.getCurrentUser();
    const tokens = this.getCurrentTokens();
    const securitySettings = await this.getSecuritySettings();

    let tokenInfo = {
      isExpired: true,
      needsRefresh: false,
      timeUntilExpiry: 0,
    };

    if (tokens) {
      const validation = tokenManager.validateTokens(tokens);
      tokenInfo = {
        isExpired: validation.isExpired,
        needsRefresh: validation.needsRefresh,
        timeUntilExpiry: validation.timeUntilExpiry,
      };
    }

    return {
      isAuthenticated,
      user,
      tokens,
      tokenInfo,
      securitySettings,
    };
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<AuthServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AuthServiceConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
