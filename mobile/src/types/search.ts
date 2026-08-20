export interface SearchItem {
  id: string;
  title: string;
  description?: string;
  type: 'content' | 'user' | 'channel' | 'location';
  thumbnail?: string;
  url?: string;
  tags?: string[];
  createdAt: Date;
  popularity?: number;
}

export interface SearchFilter {
  type?: string[];
  category?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy?: 'relevance' | 'date' | 'popularity';
  region?: string;
  minScore?: number;
  limit?: number;
}

export interface SearchHistory {
  id: string;
  query: string;
  timestamp: number;
  filters?: SearchFilter;
  resultCount: number;
}

export interface VoiceSearchResult {
  text: string;
  confidence: number;
  alternatives?: string[];
}

export interface QRCodeResult {
  type: 'url' | 'text' | 'location' | 'contact';
  data: string;
  format?: string;
}

export interface SearchAutoComplete {
  id: string;
  text: string;
  type: 'history' | 'autocomplete' | 'trending';
  category?: string;
  count?: number;
}

export interface SearchResults {
  items: SearchItem[];
  totalCount: number;
  hasMore: boolean;
  nextPage?: string;
  filters: SearchFilter;
  query: string;
}

export interface WatchlistItem {
  id: string;
  item: SearchItem;
  addedAt: Date;
}

export interface ShareOptions {
  title: string;
  message: string;
  url?: string;
}

export interface ViewModeSettings {
  defaultMode: 'list' | 'grid';
  rememberPreference: boolean;
}
