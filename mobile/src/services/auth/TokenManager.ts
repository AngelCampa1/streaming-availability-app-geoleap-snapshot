/**
 * Token Manager for GeoLeap Mobile App
 * Handles automatic token refresh, validation, and security monitoring
 */

import { AuthTokens, User } from '../../types/auth';
import { _secureStorage } from '../storage/SecureStorage';
import { httpClient } from '../api/HttpClient';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { logger } from '../../utils/logger';
import { delayService, TimerHandle } from '../../utils/DelayService';

// Token validation result
export interface TokenValidationResult {
  isValid: boolean;
  needsRefresh: boolean;
  isExpired: boolean;
  timeUntilExpiry: number; // milliseconds
  error?: string;
}

// Token refresh result
export interface TokenRefreshResult {
  success: boolean;
  tokens?: AuthTokens;
  error?: string;
}

// Security event types
export enum SecurityEventType {
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
}

// Security event interface
export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: number;
  details?: Record<string, any>;
  userId?: string;
}

// Token manager configuration
interface TokenManagerConfig {
  refreshThreshold: number; // Refresh token when less than this many ms remaining
  maxRetries: number;
  retryDelay: number;
  sessionTimeout: number; // Auto-logout after inactivity
  enableSecurityMonitoring: boolean;
}

export class TokenManager {
  private static instance: TokenManager;
  private currentTokens: AuthTokens | null = null;
  private currentUser: User | null = null;
  private refreshPromise: Promise<TokenRefreshResult> | null = null;
  private lastActivity: number = Date.now();
  private appStateSubscription: any = null;
  private activityTimer: TimerHandle | null = null;
  private securityEvents: SecurityEvent[] = [];

  private readonly config: TokenManagerConfig = {
    refreshThreshold: 5 * 60 * 1000, // 5 minutes
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    enableSecurityMonitoring: true,
  };

