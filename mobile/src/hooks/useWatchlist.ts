import { useState, useEffect, useCallback } from 'react';
import { watchlistService, Watchlist, WatchlistItem, WatchlistStats } from '../services/watchlist/WatchlistService';
import { logger } from '../utils/logger';

interface UseWatchlistOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableCache?: boolean;
}

interface UseWatchlistReturn {
  watchlists: Watchlist[];
  currentWatchlist: Watchlist | null;
  stats: WatchlistStats | null;
  loading: boolean;
  error: string | null;

  // Actions
  refreshWatchlists: () => Promise<void>;
  createWatchlist: (data: Omit<Watchlist, 'id' | 'items' | 'createdAt' | 'updatedAt'>) => Promise<Watchlist>;
  updateWatchlist: (id: string, updates: Partial<Watchlist>) => Promise<Watchlist>;
  deleteWatchlist: (id: string) => Promise<void>;
  selectWatchlist: (id: string) => Promise<void>;

  // Item actions
  addToWatchlist: (watchlistId: string, item: Omit<WatchlistItem, 'id' | 'addedAt'>) => Promise<WatchlistItem>;
  updateWatchlistItem: (watchlistId: string, itemId: string, updates: Partial<WatchlistItem>) => Promise<WatchlistItem>;
  removeFromWatchlist: (watchlistId: string, itemId: string) => Promise<void>;

  // Utility
  searchItems: (query: string, filters?: any) => Promise<WatchlistItem[]>;
  syncWatchlists: () => Promise<void>;
}

