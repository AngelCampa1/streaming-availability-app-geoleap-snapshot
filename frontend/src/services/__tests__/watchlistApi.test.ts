/**
 * Comprehensive tests for watchlistApi.ts - HTTP API Methods
 *
 * Coverage Target: 75-80% (focusing on HTTP APIs, deferring SignalR)
 * Strategy: MSW v2 network-level mocking for all API endpoints
 * Deferred: SignalR real-time connection testing (complex singleton/async patterns)
 */

import { http, HttpResponse } from 'msw';
import {
  WatchlistItem,
  WatchlistFilter,
  WatchlistBulkOperation,
  WatchlistStats,
  WatchlistNotification,
  WatchlistExport,
} from '@/types/watchlist';

// Import the service - but we need to avoid SignalR initialization
// We'll mock the SignalR module to prevent real connections
jest.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: jest.fn().mockImplementation(() => ({
    withUrl: jest.fn().mockReturnThis(),
    withAutomaticReconnect: jest.fn().mockReturnThis(),
    configureLogging: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      invoke: jest.fn().mockResolvedValue(undefined),
    }),
  })),
  LogLevel: {
    Information: 1,
  },
}));

// Now import the watchlistApi after mocking SignalR
import { watchlistApi } from '../watchlistApi';

// Use the global MSW server from jest.setup.js
// Add handlers via server.use() in individual tests
import { server } from '@/mocks/server';

// Mock data (using ISO strings for dates to match JSON serialization)
const mockWatchlistItems: WatchlistItem[] = [
  {
    id: 'item-1',
    title: 'Test Movie',
    type: 'movie',
    availability: [],
    addedDate: '2024-01-01T00:00:00.000Z' as unknown as Date,
    lastChecked: '2024-01-01T00:00:00.000Z' as unknown as Date,
    personalNotes: 'Great movie',
    rating: 8.5,
    watched: false,
    priority: 'high',
  } as WatchlistItem,
  {
    id: 'item-2',
    title: 'Test Series',
    type: 'tv_series',
    availability: [],
    addedDate: '2024-01-02T00:00:00.000Z' as unknown as Date,
    lastChecked: '2024-01-02T00:00:00.000Z' as unknown as Date,
    personalNotes: 'Must watch',
    rating: 9.0,
    watched: true,
    priority: 'medium',
  } as WatchlistItem,
];

describe('WatchlistApiService - User Watchlists', () => {
  it('should fetch user watchlists without shared items', async () => {
    server.use(
      http.get(`/api/watchlist`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('includeShared')).toBe('false');

        return HttpResponse.json({
          success: true,
          data: mockWatchlistItems,
        });
      })
    );

    const result = await watchlistApi.getUserWatchlists(false);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockWatchlistItems);
  });

  it('should fetch user watchlists with shared items by default', async () => {
    server.use(
      http.get(`/api/watchlist`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('includeShared')).toBe('true');

        return HttpResponse.json({
          success: true,
          data: mockWatchlistItems,
        });
      })
    );

    const result = await watchlistApi.getUserWatchlists(true);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockWatchlistItems);
  });

  it('should handle 401 unauthorized gracefully', async () => {
    server.use(
      http.get(`/api/watchlist`, () => {
        return new Response(null, { status: 401 });
      })
    );

    const result = await watchlistApi.getUserWatchlists();

    expect(result.success).toBe(false);
    expect(result.message).toBe('Authentication required');
    expect(result.data).toEqual([]);
  });

  it('should handle 403 forbidden gracefully', async () => {
    server.use(
      http.get(`/api/watchlist`, () => {
        return new Response(null, { status: 403 });
      })
    );

    const result = await watchlistApi.getUserWatchlists();

    expect(result.success).toBe(false);
    expect(result.message).toBe('Access forbidden');
    expect(result.data).toEqual([]);
  });

  it('should handle server errors', async () => {
    server.use(
      http.get(`/api/watchlist`, () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      })
    );

    await expect(watchlistApi.getUserWatchlists()).rejects.toThrow();
  });
});

