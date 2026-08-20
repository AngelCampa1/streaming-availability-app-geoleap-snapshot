import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchHistory } from '../../types/streaming';
import { logger } from '../../utils/logger';

export interface SearchHistoryServiceConfig {
  maxHistoryItems: number;
  storageKey: string;
  enableAnalytics: boolean;
  analyticsStorageKey: string;
}

// Base storage key prefixes - userId is appended at runtime for user isolation
const BASE_STORAGE_KEY = 'streaming_search_history';
const BASE_ANALYTICS_KEY = 'streaming_search_analytics';

export class SearchHistoryService {
  private static instance: SearchHistoryService;
  private config: SearchHistoryServiceConfig;
  private history: SearchHistory[] = [];
  private listeners: Set<(_history: SearchHistory[]) => void> = new Set();

  // Current user ID for scoping storage - prevents BUG-010/BUG-012/BUG-013/BUG-014
  private currentUserId: string | null = null;

  private constructor(config: Partial<SearchHistoryServiceConfig> = {}) {
    this.config = {
      maxHistoryItems: 50,
      storageKey: BASE_STORAGE_KEY,
      enableAnalytics: true,
      analyticsStorageKey: BASE_ANALYTICS_KEY,
      ...config,
    };
    this.loadHistory();
  }

  public static getInstance(config?: Partial<SearchHistoryServiceConfig>): SearchHistoryService {
    if (!SearchHistoryService.instance) {
      SearchHistoryService.instance = new SearchHistoryService(config);
    }
    return SearchHistoryService.instance;
  }

  /**
   * Set the current user ID. Call this on login.
   * All storage operations will be scoped to this user.
   * BUG-010/BUG-012/BUG-013/BUG-014 FIX: Ensures search history and analytics are user-specific.
   */
  public setCurrentUser(userId: string): void {
    const changed = this.currentUserId !== userId;
    this.currentUserId = userId;
    if (changed) {
      // Reload history for the new user - prevents BUG-014 stale cache
      this.history = [];
      this.loadHistory();
    }
  }

  /**
   * Get current user ID.
   */
  public getCurrentUser(): string | null {
    return this.currentUserId;
  }

  /**
   * Clear all user-specific data. Call this on logout to prevent data leakage.
   * BUG-014 FIX: Clears stale history when user changes.
   */
  public async clearUserData(userId?: string): Promise<void> {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      return;
    }

    try {
      const keys = [
        this.getStorageKey(targetUserId),
        this.getAnalyticsKey(targetUserId),
      ];
      await AsyncStorage.multiRemove(keys);
      logger.debug('[SearchHistoryService] Cleared user data', { userId: targetUserId });
    } catch (error) {
      logger.error('[SearchHistoryService] Failed to clear user data', error);
    }

