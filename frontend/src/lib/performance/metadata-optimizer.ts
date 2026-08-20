/**
 * Performance-optimized metadata generation utilities
 * Implements memory-efficient batch processing and caching
 */

interface ContentItem {
  id: string;
  title: string;
  overview?: string;
  genres?: string[];
  cast?: Array<{ name: string; character?: string }>;
  crew?: Array<{ name: string; job?: string }>;
}

interface MetadataResult {
  title: string;
  description: string;
  keywords?: string;
}

/**
 * Memory-efficient metadata cache with LRU eviction
 */
class MetadataCache {
  private cache = new Map<string, MetadataResult>();
  private maxSize = 1000; // Limit cache size to prevent memory bloat
  private accessOrder = new Map<string, number>();
  private currentTime = 0;

  get(key: string): MetadataResult | null {
    const item = this.cache.get(key);
    if (item) {
      this.accessOrder.set(key, ++this.currentTime);
      return item;
    }
    return null;
  }

  set(key: string, value: MetadataResult): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Evict least recently used item
      const lruKey = this.getLRUKey();
      if (lruKey) {
        this.cache.delete(lruKey);
        this.accessOrder.delete(lruKey);
      }
    }

    this.cache.set(key, value);
    this.accessOrder.set(key, ++this.currentTime);
  }

  private getLRUKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessOrder) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.currentTime = 0;
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Performance-optimized metadata generator
 */
export class MetadataOptimizer {
  private cache = new MetadataCache();
  private batchSize = 10; // Process in small batches to avoid memory spikes
  private concurrentLimit = 5; // Limit concurrent operations

  /**
   * Generate metadata for a single content item with caching
   */
  async generateMetadata(content: ContentItem, type: string = 'movie'): Promise<MetadataResult> {
    const cacheKey = `${content.id}-${type}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const metadata = await this.processContentMetadata(content, type);
    this.cache.set(cacheKey, metadata);

    return metadata;
  }

  /**
   * Generate metadata for multiple items with efficient batching
   */
  async generateBatchMetadata(contents: ContentItem[], type: string = 'movie'): Promise<MetadataResult[]> {
    const results: MetadataResult[] = [];

    // Process in batches to prevent memory overflow
    for (let i = 0; i < contents.length; i += this.batchSize) {
      const batch = contents.slice(i, i + this.batchSize);
      const batchResults = await this.processBatch(batch, type);
      results.push(...batchResults);

      // Force garbage collection opportunity
      if (global.gc && i % (this.batchSize * 5) === 0) {
        global.gc();
      }
    }

    return results;
  }

  /**
   * Process a batch of content items with controlled concurrency
   */
  private async processBatch(batch: ContentItem[], type: string): Promise<MetadataResult[]> {
    const semaphore = new Semaphore(this.concurrentLimit);

    const promises = batch.map(async content => {
      await semaphore.acquire();
      try {
        return await this.generateMetadata(content, type);
      } finally {
        semaphore.release();
      }
    });

    return Promise.all(promises);
  }

  /**
   * Memory-efficient metadata processing
   */
  private async processContentMetadata(content: ContentItem, _type: string): Promise<MetadataResult> {
    // Extract only essential data to minimize memory usage
    const title = content.title;
    const description = content.overview?.substring(0, 160) || '';

    // Limit cast/crew processing to prevent large array operations
    const topCast = content.cast?.slice(0, 5).map(c => c.name) || [];
    const directors =
      content.crew
        ?.filter(c => c.job === 'Director')
        .slice(0, 2)
        .map(c => c.name) || [];

    // Build keywords efficiently
    const keywords = [title, ...(content.genres?.slice(0, 3) || []), ...topCast, ...directors]
      .filter(Boolean)
      .join(', ');

    return {
      title: `${title} - GeoLeap`,
      description,
      keywords,
    };
  }

  /**
   * Clear cache and reset optimizer
   */
  reset(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): { cacheSize: number; hitRate: number } {
    return {
      cacheSize: this.cache.size(),
      hitRate: 0, // Would need hit/miss tracking for real implementation
    };
  }
}

/**
 * Simple semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>(resolve => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift();
      if (resolve) {
        resolve();
      }
    } else {
      this.permits++;
    }
  }
}

/**
 * Global optimized metadata generator instance
 */
export const metadataOptimizer = new MetadataOptimizer();

/**
 * High-performance sitemap URL generator
 */
export class SitemapOptimizer {
  private batchSize = 1000; // Process URLs in larger batches

  async generateSitemapUrls(
    contents: Array<{ id: string; title: string; releaseYear?: number }>,
    type: string
  ): Promise<Array<{ url: string; lastmod: string; priority: number }>> {
    const results: Array<{ url: string; lastmod: string; priority: number }> = [];
    const currentDate = new Date().toISOString();

    // Use streaming processing for large datasets
    for (let i = 0; i < contents.length; i += this.batchSize) {
      const batch = contents.slice(i, i + this.batchSize);

      // Process batch synchronously for better performance
      const batchUrls = batch.map(content => {
        const slug = this.generateSlug(content.id, content.title, content.releaseYear);
        const priority = this.calculatePriority(content.releaseYear || 2000);

        return {
          url: `https://geoleap.app/content/${type}/${slug}`,
          lastmod: currentDate,
          priority,
        };
      });

      results.push(...batchUrls);
    }

    return results;
  }

  private generateSlug(id: string, title: string, year?: number): string {
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    return `${id}-${cleanTitle}${year ? `-${year}` : ''}`;
  }

  private calculatePriority(releaseYear: number): number {
    const currentYear = new Date().getFullYear();
    const age = currentYear - releaseYear;
    return Math.max(0.3, 1.0 - age * 0.05);
  }
}

export const sitemapOptimizer = new SitemapOptimizer();
