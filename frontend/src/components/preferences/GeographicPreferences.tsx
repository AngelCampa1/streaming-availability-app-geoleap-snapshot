'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export interface GeographicPreferencesProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  preferences: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate: (key: string, value: any) => void;
  isUpdating?: boolean;
}

export function GeographicPreferences({ preferences, onUpdate, isUpdating = false }: GeographicPreferencesProps) {
  const countries = [
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵' },
    { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹' },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
    { code: 'NO', name: 'Norway', flag: '🇳🇴' },
    { code: 'IN', name: 'India', flag: '🇮🇳' },
  ];

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  ];

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Vancouver',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Stockholm',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Shanghai',
    'Asia/Mumbai',
    'Australia/Sydney',
    'Australia/Melbourne',
  ];

  return (
    <div className="space-y-6">
      {/* Location Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Location Settings</CardTitle>
          <CardDescription>Set your primary location for content availability and recommendations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primary-country">Primary Country</Label>
            <Select
              value={preferences.primaryCountry ?? 'US'}
              onValueChange={value => onUpdate('primaryCountry', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {countries.map(country => (
                  <SelectItem key={country.code} value={country.code}>
                    <div className="flex items-center space-x-2">
                      <span>{country.flag}</span>
                      <span>{country.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={preferences.timezone ?? 'America/New_York'}
              onValueChange={value => onUpdate('timezone', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map(tz => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace('_', ' ').replace('/', ' / ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-detect-location" className="font-medium">
                Auto-Detect Location
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically detect your location for regional content
              </p>
            </div>
            <Switch
              checked={preferences.autoDetectLocation ?? false}
              onCheckedChange={checked => onUpdate('autoDetectLocation', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Language Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Language Preferences</CardTitle>
          <CardDescription>Configure your preferred languages for content and interface</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primary-language">Primary Language</Label>
            <Select
              value={preferences.primaryLanguage ?? 'en'}
              onValueChange={value => onUpdate('primaryLanguage', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <div className="flex items-center space-x-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary-language">Secondary Language</Label>
            <Select
              value={preferences.secondaryLanguage ?? ''}
              onValueChange={value => onUpdate('secondaryLanguage', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select secondary language (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {languages.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <div className="flex items-center space-x-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-original-titles" className="font-medium">
                Show Original Titles
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Display content in its original language title alongside translations
              </p>
            </div>
            <Switch
              checked={preferences.showOriginalTitles ?? true}
              onCheckedChange={checked => onUpdate('showOriginalTitles', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="prefer-dubbed" className="font-medium">
                Prefer Dubbed Content
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Show dubbed versions over subtitled when available</p>
            </div>
            <Switch
              checked={preferences.preferDubbed ?? false}
              onCheckedChange={checked => onUpdate('preferDubbed', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Regional Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Regional Content Preferences</CardTitle>
          <CardDescription>Control what regional content you want to see</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="include-global-content" className="font-medium">
                Include Global Content
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Show content available globally, not just in your region
              </p>
            </div>
            <Switch
              checked={preferences.includeGlobalContent ?? true}
              onCheckedChange={checked => onUpdate('includeGlobalContent', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="prioritize-local" className="font-medium">
                Prioritize Local Content
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Show content from your region first in search results
              </p>
            </div>
            <Switch
              checked={preferences.prioritizeLocal ?? true}
              onCheckedChange={checked => onUpdate('prioritizeLocal', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-unavailable" className="font-medium">
                Show Unavailable Content
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Display content that&apos;s not available in your region with indicators
              </p>
            </div>
            <Switch
              checked={preferences.showUnavailable ?? false}
              onCheckedChange={checked => onUpdate('showUnavailable', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="space-y-3">
            <Label className="font-medium">Additional Regions of Interest</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {countries.slice(0, 6).map(country => (
                <div
                  key={country.code}
                  className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span>{country.flag}</span>
                    <Label htmlFor={`region-${country.code}`} className="text-sm">
                      {country.name}
                    </Label>
                  </div>
                  <Switch
                    checked={preferences[`region${country.code}`] ?? false}
                    onCheckedChange={checked => onUpdate(`region${country.code}`, checked)}
                    disabled={isUpdating}
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Select additional regions to see content availability and recommendations from those areas
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Cultural Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cultural Preferences</CardTitle>
          <CardDescription>Customize content based on cultural preferences and sensitivities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cultural-filter">Cultural Content Filter</Label>
            <Select
              value={preferences.culturalFilter ?? 'none'}
              onValueChange={value => onUpdate('culturalFilter', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No filtering</SelectItem>
                <SelectItem value="conservative">Conservative - Filter sensitive content</SelectItem>
                <SelectItem value="moderate">Moderate - Some cultural considerations</SelectItem>
                <SelectItem value="inclusive">Inclusive - Prioritize diverse content</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="religious-considerations" className="font-medium">
                Religious Content Considerations
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Apply filters based on religious content guidelines</p>
            </div>
            <Switch
              checked={preferences.religiousConsiderations ?? false}
              onCheckedChange={checked => onUpdate('religiousConsiderations', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="dietary-preferences" className="font-medium">
                Dietary Content Awareness
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Consider dietary preferences when showing food-related content
              </p>
            </div>
            <Switch
              checked={preferences.dietaryPreferences ?? false}
              onCheckedChange={checked => onUpdate('dietaryPreferences', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="cultural-holidays" className="font-medium">
                Cultural Holiday Recommendations
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Get content recommendations based on cultural holidays and events
              </p>
            </div>
            <Switch
              checked={preferences.culturalHolidays ?? true}
              onCheckedChange={checked => onUpdate('culturalHolidays', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Regional Accessibility</CardTitle>
          <CardDescription>Accessibility features specific to your region</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date-format">Date Format</Label>
            <Select
              value={preferences.dateFormat ?? 'MM/DD/YYYY'}
              onValueChange={value => onUpdate('dateFormat', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (UK/EU)</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                <SelectItem value="DD.MM.YYYY">DD.MM.YYYY (German)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-format">Time Format</Label>
            <Select
              value={preferences.timeFormat ?? '12'}
              onValueChange={value => onUpdate('timeFormat', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12-hour (1:00 PM)</SelectItem>
                <SelectItem value="24">24-hour (13:00)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency-display">Currency Display</Label>
            <Select
              value={preferences.currencyDisplay ?? 'USD'}
              onValueChange={value => onUpdate('currencyDisplay', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="CAD">CAD (C$)</SelectItem>
                <SelectItem value="AUD">AUD (A$)</SelectItem>
                <SelectItem value="JPY">JPY (¥)</SelectItem>
                <SelectItem value="KRW">KRW (₩)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="metric-system" className="font-medium">
                Use Metric System
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Display measurements in metric units (kg, km, °C)</p>
            </div>
            <Switch
              checked={preferences.metricSystem ?? true}
              onCheckedChange={checked => onUpdate('metricSystem', checked)}
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
