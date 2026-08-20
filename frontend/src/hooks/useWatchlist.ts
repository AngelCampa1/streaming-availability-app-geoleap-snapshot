// Custom React Hooks for Watchlist Management

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  WatchlistItem,
  WatchlistCategory,
  WatchlistView,
  WatchlistFilter,
  WatchlistBulkOperation,
  WatchlistSyncStatus,
} from '@/types/watchlist';
import watchlistApi from '@/services/watchlistApi';
import { useAuth } from '@/contexts/AuthContext';

// Hook to fetch user's watchlists and get the default watchlist ID
export const useUserWatchlists = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const {
    data: watchlistsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user-watchlists'],
    queryFn: () => watchlistApi.getUserWatchlists(true),
    enabled: !authLoading && isAuthenticated,
    retry: (failureCount, retryError) => {
      if (retryError instanceof Error && (retryError.message.includes('401') || retryError.message.includes('403'))) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // E2E BUG FIX: Handle both direct array response and wrapped { data: [...] } response
  // Backend returns array directly, not wrapped in { data: [...] }
  const watchlists = Array.isArray(watchlistsResponse)
    ? watchlistsResponse
    : (watchlistsResponse?.data || []);

  // Find the default watchlist, or use the first one if no default is set
  const defaultWatchlist = watchlists.find(w => w.isDefault) || watchlists[0];
  const defaultWatchlistId = defaultWatchlist?.id;

  return {
    watchlists,
    defaultWatchlistId,
    isLoading,
    error,
  };
};

// Main watchlist hook - BUG-006 FIX: Auth-aware queries
// E2E BUG FIX: Now accepts optional watchlistId, fetches user's watchlists to get proper GUID
export const useWatchlist = (filter?: WatchlistFilter, watchlistId?: string) => {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // E2E BUG FIX: If no watchlistId provided, fetch user's watchlists to get the default one
  const { defaultWatchlistId, isLoading: watchlistsLoading } = useUserWatchlists();

  // Use provided watchlistId or fall back to the default watchlist ID
  const effectiveWatchlistId = watchlistId || defaultWatchlistId;

  const {
    data: itemsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['watchlist-items', effectiveWatchlistId, filter],
    queryFn: () => watchlistApi.getWatchlistItems(effectiveWatchlistId!, filter),
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Refetch every 30 seconds
    // BUG-006 FIX: Only fetch when authenticated and we have a watchlist ID
    enabled: !authLoading && isAuthenticated && !watchlistsLoading && !!effectiveWatchlistId,
    // BUG-006 FIX: Don't retry on auth errors
    retry: (failureCount, retryError) => {
      if (retryError instanceof Error && (retryError.message.includes('401') || retryError.message.includes('403'))) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // E2E BUG FIX: Handle both direct array response and wrapped { data: [...] } response
  const items = Array.isArray(itemsResponse)
    ? itemsResponse
    : (itemsResponse?.data || []);

  // Add item mutation - E2E BUG FIX: Auto-create watchlist if none exists
  const addItemMutation = useMutation({
    mutationFn: async (item: Partial<WatchlistItem>) => {
      let targetWatchlistId = effectiveWatchlistId;

      // If no watchlist exists, create a default one first
      if (!targetWatchlistId) {
        const createResponse = await watchlistApi.createWatchlist('My Watchlist', 'My personal watchlist');
        // Backend returns watchlist directly, or wrapped in data property
        const watchlistData = createResponse.data || createResponse;
        const newWatchlistId = (watchlistData as { id?: string })?.id;
        if (!newWatchlistId) {
          throw new Error('Failed to create watchlist - no ID returned');
        }
        targetWatchlistId = newWatchlistId;
        // Invalidate user-watchlists to refresh the list
        queryClient.invalidateQueries({ queryKey: ['user-watchlists'] });
      }

      return watchlistApi.addWatchlistItem(targetWatchlistId, item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-items'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist-stats'] });
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<WatchlistItem> }) =>
      watchlistApi.updateWatchlistItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-items'] });
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: (id: string) => watchlistApi.removeWatchlistItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-items'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist-stats'] });
    },
  });

  // Bulk operations mutation
  const bulkOperationMutation = useMutation({
    mutationFn: (operation: WatchlistBulkOperation) => watchlistApi.bulkOperation(operation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-items'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist-stats'] });
    },
  });

  return {
    items,
    isLoading: isLoading || watchlistsLoading,
    error,
    refetch,
    addItem: addItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    removeItem: removeItemMutation.mutate,
    bulkOperation: bulkOperationMutation.mutate,
    isAddingItem: addItemMutation.isPending,
    isUpdatingItem: updateItemMutation.isPending,
    isRemovingItem: removeItemMutation.isPending,
    isBulkOperating: bulkOperationMutation.isPending,
    watchlistId: effectiveWatchlistId,
  };
};

// Categories hook - BUG FIX: Auth-aware queries to prevent 404 errors
export const useWatchlistCategories = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const {
    data: categoriesResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['watchlist-categories'],
    queryFn: () => watchlistApi.getCategories(),
    // BUG FIX: Only fetch when authenticated
    enabled: !authLoading && isAuthenticated,
    // BUG FIX: Return empty array instead of erroring for unauthenticated users
    retry: (failureCount, retryError) => {
      if (retryError instanceof Error && (retryError.message.includes('401') || retryError.message.includes('403') || retryError.message.includes('404'))) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const categories = categoriesResponse?.data || [];

  const createCategoryMutation = useMutation({
    mutationFn: (category: Partial<WatchlistCategory>) => watchlistApi.createCategory(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-categories'] });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<WatchlistCategory> }) =>
      watchlistApi.updateCategory(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-categories'] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => watchlistApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-categories'] });
    },
  });

  return {
    categories,
    isLoading,
    error,
    createCategory: createCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate,
    deleteCategory: deleteCategoryMutation.mutate,
    isCreating: createCategoryMutation.isPending,
    isUpdating: updateCategoryMutation.isPending,
    isDeleting: deleteCategoryMutation.isPending,
  };
};