export const useWatchlist = (options: UseWatchlistOptions = {}): UseWatchlistReturn => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableCache: _enableCache = true,
  } = options;

  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [currentWatchlist, setCurrentWatchlist] = useState<Watchlist | null>(null);
  const [stats, setStats] = useState<WatchlistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshWatchlists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [watchlistsData, statsData] = await Promise.all([
        watchlistService.getAllWatchlists(),
        watchlistService.getWatchlistStats('current-user'), // TODO: Get actual user ID
      ]);

      setWatchlists(watchlistsData);
      setStats(statsData);

      // Auto-select the first watchlist if none is selected
      // Use functional update to avoid dependency on currentWatchlist
      setCurrentWatchlist(prev =>
        !prev && watchlistsData.length > 0 ? watchlistsData[0] : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch watchlists');
      logger.error('[useWatchlist] Failed to refresh watchlists', err);
    } finally {
      setLoading(false);
    }
  }, []); // ✅ Empty dependencies - no infinite loop

  const createWatchlist = useCallback(async (
    data: Omit<Watchlist, 'id' | 'items' | 'createdAt' | 'updatedAt'>,
  ): Promise<Watchlist> => {
    try {
      const newWatchlist = await watchlistService.createWatchlist(data);
      setWatchlists(prev => [...prev, newWatchlist]);
      return newWatchlist;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create watchlist';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateWatchlist = useCallback(async (
    id: string,
    updates: Partial<Watchlist>,
  ): Promise<Watchlist> => {
    try {
      const updatedWatchlist = await watchlistService.updateWatchlist(id, updates);
      setWatchlists(prev =>
        prev.map(w => w.id === id ? updatedWatchlist : w),
      );

      // Use functional update to avoid dependency on currentWatchlist
      setCurrentWatchlist(prev =>
        prev?.id === id ? updatedWatchlist : prev
      );

      return updatedWatchlist;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update watchlist';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []); // ✅ Empty dependencies

  const deleteWatchlist = useCallback(async (id: string): Promise<void> => {
    try {
      await watchlistService.deleteWatchlist(id);

      // Use functional updates to avoid dependencies
      setWatchlists(prev => prev.filter(w => w.id !== id));

      setCurrentWatchlist(prev => {
        // If deleting the current watchlist, select another one
        if (prev?.id === id) {
          // Get remaining watchlists (will be updated in next render)
          // For now, just clear the current selection
          return null;
        }
        return prev;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete watchlist';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []); // ✅ Empty dependencies

  const selectWatchlist = useCallback(async (id: string): Promise<void> => {
    try {
      const watchlist = await watchlistService.getWatchlist(id);
      if (watchlist) {
        setCurrentWatchlist(watchlist);
      } else {
        setError('Watchlist not found');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to select watchlist';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const addToWatchlist = useCallback(async (
    watchlistId: string,
    item: Omit<WatchlistItem, 'id' | 'addedAt'>,
  ): Promise<WatchlistItem> => {
    try {
      const newItem = await watchlistService.addToWatchlist(watchlistId, item);

      // Update the specific watchlist in state
      setWatchlists(prev =>
        prev.map(w =>
          w.id === watchlistId
            ? { ...w, items: [...w.items, newItem], updatedAt: new Date().toISOString() }
            : w,
        ),
      );

      // Update current watchlist if it's the one being modified
      // Use functional update to avoid dependency on currentWatchlist
      setCurrentWatchlist(prev =>
        prev?.id === watchlistId
          ? { ...prev, items: [...prev.items, newItem] }
          : prev
      );

      // Refresh stats (refreshWatchlists now has empty dependencies, so safe)
      refreshWatchlists();

      return newItem;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item to watchlist';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [refreshWatchlists]); // ✅ Only refreshWatchlists (now stable)

  const updateWatchlistItem = useCallback(async (
    watchlistId: string,
    itemId: string,
    updates: Partial<WatchlistItem>,
  ): Promise<WatchlistItem> => {
    try {
      const updatedItem = await watchlistService.updateWatchlistItem(watchlistId, itemId, updates);

      // Update the specific watchlist in state
      setWatchlists(prev =>
        prev.map(w =>
          w.id === watchlistId
            ? {
                ...w,
                items: w.items.map(item =>
                  item.id === itemId ? updatedItem : item,
                ),
                updatedAt: new Date().toISOString(),
              }
            : w,
        ),
      );

      // Update current watchlist if it's the one being modified
      // Use functional update to avoid dependency on currentWatchlist
      setCurrentWatchlist(prev =>
        prev?.id === watchlistId
          ? {
              ...prev,
              items: prev.items.map(item =>
                item.id === itemId ? updatedItem : item,
              ),
            }
          : prev
      );

      // Refresh stats if status changed
      if (updates.status) {
        refreshWatchlists();
      }

      return updatedItem;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update watchlist item';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [refreshWatchlists]); // ✅ Only refreshWatchlists (now stable)

  const removeFromWatchlist = useCallback(async (
    watchlistId: string,
    itemId: string,
  ): Promise<void> => {
    try {
      await watchlistService.removeFromWatchlist(watchlistId, itemId);

      // Update the specific watchlist in state
      setWatchlists(prev =>
        prev.map(w =>
          w.id === watchlistId
            ? {
                ...w,
                items: w.items.filter(item => item.id !== itemId),
                updatedAt: new Date().toISOString(),
              }
            : w,
        ),
      );

      // Update current watchlist if it's the one being modified
      // Use functional update to avoid dependency on currentWatchlist
      setCurrentWatchlist(prev =>
        prev?.id === watchlistId
          ? {
              ...prev,
              items: prev.items.filter(item => item.id !== itemId),
            }
          : prev
      );

      // Refresh stats
      refreshWatchlists();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove item from watchlist';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [refreshWatchlists]); // ✅ Only refreshWatchlists (now stable)

  const searchItems = useCallback(async (
    query: string,
    filters?: any,
  ): Promise<WatchlistItem[]> => {
    try {
      return await watchlistService.searchWatchlists(query, filters);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search items';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const syncWatchlists = useCallback(async (): Promise<void> => {
    try {
      await watchlistService.syncWatchlists();
      await refreshWatchlists();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync watchlists';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [refreshWatchlists]);

  // Initial load
  useEffect(() => {
    refreshWatchlists();
  }, [refreshWatchlists]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) {return;}

    const interval = setInterval(() => {
      refreshWatchlists();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshWatchlists]);

  return {
    watchlists,
    currentWatchlist,
    stats,
    loading,
    error,
    refreshWatchlists,
    createWatchlist,
    updateWatchlist,
    deleteWatchlist,
    selectWatchlist,
    addToWatchlist,
    updateWatchlistItem,
    removeFromWatchlist,
    searchItems,
    syncWatchlists,
  };
};

// Hook for a specific watchlist
export const useSpecificWatchlist = (watchlistId?: string) => {
  const [watchlist, setWatchlist] = useState<Watchlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshWatchlist = useCallback(async () => {
    if (!watchlistId) {return;}

    try {
      setLoading(true);
      setError(null);
      const data = await watchlistService.getWatchlist(watchlistId);
      setWatchlist(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch watchlist');
      logger.error('[useWatchlist] Failed to refresh watchlist', err);
    } finally {
      setLoading(false);
    }
  }, [watchlistId]);

  useEffect(() => {
    refreshWatchlist();
  }, [refreshWatchlist]);

  return {
    watchlist,
    loading,
    error,
    refreshWatchlist,
  };
};

// Hook for watchlist stats
export const useWatchlistStats = (userId?: string) => {
  const [stats, setStats] = useState<WatchlistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await watchlistService.getWatchlistStats(userId || 'current-user');
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch watchlist stats');
      logger.error('[useWatchlist] Failed to refresh stats', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return {
    stats,
    loading,
    error,
    refreshStats,
  };
};
