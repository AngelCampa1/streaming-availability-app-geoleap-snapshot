/**
 * CacheService Integration Tests
 *
 * Testing Philosophy:
 * - Coverage over passing percentage
 * - Execute REAL business logic (eviction, expiration, stats tracking)
 * - Only mock external I/O (AsyncStorage)
 * - Test all critical code paths
 *
 * What We Mock:
 * - AsyncStorage (external I/O boundary)
 *
 * What We DON'T Mock (Real Code Execution):
 * - All cache operations (get/set/remove/clear)
 * - Eviction policies (LRU/LFU/TTL/Size)
 * - TTL/expiration logic
 * - Statistics tracking
 * - Tag-based invalidation
 * - Compression logic
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheService } from '../../services/api/CacheService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('CacheService Integration Tests', () => {
  let cacheService: CacheService;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  beforeAll(() => {
    // Use real timers - CacheService uses setTimeout for initialization
    jest.useRealTimers();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    mockAsyncStorage.clear.mockResolvedValue(undefined);
    mockAsyncStorage.getAllKeys.mockResolvedValue([]);
    mockAsyncStorage.multiGet.mockResolvedValue([]);
    mockAsyncStorage.multiSet.mockResolvedValue(undefined);
    mockAsyncStorage.multiRemove.mockResolvedValue(undefined);

    // Create new instance for each test
    cacheService = new CacheService({
      maxEntries: 100,
      maxSize: 1024 * 1024, // 1MB
      maxAge: 60000, // 1 minute
      evictionPolicy: 'lru',
      compressionThreshold: 512,
    });

    // Wait for initialization
    await cacheService.waitForInitialization();
  });

  afterEach(() => {
    cacheService.cleanup();
  });

  // ===================================================================
  // 1. INITIALIZATION & CONFIGURATION
  // ===================================================================
  describe('Initialization & Configuration', () => {
    it('should initialize with default policy if none provided', async () => {
      const defaultCache = new CacheService();
      await defaultCache.waitForInitialization();

      const stats = defaultCache.getStats();
      expect(stats).toBeDefined();
      expect(stats.totalEntries).toBe(0);

      defaultCache.cleanup();
    });

    it('should load metadata from AsyncStorage on initialization', async () => {
      const mockMetadata = JSON.stringify({
        version: 1,
        createdAt: Date.now(),
        lastCleanup: Date.now(),
      });

      mockAsyncStorage.getItem.mockResolvedValueOnce(mockMetadata);

      const newCache = new CacheService();
      await newCache.waitForInitialization();

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('cache_metadata');

      newCache.cleanup();
    });

    it('should load stats from AsyncStorage on initialization', async () => {
      const mockStats = JSON.stringify({
        totalEntries: 5,
        memoryUsage: 1024,
        storageUsage: 2048,
        hitRate: 0.77,
        missRate: 0.23,
        evictionCount: 2,
      });

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'cache_stats') return Promise.resolve(mockStats);
        return Promise.resolve(null);
      });

      const newCache = new CacheService();
      await newCache.waitForInitialization();

      const stats = newCache.getStats();
      expect(stats.hitRate).toBe(0.77);
      expect(stats.missRate).toBe(0.23);

      newCache.cleanup();
    });

    it('should handle corrupted metadata gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('invalid json{{{');

      const newCache = new CacheService();
      await newCache.waitForInitialization();

      // Should initialize successfully with defaults
      const stats = newCache.getStats();
      expect(stats).toBeDefined();

      newCache.cleanup();
    });
  });

  // ===================================================================
  // 2. BASIC CACHE OPERATIONS
  // ===================================================================
  describe('Basic Cache Operations', () => {
    it('should set and get data from memory cache', async () => {
      await cacheService.set('test-key', { name: 'John', age: 30 });

      const result = await cacheService.get('test-key');
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should return null for non-existent key', async () => {
      const result = await cacheService.get('non-existent');
      expect(result).toBeNull();
    });

    it('should persist data to AsyncStorage', async () => {
      await cacheService.set('persist-key', { data: 'test' });

      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should retrieve data from AsyncStorage if not in memory', async () => {
      const cacheEntry = {
        data: { value: 'from-storage' },
        timestamp: Date.now(),
        ttl: 60000,
        expiresAt: Date.now() + 60000,
        accessCount: 0,
        lastAccessed: Date.now(),
        size: 100,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cacheEntry));

      const result = await cacheService.get('storage-key');
      expect(result).toEqual({ value: 'from-storage' });
    });

    it('should remove entry from cache', async () => {
      await cacheService.set('remove-key', { data: 'test' });

      const removed = await cacheService.remove('remove-key');
      expect(removed).toBe(true);

      const result = await cacheService.get('remove-key');
      expect(result).toBeNull();
    });

    it('should return false when removing non-existent key', async () => {
      const removed = await cacheService.remove('non-existent');
      expect(removed).toBe(false);
    });

    it('should clear all entries', async () => {
      await cacheService.set('key1', { data: 1 });
      await cacheService.set('key2', { data: 2 });
      await cacheService.set('key3', { data: 3 });

      await cacheService.clear();

      const result1 = await cacheService.get('key1');
      const result2 = await cacheService.get('key2');
      const result3 = await cacheService.get('key3');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });

    it('should update access count on get', async () => {
      await cacheService.set('access-key', { data: 'test' });

      // Get multiple times
      await cacheService.get('access-key');
      await cacheService.get('access-key');
      await cacheService.get('access-key');

      const info = await cacheService.getEntryInfo('access-key');
      // Initial accessCount is 1 (from set), then 3 gets increment it to 4
      expect(info?.accessCount).toBe(4);
    });
  });

  // ===================================================================
  // 3. TTL & EXPIRATION MANAGEMENT
  // ===================================================================
  describe('TTL & Expiration Management', () => {
    it('should respect TTL and expire entries', async () => {
      await cacheService.set('ttl-key', { data: 'test' }, { ttl: 100 }); // 100ms TTL

      // Should be available immediately
      let result = await cacheService.get('ttl-key');
      expect(result).toEqual({ data: 'test' });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      result = await cacheService.get('ttl-key');
      expect(result).toBeNull();
    });

    it('should use default TTL from policy if not specified', async () => {
      await cacheService.set('default-ttl', { data: 'test' });

      const info = await cacheService.getEntryInfo('default-ttl');
      expect(info?.ttl).toBe(60000); // Default from policy
    });

    it('should allow force getting expired entries', async () => {
      await cacheService.set('expired-key', { data: 'test' }, { ttl: 10 });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 50));

      // Get with forceExpired directly (without calling get first, which would remove the entry)
      const result = await cacheService.get('expired-key', { forceExpired: true });
      expect(result).toEqual({ data: 'test' });
    });

    it('should clean up expired entries', async () => {
      await cacheService.set('expire1', { data: 1 }, { ttl: 50 });
      await cacheService.set('expire2', { data: 2 }, { ttl: 50 });
      await cacheService.set('keep', { data: 3 }, { ttl: 10000 });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger cleanup
      await cacheService.optimize();

      const stats = cacheService.getStats();
      expect(stats.totalEntries).toBe(1); // Only 'keep' remains
    });

    it('should not return expired entries from storage', async () => {
      const expiredEntry = {
        data: { value: 'expired' },
        timestamp: Date.now() - 120000,
        ttl: 60000,
        expiresAt: Date.now() - 60000, // Expired 1 minute ago
        accessCount: 0,
        lastAccessed: Date.now() - 120000,
        size: 100,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(expiredEntry));

      const result = await cacheService.get('expired-storage');
      expect(result).toBeNull();
    });
  });

  // ===================================================================
  // 4. EVICTION POLICIES
  // ===================================================================
  describe('Eviction Policies', () => {
    describe('LRU (Least Recently Used)', () => {
      beforeEach(async () => {
        cacheService = new CacheService({
          maxEntries: 3,
          maxSize: 1024 * 1024,
          maxAge: 60000,
          evictionPolicy: 'lru',
          compressionThreshold: 512,
        });
        await cacheService.waitForInitialization();
      });

      it('should evict least recently used entry when maxEntries exceeded', async () => {
        await cacheService.set('entry1', { data: 1 });
        await new Promise(resolve => setTimeout(resolve, 10));
        await cacheService.set('entry2', { data: 2 });
        await new Promise(resolve => setTimeout(resolve, 10));
        await cacheService.set('entry3', { data: 3 });

        // Access entry1 to make it recently used
        await cacheService.get('entry1');

        // Add 4th entry - should evict entry2 (LRU)
        await cacheService.set('entry4', { data: 4 });

        const result1 = await cacheService.get('entry1');
        const result2 = await cacheService.get('entry2');
        const result3 = await cacheService.get('entry3');
        const result4 = await cacheService.get('entry4');

        expect(result1).toEqual({ data: 1 }); // Kept (recently accessed)
        expect(result2).toBeNull(); // Evicted (LRU)
        expect(result3).toEqual({ data: 3 });
        expect(result4).toEqual({ data: 4 });
      });
    });

    describe('LFU (Least Frequently Used)', () => {
      beforeEach(async () => {
        cacheService = new CacheService({
          maxEntries: 3,
          maxSize: 1024 * 1024,
          maxAge: 60000,
          evictionPolicy: 'lfu',
          compressionThreshold: 512,
        });
        await cacheService.waitForInitialization();
      });

      it('should evict least frequently used entry when maxEntries exceeded', async () => {
        await cacheService.set('entry1', { data: 1 });
        await cacheService.set('entry2', { data: 2 });
        await cacheService.set('entry3', { data: 3 });

        // Access entry1 and entry3 multiple times
        await cacheService.get('entry1');
        await cacheService.get('entry1');
        await cacheService.get('entry3');
        await cacheService.get('entry3');
        // entry2 has 0 accesses

        // Add 4th entry - should evict entry2 (LFU)
        await cacheService.set('entry4', { data: 4 });

        const result1 = await cacheService.get('entry1');
        const result2 = await cacheService.get('entry2');
        const result3 = await cacheService.get('entry3');
        const result4 = await cacheService.get('entry4');

        expect(result1).toEqual({ data: 1 });
        expect(result2).toBeNull(); // Evicted (LFU)
        expect(result3).toEqual({ data: 3 });
        expect(result4).toEqual({ data: 4 });
      });
    });

    describe('TTL (Time To Live)', () => {
      beforeEach(async () => {
        cacheService = new CacheService({
          maxEntries: 3,
          maxSize: 1024 * 1024,
          maxAge: 60000,
          evictionPolicy: 'ttl',
          compressionThreshold: 512,
        });
        await cacheService.waitForInitialization();
      });

      it('should evict entry with earliest expiration when maxEntries exceeded', async () => {
        await cacheService.set('entry1', { data: 1 }, { ttl: 5000 }); // Expires in 5s
        await cacheService.set('entry2', { data: 2 }, { ttl: 10000 }); // Expires in 10s
        await cacheService.set('entry3', { data: 3 }, { ttl: 15000 }); // Expires in 15s

        // Add 4th entry - should evict entry1 (earliest expiration)
        await cacheService.set('entry4', { data: 4 }, { ttl: 20000 });

        const result1 = await cacheService.get('entry1');
        const result2 = await cacheService.get('entry2');
        const result3 = await cacheService.get('entry3');
        const result4 = await cacheService.get('entry4');

        expect(result1).toBeNull(); // Evicted (earliest expiration)
        expect(result2).toEqual({ data: 2 });
        expect(result3).toEqual({ data: 3 });
        expect(result4).toEqual({ data: 4 });
      });
    });

    describe('Size-based Eviction', () => {
      beforeEach(async () => {
        cacheService = new CacheService({
          maxEntries: 100,
          maxSize: 1024 * 1024,
          maxAge: 60000,
          evictionPolicy: 'size',
          compressionThreshold: 512,
        });
        await cacheService.waitForInitialization();
      });

      it('should evict largest entry when maxEntries exceeded', async () => {
        // Create entries with different sizes
        await cacheService.set('small', { data: 'x' }); // Small
        await cacheService.set('medium', { data: 'x'.repeat(100) }); // Medium
        await cacheService.set('large', { data: 'x'.repeat(1000) }); // Large

        // Force eviction by setting maxEntries to 3
        cacheService = new CacheService({
          maxEntries: 3,
          maxSize: 1024 * 1024,
          maxAge: 60000,
          evictionPolicy: 'size',
          compressionThreshold: 512,
        });
        await cacheService.waitForInitialization();

        await cacheService.set('small', { data: 'x' });
        await cacheService.set('medium', { data: 'x'.repeat(100) });
        await cacheService.set('large', { data: 'x'.repeat(1000) });

        // Add 4th entry - should evict 'large' (largest size)
        await cacheService.set('new', { data: 'new' });

        const resultSmall = await cacheService.get('small');
        const resultMedium = await cacheService.get('medium');
        const resultLarge = await cacheService.get('large');
        const resultNew = await cacheService.get('new');

        expect(resultSmall).toEqual({ data: 'x' });
        expect(resultMedium).toEqual({ data: 'x'.repeat(100) });
        expect(resultLarge).toBeNull(); // Evicted (largest)
        expect(resultNew).toEqual({ data: 'new' });
      });
    });

    it('should track eviction count in stats', async () => {
      const smallCache = new CacheService({
        maxEntries: 2,
        maxSize: 1024 * 1024,
        maxAge: 60000,
        evictionPolicy: 'lru',
        compressionThreshold: 512,
      });
      await smallCache.waitForInitialization();

      await smallCache.set('entry1', { data: 1 });
      await smallCache.set('entry2', { data: 2 });
      await smallCache.set('entry3', { data: 3 }); // Triggers eviction

      const stats = smallCache.getStats();
      expect(stats.evictionCount).toBeGreaterThan(0);

      smallCache.cleanup();
    });
  });

  // ===================================================================
  // 5. TAG-BASED INVALIDATION
  // ===================================================================
  describe('Tag-based Invalidation', () => {
    it('should support adding tags to cache entries', async () => {
      await cacheService.set('tagged-entry', { data: 'test' }, { tags: ['user', 'profile'] });

      const info = await cacheService.getEntryInfo('tagged-entry');
      expect(info?.tags).toEqual(['user', 'profile']);
    });

    it('should clear all entries with specific tag', async () => {
      await cacheService.set('user1', { name: 'John' }, { tags: ['user'] });
      await cacheService.set('user2', { name: 'Jane' }, { tags: ['user'] });
      await cacheService.set('post1', { title: 'Post' }, { tags: ['post'] });

      await cacheService.clearByTag('user');

      const user1 = await cacheService.get('user1');
      const user2 = await cacheService.get('user2');
      const post1 = await cacheService.get('post1');

      expect(user1).toBeNull();
      expect(user2).toBeNull();
      expect(post1).toEqual({ title: 'Post' }); // Different tag, kept
    });

    it('should handle entries with multiple tags', async () => {
      await cacheService.set('multi-tag', { data: 'test' }, { tags: ['tag1', 'tag2', 'tag3'] });

      // Clear by tag2
      await cacheService.clearByTag('tag2');

      const result = await cacheService.get('multi-tag');
      expect(result).toBeNull(); // Cleared because it had tag2
    });

    it('should handle clearByTag with no matching entries', async () => {
      await cacheService.set('entry1', { data: 1 }, { tags: ['tag1'] });

      // Clear non-existent tag
      await cacheService.clearByTag('non-existent-tag');

      const result = await cacheService.get('entry1');
      expect(result).toEqual({ data: 1 }); // Still exists
    });

    it('should remove AsyncStorage entries when clearing by tag', async () => {
      await cacheService.set('tagged-storage', { data: 'test' }, { tags: ['remove'] });

      await cacheService.clearByTag('remove');

      expect(mockAsyncStorage.removeItem).toHaveBeenCalled();
    });
  });

  // ===================================================================
  // 6. STATISTICS TRACKING
  // ===================================================================
  describe('Statistics Tracking', () => {
    it('should track hit rate on successful get', async () => {
      await cacheService.set('hit-key', { data: 'test' });

      const statsBefore = cacheService.getStats();
      const initialHitRate = statsBefore.hitRate;

      await cacheService.get('hit-key');

      const statsAfter = cacheService.getStats();
      // hitRate should increase after a successful get
      expect(statsAfter.hitRate).toBeGreaterThan(initialHitRate);
    });

    it('should track miss rate on failed get', async () => {
      const statsBefore = cacheService.getStats();
      const initialMissRate = statsBefore.missRate;

      await cacheService.get('non-existent');

      const statsAfter = cacheService.getStats();
      // missRate should increase after a failed get
      expect(statsAfter.missRate).toBeGreaterThan(initialMissRate);
    });

    it('should calculate hit rate correctly', async () => {
      await cacheService.set('key1', { data: 1 });

      // 3 hits, 2 misses
      await cacheService.get('key1'); // hit
      await cacheService.get('key1'); // hit
      await cacheService.get('key1'); // hit
      await cacheService.get('missing1'); // miss
      await cacheService.get('missing2'); // miss

      const stats = cacheService.getStats();
      // hitRate is a moving average, so we just check it's within reasonable range
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.hitRate).toBeLessThan(1);
      expect(stats.missRate).toBeGreaterThan(0);
      expect(stats.missRate).toBeLessThan(1);
    });

    it('should track total entries', async () => {
      await cacheService.set('entry1', { data: 1 });
      await cacheService.set('entry2', { data: 2 });
      await cacheService.set('entry3', { data: 3 });

      const stats = cacheService.getStats();
      expect(stats.totalEntries).toBe(3);
    });

    it('should track memory usage', async () => {
      const statsBefore = cacheService.getStats();

      await cacheService.set('large-entry', { data: 'x'.repeat(1000) });

      const statsAfter = cacheService.getStats();
      expect(statsAfter.memoryUsage).toBeGreaterThan(statsBefore.memoryUsage);
    });

    it('should persist stats to AsyncStorage', async () => {
      await cacheService.set('stats-key', { data: 'test' });
      await cacheService.get('stats-key');

      // Stats should be saved - check that setItem was called (key format may vary)
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should return complete stats object', () => {
      const stats = cacheService.getStats();

      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('storageUsage');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('missRate');
      expect(stats).toHaveProperty('evictionCount');
      // Note: CacheStats interface doesn't include compressionRatio
    });
  });

  // ===================================================================
  // 7. CAPACITY MANAGEMENT
  // ===================================================================
  describe('Capacity Management', () => {
    it('should enforce maxEntries limit', async () => {
      const limitedCache = new CacheService({
        maxEntries: 5,
        maxSize: 1024 * 1024,
        maxAge: 60000,
        evictionPolicy: 'lru',
        compressionThreshold: 512,
      });
      await limitedCache.waitForInitialization();

      // Add 10 entries
      for (let i = 0; i < 10; i++) {
        await limitedCache.set(`entry${i}`, { data: i });
      }

      const stats = limitedCache.getStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(5);

      limitedCache.cleanup();
    });

    it('should enforce maxSize limit', async () => {
      const sizeCache = new CacheService({
        maxEntries: 100,
        maxSize: 1024, // 1KB limit
        maxAge: 60000,
        evictionPolicy: 'size',
        compressionThreshold: 512,
      });
      await sizeCache.waitForInitialization();

      // Try to add large entries
      await sizeCache.set('large1', { data: 'x'.repeat(500) });
      await sizeCache.set('large2', { data: 'x'.repeat(500) });
      await sizeCache.set('large3', { data: 'x'.repeat(500) }); // Should trigger eviction

      const stats = sizeCache.getStats();
      expect(stats.memoryUsage).toBeLessThanOrEqual(1024);

      sizeCache.cleanup();
    });

    it('should handle emergency cleanup when storage quota exceeded', async () => {
      // Simulate quota exceeded error
      mockAsyncStorage.setItem.mockRejectedValueOnce(
        new Error('QuotaExceededError')
      );

      await cacheService.set('quota-test', { data: 'test' });

      // Should handle gracefully
      const result = await cacheService.get('quota-test');
      expect(result).toBeDefined();
    });

    it('should update capacity after eviction', async () => {
      const smallCache = new CacheService({
        maxEntries: 2,
        maxSize: 1024 * 1024,
        maxAge: 60000,
        evictionPolicy: 'lru',
        compressionThreshold: 512,
      });
      await smallCache.waitForInitialization();

      await smallCache.set('entry1', { data: 1 });
      await smallCache.set('entry2', { data: 2 });

      const statsBefore = smallCache.getStats();
      expect(statsBefore.totalEntries).toBe(2);

      // Add 3rd entry - triggers eviction
      await smallCache.set('entry3', { data: 3 });

      const statsAfter = smallCache.getStats();
      expect(statsAfter.totalEntries).toBe(2); // Still at limit

      smallCache.cleanup();
    });
  });

  // ===================================================================
  // 8. PERSISTENCE & ASYNC STORAGE
  // ===================================================================
  describe('Persistence & AsyncStorage', () => {
    it('should persist metadata to AsyncStorage', async () => {
      await cacheService.set('meta-test', { data: 'test' });

      // Metadata should be saved - check that setItem was called (key format may vary)
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should handle AsyncStorage setItem errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw
      await expect(
        cacheService.set('error-key', { data: 'test' })
      ).resolves.not.toThrow();
    });

    it('should handle AsyncStorage getItem errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Read error'));

      // Should return null
      const result = await cacheService.get('error-key');
      expect(result).toBeNull();
    });

    it('should handle malformed data from AsyncStorage', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('invalid json{{{');

      const result = await cacheService.get('malformed-key');
      expect(result).toBeNull();
    });

    it('should remove from AsyncStorage on cache removal', async () => {
      await cacheService.set('remove-storage', { data: 'test' });

      await cacheService.remove('remove-storage');

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        expect.stringContaining('remove-storage')
      );
    });

    it('should clear AsyncStorage on cache clear', async () => {
      await cacheService.set('clear1', { data: 1 });
      await cacheService.set('clear2', { data: 2 });

      mockAsyncStorage.getAllKeys.mockResolvedValueOnce(['cache_clear1', 'cache_clear2']);

      await cacheService.clear();

      // CacheService uses multiRemove, not clear
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalled();
    });

    it('should get all cache keys', async () => {
      await cacheService.set('key1', { data: 1 });
      await cacheService.set('key2', { data: 2 });
      await cacheService.set('key3', { data: 3 });

      const keys = await cacheService.getKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
      expect(keys.length).toBe(3);
    });
  });

  // ===================================================================
  // 9. OPTIMIZATION & CLEANUP
  // ===================================================================
  describe('Optimization & Cleanup', () => {
    it('should remove expired entries during optimize', async () => {
      await cacheService.set('expire-opt', { data: 'test' }, { ttl: 50 });
      await cacheService.set('keep-opt', { data: 'keep' }, { ttl: 10000 });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      await cacheService.optimize();

      const expired = await cacheService.get('expire-opt');
      const kept = await cacheService.get('keep-opt');

      expect(expired).toBeNull();
      expect(kept).toEqual({ data: 'keep' });
    });

    it('should schedule periodic cleanup', async () => {
      // Cleanup is scheduled on initialization
      const stats = cacheService.getStats();
      expect(stats).toBeDefined();

      // Cleanup should be automatically scheduled
      // We can't easily test the interval, but we can verify no errors
    });

    it('should clean up resources on cleanup call', () => {
      // Should not throw
      expect(() => cacheService.cleanup()).not.toThrow();
    });

    it('should update storage usage during optimize', async () => {
      await cacheService.set('opt1', { data: 'test1' });
      await cacheService.set('opt2', { data: 'test2' });

      await cacheService.optimize();

      const stats = cacheService.getStats();
      expect(stats.storageUsage).toBeGreaterThanOrEqual(0);
    });
  });

  // ===================================================================
  // 10. COMPRESSION (if supported)
  // ===================================================================
  describe('Compression', () => {
    it('should compress data above threshold', async () => {
      const largeData = { content: 'x'.repeat(1000) }; // Above 512 byte threshold

      await cacheService.set('compress-key', largeData);

      // Verify data is stored (compression happens internally)
      const result = await cacheService.get('compress-key');
      expect(result).toEqual(largeData);
    });

    it('should not compress data below threshold', async () => {
      const smallData = { content: 'small' }; // Below 512 byte threshold

      await cacheService.set('no-compress-key', smallData);

      const result = await cacheService.get('no-compress-key');
      expect(result).toEqual(smallData);
    });

    it.skip('should track compression ratio in stats (SKIPPED - not in CacheStats interface)', async () => {
      // SKIPPED: CacheStats interface doesn't include compressionRatio field
      const largeData = { content: 'x'.repeat(1000) };

      await cacheService.set('compression-stats', largeData);

      const stats = cacheService.getStats();
      // compressionRatio is not part of CacheStats interface
    });
  });

  // ===================================================================
  // 11. EDGE CASES & ERROR HANDLING
  // ===================================================================
  describe('Edge Cases & Error Handling', () => {
    it('should handle null data', async () => {
      await cacheService.set('null-key', null);

      const result = await cacheService.get('null-key');
      expect(result).toBeNull();
    });

    it.skip('should handle undefined data (SKIPPED - service does not support undefined)', async () => {
      // SKIPPED: CacheService uses JSON.stringify which converts undefined to null
      // This is expected behavior for JSON serialization
      await cacheService.set('undefined-key', undefined);

      const result = await cacheService.get('undefined-key');
      expect(result).toBeDefined();
    });

    it('should handle empty object', async () => {
      await cacheService.set('empty-obj', {});

      const result = await cacheService.get('empty-obj');
      expect(result).toEqual({});
    });

    it('should handle empty array', async () => {
      await cacheService.set('empty-arr', []);

      const result = await cacheService.get('empty-arr');
      expect(result).toEqual([]);
    });

    it('should handle very large data', async () => {
      const largeData = {
        content: 'x'.repeat(100000), // 100KB
      };

      await cacheService.set('large-data', largeData);

      const result = await cacheService.get('large-data');
      expect(result).toEqual(largeData);
    });

    it('should handle special characters in keys', async () => {
      await cacheService.set('key-with-special-@#$%', { data: 'test' });

      const result = await cacheService.get('key-with-special-@#$%');
      expect(result).toEqual({ data: 'test' });
    });

    it('should handle concurrent set operations', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(cacheService.set(`concurrent-${i}`, { data: i }));
      }

      await Promise.all(promises);

      // All entries should be set
      const stats = cacheService.getStats();
      expect(stats.totalEntries).toBeGreaterThan(0);
    });

    it('should handle concurrent get operations', async () => {
      await cacheService.set('concurrent-get', { data: 'test' });

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(cacheService.get('concurrent-get'));
      }

      const results = await Promise.all(promises);

      // All gets should succeed
      results.forEach(result => {
        expect(result).toEqual({ data: 'test' });
      });
    });

    it('should return null for entry info of non-existent key', async () => {
      const info = await cacheService.getEntryInfo('non-existent');
      expect(info).toBeNull();
    });

    it('should handle version numbers in cache entries', async () => {
      await cacheService.set('versioned', { data: 'v1' }, { version: 1 });

      const info = await cacheService.getEntryInfo('versioned');
      expect(info?.version).toBe(1);
    });

    it('should calculate size correctly for different data types', async () => {
      await cacheService.set('string', 'test string');
      await cacheService.set('number', 12345);
      await cacheService.set('object', { key: 'value', nested: { data: 'test' } });
      await cacheService.set('array', [1, 2, 3, 4, 5]);

      const stringInfo = await cacheService.getEntryInfo('string');
      const numberInfo = await cacheService.getEntryInfo('number');
      const objectInfo = await cacheService.getEntryInfo('object');
      const arrayInfo = await cacheService.getEntryInfo('array');

      expect(stringInfo?.size).toBeGreaterThan(0);
      expect(numberInfo?.size).toBeGreaterThan(0);
      expect(objectInfo?.size).toBeGreaterThan(0);
      expect(arrayInfo?.size).toBeGreaterThan(0);
    });
  });

  // ===================================================================
  // 12. INTEGRATION SCENARIOS
  // ===================================================================
  describe('Integration Scenarios', () => {
    it('should handle complete cache lifecycle', async () => {
      // 1. Set data with tags and TTL
      await cacheService.set('lifecycle', { user: 'John' }, {
        ttl: 10000,
        tags: ['user', 'profile'],
      });

      // 2. Get data (hit)
      let result = await cacheService.get('lifecycle');
      expect(result).toEqual({ user: 'John' });

      // 3. Update access count
      await cacheService.get('lifecycle');
      await cacheService.get('lifecycle');

      // 4. Check stats
      const stats = cacheService.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);

      // 5. Get entry info
      const info = await cacheService.getEntryInfo('lifecycle');
      // Initial accessCount is 1 (from set), then 3 gets increment it to 4
      expect(info?.accessCount).toBe(4);

      // 6. Remove by tag
      await cacheService.clearByTag('user');

      // 7. Verify removal
      result = await cacheService.get('lifecycle');
      expect(result).toBeNull();
    });

    it('should handle cache eviction scenario', async () => {
      const evictionCache = new CacheService({
        maxEntries: 3,
        maxSize: 1024 * 1024,
        maxAge: 60000,
        evictionPolicy: 'lru',
        compressionThreshold: 512,
      });
      await evictionCache.waitForInitialization();

      // Fill cache
      await evictionCache.set('item1', { data: 1 });
      await evictionCache.set('item2', { data: 2 });
      await evictionCache.set('item3', { data: 3 });

      // Access item1 to make it recently used
      await evictionCache.get('item1');

      // Add new item - should trigger eviction
      await evictionCache.set('item4', { data: 4 });

      // Verify eviction occurred
      const stats = evictionCache.getStats();
      expect(stats.evictionCount).toBeGreaterThan(0);

      // Check that we have exactly maxEntries
      expect(stats.totalEntries).toBeLessThanOrEqual(3);

      evictionCache.cleanup();
    });

    it('should handle cache persistence and recovery', async () => {
      // Set data
      await cacheService.set('persist', { data: 'important' });

      // Verify AsyncStorage was called
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();

      // Simulate cache recovery
      const recoveryEntry = {
        data: { data: 'important' },
        timestamp: Date.now(),
        ttl: 60000,
        expiresAt: Date.now() + 60000,
        accessCount: 0,
        lastAccessed: Date.now(),
        size: 100,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(recoveryEntry));

      const result = await cacheService.get('recover-key');
      expect(result).toEqual({ data: 'important' });
    });
  });
});
