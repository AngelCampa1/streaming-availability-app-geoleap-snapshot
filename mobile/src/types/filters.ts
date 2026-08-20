/**
 * Filter type definitions for GeoLeap advanced filtering system
 */

export interface FilterOptions {
  // Content Type
  contentType: ContentType[];

  // Genre
  genres: string[];

  // Year Range
  yearRange: [number, number];

  // Rating
  minRating: number;

  // Country Availability
  countries: string[];

  // Streaming Services
  streamingServices: string[];

  // Price
  priceType: PriceType[];

  // Language
  languages: string[];

  // Content Rating
  contentRatings: string[];
}

export interface SortOptions {
  field: SortField;
  direction: SortDirection;
  secondaryField?: SortField;
  secondaryDirection?: SortDirection;
}

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: FilterOptions;
  sortOptions: SortOptions;
  isDefault?: boolean;
  isSystem?: boolean;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

export interface FilterState {
  activeFilters: FilterOptions;
  sortOptions: SortOptions;
  activePresetId?: string;
  isFilterModalVisible: boolean;
  quickFilters: string[];
  recentlyUsed: FilterPreset[];
  savedPresets: FilterPreset[];
  filterCount: number;
  isLoading: boolean;
}

export interface FilterServiceOptions {
  persistToStorage?: boolean;
  debounceMs?: number;
  maxRecentPresets?: number;
}

// Enums
export enum ContentType {
  MOVIE = 'movie',
  TV_SERIES = 'tv_series',
  DOCUMENTARY = 'documentary',
  SHORT_FILM = 'short_film',
  ANIME = 'anime',
  CARTOON = 'cartoon'
}

export enum PriceType {
  FREE = 'free',
  SUBSCRIPTION = 'subscription',
  RENTAL = 'rental',
  PURCHASE = 'purchase',
  ADS_SUPPORTED = 'ads_supported'
}

export enum SortField {
  RELEVANCE = 'relevance',
  POPULARITY = 'popularity',
  RELEASE_DATE = 'release_date',
  RATING = 'rating',
  USER_REVIEWS = 'user_reviews',
  PRICE = 'price',
  AVAILABILITY = 'availability',
  RECENTLY_ADDED = 'recently_added',
  TITLE = 'title',
  DURATION = 'duration'
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

// Filter Configuration
export interface FilterConfig {
  type: 'select' | 'multiselect' | 'range' | 'toggle' | 'rating';
  key: keyof FilterOptions;
  label: string;
  options?: FilterOption[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: any;
  icon?: string;
  category: FilterCategory;
  description?: string;
}

export interface FilterOption {
  label: string;
  value: string | number;
  count?: number;
  icon?: string;
  color?: string;
}

export enum FilterCategory {
  CONTENT = 'content',
  AVAILABILITY = 'availability',
  TECHNICAL = 'technical',
  PERSONAL = 'personal'
}

// Filter Analytics
export interface FilterAnalytics {
  presetId?: string;
  filters: FilterOptions;
  sortOptions: SortOptions;
  resultCount: number;
  executionTime: number;
  timestamp: Date;
  userId?: string;
}

// Filter Validation
export interface FilterValidationResult {
  isValid: boolean;
  errors: FilterValidationError[];
  warnings: FilterValidationWarning[];
}

export interface FilterValidationError {
  field: keyof FilterOptions;
  message: string;
  code: string;
}

export interface FilterValidationWarning {
  field: keyof FilterOptions;
  message: string;
  code: string;
}

// API Integration
export interface FilterSearchParams {
  contentType?: string[];
  genres?: string[];
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
  countries?: string[];
  streamingServices?: string[];
  priceType?: string[];
  languages?: string[];
  contentRatings?: string[];
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

// Export/Import
export interface FilterExport {
  version: string;
  presets: FilterPreset[];
  preferences: FilterPreferences;
  exportedAt: Date;
}

export interface FilterPreferences {
  defaultSortOptions: SortOptions;
  autoApplyFilters: boolean;
  showFilterCount: boolean;
  compactView: boolean;
  animationsEnabled: boolean;
}

// Component Props
export interface FilterChipProps {
  label: string;
  value: string;
  isSelected: boolean;
  onPress: (value: string) => void;
  onLongPress?: (value: string) => void;
  disabled?: boolean;
  variant?: 'default' | 'compact' | 'pills';
  color?: string;
  icon?: string;
  count?: number;
}

export interface RangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  step?: number;
  disabled?: boolean;
  showLabels?: boolean;
  showValue?: boolean;
  minLabel?: string;
  maxLabel?: string;
  color?: string;
  height?: number;
}

export interface MultiSelectProps {
  options: FilterOption[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  maxVisible?: number;
  showSelectAll?: boolean;
  showClear?: boolean;
  disabled?: boolean;
  multiColumn?: boolean;
  columns?: number;
}

export interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions, sortOptions: SortOptions) => void;
  filters: FilterOptions;
  sortOptions: SortOptions;
  presets: FilterPreset[];
  onSavePreset: (preset: Omit<FilterPreset, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void;
  onDeletePreset: (presetId: string) => void;
  analytics?: FilterAnalytics;
}

export interface SortOptionsProps {
  value: SortOptions;
  onChange: (sortOptions: SortOptions) => void;
  fields?: SortField[];
  showSecondary?: boolean;
  compact?: boolean;
}

export interface FilterPresetProps {
  preset: FilterPreset;
  onApply: (preset: FilterPreset) => void;
  onEdit?: (preset: FilterPreset) => void;
  onDelete?: (presetId: string) => void;
  onDuplicate?: (preset: FilterPreset) => void;
  isActive?: boolean;
  isDefault?: boolean;
  showUsageCount?: boolean;
  compact?: boolean;
}

// Constants
export const DEFAULT_FILTERS: FilterOptions = {
  contentType: [],
  genres: [],
  yearRange: [1900, new Date().getFullYear()],
  minRating: 0,
  countries: [],
  streamingServices: [],
  priceType: [],
  languages: [],
  contentRatings: [],
};

export const DEFAULT_SORT_OPTIONS: SortOptions = {
  field: SortField.RELEVANCE,
  direction: SortDirection.DESC,
};

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'trending-now',
    name: 'Trending Now',
    description: 'Popular content from the last 30 days',
    filters: { ...DEFAULT_FILTERS },
    sortOptions: { field: SortField.POPULARITY, direction: SortDirection.DESC },
    isSystem: true,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 0,
  },
  {
    id: 'new-releases',
    name: 'New Releases',
    description: 'Latest movies and TV shows',
    filters: {
      ...DEFAULT_FILTERS,
      yearRange: [new Date().getFullYear() - 1, new Date().getFullYear()],
    },
    sortOptions: { field: SortField.RELEASE_DATE, direction: SortDirection.DESC },
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 0,
  },
  {
    id: 'highly-rated',
    name: 'Highly Rated',
    description: 'Top-rated content (8+ stars)',
    filters: {
      ...DEFAULT_FILTERS,
      minRating: 8,
    },
    sortOptions: { field: SortField.RATING, direction: SortDirection.DESC },
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 0,
  },
  {
    id: 'free-content',
    name: 'Free to Watch',
    description: 'Content available at no cost',
    filters: {
      ...DEFAULT_FILTERS,
      priceType: [PriceType.FREE, PriceType.ADS_SUPPORTED],
    },
    sortOptions: { field: SortField.RELEVANCE, direction: SortDirection.DESC },
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 0,
  },
];

