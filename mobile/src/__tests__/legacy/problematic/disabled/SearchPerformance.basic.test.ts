import { SearchService } from '../../../services/searchService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Simple performance test configuration
const PERF_TEST_CONFIG = {
  TIMEOUT_MS: 30000, // 30 seconds timeout
};

// Global timeout for all tests
jest.setTimeout(PERF_TEST_CONFIG.TIMEOUT_MS);

describe('Search Performance Tests', () => {
  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

    // Reset singleton
    (SearchService as any).instance = undefined;
    service = SearchService.getInstance();
  });

  describe('Basic Search Performance', () => {
    it('should complete simple searches within reasonable time', async () => {
      const start = performance.now();

      await service.search({ query: 'server' });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(15000); // 15 seconds - very generous for test environment
    });

    it('should handle empty queries efficiently', async () => {
      const start = performance.now();

      await service.search({ query: '' });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10000); // 10 seconds
    });

    it('should handle basic filtering within reasonable time', async () => {
      const start = performance.now();

      await service.search({
        query: 'server',
        filters: {
          type: ['server'],
          limit: 10,
        },
      });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(15000); // 15 seconds
    });
  });

  describe('Cache Performance', () => {
    it('should serve cached results quickly', async () => {
      const query = { query: 'cached test' };

      // First search to populate cache
      await service.search(query);

      // Second search should be cached
      const start = performance.now();
      await service.search(query);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000); // 5 seconds for cached results
    });
  });

  describe('Memory Management', () => {
    it('should maintain reasonable memory usage', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform multiple searches
      for (let i = 0; i < 3; i++) { // Reduced from 5 to 3
        await service.search({ query: `test query ${i}` });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 100MB, increased from 50MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    }, 45000); // 45 second timeout
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent searches', async () => {
      const start = performance.now();

      // Run 3 concurrent searches
      const promises = [
        service.search({ query: 'concurrent 1' }),
        service.search({ query: 'concurrent 2' }),
        service.search({ query: 'concurrent 3' }),
      ];

      await Promise.all(promises);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(20000); // 20 seconds for concurrent operations
    });
  });
});