  private constructor() {
    this.initializeAppStateMonitoring();
    this.startActivityMonitoring();
    this.loadStoredData();
  }

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Initialize app state monitoring
   */
  private initializeAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'active') {
      this.updateLastActivity();
      this.validateCurrentTokens();
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      this.checkSessionTimeout();
    }
  };

  /**
   * Start activity monitoring
   */
  private startActivityMonitoring(): void {
    // Clear existing timer
    if (this.activityTimer) {
      this.activityTimer.clear();
    }

    // Set up periodic activity check using DelayService
    this.activityTimer = delayService.interval(() => {
      this.checkSessionTimeout();
    }, 60000); // Check every minute
  }

  /**
   * Update last activity timestamp
   */
  private updateLastActivity(): void {
    this.lastActivity = Date.now();
  }

  /**
   * Check for session timeout
   */
  private checkSessionTimeout(): void {
    const timeSinceLastActivity = Date.now() - this.lastActivity;

    if (timeSinceLastActivity > this.config.sessionTimeout) {
      this.logSecurityEvent(SecurityEventType.SESSION_TIMEOUT, {
        timeSinceLastActivity,
        sessionTimeout: this.config.sessionTimeout,
      });

      // Force logout due to session timeout
      this.forceLogout('Session expired due to inactivity');
    }
  }

  /**
   * Load stored tokens and user data
   */
  private async loadStoredData(): Promise<void> {
    try {
      const [tokens, user] = await Promise.all([
        _secureStorage.getTokens(),
        _secureStorage.getUser(),
      ]);

      this.currentTokens = tokens;
      this.currentUser = user;

      if (tokens) {
        this.validateCurrentTokens();
      }
    } catch (error) {
      logger.error('[TokenManager] Failed to load stored data', error);
    }
  }

  /**
   * Validate current tokens
   */
  private async validateCurrentTokens(): Promise<void> {
    if (!this.currentTokens) {
      return;
    }

    const validation = this.validateTokens(this.currentTokens);

    if (!validation.isValid) {
      if (validation.isExpired) {
        this.logSecurityEvent(SecurityEventType.TOKEN_EXPIRED, {
          expiresAt: this.currentTokens.expiresAt,
          currentTime: Date.now(),
        });

        // Try to refresh the token
        await this.refreshTokens();
      }
    } else if (validation.needsRefresh) {
      // Token is valid but needs refresh soon
      await this.refreshTokens();
    }
  }

  /**
   * Set authentication tokens
   */
  async setTokens(tokens: AuthTokens, user?: User): Promise<void> {
    try {
      this.currentTokens = tokens;
      this.currentUser = user || null;

      // Store tokens securely
      await _secureStorage.storeTokens(tokens);

      if (user) {
        await _secureStorage.storeUser(user);
      }

      // Update HTTP client
      await httpClient.setTokens(tokens);

      this.updateLastActivity();

      logger.info('[TokenManager] Tokens set successfully');
    } catch (error) {
      logger.error('[TokenManager] Failed to set tokens', error);
      throw error;
    }
  }

  /**
   * Get current tokens
   */
  getCurrentTokens(): AuthTokens | null {
    return this.currentTokens;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Validate tokens
   */
  validateTokens(tokens: AuthTokens): TokenValidationResult {
    const now = Date.now();

    if (!tokens.expiresAt) {
      return {
        isValid: false,
        needsRefresh: true,
        isExpired: false,
        timeUntilExpiry: 0,
        error: 'Token has no expiration time',
      };
    }

    const timeUntilExpiry = tokens.expiresAt - now;
    const isExpired = timeUntilExpiry <= 0;
    const needsRefresh = timeUntilExpiry <= this.config.refreshThreshold;

    return {
      isValid: !isExpired,
      needsRefresh: !isExpired && needsRefresh,
      isExpired,
      timeUntilExpiry: Math.max(0, timeUntilExpiry),
    };
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      if (!this.currentTokens) {
        // Try to load from storage
        await this.loadStoredData();
      }

      if (!this.currentTokens) {
        return false;
      }

      const validation = this.validateTokens(this.currentTokens);

      if (!validation.isValid) {
        if (validation.isExpired) {
          const refreshResult = await this.refreshTokens();
          if (!refreshResult.success) {
            return false;
          }
        } else {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('[TokenManager] Failed to check authentication status', error);
      return false;
    }
  }

  /**
   * Refresh tokens
   */
  async refreshTokens(): Promise<TokenRefreshResult> {
    // If refresh is already in progress, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform actual token refresh
   */
  private async performTokenRefresh(): Promise<TokenRefreshResult> {
    try {
      if (!this.currentTokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      logger.info('[TokenManager] Refreshing authentication tokens');

      const response = await httpClient.post('/api/auth/refresh', {
        refreshToken: this.currentTokens.refreshToken,
      });

      if (response.success && response.data) {
        const newTokens: AuthTokens = response.data;

        await this.setTokens(newTokens, this.currentUser);

        logger.info('[TokenManager] Tokens refreshed successfully');

        return {
          success: true,
          tokens: newTokens,
        };
      } else {
        throw new Error(response.error?.message || 'Token refresh failed');
      }
    } catch (error) {
      logger.error('[TokenManager] Token refresh failed', error);

      this.logSecurityEvent(SecurityEventType.TOKEN_REFRESH_FAILED, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Force logout on refresh failure
      await this.forceLogout('Failed to refresh authentication tokens');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      };
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(): Promise<string | null> {
    try {
      if (!this.currentTokens) {
        const isAuthenticated = await this.isAuthenticated();
        if (!isAuthenticated) {
          return null;
        }
      }

      // BUG-004 FIX: Add null check instead of non-null assertion
      if (!this.currentTokens) {
        logger.warn('[TokenManager] No tokens available after authentication check');
        return null;
      }

      const validation = this.validateTokens(this.currentTokens);

      if (!validation.isValid || validation.needsRefresh) {
        const refreshResult = await this.refreshTokens();
        if (refreshResult.success && refreshResult.tokens) {
          return refreshResult.tokens.accessToken;
        }
        return null;
      }

      // BUG-004 FIX: Add null check for safety
      if (!this.currentTokens) {
        logger.warn('[TokenManager] Tokens became null during validation');
        return null;
      }

      return this.currentTokens.accessToken;
    } catch (error) {
      logger.error('[TokenManager] Failed to get valid access token', error);
      return null;
    }
  }

  /**
   * Clear all authentication data
   */
  async clearAuthData(): Promise<void> {
    try {
      this.currentTokens = null;
      this.currentUser = null;
      this.refreshPromise = null;

      await Promise.all([
        _secureStorage.clearAll(),
        httpClient.clearAuthTokens(),
      ]);

      logger.info('[TokenManager] Authentication data cleared successfully');
    } catch (error) {
      logger.error('[TokenManager] Failed to clear authentication data', error);
      throw error;
    }
  }

  /**
   * Force logout with optional reason
   */
  async forceLogout(reason?: string): Promise<void> {
    try {
      logger.info('[TokenManager] Force logout', { reason: reason || 'No reason provided' });

      // Clear local data
      await this.clearAuthData();

      // Show alert to user if reason provided
      if (reason) {
        Alert.alert('Session Ended', reason, [{ text: 'OK' }]);
      }

      // Log security event
      this.logSecurityEvent(SecurityEventType.UNAUTHORIZED_ACCESS, { reason });
    } catch (error) {
      logger.error('[TokenManager] Force logout failed', error);
    }
  }

  /**
   * Log security event
   */
  private logSecurityEvent(type: SecurityEventType, details?: Record<string, any>): void {
    if (!this.config.enableSecurityMonitoring) {
      return;
    }

    const event: SecurityEvent = {
      type,
      timestamp: Date.now(),
      details,
      userId: this.currentUser?.id,
    };

    this.securityEvents.push(event);

    // Keep only last 100 events
    if (this.securityEvents.length > 100) {
      this.securityEvents = this.securityEvents.slice(-100);
    }

    logger.warn('[TokenManager] Security event', event);

    // Check for suspicious activity patterns
    this.checkSuspiciousActivity();
  }

  /**
   * Check for suspicious activity patterns
   */
  private checkSuspiciousActivity(): void {
    const recentEvents = this.securityEvents.filter(
      event => Date.now() - event.timestamp < 60000, // Last minute
    );

    // If multiple failed refresh attempts in a short time
    const failedRefreshes = recentEvents.filter(
      event => event.type === SecurityEventType.TOKEN_REFRESH_FAILED,
    );

    if (failedRefreshes.length >= 3) {
      this.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
        reason: 'Multiple token refresh failures',
        count: failedRefreshes.length,
      });

      // Force logout for security
      this.forceLogout('Suspicious activity detected. Please log in again.');
    }
  }

  /**
   * Get security events
   */
  getSecurityEvents(): SecurityEvent[] {
    return [...this.securityEvents];
  }

  /**
   * Clear security events
   */
  clearSecurityEvents(): void {
    this.securityEvents = [];
  }

  /**
   * Update user data
   */
  async updateUser(user: User): Promise<void> {
    try {
      this.currentUser = user;
      await _secureStorage.storeUser(user);
    } catch (error) {
      logger.error('[TokenManager] Failed to update user', error);
      throw error;
    }
  }

  /**
   * Get token information
   */
  getTokenInfo(): {
    hasTokens: boolean;
    isExpired: boolean;
    needsRefresh: boolean;
    timeUntilExpiry: number;
    lastActivity: number;
    sessionTimeRemaining: number;
  } {
    if (!this.currentTokens) {
      return {
        hasTokens: false,
        isExpired: true,
        needsRefresh: false,
        timeUntilExpiry: 0,
        lastActivity: this.lastActivity,
        sessionTimeRemaining: 0,
      };
    }

    const validation = this.validateTokens(this.currentTokens);
    const sessionTimeRemaining = Math.max(
      0,
      this.config.sessionTimeout - (Date.now() - this.lastActivity),
    );

    return {
      hasTokens: true,
      isExpired: validation.isExpired,
      needsRefresh: validation.needsRefresh,
      timeUntilExpiry: validation.timeUntilExpiry,
      lastActivity: this.lastActivity,
      sessionTimeRemaining,
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    if (this.activityTimer) {
      this.activityTimer.clear();
    }

    this.refreshPromise = null;
  }
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance();