describe('WatchlistApiService - Watchlist Items', () => {
  it('should fetch watchlist items without filter', async () => {
    server.use(
      http.get(`/watchlist/:watchlistId/items`, ({ request, params }) => {
        expect(params.watchlistId).toBe('watchlist-1');
        const url = new URL(request.url);
        expect(url.searchParams.get('page')).toBe('1');
        expect(url.searchParams.get('pageSize')).toBe('50');

        return HttpResponse.json({
          success: true,
          data: mockWatchlistItems,
        });
      })
    );

    const result = await watchlistApi.getWatchlistItems('watchlist-1');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockWatchlistItems);
  });

  it('should fetch watchlist items with comprehensive filter', async () => {
    const filter: WatchlistFilter = {
      type: ['movie', 'tv'],
      genre: ['Action', 'Drama'],
      year: { min: 2020, max: 2024 },
      rating: { min: 7.0, max: 10.0 },
      availability: true,
      category: ['favorites', 'trending'],
      tags: ['must-watch', 'recommended'],
      watched: false,
      priority: ['high', 'medium'],
      searchQuery: 'test',
      sortBy: 'addedDate',
      sortOrder: 'desc',
    };

    server.use(
      http.get(`/watchlist/:watchlistId/items`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('type')).toBe('movie,tv');
        expect(url.searchParams.get('genre')).toBe('Action,Drama');
        expect(url.searchParams.get('yearMin')).toBe('2020');
        expect(url.searchParams.get('yearMax')).toBe('2024');
        expect(url.searchParams.get('ratingMin')).toBe('7');
        expect(url.searchParams.get('ratingMax')).toBe('10');
        expect(url.searchParams.get('availability')).toBe('true');
        expect(url.searchParams.get('category')).toBe('favorites,trending');
        expect(url.searchParams.get('tags')).toBe('must-watch,recommended');
        expect(url.searchParams.get('watched')).toBe('false');
        expect(url.searchParams.get('priority')).toBe('high,medium');
        expect(url.searchParams.get('searchQuery')).toBe('test');
        expect(url.searchParams.get('sortBy')).toBe('addedDate');
        expect(url.searchParams.get('sortOrder')).toBe('desc');

        return HttpResponse.json({
          success: true,
          data: mockWatchlistItems,
        });
      })
    );

    const result = await watchlistApi.getWatchlistItems('watchlist-1', filter);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockWatchlistItems);
  });

  it('should fetch single watchlist item', async () => {
    server.use(
      http.get(`/watchlist/:watchlistId/items/:itemId`, ({ params }) => {
        expect(params.watchlistId).toBe('watchlist-1');
        expect(params.itemId).toBe('item-1');

        return HttpResponse.json({
          success: true,
          data: mockWatchlistItems[0],
        });
      })
    );

    const result = await watchlistApi.getWatchlistItem('watchlist-1', 'item-1');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockWatchlistItems[0]);
  });

  it('should add watchlist item', async () => {
    const newItem: Partial<WatchlistItem> = {
      title: 'New Movie',
      type: 'movie',
      personalNotes: 'Want to watch',
    };

    server.use(
      http.post(`/api/watchlist/:watchlistId/items`, async ({ request, params }) => {
        expect(params.watchlistId).toBe('watchlist-1');
        const body = (await request.json()) as Partial<WatchlistItem>;
        expect(body).toEqual(newItem);

        return HttpResponse.json({
          success: true,
          data: { ...newItem, id: 'item-3', watchlistId: 'watchlist-1' },
        });
      })
    );

    const result = await watchlistApi.addWatchlistItem('watchlist-1', newItem);

    expect(result.success).toBe(true);
    expect(result.data.id).toBe('item-3');
  });

  it('should update watchlist item', async () => {
    const updates: Partial<WatchlistItem> = {
      watched: true,
      rating: 9.5,
      personalNotes: 'Amazing!',
    };

    server.use(
      http.put(`/api/watchlist/items/:itemId`, async ({ request, params }) => {
        expect(params.itemId).toBe('item-1');
        const body = (await request.json()) as Partial<WatchlistItem>;
        expect(body).toEqual(updates);

        return HttpResponse.json({
          success: true,
          data: { ...mockWatchlistItems[0], ...updates },
        });
      })
    );

    const result = await watchlistApi.updateWatchlistItem('item-1', updates);

    expect(result.success).toBe(true);
    expect(result.data.watched).toBe(true);
    expect(result.data.rating).toBe(9.5);
  });

  it('should remove watchlist item', async () => {
    server.use(
      http.delete(`/api/watchlist/items/:itemId`, ({ params }) => {
        expect(params.itemId).toBe('item-1');

        return HttpResponse.json({
          success: true,
          data: true,
        });
      })
    );

    const result = await watchlistApi.removeWatchlistItem('item-1');

    expect(result.success).toBe(true);
    expect(result.data).toBe(true);
  });

  it('should perform bulk operation', async () => {
    const bulkOp: WatchlistBulkOperation = {
      operation: 'mark_watched',
      itemIds: ['item-1', 'item-2', 'item-3'],
    };

    server.use(
      http.post(`/api/watchlist/bulk`, async ({ request }) => {
        const body = (await request.json()) as WatchlistBulkOperation;
        expect(body).toEqual(bulkOp);

        return HttpResponse.json({
          success: true,
          data: true,
        });
      })
    );

    const result = await watchlistApi.bulkOperation(bulkOp);

    expect(result.success).toBe(true);
    expect(result.data).toBe(true);
  });
});

