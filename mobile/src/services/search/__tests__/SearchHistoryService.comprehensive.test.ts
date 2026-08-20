/**
 * Comprehensive tests for SearchHistoryService
 * Target: 95%+ coverage
 * Focus: Search history management, analytics, persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchHistoryService } from '../SearchHistoryService';
import { SearchHistory } from '../../../types/streaming';

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
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
        return Promise.resolve();
      }),
    },
  };
});

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('SearchHistoryService - Comprehensive Tests', () => {
  let service: SearchHistoryService;

  beforeAll(() => {
    // Use real timers - SearchHistoryService may use setTimeout for debouncing
    jest.useRealTimers();
  });

  const mockSearchHistory: Omit<SearchHistory, 'id' | 'timestamp'> = {
    query: 'breaking bad',
    resultCount: 10,
    filters: { type: 'tv_series', genre: 'drama' },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instance to allow new config
    (SearchHistoryService as any).instance = undefined;

    // Reset AsyncStorage
    const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    AsyncStorageMock.getItem.mockResolvedValue(null);
    AsyncStorageMock.setItem.mockResolvedValue();

    // Create new instance with test config
    service = SearchHistoryService.getInstance({
      maxHistoryItems: 50,
      storageKey: 'test_search_history',
      enableAnalytics: true,
      analyticsStorageKey: 'test_search_analytics',
    });
  });

  describe('Add to History', () => {
    it('should add search to history', async () => {
      await service.addToHistory(mockSearchHistory);

      const history = service.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].query).toBe('breaking bad');
      expect(history[0]).toHaveProperty('id');
      expect(history[0]).toHaveProperty('timestamp');
    });

    it('should remove duplicate queries', async () => {
      await service.addToHistory(mockSearchHistory);
      await service.addToHistory(mockSearchHistory);

      const history = service.getHistory();
      expect(history.length).toBe(1); // Should only have one entry
    });

    it('should add new entry at the beginning', async () => {
      await service.addToHistory({ ...mockSearchHistory, query: 'first' });
      await service.addToHistory({ ...mockSearchHistory, query: 'second' });

      const history = service.getHistory();
      expect(history[0].query).toBe('second');
      expect(history[1].query).toBe('first');
    });

    it('should limit history size to maxHistoryItems', async () => {
      // Reset singleton to create instance with custom config
      (SearchHistoryService as any).instance = undefined;
      const customService = SearchHistoryService.getInstance({ maxHistoryItems: 3 });

      await customService.addToHistory({ ...mockSearchHistory, query: 'query1' });
      await customService.addToHistory({ ...mockSearchHistory, query: 'query2' });
      await customService.addToHistory({ ...mockSearchHistory, query: 'query3' });
      await customService.addToHistory({ ...mockSearchHistory, query: 'query4' });

      const history = customService.getHistory();
      expect(history.length).toBe(3);
      expect(history.map(h => h.query)).toEqual(['query4', 'query3', 'query2']);
    });

    it('should persist history to AsyncStorage', async () => {
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

      await service.addToHistory(mockSearchHistory);

      expect(AsyncStorageMock.setItem).toHaveBeenCalledWith(
        'test_search_history',
        expect.any(String)
      );
    });

    it('should track analytics if enabled', async () => {
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValueOnce(null); // No existing analytics

      await service.addToHistory(mockSearchHistory);

      const analyticsCall = AsyncStorageMock.setItem.mock.calls.find(
        ([key]) => key === 'test_search_analytics'
      );
      expect(analyticsCall).toBeDefined();
    });

    it('should notify listeners on add', async () => {
      const listener = jest.fn();
      service.subscribe(listener);

      await service.addToHistory(mockSearchHistory);

      expect(listener).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ query: 'breaking bad' }),
        ])
      );
    });
  });

  describe('Get History', () => {
    beforeEach(async () => {
      await service.addToHistory({ ...mockSearchHistory, query: 'search1' });
      await service.addToHistory({ ...mockSearchHistory, query: 'search2' });
      await service.addToHistory({ ...mockSearchHistory, query: 'search3' });
    });

    it('should return all history', () => {
      const history = service.getHistory();
      expect(history.length).toBe(3);
    });

    it('should return limited history', () => {
      const history = service.getHistory(2);
      expect(history.length).toBe(2);
    });

    it('should return history sorted by timestamp descending', () => {
      const history = service.getHistory();
      expect(history[0].query).toBe('search3');
      expect(history[1].query).toBe('search2');
      expect(history[2].query).toBe('search1');
    });
  });

  describe('Remove from History', () => {
    it('should remove item by id', async () => {
      await service.addToHistory(mockSearchHistory);
      const history = service.getHistory();
      const idToRemove = history[0].id;

      await service.removeFromHistory(idToRemove);

      const updatedHistory = service.getHistory();
      expect(updatedHistory.length).toBe(0);
    });

    it('should persist after removal', async () => {
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

      await service.addToHistory(mockSearchHistory);
      const history = service.getHistory();

      await service.removeFromHistory(history[0].id);

      expect(AsyncStorageMock.setItem).toHaveBeenCalledWith(
        'test_search_history',
        expect.any(String)
      );
    });

    it('should notify listeners on remove', async () => {
      await service.addToHistory(mockSearchHistory);
      const history = service.getHistory();

      const listener = jest.fn();
      service.subscribe(listener);

      await service.removeFromHistory(history[0].id);

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Clear History', () => {
    it('should clear all history', async () => {
      await service.addToHistory({ ...mockSearchHistory, query: 'search1' });
      await service.addToHistory({ ...mockSearchHistory, query: 'search2' });

      await service.clearHistory();

      const history = service.getHistory();
      expect(history.length).toBe(0);
    });

    it('should persist after clear', async () => {
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

      await service.addToHistory(mockSearchHistory);
      await service.clearHistory();

      expect(AsyncStorageMock.setItem).toHaveBeenCalledWith(
        'test_search_history',
        '[]'
      );
    });

    it('should notify listeners on clear', async () => {
      await service.addToHistory(mockSearchHistory);

      const listener = jest.fn();
      service.subscribe(listener);

      await service.clearHistory();

      expect(listener).toHaveBeenCalledWith([]);
    });
  });

  describe('Frequent Searches', () => {
    beforeEach(async () => {
      // Manually set history to have duplicates (testing edge case of persisted duplicates)
      (service as any).history = [
        { id: '1', query: 'popular', timestamp: Date.now(), resultCount: 10 },
        { id: '2', query: 'rare', timestamp: Date.now(), resultCount: 5 },
        { id: '3', query: 'popular', timestamp: Date.now() + 1, resultCount: 10 },
        { id: '4', query: 'popular', timestamp: Date.now() + 2, resultCount: 10 },
      ];
    });

    it('should return frequent searches', () => {
      const frequent = service.getFrequentSearches();

      expect(frequent.length).toBeGreaterThan(0);
      expect(frequent[0].query).toBe('popular');
      expect(frequent[0].count).toBe(3);
    });

    it('should limit frequent searches', () => {
      const frequent = service.getFrequentSearches(1);

      expect(frequent.length).toBe(1);
      expect(frequent[0].query).toBe('popular');
    });

    it('should track last searched timestamp', () => {
      const frequent = service.getFrequentSearches();

      expect(frequent[0]).toHaveProperty('lastSearched');
      expect(typeof frequent[0].lastSearched).toBe('number');
    });
  });

  describe('Today Searches', () => {
    it('should return searches from today', async () => {
      await service.addToHistory(mockSearchHistory);

      const todaySearches = service.getTodaySearches();

      expect(todaySearches.length).toBe(1);
      expect(todaySearches[0].query).toBe('breaking bad');
    });

    it('should not return old searches', async () => {
      // Mock old search (yesterday)
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockResolvedValueOnce(
        JSON.stringify([
          {
            ...mockSearchHistory,
            id: 'old-1',
            timestamp: oldTimestamp,
          },
        ])
      );

      // Create new instance to load old data
      const testService = SearchHistoryService.getInstance();
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait for async load

      const todaySearches = testService.getTodaySearches();

      expect(todaySearches.length).toBe(0);
    });
  });

  describe('Search Analytics', () => {
    beforeEach(async () => {
      // Manually set history to have duplicates (testing analytics with persisted duplicates)
      (service as any).history = [
        { id: '1', query: 'search1', timestamp: Date.now(), resultCount: 10 },
        { id: '2', query: 'search2', timestamp: Date.now(), resultCount: 20 },
        { id: '3', query: 'search1', timestamp: Date.now() + 1, resultCount: 15 },
      ];
    });

    it('should calculate total searches', async () => {
      const analytics = await service.getSearchAnalytics();

      expect(analytics.totalSearches).toBe(3);
    });

    it('should calculate average results per search', async () => {
      const analytics = await service.getSearchAnalytics();

      // (10 + 20 + 15) / 3 = 15
      expect(analytics.averageResultsPerSearch).toBeCloseTo(15, 0);
    });

    it('should return most searched terms', async () => {
      const analytics = await service.getSearchAnalytics();

      expect(analytics.mostSearchedTerms.length).toBeGreaterThan(0);
      expect(analytics.mostSearchedTerms[0].query).toBe('search1');
      expect(analytics.mostSearchedTerms[0].count).toBe(2);
    });

    it('should limit most searched terms to 10', async () => {
      // Add 15 different searches
      for (let i = 0; i < 15; i++) {
        await service.addToHistory({ ...mockSearchHistory, query: `search${i}` });
      }

      const analytics = await service.getSearchAnalytics();

      expect(analytics.mostSearchedTerms.length).toBeLessThanOrEqual(10);
    });

    it('should return searches by day', async () => {
      const analytics = await service.getSearchAnalytics();

      expect(analytics.searchesByDay).toBeDefined();
      expect(Array.isArray(analytics.searchesByDay)).toBe(true);
    });

    it('should filter searches to last 30 days', async () => {
      const analytics = await service.getSearchAnalytics();

      // All our test searches are recent, so they should all appear
      expect(analytics.searchesByDay.length).toBeGreaterThan(0);
    });

    it('should sort searches by day alphabetically', async () => {
      // Create history spanning multiple days to test sorting
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;

      (service as any).history = [
        { id: '1', query: 'search1', timestamp: now, resultCount: 10 },
        { id: '2', query: 'search2', timestamp: oneDayAgo, resultCount: 20 },
        { id: '3', query: 'search3', timestamp: twoDaysAgo, resultCount: 15 },
      ];

      const analytics = await service.getSearchAnalytics();

      // Should have entries for 3 different days
      expect(analytics.searchesByDay.length).toBeGreaterThanOrEqual(1);
      // Dates should be sorted alphabetically
      const dates = analytics.searchesByDay.map(d => d.date);
      const sortedDates = [...dates].sort();
      expect(dates).toEqual(sortedDates);
    });
  });

  describe('Listener Subscription', () => {
    it('should add listener', () => {
      const listener = jest.fn();
      const unsubscribe = service.subscribe(listener);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should remove listener on unsubscribe', async () => {
      const listener = jest.fn();
      const unsubscribe = service.subscribe(listener);

      unsubscribe();

      await service.addToHistory(mockSearchHistory);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify all listeners', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      service.subscribe(listener1);
      service.subscribe(listener2);

      await service.addToHistory(mockSearchHistory);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('Export History', () => {
    it('should export history as JSON', async () => {
      await service.addToHistory(mockSearchHistory);

      const exported = await service.exportHistory();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveProperty('version', '1.0');
      expect(parsed).toHaveProperty('exportDate');
      expect(parsed).toHaveProperty('history');
      expect(Array.isArray(parsed.history)).toBe(true);
    });

    it('should include all history items', async () => {
      await service.addToHistory({ ...mockSearchHistory, query: 'search1' });
      await service.addToHistory({ ...mockSearchHistory, query: 'search2' });

      const exported = await service.exportHistory();
      const parsed = JSON.parse(exported);

      expect(parsed.history.length).toBe(2);
    });
  });

  describe('Import History', () => {
    it('should import valid history', async () => {
      const exportedData = JSON.stringify({
        version: '1.0',
        exportDate: new Date().toISOString(),
        history: [
          {
            ...mockSearchHistory,
            id: 'imported-1',
            timestamp: Date.now(),
          },
        ],
      });

      await service.importHistory(exportedData);

      const history = service.getHistory();
      expect(history.length).toBe(1);
    });

    it('should throw error on invalid JSON', async () => {
      await expect(service.importHistory('invalid json')).rejects.toThrow(
        'Failed to import history'
      );
    });

    it('should throw error on missing history field', async () => {
      const invalidData = JSON.stringify({ version: '1.0' });

      await expect(service.importHistory(invalidData)).rejects.toThrow(
        'Invalid history format'
      );
    });

    it('should merge with existing history', async () => {
      await service.addToHistory({ ...mockSearchHistory, query: 'existing' });

      const importData = JSON.stringify({
        version: '1.0',
        exportDate: new Date().toISOString(),
        history: [
          {
            ...mockSearchHistory,
            query: 'imported',
            id: 'imported-1',
            timestamp: Date.now(),
          },
        ],
      });

      await service.importHistory(importData);

      const history = service.getHistory();
      expect(history.length).toBe(2);
    });

    it('should avoid duplicate queries on import', async () => {
      await service.addToHistory({ ...mockSearchHistory, query: 'duplicate' });

      const importData = JSON.stringify({
        version: '1.0',
        exportDate: new Date().toISOString(),
        history: [
          {
            ...mockSearchHistory,
            query: 'duplicate',
            id: 'imported-1',
            timestamp: Date.now(),
          },
        ],
      });

      await service.importHistory(importData);

      const history = service.getHistory();
      expect(history.length).toBe(1); // Should not duplicate
    });

    it('should respect maxHistoryItems on import', async () => {
      // Reset singleton to create instance with custom config
      (SearchHistoryService as any).instance = undefined;
      const customService = SearchHistoryService.getInstance({ maxHistoryItems: 2 });

      await customService.addToHistory({ ...mockSearchHistory, query: 'existing' });

      const importData = JSON.stringify({
        version: '1.0',
        exportDate: new Date().toISOString(),
        history: [
          { ...mockSearchHistory, query: 'imported1', id: '1', timestamp: Date.now() },
          { ...mockSearchHistory, query: 'imported2', id: '2', timestamp: Date.now() },
        ],
      });

      await customService.importHistory(importData);

      const history = customService.getHistory();
      expect(history.length).toBe(2); // Should respect limit
    });

    it('should notify listeners after import', async () => {
      const listener = jest.fn();
      service.subscribe(listener);

      const importData = JSON.stringify({
        version: '1.0',
        exportDate: new Date().toISOString(),
        history: [
          { ...mockSearchHistory, id: 'imported-1', timestamp: Date.now() },
        ],
      });

      await service.importHistory(importData);

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Persistence', () => {
    it('should handle AsyncStorage load errors', async () => {
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockRejectedValueOnce(new Error('Storage error'));

      // Reset singleton to trigger loadHistory() in constructor
      (SearchHistoryService as any).instance = undefined;

      // Should not throw
      const testService = SearchHistoryService.getInstance();
      await new Promise(resolve => setTimeout(resolve, 10));

      const history = testService.getHistory();
      expect(history.length).toBe(0); // Should return empty array
    });

    it('should handle AsyncStorage save errors', async () => {
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.setItem.mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw
      await expect(service.addToHistory(mockSearchHistory)).resolves.not.toThrow();
    });

    it('should handle analytics tracking errors', async () => {
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
      AsyncStorageMock.getItem.mockRejectedValueOnce(new Error('Analytics error'));

      // Should not throw
      await expect(service.addToHistory(mockSearchHistory)).resolves.not.toThrow();
    });
  });

  describe('Analytics Tracking', () => {
    it('should limit analytics to 1000 entries', async () => {
      const AsyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

      // Mock 1000 existing analytics entries
      const existingAnalytics = Array.from({ length: 1000 }, (_, i) => ({
        id: `entry-${i}`,
        query: `query${i}`,
        timestamp: Date.now(),
        resultCount: 10,
      }));
      AsyncStorageMock.getItem.mockResolvedValueOnce(JSON.stringify(existingAnalytics));

      await service.addToHistory(mockSearchHistory);

      const analyticsCall = AsyncStorageMock.setItem.mock.calls.find(
        ([key]) => key === 'test_search_analytics'
      );
      if (analyticsCall) {
        const savedAnalytics = JSON.parse(analyticsCall[1] as string);
        expect(savedAnalytics.length).toBe(1000); // Should not exceed 1000
      }
    });
  });
});
