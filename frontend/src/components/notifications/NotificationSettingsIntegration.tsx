'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  User,
  Settings,
  Shield,
  Mail,
  Smartphone,
  Star,
  Volume2,
  VolumeX,
  Globe,
  Palette,
  Moon,
  Sun,
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { NotificationSettings } from './NotificationPreferences';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  preferences: {
    language: string;
    timezone: string;
    region: string;
    theme: 'light' |  'auto';
    accessibility: {
      highContrast: boolean;
      reducedMotion: boolean;
      screenReader: boolean;
    };
  };
  subscription: {
    tier: 'free' | 'premium' | 'family';
    status: 'active' | 'cancelled' | 'expired';
    expiresAt?: Date;
  };
  privacy: {
    profilePublic: boolean;
    shareWatchHistory: boolean;
    allowRecommendations: boolean;
    dataCollection: boolean;
  };
  createdAt: Date;
  lastLoginAt: Date;
}

interface NotificationSettingsIntegrationProps {
  className?: string;
  userProfile: UserProfile;
  notificationSettings: NotificationSettings;
  onProfileUpdate?: (profile: Partial<UserProfile>) => void;
  onNotificationSettingsUpdate?: (settings: Partial<NotificationSettings>) => void;
  onSync?: () => Promise<void>;
  enableBiometricAuth?: boolean;
  showAdvancedOptions?: boolean;
}

