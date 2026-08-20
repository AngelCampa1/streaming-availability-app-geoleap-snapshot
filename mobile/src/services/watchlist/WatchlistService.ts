import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../api/ApiService';
import { endpoints } from '../../config/api';
import { logger as loggerImport } from '../../utils/logger';

// Safe logger wrapper that handles undefined cases in test environments
const logger = {
  debug: (...args: unknown[]) => loggerImport && typeof loggerImport.debug === 'function' ? loggerImport.debug(...(args as [any, ...any[]])) : undefined,
  info: (...args: unknown[]) => loggerImport && typeof loggerImport.info === 'function' ? loggerImport.info(...(args as [any, ...any[]])) : undefined,
  warn: (...args: unknown[]) => loggerImport && typeof loggerImport.warn === 'function' ? loggerImport.warn(...(args as [any, ...any[]])) : undefined,
  error: (...args: unknown[]) => loggerImport && typeof loggerImport.error === 'function' ? loggerImport.error(...(args as [any, ...any[]])) : console.error(...args),
};

export interface WatchlistItem {
  id: string;
  title: string;
  type: 'movie' | 'tv_series' | 'documentary' | 'anime' | 'other';
  rating: number;
  year: number;
  availableOn: string[];
  poster?: string;
  backdrop?: string;
  genres: string[];
  runtime?: number;
  seasons?: number;
  status: 'to_watch' | 'watching' | 'watched' | 'on_hold' | 'dropped';
  priority: 'low' | 'medium' | 'high';
  progress?: {
    current?: number;
    total?: number;
    episode?: number;
    season?: number;
  };
  addedAt: string;
  watchedAt?: string;
  notes?: string;
  tags?: string[];
  userRating?: number;
  review?: string;
  rewatchCount?: number;
}

export interface Watchlist {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isPublic: boolean;
  items: WatchlistItem[];
  color?: string;
  icon?: string;
  createdBy: string;
  collaborators?: string[];
  createdAt: string;
  updatedAt: string;
  shareCode?: string;
}

export interface WatchlistStats {
  totalItems: number;
  watchedItems: number;
  currentlyWatching: number;
  averageRating: number;
  favoriteGenre: string;
  totalTimeWatched: number;
  thisMonthAdded: number;
  thisMonthWatched: number;
}

class WatchlistService {
  // Base storage key prefixes - userId is appended at runtime for user isolation
  private readonly STORAGE_KEY_PREFIXES = {
    WATCHLISTS: '@geoleap_watchlists',
    WATCHLIST_CACHE: '@geoleap_watchlist_cache',
    SYNC_QUEUE: '@geoleap_watchlist_sync_queue',
  };

  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Current user ID for scoping storage - prevents BUG-002 (cache pollution)
  private currentUserId: string | null = null;

  /**
   * Set the current user ID. Call this on login.
   * All storage operations will be scoped to this user.
   * BUG-002 FIX: Ensures cache is user-specific.
   */
  setCurrentUser(userId: string): void {
    this.currentUserId = userId;
  }

  /**
   * Get current user ID.
   */
  getCurrentUser(): string | null {
    return this.currentUserId;
  }

  /**
   * Clear all user-specific data. Call this on logout to prevent data leakage.
   */
  async clearUserData(userId?: string): Promise<void> {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      return;
    }

    try {
      const keys = [
        this.getWatchlistsKey(targetUserId),
        this.getSyncQueueKey(targetUserId),
      ];
      // Also clear any individual watchlist caches
      // Note: We can't easily enumerate all cached watchlists, but the keys with userId
      // will become inaccessible when user changes
      await AsyncStorage.multiRemove(keys);
      logger.debug('[WatchlistService] Cleared user data', { userId: targetUserId });
    } catch (error) {
      logger.warn('[WatchlistService] Failed to clear user data', error);
    }

