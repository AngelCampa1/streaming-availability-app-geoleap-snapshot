import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import {
  AuthState,
  AuthContextType,
  User,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  SocialProvider,
  BiometricType,
} from '../types/auth';
import { authService } from '../services/api/AuthService';
import { tokenManager } from '../services/auth/TokenManager';
import { _secureStorage } from '../services/storage/SecureStorage';
import { biometricAuth } from '../services/biometricAuth';
import { OAuthService } from '../services/oauthService';
import { logger } from '../utils/logger';
import { SearchHistoryService } from '../services/search/SearchHistoryService';
import { watchlistService } from '../services/watchlist/WatchlistService';
import { recommendationService } from '../services/recommendations/RecommendationService';
import { analyticsService } from '../services/analytics/AnalyticsService';

// BUG FIX: Race condition guard interface
interface AuthOperationGuards {
  isLoggingOut: boolean;
  isRefreshing: boolean;
  hasLoggedOut: boolean; // Persistent flag that stays true even after isLoggingOut resets
}

// Initial state
const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
  biometricAvailable: false,
  biometricType: 'None',
  error: null,
};

// Action types
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_TOKENS'; payload: AuthTokens | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_BIOMETRIC_INFO'; payload: { available: boolean; type: BiometricType } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LOGOUT' };

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_TOKENS':
      return { ...state, tokens: action.payload };
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    case 'SET_BIOMETRIC_INFO':
      return {
        ...state,
        biometricAvailable: action.payload.available,
        biometricType: action.payload.type,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
        biometricAvailable: state.biometricAvailable,
        biometricType: state.biometricType,
      };
    default:
      return state;
  }
}

