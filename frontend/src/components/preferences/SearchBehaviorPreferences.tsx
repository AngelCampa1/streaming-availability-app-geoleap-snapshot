'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';

export interface SearchBehaviorPreferencesProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  preferences: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate: (key: string, value: any) => void;
  isUpdating?: boolean;
}

export function SearchBehaviorPreferences({
  preferences,
  onUpdate,
  isUpdating = false,
}: SearchBehaviorPreferencesProps) {
  return (
    <div className="space-y-6">
      {/* Search Behavior */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Behavior</CardTitle>
          <CardDescription>Customize how searches are performed and results are displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search-mode">Search Mode</Label>
            <Select
              value={preferences.searchMode ?? 'smart'}
              onValueChange={value => onUpdate('searchMode', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exact">Exact Match - Only exact title matches</SelectItem>
                <SelectItem value="smart">Smart Search - AI-powered with suggestions</SelectItem>
                <SelectItem value="fuzzy">Fuzzy Match - Similar titles and typo tolerance</SelectItem>
                <SelectItem value="comprehensive">Comprehensive - Search titles, cast, and descriptions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-complete" className="font-medium">
                Auto-Complete Suggestions
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Show search suggestions as you type</p>
            </div>
            <Switch
              checked={preferences.autoComplete ?? true}
              onCheckedChange={checked => onUpdate('autoComplete', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="search-history" className="font-medium">
                Save Search History
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Keep a history of your searches for quick access</p>
            </div>
            <Switch
              checked={preferences.searchHistory ?? true}
              onCheckedChange={checked => onUpdate('searchHistory', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="history-limit">Search History Limit</Label>
            <Select
              value={preferences.historyLimit?.toString() ?? '50'}
              onValueChange={value => onUpdate('historyLimit', parseInt(value))}
              disabled={isUpdating || !preferences.searchHistory}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 searches</SelectItem>
                <SelectItem value="25">25 searches</SelectItem>
                <SelectItem value="50">50 searches</SelectItem>
                <SelectItem value="100">100 searches</SelectItem>
                <SelectItem value="unlimited">Unlimited</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="trending-suggestions" className="font-medium">
                Show Trending Suggestions
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Display trending searches and popular content in suggestions
              </p>
            </div>
            <Switch
              checked={preferences.trendingSuggestions ?? true}
              onCheckedChange={checked => onUpdate('trendingSuggestions', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Result Filtering */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Default Search Filters</CardTitle>
          <CardDescription>Set default filters that are automatically applied to all searches</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-content-type">Default Content Type</Label>
            <Select
              value={preferences.defaultContentType ?? 'all'}
              onValueChange={value => onUpdate('defaultContentType', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Content</SelectItem>
                <SelectItem value="movies">Movies Only</SelectItem>
                <SelectItem value="shows">TV Shows Only</SelectItem>
                <SelectItem value="documentaries">Documentaries Only</SelectItem>
                <SelectItem value="anime">Anime Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-sort">Default Sort Order</Label>
            <Select
              value={preferences.defaultSort ?? 'relevance'}
              onValueChange={value => onUpdate('defaultSort', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="popularity">Popularity</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="release_date">Release Date (Newest)</SelectItem>
                <SelectItem value="release_date_asc">Release Date (Oldest)</SelectItem>
                <SelectItem value="title">Title (A-Z)</SelectItem>
                <SelectItem value="title_desc">Title (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="font-medium">Default Release Year Range</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>1950</span>
                <span>Current Year</span>
              </div>
              <div className="px-2">
                <Slider
                  value={[preferences.minYear ?? 1950, preferences.maxYear ?? new Date().getFullYear()]}
                  onValueChange={values => {
                    onUpdate('minYear', values[0]);
                    onUpdate('maxYear', values[1]);
                  }}
                  max={new Date().getFullYear()}
                  min={1950}
                  step={1}
                  className="w-full"
                  disabled={isUpdating}
                />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{preferences.minYear ?? 1950}</span>
                <span>{preferences.maxYear ?? new Date().getFullYear()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="font-medium">Minimum Rating Filter</Label>
            <div className="space-y-2">
              <Slider
                value={[preferences.minRating ?? 0]}
                onValueChange={value => onUpdate('minRating', value[0])}
                max={10}
                min={0}
                step={0.5}
                className="w-full"
                disabled={isUpdating}
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>No filter</span>
                <span>{preferences.minRating ?? 0}/10</span>
                <span>10/10</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="only-my-services" className="font-medium">
                Default to My Services Only
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                By default, only show content from your subscribed services
              </p>
            </div>
            <Switch
              checked={preferences.onlyMyServices ?? false}
              onCheckedChange={checked => onUpdate('onlyMyServices', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="hide-watched" className="font-medium">
                Hide Already Watched
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Don&apos;t show content you&apos;ve already marked as watched</p>
            </div>
            <Switch
              checked={preferences.hideWatched ?? false}
              onCheckedChange={checked => onUpdate('hideWatched', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Advanced Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Advanced Search Options</CardTitle>
          <CardDescription>Configure advanced search features and behaviors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="fuzzy-matching" className="font-medium">
                Fuzzy Matching
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Find results even with typos and partial matches</p>
            </div>
            <Switch
              checked={preferences.fuzzyMatching ?? true}
              onCheckedChange={checked => onUpdate('fuzzyMatching', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="cast-search" className="font-medium">
                Include Cast in Search
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Search through actor and director names</p>
            </div>
            <Switch
              checked={preferences.castSearch ?? true}
              onCheckedChange={checked => onUpdate('castSearch', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="plot-search" className="font-medium">
                Include Plot in Search
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Search through movie and show descriptions</p>
            </div>
            <Switch
              checked={preferences.plotSearch ?? false}
              onCheckedChange={checked => onUpdate('plotSearch', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="keyword-search" className="font-medium">
                Keyword Search
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Search by themes, genres, and content keywords</p>
            </div>
            <Switch
              checked={preferences.keywordSearch ?? true}
              onCheckedChange={checked => onUpdate('keywordSearch', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="search-sensitivity">Search Sensitivity</Label>
            <Select
              value={preferences.searchSensitivity ?? 'medium'}
              onValueChange={value => onUpdate('searchSensitivity', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Broad matches, more results</SelectItem>
                <SelectItem value="medium">Medium - Balanced precision</SelectItem>
                <SelectItem value="high">High - Precise matches, fewer results</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Performance & Caching */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance & Caching</CardTitle>
          <CardDescription>Optimize search performance and data usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cache-duration">Search Cache Duration</Label>
            <Select
              value={preferences.cacheDuration ?? '1hour'}
              onValueChange={value => onUpdate('cacheDuration', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No caching</SelectItem>
                <SelectItem value="5min">5 minutes</SelectItem>
                <SelectItem value="15min">15 minutes</SelectItem>
                <SelectItem value="1hour">1 hour</SelectItem>
                <SelectItem value="1day">1 day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="preload-results" className="font-medium">
                Preload Search Results
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Load additional results in the background for faster browsing
              </p>
            </div>
            <Switch
              checked={preferences.preloadResults ?? true}
              onCheckedChange={checked => onUpdate('preloadResults', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="compress-images" className="font-medium">
                Compress Images
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Use compressed images for faster loading on slower connections
              </p>
            </div>
            <Switch
              checked={preferences.compressImages ?? false}
              onCheckedChange={checked => onUpdate('compressImages', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-results">Maximum Results Per Search</Label>
            <Select
              value={preferences.maxResults?.toString() ?? '100'}
              onValueChange={value => onUpdate('maxResults', parseInt(value))}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 results</SelectItem>
                <SelectItem value="100">100 results</SelectItem>
                <SelectItem value="250">250 results</SelectItem>
                <SelectItem value="500">500 results</SelectItem>
                <SelectItem value="unlimited">Unlimited</SelectItem>
              </SelectContent>
            </Select>
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
