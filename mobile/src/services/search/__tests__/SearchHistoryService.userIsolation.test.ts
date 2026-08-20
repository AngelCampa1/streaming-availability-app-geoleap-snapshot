/**
 * User isolation tests for SearchHistoryService
 * Verifies BUG-010, BUG-012, BUG-013, BUG-014 fixes:
 * - Storage keys are scoped per user (BUG-010, BUG-012)
 * - User A's data is not visible to User B (BUG-013)
 * - Cache is cleared/reloaded when user changes (BUG-014)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchHistoryService } from '../SearchHistoryService';

// Functional in-memory store to simulate AsyncStorage
const store: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys: string[]) => {
      keys.forEach(key => delete store[key]);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
      return Promise.resolve();
    }),
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

// Helper to get a fresh service instance with userId pre-set
function getFreshService(userId?: string): SearchHistoryService {
  (SearchHistoryService as any).instance = null;
  const svc = SearchHistoryService.getInstance();
  if (userId) {
    // setCurrentUser triggers async loadHistory - avoid waiting for it by
    // setting userId directly and having tests that need loaded history add items explicitly
    (svc as any).currentUserId = userId;
  }
  return svc;
}

describe('SearchHistoryService - User Isolation (BUG-010/012/013/014)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear in-memory store
    Object.keys(store).forEach(key => delete store[key]);
    // Reset singleton
    (SearchHistoryService as any).instance = null;
  });

  describe('BUG-010: User-specific storage keys', () => {
    it('uses user-specific key when userId is set', async () => {
      const service = getFreshService('user-A');
      await service.addToHistory({ query: 'Breaking Bad', resultCount: 5, filters: {} });

      const userAKey = 'streaming_search_history_user-A';
      const genericKey = 'streaming_search_history';

      expect(store[userAKey]).toBeDefined();
      expect(store[genericKey]).toBeUndefined();
    });

    it('uses generic key when no user is set', async () => {
      const service = getFreshService();
      await service.addToHistory({ query: 'Generic search', resultCount: 3, filters: {} });

      const genericKey = 'streaming_search_history';
      expect(store[genericKey]).toBeDefined();
    });
  });

  describe('BUG-012: Analytics keys are user-scoped', () => {
    it('uses user-specific analytics key', async () => {
      const service = getFreshService('user-A');
      await service.addToHistory({ query: 'some query', resultCount: 2, filters: {} });

      const userAAnalyticsKey = 'streaming_search_analytics_user-A';
      const genericAnalyticsKey = 'streaming_search_analytics';

      expect(store[userAAnalyticsKey]).toBeDefined();
      expect(store[genericAnalyticsKey]).toBeUndefined();
    });
  });

  describe('BUG-013: User A data is not visible to User B', () => {
    it('User A storage key is different from User B storage key', async () => {
      const serviceA = getFreshService('user-A');
      await serviceA.addToHistory({ query: 'Sensitive LGBTQ+ content', resultCount: 10, filters: {} });

      // Verify storage is under user-A specific key
      const userAKey = 'streaming_search_history_user-A';
      const userBKey = 'streaming_search_history_user-B';
      expect(store[userAKey]).toBeDefined();
      expect(store[userBKey]).toBeUndefined();

      // User B service finds nothing under user-B key
      const serviceB = getFreshService('user-B');
      // No items have been written to user-B key, so in-memory history is empty
      expect(serviceB.getHistory()).toHaveLength(0);
    });

    it('User B searches do not pollute User A storage', async () => {
      const serviceA = getFreshService('user-A');
      await serviceA.addToHistory({ query: 'User A secret', resultCount: 1, filters: {} });

      const serviceB = getFreshService('user-B');
      await serviceB.addToHistory({ query: 'User B search', resultCount: 2, filters: {} });

      // User A's storage is untouched
      const parsedA = JSON.parse(store['streaming_search_history_user-A']);
      expect(parsedA.some((h: { query: string }) => h.query === 'User B search')).toBe(false);

      // User B's storage does not contain User A's data
      const parsedB = JSON.parse(store['streaming_search_history_user-B']);
      expect(parsedB.some((h: { query: string }) => h.query === 'User A secret')).toBe(false);
    });
  });

  describe('BUG-014: Stale history cleared on user change', () => {
    it('resets in-memory history when setCurrentUser is called with new user', () => {
      const service = getFreshService('user-A');
      // Manually inject some history to simulate previously loaded history
      (service as any).history = [
        { id: '1', query: 'User A old search', timestamp: Date.now(), resultCount: 5, filters: {} },
      ];
      expect(service.getHistory()).toHaveLength(1);

      // Switch to User B
      service.setCurrentUser('user-B');
      // In-memory history should be reset immediately
      expect(service.getHistory()).toHaveLength(0);
    });

    it('does not reset history when same user is set again', () => {
      const service = getFreshService('user-A');
      (service as any).history = [
        { id: '1', query: 'Existing search', timestamp: Date.now(), resultCount: 5, filters: {} },
      ];

      // Setting same user should not clear history
      service.setCurrentUser('user-A');
      expect(service.getHistory()).toHaveLength(1);
    });
  });

  describe('clearUserData', () => {
    it('removes user-specific storage entries', async () => {
      const service = getFreshService('user-A');
      await service.addToHistory({ query: 'test search', resultCount: 1, filters: {} });

      const userKey = 'streaming_search_history_user-A';
      expect(store[userKey]).toBeDefined();

      await service.clearUserData('user-A');
      expect(store[userKey]).toBeUndefined();
    });

    it('resets currentUserId after clearing own data', async () => {
      const service = getFreshService('user-A');
      await service.clearUserData();
      expect(service.getCurrentUser()).toBeNull();
    });

    it('clears in-memory history', async () => {
      const service = getFreshService('user-A');
      (service as any).history = [
        { id: '1', query: 'some query', timestamp: Date.now(), resultCount: 1, filters: {} },
      ];

      await service.clearUserData();
      expect(service.getHistory()).toHaveLength(0);
    });

    it('does nothing when no userId is set or provided', async () => {
      const service = getFreshService();
      const multiRemoveSpy = AsyncStorage.multiRemove as jest.Mock;
      await service.clearUserData();
      expect(multiRemoveSpy).not.toHaveBeenCalled();
    });
  });
});
