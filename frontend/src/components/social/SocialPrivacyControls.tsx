'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Users,
  Eye,
  Lock,
  Globe,
  UserX,
  Settings,
  AlertTriangle,
  Check,
  Save,
  RefreshCw,
} from 'lucide-react';
import { useSocialAuth } from './SocialAuthProvider';

interface PrivacySettings {
  // Core privacy settings
  allowSocialLogin: boolean;
  sharePersonalInfo: boolean;
  allowFriendDiscovery: boolean;
  showOnlineStatus: boolean;

  // Activity visibility
  activityVisibility: 'public' | 'friends' | 'private';
  shareWatchActivity: boolean;
  shareRatings: boolean;
  shareReviews: boolean;
  shareFavorites: boolean;

  // Friend settings
  friendRequestsFrom: 'everyone' | 'friends_of_friends' | 'no_one';
  autoAcceptFriends: boolean;
  allowFriendSuggestions: boolean;
  showMutualFriends: boolean;

  // Content sharing
  allowContentRecommendations: boolean;
  shareToSocialPlatforms: boolean;
  autoShareActivity: boolean;

  // Notifications
  notifyOnFriendRequest: boolean;
  notifyOnFriendActivity: boolean;
  notifyOnRecommendations: boolean;
  notifyOnMentions: boolean;

  // Data settings
  allowDataCollection: boolean;
  shareAnalytics: boolean;
  allowPersonalization: boolean;

  // Platform-specific settings
  platformSettings: Record<
    string,
    {
      connected: boolean;
      shareActivity: boolean;
      importFriends: boolean;
      crossPost: boolean;
      syncProfile: boolean;
    }
  >;
}

interface BlockedUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  blockedAt: string;
  reason?: string;
}

interface SocialPrivacyControlsProps {
  className?: string;
}

