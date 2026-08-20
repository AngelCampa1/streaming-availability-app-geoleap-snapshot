'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationPreferences, NotificationSettings } from '@/components/notifications/NotificationPreferences';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { NotificationHistory } from '@/components/notifications/NotificationHistory';
import { PushNotificationSetup } from '@/components/notifications/PushNotificationSetup';
import { EmailTemplatePreview } from '@/components/notifications/EmailTemplatePreview';
import {
  NotificationSettingsIntegration,
  UserProfile,
} from '@/components/notifications/NotificationSettingsIntegration';
import {
  RealTimeNotificationProvider,
  defaultNotificationConfig,
} from '@/components/notifications/RealTimeNotificationProvider';
import { Bell, Settings, History, Smartphone, Mail, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiCall } from '@/lib/api';

export default function NotificationSettingsPage() {
  const [activeTab, setActiveTab] = useState('center');
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const response = await apiCall('/api/user-profile/me', {
          credentials: 'include',
        }) as {
          preferences?: {
            language?: string;
            timezone?: string;
            region?: string;
            theme?: string;
            accessibility?: {
              highContrast?: boolean;
              reducedMotion?: boolean;
              screenReader?: boolean;
            };
          };
          subscription?: {
            tier?: string;
            status?: string;
            expiresAt?: string;
          };
          privacy?: {
            profilePublic?: boolean;
            shareWatchHistory?: boolean;
            allowRecommendations?: boolean;
            dataCollection?: boolean;
          };
        };

        // Transform backend response to UserProfile format
        setUserProfile({
          id: user.id,
          email: user.email,
          username: user.email.split('@')[0],
          displayName: `${user.firstName} ${user.lastName}`,
          avatar: undefined,
          preferences: {
            language: response.preferences?.language || 'en',
            timezone: response.preferences?.timezone || 'America/New_York',
            region: response.preferences?.region || 'US',
            theme: (response.preferences?.theme as 'light' |  'auto') || 'light',
            accessibility: {
              highContrast: response.preferences?.accessibility?.highContrast || false,
              reducedMotion: response.preferences?.accessibility?.reducedMotion || false,
              screenReader: response.preferences?.accessibility?.screenReader || false,
            },
          },
          subscription: {
            tier: (response.subscription?.tier as 'free' | 'premium' | 'family') || 'free',
            status: (response.subscription?.status as 'active' | 'cancelled' | 'expired') || 'active',
            expiresAt: response.subscription?.expiresAt ? new Date(response.subscription.expiresAt) : undefined,
          },
          privacy: {
            profilePublic: response.privacy?.profilePublic ?? true,
            shareWatchHistory: response.privacy?.shareWatchHistory ?? true,
            allowRecommendations: response.privacy?.allowRecommendations ?? true,
            dataCollection: response.privacy?.dataCollection ?? true,
          },
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
          lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : new Date(),
        });
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        // Use fallback from auth context
        if (user) {
          setUserProfile({
            id: user.id,
            email: user.email,
            username: user.email.split('@')[0],
            displayName: `${user.firstName} ${user.lastName}`,
            avatar: undefined,
            preferences: {
              language: 'en',
              timezone: 'America/New_York',
              region: 'US',
              theme: 'light',
              accessibility: { highContrast: false, reducedMotion: false, screenReader: false },
            },
            subscription: { tier: 'free', status: 'active' },
            privacy: { profilePublic: true, shareWatchHistory: true, allowRecommendations: true, dataCollection: true },
            createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
            lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : new Date(),
          });
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  // Real-time notification configuration - use authenticated user
  const notificationConfig = {
    ...defaultNotificationConfig,
    userId: user?.id || '',
    authToken: '', // Not needed - using httpOnly cookies
  };

  const handleNotificationAction = (_notificationId: string, _actionId: string) => {
    // Handle notification actions (e.g., navigate to content, mark as read)
  };

  /**
   * Handles notification settings changes and persists them to the backend
   * @param settings - The updated notification settings configuration
   */
  const handleSettingsChange = (_settings: Partial<NotificationSettings>) => {
    // Save settings to backend
  };

  const handleProfileUpdate = (_profile: Partial<UserProfile>) => {
    // Update profile in backend
  };

  const handleSync = async () => {
    // Sync preferences with backend
    await apiCall('/api/preferences/resolved', {
      credentials: 'include',
    });
  };

  const handleSendTestEmail = async (templateId: string, recipientEmail: string) => {
    // Send test email via API
    await apiCall('/api/notifications/test-channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ templateId, recipientEmail, channel: 'email' }),
    });
  };

  return (
    <RealTimeNotificationProvider config={notificationConfig}>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Notification Settings</h1>
            <p className="mt-2 text-muted-foreground">
              Manage how and when you receive notifications from GeoLeap
            </p>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="center" className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Center</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Preferences</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center space-x-2">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
              <TabsTrigger value="push" className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">Push</span>
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">Email</span>
              </TabsTrigger>
              <TabsTrigger value="integration" className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
            </TabsList>

            {/* Notification Center */}
            <TabsContent value="center">
              <NotificationCenter
                onNotificationAction={handleNotificationAction}
                onSettingsClick={() => setActiveTab('preferences')}
                maxNotifications={50}
                autoRefresh={true}
              />
            </TabsContent>

            {/* Notification Preferences */}
            <TabsContent value="preferences">
              <NotificationPreferences
                onSettingsChange={handleSettingsChange}
                initialSettings={{
                  globalEnabled: true,
                  soundEnabled: true,
                  vibrationEnabled: true,
                  emailDigest: {
                    enabled: true,
                    frequency: 'daily',
                    time: '09:00',
                  },
                }}
              />
            </TabsContent>

            {/* Notification History */}
            <TabsContent value="history">
              <NotificationHistory maxItems={100} showAnalytics={true} onExport={_data => {}} />
            </TabsContent>

            {/* Push Notification Setup */}
            <TabsContent value="push">
              <PushNotificationSetup
                vapidPublicKey="your-vapid-public-key"
                serviceWorkerPath="/sw.js"
              />
            </TabsContent>

            {/* Email Template Preview */}
            <TabsContent value="email">
              <EmailTemplatePreview onSendTest={handleSendTestEmail} enableEditing={true} />
            </TabsContent>

            {/* Profile Integration */}
            <TabsContent value="integration">
              {userProfile && (
              <NotificationSettingsIntegration
                userProfile={userProfile}
                notificationSettings={{
                  globalEnabled: true,
                  soundEnabled: true,
                  vibrationEnabled: true,
                  emailDigest: {
                    enabled: true,
                    frequency: 'daily',
                    time: '09:00',
                  },
                  preferences: [],
                  customRules: [],
                }}
                onProfileUpdate={handleProfileUpdate}
                onNotificationSettingsUpdate={handleSettingsChange}
                onSync={handleSync}
                enableBiometricAuth={true}
                showAdvancedOptions={true}
              />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </RealTimeNotificationProvider>
  );
}
