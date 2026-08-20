'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shield, Eye, Users, Database, Lock } from 'lucide-react';

export interface PrivacyPreferencesProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  preferences: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate: (key: string, value: any) => void;
  isUpdating?: boolean;
}

export function PrivacyPreferences({ preferences, onUpdate, isUpdating = false }: PrivacyPreferencesProps) {
  return (
    <div className="space-y-6">
      {/* Data Collection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Collection & Usage
          </CardTitle>
          <CardDescription>Control what data we collect to improve your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="analytics-enabled" className="font-medium">
                Analytics & Usage Data
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Help us improve GeoLeap by sharing anonymous usage statistics
              </p>
            </div>
            <Switch
              checked={preferences.analyticsEnabled ?? true}
              onCheckedChange={checked => onUpdate('analyticsEnabled', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="personalization-data" className="font-medium">
                Personalization Data
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Use viewing history and preferences to provide better recommendations
              </p>
            </div>
            <Switch
              checked={preferences.personalizationData ?? true}
              onCheckedChange={checked => onUpdate('personalizationData', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="crash-reporting" className="font-medium">
                Crash Reporting
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Automatically send crash reports to help us fix bugs</p>
            </div>
            <Switch
              checked={preferences.crashReporting ?? true}
              onCheckedChange={checked => onUpdate('crashReporting', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Profile Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Profile & Activity Visibility
          </CardTitle>
          <CardDescription>Control who can see your profile and activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-visibility">Profile Visibility</Label>
            <Select
              value={preferences.profileVisibility ?? 'private'}
              onValueChange={value => onUpdate('profileVisibility', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public - Anyone can see your profile</SelectItem>
                <SelectItem value="friends">Friends Only - Only your friends can see</SelectItem>
                <SelectItem value="private">Private - Only you can see your profile</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-watchlist" className="font-medium">
                Show Watchlist
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Allow others to see what&apos;s in your watchlist</p>
            </div>
            <Switch
              checked={preferences.showWatchlist ?? false}
              onCheckedChange={checked => onUpdate('showWatchlist', checked)}
              disabled={isUpdating || preferences.profileVisibility === 'private'}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-ratings" className="font-medium">
                Show Ratings & Reviews
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Allow others to see your ratings and reviews</p>
            </div>
            <Switch
              checked={preferences.showRatings ?? false}
              onCheckedChange={checked => onUpdate('showRatings', checked)}
              disabled={isUpdating || preferences.profileVisibility === 'private'}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-activity" className="font-medium">
                Show Recent Activity
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Allow others to see your recent searches and views</p>
            </div>
            <Switch
              checked={preferences.showActivity ?? false}
              onCheckedChange={checked => onUpdate('showActivity', checked)}
              disabled={isUpdating || preferences.profileVisibility === 'private'}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Search & Browsing Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Search & Browsing Privacy
          </CardTitle>
          <CardDescription>Control how your search and browsing data is handled</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="save-search-history" className="font-medium">
                Save Search History
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Keep a history of your searches for quick access and better suggestions
              </p>
            </div>
            <Switch
              checked={preferences.saveSearchHistory ?? true}
              onCheckedChange={checked => onUpdate('saveSearchHistory', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="search-history-retention">Search History Retention</Label>
            <Select
              value={preferences.searchHistoryRetention ?? '90days'}
              onValueChange={value => onUpdate('searchHistoryRetention', value)}
              disabled={isUpdating || !preferences.saveSearchHistory}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">7 Days</SelectItem>
                <SelectItem value="30days">30 Days</SelectItem>
                <SelectItem value="90days">90 Days</SelectItem>
                <SelectItem value="1year">1 Year</SelectItem>
                <SelectItem value="indefinite">Indefinitely</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="incognito-mode" className="font-medium">
                Private Browsing Mode
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Don&apos;t save searches or viewing history in this session
              </p>
            </div>
            <Switch
              checked={preferences.incognitoMode ?? false}
              onCheckedChange={checked => onUpdate('incognitoMode', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="clear-on-exit" className="font-medium">
                Clear Data on Exit
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically clear browsing data when you close the app
              </p>
            </div>
            <Switch
              checked={preferences.clearOnExit ?? false}
              onCheckedChange={checked => onUpdate('clearOnExit', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Account Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Account Security
          </CardTitle>
          <CardDescription>Manage security settings for your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="two-factor-auth" className="font-medium">
                Two-Factor Authentication
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Add an extra layer of security to your account</p>
            </div>
            <Switch
              checked={preferences.twoFactorAuth ?? false}
              onCheckedChange={checked => onUpdate('twoFactorAuth', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="login-notifications" className="font-medium">
                Login Notifications
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Get notified when someone logs into your account</p>
            </div>
            <Switch
              checked={preferences.loginNotifications ?? true}
              onCheckedChange={checked => onUpdate('loginNotifications', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-timeout">Auto-logout Time</Label>
            <Select
              value={preferences.sessionTimeout ?? '24hours'}
              onValueChange={value => onUpdate('sessionTimeout', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1hour">1 Hour</SelectItem>
                <SelectItem value="4hours">4 Hours</SelectItem>
                <SelectItem value="12hours">12 Hours</SelectItem>
                <SelectItem value="24hours">24 Hours</SelectItem>
                <SelectItem value="7days">7 Days</SelectItem>
                <SelectItem value="30days">30 Days</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="device-tracking" className="font-medium">
                Device Tracking
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Keep track of devices that have accessed your account
              </p>
            </div>
            <Switch
              checked={preferences.deviceTracking ?? true}
              onCheckedChange={checked => onUpdate('deviceTracking', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Data Rights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Your Data Rights
          </CardTitle>
          <CardDescription>Exercise your rights regarding your personal data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="marketing-emails" className="font-medium">
                Marketing Communications
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Receive emails about new features, content, and promotions
              </p>
            </div>
            <Switch
              checked={preferences.marketingEmails ?? false}
              onCheckedChange={checked => onUpdate('marketingEmails', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="third-party-sharing" className="font-medium">
                Third-Party Data Sharing
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Allow sharing anonymized data with partners for research
              </p>
            </div>
            <Switch
              checked={preferences.thirdPartySharing ?? false}
              onCheckedChange={checked => onUpdate('thirdPartySharing', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="data-portability" className="font-medium">
                Data Portability Requests
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Allow automatic processing of data export requests</p>
            </div>
            <Switch
              checked={preferences.dataPortability ?? true}
              onCheckedChange={checked => onUpdate('dataPortability', checked)}
              disabled={isUpdating}
            />
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