// Context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // BUG FIX: Race condition guards to prevent logout/refresh conflicts
  const operationGuardsRef = useRef<AuthOperationGuards>({
    isLoggingOut: false,
    isRefreshing: false,
    hasLoggedOut: false,
  });

  // Mount tracking to prevent state updates after unmount
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Safe dispatch that checks if component is mounted
  const safeDispatch = (action: AuthAction) => {
    if (mountedRef.current) {
      dispatch(action);
    }
  };

  // Initialize authentication state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      safeDispatch({ type: 'SET_LOADING', payload: true });

      // Check biometric availability
      const biometricInfo = await biometricAuth.isAvailable();
      safeDispatch({ type: 'SET_BIOMETRIC_INFO', payload: { available: biometricInfo.available, type: biometricInfo.biometryType } });

      // Check authentication status using enhanced auth service
      const isAuthenticated = await authService.isAuthenticated();
      const currentUser = authService.getCurrentUser();
      const currentTokens = authService.getCurrentTokens();

      if (isAuthenticated && currentUser && currentTokens) {
        safeDispatch({ type: 'SET_USER', payload: currentUser });
        safeDispatch({ type: 'SET_TOKENS', payload: currentTokens });
        safeDispatch({ type: 'SET_AUTHENTICATED', payload: true });

        // Apply per-user data scoping on session restore (app relaunch).
        // Without this, singleton services (search/watchlist/recommendations/
        // analytics) fall back to the unscoped global storage bucket, leaking
        // data across users on a shared device. Mirrors applyUserScopeOnLogin.
        await applyUserScopeOnLogin(currentUser.id);

        // Refresh user profile in case it's stale
        try {
          const updatedUser = await authService.getUserProfile();
          safeDispatch({ type: 'SET_USER', payload: updatedUser });
          // Re-scope if the refreshed profile resolves to a different id.
          if (updatedUser.id !== currentUser.id) {
            await applyUserScopeOnLogin(updatedUser.id);
          }
        } catch (profileError) {
          logger.warn('[AuthContext] Failed to refresh user profile', profileError);
          // Continue with cached user data
        }
      }
    } catch (error) {
      logger.error('[AuthContext] Auth initialization failed', error);
      safeDispatch({ type: 'SET_ERROR', payload: 'Failed to initialize authentication' });
    } finally {
      safeDispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Apply per-user data scoping for all singleton services that hold user data.
  // BUG-002/BUG-006/BUG-010/BUG-012/BUG-013/BUG-014/BUG-033/BUG-034 FIX:
  // Prevents cross-user data leak when different users share a device.
  const applyUserScopeOnLogin = async (userId: string): Promise<void> => {
    try {
      SearchHistoryService.getInstance().setCurrentUser(userId);
    } catch (err) {
      logger.warn('[AuthContext] Failed to scope SearchHistoryService', err);
    }

    try {
      watchlistService.setCurrentUser(userId);
    } catch (err) {
      logger.warn('[AuthContext] Failed to scope WatchlistService', err);
    }

    try {
      recommendationService.setCurrentUser(userId);
    } catch (err) {
      logger.warn('[AuthContext] Failed to scope RecommendationService', err);
    }

    try {
      await analyticsService.setUserId(userId);
    } catch (err) {
      logger.warn('[AuthContext] Failed to scope AnalyticsService', err);
    }
  };

  // Clear per-user data from all singleton services that hold user data.
  // BUG-002/BUG-006/BUG-010/BUG-012/BUG-013/BUG-014/BUG-033/BUG-034/BUG-038 FIX:
  // Ensures user A's data does not leak to user B after logout.
  const clearUserScopeOnLogout = async (): Promise<void> => {
    try {
      await SearchHistoryService.getInstance().clearUserData();
    } catch (err) {
      logger.warn('[AuthContext] Failed to clear SearchHistoryService data', err);
    }

    try {
      await watchlistService.clearUserData();
    } catch (err) {
      logger.warn('[AuthContext] Failed to clear WatchlistService data', err);
    }

    try {
      await recommendationService.clearUserData();
    } catch (err) {
      logger.warn('[AuthContext] Failed to clear RecommendationService data', err);
    }

    try {
      await analyticsService.clearUserData();
    } catch (err) {
      logger.warn('[AuthContext] Failed to clear AnalyticsService user data', err);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      safeDispatch({ type: 'SET_LOADING', payload: true });
      safeDispatch({ type: 'CLEAR_ERROR' });

      const { user, tokens } = await authService.login(credentials);

      // BUG FIX: Reset hasLoggedOut flag on successful login
      operationGuardsRef.current.hasLoggedOut = false;

      await applyUserScopeOnLogin(user.id);

      safeDispatch({ type: 'SET_USER', payload: user });
      safeDispatch({ type: 'SET_TOKENS', payload: tokens });
      safeDispatch({ type: 'SET_AUTHENTICATED', payload: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      safeDispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      safeDispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loginWithBiometric = async () => {
    try {
      safeDispatch({ type: 'SET_LOADING', payload: true });
      safeDispatch({ type: 'CLEAR_ERROR' });

      // Check if biometric is enabled
      const isBiometricEnabled = await biometricAuth.isBiometricEnabled();
      if (!isBiometricEnabled) {
        throw new Error('Biometric authentication is not enabled');
      }

      // Authenticate with biometrics
      const { success } = await biometricAuth.authenticate('Authenticate to sign in');
      if (!success) {
        throw new Error('Biometric authentication failed');
      }

      // Get stored tokens with biometric authentication
      const tokens = await _secureStorage.getTokens({
        requireBiometricOnAccess: true,
        showPrompt: true,
        promptMessage: 'Authenticate to access your account',
      });

      if (!tokens) {
        throw new Error('No stored tokens found');
      }

      // Set tokens and get user info
      await tokenManager.setTokens(tokens);
      const user = await authService.getUserProfile();

      // BUG FIX: Reset hasLoggedOut flag on successful login
      operationGuardsRef.current.hasLoggedOut = false;

      await applyUserScopeOnLogin(user.id);

      safeDispatch({ type: 'SET_USER', payload: user });
      safeDispatch({ type: 'SET_TOKENS', payload: tokens });
      safeDispatch({ type: 'SET_AUTHENTICATED', payload: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Biometric login failed';
      safeDispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      safeDispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loginWithSocial = async (provider: SocialProvider) => {
    try {
      safeDispatch({ type: 'SET_LOADING', payload: true });
      safeDispatch({ type: 'CLEAR_ERROR' });

      let oauthResult;

      switch (provider) {
        case 'google':
          oauthResult = await OAuthService.signInWithGoogle();
          break;
        case 'apple':
          oauthResult = await OAuthService.signInWithApple();
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      // Send OAuth identityToken to backend for verification and JWT exchange
      // Backend validates the token with Google/Apple and returns app JWT
      const { user, tokens } = await authService.socialLogin(
        provider,
        oauthResult.tokens.idToken,
        {
          id: oauthResult.user.id,
          email: oauthResult.user.email,
          name: oauthResult.user.name,
          picture: oauthResult.user.photo || undefined,
        }
      );

      // BUG FIX: Reset hasLoggedOut flag on successful login
      operationGuardsRef.current.hasLoggedOut = false;

      await applyUserScopeOnLogin(user.id);

      safeDispatch({ type: 'SET_USER', payload: user });
      safeDispatch({ type: 'SET_TOKENS', payload: tokens });
      safeDispatch({ type: 'SET_AUTHENTICATED', payload: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Social login failed';
      safeDispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      safeDispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      safeDispatch({ type: 'SET_LOADING', payload: true });
      safeDispatch({ type: 'CLEAR_ERROR' });

      const { user, tokens } = await authService.register(credentials);

      // BUG FIX: Reset hasLoggedOut flag on successful registration
      operationGuardsRef.current.hasLoggedOut = false;

      await applyUserScopeOnLogin(user.id);

      safeDispatch({ type: 'SET_USER', payload: user });
      safeDispatch({ type: 'SET_TOKENS', payload: tokens });
      safeDispatch({ type: 'SET_AUTHENTICATED', payload: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      safeDispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      safeDispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = async () => {
    // BUG FIX: Check if already logging out to prevent race condition
    if (operationGuardsRef.current.isLoggingOut) {
      logger.warn('[AuthContext] Logout already in progress, ignoring duplicate call');
      return;
    }

    // BUG FIX: Wait for any in-progress refresh to complete
    if (operationGuardsRef.current.isRefreshing) {
      logger.warn('[AuthContext] Token refresh in progress, waiting before logout');
      // Wait a bit for refresh to settle
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    }

    try {
      operationGuardsRef.current.isLoggingOut = true;
      operationGuardsRef.current.hasLoggedOut = true; // BUG FIX: Persistent logout flag
      safeDispatch({ type: 'SET_LOADING', payload: true });

      // Clear per-user service data before API logout to prevent data leakage
      await clearUserScopeOnLogout();

      // Logout from API
      await authService.logout();

      safeDispatch({ type: 'LOGOUT' });
    } catch (error) {
      logger.error('[AuthContext] Logout failed', error);
      // Force logout even if API call fails
      safeDispatch({ type: 'LOGOUT' });
    } finally {
      operationGuardsRef.current.isLoggingOut = false;
      safeDispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const forgotPassword = async (request: ForgotPasswordRequest) => {
    try {
      safeDispatch({ type: 'SET_LOADING', payload: true });
      safeDispatch({ type: 'CLEAR_ERROR' });

      await authService.forgotPassword(request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email';
      safeDispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      safeDispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const resetPassword = async (request: ResetPasswordRequest) => {
    try {
      safeDispatch({ type: 'SET_LOADING', payload: true });
      safeDispatch({ type: 'CLEAR_ERROR' });

      await authService.resetPassword(request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      safeDispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      safeDispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const enableBiometric = async () => {
    try {
      safeDispatch({ type: 'SET_LOADING', payload: true });
      safeDispatch({ type: 'CLEAR_ERROR' });

      if (!state.user) {
        throw new Error('User must be logged in to enable biometric authentication');
      }

      await authService.enableBiometricAuthentication();

      // Update user profile to reflect biometric enabled status
      const updatedUser = await authService.updateUserProfile({
        biometricEnabled: true,
      });

      safeDispatch({ type: 'SET_USER', payload: updatedUser });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to enable biometric authentication';
      safeDispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      safeDispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const disableBiometric = async () => {
    try {
      safeDispatch({ type: 'SET_LOADING', payload: true });
      safeDispatch({ type: 'CLEAR_ERROR' });

      await authService.disableBiometricAuthentication();

      // Update user profile to reflect biometric disabled status
      if (state.user) {
        const updatedUser = await authService.updateUserProfile({
          biometricEnabled: false,
        });

        safeDispatch({ type: 'SET_USER', payload: updatedUser });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disable biometric authentication';
      safeDispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      safeDispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const refreshToken = async () => {
    // BUG FIX: Don't refresh if logout is in progress
    if (operationGuardsRef.current.isLoggingOut) {
      logger.warn('[AuthContext] Logout in progress, skipping token refresh');
      throw new Error('Cannot refresh token during logout');
    }

    // BUG FIX: Don't start another refresh if one is already in progress
    if (operationGuardsRef.current.isRefreshing) {
      logger.warn('[AuthContext] Token refresh already in progress');
      throw new Error('Token refresh already in progress');
    }

    try {
      operationGuardsRef.current.isRefreshing = true;
      const newTokens = await authService.refreshToken();

      // BUG FIX: Check if logout happened during refresh (persistent flag)
      if (operationGuardsRef.current.isLoggingOut || operationGuardsRef.current.hasLoggedOut) {
        logger.warn('[AuthContext] Logout happened during refresh, discarding new tokens');
        return;
      }

      safeDispatch({ type: 'SET_TOKENS', payload: newTokens });
    } catch (error) {
      logger.error('[AuthContext] Token refresh failed', error);

      // BUG FIX: Only trigger logout if not already logging out
      if (!operationGuardsRef.current.isLoggingOut) {
        // Force logout if refresh fails
        await logout();
      }
      throw error;
    } finally {
      operationGuardsRef.current.isRefreshing = false;
    }
  };

  const clearError = () => {
    safeDispatch({ type: 'CLEAR_ERROR' });
  };

  const contextValue: AuthContextType = {
    state,
    login,
    loginWithBiometric,
    loginWithSocial,
    register,
    logout,
    forgotPassword,
    resetPassword,
    enableBiometric,
    disableBiometric,
    refreshToken,
    clearError,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to check if user is authenticated
export function useIsAuthenticated(): boolean {
  const { state } = useAuth();
  return state.isAuthenticated;
}

// Hook to get current user
export function useCurrentUser(): User | null {
  const { state } = useAuth();
  return state.user;
}
