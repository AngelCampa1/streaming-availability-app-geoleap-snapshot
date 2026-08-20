// Enhanced Search Components - Phase 3.1
export { default as AutocompleteInput } from './AutocompleteInput';
export { default as SearchSuggestions } from './SearchSuggestions';
export { default as SearchResults } from './SearchResults';
export { default as FilterModal } from './FilterModal';
export { default as SearchHistory } from './SearchHistory';
export { default as VoiceSearch } from './VoiceSearch';

// Legacy components (for backward compatibility)
export { default as VoiceSearchComponent } from './VoiceSearchComponent';
export { default as BarcodeScannerComponent } from './BarcodeScannerComponent';
export { default as SearchAutocompleteComponent } from './SearchAutocompleteComponent';
export { default as SearchHistoryComponent } from './SearchHistoryComponent';
export { default as SearchFiltersComponent } from './SearchFiltersComponent';
export { default as SearchResultsComponent } from './SearchResultsComponent';

// Re-export streaming types for convenience
export type {
  StreamingContent,
  StreamingAvailability,
  StreamingService,
  Country,
  SearchResult,
  SearchFilters,
  SearchSuggestion,
  SearchHistory as StreamingSearchHistory,
  VoiceSearchResult as StreamingVoiceSearchResult,
  SearchAnalytics,
  PopularSearch,
  PaginationInfo,
  SearchResponse,
} from '../../types/streaming';

// Legacy search types (for backward compatibility)
export type {
  SearchItem,
  SearchFilter as LegacySearchFilter,
  SearchHistory as LegacySearchHistory,
  SearchAutoComplete,
  SearchResults as LegacySearchResults,
  VoiceSearchResult as LegacyVoiceSearchResult,
  QRCodeResult,
} from '../../types/search';

// Enhanced hooks
export { default as useEnhancedSearch } from '../../hooks/useEnhancedSearch';

// Legacy hooks (for backward compatibility)
export { useSearch } from '../../hooks/useSearch';
export { useVoiceSearch } from '../../hooks/useVoiceSearch';

// Enhanced services
export { searchService as enhancedSearchService } from '../../services/search/SearchService';
export { searchHistoryService } from '../../services/search/SearchHistoryService';

// Legacy service (for backward compatibility)
export { searchService as legacySearchService } from '../../services/searchService';