export const GENRE_OPTIONS: FilterOption[] = [
  { label: 'Action', value: 'action' },
  { label: 'Adventure', value: 'adventure' },
  { label: 'Animation', value: 'animation' },
  { label: 'Biography', value: 'biography' },
  { label: 'Comedy', value: 'comedy' },
  { label: 'Crime', value: 'crime' },
  { label: 'Documentary', value: 'documentary' },
  { label: 'Drama', value: 'drama' },
  { label: 'Family', value: 'family' },
  { label: 'Fantasy', value: 'fantasy' },
  { label: 'History', value: 'history' },
  { label: 'Horror', value: 'horror' },
  { label: 'Music', value: 'music' },
  { label: 'Mystery', value: 'mystery' },
  { label: 'Romance', value: 'romance' },
  { label: 'Sci-Fi', value: 'sci-fi' },
  { label: 'Sport', value: 'sport' },
  { label: 'Thriller', value: 'thriller' },
  { label: 'War', value: 'war' },
  { label: 'Western', value: 'western' },
];

export const STREAMING_SERVICE_OPTIONS: FilterOption[] = [
  { label: 'Netflix', value: 'netflix', color: '#E50914' },
  { label: 'Amazon Prime', value: 'amazon_prime', color: '#00A8E1' },
  { label: 'Disney+', value: 'disney_plus', color: '#113CCF' },
  { label: 'HBO Max', value: 'hbo_max', color: '#B535F6' },
  { label: 'Hulu', value: 'hulu', color: '#1DB954' },
  { label: 'Apple TV+', value: 'apple_tv_plus', color: '#000000' },
  { label: 'Paramount+', value: 'paramount_plus', color: '#0066CC' },
  { label: 'Peacock', value: 'peacock', color: '#7000F6' },
  { label: 'YouTube', value: 'youtube', color: '#FF0000' },
  { label: 'Tubi', value: 'tubi', color: '#ED2228' },
  { label: 'Crunchyroll', value: 'crunchyroll', color: '#F47521' },
  { label: 'Mubi', value: 'mubi', color: '#F57F17' },
];

export const CONTENT_RATING_OPTIONS: FilterOption[] = [
  { label: 'G (All Ages)', value: 'G' },
  { label: 'PG', value: 'PG' },
  { label: 'PG-13', value: 'PG-13' },
  { label: 'R', value: 'R' },
  { label: 'NC-17', value: 'NC-17' },
  { label: 'TV-Y', value: 'TV-Y' },
  { label: 'TV-Y7', value: 'TV-Y7' },
  { label: 'TV-G', value: 'TV-G' },
  { label: 'TV-PG', value: 'TV-PG' },
  { label: 'TV-14', value: 'TV-14' },
  { label: 'TV-MA', value: 'TV-MA' },
];

export const LANGUAGE_OPTIONS: FilterOption[] = [
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Italian', value: 'it' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Chinese', value: 'zh' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Arabic', value: 'ar' },
  { label: 'Russian', value: 'ru' },
];

export const COUNTRY_OPTIONS: FilterOption[] = [
  { label: 'United States', value: 'US' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'Canada', value: 'CA' },
  { label: 'Australia', value: 'AU' },
  { label: 'Germany', value: 'DE' },
  { label: 'France', value: 'FR' },
  { label: 'Italy', value: 'IT' },
  { label: 'Spain', value: 'ES' },
  { label: 'Japan', value: 'JP' },
  { label: 'Brazil', value: 'BR' },
  { label: 'India', value: 'IN' },
  { label: 'Mexico', value: 'MX' },
];
