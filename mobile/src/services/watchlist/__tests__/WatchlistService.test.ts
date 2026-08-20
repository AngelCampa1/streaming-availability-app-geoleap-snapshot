/**
 * Comprehensive Tests for WatchlistService
 * Target: 0% → 80%+ coverage
 *
 * Test Categories:
 * 1. Get All Watchlists
 * 2. Get Single Watchlist
 * 3. Create Watchlist
 * 4. Update Watchlist
 * 5. Delete Watchlist
 * 6. Add Item to Watchlist
 * 7. Update Watchlist Item
 * 8. Remove Item from Watchlist
 * 9. Watchlist Statistics
 * 10. Search Watchlists
 * 11. Share Watchlist
 * 12. Caching and Offline Support
 * 13. Error Handling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../../api/ApiService';
import {
  Watchlist,
  WatchlistItem,
  WatchlistStats,
  watchlistService,
} from '../WatchlistService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('../../api/ApiService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedApiService = ApiService as jest.Mocked<typeof ApiService>;

describe('WatchlistService', () => {
  // Use the singleton watchlistService imported from '../WatchlistService'

  // Mock data
  const mockWatchlistItem: WatchlistItem = {
    id: 'item-1',
    title: 'Inception',
    type: 'movie',
    rating: 8.8,
    year: 2010,
    availableOn: ['Netflix', 'Amazon Prime'],
    poster: 'https://example.com/inception.jpg',
    genres: ['Sci-Fi', 'Thriller'],
    runtime: 148,
    status: 'to_watch',
    priority: 'high',
    addedAt: new Date().toISOString(),
  };

  const mockWatchlist: Watchlist = {
    id: 'watchlist-1',
    name: 'My Movies',
    description: 'Movies to watch',
    isDefault: true,
    isPublic: false,
    items: [mockWatchlistItem],
    createdBy: 'user-123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockWatchlistStats: WatchlistStats = {
    totalItems: 10,
    watchedItems: 5,
    currentlyWatching: 2,
    averageRating: 8.5,
    favoriteGenre: 'Sci-Fi',
    totalTimeWatched: 1200,
    thisMonthAdded: 3,
    thisMonthWatched: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    

    // Default: API calls succeed
    mockedApiService.get.mockResolvedValue({
      success: true,
      data: { watchlists: [mockWatchlist] },
    });

    mockedApiService.post.mockResolvedValue({
      success: true,
      data: { watchlist: mockWatchlist },
    });

    mockedApiService.put.mockResolvedValue({
      success: true,
      data: { watchlist: mockWatchlist },
    });

    mockedApiService.delete.mockResolvedValue({
      success: true,
      data: null,
    });

    // Default: AsyncStorage succeeds
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue();
    mockedAsyncStorage.removeItem.mockResolvedValue();
  });

  // ============================================
  // 1. Get All Watchlists
  // ============================================
  describe('getAllWatchlists', () => {
    it('should fetch all watchlists from API successfully', async () => {
      const watchlists = [mockWatchlist];

      mockedApiService.get.mockResolvedValue({
        success: true,
        data: { watchlists },
      });

      const result = await watchlistService.getAllWatchlists();

      expect(result).toEqual(watchlists);
      expect(mockedApiService.get).toHaveBeenCalledWith(
        expect.stringContaining('/watchlist'),
        expect.objectContaining({ cacheTTL: 300000 })
      );
    });

    it('should cache watchlists after fetching from API', async () => {
      const watchlists = [mockWatchlist];

      mockedApiService.get.mockResolvedValue({
        success: true,
        data: { watchlists },
      });

      await watchlistService.getAllWatchlists();

      // Should cache each watchlist
      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should fallback to cached watchlists if API fails', async () => {
      const cachedWatchlists = [mockWatchlist];

      mockedApiService.get.mockRejectedValue(new Error('Network error'));
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify({ data: cachedWatchlists, timestamp: Date.now() }));

      const result = await watchlistService.getAllWatchlists();

      expect(result).toEqual(cachedWatchlists);
      expect(mockedAsyncStorage.getItem).toHaveBeenCalled();
    });

    it('should return empty array if API fails and no cache available', async () => {
      mockedApiService.get.mockRejectedValue(new Error('Network error'));
      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const result = await watchlistService.getAllWatchlists();

      expect(result).toEqual([]);
    });

    it('should handle API response with no data', async () => {
      mockedApiService.get.mockResolvedValue({
        success: false,
        error: { message: 'No data available' },
      });

      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const result = await watchlistService.getAllWatchlists();

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // 2. Get Single Watchlist
  // ============================================
  describe('getWatchlist', () => {
    it('should fetch single watchlist from API successfully', async () => {
      mockedApiService.get.mockResolvedValue({
        success: true,
        data: { watchlist: mockWatchlist },
      });

      const result = await watchlistService.getWatchlist('watchlist-1');

      expect(result).toEqual(mockWatchlist);
      expect(mockedApiService.get).toHaveBeenCalledWith(
        expect.stringContaining('/watchlist/watchlist-1'),
        expect.objectContaining({ cacheTTL: 300000 })
      );
    });

    it('should cache watchlist after fetching from API', async () => {
      mockedApiService.get.mockResolvedValue({
        success: true,
        data: { watchlist: mockWatchlist },
      });

      await watchlistService.getWatchlist('watchlist-1');

      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should fallback to cached watchlist if API fails', async () => {
      mockedApiService.get.mockRejectedValue(new Error('Network error'));

      const cacheKey = '@geoleap_watchlist_cache_watchlist-1';
      mockedAsyncStorage.getItem.mockImplementation((key) => {
        if (key === cacheKey) {
          return Promise.resolve(
            JSON.stringify({
              data: mockWatchlist,
              timestamp: Date.now(),
            })
          );
        }
        return Promise.resolve(null);
      });

      const result = await watchlistService.getWatchlist('watchlist-1');

      expect(result).toEqual(mockWatchlist);
    });

    it('should return null if watchlist not found', async () => {
      mockedApiService.get.mockResolvedValue({
        success: false,
        error: { message: 'Watchlist not found' },
      });

      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const result = await watchlistService.getWatchlist('non-existent');

      expect(result).toBeNull();
    });

    it('should return null if cache expired (older than 5 minutes)', async () => {
      const expiredTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago

      mockedApiService.get.mockRejectedValue(new Error('Network error'));

      const cacheKey = '@geoleap_watchlist_cache_watchlist-1';
      mockedAsyncStorage.getItem.mockImplementation((key) => {
        if (key === cacheKey) {
          return Promise.resolve(
            JSON.stringify({
              data: mockWatchlist,
              timestamp: expiredTimestamp,
            })
          );
        }
        return Promise.resolve(null);
      });

      const result = await watchlistService.getWatchlist('watchlist-1');

      expect(result).toBeNull();
    });
  });

  // ============================================
  // 3. Create Watchlist
  // ============================================
  describe('createWatchlist', () => {
    it('should create watchlist successfully', async () => {
      const newWatchlistData = {
        name: 'New Watchlist',
        description: 'My new list',
        isDefault: false,
        isPublic: false,
        createdBy: 'user-123',
      };

      mockedApiService.post.mockResolvedValue({
        success: true,
        data: { watchlist: { ...mockWatchlist, ...newWatchlistData } },
      });

      const result = await watchlistService.createWatchlist(newWatchlistData);

      expect(result).toBeDefined();
      expect(result.name).toBe(newWatchlistData.name);
      expect(mockedApiService.post).toHaveBeenCalledWith(
        expect.stringContaining('/watchlist'),
        expect.objectContaining({
          name: newWatchlistData.name,
          items: [],
        })
      );
    });

    it('should include createdAt and updatedAt timestamps', async () => {
      const newWatchlistData = {
        name: 'New Watchlist',
        isDefault: false,
        isPublic: false,
        createdBy: 'user-123',
      };

      await watchlistService.createWatchlist(newWatchlistData);

      expect(mockedApiService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        })
      );
    });

    it('should cache created watchlist', async () => {
      const newWatchlistData = {
        name: 'New Watchlist',
        isDefault: false,
        isPublic: false,
        createdBy: 'user-123',
      };

      mockedApiService.post.mockResolvedValue({
        success: true,
        data: { watchlist: mockWatchlist },
      });

      await watchlistService.createWatchlist(newWatchlistData);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should throw error if creation fails', async () => {
      const newWatchlistData = {
        name: 'New Watchlist',
        isDefault: false,
        isPublic: false,
        createdBy: 'user-123',
      };

      mockedApiService.post.mockResolvedValue({
        success: false,
        error: { message: 'Failed to create watchlist' },
      });

      await expect(watchlistService.createWatchlist(newWatchlistData)).rejects.toThrow(
        'Failed to create watchlist'
      );
    });

    it('should handle network error during creation', async () => {
      const newWatchlistData = {
        name: 'New Watchlist',
        isDefault: false,
        isPublic: false,
        createdBy: 'user-123',
      };

      mockedApiService.post.mockRejectedValue(new Error('Network error'));

      await expect(watchlistService.createWatchlist(newWatchlistData)).rejects.toThrow(
        'Network error'
      );
    });
  });

  // ============================================
  // 4. Update Watchlist
  // ============================================
  describe('updateWatchlist', () => {
    it('should update watchlist successfully', async () => {
      const updates = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      mockedApiService.put.mockResolvedValue({
        success: true,
        data: { watchlist: { ...mockWatchlist, ...updates } },
      });

      const result = await watchlistService.updateWatchlist('watchlist-1', updates);

      expect(result.name).toBe(updates.name);
      expect(result.description).toBe(updates.description);
      expect(mockedApiService.put).toHaveBeenCalledWith(
        expect.stringContaining('/watchlist/watchlist-1'),
        expect.objectContaining(updates)
      );
    });

    it('should include updatedAt timestamp in updates', async () => {
      const updates = { name: 'Updated Name' };

      await watchlistService.updateWatchlist('watchlist-1', updates);

      expect(mockedApiService.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          updatedAt: expect.any(String),
        })
      );
    });

    it('should cache updated watchlist', async () => {
      const updates = { name: 'Updated Name' };

      mockedApiService.put.mockResolvedValue({
        success: true,
        data: { watchlist: { ...mockWatchlist, ...updates } },
      });

      await watchlistService.updateWatchlist('watchlist-1', updates);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should throw error if update fails', async () => {
      const updates = { name: 'Updated Name' };

      mockedApiService.put.mockResolvedValue({
        success: false,
        error: { message: 'Failed to update watchlist' },
      });

      await expect(
        watchlistService.updateWatchlist('watchlist-1', updates)
      ).rejects.toThrow('Failed to update watchlist');
    });

    it('should handle network error during update', async () => {
      const updates = { name: 'Updated Name' };

      mockedApiService.put.mockRejectedValue(new Error('Network error'));

      await expect(
        watchlistService.updateWatchlist('watchlist-1', updates)
      ).rejects.toThrow('Network error');
    });
  });

  // ============================================
  // 5. Delete Watchlist
  // ============================================
  describe('deleteWatchlist', () => {
    it('should delete watchlist successfully', async () => {
      mockedApiService.delete.mockResolvedValue({
        success: true,
        data: null,
      });

      await watchlistService.deleteWatchlist('watchlist-1');

      expect(mockedApiService.delete).toHaveBeenCalledWith(
        expect.stringContaining('/watchlist/watchlist-1')
      );
    });

    it('should remove watchlist from cache after deletion', async () => {
      mockedApiService.delete.mockResolvedValue({
        success: true,
        data: null,
      });

      await watchlistService.deleteWatchlist('watchlist-1');

      expect(mockedAsyncStorage.removeItem).toHaveBeenCalled();
    });

    it('should throw error if deletion fails', async () => {
      mockedApiService.delete.mockResolvedValue({
        success: false,
        error: { message: 'Failed to delete watchlist' },
      });

      await expect(watchlistService.deleteWatchlist('watchlist-1')).rejects.toThrow(
        'Failed to delete watchlist'
      );
    });

    it('should handle network error during deletion', async () => {
      mockedApiService.delete.mockRejectedValue(new Error('Network error'));

      await expect(watchlistService.deleteWatchlist('watchlist-1')).rejects.toThrow(
        'Network error'
      );
    });
  });

  // ============================================
  // 6. Add Item to Watchlist
  // ============================================
  describe('addToWatchlist', () => {
    it('should add item to watchlist successfully', async () => {
      const newItem = {
        title: 'The Matrix',
        type: 'movie' as const,
        rating: 8.7,
        year: 1999,
        availableOn: ['Netflix'],
        genres: ['Sci-Fi', 'Action'],
        status: 'to_watch' as const,
        priority: 'high' as const,
      };

      const itemWithId = { ...newItem, id: 'item-2', addedAt: new Date().toISOString() };

      mockedApiService.post.mockResolvedValue({
        success: true,
        data: { item: itemWithId },
      });

      const result = await watchlistService.addToWatchlist('watchlist-1', newItem);

      expect(result).toBeDefined();
      expect(result.title).toBe(newItem.title);
      expect(result.id).toBeDefined();
      expect(result.addedAt).toBeDefined();
      expect(mockedApiService.post).toHaveBeenCalledWith(
        expect.stringContaining('/watchlist/watchlist-1/items'),
        expect.objectContaining({
          title: newItem.title,
          addedAt: expect.any(String),
        })
      );
    });

    it('should cache watchlist after adding item', async () => {
      const newItem = {
        title: 'The Matrix',
        type: 'movie' as const,
        rating: 8.7,
        year: 1999,
        availableOn: ['Netflix'],
        genres: ['Sci-Fi'],
        status: 'to_watch' as const,
        priority: 'medium' as const,
      };

      const itemWithId = { ...newItem, id: 'item-2', addedAt: new Date().toISOString() };

      // Mock cached watchlist exists
      mockedAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({
          data: mockWatchlist,
          timestamp: Date.now(),
        })
      );

      mockedApiService.post.mockResolvedValue({
        success: true,
        data: { item: itemWithId },
      });

      await watchlistService.addToWatchlist('watchlist-1', newItem);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should throw error if adding item fails', async () => {
      const newItem = {
        title: 'The Matrix',
        type: 'movie' as const,
        rating: 8.7,
        year: 1999,
        availableOn: ['Netflix'],
        genres: ['Sci-Fi'],
        status: 'to_watch' as const,
        priority: 'medium' as const,
      };

      mockedApiService.post.mockResolvedValue({
        success: false,
        error: { message: 'Failed to add item' },
      });

      await expect(
        watchlistService.addToWatchlist('watchlist-1', newItem)
      ).rejects.toThrow('Failed to add item');
    });

    it('should handle duplicate item gracefully', async () => {
      const newItem = {
        title: 'Inception',
        type: 'movie' as const,
        rating: 8.8,
        year: 2010,
        availableOn: ['Netflix'],
        genres: ['Sci-Fi'],
        status: 'to_watch' as const,
        priority: 'high' as const,
      };

      mockedApiService.post.mockResolvedValue({
        success: false,
        error: { message: 'Item already exists in watchlist', code: 'DUPLICATE_ITEM' },
      });

      await expect(
        watchlistService.addToWatchlist('watchlist-1', newItem)
      ).rejects.toThrow('Item already exists in watchlist');
    });
  });

  // ============================================
  // 7. Update Watchlist Item
  // ============================================
  describe('updateWatchlistItem', () => {
    it('should update watchlist item successfully', async () => {
      const updates = {
        status: 'watched' as const,
        userRating: 9,
        watchedAt: new Date().toISOString(),
      };

      const updatedItem = { ...mockWatchlistItem, ...updates };

      mockedApiService.put.mockResolvedValue({
        success: true,
        data: { item: updatedItem },
      });

      const result = await watchlistService.updateWatchlistItem(
        'watchlist-1',
        'item-1',
        updates
      );

      expect(result.status).toBe(updates.status);
      expect(result.userRating).toBe(updates.userRating);
      expect(mockedApiService.put).toHaveBeenCalledWith(
        expect.stringContaining('/watchlist/watchlist-1/items/item-1'),
        expect.objectContaining(updates)
      );
    });

    it('should cache watchlist after updating item', async () => {
      const updates = { status: 'watched' as const };

      // Mock cached watchlist exists
      mockedAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({
          data: mockWatchlist,
          timestamp: Date.now(),
        })
      );

      mockedApiService.put.mockResolvedValue({
        success: true,
        data: { item: { ...mockWatchlistItem, ...updates } },
      });

      await watchlistService.updateWatchlistItem('watchlist-1', 'item-1', updates);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should throw error if update fails', async () => {
      const updates = { status: 'watched' as const };

      mockedApiService.put.mockResolvedValue({
        success: false,
        error: { message: 'Failed to update item' },
      });

      await expect(
        watchlistService.updateWatchlistItem('watchlist-1', 'item-1', updates)
      ).rejects.toThrow('Failed to update item');
    });

    it('should handle item not found error', async () => {
      const updates = { status: 'watched' as const };

      mockedApiService.put.mockResolvedValue({
        success: false,
        error: { message: 'Item not found', code: 'NOT_FOUND' },
      });

      await expect(
        watchlistService.updateWatchlistItem('watchlist-1', 'non-existent', updates)
      ).rejects.toThrow('Item not found');
    });
  });

  // ============================================
  // 8. Remove Item from Watchlist
  // ============================================
  describe('removeFromWatchlist', () => {
    it('should remove item from watchlist successfully', async () => {
      mockedApiService.delete.mockResolvedValue({
        success: true,
        data: null,
      });

      await watchlistService.removeFromWatchlist('watchlist-1', 'item-1');

      expect(mockedApiService.delete).toHaveBeenCalledWith(
        expect.stringContaining('/watchlist/watchlist-1/items/item-1')
      );
    });

    it('should update cache after removing item', async () => {
      // Mock cached watchlist exists
      mockedAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({
          data: mockWatchlist,
          timestamp: Date.now(),
        })
      );

      mockedApiService.delete.mockResolvedValue({
        success: true,
        data: null,
      });

      await watchlistService.removeFromWatchlist('watchlist-1', 'item-1');

      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should throw error if removal fails', async () => {
      mockedApiService.delete.mockResolvedValue({
        success: false,
        error: { message: 'Failed to remove item' },
      });

      await expect(
        watchlistService.removeFromWatchlist('watchlist-1', 'item-1')
      ).rejects.toThrow('Failed to remove item');
    });

    it('should handle item not found error', async () => {
      mockedApiService.delete.mockResolvedValue({
        success: false,
        error: { message: 'Item not found', code: 'NOT_FOUND' },
      });

      await expect(
        watchlistService.removeFromWatchlist('watchlist-1', 'non-existent')
      ).rejects.toThrow('Item not found');
    });
  });

  // ============================================
  // 9. Watchlist Statistics
  // ============================================
  describe('getWatchlistStats', () => {
    it('should fetch watchlist statistics successfully', async () => {
      mockedApiService.get.mockResolvedValue({
        success: true,
        data: { stats: mockWatchlistStats },
      });

      const result = await watchlistService.getWatchlistStats('user-123');

      expect(result).toEqual(mockWatchlistStats);
      expect(mockedApiService.get).toHaveBeenCalledWith(
        expect.stringContaining('/users/user-123/watchlist/stats')
      );
    });

    it('should return default stats if API fails', async () => {
      mockedApiService.get.mockRejectedValue(new Error('Network error'));

      const result = await watchlistService.getWatchlistStats('user-123');

      expect(result).toEqual({
        totalItems: 0,
        watchedItems: 0,
        currentlyWatching: 0,
        averageRating: 0,
        favoriteGenre: '',
        totalTimeWatched: 0,
        thisMonthAdded: 0,
        thisMonthWatched: 0,
      });
    });
  });

  // ============================================
  // 10. Search Watchlists
  // ============================================
  describe('searchWatchlists', () => {
    it('should search watchlists successfully', async () => {
      const searchResults = [mockWatchlistItem];

      mockedApiService.get.mockResolvedValue({
        success: true,
        data: { items: searchResults },
      });

      const result = await watchlistService.searchWatchlists('Inception');

      expect(result).toEqual(searchResults);
      expect(mockedApiService.get).toHaveBeenCalledWith(
        expect.stringContaining('/watchlist/search?query=Inception')
      );
    });

    it('should search with filters (genre, type, status)', async () => {
      const searchResults = [mockWatchlistItem];
      const filters = {
        genres: ['Sci-Fi'],
        type: 'movie' as const,
        status: 'to_watch' as const,
      };

      mockedApiService.get.mockResolvedValue({
        success: true,
        data: { items: searchResults },
      });

      const result = await watchlistService.searchWatchlists('Inception', filters);

      expect(result).toEqual(searchResults);
      expect(mockedApiService.get).toHaveBeenCalledWith(
        expect.stringContaining('genres=Sci-Fi')
      );
    });

    it('should fallback to cached search if API fails', async () => {
      const cachedWatchlists = [mockWatchlist];

      mockedApiService.get.mockRejectedValue(new Error('Network error'));
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify({ data: cachedWatchlists, timestamp: Date.now() }));

      const result = await watchlistService.searchWatchlists('Inception');

      // Should search cached watchlists
      expect(result).toBeDefined();
    });

    it('should return empty array if no results found', async () => {
      mockedApiService.get.mockResolvedValue({
        success: true,
        data: { items: [] },
      });

      const result = await watchlistService.searchWatchlists('NonExistent');

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // 11. Share Watchlist
  // ============================================
  describe('shareWatchlist', () => {
    it('should generate share code successfully', async () => {
      const shareCode = 'ABC123XYZ';

      mockedApiService.post.mockResolvedValue({
        success: true,
        data: { shareCode },
      });

      const result = await watchlistService.shareWatchlist('watchlist-1');

      expect(result).toBe(shareCode);
      expect(mockedApiService.post).toHaveBeenCalledWith(
        expect.stringContaining('/watchlist/watchlist-1/share'),
        expect.any(Object)
      );
    });

    it('should throw error if share fails', async () => {
      mockedApiService.post.mockResolvedValue({
        success: false,
        error: { message: 'Failed to generate share code' },
      });

      await expect(watchlistService.shareWatchlist('watchlist-1')).rejects.toThrow(
        'Failed to generate share code'
      );
    });

    it('should handle network error during share', async () => {
      mockedApiService.post.mockRejectedValue(new Error('Network error'));

      await expect(watchlistService.shareWatchlist('watchlist-1')).rejects.toThrow(
        'Network error'
      );
    });
  });

  // ============================================
  // 12. Caching and Offline Support
  // ============================================
  describe('Caching and Offline Support', () => {
    it('should cache watchlist with timestamp', async () => {
      mockedApiService.get.mockResolvedValue({
        success: true,
        data: { watchlist: mockWatchlist },
      });

      await watchlistService.getWatchlist('watchlist-1');

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('watchlist_cache_watchlist-1'),
        expect.stringContaining('"timestamp"')
      );
    });

    it('should use cache within 5-minute TTL', async () => {
      const recentTimestamp = Date.now() - (2 * 60 * 1000); // 2 minutes ago

      mockedApiService.get.mockRejectedValue(new Error('Network error'));

      const cacheKey = '@geoleap_watchlist_cache_watchlist-1';
      mockedAsyncStorage.getItem.mockImplementation((key) => {
        if (key === cacheKey) {
          return Promise.resolve(
            JSON.stringify({
              data: mockWatchlist,
              timestamp: recentTimestamp,
            })
          );
        }
        return Promise.resolve(null);
      });

      const result = await watchlistService.getWatchlist('watchlist-1');

      expect(result).toEqual(mockWatchlist);
    });

    it('should invalidate cache older than 5 minutes', async () => {
      const expiredTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago

      mockedApiService.get.mockRejectedValue(new Error('Network error'));

      const cacheKey = '@geoleap_watchlist_cache_watchlist-1';
      mockedAsyncStorage.getItem.mockImplementation((key) => {
        if (key === cacheKey) {
          return Promise.resolve(
            JSON.stringify({
              data: mockWatchlist,
              timestamp: expiredTimestamp,
            })
          );
        }
        return Promise.resolve(null);
      });

      const result = await watchlistService.getWatchlist('watchlist-1');

      expect(result).toBeNull();
    });

    it('should handle corrupted cache data gracefully', async () => {
      mockedApiService.get.mockRejectedValue(new Error('Network error'));

      const cacheKey = '@geoleap_watchlist_cache_watchlist-1';
      mockedAsyncStorage.getItem.mockImplementation((key) => {
        if (key === cacheKey) {
          return Promise.resolve('invalid-json-{]');
        }
        return Promise.resolve(null);
      });

      const result = await watchlistService.getWatchlist('watchlist-1');

      expect(result).toBeNull();
    });
  });

  // ============================================
  // 13. Error Handling
  // ============================================
  describe('Error Handling', () => {
    it('should handle API 404 error gracefully', async () => {
      mockedApiService.get.mockResolvedValue({
        success: false,
        error: { message: 'Not Found', code: 404 },
      });

      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const result = await watchlistService.getWatchlist('non-existent');

      expect(result).toBeNull();
    });

    it('should handle API 500 error and fallback to cache', async () => {
      mockedApiService.get.mockResolvedValue({
        success: false,
        error: { message: 'Internal Server Error', code: 500 },
      });

      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify({ data: [mockWatchlist], timestamp: Date.now() }));

      const result = await watchlistService.getAllWatchlists();

      expect(result).toEqual([mockWatchlist]);
    });

    it('should handle network timeout gracefully', async () => {
      mockedApiService.get.mockRejectedValue(new Error('Request timeout'));
      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const result = await watchlistService.getAllWatchlists();

      expect(result).toEqual([]);
    });

    it('should handle AsyncStorage failure gracefully', async () => {
      mockedApiService.get.mockResolvedValue({
        success: true,
        data: { watchlists: [mockWatchlist] },
      });

      mockedAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));

      // Should not throw, just log error
      await expect(watchlistService.getAllWatchlists()).resolves.not.toThrow();
    });
  });

  // ============================================
  // getOrCreateDefaultWatchlistId
  // ============================================
  describe('getOrCreateDefaultWatchlistId', () => {
    it('returns the id of the watchlist flagged isDefault', async () => {
      const nonDefault: Watchlist = { ...mockWatchlist, id: 'wl-other', isDefault: false };
      const defaultWl: Watchlist = { ...mockWatchlist, id: 'wl-default', isDefault: true };
      mockedApiService.get.mockResolvedValue({
        success: true,
        data: { watchlists: [nonDefault, defaultWl] },
      });

      const id = await watchlistService.getOrCreateDefaultWatchlistId();

      expect(id).toBe('wl-default');
      expect(mockedApiService.post).not.toHaveBeenCalled();
    });

    it('falls back to the first watchlist when none is flagged default', async () => {
      const first: Watchlist = { ...mockWatchlist, id: 'wl-first', isDefault: false };
      const second: Watchlist = { ...mockWatchlist, id: 'wl-second', isDefault: false };
      mockedApiService.get.mockResolvedValue({
        success: true,
        data: { watchlists: [first, second] },
      });

      const id = await watchlistService.getOrCreateDefaultWatchlistId();

      expect(id).toBe('wl-first');
      expect(mockedApiService.post).not.toHaveBeenCalled();
    });

    it('creates a default watchlist when the user has none', async () => {
      mockedApiService.get.mockResolvedValue({
        success: true,
        data: { watchlists: [] },
      });
      const created: Watchlist = { ...mockWatchlist, id: 'wl-created', isDefault: true };
      mockedApiService.post.mockResolvedValue({
        success: true,
        data: { watchlist: created },
      });

      const id = await watchlistService.getOrCreateDefaultWatchlistId();

      expect(id).toBe('wl-created');
      expect(mockedApiService.post).toHaveBeenCalledTimes(1);
      const [, payload] = mockedApiService.post.mock.calls[0];
      expect(payload).toEqual(expect.objectContaining({ isDefault: true }));
    });
  });
});
