/**
 * Language preferences types and interfaces
 */

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string; // emoji flag
}

export interface LanguagePreferences {
  userId?: string;
  audioLanguages: string[]; // language codes
  subtitleLanguages: string[]; // language codes
  lastUpdated?: number;
}

export interface LanguageMatch {
  matched: boolean;
  matchedAudio: boolean;
  matchedSubtitles: boolean;
  availableAudioLanguages: string[];
  availableSubtitleLanguages: string[];
  matchScore: number; // 0-100
}

export interface StreamingOptionLanguages {
  audioLanguages: string[];
  subtitleLanguages: string[];
}

// Supported Languages Database
export const SUPPORTED_LANGUAGES: Language[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇵🇹',
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷',
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
  },
];

// Helper function to get language by code
export const getLanguageByCode = (code: string): Language | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
};

// Helper function to calculate language match score
export const calculateLanguageMatchScore = (
  userPreferences: LanguagePreferences,
  available: StreamingOptionLanguages,
): LanguageMatch => {
  const audioMatches = userPreferences.audioLanguages.filter(lang =>
    available.audioLanguages.includes(lang),
  );
  const subtitleMatches = userPreferences.subtitleLanguages.filter(lang =>
    available.subtitleLanguages.includes(lang),
  );

  const matchedAudio = audioMatches.length > 0;
  const matchedSubtitles = subtitleMatches.length > 0;
  const matched = matchedAudio || matchedSubtitles;

  // Calculate match score (weighted: audio 60%, subtitles 40%)
  const audioScore = userPreferences.audioLanguages.length > 0
    ? (audioMatches.length / userPreferences.audioLanguages.length) * 60
    : 0;
  const subtitleScore = userPreferences.subtitleLanguages.length > 0
    ? (subtitleMatches.length / userPreferences.subtitleLanguages.length) * 40
    : 0;

  const matchScore = Math.round(audioScore + subtitleScore);

  return {
    matched,
    matchedAudio,
    matchedSubtitles,
    availableAudioLanguages: available.audioLanguages,
    availableSubtitleLanguages: available.subtitleLanguages,
    matchScore,
  };
};
