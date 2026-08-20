'use client';

import React from 'react';

interface ContentPreferences {
  preferredGenre?: string;
  contentLanguage?: string;
  adultContent?: boolean;
  subtitlesEnabled?: boolean;
  videoQuality?: 'auto' | 'low' | 'medium' | 'high' | 'ultra';
}

interface ContentPreferencesProps {
  preferences: ContentPreferences;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate: (key: string, value: any) => void;
  disabled?: boolean;
}

export const ContentPreferences: React.FC<ContentPreferencesProps> = ({ preferences, onUpdate, disabled = false }) => {
  const genres = [
    'action',
    'adventure',
    'animation',
    'comedy',
    'crime',
    'documentary',
    'drama',
    'family',
    'fantasy',
    'history',
    'horror',
    'music',
    'mystery',
    'romance',
    'science-fiction',
    'thriller',
    'war',
    'western',
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
  ];

  const videoQualities = [
    { value: 'auto', label: 'Auto' },
    { value: 'low', label: 'Low (480p)' },
    { value: 'medium', label: 'Medium (720p)' },
    { value: 'high', label: 'High (1080p)' },
    { value: 'ultra', label: 'Ultra (4K)' },
  ] as const;

  return (
    <div data-testid="content-preferences" className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground mb-4">Content Preferences</h3>

        <div className="space-y-4">
          {/* Preferred Genre */}
          <div>
            <label htmlFor="preferred-genre" className="block text-sm font-medium text-foreground mb-2">
              Preferred Genre
            </label>
            <select
              id="preferred-genre"
              data-testid="preferred-genre"
              value={preferences.preferredGenre || ''}
              onChange={e => onUpdate('preferredGenre', e.target.value)}
              disabled={disabled}
              className="block w-full px-3 py-2 border border-input rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select Genre</option>
              {genres.map(genre => (
                <option key={genre} value={genre}>
                  {genre.charAt(0).toUpperCase() + genre.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Content Language */}
          <div>
            <label htmlFor="content-language" className="block text-sm font-medium text-foreground mb-2">
              Content Language
            </label>
            <select
              id="content-language"
              data-testid="content-language"
              value={preferences.contentLanguage || ''}
              onChange={e => onUpdate('contentLanguage', e.target.value)}
              disabled={disabled}
              className="block w-full px-3 py-2 border border-input rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select Language</option>
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Video Quality */}
          <div>
            <label htmlFor="video-quality" className="block text-sm font-medium text-foreground mb-2">
              Video Quality
            </label>
            <select
              id="video-quality"
              data-testid="video-quality"
              value={preferences.videoQuality || 'auto'}
              onChange={e => onUpdate('videoQuality', e.target.value)}
              disabled={disabled}
              className="block w-full px-3 py-2 border border-input rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {videoQualities.map(quality => (
                <option key={quality.value} value={quality.value}>
                  {quality.label}
                </option>
              ))}
            </select>
          </div>

          {/* Adult Content */}
          <div className="flex items-center">
            <input
              id="adult-content"
              data-testid="adult-content"
              type="checkbox"
              checked={preferences.adultContent || false}
              onChange={e => onUpdate('adultContent', e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 text-primary focus:ring-2 focus:ring-ring border-input rounded disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor="adult-content" className="ml-2 block text-sm text-foreground">
              Show adult content
            </label>
          </div>

          {/* Subtitles */}
          <div className="flex items-center">
            <input
              id="subtitles-enabled"
              data-testid="subtitles-enabled"
              type="checkbox"
              checked={preferences.subtitlesEnabled || false}
              onChange={e => onUpdate('subtitlesEnabled', e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 text-primary focus:ring-2 focus:ring-ring border-input rounded disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor="subtitles-enabled" className="ml-2 block text-sm text-foreground">
              Enable subtitles by default
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export type { ContentPreferences as ContentPreferencesType };
