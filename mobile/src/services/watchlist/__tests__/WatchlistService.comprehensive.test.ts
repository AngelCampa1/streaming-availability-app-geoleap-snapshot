/**
 * Comprehensive tests for WatchlistService
 * Target: 95%+ coverage
 * Focus: Watchlist CRUD, item management, caching, offline support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../../api/ApiService';
import { watchlistService as service } from '../WatchlistService';
import type { Watchlist, WatchlistItem } from '../WatchlistService';

// Mock AsyncStorage with functional store
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};

  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] || null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
    },
  };
});

// Mock ApiService
jest.mock('../../api/ApiService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock endpoints
jest.mock('../../../config/api', () => ({
  endpoints: {
    users: {
      watchlist: '/api/users/watchlist',
    },
    streaming: {
      watchlist: '/api/streaming/watchlist',
    },
  },
}));

// Get the mocked ApiService after jest.mock is hoisted
const mockApiService = require('../../api/ApiService').default as jest.Mocked<{
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  delete: jest.Mock;
}>;

describe('WatchlistService - Comprehensive Tests', () => {
  const mockWatchlistItem: Omit<WatchlistItem, 'id' | 'addedAt'> = {
    title: 'Inception',
    type: 'movie',
    rating: 8.8,
    year: 2010,
    availableOn: ['Netflix'],
    genres: ['Sci-Fi', 'Thriller'],
    runtime: 148,
    status: 'to_watch',
    priority: 'high',
  };

  const mockWatchlist: Watchlist = {
    id: 'watchlist-1',
    name: 'My Movies',
    description: 'Movies to watch',
    isDefault: true,
    isPublic: false,
    items: [],
    createdBy: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    AsyncStorageMock.getItem.mockResolvedValue(null);
    AsyncStorageMock.setItem.mockResolvedValue();
  });

  describe('Get All Watchlists', () => {
    it('should fetch watchlists from API and cache them', async () => {
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: { watchlists: [mockWatchlist] },
      });

      const result = await service.getAllWatchlists();

      expect(result).toEqual([mockWatchlist]);
      expect(mockApiService.get).toHaveBeenCalledWith(
        '/api/users/watchlist',
        { cacheTTL: 300000 }
      );
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should fallback to cached watchlists on API error', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValueOnce(
        JSON.stringify({
          data: [mockWatchlist],
          timestamp: Date.now(),
        })
      );

      const result = await service.getAllWatchlists();

      expect(result).toEqual([mockWatchlist]);
    });

    it('should return empty array when cache is empty', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getAllWatchlists();

      expect(result).toEqual([]);
    });

    it('should return empty array when cache is expired', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValueOnce(
        JSON.stringify({
          data: [mockWatchlist],
          timestamp: Date.now() - (6 * 60 * 1000), // 6 minutes ago (expired)
        })
      );

      const result = await service.getAllWatchlists();

      expect(result).toEqual([]);
    });

    it('should handle API response without success flag', async () => {
      mockApiService.get.mockResolvedValueOnce({
        success: false,
        error: { message: 'Unauthorized' },
      });

      const result = await service.getAllWatchlists();

      expect(result).toEqual([]);
    });
  });

  describe('Get Single Watchlist', () => {
    it('should fetch single watchlist from API', async () => {
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: { watchlist: mockWatchlist },
      });

      const result = await service.getWatchlist('watchlist-1');

      expect(result).toEqual(mockWatchlist);
      expect(mockApiService.get).toHaveBeenCalledWith(
        '/api/users/watchlist/watchlist-1',
        { cacheTTL: 300000 }
      );
    });

    it('should fallback to cached watchlist on API error', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValueOnce(
        JSON.stringify({
          data: mockWatchlist,
          timestamp: Date.now(),
        })
      );

      const result = await service.getWatchlist('watchlist-1');

      expect(result).toEqual(mockWatchlist);
    });

    it('should return null when watchlist not found', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('Not found'));

      const result = await service.getWatchlist('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('Create Watchlist', () => {
    it('should create watchlist via API', async () => {
      const newWatchlist = { ...mockWatchlist, id: 'new-id' };
      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: { watchlist: newWatchlist },
      });

      const result = await service.createWatchlist({
        name: 'New Watchlist',
        isDefault: false,
        isPublic: false,
        createdBy: 'user-1',
      });

      expect(result).toEqual(newWatchlist);
      expect(mockApiService.post).toHaveBeenCalled();
    });

    it('should throw error on API network error', async () => {
      mockApiService.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.createWatchlist({
        name: 'Offline Watchlist',
        isDefault: false,
        isPublic: false,
        createdBy: 'user-1',
      })).rejects.toThrow('Network error');
    });

    it('should throw error on API response without success', async () => {
      mockApiService.post.mockResolvedValueOnce({
        success: false,
        error: { message: 'Validation error' },
      });

      await expect(service.createWatchlist({
        name: 'Test',
        isDefault: false,
        isPublic: false,
        createdBy: 'user-1',
      })).rejects.toThrow('Validation error');
    });
  });

  describe('Update Watchlist', () => {
    it('should update watchlist via API', async () => {
      const updated = { ...mockWatchlist, name: 'Updated Name' };
      mockApiService.put.mockResolvedValueOnce({
        success: true,
        data: { watchlist: updated },
      });

      const result = await service.updateWatchlist('watchlist-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(mockApiService.put).toHaveBeenCalled();
    });

    it('should fallback to cache update on API error', async () => {
      mockApiService.put.mockRejectedValueOnce(new Error('Network error'));

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValueOnce(
        JSON.stringify({
          data: mockWatchlist,
          timestamp: Date.now(),
        })
      );

      const result = await service.updateWatchlist('watchlist-1', { name: 'Offline Update' });

      expect(result.name).toBe('Offline Update');
    });

    it('should throw error when watchlist not in cache', async () => {
      mockApiService.put.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.updateWatchlist('invalid-id', { name: 'Test' }))
        .rejects.toThrow();
    });
  });

  describe('Delete Watchlist', () => {
    it('should delete watchlist from API and cache', async () => {
      mockApiService.delete.mockResolvedValueOnce({
        success: true,
      });

      await service.deleteWatchlist('watchlist-1');

      expect(mockApiService.delete).toHaveBeenCalledWith('/api/users/watchlist/watchlist-1');
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });

    it('should throw error if API fails', async () => {
      mockApiService.delete.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.deleteWatchlist('watchlist-1'))
        .rejects.toThrow('Network error');
    });

    it('should throw error on API response without success', async () => {
      mockApiService.delete.mockResolvedValueOnce({
        success: false,
        error: { message: 'Not found' },
      });

      await expect(service.deleteWatchlist('watchlist-1'))
        .rejects.toThrow('Not found');
    });
  });

  describe('Add Item to Watchlist', () => {
    it('should add item via API', async () => {
      const item = { ...mockWatchlistItem, id: 'item-1', addedAt: new Date().toISOString() };
      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: { item },
      });

      const result = await service.addToWatchlist('watchlist-1', mockWatchlistItem);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe('Inception');
    });

    it('should throw error on API network error', async () => {
      mockApiService.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.addToWatchlist('watchlist-1', mockWatchlistItem))
        .rejects.toThrow('Network error');
    });
  });

  describe('Update Watchlist Item', () => {
    it('should update item via API', async () => {
      const updated = { ...mockWatchlistItem, id: 'item-1', addedAt: new Date().toISOString(), status: 'watched' as const };
      mockApiService.put.mockResolvedValueOnce({
        success: true,
        data: { item: updated },
      });

      const result = await service.updateWatchlistItem('watchlist-1', 'item-1', { status: 'watched' });

      expect(result.status).toBe('watched');
    });

    it('should fallback to cache update on API error', async () => {
      mockApiService.put.mockRejectedValueOnce(new Error('Network error'));

      const item = { ...mockWatchlistItem, id: 'item-1', addedAt: new Date().toISOString() };
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValueOnce(
        JSON.stringify({
          data: { ...mockWatchlist, items: [item] },
          timestamp: Date.now(),
        })
      );

      const result = await service.updateWatchlistItem('watchlist-1', 'item-1', { status: 'watched' });

      expect(result.status).toBe('watched');
    });

    it('should throw error when item not found in cache', async () => {
      mockApiService.put.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.updateWatchlistItem('watchlist-1', 'invalid-id', { status: 'watched' }))
        .rejects.toThrow();
    });
  });

  describe('Remove Item from Watchlist', () => {
    it('should remove item via API', async () => {
      mockApiService.delete.mockResolvedValueOnce({
        success: true,
      });

      await service.removeFromWatchlist('watchlist-1', 'item-1');

      expect(mockApiService.delete).toHaveBeenCalled();
    });

    it('should throw error if API fails', async () => {
      mockApiService.delete.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.removeFromWatchlist('watchlist-1', 'item-1'))
        .rejects.toThrow('Network error');
    });
  });

  describe('Get Watchlist Stats', () => {
    it('should fetch stats from API', async () => {
      const stats = {
        totalItems: 10,
        watchedItems: 5,
        currentlyWatching: 2,
        averageRating: 8.5,
        favoriteGenre: 'Sci-Fi',
        totalTimeWatched: 1200,
        thisMonthAdded: 3,
        thisMonthWatched: 2,
      };

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: stats,
      });

      const result = await service.getWatchlistStats('user-1');

      expect(result).toEqual(stats);
    });

    it('should calculate stats from cache on API error', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValueOnce(
        JSON.stringify({
          data: [{
            ...mockWatchlist,
            items: [
              { ...mockWatchlistItem, id: '1', addedAt: new Date().toISOString(), status: 'watched' as const, userRating: 9 },
              { ...mockWatchlistItem, id: '2', addedAt: new Date().toISOString(), status: 'watching' as const, userRating: 8 },
            ],
          }],
          timestamp: Date.now(),
        })
      );

      const result = await service.getWatchlistStats('user-1');

      expect(result.totalItems).toBe(2);
      expect(result.watchedItems).toBe(1);
      expect(result.currentlyWatching).toBe(1);
      expect(result.averageRating).toBeGreaterThan(0);
    });

    it('should handle empty cache for stats', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getWatchlistStats('user-1');

      expect(result.totalItems).toBe(0);
      expect(result.favoriteGenre).toBe('');
    });
  });

  describe('Search Watchlists', () => {
    it('should search via API with query', async () => {
      const items = [{ ...mockWatchlistItem, id: '1', addedAt: new Date().toISOString() }];
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: items,
      });

      const result = await service.searchWatchlists('inception');

      expect(result).toEqual(items);
      expect(mockApiService.get).toHaveBeenCalled();
    });

    it('should search via API with filters', async () => {
      const items = [{ ...mockWatchlistItem, id: '1', addedAt: new Date().toISOString() }];
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: items,
      });

      const result = await service.searchWatchlists('', {
        genre: 'Sci-Fi',
        type: 'movie',
        status: 'to_watch',
        rating: 8,
      });

      expect(result).toEqual(items);
    });

    it('should fallback to cached search on API error', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const item = { ...mockWatchlistItem, id: '1', addedAt: new Date().toISOString() };
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValueOnce(
        JSON.stringify({
          data: [{ ...mockWatchlist, items: [item] }],
          timestamp: Date.now(),
        })
      );

      const result = await service.searchWatchlists('inception');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].title).toBe('Inception');
    });

    it('should filter cached results by genre', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const item1 = { ...mockWatchlistItem, id: '1', addedAt: new Date().toISOString(), genres: ['Sci-Fi'] };
      const item2 = { ...mockWatchlistItem, id: '2', addedAt: new Date().toISOString(), genres: ['Drama'] };
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValueOnce(
        JSON.stringify({
          data: [{ ...mockWatchlist, items: [item1, item2] }],
          timestamp: Date.now(),
        })
      );

      const result = await service.searchWatchlists('', { genre: 'Sci-Fi' });

      expect(result.length).toBe(1);
      expect(result[0].genres).toContain('Sci-Fi');
    });

    it('should filter cached results by type', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const item = { ...mockWatchlistItem, id: '1', addedAt: new Date().toISOString(), type: 'movie' as const };
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValueOnce(
        JSON.stringify({
          data: [{ ...mockWatchlist, items: [item] }],
          timestamp: Date.now(),
        })
      );

      const result = await service.searchWatchlists('', { type: 'movie' });

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('movie');
    });

    it('should filter cached results by status', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const item = { ...mockWatchlistItem, id: '1', addedAt: new Date().toISOString(), status: 'watched' as const };
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValueOnce(
        JSON.stringify({
          data: [{ ...mockWatchlist, items: [item] }],
          timestamp: Date.now(),
        })
      );

      const result = await service.searchWatchlists('', { status: 'watched' });

      expect(result.length).toBe(1);
      expect(result[0].status).toBe('watched');
    });

    it('should filter cached results by rating', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const item = { ...mockWatchlistItem, id: '1', addedAt: new Date().toISOString(), rating: 9.0 };
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValueOnce(
        JSON.stringify({
          data: [{ ...mockWatchlist, items: [item] }],
          timestamp: Date.now(),
        })
      );

      const result = await service.searchWatchlists('', { rating: 8.5 });

      expect(result.length).toBe(1);
      expect(result[0].rating).toBeGreaterThanOrEqual(8.5);
    });
  });

  describe('Share Watchlist', () => {
    it('should generate share code via API', async () => {
      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: { shareCode: 'ABC123' },
      });

      const result = await service.shareWatchlist('watchlist-1');

      expect(result).toBe('ABC123');
    });

    it('should throw error on API failure', async () => {
      mockApiService.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.shareWatchlist('watchlist-1')).rejects.toThrow();
    });
  });

  describe('Import Watchlist', () => {
    it('should import watchlist via API', async () => {
      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: { watchlist: mockWatchlist },
      });

      const result = await service.importWatchlist('ABC123');

      expect(result).toEqual(mockWatchlist);
    });

    it('should throw error on invalid share code', async () => {
      mockApiService.post.mockRejectedValueOnce(new Error('Invalid code'));

      await expect(service.importWatchlist('INVALID')).rejects.toThrow();
    });
  });

  describe('Sync Watchlists', () => {
    it('should sync watchlists between cache and server', async () => {
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValueOnce(
        JSON.stringify({
          data: [mockWatchlist],
          timestamp: Date.now(),
        })
      );

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: { watchlists: [mockWatchlist] },
      });

      await service.syncWatchlists();

      // Should complete without error
      expect(true).toBe(true);
    });

    it('should handle sync errors gracefully', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('Network error'));

      await service.syncWatchlists();

      // Should complete without throwing
      expect(true).toBe(true);
    });
  });

  describe('Caching', () => {
    it('should handle AsyncStorage errors gracefully', async () => {
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockRejectedValueOnce(new Error('Storage error'));

      mockApiService.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getAllWatchlists();

      expect(result).toEqual([]);
    });

    it('should handle setItem errors gracefully', async () => {
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.setItem.mockRejectedValueOnce(new Error('Storage full'));

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: { watchlists: [mockWatchlist] },
      });

      const result = await service.getAllWatchlists();

      // Should still return data even if caching fails
      expect(result).toEqual([mockWatchlist]);
    });
  });
});
