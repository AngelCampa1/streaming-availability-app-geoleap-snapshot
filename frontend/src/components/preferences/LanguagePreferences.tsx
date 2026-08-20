'use client';

import React, { useState } from 'react';
import { Globe, Check, AlertCircle } from 'lucide-react';

// Common languages for audio and subtitles
const COMMON_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
];

export interface LanguagePreferencesData {
  audioLanguages: string[];
  subtitleLanguages: string[];
}

interface LanguagePreferencesProps {
  preferences: LanguagePreferencesData;
  onUpdate: (key: string, value: string[]) => void;
  disabled?: boolean;
}

export const LanguagePreferences: React.FC<LanguagePreferencesProps> = ({
  preferences,
  onUpdate,
  disabled = false
}) => {
  const [audioLanguages, setAudioLanguages] = useState<string[]>(preferences.audioLanguages || []);
  const [subtitleLanguages, setSubtitleLanguages] = useState<string[]>(preferences.subtitleLanguages || []);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [audioDropdownOpen, setAudioDropdownOpen] = useState(false);
  const [subtitleDropdownOpen, setSubtitleDropdownOpen] = useState(false);

  const toggleLanguage = (type: 'audio' | 'subtitle', languageCode: string) => {
    if (disabled) return;

    if (type === 'audio') {
      const updated = audioLanguages.includes(languageCode)
        ? audioLanguages.filter(code => code !== languageCode)
        : [...audioLanguages, languageCode];
      setAudioLanguages(updated);
    } else {
      const updated = subtitleLanguages.includes(languageCode)
        ? subtitleLanguages.filter(code => code !== languageCode)
        : [...subtitleLanguages, languageCode];
      setSubtitleLanguages(updated);
    }
  };

  const handleSave = async () => {
    if (disabled) return;

    setSaveStatus('saving');
    try {
      onUpdate('audioLanguages', audioLanguages);
      onUpdate('subtitleLanguages', subtitleLanguages);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (_error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const getLanguageName = (code: string): string => {
    return COMMON_LANGUAGES.find(lang => lang.code === code)?.name || code;
  };

  const hasChanges =
    JSON.stringify(audioLanguages.sort()) !== JSON.stringify((preferences.audioLanguages || []).sort()) ||
    JSON.stringify(subtitleLanguages.sort()) !== JSON.stringify((preferences.subtitleLanguages || []).sort());

  return (
    <div data-testid="language-preferences" className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-medium text-foreground">Language Preferences</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Select your preferred languages for audio and subtitles to get better VPN recommendations.
      </p>

      {/* Audio Languages */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Preferred Audio Languages
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setAudioDropdownOpen(!audioDropdownOpen)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-background text-left flex items-center justify-between"
            data-testid="audio-languages-dropdown"
          >
            <span className="flex flex-wrap gap-1">
              {audioLanguages.length === 0 ? (
                <span className="text-muted-foreground">Select audio languages...</span>
              ) : (
                audioLanguages.map(code => (
                  <span
                    key={code}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                  >
                    {getLanguageName(code)}
                  </span>
                ))
              )}
            </span>
            <svg
              className={`h-5 w-5 text-muted-foreground transition-transform ${audioDropdownOpen ? 'transform rotate-180' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {audioDropdownOpen && !disabled && (
            <div className="absolute z-10 mt-1 w-full bg-background shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-border overflow-auto focus:outline-none sm:text-sm">
              {COMMON_LANGUAGES.map(language => (
                <div
                  key={language.code}
                  onClick={() => toggleLanguage('audio', language.code)}
                  className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-primary/10"
                  data-testid={`audio-language-${language.code}`}
                >
                  <span className="block truncate">
                    {language.name}
                  </span>
                  {audioLanguages.includes(language.code) && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary">
                      <Check className="h-5 w-5" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subtitle Languages */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Preferred Subtitle Languages
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setSubtitleDropdownOpen(!subtitleDropdownOpen)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-background text-left flex items-center justify-between"
            data-testid="subtitle-languages-dropdown"
          >
            <span className="flex flex-wrap gap-1">
              {subtitleLanguages.length === 0 ? (
                <span className="text-muted-foreground">Select subtitle languages...</span>
              ) : (
                subtitleLanguages.map(code => (
                  <span
                    key={code}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent-foreground"
                  >
                    {getLanguageName(code)}
                  </span>
                ))
              )}
            </span>
            <svg
              className={`h-5 w-5 text-muted-foreground transition-transform ${subtitleDropdownOpen ? 'transform rotate-180' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {subtitleDropdownOpen && !disabled && (
            <div className="absolute z-10 mt-1 w-full bg-background shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-border overflow-auto focus:outline-none sm:text-sm">
              {COMMON_LANGUAGES.map(language => (
                <div
                  key={language.code}
                  onClick={() => toggleLanguage('subtitle', language.code)}
                  className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-accent/10"
                  data-testid={`subtitle-language-${language.code}`}
                >
                  <span className="block truncate">
                    {language.name}
                  </span>
                  {subtitleLanguages.includes(language.code) && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-accent-foreground">
                      <Check className="h-5 w-5" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Button and Status */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || !hasChanges || saveStatus === 'saving'}
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="save-language-preferences"
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save Preferences'}
        </button>

        {saveStatus === 'saved' && (
          <div className="flex items-center gap-2 text-success" data-testid="save-success-message">
            <Check className="h-5 w-5" />
            <span className="text-sm">Preferences saved successfully!</span>
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 text-destructive" data-testid="save-error-message">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">Failed to save preferences. Please try again.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export type { LanguagePreferencesData as LanguagePreferencesType };
