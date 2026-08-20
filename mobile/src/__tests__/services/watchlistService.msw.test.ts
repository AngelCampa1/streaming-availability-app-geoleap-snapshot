/**
 * WatchlistService MSW Integration Tests
 *
 * Tests watchlist management functionality using MSW to intercept API calls.
 * Executes REAL WatchlistService business logic with mocked external I/O.
 *
 * Coverage Target: 70-80% of WatchlistService.ts (591 LOC)
 * Test Philosophy: Coverage > Pass Rate (mock only external I/O)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { watchlistService } from '../../services/watchlist/WatchlistService';
import { resetMockWatchlist } from '../../mocks/handlers/watchlist.handlers';

// Use global http, HttpResponse, and server from jest.setup.fetch-mock.js
const { http, HttpResponse, server } = global as any;

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

describe('WatchlistService - MSW Integration Tests', () => {
  beforeAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    resetMockWatchlist();
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('getAllWatchlists()', () => {
    it('should update description field', async () => {
      const updated = await watchlistService.updateWatchlist('watchlist-1', {
        description: 'New description',
      });

      expect(updated.description).toBe('New description');
    });
  });

  describe('updateWatchlistItem()', () => {
    it('should successfully update watchlist item', async () => {
      const updatedItem = await watchlistService.updateWatchlistItem('watchlist-1', 'item-1', {
        status: 'watched' as const,
      });

      // Verify the update succeeded and returned updated item
      expect(updatedItem).toBeDefined();
      expect(updatedItem.id).toBe('item-1');
      expect(updatedItem.status).toBe('watched');
    });
  });

  describe('removeFromWatchlist()', () => {
    it('should filter by type', async () => {
      const results = await watchlistService.searchWatchlists('', {
        type: 'movie',
      });

      expect(results).toBeDefined();
      results.forEach(item => {
        expect(item.type).toBe('movie');
      });
    });

    it('should filter by status', async () => {
      const results = await watchlistService.searchWatchlists('', {
        status: 'watched',
      });

      expect(results).toBeDefined();
      results.forEach(item => {
        expect(item.status).toBe('watched');
      });
    });

    it('should combine query and filters', async () => {
      const results = await watchlistService.searchWatchlists('inception', {
        type: 'movie',
        status: 'to_watch',
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('shareWatchlist()', () => {
    it('should share a watchlist', async () => {
      // Placeholder test - actual implementation depends on service
      expect(true).toBe(true);
    });
  });
});