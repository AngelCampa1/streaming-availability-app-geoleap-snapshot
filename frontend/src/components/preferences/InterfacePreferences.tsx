'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { useTheme } from '@/contexts/ThemeContext';

export interface InterfacePreferencesProps {
  preferences: Record<string, any>;
  onUpdate: (key: string, value: any) => void;
  isUpdating?: boolean;
  currentTheme?: string;
}

export function InterfacePreferences({ preferences, onUpdate, isUpdating = false }: InterfacePreferencesProps) {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (_newTheme: string) => {
    setTheme('light');
    onUpdate('themePreference', 'light');
  };

  return (
    <div className="space-y-6">
      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Theme & Appearance</CardTitle>
          <CardDescription>Customize the visual appearance of GeoLeap</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme-preference">Theme</Label>
            <Select value={theme} onValueChange={handleThemeChange} disabled={isUpdating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">🌞 Light Theme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {false && (
            <div className="grid grid-cols-2 gap-4 ml-4">
              <div className="space-y-2">
                <Label htmlFor="light-theme-start">Light Theme Start</Label>
                <Select
                  value={preferences.lightThemeStart ?? '06:00'}
                  onValueChange={value => onUpdate('lightThemeStart', value)}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
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
                <Label htmlFor="dark-theme-start">Light Theme Start</Label>
                <Select
                  value={preferences.lightThemeStart ?? '18:00'}
                  onValueChange={value => onUpdate('darkThemeStart', value)}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
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
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Layout & Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Layout & Navigation</CardTitle>
          <CardDescription>Customize how content is displayed and organized</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="layout-density">Layout Density</Label>
            <Select
              value={preferences.layoutDensity ?? 'comfortable'}
              onValueChange={value => onUpdate('layoutDensity', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact - More content per screen</SelectItem>
                <SelectItem value="comfortable">Comfortable - Balanced spacing</SelectItem>
                <SelectItem value="spacious">Spacious - Extra breathing room</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="results-per-page">Results Per Page</Label>
            <Select
              value={preferences.resultsPerPage?.toString() ?? '20'}
              onValueChange={value => onUpdate('resultsPerPage', parseInt(value))}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 results</SelectItem>
                <SelectItem value="20">20 results</SelectItem>
                <SelectItem value="50">50 results</SelectItem>
                <SelectItem value="100">100 results</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grid-columns">Grid Columns (Desktop)</Label>
            <div className="space-y-2">
              <Slider
                value={[preferences.gridColumns ?? 4]}
                onValueChange={value => onUpdate('gridColumns', value[0])}
                max={6}
                min={2}
                step={1}
                className="w-full"
                disabled={isUpdating}
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>2 columns</span>
                <span>{preferences.gridColumns ?? 4} columns</span>
                <span>6 columns</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-sidebar" className="font-medium">
                Show Sidebar
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Display the navigation sidebar on larger screens</p>
            </div>
            <Switch
              checked={preferences.showSidebar ?? true}
              onCheckedChange={checked => onUpdate('showSidebar', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sticky-header" className="font-medium">
                Sticky Header
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Keep the navigation header visible while scrolling</p>
            </div>
            <Switch
              checked={preferences.stickyHeader ?? true}
              onCheckedChange={checked => onUpdate('stickyHeader', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Content Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Content Display</CardTitle>
          <CardDescription>Control how content cards and information are shown</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-style">Card Style</Label>
            <Select
              value={preferences.cardStyle ?? 'modern'}
              onValueChange={value => onUpdate('cardStyle', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal - Clean and simple</SelectItem>
                <SelectItem value="modern">Modern - Rounded with shadows</SelectItem>
                <SelectItem value="classic">Classic - Traditional borders</SelectItem>
                <SelectItem value="compact">Compact - Maximum information density</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-ratings" className="font-medium">
                Show Ratings
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Display ratings and review scores on content cards</p>
            </div>
            <Switch
              checked={preferences.showRatings ?? true}
              onCheckedChange={checked => onUpdate('showRatings', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-year" className="font-medium">
                Show Release Year
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Display the release year on content cards</p>
            </div>
            <Switch
              checked={preferences.showYear ?? true}
              onCheckedChange={checked => onUpdate('showYear', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-duration" className="font-medium">
                Show Duration
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Display runtime information on content cards</p>
            </div>
            <Switch
              checked={preferences.showDuration ?? true}
              onCheckedChange={checked => onUpdate('showDuration', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-providers" className="font-medium">
                Show Streaming Providers
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Display available streaming services on content cards
              </p>
            </div>
            <Switch
              checked={preferences.showProviders ?? true}
              onCheckedChange={checked => onUpdate('showProviders', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="hover-effects" className="font-medium">
                Hover Effects
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Enable hover animations and effects on content cards</p>
            </div>
            <Switch
              checked={preferences.hoverEffects ?? true}
              onCheckedChange={checked => onUpdate('hoverEffects', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Animation & Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Animation & Performance</CardTitle>
          <CardDescription>Control animations and performance settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="animation-speed">Animation Speed</Label>
            <Select
              value={preferences.animationSpeed ?? 'normal'}
              onValueChange={value => onUpdate('animationSpeed', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">Slow - Gentle animations</SelectItem>
                <SelectItem value="normal">Normal - Standard speed</SelectItem>
                <SelectItem value="fast">Fast - Quick transitions</SelectItem>
                <SelectItem value="none">None - Disable animations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="lazy-loading" className="font-medium">
                Lazy Loading
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Load images and content as you scroll for better performance
              </p>
            </div>
            <Switch
              checked={preferences.lazyLoading ?? true}
              onCheckedChange={checked => onUpdate('lazyLoading', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="preload-images" className="font-medium">
                Preload Images
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Preload nearby images for smoother browsing</p>
            </div>
            <Switch
              checked={preferences.preloadImages ?? true}
              onCheckedChange={checked => onUpdate('preloadImages', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="infinite-scroll" className="font-medium">
                Infinite Scroll
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically load more content as you reach the bottom
              </p>
            </div>
            <Switch
              checked={preferences.infiniteScroll ?? true}
              onCheckedChange={checked => onUpdate('infiniteScroll', checked)}
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
