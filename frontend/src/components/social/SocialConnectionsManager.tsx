'use client';

import React, { useState, useCallback } from 'react';
import {
  Settings,
  Unlink,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { useSocialAuth, SocialAuthConnection } from './SocialAuthProvider';
import { SocialLoginGroup, COMMON_PROVIDERS } from './SocialLoginButton';

interface ConnectionCardProps {
  connection: SocialAuthConnection;
  onDisconnect: (provider: string) => Promise<void>;
  onRefresh: (provider: string) => Promise<void>;
  onUpdateSettings: (provider: string, settings: Partial<SocialAuthConnection>) => Promise<void>;
}

function ConnectionCard({ connection, onDisconnect, onRefresh, onUpdateSettings }: ConnectionCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleDisconnect = async () => {
    if (confirm(`Are you sure you want to disconnect your ${connection.provider} account?`)) {
      await onDisconnect(connection.provider);
    }
  };

  const handleRefresh = async () => {
    setIsUpdating(true);
    try {
      await onRefresh(connection.provider);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleVisibility = async () => {
    await onUpdateSettings(connection.provider, {
      permissions: connection.permissions.includes('public_profile')
        ? connection.permissions.filter(p => p !== 'public_profile')
        : [...connection.permissions, 'public_profile'],
    });
  };

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      google: '🌐',
      facebook: '📘',
      twitter: '𝕏',
      github: '🐱',
      linkedin: '💼',
      discord: '🎮',
    };
    return icons[provider] || '🔗';
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      google: 'border-destructive/30 bg-destructive/5',
      facebook: 'border-primary/30 bg-primary/5',
      twitter: 'border-border bg-muted',
      github: 'border-border bg-muted',
      linkedin: 'border-primary/30 bg-primary/5',
      discord: 'border-accent/30 bg-accent/5',
    };
    return colors[provider] || 'border-border bg-muted';
  };

  const isPublic = connection.permissions.includes('public_profile');

  return (
    <div className={`border-2 rounded-lg p-4 ${getProviderColor(connection.provider)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-2xl" role="img">
            {getProviderIcon(connection.provider)}
          </span>
          <div>
            <h3 className="font-semibold text-foreground capitalize">{connection.provider}</h3>
            <p className="text-sm text-muted-foreground">Connected as {connection.displayName}</p>
            <p className="text-xs text-muted-foreground">{new Date(connection.connectedAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-background/50"
            title="Settings"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={handleRefresh}
            disabled={isUpdating}
            className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-background/50 disabled:opacity-50"
            title="Refresh connection"
          >
            <RefreshCw size={16} className={isUpdating ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleDisconnect}
            className="p-2 text-destructive hover:text-destructive/80 rounded-md hover:bg-background/50"
            title="Disconnect"
          >
            <Unlink size={16} />
          </button>
        </div>
      </div>

      {connection.avatar && (
        <div className="flex items-center space-x-2 mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={connection.avatar} alt={`${connection.displayName} avatar`} className="w-8 h-8 rounded-full" />
          {connection.profileUrl && (
            <a
              href={connection.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 text-sm inline-flex items-center space-x-1"
            >
              <span>View profile</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            {connection.isConnected ? (
              <CheckCircle size={16} className="text-success" />
            ) : (
              <AlertTriangle size={16} className="text-warning" />
            )}
            <span className={connection.isConnected ? 'text-success' : 'text-warning'}>
              {connection.isConnected ? 'Connected' : 'Needs attention'}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            {isPublic ? <Eye size={16} className="text-primary" /> : <EyeOff size={16} className="text-muted-foreground" />}
            <span className="text-muted-foreground">{isPublic ? 'Public' : 'Private'}</span>
          </div>
        </div>

        <button onClick={handleToggleVisibility} className="text-primary hover:text-primary/80 text-sm font-medium">
          {isPublic ? 'Make Private' : 'Make Public'}
        </button>
      </div>

      {showSettings && (
        <div className="mt-4 p-3 bg-background/70 rounded-md border border-border">
          <h4 className="font-medium text-sm mb-2 text-foreground">Connection Settings</h4>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={connection.permissions.includes('friend_discovery')}
                onChange={e =>
                  onUpdateSettings(connection.provider, {
                    permissions: e.target.checked
                      ? [...connection.permissions, 'friend_discovery']
                      : connection.permissions.filter(p => p !== 'friend_discovery'),
                  })
                }
                className="rounded border-border"
              />
              <span className="text-sm text-foreground">Allow friend discovery</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={connection.permissions.includes('activity_sharing')}
                onChange={e =>
                  onUpdateSettings(connection.provider, {
                    permissions: e.target.checked
                      ? [...connection.permissions, 'activity_sharing']
                      : connection.permissions.filter(p => p !== 'activity_sharing'),
                  })
                }
                className="rounded border-border"
              />
              <span className="text-sm text-foreground">Share activity updates</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={connection.permissions.includes('recommendation_sync')}
                onChange={e =>
                  onUpdateSettings(connection.provider, {
                    permissions: e.target.checked
                      ? [...connection.permissions, 'recommendation_sync']
                      : connection.permissions.filter(p => p !== 'recommendation_sync'),
                  })
                }
                className="rounded border-border"
              />
              <span className="text-sm text-foreground">Sync recommendations</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

interface PrivacyControlsProps {
  onUpdate: (settings: Record<string, boolean>) => Promise<void>;
}

function PrivacyControls({ onUpdate }: PrivacyControlsProps) {
  const { user } = useSocialAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePrivacyChange = async (key: string, value: boolean) => {
    setIsUpdating(true);
    try {
      await onUpdate({ [key]: value });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Shield className="text-primary" size={20} />
        <h2 className="text-lg font-semibold text-foreground">Privacy Controls</h2>
      </div>

      <div className="space-y-4">
        <label className="flex items-center justify-between">
          <div>
            <div className="font-medium text-foreground">Allow Social Login</div>
            <div className="text-sm text-muted-foreground">Enable logging in with social accounts</div>
          </div>
          <input
            type="checkbox"
            checked={user.privacySettings.allowSocialLogin}
            onChange={e => handlePrivacyChange('allowSocialLogin', e.target.checked)}
            disabled={isUpdating}
            className="rounded border-border"
          />
        </label>

        <label className="flex items-center justify-between">
          <div>
            <div className="font-medium text-foreground">Share Personal Information</div>
            <div className="text-sm text-muted-foreground">Allow sharing profile info with connected services</div>
          </div>
          <input
            type="checkbox"
            checked={user.privacySettings.sharePersonalInfo}
            onChange={e => handlePrivacyChange('sharePersonalInfo', e.target.checked)}
            disabled={isUpdating}
            className="rounded border-border"
          />
        </label>

        <label className="flex items-center justify-between">
          <div>
            <div className="font-medium text-foreground">Friend Discovery</div>
            <div className="text-sm text-muted-foreground">Let friends find you through social connections</div>
          </div>
          <input
            type="checkbox"
            checked={user.privacySettings.allowFriendDiscovery}
            onChange={e => handlePrivacyChange('allowFriendDiscovery', e.target.checked)}
            disabled={isUpdating}
            className="rounded border-border"
          />
        </label>

        <label className="flex items-center justify-between">
          <div>
            <div className="font-medium text-foreground">Show Online Status</div>
            <div className="text-sm text-muted-foreground">Display when you&apos;re active to friends</div>
          </div>
          <input
            type="checkbox"
            checked={user.privacySettings.showOnlineStatus}
            onChange={e => handlePrivacyChange('showOnlineStatus', e.target.checked)}
            disabled={isUpdating}
            className="rounded border-border"
          />
        </label>
      </div>
    </div>
  );
}

export function SocialConnectionsManager() {
  const { connections, disconnectProvider, refreshConnections, updateConnection, updatePrivacySettings } =
    useSocialAuth();

  const [activeTab, setActiveTab] = useState<'connections' | 'privacy' | 'add'>('connections');

  const handleDisconnect = useCallback(
    async (provider: string) => {
      try {
        await disconnectProvider(provider);
      } catch (error) {
        console.error('Failed to disconnect provider:', error);
      }
    },
    [disconnectProvider]
  );

  const handleRefresh = useCallback(
    async (provider: string) => {
      try {
        await updateConnection(provider, { connectedAt: new Date().toISOString() });
        await refreshConnections();
      } catch (error) {
        console.error('Failed to refresh connection:', error);
      }
    },
    [updateConnection, refreshConnections]
  );

  const handleUpdateSettings = useCallback(
    async (provider: string, settings: Partial<SocialAuthConnection>) => {
      try {
        await updateConnection(provider, settings);
      } catch (error) {
        console.error('Failed to update connection settings:', error);
      }
    },
    [updateConnection]
  );

  type TabId = 'connections' | 'privacy' | 'add';

  const tabs: { id: TabId; label: string; icon: typeof Users; count?: number }[] = [
    { id: 'connections', label: 'Connections', icon: Users, count: connections.length },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'add', label: 'Add Account', icon: Settings },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Social Connections</h1>
        <p className="text-muted-foreground">Manage your social media accounts and privacy settings</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-muted rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === tab.id ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'connections' && (
        <div className="space-y-4">
          {connections.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-lg">
              <Users size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No social connections</h3>
              <p className="text-muted-foreground mb-4">Connect your social media accounts to get started</p>
              <button
                onClick={() => setActiveTab('add')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Add Account
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {connections.map(connection => (
                <ConnectionCard
                  key={connection.provider}
                  connection={connection}
                  onDisconnect={handleDisconnect}
                  onRefresh={handleRefresh}
                  onUpdateSettings={handleUpdateSettings}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'privacy' && <PrivacyControls onUpdate={updatePrivacySettings} />}

      {activeTab === 'add' && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Add Social Account</h2>
          <p className="text-muted-foreground mb-6">
            Connect your social media accounts to enable friend discovery, activity sharing, and more.
          </p>

          <SocialLoginGroup
            providers={COMMON_PROVIDERS}
            variant="connect"
            layout="grid"
            onSuccess={(provider, connection) => {
              logger.info('[SocialConnectionsManager] Successfully connected provider', { provider, connection });
              // Optionally switch back to connections tab
              setActiveTab('connections');
            }}
            onError={(provider, error) => {
              console.error(`Failed to connect ${provider}:`, error);
              alert(`Failed to connect ${provider}: ${error.message}`);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default SocialConnectionsManager;