    if (userId === this.currentUserId || !userId) {
      this.history = [];
      this.currentUserId = null;
    }
  }

  /**
   * Get user-scoped storage key for search history.
   * BUG-010 FIX: Ensures history is isolated per user.
   */
  private getStorageKey(userId?: string): string {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      return this.config.storageKey;
    }
    return `${this.config.storageKey}_${targetUserId}`;
  }

  /**
   * Get user-scoped storage key for analytics.
   * BUG-012 FIX: Ensures analytics are isolated per user.
   */
  private getAnalyticsKey(userId?: string): string {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) {
      return this.config.analyticsStorageKey;
    }
    return `${this.config.analyticsStorageKey}_${targetUserId}`;
  }

  /**
   * Add search to history
   */
  public async addToHistory(searchHistory: Omit<SearchHistory, 'id' | 'timestamp'>): Promise<void> {
    const historyItem: SearchHistory = {
      ...searchHistory,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    // Remove existing entry with same query
    this.history = this.history.filter(item => item.query !== searchHistory.query);

    // Add new entry at the beginning
    this.history.unshift(historyItem);

    // Limit history size
    if (this.history.length > this.config.maxHistoryItems) {
      this.history = this.history.slice(0, this.config.maxHistoryItems);
    }

    await this.saveHistory();
    this.notifyListeners();

    // Track analytics if enabled
    if (this.config.enableAnalytics) {
      await this.trackSearchAnalytics(historyItem);
    }
  }

  /**
   * Get search history
   */
  public getHistory(limit?: number): SearchHistory[] {
    const sortedHistory = [...this.history].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sortedHistory.slice(0, limit) : sortedHistory;
  }

  /**
   * Remove item from history
   */
  public async removeFromHistory(id: string): Promise<void> {
    this.history = this.history.filter(item => item.id !== id);
    await this.saveHistory();
    this.notifyListeners();
  }

  /**
   * Clear all search history
   */
  public async clearHistory(): Promise<void> {
    this.history = [];
    await this.saveHistory();
    this.notifyListeners();
  }

  /**
   * Get frequently searched terms
   */
  public getFrequentSearches(limit: number = 10): Array<{ query: string; count: number; lastSearched: number }> {
    const queryCounts = new Map<string, { count: number; lastSearched: number }>();

    this.history.forEach(item => {
      const existing = queryCounts.get(item.query);
      if (existing) {
        existing.count++;
        existing.lastSearched = Math.max(existing.lastSearched, item.timestamp);
      } else {
        queryCounts.set(item.query, {
          count: 1,
          lastSearched: item.timestamp,
        });
      }
    });

    return Array.from(queryCounts.entries())
      .map(([query, data]) => ({ query, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get recent searches from today
   */
  public getTodaySearches(): SearchHistory[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.history.filter(item => item.timestamp >= today.getTime());
  }

  /**
   * Get search history analytics
   */
  public async getSearchAnalytics(): Promise<{
    totalSearches: number;
    averageResultsPerSearch: number;
    mostSearchedTerms: Array<{ query: string; count: number }>;
    searchesByDay: Array<{ date: string; count: number }>;
  }> {
    const totalSearches = this.history.length;
    const averageResults = this.history.reduce((sum, item) => sum + item.resultCount, 0) / totalSearches;

    // Most searched terms
    const queryCounts = new Map<string, number>();
    this.history.forEach(item => {
      queryCounts.set(item.query, (queryCounts.get(item.query) || 0) + 1);
    });

    const mostSearchedTerms = Array.from(queryCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Searches by day (last 30 days)
    const searchesByDay = new Map<string, number>();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    this.history
      .filter(item => item.timestamp >= thirtyDaysAgo)
      .forEach(item => {
        const date = new Date(item.timestamp).toISOString().split('T')[0];
        searchesByDay.set(date, (searchesByDay.get(date) || 0) + 1);
      });

    return {
      totalSearches,
      averageResultsPerSearch: Math.round(averageResults * 100) / 100,
      mostSearchedTerms,
      searchesByDay: Array.from(searchesByDay.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  /**
   * Subscribe to history changes
   */
  public subscribe(listener: (_history: SearchHistory[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Export search history
   */
  public async exportHistory(): Promise<string> {
    return JSON.stringify({
      version: '1.0',
      exportDate: new Date().toISOString(),
      history: this.history,
    }, null, 2);
  }

  /**
   * Import search history
   */
  public async importHistory(data: string): Promise<void> {
    try {
      const parsed = JSON.parse(data);

      if (!parsed.history || !Array.isArray(parsed.history)) {
        throw new Error('Invalid history format');
      }

      // Merge with existing history, avoiding duplicates
      const existingQueries = new Set(this.history.map(item => item.query));
      const newItems = parsed.history.filter((item: SearchHistory) => !existingQueries.has(item.query));

      this.history = [...newItems, ...this.history]
        .slice(0, this.config.maxHistoryItems)
        .sort((a, b) => b.timestamp - a.timestamp);

      await this.saveHistory();
      this.notifyListeners();
    } catch (error) {
      throw new Error(`Failed to import history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async loadHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.getStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        this.history = Array.isArray(parsed) ? parsed : parsed.history || [];
      }
    } catch (error) {
      logger.error('[SearchHistoryService] Failed to load search history', error);
      this.history = [];
    }
  }

  private async saveHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.getStorageKey(), JSON.stringify(this.history));
    } catch (error) {
      logger.error('[SearchHistoryService] Failed to save search history', error);
    }
  }

  private async trackSearchAnalytics(historyItem: SearchHistory): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.getAnalyticsKey());
      const analytics = stored ? JSON.parse(stored) : [];

      analytics.push({
        id: historyItem.id,
        query: historyItem.query,
        timestamp: historyItem.timestamp,
        resultCount: historyItem.resultCount,
        filters: historyItem.filters,
      });

      // Keep only last 1000 analytics entries
      const trimmedAnalytics = analytics.slice(-1000);

      await AsyncStorage.setItem(this.getAnalyticsKey(), JSON.stringify(trimmedAnalytics));
    } catch (error) {
      logger.error('[SearchHistoryService] Failed to track search analytics', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.history]));
  }
}

// Export singleton instance
export const searchHistoryService = SearchHistoryService.getInstance();