export function NotificationSettingsIntegration({
  className = '',
  userProfile,
  notificationSettings,
  onProfileUpdate,
  onNotificationSettingsUpdate,
  onSync,
  enableBiometricAuth: _enableBiometricAuth = false,
  showAdvancedOptions: _showAdvancedOptions = true,
}: NotificationSettingsIntegrationProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'success' | 'error' | 'pending' | null>(null);
  const [activeTab, setActiveTab] = useState('profile');

  // Auto-sync when settings change
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (onSync) {
        handleSync();
      }
    }, 2000);

    return () => clearTimeout(debounceTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationSettings, onSync]);

  const handleSync = useCallback(async () => {
    if (!onSync) return;

    setIsSyncing(true);
    setSyncStatus('pending');

    try {
      await onSync();
      setLastSyncTime(new Date());
      setSyncStatus('success');
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);

      // Clear status after 3 seconds
      setTimeout(() => setSyncStatus(null), 3000);
    }
  }, [onSync]);

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      onProfileUpdate?.(updates);
    },
    [onProfileUpdate]
  );

  const updateNotificationSettings = useCallback(
    (updates: Partial<NotificationSettings>) => {
      const newSettings = { ...notificationSettings, ...updates };
      onNotificationSettingsUpdate?.(newSettings);
    },
    [notificationSettings, onNotificationSettingsUpdate]
  );

  const getSubscriptionBadge = () => {
    const { tier, status } = userProfile.subscription;

    if (status === 'expired' || status === 'cancelled') {
      return <Badge variant="destructive">{status}</Badge>;
    }

    switch (tier) {
      case 'premium':
        return <Badge className="bg-gradient-to-r from-primary to-primary-400 text-white">Premium</Badge>;
      case 'family':
        return <Badge className="bg-gradient-to-r from-info to-success text-white">Family</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-error" />;
      case 'pending':
        return <RefreshCw className="w-4 h-4 animate-spin text-primary" />;
      default:
        return <RefreshCw className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never synced';

    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just synced';
    if (minutes < 60) return `Synced ${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Synced ${hours}h ago`;

    return lastSyncTime.toLocaleDateString();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            {userProfile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userProfile.avatar}
                alt={userProfile.displayName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-info to-primary flex items-center justify-center text-white font-semibold text-lg">
                {userProfile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1">{getSubscriptionBadge()}</div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-foreground">{userProfile.displayName}</h2>
            <p className="text-sm text-muted-foreground">
              @{userProfile.username} • {userProfile.email}
            </p>
            <p className="text-xs text-muted-foreground">Member since {userProfile.createdAt.getFullYear()}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right text-sm">
            <div className="flex items-center space-x-1 text-muted-foreground">
              {getSyncStatusIcon()}
              <span>{formatLastSync()}</span>
            </div>
            {syncStatus === 'error' && <div className="text-error text-xs">Sync failed</div>}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center space-x-2"
          >
            {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            <span>Sync</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Privacy</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Manage your basic account settings and profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Display Name</label>
                  <input
                    type="text"
                    value={userProfile.displayName}
                    onChange={e => updateProfile({ displayName: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Username</label>
                  <input
                    type="text"
                    value={userProfile.username}
                    onChange={e => updateProfile({ username: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Email Address</label>
                  <input
                    type="email"
                    value={userProfile.email}
                    onChange={e => updateProfile({ email: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Subscription</label>
                  <div className="mt-1 flex items-center space-x-2">
                    {getSubscriptionBadge()}
                    <span className="text-sm text-muted-foreground">
                      {userProfile.subscription.status === 'active' && userProfile.subscription.expiresAt
                        ? `Expires ${userProfile.subscription.expiresAt.toLocaleDateString()}`
                        : userProfile.subscription.status}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Notification Integration</span>
              </CardTitle>
              <CardDescription>
                Your notification settings are automatically synced with your profile preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Mail className="w-5 h-5 text-primary" />
                    <span className="font-medium">Email</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {notificationSettings.preferences.filter(p => p.channels.email).length} active
                  </div>
                  <Switch
                    checked={notificationSettings.emailDigest.enabled}
                    onCheckedChange={checked =>
                      updateNotificationSettings({
                        emailDigest: { ...notificationSettings.emailDigest, enabled: checked },
                      })
                    }
                  />
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Smartphone className="w-5 h-5 text-success" />
                    <span className="font-medium">Push</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {notificationSettings.preferences.filter(p => p.channels.push).length} active
                  </div>
                  <Switch
                    checked={notificationSettings.globalEnabled}
                    onCheckedChange={checked => updateNotificationSettings({ globalEnabled: checked })}
                  />
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    {notificationSettings.soundEnabled ? (
                      <Volume2 className="w-5 h-5 text-primary" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="font-medium">Sound</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {notificationSettings.soundEnabled ? 'Enabled' : 'Disabled'}
                  </div>
                  <Switch
                    checked={notificationSettings.soundEnabled}
                    onCheckedChange={checked => updateNotificationSettings({ soundEnabled: checked })}
                  />
                </Card>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Quick Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-warning" />
                      <span className="text-sm">Watchlist Updates</span>
                    </div>
                    <Switch
                      checked={notificationSettings.preferences.some(
                        p => p.category === 'Watchlist' && (p.channels.email || p.channels.push)
                      )}
                      onCheckedChange={checked => {
                        const updatedPreferences = notificationSettings.preferences.map(p =>
                          p.category === 'Watchlist'
                            ? { ...p, channels: { ...p.channels, email: checked, push: checked } }
                            : p
                        );
                        updateNotificationSettings({ preferences: updatedPreferences });
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-error" />
                      <span className="text-sm">Security Alerts</span>
                    </div>
                    <Switch
                      checked={notificationSettings.preferences.some(
                        p => p.category === 'Security' && (p.channels.email || p.channels.push)
                      )}
                      onCheckedChange={checked => {
                        const updatedPreferences = notificationSettings.preferences.map(p =>
                          p.category === 'Security'
                            ? { ...p, channels: { ...p.channels, email: checked, push: checked } }
                            : p
                        );
                        updateNotificationSettings({ preferences: updatedPreferences });
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">System Updates</span>
                    </div>
                    <Switch
                      checked={notificationSettings.preferences.some(
                        p => p.category === 'System' && (p.channels.email || p.channels.push)
                      )}
                      onCheckedChange={checked => {
                        const updatedPreferences = notificationSettings.preferences.map(p =>
                          p.category === 'System'
                            ? { ...p, channels: { ...p.channels, email: checked, push: checked } }
                            : p
                        );
                        updateNotificationSettings({ preferences: updatedPreferences });
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>Regional & Language</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Language</label>
                  <select
                    value={userProfile.preferences.language}
                    onChange={e =>
                      updateProfile({
                        preferences: { ...userProfile.preferences, language: e.target.value },
                      })
                    }
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="it">Italiano</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Timezone</label>
                  <select
                    value={userProfile.preferences.timezone}
                    onChange={e =>
                      updateProfile({
                        preferences: { ...userProfile.preferences, timezone: e.target.value },
                      })
                    }
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">GMT</option>
                    <option value="Europe/Paris">CET</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Region</label>
                  <select
                    value={userProfile.preferences.region}
                    onChange={e =>
                      updateProfile({
                        preferences: { ...userProfile.preferences, region: e.target.value },
                      })
                    }
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5" />
                <span>Appearance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-3 block">Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['light', 'auto'] as const).map(theme => (
                    <button
                      key={theme}
                      onClick={() =>
                        updateProfile({
                          preferences: { ...userProfile.preferences, theme },
                        })
                      }
                      className={`p-3 border rounded-lg flex items-center space-x-2 ${
                        userProfile.preferences.theme === theme
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      {theme === 'light' && <Sun className="w-4 h-4" />}
                      {theme === 'auto' && <Settings className="w-4 h-4" />}
                      <span className="capitalize">{theme}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Accessibility</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">High Contrast</span>
                    <Switch
                      checked={userProfile.preferences.accessibility.highContrast}
                      onCheckedChange={checked =>
                        updateProfile({
                          preferences: {
                            ...userProfile.preferences,
                            accessibility: {
                              ...userProfile.preferences.accessibility,
                              highContrast: checked,
                            },
                          },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Reduced Motion</span>
                    <Switch
                      checked={userProfile.preferences.accessibility.reducedMotion}
                      onCheckedChange={checked =>
                        updateProfile({
                          preferences: {
                            ...userProfile.preferences,
                            accessibility: {
                              ...userProfile.preferences.accessibility,
                              reducedMotion: checked,
                            },
                          },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Screen Reader Support</span>
                    <Switch
                      checked={userProfile.preferences.accessibility.screenReader}
                      onCheckedChange={checked =>
                        updateProfile({
                          preferences: {
                            ...userProfile.preferences,
                            accessibility: {
                              ...userProfile.preferences.accessibility,
                              screenReader: checked,
                            },
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Privacy Settings</span>
              </CardTitle>
              <CardDescription>Control how your data is used and shared</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Public Profile</span>
                    <p className="text-xs text-muted-foreground">
                      Allow others to see your profile and watchlists
                    </p>
                  </div>
                  <Switch
                    checked={userProfile.privacy.profilePublic}
                    onCheckedChange={checked =>
                      updateProfile({
                        privacy: { ...userProfile.privacy, profilePublic: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Share Watch History</span>
                    <p className="text-xs text-muted-foreground">
                      Use your watch history for better recommendations
                    </p>
                  </div>
                  <Switch
                    checked={userProfile.privacy.shareWatchHistory}
                    onCheckedChange={checked =>
                      updateProfile({
                        privacy: { ...userProfile.privacy, shareWatchHistory: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Personalized Recommendations</span>
                    <p className="text-xs text-muted-foreground">
                      Receive content suggestions based on your preferences
                    </p>
                  </div>
                  <Switch
                    checked={userProfile.privacy.allowRecommendations}
                    onCheckedChange={checked =>
                      updateProfile({
                        privacy: { ...userProfile.privacy, allowRecommendations: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Data Collection</span>
                    <p className="text-xs text-muted-foreground">
                      Allow anonymous usage analytics to improve the service
                    </p>
                  </div>
                  <Switch
                    checked={userProfile.privacy.dataCollection}
                    onCheckedChange={checked =>
                      updateProfile({
                        privacy: { ...userProfile.privacy, dataCollection: checked },
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Export My Data
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear Watch History
                </Button>
                <Button variant="destructive" className="w-full justify-start">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
