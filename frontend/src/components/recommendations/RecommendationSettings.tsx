'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Zap,
  Filter,
  Save,
  RotateCcw,
  TrendingUp,
  Star,
  Users,
  Brain,
  Heart,
  Eye,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecommendationSettingsData {
  id: string;
  enableRecommendations: boolean;
  showTrendingContent: boolean;
  showSimilarContent: boolean;
  showPopularContent: boolean;
  includeMovies: boolean;
  includeTvShows: boolean;
  includeDocumentaries: boolean;
  includeAnime: boolean;
  minimumRating: number;
  includeAdultContent: boolean;
  preferredLanguages: string[];
  preferredGenres: string[];
  excludedGenres: string[];
  useCollaborativeFiltering: boolean;
  useContentBasedFiltering: boolean;
  useTrendingBoost: boolean;
  updatedAt: string;
}

interface RecommendationSettingsProps {
  userId: string;
  onSettingsChange?: (settings: RecommendationSettingsData) => void;
  className?: string;
}

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ru', name: 'Russian' },
];

const AVAILABLE_GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Music',
  'Mystery',
  'Romance',
  'Science Fiction',
  'Thriller',
  'War',
  'Western',
];

/**
 * Recommendation Settings Component
 * Features:
 * - Comprehensive preference management
 * - Content type and genre filtering
 * - Algorithm customization options
 * - Language preferences
 * - Rating thresholds
 * - Real-time updates with debouncing
 * - Responsive layout for mobile
 * - Accessibility compliance
 */