describe('WatchlistApiService - Statistics', () => {
  it('should fetch watchlist stats', async () => {
    const mockStats: WatchlistStats = {
      totalItems: 100,
      watchedItems: 50,
      availableItems: 75,
      categorizedItems: 60,
      averageRating: 8.2,
      totalDuration: 12000,
      genreBreakdown: { Action: 30, Drama: 25, Comedy: 20 },
      typeBreakdown: { movie: 60, tv_series: 40 },
      monthlyAdditions: { '2024-01': 10, '2024-02': 15 },
    };

    server.use(
      http.get(`/watchlist/analytics`, () => {
        return HttpResponse.json({
          success: true,
          data: mockStats,
        });
      })
    );

    const result = await watchlistApi.getStats();

    expect(result.success).toBe(true);
    expect(result.data.totalItems).toBe(100);
    expect(result.data.averageRating).toBe(8.2);
  });
});

describe('WatchlistApiService - Notifications', () => {
  it('should fetch notifications', async () => {
    const mockNotifications: WatchlistNotification[] = [
      {
        id: 'notif-1',
        type: 'availability_change',
        title: 'Item Available',
        message: 'Item now available',
        isRead: false,
        createdDate: '2024-01-01T00:00:00.000Z' as unknown as Date,
      },
    ];

    server.use(
      http.get(`/watchlist/notifications/settings`, () => {
        return HttpResponse.json({
          success: true,
          data: mockNotifications,
        });
      })
    );

    const result = await watchlistApi.getNotifications();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].type).toBe('availability_change');
  });

  it('should return stub response for markNotificationRead', async () => {
    const result = await watchlistApi.markNotificationRead('notif-1');

    expect(result.success).toBe(false);
    expect(result.data).toBe(false);
    expect(result.message).toContain('not yet available');
  });
});

describe('WatchlistApiService - Search', () => {
  it('should search content', async () => {
    server.use(
      http.get(`/watchlist/search`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('query')).toBe('inception');
        expect(url.searchParams.get('page')).toBe('1');
        expect(url.searchParams.get('pageSize')).toBe('20');

        return HttpResponse.json({
          success: true,
          data: [mockWatchlistItems[0]],
        });
      })
    );

    const result = await watchlistApi.searchContent('inception');

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it('should search content with type filter', async () => {
    server.use(
      http.get(`/watchlist/search`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('query')).toBe('action');

        return HttpResponse.json({
          success: true,
          data: mockWatchlistItems,
        });
      })
    );

    const result = await watchlistApi.searchContent('action', 'movie');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockWatchlistItems);
  });
});