export function SocialPrivacyControls({ className = '' }: SocialPrivacyControlsProps) {
  const { user: _user, connections, updatePrivacySettings } = useSocialAuth();
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<
    'general' | 'activity' | 'friends' | 'content' | 'notifications' | 'data' | 'platforms' | 'blocked'
  >('general');
  const [showPlatformDetails, setShowPlatformDetails] = useState<Record<string, boolean>>({});

  // Load privacy settings
  useEffect(() => {
    loadPrivacySettings();
    loadBlockedUsers();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/social-auth/privacy/detailed', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
      setError('Failed to load privacy settings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBlockedUsers = async () => {
    try {
      const response = await fetch('/api/social-auth/blocked-users', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setBlockedUsers(data.blockedUsers);
      }
    } catch (error) {
      console.error('Failed to load blocked users:', error);
    }
  };

  const updateSetting = useCallback((key: keyof PrivacySettings, value: string | boolean) => {
    setSettings(prev => (prev ? { ...prev, [key]: value } : null));
  }, []);

  const updatePlatformSetting = useCallback((platform: string, key: string, value: boolean) => {
    setSettings(prev =>
      prev
        ? {
            ...prev,
            platformSettings: {
              ...prev.platformSettings,
              [platform]: {
                ...prev.platformSettings[platform],
                [key]: value,
              },
            },
          }
        : null
    );
  }, []);

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch('/api/social-auth/privacy/detailed', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSuccessMessage('Privacy settings updated successfully');
        setTimeout(() => setSuccessMessage(null), 3000);

        // Update the auth context with core settings
        await updatePrivacySettings({
          allowSocialLogin: settings.allowSocialLogin,
          sharePersonalInfo: settings.sharePersonalInfo,
          allowFriendDiscovery: settings.allowFriendDiscovery,
          showOnlineStatus: settings.showOnlineStatus,
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
      setError('Failed to save privacy settings');
    } finally {
      setIsSaving(false);
    }
  };

  const _blockUser = async (userId: string, reason?: string) => {
    try {
      const response = await fetch('/api/social-auth/block-user', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, reason }),
      });

      if (response.ok) {
        loadBlockedUsers();
      }
    } catch (error) {
      console.error('Failed to block user:', error);
    }
  };

  const unblockUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/social-auth/unblock-user/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setBlockedUsers(prev => prev.filter(user => user.id !== userId));
      }
    } catch (error) {
      console.error('Failed to unblock user:', error);
    }
  };

  const getVisibilityIcon = (level: string) => {
    switch (level) {
      case 'public':
        return <Globe size={16} className="text-primary" />;
      case 'friends':
        return <Users size={16} className="text-success" />;
      case 'private':
        return <Lock size={16} className="text-muted-foreground" />;
      default:
        return <Eye size={16} className="text-muted-foreground" />;
    }
  };

  const renderToggleSwitch = (enabled: boolean, onChange: (value: boolean) => void, disabled = false) => (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
        enabled ? 'bg-primary' : 'bg-muted'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  const renderSection = () => {
    if (!settings) return null;

    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">General Privacy Settings</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-foreground">Allow Social Login</label>
                    <p className="text-sm text-muted-foreground">Enable logging in with social media accounts</p>
                  </div>
                  {renderToggleSwitch(settings.allowSocialLogin, value => updateSetting('allowSocialLogin', value))}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-foreground">Share Personal Information</label>
                    <p className="text-sm text-muted-foreground">Allow sharing basic profile info with friends</p>
                  </div>
                  {renderToggleSwitch(settings.sharePersonalInfo, value => updateSetting('sharePersonalInfo', value))}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-foreground">Enable Friend Discovery</label>
                    <p className="text-sm text-muted-foreground">Allow others to find and connect with you</p>
                  </div>
                  {renderToggleSwitch(settings.allowFriendDiscovery, value =>
                    updateSetting('allowFriendDiscovery', value)
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-foreground">Show Online Status</label>
                    <p className="text-sm text-muted-foreground">Display when you&apos;re active on the platform</p>
                  </div>
                  {renderToggleSwitch(settings.showOnlineStatus, value => updateSetting('showOnlineStatus', value))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Activity Visibility</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Default Activity Visibility</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['public', 'friends', 'private'] as const).map(level => (
                      <button
                        key={level}
                        onClick={() => updateSetting('activityVisibility', level)}
                        className={`flex items-center justify-center space-x-2 p-3 rounded-lg border transition-colors ${
                          settings.activityVisibility === level
                            ? 'border-primary bg-accent text-accent-foreground'
                            : 'border-border hover:bg-accent'
                        }`}
                      >
                        {getVisibilityIcon(level)}
                        <span className="text-sm font-medium capitalize">{level}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-foreground">Share Watch Activity</label>
                      <p className="text-sm text-muted-foreground">Show what you&apos;re watching to friends</p>
                    </div>
                    {renderToggleSwitch(settings.shareWatchActivity, value =>
                      updateSetting('shareWatchActivity', value)
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-foreground">Share Ratings</label>
                      <p className="text-sm text-muted-foreground">Show your ratings to others</p>
                    </div>
                    {renderToggleSwitch(settings.shareRatings, value => updateSetting('shareRatings', value))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-foreground">Share Reviews</label>
                      <p className="text-sm text-muted-foreground">Make your reviews visible to others</p>
                    </div>
                    {renderToggleSwitch(settings.shareReviews, value => updateSetting('shareReviews', value))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-foreground">Share Favorites</label>
                      <p className="text-sm text-muted-foreground">Show your favorite content to friends</p>
                    </div>
                    {renderToggleSwitch(settings.shareFavorites, value => updateSetting('shareFavorites', value))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'friends':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Friend Settings</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Accept Friend Requests From</label>
                  <div className="space-y-2">
                    {(
                      [
                        { value: 'everyone', label: 'Everyone', desc: 'Anyone can send you friend requests' },
                        {
                          value: 'friends_of_friends',
                          label: 'Friends of Friends',
                          desc: 'Only friends of your friends can send requests',
                        },
                        { value: 'no_one', label: 'No One', desc: 'Disable friend requests completely' },
                      ] as const
                    ).map(option => (
                      <label
                        key={option.value}
                        className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-accent cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="friendRequests"
                          value={option.value}
                          checked={settings.friendRequestsFrom === option.value}
                          onChange={() => updateSetting('friendRequestsFrom', option.value)}
                          className="text-primary"
                        />
                        <div>
                          <div className="text-sm font-medium text-foreground">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-foreground">Auto-Accept Friend Requests</label>
                      <p className="text-sm text-muted-foreground">
                        Automatically accept requests from trusted sources
                      </p>
                    </div>
                    {renderToggleSwitch(settings.autoAcceptFriends, value => updateSetting('autoAcceptFriends', value))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-foreground">Allow Friend Suggestions</label>
                      <p className="text-sm text-muted-foreground">Show you in others&apos; friend suggestions</p>
                    </div>
                    {renderToggleSwitch(settings.allowFriendSuggestions, value =>
                      updateSetting('allowFriendSuggestions', value)
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-foreground">Show Mutual Friends</label>
                      <p className="text-sm text-muted-foreground">Display mutual friends to others</p>
                    </div>
                    {renderToggleSwitch(settings.showMutualFriends, value => updateSetting('showMutualFriends', value))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'platforms':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Platform Settings</h3>

              <div className="space-y-4">
                {connections.map(connection => {
                  const platformSettings = settings.platformSettings[connection.provider] || {
                    connected: connection.isConnected,
                    shareActivity: false,
                    importFriends: false,
                    crossPost: false,
                    syncProfile: false,
                  };

                  return (
                    <div key={connection.provider} className="border border-border rounded-lg p-4 bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                            <span className="text-sm">{connection.provider[0].toUpperCase()}</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground capitalize">{connection.provider}</h4>
                            <p className="text-sm text-muted-foreground">@{connection.username}</p>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            setShowPlatformDetails(prev => ({
                              ...prev,
                              [connection.provider]: !prev[connection.provider],
                            }))
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Settings size={16} />
                        </button>
                      </div>

                      {showPlatformDetails[connection.provider] && (
                        <div className="space-y-3 pt-3 border-t border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-foreground">Share Activity</span>
                            {renderToggleSwitch(
                              platformSettings.shareActivity,
                              value => updatePlatformSetting(connection.provider, 'shareActivity', value),
                              !connection.isConnected
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-foreground">Import Friends</span>
                            {renderToggleSwitch(
                              platformSettings.importFriends,
                              value => updatePlatformSetting(connection.provider, 'importFriends', value),
                              !connection.isConnected
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-foreground">Cross-Post Content</span>
                            {renderToggleSwitch(
                              platformSettings.crossPost,
                              value => updatePlatformSetting(connection.provider, 'crossPost', value),
                              !connection.isConnected
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-foreground">Sync Profile</span>
                            {renderToggleSwitch(
                              platformSettings.syncProfile,
                              value => updatePlatformSetting(connection.provider, 'syncProfile', value),
                              !connection.isConnected
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'blocked':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Blocked Users</h3>

              {blockedUsers.length === 0 ? (
                <div className="text-center py-8 bg-muted rounded-lg">
                  <UserX size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h4 className="text-lg font-medium text-foreground mb-2">No Blocked Users</h4>
                  <p className="text-muted-foreground">You haven&apos;t blocked any users yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-card border border-border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={user.avatar || '/default-avatar.png'}
                          alt={user.displayName}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <h4 className="font-medium text-foreground">{user.displayName}</h4>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                          <p className="text-xs text-muted-foreground">
                            Blocked {new Date(user.blockedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => unblockUser(user.id)}
                        className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw size={32} className="animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading privacy settings...</p>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Privacy & Security</h1>
        <p className="text-muted-foreground">
          Manage your social privacy settings and control how your information is shared
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-6 bg-error/10 border border-error/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={20} className="text-error" />
            <p className="text-error">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-success/10 border border-success/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Check size={20} className="text-success" />
            <p className="text-success">{successMessage}</p>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 space-y-1">
          {(
            [
              { id: 'general', label: 'General', icon: Shield },
              { id: 'activity', label: 'Activity', icon: Eye },
              { id: 'friends', label: 'Friends', icon: Users },
              { id: 'platforms', label: 'Platforms', icon: Globe },
              { id: 'blocked', label: 'Blocked Users', icon: UserX },
            ] as const
          ).map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                  activeSection === section.id
                    ? 'bg-accent text-accent-foreground border-r-2 border-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium">{section.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-card rounded-lg border border-border p-6">
            {renderSection()}

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-border mt-6">
              <button
                onClick={saveSettings}
                disabled={isSaving}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SocialPrivacyControls;