    if (userId === this.currentUserId || !userId) {
      this.currentUserId = null;
    }
  }

  /**
   * Get user-scoped storage key for watchlists.
   * BUG-002 FIX: Ensures watchlists are isolated per user.
   */
  private getWatchlistsKey(userId?: string): string {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      // Fallback to global key if no user (for backwards compatibility)
      return this.STORAGE_KEY_PREFIXES.WATCHLISTS;
    }
    return `${this.STORAGE_KEY_PREFIXES.WATCHLISTS}_${targetUserId}`;
  }

  /**
   * Get user-scoped storage key for watchlist cache.
   */
  private getWatchlistCacheKey(watchlistId: string, userId?: string): string {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      return `${this.STORAGE_KEY_PREFIXES.WATCHLIST_CACHE}_${watchlistId}`;
    }
    return `${this.STORAGE_KEY_PREFIXES.WATCHLIST_CACHE}_${targetUserId}_${watchlistId}`;
  }

  /**
   * Get user-scoped storage key for sync queue.
   */
  private getSyncQueueKey(userId?: string): string {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      return this.STORAGE_KEY_PREFIXES.SYNC_QUEUE;
    }
    return `${this.STORAGE_KEY_PREFIXES.SYNC_QUEUE}_${targetUserId}`;
  }

  async getAllWatchlists(): Promise<Watchlist[]> {
    try {
      logger.info('Fetching all watchlists');

      const response = await ApiService.get<{ watchlists: Watchlist[] }>(
        endpoints.users.watchlist,
        {
          cacheTTL: 300000, // 5 minutes cache
        },
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch watchlists');
      }

      logger.info('Watchlists fetched successfully:', { count: response.data.watchlists.length });

      // Cache each watchlist
      for (const watchlist of response.data.watchlists) {
        await this.cacheWatchlist(watchlist);
      }

      return response.data.watchlists;
    } catch (error: any) {
      logger.error('Failed to fetch watchlists from server:', error);
      logger.warn('Falling back to cached watchlists');
      return this.getCachedWatchlists();
    }
  }

  async getWatchlist(id: string): Promise<Watchlist | null> {
    try {
      logger.info('Fetching watchlist:', { id });

      const response = await ApiService.get<{ watchlist: Watchlist }>(
        `${endpoints.users.watchlist}/${id}`,
        {
          cacheTTL: 300000, // 5 minutes cache
        },
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch watchlist');
      }

      await this.cacheWatchlist(response.data.watchlist);
      logger.info('Watchlist fetched successfully:', { id, itemCount: response.data.watchlist.items.length });
      return response.data.watchlist;

    } catch (error: any) {
      logger.error('Failed to fetch watchlist:', { id, error: error.message });
      logger.warn(`Falling back to cached watchlist ${id}`);
      return this.getCachedWatchlist(id);
    }
  }

  async createWatchlist(data: Omit<Watchlist, 'id' | 'items' | 'createdAt' | 'updatedAt'>): Promise<Watchlist> {
    const watchlist: Omit<Watchlist, 'id'> = {
      ...data,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      logger.info('Creating watchlist:', { name: data.name });

      const response = await ApiService.post<{ watchlist: Watchlist }>(
        endpoints.users.watchlist,
        watchlist,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to create watchlist');
      }

      await this.cacheWatchlist(response.data.watchlist);
      logger.info('Watchlist created successfully:', { id: response.data.watchlist.id });
      return response.data.watchlist;

    } catch (error: any) {
      logger.error('Failed to create watchlist:', { name: data.name, error: error.message });
      throw error;
    }
  }

  /**
   * Resolve the id of the user's default watchlist, creating one if none exists.
   * The backend keys watchlists by Guid, so callers must use a real id rather
   * than a hardcoded placeholder. Prefers a watchlist flagged isDefault, then
   * the first available, then creates a new default watchlist.
   */
  async getOrCreateDefaultWatchlistId(): Promise<string> {
    const watchlists = await this.getAllWatchlists();
    const existing = watchlists.find((w) => w.isDefault) ?? watchlists[0];
    if (existing) {
      return existing.id;
    }

    const created = await this.createWatchlist({
      name: 'My Watchlist',
      isDefault: true,
      isPublic: false,
      createdBy: this.currentUserId ?? '',
    });
    return created.id;
  }

  async updateWatchlist(id: string, updates: Partial<Watchlist>): Promise<Watchlist> {
    const updatedWatchlist = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await ApiService.put<{ watchlist: Watchlist }>(
        `${endpoints.users.watchlist}/${id}`,
        updatedWatchlist,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update watchlist');
      }

      const watchlist = response.data.watchlist;
      await this.cacheWatchlist(watchlist);
      return watchlist;
    } catch (error) {
      logger.warn('Failed to update watchlist, updating cache');
      const cached = await this.getCachedWatchlist(id);
      if (cached) {
        const updated = { ...cached, ...updatedWatchlist };
        await this.cacheWatchlist(updated);
        return updated;
      }
      throw error;
    }
  }

  async deleteWatchlist(id: string): Promise<void> {
    try {
      const response = await ApiService.delete(`${endpoints.users.watchlist}/${id}`);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete watchlist');
      }

      await this.removeCachedWatchlist(id);
    } catch (error) {
      logger.error('Failed to delete watchlist:', error);
      throw error;
    }
  }

  async addToWatchlist(watchlistId: string, item: Omit<WatchlistItem, 'id' | 'addedAt'>): Promise<WatchlistItem> {
    const watchlistItem: WatchlistItem = {
      ...item,
      id: this.generateId(),
      addedAt: new Date().toISOString(),
    };

    try {
      logger.info('Adding item to watchlist:', { watchlistId, title: item.title });

      const response = await ApiService.post<{ item: WatchlistItem }>(
        `${endpoints.streaming.watchlist}/${watchlistId}/items`,
        watchlistItem,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to add item to watchlist');
      }

      await this.updateCachedWatchlistWithItem(watchlistId, response.data.item);
      logger.info('Item added to watchlist successfully:', { watchlistId, itemId: response.data.item.id });
      return response.data.item;

    } catch (error: any) {
      logger.error('Failed to add item to watchlist:', { watchlistId, title: item.title, error: error.message });
      throw error;
    }
  }

  async updateWatchlistItem(watchlistId: string, itemId: string, updates: Partial<WatchlistItem>): Promise<WatchlistItem> {
    try {
      const response = await ApiService.put<{ item: WatchlistItem }>(
        `${endpoints.streaming.watchlist}/${watchlistId}/items/${itemId}`,
        updates,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update watchlist item');
      }

      const updatedItem = response.data.item;
      await this.updateCachedWatchlistItem(watchlistId, itemId, updatedItem);
      return updatedItem;
    } catch (error) {
      logger.warn('Failed to update watchlist item, updating cache');
      const cached = await this.getCachedWatchlistItem(watchlistId, itemId);
      if (cached) {
        const updated = { ...cached, ...updates };
        await this.updateCachedWatchlistItem(watchlistId, itemId, updated);
        return updated;
      }
      throw error;
    }
  }

  async removeFromWatchlist(watchlistId: string, itemId: string): Promise<void> {
    try {
      const response = await ApiService.delete(`${endpoints.streaming.watchlist}/${watchlistId}/items/${itemId}`);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to remove item');
      }

      await this.removeCachedWatchlistItem(watchlistId, itemId);
    } catch (error) {
      logger.error('Failed to remove item from watchlist:', error);
      throw error;
    }
  }

  async getWatchlistStats(userId: string): Promise<WatchlistStats> {
    try {
      const response = await ApiService.get<WatchlistStats | { stats: WatchlistStats }>(`/api/users/${userId}/watchlist/stats`);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch watchlist stats');
      }

      // Handle both response formats: direct stats or wrapped in stats property
      const stats = 'stats' in response.data ? response.data.stats : response.data;
      return stats;
    } catch (error) {
      logger.warn('Failed to fetch watchlist stats, calculating from cache');
      return this.calculateStatsFromCache();
    }
  }

  async searchWatchlists(query: string, filters?: {
    genre?: string;
    genres?: string[];
    type?: string;
    status?: string;
    rating?: number;
  }): Promise<WatchlistItem[]> {
    try {
      // Build query string with filters
      const params = new URLSearchParams({ query });
      const genresFilter = filters?.genres || (filters?.genre ? [filters.genre] : []);
      if (genresFilter.length > 0) params.append('genres', genresFilter.join(','));
      if (filters?.type) params.append('type', filters.type);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.rating) params.append('rating', filters.rating.toString());

      const response = await ApiService.get<WatchlistItem[] | { items: WatchlistItem[] }>(
        `/api/watchlist/search?${params.toString()}`,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to search watchlists');
      }

      // Handle both response formats: direct array or wrapped in items property
      const items = Array.isArray(response.data) ? response.data : response.data.items;
      return items;
    } catch (error) {
      logger.warn('Failed to search watchlists, searching cache');
      return this.searchCachedWatchlists(query, filters);
    }
  }

  async shareWatchlist(watchlistId: string): Promise<string> {
    try {
      const response = await ApiService.post<{ shareCode: string }>(
        `${endpoints.users.watchlist}/${watchlistId}/share`,
        {},
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to share watchlist');
      }

      return response.data.shareCode;
    } catch (error) {
      logger.warn('Failed to share watchlist');
      throw error;
    }
  }

  async importWatchlist(shareCode: string): Promise<Watchlist> {
    try {
      const response = await ApiService.post<{ watchlist: Watchlist }>(
        `${endpoints.users.watchlist}/import`,
        { shareCode },
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to import watchlist');
      }

      const watchlist = response.data.watchlist;
      await this.cacheWatchlist(watchlist);
      return watchlist;
    } catch (error) {
      logger.warn('Failed to import watchlist');
      throw error;
    }
  }

  async syncWatchlists(): Promise<void> {
    try {
      const cachedWatchlists = await this.getCachedWatchlists();
      const serverWatchlists = await this.getAllWatchlists();

      for (const cached of cachedWatchlists) {
        const server = serverWatchlists.find(w => w.id === cached.id);
        if (!server) {
          await this.createWatchlist(cached);
        } else if (new Date(cached.updatedAt) > new Date(server.updatedAt)) {
          await this.updateWatchlist(cached.id, cached);
        }
      }

      for (const server of serverWatchlists) {
        await this.cacheWatchlist(server);
      }
    } catch (error) {
      logger.warn('[WatchlistService] Failed to sync watchlists', error);
    }
  }

  private async getCachedWatchlists(): Promise<Watchlist[]> {
    try {
      // BUG-002 FIX: Use user-scoped key
      const cached = await AsyncStorage.getItem(this.getWatchlistsKey());
      if (!cached) {return [];}

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > this.CACHE_DURATION) {
        return [];
      }

      return data;
    } catch (error) {
      logger.warn('[WatchlistService] Failed to get cached watchlists', error);
      return [];
    }
  }

  private async getCachedWatchlist(id: string): Promise<Watchlist | null> {
    try {
      // BUG-002 FIX: Use user-scoped key
      const cached = await AsyncStorage.getItem(this.getWatchlistCacheKey(id));
      if (!cached) {return null;}

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > this.CACHE_DURATION) {
        return null;
      }

      return data;
    } catch (error) {
      logger.warn('[WatchlistService] Failed to get cached watchlist', error);
      return null;
    }
  }

  private async cacheWatchlist(watchlist: Watchlist): Promise<void> {
    try {
      // BUG-002 FIX: Use user-scoped keys
      await AsyncStorage.setItem(
        this.getWatchlistCacheKey(watchlist.id),
        JSON.stringify({
          data: watchlist,
          timestamp: Date.now(),
        }),
      );

      const watchlists = await this.getCachedWatchlists();
      const updatedWatchlists = watchlists.filter(w => w.id !== watchlist.id);
      updatedWatchlists.push(watchlist);

      await AsyncStorage.setItem(
        this.getWatchlistsKey(),
        JSON.stringify({
          data: updatedWatchlists,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      logger.warn('[WatchlistService] Failed to cache watchlist', error);
    }
  }

  private async removeCachedWatchlist(id: string): Promise<void> {
    try {
      // BUG-002 FIX: Use user-scoped keys
      await AsyncStorage.removeItem(this.getWatchlistCacheKey(id));

      const watchlists = await this.getCachedWatchlists();
      const updatedWatchlists = watchlists.filter(w => w.id !== id);

      await AsyncStorage.setItem(
        this.getWatchlistsKey(),
        JSON.stringify({
          data: updatedWatchlists,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      logger.warn('[WatchlistService] Failed to remove cached watchlist', error);
    }
  }

  private async updateCachedWatchlistWithItem(watchlistId: string, item: WatchlistItem): Promise<void> {
    const watchlist = await this.getCachedWatchlist(watchlistId);
    if (watchlist) {
      const updatedWatchlist = {
        ...watchlist,
        items: [...watchlist.items.filter(i => i.id !== item.id), item],
        updatedAt: new Date().toISOString(),
      };
      await this.cacheWatchlist(updatedWatchlist);
    }
  }

  private async updateCachedWatchlistItem(watchlistId: string, itemId: string, item: WatchlistItem): Promise<void> {
    const watchlist = await this.getCachedWatchlist(watchlistId);
    if (watchlist) {
      const updatedWatchlist = {
        ...watchlist,
        items: watchlist.items.map(i => i.id === itemId ? item : i),
        updatedAt: new Date().toISOString(),
      };
      await this.cacheWatchlist(updatedWatchlist);
    }
  }

  private async removeCachedWatchlistItem(watchlistId: string, itemId: string): Promise<void> {
    const watchlist = await this.getCachedWatchlist(watchlistId);
    if (watchlist) {
      const updatedWatchlist = {
        ...watchlist,
        items: watchlist.items.filter(i => i.id !== itemId),
        updatedAt: new Date().toISOString(),
      };
      await this.cacheWatchlist(updatedWatchlist);
    }
  }

  private async getCachedWatchlistItem(watchlistId: string, itemId: string): Promise<WatchlistItem | null> {
    const watchlist = await this.getCachedWatchlist(watchlistId);
    return watchlist?.items.find(item => item.id === itemId) || null;
  }

  private async searchCachedWatchlists(query: string, filters?: any): Promise<WatchlistItem[]> {
    const watchlists = await this.getCachedWatchlists();
    let items = watchlists.flatMap(w => w.items);

    if (query) {
      items = items.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.genres.some(g => g.toLowerCase().includes(query.toLowerCase())),
      );
    }

    if (filters?.genre) {
      items = items.filter(item => item.genres.includes(filters.genre));
    }

    if (filters?.type) {
      items = items.filter(item => item.type === filters.type);
    }

    if (filters?.status) {
      items = items.filter(item => item.status === filters.status);
    }

    if (filters?.rating) {
      items = items.filter(item => item.rating >= filters.rating);
    }

    return items;
  }

  private async calculateStatsFromCache(): Promise<WatchlistStats> {
    const watchlists = await this.getCachedWatchlists();
    const allItems = watchlists.flatMap(w => w.items);

    const totalItems = allItems.length;
    const watchedItems = allItems.filter(item => item.status === 'watched').length;
    const currentlyWatching = allItems.filter(item => item.status === 'watching').length;

    const ratings = allItems.filter(item => item.userRating).map(item => item.userRating!);
    const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    const genreCounts = allItems.reduce((acc, item) => {
      item.genres.forEach(genre => {
        acc[genre] = (acc[genre] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const favoriteGenre = Object.entries(genreCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || '';

    const totalTimeWatched = allItems.reduce((total, item) => {
      return total + (item.runtime || 0) * (item.rewatchCount || 0);
    }, 0);

    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    const thisMonthAdded = allItems.filter(item =>
      new Date(item.addedAt) > thisMonth,
    ).length;

    const thisMonthWatched = allItems.filter(item =>
      item.watchedAt && new Date(item.watchedAt) > thisMonth,
    ).length;

    return {
      totalItems,
      watchedItems,
      currentlyWatching,
      averageRating,
      favoriteGenre,
      totalTimeWatched,
      thisMonthAdded,
      thisMonthWatched,
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}

export const watchlistService = new WatchlistService();