describe('WatchlistApiService - Export', () => {
  it('should export watchlist as blob', async () => {
    const exportSettings: WatchlistExport = {
      format: 'json',
      includeAvailability: true,
      includeNotes: true,
      includeProgress: true,
    };

    server.use(
      http.post(`/api/watchlist/export`, async ({ request }) => {
        const body = (await request.json()) as WatchlistExport;
        expect(body).toEqual(exportSettings);

        return new Response(JSON.stringify({ data: 'export-data' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );

    const result = await watchlistApi.exportWatchlist(exportSettings);

    expect(result).toBeInstanceOf(Blob);
  });

  it('should throw error on export failure', async () => {
    const exportSettings: WatchlistExport = {
      format: 'csv',
      includeAvailability: false,
      includeNotes: false,
      includeProgress: false,
    };

    server.use(
      http.post(`/api/watchlist/export`, () => {
        return new Response(null, { status: 500 });
      })
    );

    await expect(watchlistApi.exportWatchlist(exportSettings)).rejects.toThrow('Export failed');
  });
});

describe('WatchlistApiService - Stub Implementations (Categories)', () => {
  it('should return empty categories array with warning', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await watchlistApi.getCategories();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
    expect(result.message).toContain('not yet available');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('categories endpoint not implemented'));

    consoleSpy.mockRestore();
  });

  it('should return failure for createCategory', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await watchlistApi.createCategory({ name: 'Favorites' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('not yet available');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should return failure for updateCategory', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await watchlistApi.updateCategory('cat-1', { name: 'Updated' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('not yet available');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should return failure for deleteCategory', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await watchlistApi.deleteCategory('cat-1');

    expect(result.success).toBe(false);
    expect(result.data).toBe(false);
    expect(result.message).toContain('not yet available');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('WatchlistApiService - Stub Implementations (Views)', () => {
  it('should return empty views array with warning', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await watchlistApi.getViews();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
    expect(result.message).toContain('not yet available');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('views endpoint not implemented'));

    consoleSpy.mockRestore();
  });

  it('should return failure for createView', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await watchlistApi.createView({ name: 'Recent' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('not yet available');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should return failure for updateView', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await watchlistApi.updateView('view-1', { name: 'Updated' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('not yet available');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should return failure for deleteView', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await watchlistApi.deleteView('view-1');

    expect(result.success).toBe(false);
    expect(result.data).toBe(false);
    expect(result.message).toContain('not yet available');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('WatchlistApiService - Stub Implementations (Sharing)', () => {
  it('should return failure for createShare', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await watchlistApi.createShare('watchlist-1', { shareType: 'public' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('not yet available');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('shares endpoint not implemented'));

    consoleSpy.mockRestore();
  });

  it('should return empty shares array with warning', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await watchlistApi.getShares();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
    expect(result.message).toContain('not yet available');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should return failure for revokeShare', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await watchlistApi.revokeShare('share-1');

    expect(result.success).toBe(false);
    expect(result.data).toBe(false);
    expect(result.message).toContain('not yet available');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('WatchlistApiService - Stub Implementations (Availability)', () => {
  it('should return failure for checkAvailability', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await watchlistApi.checkAvailability('item-1');

    expect(result.success).toBe(false);
    expect(result.data.available).toBe(false);
    expect(result.data.services).toEqual([]);
    expect(result.message).toContain('not yet available');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('availability endpoint not implemented'));

    consoleSpy.mockRestore();
  });

  it('should return failure for refreshAvailability', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await watchlistApi.refreshAvailability('item-1');

    expect(result.success).toBe(false);
    expect(result.data).toBe(false);
    expect(result.message).toContain('not yet available');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('refresh endpoint not implemented'));

    consoleSpy.mockRestore();
  });
});

describe('WatchlistApiService - Sync Status (Non-SignalR Methods)', () => {
  it('should get sync status', () => {
    const status = watchlistApi.getSyncStatus();

    expect(status).toBeDefined();
    expect(status).toHaveProperty('isConnected');
    expect(status).toHaveProperty('pendingChanges');
    expect(status).toHaveProperty('connectionQuality');
  });
});

describe('WatchlistApiService - HTTP Request Helper Edge Cases', () => {
  it('should handle empty response body', async () => {
    server.use(
      http.get(`/api/watchlist`, () => {
        return new Response('', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );

    const result = await watchlistApi.getUserWatchlists();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({});
  });

  it('should handle network errors', async () => {
    server.use(
      http.get(`/api/watchlist`, () => {
        return HttpResponse.error();
      })
    );

    await expect(watchlistApi.getUserWatchlists()).rejects.toThrow();
  });
});