// Views hook - BUG FIX: Auth-aware queries to prevent 404 errors
export const useWatchlistViews = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const {
    data: viewsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['watchlist-views'],
    queryFn: () => watchlistApi.getViews(),
    // BUG FIX: Only fetch when authenticated
    enabled: !authLoading && isAuthenticated,
    // BUG FIX: Don't retry on auth/not found errors
    retry: (failureCount, retryError) => {
      if (retryError instanceof Error && (retryError.message.includes('401') || retryError.message.includes('403') || retryError.message.includes('404'))) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const views = viewsResponse?.data || [];

  const createViewMutation = useMutation({
    mutationFn: (view: Partial<WatchlistView>) => watchlistApi.createView(view),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-views'] });
    },
  });

  const updateViewMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<WatchlistView> }) =>
      watchlistApi.updateView(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-views'] });
    },
  });

  return {
    views,
    isLoading,
    error,
    createView: createViewMutation.mutate,
    updateView: updateViewMutation.mutate,
  };
};

// Real-time sync hook
export const useWatchlistSync = () => {
  const [syncStatus, setSyncStatus] = useState<WatchlistSyncStatus>(watchlistApi.getSyncStatus());

  useEffect(() => {
    const handleSyncStatusChange = (status: WatchlistSyncStatus) => {
      setSyncStatus(status);
    };

    watchlistApi.on('syncStatusChanged', handleSyncStatusChange);

    return () => {
      watchlistApi.off('syncStatusChanged', handleSyncStatusChange);
    };
  }, []);

  const forceSync = useCallback(async () => {
    await watchlistApi.forcSync();
  }, []);

  return {
    syncStatus,
    forceSync,
  };
};

// Real-time updates hook
export const useWatchlistUpdates = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleItemUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-items'] });
    };

    const handleAvailabilityChanged = () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-items'] });
    };

    watchlistApi.on('itemUpdated', handleItemUpdated);
    watchlistApi.on('availabilityChanged', handleAvailabilityChanged);

    return () => {
      watchlistApi.off('itemUpdated', handleItemUpdated);
      watchlistApi.off('availabilityChanged', handleAvailabilityChanged);
    };
  }, [queryClient]);
};

// Statistics hook - BUG FIX: Auth-aware queries to prevent 404 errors
export const useWatchlistStats = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const {
    data: statsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['watchlist-stats'],
    queryFn: () => watchlistApi.getStats(),
    refetchInterval: 60000, // Refetch every minute
    // BUG FIX: Only fetch when authenticated
    enabled: !authLoading && isAuthenticated,
    // BUG FIX: Don't retry on auth/not found errors
    retry: (failureCount, retryError) => {
      if (retryError instanceof Error && (retryError.message.includes('401') || retryError.message.includes('403') || retryError.message.includes('404'))) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const stats = statsResponse?.data;

  return {
    stats,
    isLoading,
    error,
  };
};

// Search hook
export const useWatchlistSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<string | undefined>();

  const {
    data: searchResults,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['watchlist-search', searchQuery, searchType],
    queryFn: () => watchlistApi.searchContent(searchQuery, searchType),
    enabled: searchQuery.length > 2, // Only search with 3+ characters
  });

  const results = searchResults?.data || [];

  return {
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
    results,
    isSearching: isLoading,
    searchError: error,
  };
};

// Notifications hook
export const useWatchlistNotifications = () => {
  const queryClient = useQueryClient();

  const {
    data: notificationsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['watchlist-notifications'],
    queryFn: () => watchlistApi.getNotifications(),
    refetchInterval: 30000, // Check for new notifications every 30 seconds
  });

  const notifications = notificationsResponse?.data || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => watchlistApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-notifications'] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead: markReadMutation.mutate,
  };
};

// Local storage filter state hook
export const useWatchlistFilters = () => {
  const defaultFilters: WatchlistFilter = {
    sortBy: 'addedDate' as const,
    sortOrder: 'desc' as const,
  };

  const [filters, setFilters] = useState<WatchlistFilter>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('watchlist-filters');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Validate structure and merge with defaults
          if (parsed && typeof parsed === 'object') {
            return { ...defaultFilters, ...parsed };
          }
        } catch {
          // Corrupted data - remove and use defaults
          localStorage.removeItem('watchlist-filters');
        }
      }
    }
    return defaultFilters;
  });

  const updateFilters = useCallback(
    (newFilters: Partial<WatchlistFilter>) => {
      setFilters(prev => {
        const updated = { ...prev, ...newFilters };
        if (typeof window !== 'undefined') {
          localStorage.setItem('watchlist-filters', JSON.stringify(updated));
        }
        return updated;
      });
    },
    []
  );

  const resetFilters = useCallback(() => {
    const defaultFilters = {
      sortBy: 'addedDate' as const,
      sortOrder: 'desc' as const,
    };
    setFilters(defaultFilters);
    if (typeof window !== 'undefined') {
      localStorage.setItem('watchlist-filters', JSON.stringify(defaultFilters));
    }
  }, []);

  return {
    filters,
    updateFilters,
    resetFilters,
  };
};

// Selection state hook for bulk operations
export const useWatchlistSelection = () => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((itemIds: string[]) => {
    setSelectedItems(new Set(itemIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const selectedCount = selectedItems.size;
  const selectedItemIds = Array.from(selectedItems);

  return {
    selectedItems,
    selectedItemIds,
    selectedCount,
    toggleSelection,
    selectAll,
    clearSelection,
  };
};
