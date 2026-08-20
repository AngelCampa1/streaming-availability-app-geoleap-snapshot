/**
 * Social Connections Component
 * Displays and manages user's connected social media accounts
 */

'use client';

import React, { useState, useCallback } from 'react';
import { SocialPlatform, SocialConnectionsProps } from '../../types/social';
import { useSocialAuth } from '../../contexts/SocialAuthContext';
import { SocialLoginButton } from './SocialLoginButtons';
import { getSocialColor } from '../../lib/social-platform-colors';
import { logger } from '@/lib/logger';

// Platform configuration
const PLATFORM_CONFIG = {
  [SocialPlatform.Facebook]: {
    name: 'Facebook',
    color: getSocialColor('facebook'),
    icon: '📘',
    description: 'Connect with friends and share your activity',
  },
  [SocialPlatform.Twitter]: {
    name: 'Twitter',
    color: getSocialColor('twitter'),
    icon: '🐦',
    description: 'Share quick updates and discover trending content',
  },
  [SocialPlatform.Instagram]: {
    name: 'Instagram',
    color: getSocialColor('instagram'),
    icon: '📷',
    description: 'Share photos and discover visual content',
  },
  [SocialPlatform.TikTok]: {
    name: 'TikTok',
    color: getSocialColor('tiktok'),
    icon: '🎵',
    description: 'Share short videos and trending content',
  },
  [SocialPlatform.LinkedIn]: {
    name: 'LinkedIn',
    color: getSocialColor('linkedin'),
    icon: '💼',
    description: 'Professional networking and career content',
  },
  [SocialPlatform.YouTube]: {
    name: 'YouTube',
    color: getSocialColor('youtube'),
    icon: '📺',
    description: 'Share and discover video content',
  },
  [SocialPlatform.Discord]: {
    name: 'Discord',
    color: getSocialColor('discord'),
    icon: '🎮',
    description: 'Gaming communities and chat',
  },
  [SocialPlatform.Twitch]: {
    name: 'Twitch',
    color: getSocialColor('twitch'),
    icon: '🎮',
    description: 'Live streaming and gaming content',
  },
  [SocialPlatform.Reddit]: {
    name: 'Reddit',
    color: getSocialColor('reddit'),
    icon: '🔗',
    description: 'Community discussions and content sharing',
  },
  [SocialPlatform.WhatsApp]: {
    name: 'WhatsApp',
    color: getSocialColor('whatsapp'),
    icon: '💬',
    description: 'Private messaging and status sharing',
  },
};

