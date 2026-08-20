/**
 * Local Caching Service for GeoLeap Mobile App
 * Provides intelligent caching with AsyncStorage, TTL support, and memory optimization
 * Handles cache invalidation, compression, and storage management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger as loggerImport } from '../../utils/logger';

// Safe logger wrapper that handles undefined cases in test environments
const logger = {
  debug: (...args: Parameters<typeof console.log>) => loggerImport?.debug?.(...args),
  info: (...args: Parameters<typeof console.log>) => loggerImport?.info?.(...args),
  warn: (...args: Parameters<typeof console.warn>) => loggerImport?.warn?.(...args),
  error: (...args: Parameters<typeof console.error>) => {
    if (loggerImport?.error) {
      loggerImport.error(...args);
    } else {
      console.error(...args);
    }
  },
};

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated size in bytes
  tags?: string[];
  version?: number;
  checksum?: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  tags?: string[];
  version?: number;
  priority?: 'low' | 'normal' | 'high';
  compress?: boolean;
  encrypt?: boolean;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  oldestEntry: number;
  newestEntry: number;
  memoryUsage: number;
  storageUsage: number;
}

export interface CachePolicy {
  maxEntries: number;
  maxSize: number; // Maximum total size in bytes
  maxAge: number; // Maximum age in milliseconds
  evictionPolicy: 'lru' | 'lfu' | 'ttl' | 'size';
  compressionThreshold: number; // Compress entries larger than this
}

class CacheService {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private cachePolicy: CachePolicy;
  private stats: CacheStats;
  private compressionEnabled = false;
  private isInitialized = false;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private readonly STORAGE_PREFIX = 'cache_';
  private readonly STATS_KEY = 'cache_stats';
  private readonly METADATA_KEY = 'cache_metadata';

  constructor(policy?: Partial<CachePolicy>) {
    this.cachePolicy = {
      maxEntries: 1000,
      maxSize: 50 * 1024 * 1024, // 50MB
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      evictionPolicy: 'lru',
      compressionThreshold: 1024, // 1KB
      ...policy,
    };

    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
      oldestEntry: 0,
      newestEntry: 0,
      memoryUsage: 0,
      storageUsage: 0,
    };

    this.initialize();
  }

  /**
   * Initialize cache service
   */
  private async initialize(): Promise<void> {
    try {
      // Check if compression is available
      try {
        // @ts-expect-error - Optional pako package
        const _deflate = (await import('pako')).deflate;
        // @ts-expect-error - Optional pako package
        const _inflate = (await import('pako')).inflate;
        this.compressionEnabled = true;
        logger.debug('Cache compression enabled');
      } catch (error) {
        logger.debug('Cache compression not available:', error?.message);
      }

      // Load cache statistics
      await this.loadStats();

      // Load metadata
      await this.loadMetadata();

      // Schedule cleanup
      this.scheduleCleanup();

      this.isInitialized = true;
      logger.info('CacheService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize CacheService:', error);
    }
  }

  /**
   * Load cache statistics
   */
  private async loadStats(): Promise<void> {
    try {
      const statsData = await AsyncStorage.getItem(this.STATS_KEY);
      if (statsData) {
        this.stats = { ...this.stats, ...JSON.parse(statsData) };
      }
    } catch (error) {
      logger.error('Failed to load cache stats:', error);
    }
  }

  /**
   * Load cache metadata
   */
  private async loadMetadata(): Promise<void> {
    try {
      const metadataData = await AsyncStorage.getItem(this.METADATA_KEY);
      if (metadataData) {
        const metadata = JSON.parse(metadataData);

        // Load hot entries into memory cache
        if (metadata.hotKeys) {
          for (const key of metadata.hotKeys) {
            const entry = await this.getFromStorage(key);
            if (entry && !this.isExpired(entry)) {
              this.memoryCache.set(key, entry);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to load cache metadata:', error);
    }
  }

  /**
   * Save cache statistics
   */
  private async saveStats(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STATS_KEY, JSON.stringify(this.stats));
    } catch (error) {
      logger.error('Failed to save cache stats:', error);
    }
  }

  /**
   * Save cache metadata
   */
  private async saveMetadata(): Promise<void> {
    try {
      // Determine hot keys (frequently accessed)
      const hotKeys = Array.from(this.memoryCache.entries())
        .filter(([_, entry]) => entry.accessCount > 5)
        .map(([key, _]) => key)
        .slice(0, 100); // Keep top 100 hot entries

      const metadata = {
        hotKeys,
        lastUpdate: Date.now(),
      };

      await AsyncStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      logger.error('Failed to save cache metadata:', error);
    }
  }

  /**
   * Schedule periodic cleanup
   */
  private scheduleCleanup(): void {
    // Clear any existing interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    // Cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  /**
   * Destroy service and cleanup resources
   * Call this to prevent memory leaks in tests
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.memoryCache.clear();
    this.isInitialized = false;
  }

  /**
   * Get data from cache
   */
  async get<T = any>(key: string, options: { forceExpired?: boolean } = {}): Promise<T | null> {
    if (!this.isInitialized) {
      await this.waitForInitialization();
    }

    try {
      let entry = this.memoryCache.get(key);

      if (!entry) {
        entry = await this.getFromStorage(key);
        if (entry) {
          this.memoryCache.set(key, entry);
        }
      }

      if (!entry) {
        this.updateStats('miss');
        return null;
      }

      // Check expiration
      if (!options.forceExpired && this.isExpired(entry)) {
        this.remove(key);
        this.updateStats('miss');
        return null;
      }

      // Update access info
      entry.accessCount++;
      entry.lastAccessed = Date.now();

      this.updateStats('hit');
      return entry.data as T;

    } catch (error) {
      logger.error('Failed to get from cache:', { key, error: error?.message });
      this.updateStats('miss');
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set<T = any>(
    key: string,
    data: T,
    options: CacheOptions = {},
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.waitForInitialization();
    }

    try {
      const {
        ttl = this.cachePolicy.maxAge,
        tags = [],
        version,
        priority: _priority = 'normal',
        compress = false,
        encrypt: _encrypt = false,
      } = options;

      const now = Date.now();
      const serializedData = JSON.stringify(data);
      let processedData = serializedData;
      let size = serializedData.length;

      // Apply compression if enabled and data is large enough
      if (compress && this.compressionEnabled && size > this.cachePolicy.compressionThreshold) {
        try {
          // @ts-expect-error - Optional pako package
          const { deflate } = await import('pako');
          const compressed = deflate(serializedData);
          // Convert Uint8Array to base64 string
          let binary = '';
          for (let i = 0; i < compressed.length; i++) {
            binary += String.fromCharCode(compressed[i]);
          }
          processedData = binary; // Store as-is, compression handled differently
          size = processedData.length;
        } catch (error) {
          logger.warn('Cache compression failed:', error);
        }
      }

      // Check if we need to evict entries
      await this.ensureCapacity(size);

      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        ttl,
        expiresAt: now + ttl,
        accessCount: 1,
        lastAccessed: now,
        size,
        tags,
        version,
      };

      // Store in memory cache
      this.memoryCache.set(key, entry);

      // Store in persistent storage
      await this.setToStorage(key, entry);

      // Update stats
      this.updateStats('set', size);

      logger.debug('Cache entry set:', { key, size, ttl, tags });

    } catch (error) {
      logger.error('Failed to set cache entry:', { key, error: error?.message });
    }
  }

  /**
   * Get entry from storage
   */
  private async getFromStorage(key: string): Promise<CacheEntry | null> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_PREFIX + key);
      if (!data) {
        return null;
      }

      return JSON.parse(data) as CacheEntry;
    } catch (error) {
      logger.error('Failed to get from storage:', { key, error: error?.message });
      return null;
    }
  }

  /**
   * Set entry to storage
   */
  private async setToStorage(key: string, entry: CacheEntry): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(entry));
    } catch (error) {
      logger.error('Failed to set to storage:', { key, error: error?.message });

      // If storage is full, try to evict old entries
      if (error?.message.includes('disk full') || error?.message.includes('quota')) {
        await this.emergencyCleanup();
        // Retry once
        try {
          await AsyncStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(entry));
        } catch (retryError) {
          logger.error('Retry failed for cache storage:', retryError);
        }
      }
    }
  }

  /**
   * Remove entry from cache
   */
  async remove(key: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.waitForInitialization();
    }

    try {
      const memoryRemoved = this.memoryCache.delete(key);
      const storageRemoved = await AsyncStorage.removeItem(this.STORAGE_PREFIX + key);

      if (memoryRemoved || storageRemoved) {
        this.updateStats('remove');
        logger.debug('Cache entry removed:', { key });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to remove cache entry:', { key, error: error?.message });
      return false;
    }
  }

  /**
   * Clear only memory cache (fast, for tests)
   */
  clearMemoryCache(): void {
    this.memoryCache.clear();
    logger.debug('Memory cache cleared');
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    if (!this.isInitialized) {
      await this.waitForInitialization();
    }

    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear storage
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.STORAGE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);

      // Reset stats
      this.stats = {
        totalEntries: 0,
        totalSize: 0,
        hitRate: 0,
        missRate: 0,
        evictionCount: 0,
        oldestEntry: 0,
        newestEntry: 0,
        memoryUsage: 0,
        storageUsage: 0,
      };

      await this.saveStats();
      await this.saveMetadata();

      logger.info('Cache cleared completely');
    } catch (error) {
      logger.error('Failed to clear cache:', error);
    }
  }

  /**
   * Clear entries by tags
   */
  async clearByTag(tag: string): Promise<void> {
    if (!this.isInitialized) {
      await this.waitForInitialization();
    }

    try {
      const keysToRemove: string[] = [];

      // Check memory cache
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.tags?.includes(tag)) {
          keysToRemove.push(key);
        }
      }

      // Check storage
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.STORAGE_PREFIX));

      for (const storageKey of cacheKeys) {
        try {
          const data = await AsyncStorage.getItem(storageKey);
          if (data) {
            const entry = JSON.parse(data) as CacheEntry;
            if (entry.tags?.includes(tag)) {
              const key = storageKey.replace(this.STORAGE_PREFIX, '');
              keysToRemove.push(key);
            }
          }
        } catch (error) {
          logger.warn('Failed to check cache entry for tag:', storageKey);
        }
      }

      // Remove entries
      for (const key of keysToRemove) {
        await this.remove(key);
      }

      logger.info(`Cleared ${keysToRemove.length} cache entries with tag: ${tag}`);
    } catch (error) {
      logger.error('Failed to clear cache by tag:', { tag, error: error?.message });
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Ensure cache has capacity for new entry
   */
  private async ensureCapacity(requiredSize: number): Promise<void> {
    // Check total size
    const currentSize = Array.from(this.memoryCache.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    if (currentSize + requiredSize > this.cachePolicy.maxSize) {
      await this.evictEntries(requiredSize);
    }

    // Check entry count
    if (this.memoryCache.size >= this.cachePolicy.maxEntries) {
      await this.evictEntries(0, 'count');
    }
  }

  /**
   * Evict entries based on policy
   */
  private async evictEntries(requiredSize: number, reason: 'size' | 'count' = 'size'): Promise<void> {
    const entries = Array.from(this.memoryCache.entries());
    let evictedCount = 0;
    let freedSize = 0;

    // Sort entries based on eviction policy
    switch (this.cachePolicy.evictionPolicy) {
      case 'lru':
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        break;
      case 'lfu':
        entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
        break;
      case 'ttl':
        entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
        break;
      case 'size':
        entries.sort((a, b) => b[1].size - a[1].size);
        break;
    }

    // Evict entries
    for (const [key, entry] of entries) {
      const shouldEvict = reason === 'size'
        ? freedSize < requiredSize
        : evictedCount < entries.length / 4; // Evict 25% if count is the issue

      if (!shouldEvict) {break;}

      await this.remove(key);
      freedSize += entry.size;
      evictedCount++;
      this.stats.evictionCount++;
    }

    logger.debug(`Evicted ${evictedCount} entries, freed ${freedSize} bytes`);
  }

  /**
   * Emergency cleanup when storage is full
   */
  private async emergencyCleanup(): Promise<void> {
    logger.warn('Performing emergency cache cleanup');

    // Clear expired entries
    await this.cleanup();

    // Clear half of the oldest entries
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    const toRemove = entries.slice(0, Math.floor(entries.length / 2));

    for (const [key, _] of toRemove) {
      await this.remove(key);
    }

    logger.info(`Emergency cleanup removed ${toRemove.length} entries`);
  }

  /**
   * Cleanup expired entries
   */
  private async cleanup(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      const keysToRemove: string[] = [];

      // Check memory cache
      for (const [key, entry] of this.memoryCache.entries()) {
        if (this.isExpired(entry)) {
          keysToRemove.push(key);
        }
      }

      // Check storage
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.STORAGE_PREFIX));

      for (const storageKey of cacheKeys) {
        try {
          const data = await AsyncStorage.getItem(storageKey);
          if (data) {
            const entry = JSON.parse(data) as CacheEntry;
            if (this.isExpired(entry)) {
              const key = storageKey.replace(this.STORAGE_PREFIX, '');
              keysToRemove.push(key);
            }
          }
        } catch (error) {
          logger.warn('Failed to check cache entry during cleanup:', storageKey);
        }
      }

      // Remove expired entries
      for (const key of keysToRemove) {
        await this.remove(key);
      }

      if (keysToRemove.length > 0) {
        logger.info(`Cleaned up ${keysToRemove.length} expired cache entries`);
      }

      // Update metadata
      await this.saveMetadata();
      await this.saveStats();

    } catch (error) {
      logger.error('Cache cleanup failed:', error);
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(operation: 'hit' | 'miss' | 'set' | 'remove', size: number = 0): void {
    switch (operation) {
      case 'hit':
        this.stats.hitRate = (this.stats.hitRate * 0.9) + 0.1; // Moving average
        this.stats.missRate = 1 - this.stats.hitRate;
        break;
      case 'miss':
        this.stats.missRate = (this.stats.missRate * 0.9) + 0.1;
        this.stats.hitRate = 1 - this.stats.missRate;
        break;
      case 'set':
        this.stats.totalEntries = this.memoryCache.size;
        this.stats.totalSize += size;
        break;
      case 'remove':
        this.stats.totalEntries = this.memoryCache.size;
        break;
    }

    // Update memory usage
    this.stats.memoryUsage = Array.from(this.memoryCache.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    // Update storage usage periodically
    if (Math.random() < 0.1) { // 10% chance
      this.updateStorageUsage();
    }

    // Save stats periodically
    if (Math.random() < 0.05) { // 5% chance
      this.saveStats();
    }
  }

  /**
   * Update storage usage statistics
   */
  private async updateStorageUsage(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.STORAGE_PREFIX));

      let totalSize = 0;
      for (const key of cacheKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            totalSize += data.length;
          }
        } catch (error) {
          logger.warn('Failed to calculate storage size for key:', key);
        }
      }

      this.stats.storageUsage = totalSize;
    } catch (error) {
      logger.error('Failed to update storage usage:', error);
    }
  }

  /**
   * Wait for initialization
   */
  private async waitForInitialization(): Promise<void> {
    let attempts = 0;
    while (!this.isInitialized && attempts < 50) {
      await new Promise<void>(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!this.isInitialized) {
      throw new Error('CacheService failed to initialize');
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache keys
   */
  async getKeys(): Promise<string[]> {
    if (!this.isInitialized) {
      await this.waitForInitialization();
    }

    const memoryKeys = Array.from(this.memoryCache.keys());

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const storageKeys = allKeys
        .filter(key => key.startsWith(this.STORAGE_PREFIX))
        .map(key => key.replace(this.STORAGE_PREFIX, ''));

      // Combine and deduplicate
      return Array.from(new Set([...memoryKeys, ...storageKeys]));
    } catch (error) {
      logger.error('Failed to get cache keys:', error);
      return memoryKeys;
    }
  }

  /**
   * Get entry information
   */
  async getEntryInfo(key: string): Promise<CacheEntry | null> {
    if (!this.isInitialized) {
      await this.waitForInitialization();
    }

    let entry = this.memoryCache.get(key);
    if (!entry) {
      entry = await this.getFromStorage(key);
    }

    return entry || null;
  }

  /**
   * Optimize cache
   */
  async optimize(): Promise<void> {
    if (!this.isInitialized) {
      await this.waitForInitialization();
    }

    logger.info('Starting cache optimization');

    // Cleanup expired entries
    await this.cleanup();

    // Evict old entries if needed
    await this.ensureCapacity(0);

    // Update metadata
    await this.saveMetadata();
    await this.saveStats();

    logger.info('Cache optimization completed');
  }
}

// Export singleton instance
const cacheService = new CacheService();
export default cacheService;
export { CacheService };
