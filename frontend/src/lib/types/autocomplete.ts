/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContentType } from './paywall';

export interface AutocompleteSuggestion {
  text: string;
  type: AutocompleteSuggestionType;
  score: number;
  contentId?: string;
  contentType?: ContentType;
  posterUrl?: string;
  year?: number;
  genres: string[];
  rating?: number;
  estimatedResults: number;
  metadata: Record<string, any>;
}

export enum AutocompleteSuggestionType {
  Title = 'Title',
  Person = 'Person',
  Genre = 'Genre',
  Character = 'Character',
  Collection = 'Collection',
  Trending = 'Trending',
  History = 'History',
  Typo = 'Typo',
}

export interface SearchHistoryItem {
  query: string;
  searchedAt: string;
  resultCount: number;
  wasSuccessful: boolean;
}

export interface TrendingSearch {
  query: string;
  searchCount: number;
  uniqueUsers: number;
  trendingScore: number;
  timeWindow: number; // in milliseconds
  isRising: boolean;
}

export interface AutocompleteOptions {
  maxSuggestions?: number;
  includeHistory?: boolean;
  includeTrending?: boolean;
  debounceMs?: number;
  minQueryLength?: number;
  showVisualElements?: boolean;
  enableKeyboardNavigation?: boolean;
  cacheResults?: boolean;
}

export interface AutocompleteState {
  isOpen: boolean;
  isLoading: boolean;
  suggestions: AutocompleteSuggestion[];
  selectedIndex: number;
  query: string;
  error?: string;
}

// Default autocomplete options
export const DEFAULT_AUTOCOMPLETE_OPTIONS: Required<AutocompleteOptions> = {
  maxSuggestions: 8,
  includeHistory: true,
  includeTrending: true,
  debounceMs: 300,
  minQueryLength: 2,
  showVisualElements: true,
  enableKeyboardNavigation: true,
  cacheResults: true,
};

// Suggestion type configurations for UI rendering
// Uses Stream Violet palette - see docs/UNIFIED_COLOR_SYSTEM.md
export const SUGGESTION_TYPE_CONFIG = {
  [AutocompleteSuggestionType.Title]: {
    icon: '🎬',
    color: 'text-primary-600',
    bgColor: 'bg-primary-50',
    label: 'Movie/Show',
  },
  [AutocompleteSuggestionType.Person]: {
    icon: '👤',
    color: 'text-success-600',
    bgColor: 'bg-success-50',
    label: 'Person',
  },
  [AutocompleteSuggestionType.Genre]: {
    icon: '🎭',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    label: 'Genre',
  },
  [AutocompleteSuggestionType.Character]: {
    icon: '🎪',
    color: 'text-warning-600',
    bgColor: 'bg-warning-50',
    label: 'Character',
  },
  [AutocompleteSuggestionType.Collection]: {
    icon: '📚',
    color: 'text-info',
    bgColor: 'bg-info/10',
    label: 'Collection',
  },
  [AutocompleteSuggestionType.Trending]: {
    icon: '🔥',
    color: 'text-error-600',
    bgColor: 'bg-error-50',
    label: 'Trending',
  },
  [AutocompleteSuggestionType.History]: {
    icon: '🕐',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    label: 'Recent',
  },
  [AutocompleteSuggestionType.Typo]: {
    icon: '✏️',
    color: 'text-warning-600',
    bgColor: 'bg-warning-50',
    label: 'Did you mean?',
  },
} as const;
