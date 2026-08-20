// Watchlist Type Definitions for GeoLeap Global Watchlist System

export interface WatchlistItem {
  id: string;
  title: string;
  type: 'movie' | 'tv_series' | 'documentary' | 'anime' | 'other';
  year?: number;
  genre?: string[];
  duration?: number; // in minutes
  rating?: number; // 1-10 scale
  imdbId?: string;
  tmdbId?: string;
  poster?: string;
  description?: string;
  availability: ServerAvailability[];
  addedDate: Date;
  lastChecked: Date;
  category?: string;
  tags?: string[];
  personalNotes?: string;
  priority: 'low' | 'medium' | 'high';
  watched: boolean;
  watchedDate?: Date;
  progress?: number; // 0-100 for TV series
  customFields?: Record<string, unknown>;
}

export interface ServerAvailability {
  serverId: string;
  serverName: string;
  location: string;
  quality: string[];
  format: string[];
  isAvailable: boolean;
  lastChecked: Date;
  downloadSpeed?: number;
  reliability?: number; // 0-100 score
}

export interface WatchlistSummary {
  id: string;
  name: string;
  description?: string;
  userId: string;
  userName: string;
  category?: WatchlistCategory;
  isPublic: boolean;
  isDefault: boolean;
  isFavorite: boolean;
  sortOrder: string;
  sortDirection: string;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
  lastActivityAt?: Date;
  hasNewUpdates: boolean;
  canEdit: boolean;
  canShare: boolean;
  ownerInfo?: {
    userId: string;
    userName: string;
    displayName?: string;
  };
}

export interface WatchlistCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  isDefault: boolean;
  sortOrder: number;
  createdDate: Date;
}

export interface WatchlistFilter {
  type?: string[];
  genre?: string[];
  year?: {
    min?: number;
    max?: number;
  };
  rating?: {
    min?: number;
    max?: number;
  };
  availability?: boolean;
  category?: string[];
  tags?: string[];
  watched?: boolean;
  priority?: string[];
  searchQuery?: string;
  sortBy: 'title' | 'addedDate' | 'year' | 'rating' | 'lastChecked' | 'priority';
  sortOrder: 'asc' | 'desc';
}

export interface WatchlistView {
  id: string;
  name: string;
  type: 'grid' | 'list' | 'compact';
  filter: WatchlistFilter;
  columnsVisible?: string[];
  gridSize?: 'small' | 'medium' | 'large';
  isDefault: boolean;
  isPublic: boolean;
}

export interface WatchlistShare {
  id: string;
  watchlistId: string;
  shareType: 'public' | 'private' | 'friends';
  shareUrl: string;
  expiryDate?: Date;
  allowComments: boolean;
  allowSuggestions: boolean;
  viewCount: number;
  createdDate: Date;
}

export interface WatchlistExport {
  format: 'json' | 'csv' | 'xml' | 'pdf' | 'm3u';
  includeAvailability: boolean;
  includeNotes: boolean;
  includeProgress: boolean;
  categories?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface WatchlistStats {
  totalItems: number;
  watchedItems: number;
  availableItems: number;
  categorizedItems: number;
  averageRating: number;
  totalDuration: number; // in minutes
  genreBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
  monthlyAdditions: Record<string, number>;
}

export interface WatchlistNotification {
  id: string;
  type: 'availability_change' | 'new_content' | 'reminder' | 'share_activity';
  itemId?: string;
  title: string;
  message: string;
  isRead: boolean;
  createdDate: Date;
  actionUrl?: string;
}

// Real-time update types
export interface WatchlistRealTimeUpdate {
  type: 'item_added' | 'item_removed' | 'item_updated' | 'availability_changed';
  itemId: string;
  data: Partial<WatchlistItem>;
  timestamp: Date;
  userId: string;
}

// API Response types
export interface WatchlistApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WatchlistBulkOperation {
  itemIds: string[];
  operation: 'delete' | 'category_change' | 'mark_watched' | 'mark_unwatched' | 'export';
  parameters?: Record<string, unknown>;
}

// Component Props Types
export interface WatchlistItemCardProps {
  item: WatchlistItem;
  view: 'grid' | 'list' | 'compact';
  isSelected?: boolean;
  isDragging?: boolean;
  onSelect?: (id: string) => void;
  onUpdate?: (item: WatchlistItem) => void;
  onRemove?: (id: string) => void;
  onToggleWatched?: (id: string) => void;
  className?: string;
}

export interface WatchlistDashboardProps {
  items: WatchlistItem[];
  categories: WatchlistCategory[];
  currentView: WatchlistView;
  isLoading?: boolean;
  onItemAdd?: (item: Partial<WatchlistItem>) => void;
  onItemUpdate?: (item: WatchlistItem) => void;
  onItemRemove?: (id: string) => void;
  onBulkOperation?: (operation: WatchlistBulkOperation) => void;
  onViewChange?: (view: WatchlistView) => void;
  onFilterChange?: (filter: WatchlistFilter) => void;
}

export interface WatchlistSyncStatus {
  isConnected: boolean;
  lastSync: Date;
  pendingChanges: number;
  syncInProgress: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}
