/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Social Authentication Context for managing social media integrations
 * Provides OAuth 2.0 authentication, connection management, and privacy controls
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import {
  SocialPlatform,
  SocialConnection,
  SocialProfile,
  SocialPrivacyConsent,
  UpdateSocialPreferencesRequest,
  TokenValidationResult,
  SocialError,
  SocialAuthContextType,
} from '../types/social';

const SocialAuthContext = createContext<SocialAuthContextType | undefined>(undefined);

interface SocialAuthProviderProps {
  children: ReactNode;
  apiEndpoint?: string;
}

export function SocialAuthProvider({ children, apiEndpoint = '/api/social-auth' }: SocialAuthProviderProps) {
  // Core state
  const [user, setUser] = useState<SocialProfile | null>(null);
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [privacySettings, setPrivacySettings] = useState<SocialPrivacyConsent | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState<Record<SocialPlatform, boolean>>(
    {} as Record<SocialPlatform, boolean>
  );

  // Error state
  const [error, setError] = useState<SocialError | null>(null);

  // Refs for cleanup and mount tracking
  const mountedRef = useRef(true);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup OAuth timers on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
        timeoutTimerRef.current = null;
      }
    };
  }, []);

  // Helper function to get auth headers
  // SECURITY: No longer reads tokens from localStorage (XSS vulnerability)
  // Authentication is handled via httpOnly cookies with credentials: 'include'
  const getAuthHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
    };
  }, []);

  // Error handling helper
  const handleApiError = useCallback((error: any, platform?: SocialPlatform): SocialError => {
    console.error('Social API Error:', error);

    // Check if error is a Response object (browser environment)
    if (typeof Response !== 'undefined' && error instanceof Response) {
      return {
        code: `HTTP_${error.status}`,
        message: `API request failed with status ${error.status}`,
        platform,
      };
    }

    if (error instanceof Error) {
      return {
        code: 'GENERIC_ERROR',
        message: error.message,
        platform,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      platform,
    };
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load initial data
  const loadUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const headers = getAuthHeaders();

      // Fetch user profile, connections, and privacy settings in parallel
      const [userResponse, connectionsResponse, privacyResponse] = await Promise.all([
        fetch(`${apiEndpoint}/me`, { headers, credentials: 'include' }),
        fetch(`${apiEndpoint}/connections`, { headers, credentials: 'include' }),
        fetch(`${apiEndpoint}/privacy`, { headers, credentials: 'include' }),
      ]);

      // Check if still mounted before updating state
      if (!mountedRef.current) return;

      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (mountedRef.current) setUser(userData);
      }

      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json();
        if (mountedRef.current) setConnections(connectionsData);
      }

      if (privacyResponse.ok) {
        const privacyData = await privacyResponse.json();
        if (mountedRef.current) setPrivacySettings(privacyData);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const socialError = handleApiError(err);
      setError(socialError);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [apiEndpoint, getAuthHeaders, handleApiError]);

  // Initialize data on mount
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Social login with OAuth 2.0 popup flow
  const loginWithProvider = useCallback(
    async (platform: SocialPlatform, redirectTo?: string) => {
      try {
        setError(null);
        setIsConnecting(prev => ({ ...prev, [platform]: true }));

        // Store redirect URL for after login
        if (redirectTo) {
          sessionStorage.setItem('socialAuthRedirect', redirectTo);
        }

        // Initiate OAuth flow
        const response = await fetch(`${apiEndpoint}/connect/${platform}`, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            redirectUrl: `${window.location.origin}/auth/social/callback/${platform}`,
            scopes: ['public_profile', 'email'],
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to initiate OAuth flow for ${platform}`);
        }

        const result = await response.json();

        if (result.authorizationUrl) {
          // Open OAuth popup
          const popup = window.open(
            result.authorizationUrl,
            `oauth_${platform}`,
            'width=600,height=700,scrollbars=yes,resizable=yes'
          );

          // Listen for OAuth completion with proper cleanup
          return new Promise<void>((resolve, reject) => {
            // Clear any existing timers before starting new ones
            if (pollTimerRef.current) {
              clearInterval(pollTimerRef.current);
            }
            if (timeoutTimerRef.current) {
              clearTimeout(timeoutTimerRef.current);
            }

            pollTimerRef.current = setInterval(() => {
              // Check if component is still mounted
              if (!mountedRef.current) {
                if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
                popup?.close();
                return;
              }

              try {
                if (popup?.closed) {
                  if (pollTimerRef.current) {
                    clearInterval(pollTimerRef.current);
                    pollTimerRef.current = null;
                  }
                  if (timeoutTimerRef.current) {
                    clearTimeout(timeoutTimerRef.current);
                    timeoutTimerRef.current = null;
                  }
                  // Check if auth was successful by refreshing connections
                  if (mountedRef.current) {
                    refreshConnections().then(resolve).catch(reject);
                  }
                }
              } catch (_err) {
                // Cross-origin error when popup is still on OAuth provider domain
                // This is expected and we should continue polling
              }
            }, 1000);

            // Timeout after 5 minutes
            timeoutTimerRef.current = setTimeout(() => {
              if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
              }
              timeoutTimerRef.current = null;
              popup?.close();
              if (mountedRef.current) {
                reject(new Error('OAuth flow timed out'));
              }
            }, 300000);
          });
        }
      } catch (err) {
        const socialError = handleApiError(err, platform);
        setError(socialError);
        throw socialError;
      } finally {
        setIsConnecting(prev => ({ ...prev, [platform]: false }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiEndpoint, getAuthHeaders, handleApiError]
  );

  // Connect additional provider to existing account
  const connectProvider = useCallback(
    async (platform: SocialPlatform): Promise<SocialConnection> => {
      try {
        setError(null);
        setIsConnecting(prev => ({ ...prev, [platform]: true }));

        const response = await fetch(`${apiEndpoint}/connect/${platform}`, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            redirectUrl: `${window.location.origin}/auth/social/callback/${platform}`,
            scopes: ['public_profile', 'email'],
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to connect ${platform}`);
        }

        const connection: SocialConnection = await response.json();

        // Update connections list
        setConnections(prev => {
          const filtered = prev.filter(c => c.platform !== platform);
          return [...filtered, connection];
        });

        return connection;
      } catch (err) {
        const socialError = handleApiError(err, platform);
        setError(socialError);
        throw socialError;
      } finally {
        setIsConnecting(prev => ({ ...prev, [platform]: false }));
      }
    },
    [apiEndpoint, getAuthHeaders, handleApiError]
  );

  // Disconnect social provider
  const disconnectProvider = useCallback(
    async (platform: SocialPlatform) => {
      try {
        setError(null);

        const response = await fetch(`${apiEndpoint}/disconnect/${platform}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to disconnect ${platform}`);
        }

        // Remove from connections list
        setConnections(prev => prev.filter(c => c.platform !== platform));
      } catch (err) {
        const socialError = handleApiError(err, platform);
        setError(socialError);
        throw socialError;
      }
    },
    [apiEndpoint, getAuthHeaders, handleApiError]
  );

  // Update privacy settings
  const updatePrivacySettings = useCallback(
    async (settings: Partial<UpdateSocialPreferencesRequest>) => {
      try {
        setError(null);

        const response = await fetch(`${apiEndpoint}/privacy`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify(settings),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update privacy settings');
        }

        // Refresh privacy settings
        const privacyResponse = await fetch(`${apiEndpoint}/privacy`, {
          headers: getAuthHeaders(),
          credentials: 'include',
        });

        if (privacyResponse.ok) {
          const updatedPrivacy = await privacyResponse.json();
          setPrivacySettings(updatedPrivacy);
        }
      } catch (err) {
        const socialError = handleApiError(err);
        setError(socialError);
        throw socialError;
      }
    },
    [apiEndpoint, getAuthHeaders, handleApiError]
  );

  // Refresh connections from server
  const refreshConnections = useCallback(async () => {
    try {
      if (mountedRef.current) setError(null);

      const response = await fetch(`${apiEndpoint}/connections`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!mountedRef.current) return;

      if (response.ok) {
        const connectionsData = await response.json();
        if (mountedRef.current) setConnections(connectionsData);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const socialError = handleApiError(err);
      setError(socialError);
      throw socialError;
    }
  }, [apiEndpoint, getAuthHeaders, handleApiError]);

  // Validate connection token
  const validateConnection = useCallback(
    async (platform: SocialPlatform): Promise<TokenValidationResult> => {
      try {
        setError(null);

        const response = await fetch(`${apiEndpoint}/validate/${platform}`, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to validate ${platform} token`);
        }

        const result: TokenValidationResult = await response.json();

        // If token was refreshed, update connection
        if (result.wasRefreshed) {
          await refreshConnections();
        }

        return result;
      } catch (err) {
        const socialError = handleApiError(err, platform);
        setError(socialError);
        throw socialError;
      }
    },
    [apiEndpoint, getAuthHeaders, handleApiError, refreshConnections]
  );

  // Utility methods
  const isProviderConnected = useCallback(
    (platform: SocialPlatform): boolean => {
      return connections.some(c => c.platform === platform && c.isTokenValid);
    },
    [connections]
  );

  const getConnection = useCallback(
    (platform: SocialPlatform): SocialConnection | undefined => {
      return connections.find(c => c.platform === platform);
    },
    [connections]
  );

  const canConnect = useCallback(
    (platform: SocialPlatform): boolean => {
      // Check if privacy settings allow connections and platform isn't already connected
      const allowsConnections = privacySettings?.allowSocialDataCollection !== false;
      const notAlreadyConnected = !isProviderConnected(platform);
      return allowsConnections && notAlreadyConnected;
    },
    [privacySettings, isProviderConnected]
  );

  // Context value
  const contextValue: SocialAuthContextType = {
    // State
    user,
    connections,
    privacySettings,
    isLoading,
    isConnecting,
    error,

    // Authentication methods
    loginWithProvider,
    connectProvider,
    disconnectProvider,

    // Privacy management
    updatePrivacySettings,

    // Connection management
    refreshConnections,
    validateConnection,

    // Utility methods
    isProviderConnected,
    getConnection,
    canConnect,

    // Error handling
    clearError,
  };

  return <SocialAuthContext.Provider value={contextValue}>{children}</SocialAuthContext.Provider>;
}

// Hook to use social auth context
export function useSocialAuth(): SocialAuthContextType {
  const context = useContext(SocialAuthContext);
  if (context === undefined) {
    throw new Error('useSocialAuth must be used within a SocialAuthProvider');
  }
  return context;
}

export default SocialAuthProvider;
