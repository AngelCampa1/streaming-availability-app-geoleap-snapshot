'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, AuthContext as AuthContextType } from '@/lib/auth';
import { apiCall } from '@/lib/api';
import { logger } from '@/lib/logger';
import { SecurityService } from '@/lib/security';
import { useRouter } from 'next/navigation';
import { storeSessionFingerprint, clearSessionFingerprint, detectSessionCompromise } from '@/lib/session-fingerprint';
import { getSafeRedirectPath } from '@/lib/redirect';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  // Start with isLoading = true to show skeleton immediately until auth check completes
  // This improves perceived performance by showing loading state from the start
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpiring, setSessionExpiring] = useState(false);
  const router = useRouter();

  // Refs for mount tracking and preventing race conditions
  const mountedRef = useRef(true);
  const isRefreshingRef = useRef(false);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);

  // Track mount state for async operations
  // CRITICAL: Must set to true on mount to handle React 18 StrictMode remounts
  useEffect(() => {
    mountedRef.current = true; // Set true on mount AND remount
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshTokenIfNeeded = useCallback(async (): Promise<boolean> => {
    // Skip refresh if user has no session fingerprint (anonymous user)
    // This prevents unnecessary 401 errors for anonymous users on public pages
    const hasSessionFingerprint = typeof window !== 'undefined' && localStorage.getItem('sessionFingerprint');
    if (!hasSessionFingerprint) {
      // Silent return for anonymous users - no need to refresh
      return false;
    }

    // RACE CONDITION FIX: If a refresh is already in progress, wait for it
    // This prevents multiple concurrent refresh requests that could invalidate tokens
    if (isRefreshingRef.current && refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    // Start a new refresh operation
    isRefreshingRef.current = true;

    const doRefresh = async (): Promise<boolean> => {
      try {
        // With httpOnly cookies, we can't read tokens from client side
        // Just make the refresh request and let the backend handle token validation
        await apiCall('/api/auth/refresh-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Mode': 'cookie',
          },
          credentials: 'include', // Include cookies in request
        });

        if (mountedRef.current) setSessionExpiring(false);
        return true;
      } catch (_error) {
        // Token refresh failed - this is expected for expired/invalid sessions
        // Only log at debug level to reduce console noise
        if (process.env.NODE_ENV === 'development') {
          logger.debug('[AuthContext] Token refresh failed - user session may have expired');
        }
        // Refresh failed, clear session state
        if (mountedRef.current) {
          setUser(null);
          clearSessionFingerprint();
        }
        return false;
      } finally {
        isRefreshingRef.current = false;
        refreshPromiseRef.current = null;
      }
    };

    refreshPromiseRef.current = doRefresh();
    return refreshPromiseRef.current;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiCall('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Mode': 'cookie',
        },
        credentials: 'include', // Include cookies in request
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Clear user state, session fingerprint, and CSRF token
      // Cookies are cleared by backend
      clearSessionFingerprint();
      SecurityService.clearCsrfToken();
      setUser(null);
      setSessionExpiring(false);
      router.push('/auth/login');
    }
  }, [router]);

  const checkAuthStatus = useCallback(async () => {
    try {
      // E2E Bug Fix: Check if we have any indication of a session before making auth calls
      // This prevents unnecessary 401 errors for anonymous users on public pages
      const hasSessionFingerprint = typeof window !== 'undefined' && localStorage.getItem('sessionFingerprint');

      // If no session fingerprint exists, user is likely anonymous - skip auth check
      if (!hasSessionFingerprint) {
        if (mountedRef.current) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      // Check session fingerprint for security
      const compromiseCheck = detectSessionCompromise();
      if (compromiseCheck.compromised) {
        console.warn('Session compromise detected:', compromiseCheck.reason);
        // Force logout for security
        await logout();
        return;
      }

      try {
        // With httpOnly cookies, tokens are automatically sent with credentials: 'include'
        const userData = await apiCall<User>('/api/auth/me', {
          method: 'GET',
          headers: {
            'X-Auth-Mode': 'cookie',
          },
          credentials: 'include',
        });

        if (mountedRef.current) setUser(userData);

        // Store fingerprint if not already stored
        if (typeof window !== 'undefined' && !localStorage.getItem('sessionFingerprint')) {
          storeSessionFingerprint();
        }
      } catch (_authError) {
        // Check if still mounted before continuing
        if (!mountedRef.current) return;

        // Token might be expired, try to refresh
        const refreshed = await refreshTokenIfNeeded();
        if (!mountedRef.current) return;

        if (!refreshed) {
          if (mountedRef.current) {
            setUser(null);
            clearSessionFingerprint();
          }
        } else {
          // Try auth check again after refresh
          try {
            const userData = await apiCall<User>('/api/auth/me', {
              method: 'GET',
              headers: {
                'X-Auth-Mode': 'cookie',
              },
              credentials: 'include',
            });
            if (mountedRef.current) setUser(userData);
          } catch {
            if (mountedRef.current) {
              setUser(null);
              clearSessionFingerprint();
            }
          }
        }
      }
    } catch (error) {
      console.error('[AuthContext] Auth check failed:', error);
      if (mountedRef.current) setUser(null);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [logout, refreshTokenIfNeeded]);

  useEffect(() => {
    // Check for existing session on mount
    checkAuthStatus();

    // Set up token refresh interval
    // Note: We don't include checkAuthStatus/refreshTokenIfNeeded in deps to avoid recreating interval
    // These functions are stable via useCallback and we want the interval to run once
    const refreshInterval = setInterval(
      () => {
        refreshTokenIfNeeded();
      },
      5 * 60 * 1000
    ); // Check every 5 minutes

    return () => clearInterval(refreshInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps array - run once on mount

  const extendSession = useCallback(async () => {
    const success = await refreshTokenIfNeeded();
    if (success) {
      setSessionExpiring(false);
    }
  }, [refreshTokenIfNeeded]);

  const login = async (email: string, password: string, rememberMe: boolean = false, redirectTo?: string) => {
    try {
      const authData = await apiCall<{ user: User; success: boolean; message: string }>('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Mode': 'cookie',
        },
        credentials: 'include', // Include cookies in request
        body: JSON.stringify({ email, password, rememberMe }),
      });

      // Tokens are now stored in httpOnly cookies by backend
      setUser(authData.user);

      // Clear cached CSRF token so a new one is fetched with authenticated session
      // This is critical for API calls that require CSRF protection after login
      SecurityService.clearCsrfToken();

      // Store session fingerprint for security
      storeSessionFingerprint();

      // Handle redirect after successful login
      if (redirectTo) {
        router.push(getSafeRedirectPath(redirectTo));
      } else {
        // Check for stored redirect URL
        const intendedUrl = typeof window !== 'undefined' ? localStorage.getItem('redirectAfterLogin') : null;
        if (intendedUrl) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('redirectAfterLogin');
          }
          router.push(getSafeRedirectPath(intendedUrl));
        } else {
          router.push('/');
        }
      }

      return {
        success: true,
        message: 'Login successful',
        user: authData.user,
      };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logoutAllSessions = async () => {
    try {
      await apiCall('/api/auth/logout-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Mode': 'cookie',
        },
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout all sessions failed:', error);
    } finally {
      // Clear user state, session fingerprint, and CSRF token - cookies cleared by backend
      clearSessionFingerprint();
      SecurityService.clearCsrfToken();
      setUser(null);
      setSessionExpiring(false);
      router.push('/auth/login');
    }
  };

  const register = async (
    email: string,
    password: string,
    confirmPassword: string,
    firstName: string,
    lastName: string
  ) => {
    try {
      const authData = await apiCall<{ user: User; success: boolean; message: string }>('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Mode': 'cookie',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, confirmPassword, firstName, lastName }),
      });
      return {
        success: true,
        message: 'Registration successful',
        user: authData.user,
      };
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) ?? false;
  };

  const permissions = user?.permissions ?? [];
  const roles = user?.roles ?? [];
  const isAuthenticated = !!user;

  const contextValue: AuthContextType = {
    user,
    permissions,
    roles,
    login,
    logout,
    register,
    logoutAllSessions,
    hasPermission,
    hasAnyPermission,
    hasRole,
    isAuthenticated,
    isLoading,
    sessionExpiring,
    extendSession,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