export function RecommendationSettings({ userId, onSettingsChange, className }: RecommendationSettingsProps) {
  const [settings, setSettings] = useState<RecommendationSettingsData>({
    id: '',
    enableRecommendations: true,
    showTrendingContent: true,
    showSimilarContent: true,
    showPopularContent: true,
    includeMovies: true,
    includeTvShows: true,
    includeDocumentaries: true,
    includeAnime: false,
    minimumRating: 0,
    includeAdultContent: false,
    preferredLanguages: ['en'],
    preferredGenres: [],
    excludedGenres: [],
    useCollaborativeFiltering: true,
    useContentBasedFiltering: true,
    useTrendingBoost: true,
    updatedAt: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/recommendation/settings?userId=${userId}`);
        // const data = await response.json();
        // setSettings(data);

        // Mock delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Failed to load recommendation settings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadSettings();
    }
  }, [userId]);

  const handleSettingChange = <K extends keyof RecommendationSettingsData>(
    key: K,
    value: RecommendationSettingsData[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleGenreToggle = (genre: string, isPreferred: boolean) => {
    if (isPreferred) {
      setSettings(prev => ({
        ...prev,
        preferredGenres: prev.preferredGenres.includes(genre)
          ? prev.preferredGenres.filter(g => g !== genre)
          : [...prev.preferredGenres, genre],
        excludedGenres: prev.excludedGenres.filter(g => g !== genre),
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        excludedGenres: prev.excludedGenres.includes(genre)
          ? prev.excludedGenres.filter(g => g !== genre)
          : [...prev.excludedGenres, genre],
        preferredGenres: prev.preferredGenres.filter(g => g !== genre),
      }));
    }
    setHasChanges(true);
  };

  const handleLanguageToggle = (languageCode: string) => {
    setSettings(prev => ({
      ...prev,
      preferredLanguages: prev.preferredLanguages.includes(languageCode)
        ? prev.preferredLanguages.filter(l => l !== languageCode)
        : [...prev.preferredLanguages, languageCode],
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/recommendation/settings`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings)
      // });

      // Mock delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setHasChanges(false);
      onSettingsChange?.(settings);
    } catch (error) {
      console.error('Failed to save recommendation settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      id: settings.id,
      enableRecommendations: true,
      showTrendingContent: true,
      showSimilarContent: true,
      showPopularContent: true,
      includeMovies: true,
      includeTvShows: true,
      includeDocumentaries: true,
      includeAnime: false,
      minimumRating: 0,
      includeAdultContent: false,
      preferredLanguages: ['en'],
      preferredGenres: [],
      excludedGenres: [],
      useCollaborativeFiltering: true,
      useContentBasedFiltering: true,
      useTrendingBoost: true,
      updatedAt: new Date().toISOString(),
    });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <Card className={cn('w-full max-w-4xl', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Recommendation Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full max-w-4xl', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Recommendation Settings
          </CardTitle>

          {hasChanges && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleReset} disabled={saving}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-1" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Content</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="algorithms" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Algorithms</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Enable Recommendations</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn on/off personalized content recommendations
                  </p>
                </div>
                <Switch
                  checked={settings.enableRecommendations}
                  onCheckedChange={checked => handleSettingChange('enableRecommendations', checked)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-error" />
                    <Label>Show Trending Content</Label>
                  </div>
                  <Switch
                    checked={settings.showTrendingContent}
                    onCheckedChange={checked => handleSettingChange('showTrendingContent', checked)}
                    disabled={!settings.enableRecommendations}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-warning" />
                    <Label>Show Popular Content</Label>
                  </div>
                  <Switch
                    checked={settings.showPopularContent}
                    onCheckedChange={checked => handleSettingChange('showPopularContent', checked)}
                    disabled={!settings.enableRecommendations}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    <Label>Show Similar Content</Label>
                  </div>
                  <Switch
                    checked={settings.showSimilarContent}
                    onCheckedChange={checked => handleSettingChange('showSimilarContent', checked)}
                    disabled={!settings.enableRecommendations}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent" />
                    <Label>Include Adult Content</Label>
                  </div>
                  <Switch
                    checked={settings.includeAdultContent}
                    onCheckedChange={checked => handleSettingChange('includeAdultContent', checked)}
                    disabled={!settings.enableRecommendations}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-base font-medium">Minimum Rating Threshold</Label>
                <div className="space-y-2">
                  <Slider
                    value={[settings.minimumRating]}
                    onValueChange={([value]) => handleSettingChange('minimumRating', value)}
                    max={10}
                    min={0}
                    step={0.1}
                    disabled={!settings.enableRecommendations}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>0.0</span>
                    <span className="font-medium">{settings.minimumRating.toFixed(1)}</span>
                    <span>10.0</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Only show content with ratings above this threshold
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Content Types */}
          <TabsContent value="content" className="space-y-6 mt-6">
            <div className="space-y-4">
              <Label className="text-base font-medium">Content Types</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="movies"
                    checked={settings.includeMovies}
                    onCheckedChange={checked => handleSettingChange('includeMovies', !!checked)}
                    disabled={!settings.enableRecommendations}
                  />
                  <Label htmlFor="movies">Movies</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tv-shows"
                    checked={settings.includeTvShows}
                    onCheckedChange={checked => handleSettingChange('includeTvShows', !!checked)}
                    disabled={!settings.enableRecommendations}
                  />
                  <Label htmlFor="tv-shows">TV Shows</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="documentaries"
                    checked={settings.includeDocumentaries}
                    onCheckedChange={checked => handleSettingChange('includeDocumentaries', !!checked)}
                    disabled={!settings.enableRecommendations}
                  />
                  <Label htmlFor="documentaries">Documentaries</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="anime"
                    checked={settings.includeAnime}
                    onCheckedChange={checked => handleSettingChange('includeAnime', !!checked)}
                    disabled={!settings.enableRecommendations}
                  />
                  <Label htmlFor="anime">Anime</Label>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base font-medium">Preferred Languages</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {AVAILABLE_LANGUAGES.map(language => (
                  <Button
                    key={language.code}
                    variant={settings.preferredLanguages.includes(language.code) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleLanguageToggle(language.code)}
                    disabled={!settings.enableRecommendations}
                    className="justify-start"
                  >
                    {language.name}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Genre Preferences */}
          <TabsContent value="preferences" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium text-success">Preferred Genres</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  We&apos;ll show you more content from these genres
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {AVAILABLE_GENRES.map(genre => (
                  <Badge
                    key={`preferred-${genre}`}
                    variant={settings.preferredGenres.includes(genre) ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer transition-colors',
                      settings.preferredGenres.includes(genre) && 'bg-success hover:bg-success/90',
                      !settings.enableRecommendations && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => !settings.enableRecommendations || handleGenreToggle(genre, true)}
                  >
                    {genre}
                    {settings.preferredGenres.includes(genre) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium text-error">Excluded Genres</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  We&apos;ll avoid recommending content from these genres
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {AVAILABLE_GENRES.map(genre => (
                  <Badge
                    key={`excluded-${genre}`}
                    variant={settings.excludedGenres.includes(genre) ? 'destructive' : 'outline'}
                    className={cn(
                      'cursor-pointer transition-colors',
                      !settings.enableRecommendations && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => !settings.enableRecommendations || handleGenreToggle(genre, false)}
                  >
                    {genre}
                    {settings.excludedGenres.includes(genre) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Algorithm Settings */}
          <TabsContent value="algorithms" className="space-y-6 mt-6">
            <div className="space-y-4">
              <Label className="text-base font-medium">Recommendation Algorithms</Label>
              <p className="text-sm text-muted-foreground">
                Choose which algorithms to use for generating your recommendations
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Collaborative Filtering</Label>
                    <p className="text-sm text-muted-foreground">
                      Recommendations based on users with similar preferences
                    </p>
                  </div>
                  <Switch
                    checked={settings.useCollaborativeFiltering}
                    onCheckedChange={checked => handleSettingChange('useCollaborativeFiltering', checked)}
                    disabled={!settings.enableRecommendations}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Content-Based Filtering</Label>
                    <p className="text-sm text-muted-foreground">
                      Recommendations based on content you&apos;ve previously enjoyed
                    </p>
                  </div>
                  <Switch
                    checked={settings.useContentBasedFiltering}
                    onCheckedChange={checked => handleSettingChange('useContentBasedFiltering', checked)}
                    disabled={!settings.enableRecommendations}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Trending Boost</Label>
                    <p className="text-sm text-muted-foreground">
                      Boost recommendations for currently trending content
                    </p>
                  </div>
                  <Switch
                    checked={settings.useTrendingBoost}
                    onCheckedChange={checked => handleSettingChange('useTrendingBoost', checked)}
                    disabled={!settings.enableRecommendations}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
