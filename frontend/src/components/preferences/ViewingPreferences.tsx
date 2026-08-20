'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';

export interface ViewingPreferencesProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  preferences: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate: (key: string, value: any) => void;
  isUpdating?: boolean;
}

export function ViewingPreferences({ preferences, onUpdate, isUpdating = false }: ViewingPreferencesProps) {
  const genres = [
    'Action',
    'Adventure',
    'Animation',
    'Comedy',
    'Crime',
    'Documentary',
    'Drama',
    'Family',
    'Fantasy',
    'Horror',
    'Mystery',
    'Romance',
    'Sci-Fi',
    'Thriller',
    'War',
    'Western',
    'Musical',
    'Biography',
  ];

  return (
    <div className="space-y-6">
      {/* Content Filtering */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Content Filtering</CardTitle>
          <CardDescription>Control what type of content appears in your searches</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content-rating">Maximum Content Rating</Label>
            <Select
              value={preferences.maxContentRating ?? 'R'}
              onValueChange={value => onUpdate('maxContentRating', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="G">G - General Audiences</SelectItem>
                <SelectItem value="PG">PG - Parental Guidance</SelectItem>
                <SelectItem value="PG-13">PG-13 - Parents Strongly Cautioned</SelectItem>
                <SelectItem value="R">R - Restricted</SelectItem>
                <SelectItem value="NC-17">NC-17 - Adults Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="hide-explicit" className="font-medium">
                Hide Explicit Content
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Filter out content with explicit language, violence, or adult themes
              </p>
            </div>
            <Switch
              checked={preferences.hideExplicit ?? false}
              onCheckedChange={checked => onUpdate('hideExplicit', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="family-friendly" className="font-medium">
                Family-Friendly Mode
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Show only content suitable for all ages</p>
            </div>
            <Switch
              checked={preferences.familyFriendly ?? false}
              onCheckedChange={checked => onUpdate('familyFriendly', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Preferred Genres */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preferred Genres</CardTitle>
          <CardDescription>Select your favorite genres to get better recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {genres.map(genre => (
              <div
                key={genre}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Label id={`genre-label-${genre}`} className="font-medium text-sm">
                  {genre}
                </Label>
                <Switch
                  aria-labelledby={`genre-label-${genre}`}
                  checked={preferences[`genre${genre}`] ?? false}
                  onCheckedChange={checked => onUpdate(`genre${genre}`, checked)}
                  disabled={isUpdating}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Content Discovery */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Content Discovery</CardTitle>
          <CardDescription>Customize how new content is recommended to you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recommendation-style">Recommendation Style</Label>
            <Select
              value={preferences.recommendationStyle ?? 'balanced'}
              onValueChange={value => onUpdate('recommendationStyle', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative - Similar to what I&apos;ve watched</SelectItem>
                <SelectItem value="balanced">Balanced - Mix of familiar and new</SelectItem>
                <SelectItem value="adventurous">Adventurous - Show me new genres and styles</SelectItem>
                <SelectItem value="trending">Trending - Focus on popular content</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="font-medium">Content Freshness Preference</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Classic Content</span>
                <span>Latest Releases</span>
              </div>
              <Slider
                value={[preferences.contentFreshness ?? 50]}
                onValueChange={value => onUpdate('contentFreshness', value[0])}
                max={100}
                step={10}
                className="w-full"
                disabled={isUpdating}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="include-foreign" className="font-medium">
                Include Foreign Content
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Show movies and shows in languages other than your preferred language
              </p>
            </div>
            <Switch
              checked={preferences.includeForeign ?? true}
              onCheckedChange={checked => onUpdate('includeForeign', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-trailers" className="font-medium">
                Auto-Play Trailers
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Automatically play trailers when browsing content</p>
            </div>
            <Switch
              checked={preferences.showTrailers ?? true}
              onCheckedChange={checked => onUpdate('showTrailers', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Viewing History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Viewing History & Tracking</CardTitle>
          <CardDescription>Control how your viewing activity is tracked and used</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="track-viewing" className="font-medium">
                Track Viewing History
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Keep a record of what you&apos;ve watched for better recommendations
              </p>
            </div>
            <Switch
              checked={preferences.trackViewing ?? true}
              onCheckedChange={checked => onUpdate('trackViewing', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-mark-watched" className="font-medium">
                Auto-Mark as Watched
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically mark content as watched when you finish it
              </p>
            </div>
            <Switch
              checked={preferences.autoMarkWatched ?? true}
              onCheckedChange={checked => onUpdate('autoMarkWatched', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="watch-threshold">Watch Completion Threshold</Label>
            <div className="space-y-2">
              <Slider
                value={[preferences.watchThreshold ?? 80]}
                onValueChange={value => onUpdate('watchThreshold', value[0])}
                max={100}
                min={50}
                step={5}
                className="w-full"
                disabled={isUpdating}
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>50%</span>
                <span>{preferences.watchThreshold ?? 80}%</span>
                <span>100%</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Mark content as watched when you&apos;ve seen this percentage</p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Accessibility Preferences</CardTitle>
          <CardDescription>Customize the viewing experience for accessibility needs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="prefer-subtitles" className="font-medium">
                Prefer Subtitled Content
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Prioritize content with subtitles in search results</p>
            </div>
            <Switch
              checked={preferences.preferSubtitles ?? false}
              onCheckedChange={checked => onUpdate('preferSubtitles', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="prefer-audio-description" className="font-medium">
                Prefer Audio Descriptions
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Prioritize content with audio descriptions for visual accessibility
              </p>
            </div>
            <Switch
              checked={preferences.preferAudioDescription ?? false}
              onCheckedChange={checked => onUpdate('preferAudioDescription', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="reduce-motion" className="font-medium">
                Reduce Motion Effects
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Minimize animations and motion effects in the interface
              </p>
            </div>
            <Switch
              checked={preferences.reduceMotion ?? false}
              onCheckedChange={checked => onUpdate('reduceMotion', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="high-contrast" className="font-medium">
                High Contrast Mode
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Use higher contrast colors for better visibility</p>
            </div>
            <Switch
              checked={preferences.highContrast ?? false}
              onCheckedChange={checked => onUpdate('highContrast', checked)}
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
