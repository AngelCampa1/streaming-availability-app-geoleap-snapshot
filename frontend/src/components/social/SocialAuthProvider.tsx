'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface SocialAuthConnection {
  id: string;
  provider: 'google' | 'facebook' | 'twitter' | 'github' | 'linkedin' | 'discord';
  providerId: string;
  username: string;
  displayName: string;
  avatar?: string;
  email?: string;
  isConnected: boolean;
  connectedAt: string;
  permissions: string[];
  profileUrl?: string;
}

export interface SocialAuthUser {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  connections: SocialAuthConnection[];
  privacySettings: {
    allowSocialLogin: boolean;
    sharePersonalInfo: boolean;
    allowFriendDiscovery: boolean;
    showOnlineStatus: boolean;
  };
}

interface SocialAuthContextType {
  user: SocialAuthUser | null;
  connections: SocialAuthConnection[];
  isLoading: boolean;

  // Authentication methods
  loginWithProvider: (provider: string, redirectTo?: string) => Promise<void>;
  connectProvider: (provider: string) => Promise<SocialAuthConnection>;
  disconnectProvider: (provider: string) => Promise<void>;

  // Connection management
  refreshConnections: () => Promise<void>;
  updateConnection: (provider: string, updates: Partial<SocialAuthConnection>) => Promise<void>;

  // Privacy management
  updatePrivacySettings: (settings: Partial<SocialAuthUser['privacySettings']>) => Promise<void>;

  // Utility methods
  isProviderConnected: (provider: string) => boolean;
  getConnection: (provider: string) => SocialAuthConnection | undefined;
  canConnect: (provider: string) => boolean;
}

const SocialAuthContext = createContext<SocialAuthContextType | undefined>(undefined);

interface SocialAuthProviderProps {
  children: ReactNode;
  apiEndpoint?: string;
}

export function SocialAuthProvider({ children, apiEndpoint = '/api/social-auth' }: SocialAuthProviderProps) {
  const [user, setUser] = useState<SocialAuthUser | null>(null);
  const [connections, setConnections] = useState<SocialAuthConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const _router = useRouter();

  // Load user and connections on mount
  useEffect(() => {
    loadUserData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch current user and their social connections
      // SECURITY: Use credentials: 'include' for cookie-based auth (no localStorage tokens)
      const [userResponse, connectionsResponse] = await Promise.all([
        fetch(`${apiEndpoint}/me`, {
          credentials: 'include',
        }),
        fetch(`${apiEndpoint}/connections`, {
          credentials: 'include',
        }),
      ]);

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      }

      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json();
        setConnections(connectionsData);
      }
    } catch (error) {
      console.error('Failed to load social auth data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint]);

  const loginWithProvider = useCallback(
    async (provider: string, redirectTo?: string) => {
      try {
        // Store redirect URL for after login
        if (redirectTo) {
          localStorage.setItem('socialAuthRedirect', redirectTo);
        }

        // Redirect to provider OAuth flow
        const authUrl = `${apiEndpoint}/auth/${provider}?redirect=${encodeURIComponent(window.location.origin + '/auth/social/callback')}`;
        window.location.href = authUrl;
      } catch (error) {
        console.error(`Failed to login with ${provider}:`, error);
        throw error;
      }
    },
    [apiEndpoint]
  );

  const connectProvider = useCallback(
    async (provider: string): Promise<SocialAuthConnection> => {
      try {
        const response = await fetch(`${apiEndpoint}/connect/${provider}`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to connect ${provider}`);
        }

        const connection = await response.json();

        // Update connections list
        setConnections(prev => [...prev.filter(c => c.provider !== provider), connection]);

        return connection;
      } catch (error) {
        console.error(`Failed to connect ${provider}:`, error);
        throw error;
      }
    },
    [apiEndpoint]
  );

  const disconnectProvider = useCallback(
    async (provider: string) => {
      try {
        const response = await fetch(`${apiEndpoint}/disconnect/${provider}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to disconnect ${provider}`);
        }

        // Remove from connections list
        setConnections(prev => prev.filter(c => c.provider !== provider));
      } catch (error) {
        console.error(`Failed to disconnect ${provider}:`, error);
        throw error;
      }
    },
    [apiEndpoint]
  );

  const refreshConnections = useCallback(async () => {
    try {
      const response = await fetch(`${apiEndpoint}/connections`, {
        credentials: 'include',
      });

      if (response.ok) {
        const connectionsData = await response.json();
        setConnections(connectionsData);
      }
    } catch (error) {
      console.error('Failed to refresh connections:', error);
    }
  }, [apiEndpoint]);

  const updateConnection = useCallback(
    async (provider: string, updates: Partial<SocialAuthConnection>) => {
      try {
        const response = await fetch(`${apiEndpoint}/connections/${provider}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error(`Failed to update ${provider} connection`);
        }

        const updatedConnection = await response.json();

        // Update connections list
        setConnections(prev => prev.map(c => (c.provider === provider ? updatedConnection : c)));
      } catch (error) {
        console.error(`Failed to update ${provider} connection:`, error);
        throw error;
      }
    },
    [apiEndpoint]
  );

  const updatePrivacySettings = useCallback(
    async (settings: Partial<SocialAuthUser['privacySettings']>) => {
      if (!user) return;

      try {
        const response = await fetch(`${apiEndpoint}/privacy`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        });

        if (!response.ok) {
          throw new Error('Failed to update privacy settings');
        }

        const updatedSettings = await response.json();

        // Update user with new privacy settings
        setUser(prev => (prev ? { ...prev, privacySettings: updatedSettings } : null));
      } catch (error) {
        console.error('Failed to update privacy settings:', error);
        throw error;
      }
    },
    [apiEndpoint, user]
  );

  const isProviderConnected = useCallback(
    (provider: string): boolean => {
      return connections.some(c => c.provider === provider && c.isConnected);
    },
    [connections]
  );

  const getConnection = useCallback(
    (provider: string): SocialAuthConnection | undefined => {
      return connections.find(c => c.provider === provider);
    },
    [connections]
  );

  const canConnect = useCallback(
    (provider: string): boolean => {
      // Check if user allows social connections and provider isn't already connected
      return user?.privacySettings.allowSocialLogin !== false && !isProviderConnected(provider);
    },
    [user, isProviderConnected]
  );

  const contextValue: SocialAuthContextType = {
    user,
    connections,
    isLoading,

    // Authentication methods
    loginWithProvider,
    connectProvider,
    disconnectProvider,

    // Connection management
    refreshConnections,
    updateConnection,

    // Privacy management
    updatePrivacySettings,

    // Utility methods
    isProviderConnected,
    getConnection,
    canConnect,
  };

  return <SocialAuthContext.Provider value={contextValue}>{children}</SocialAuthContext.Provider>;
}

export function useSocialAuth(): SocialAuthContextType {
  const context = useContext(SocialAuthContext);
  if (context === undefined) {
    throw new Error('useSocialAuth must be used within a SocialAuthProvider');
  }
  return context;
}

export default SocialAuthProvider;