export const SocialConnections: React.FC<SocialConnectionsProps> = ({
  userId: _userId,
  editable = true,
  showPrivacyControls = true,
  onConnectionUpdate,
  className = '',
}) => {
  const {
    connections: _connections,
    isLoading,
    isConnecting,
    error,
    connectProvider,
    disconnectProvider,
    validateConnection,
    isProviderConnected: _isProviderConnected,
    getConnection,
    canConnect,
    clearError,
  } = useSocialAuth();

  const [validatingPlatforms, setValidatingPlatforms] = useState<Set<SocialPlatform>>(new Set());
  const [expandedConnection, setExpandedConnection] = useState<SocialPlatform | null>(null);

  // Handle connection
  const handleConnect = useCallback(
    async (platform: SocialPlatform) => {
      try {
        clearError();
        await connectProvider(platform);
        onConnectionUpdate?.(platform, 'connect');
      } catch (error) {
        console.error(`Failed to connect ${platform}:`, error);
      }
    },
    [connectProvider, onConnectionUpdate, clearError]
  );

  // Handle disconnection
  const handleDisconnect = useCallback(
    async (platform: SocialPlatform) => {
      try {
        clearError();
        await disconnectProvider(platform);
        onConnectionUpdate?.(platform, 'disconnect');
      } catch (error) {
        console.error(`Failed to disconnect ${platform}:`, error);
      }
    },
    [disconnectProvider, onConnectionUpdate, clearError]
  );

  // Handle token validation
  const handleValidateToken = useCallback(
    async (platform: SocialPlatform) => {
      try {
        setValidatingPlatforms(prev => new Set(prev).add(platform));
        clearError();

        const result = await validateConnection(platform);

        if (!result.isValid) {
          // Token is invalid, user needs to reconnect
          console.warn(`${platform} token is invalid, requires reconnection`);
        }
      } catch (error) {
        console.error(`Failed to validate ${platform} token:`, error);
      } finally {
        setValidatingPlatforms(prev => {
          const newSet = new Set(prev);
          newSet.delete(platform);
          return newSet;
        });
      }
    },
    [validateConnection, clearError]
  );

  // Toggle connection details
  const toggleConnectionDetails = useCallback((platform: SocialPlatform) => {
    setExpandedConnection(prev => (prev === platform ? null : platform));
  }, []);

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Unknown';
    }
  };

  // Get platform status
  const getPlatformStatus = (platform: SocialPlatform) => {
    const connection = getConnection(platform);
    if (!connection) return 'disconnected';
    if (!connection.isTokenValid) return 'invalid';
    return 'connected';
  };

  if (isLoading) {
    return (
      <div className={`social-connections loading ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`social-connections ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Social Connections</h2>
        <p className="text-muted-foreground">
          Connect your social media accounts to share content and discover recommendations
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center">
            <span className="text-destructive mr-2">⚠️</span>
            <div>
              <p className="text-destructive font-medium">Connection Error</p>
              <p className="text-destructive text-sm">{error.message}</p>
            </div>
            <button
              onClick={clearError}
              className="ml-auto text-destructive hover:text-destructive/80"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {Object.values(SocialPlatform).map(platform => {
          const config = PLATFORM_CONFIG[platform];
          const connection = getConnection(platform);
          const status = getPlatformStatus(platform);
          const isValidating = validatingPlatforms.has(platform);
          const isConnectingNow = isConnecting[platform];
          const isExpanded = expandedConnection === platform;

          return (
            <div
              key={platform}
              className="border border-border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${config.color}20` }}
                    >
                      {config.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{config.name}</h3>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Status indicator */}
                    <div className="flex items-center space-x-2">
                      {status === 'connected' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 border border-success/20 text-success">
                          ✓ Connected
                        </span>
                      )}
                      {status === 'invalid' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 border border-warning/20 text-warning">
                          ⚠️ Needs Refresh
                        </span>
                      )}
                      {status === 'disconnected' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          Not Connected
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    {editable && (
                      <div className="flex space-x-2">
                        {status === 'disconnected' && (
                          <SocialLoginButton
                            platform={platform}
                            size="small"
                            disabled={!canConnect(platform)}
                            loading={isConnectingNow}
                            onSuccess={() => handleConnect(platform)}
                            onError={error => console.error('Connection error:', error)}
                          />
                        )}

                        {status === 'connected' && (
                          <>
                            <button
                              onClick={() => handleValidateToken(platform)}
                              disabled={isValidating}
                              className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent disabled:opacity-50"
                              aria-label={`Validate ${config.name} connection`}
                            >
                              {isValidating ? 'Validating...' : 'Validate'}
                            </button>
                            <button
                              onClick={() => handleDisconnect(platform)}
                              className="px-3 py-1.5 text-sm text-destructive border border-destructive/20 rounded-md hover:bg-destructive/10"
                              aria-label={`Disconnect ${config.name}`}
                            >
                              Disconnect
                            </button>
                          </>
                        )}

                        {status === 'invalid' && (
                          <button
                            onClick={() => handleConnect(platform)}
                            disabled={isConnectingNow}
                            className="px-3 py-1.5 text-sm bg-warning text-warning-foreground rounded-md hover:bg-warning/90 disabled:opacity-50"
                            aria-label={`Reconnect ${config.name}`}
                          >
                            {isConnectingNow ? 'Reconnecting...' : 'Reconnect'}
                          </button>
                        )}

                        {connection && (
                          <button
                            onClick={() => toggleConnectionDetails(platform)}
                            className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent"
                            aria-label={`${isExpanded ? 'Hide' : 'Show'} ${config.name} details`}
                          >
                            {isExpanded ? '▲' : '▼'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Connection details */}
                {connection && isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Username:</p>
                        <p className="font-medium text-foreground">{connection.username || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Display Name:</p>
                        <p className="font-medium text-foreground">{connection.displayName || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Connected Since:</p>
                        <p className="font-medium text-foreground">{formatDate(connection.connectedAt)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Token Refresh:</p>
                        <p className="font-medium text-foreground">
                          {connection.lastTokenRefresh ? formatDate(connection.lastTokenRefresh) : 'Never'}
                        </p>
                      </div>
                      {connection.followersCount > 0 && (
                        <div>
                          <p className="text-muted-foreground">Followers:</p>
                          <p className="font-medium text-foreground">{connection.followersCount.toLocaleString()}</p>
                        </div>
                      )}
                      {connection.followingCount > 0 && (
                        <div>
                          <p className="text-muted-foreground">Following:</p>
                          <p className="font-medium text-foreground">{connection.followingCount.toLocaleString()}</p>
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <p className="text-muted-foreground">Granted Permissions:</p>
                        <p className="font-medium text-foreground">{connection.grantedScopes || 'Basic permissions'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showPrivacyControls && (
        <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-primary">🔒</span>
            <h3 className="font-medium text-primary">Privacy & Data</h3>
          </div>
          <p className="text-primary/80 text-sm mb-3">
            Your social media data is used only for personalized recommendations and sharing features. You can control
            your privacy settings at any time.
          </p>
          <button
            className="text-primary hover:text-primary/80 text-sm font-medium"
            onClick={() => {
              // This would open privacy settings modal/page
              logger.info('[SocialConnections] Opening privacy settings');
            }}
          >
            Manage Privacy Settings →
          </button>
        </div>
      )}
    </div>
  );
};

export default SocialConnections;
