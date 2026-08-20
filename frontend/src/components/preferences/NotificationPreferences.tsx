'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';

export interface NotificationPreferencesProps {
  preferences: Record<string, any>;
  onUpdate: (key: string, value: any) => void;
  isUpdating?: boolean;
}

export function NotificationPreferences({ preferences, onUpdate, isUpdating = false }: NotificationPreferencesProps) {
  const notificationChannels = [
    {
      id: 'browser',
      name: 'Browser Notifications',
      icon: Bell,
      description: 'Push notifications in your browser',
    },
    {
      id: 'email',
      name: 'Email Notifications',
      icon: Mail,
      description: 'Email updates to your registered address',
    },
    {
      id: 'sms',
      name: 'SMS Notifications',
      icon: MessageSquare,
      description: 'Text messages to your phone',
    },
    {
      id: 'mobile',
      name: 'Mobile App Push',
      icon: Smartphone,
      description: 'Push notifications to your mobile device',
    },
  ];

  const notificationTypes = [
    {
      id: 'newContent',
      name: 'New Content Alerts',
      description: 'Get notified when new movies or shows are added to your services',
      icon: '🎬',
    },
    {
      id: 'watchlistUpdates',
      name: 'Watchlist Updates',
      description: 'Notifications when watchlist items become available',
      icon: '📝',
    },
    {
      id: 'recommendations',
      name: 'Personalized Recommendations',
      description: 'Suggestions based on your viewing history and preferences',
      icon: '⭐',
    },
    {
      id: 'priceDrops',
      name: 'Price Drop Alerts',
      description: 'When rental or purchase prices drop for content you want',
      icon: '💰',
    },
    {
      id: 'newSeasons',
      name: 'New Season Releases',
      description: 'When new seasons of your favorite shows are released',
      icon: '🔄',
    },
    {
      id: 'expiringSoon',
      name: 'Content Expiring Soon',
      description: 'When content is leaving your streaming services',
      icon: '⏰',
    },
    {
      id: 'serviceUpdates',
      name: 'Service Updates',
      description: 'Important updates about GeoLeap features and services',
      icon: '📢',
    },
    {
      id: 'accountSecurity',
      name: 'Account Security',
      description: 'Login alerts and security-related notifications',
      icon: '🔒',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Master Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Master Settings</CardTitle>
          <CardDescription>Control overall notification behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications-enabled" className="font-medium">
                Enable All Notifications
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Master switch to enable or disable all notifications</p>
            </div>
            <Switch
              checked={preferences.notificationsEnabled ?? true}
              onCheckedChange={checked => onUpdate('notificationsEnabled', checked)}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="do-not-disturb" className="font-medium">
                  Do Not Disturb
                </Label>
                <p className="text-sm text-muted-foreground mt-1">Temporarily pause all non-critical notifications</p>
              </div>
              <Switch
                checked={preferences.doNotDisturb ?? false}
                onCheckedChange={checked => onUpdate('doNotDisturb', checked)}
                disabled={isUpdating}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quiet-hours-start">Quiet Hours Start</Label>
                <Select
                  value={preferences.quietHoursStart ?? '22:00'}
                  onValueChange={value => onUpdate('quietHoursStart', value)}
                  disabled={isUpdating || !preferences.doNotDisturb}
                >
                  <SelectTrigger aria-label="Quiet hours start time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={hour} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quiet-hours-end">Quiet Hours End</Label>
                <Select
                  value={preferences.quietHoursEnd ?? '08:00'}
                  onValueChange={value => onUpdate('quietHoursEnd', value)}
                  disabled={isUpdating || !preferences.doNotDisturb}
                >
                  <SelectTrigger aria-label="Quiet hours end time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={hour} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification Channels</CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notificationChannels.map(channel => {
              const IconComponent = channel.icon;
              return (
                <div
                  key={channel.id}
                  className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <IconComponent className="h-5 w-5 mt-0.5 text-primary" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`channel-${channel.id}`} className="font-medium">
                        {channel.name}
                      </Label>
                      <Switch
                        checked={preferences[`${channel.id}Enabled`] ?? true}
                        onCheckedChange={checked => onUpdate(`${channel.id}Enabled`, checked)}
                        disabled={isUpdating || !preferences.notificationsEnabled}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">{channel.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification Types</CardTitle>
          <CardDescription>Customize what types of notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notificationTypes.map(type => (
              <div
                key={type.id}
                className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <span className="text-lg mt-0.5">{type.icon}</span>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`type-${type.id}`} className="font-medium">
                      {type.name}
                    </Label>
                    <Switch
                      checked={preferences[`${type.id}Enabled`] ?? true}
                      onCheckedChange={checked => onUpdate(`${type.id}Enabled`, checked)}
                      disabled={isUpdating || !preferences.notificationsEnabled}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Frequency & Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Frequency & Timing</CardTitle>
          <CardDescription>Control how often and when you receive notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="digest-frequency">Email Digest Frequency</Label>
                <Select
                  value={preferences.digestFrequency ?? 'weekly'}
                  onValueChange={value => onUpdate('digestFrequency', value)}
                  disabled={isUpdating || !preferences.emailEnabled}
                >
                  <SelectTrigger aria-label="Email digest frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time (as they happen)</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                    <SelectItem value="weekly">Weekly Digest</SelectItem>
                    <SelectItem value="monthly">Monthly Digest</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="digest-day">Weekly Digest Day</Label>
                <Select
                  value={preferences.digestDay ?? 'sunday'}
                  onValueChange={value => onUpdate('digestDay', value)}
                  disabled={isUpdating || preferences.digestFrequency !== 'weekly'}
                >
                  <SelectTrigger aria-label="Weekly digest day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="tuesday">Tuesday</SelectItem>
                    <SelectItem value="wednesday">Wednesday</SelectItem>
                    <SelectItem value="thursday">Thursday</SelectItem>
                    <SelectItem value="friday">Friday</SelectItem>
                    <SelectItem value="saturday">Saturday</SelectItem>
                    <SelectItem value="sunday">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="digest-time">Digest Time</Label>
                <Select
                  value={preferences.digestTime ?? '09:00'}
                  onValueChange={value => onUpdate('digestTime', value)}
                  disabled={isUpdating || preferences.digestFrequency === 'realtime'}
                >
                  <SelectTrigger aria-label="Digest time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={hour} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="smart-timing" className="font-medium">
                    Smart Timing
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Send notifications when you&apos;re most likely to be active
                  </p>
                </div>
                <Switch
                  checked={preferences.smartTiming ?? true}
                  onCheckedChange={checked => onUpdate('smartTiming', checked)}
                  disabled={isUpdating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="bundle-notifications" className="font-medium">
                    Bundle Similar Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Group related notifications together to reduce interruptions
                  </p>
                </div>
                <Switch
                  checked={preferences.bundleNotifications ?? true}
                  onCheckedChange={checked => onUpdate('bundleNotifications', checked)}
                  disabled={isUpdating}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isUpdating && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
          <span className="text-sm text-muted-foreground">Updating preferences...</span>
        </div>
      )}
    </div>
  );
}
