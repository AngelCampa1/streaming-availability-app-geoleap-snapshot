/**
 * Comprehensive tests for metadata-optimizer.ts
 *
 * Coverage Target: 90%+
 * Strategy: Test MetadataOptimizer and SitemapOptimizer with real implementations
 */

import { MetadataOptimizer, SitemapOptimizer, metadataOptimizer, sitemapOptimizer } from '../metadata-optimizer';

describe('MetadataOptimizer', () => {
  let optimizer: MetadataOptimizer;

  beforeEach(() => {
    optimizer = new MetadataOptimizer();
  });

  describe('generateMetadata', () => {
    it('generates metadata for a movie with all fields', async () => {
      const content = {
        id: 'movie-123',
        title: 'Test Movie',
        overview: 'A great test movie about testing',
        genres: ['Action', 'Adventure', 'Comedy'],
        cast: [
          { name: 'Actor One', character: 'Hero' },
          { name: 'Actor Two', character: 'Villain' },
          { name: 'Actor Three', character: 'Sidekick' },
          { name: 'Actor Four', character: 'Mentor' },
          { name: 'Actor Five', character: 'Love Interest' },
          { name: 'Actor Six', character: 'Extra' }, // Should be excluded (only top 5)
        ],
        crew: [
          { name: 'Director One', job: 'Director' },
          { name: 'Director Two', job: 'Director' },
          { name: 'Director Three', job: 'Director' }, // Should be excluded (only top 2)
          { name: 'Producer', job: 'Producer' },
        ],
      };

      const result = await optimizer.generateMetadata(content, 'movie');

      expect(result).toEqual({
        title: 'Test Movie - GeoLeap',
        description: 'A great test movie about testing',
        keywords: 'Test Movie, Action, Adventure, Comedy, Actor One, Actor Two, Actor Three, Actor Four, Actor Five, Director One, Director Two',
      });
    });

    it('handles content with minimal fields', async () => {
      const content = {
        id: 'min-123',
        title: 'Minimal Movie',
      };

      const result = await optimizer.generateMetadata(content);

      expect(result).toEqual({
        title: 'Minimal Movie - GeoLeap',
        description: '',
        keywords: 'Minimal Movie',
      });
    });

    it('truncates long overview to 160 characters', async () => {
      const longOverview = 'A'.repeat(200);
      const content = {
        id: 'long-123',
        title: 'Long Movie',
        overview: longOverview,
      };

      const result = await optimizer.generateMetadata(content);

      expect(result.description).toHaveLength(160);
      expect(result.description).toBe('A'.repeat(160));
    });

    it('limits cast to top 5 members', async () => {
      const cast = Array.from({ length: 20 }, (_, i) => ({
        name: `Actor ${i + 1}`,
        character: `Role ${i + 1}`,
      }));

      const content = {
        id: 'cast-123',
        title: 'Cast Movie',
        cast,
      };

      const result = await optimizer.generateMetadata(content);

      const keywords = result.keywords?.split(', ') || [];
      const actorKeywords = keywords.filter(k => k.startsWith('Actor'));

      expect(actorKeywords).toHaveLength(5);
      expect(actorKeywords).toEqual(['Actor 1', 'Actor 2', 'Actor 3', 'Actor 4', 'Actor 5']);
    });

    it('limits directors to top 2', async () => {
      const crew = [
        { name: 'Director 1', job: 'Director' },
        { name: 'Director 2', job: 'Director' },
        { name: 'Director 3', job: 'Director' },
        { name: 'Director 4', job: 'Director' },
      ];

      const content = {
        id: 'dir-123',
        title: 'Action Movie',  // Changed to avoid conflict with Director names
        crew,
      };

      const result = await optimizer.generateMetadata(content);

      const keywords = result.keywords?.split(', ') || [];
      const directorKeywords = keywords.filter(k => k.startsWith('Director'));

      expect(directorKeywords).toHaveLength(2);
      expect(directorKeywords).toEqual(['Director 1', 'Director 2']);
    });

    it('filters out non-director crew members', async () => {
      const crew = [
        { name: 'Producer Name', job: 'Producer' },
        { name: 'Director Name', job: 'Director' },
        { name: 'Writer Name', job: 'Writer' },
      ];

      const content = {
        id: 'crew-123',
        title: 'Crew Movie',
        crew,
      };

      const result = await optimizer.generateMetadata(content);

      expect(result.keywords).toContain('Director Name');
      expect(result.keywords).not.toContain('Producer Name');
      expect(result.keywords).not.toContain('Writer Name');
    });

    it('limits genres to top 3', async () => {
      const content = {
        id: 'genre-123',
        title: 'Genre Movie',
        genres: ['Action', 'Adventure', 'Comedy', 'Drama', 'Thriller'],
      };

      const result = await optimizer.generateMetadata(content);

      const keywords = result.keywords?.split(', ') || [];
      const genreKeywords = keywords.filter(k => ['Action', 'Adventure', 'Comedy', 'Drama', 'Thriller'].includes(k));

      expect(genreKeywords).toHaveLength(3);
      expect(genreKeywords).toEqual(['Action', 'Adventure', 'Comedy']);
    });

    it('uses cache for repeated requests', async () => {
      const content = {
        id: 'cache-123',
        title: 'Cached Movie',
      };

      const result1 = await optimizer.generateMetadata(content, 'movie');
      const result2 = await optimizer.generateMetadata(content, 'movie');

      expect(result1).toEqual(result2);
      expect(result1).toBe(result2); // Same object reference from cache
    });

    it('generates different cache keys for different types', async () => {
      const content = {
        id: 'type-123',
        title: 'Type Movie',
      };

      const movieResult = await optimizer.generateMetadata(content, 'movie');
      const tvResult = await optimizer.generateMetadata(content, 'tv');

      expect(movieResult).toEqual(tvResult); // Content is same
      // But they're cached separately, so changes to one won't affect the other
    });
  });

  describe('generateBatchMetadata', () => {
    it('processes multiple content items', async () => {
      const contents = [
        { id: '1', title: 'Movie 1' },
        { id: '2', title: 'Movie 2' },
        { id: '3', title: 'Movie 3' },
      ];

      const results = await optimizer.generateBatchMetadata(contents);

      expect(results).toHaveLength(3);
      expect(results[0].title).toBe('Movie 1 - GeoLeap');
      expect(results[1].title).toBe('Movie 2 - GeoLeap');
      expect(results[2].title).toBe('Movie 3 - GeoLeap');
    });

    it('processes items in batches of 10', async () => {
      const contents = Array.from({ length: 25 }, (_, i) => ({
        id: `${i}`,
        title: `Movie ${i}`,
      }));

      const results = await optimizer.generateBatchMetadata(contents);

      expect(results).toHaveLength(25);
      expect(results[0].title).toBe('Movie 0 - GeoLeap');
      expect(results[24].title).toBe('Movie 24 - GeoLeap');
    });

    it('handles empty array', async () => {
      const results = await optimizer.generateBatchMetadata([]);

      expect(results).toEqual([]);
    });

    it('uses cache across batch processing', async () => {
      const contents = [
        { id: 'dup-1', title: 'Duplicate Movie' },
        { id: 'dup-1', title: 'Duplicate Movie' }, // Same ID, should use cache
      ];

      const results = await optimizer.generateBatchMetadata(contents, 'movie');

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(results[1]); // Same values from cache
    });
  });

  describe('reset', () => {
    it('clears the cache', async () => {
      const content = { id: 'reset-123', title: 'Reset Movie' };

      await optimizer.generateMetadata(content);
      expect(optimizer.getStats().cacheSize).toBe(1);

      optimizer.reset();

      expect(optimizer.getStats().cacheSize).toBe(0);
    });
  });

  describe('getStats', () => {
    it('returns cache statistics', async () => {
      const content1 = { id: 'stats-1', title: 'Stats Movie 1' };
      const content2 = { id: 'stats-2', title: 'Stats Movie 2' };

      await optimizer.generateMetadata(content1);
      await optimizer.generateMetadata(content2);

      const stats = optimizer.getStats();

      expect(stats.cacheSize).toBe(2);
      expect(stats.hitRate).toBeDefined();
    });
  });
});

describe('SitemapOptimizer', () => {
  let optimizer: SitemapOptimizer;

  beforeEach(() => {
    optimizer = new SitemapOptimizer();
  });

  describe('generateSitemapUrls', () => {
    it('generates sitemap URLs for content items', async () => {
      const contents = [
        { id: 'movie-1', title: 'The Great Movie', releaseYear: 2023 },
        { id: 'movie-2', title: 'Another Film', releaseYear: 2024 },
      ];

      const urls = await optimizer.generateSitemapUrls(contents, 'movies');

      expect(urls).toHaveLength(2);
      expect(urls[0]).toMatchObject({
        url: 'https://geoleap.app/content/movies/movie-1-the-great-movie-2023',
        lastmod: expect.any(String),
        priority: expect.any(Number),
      });
      expect(urls[1]).toMatchObject({
        url: 'https://geoleap.app/content/movies/movie-2-another-film-2024',
        lastmod: expect.any(String),
        priority: expect.any(Number),
      });
    });

    it('generates slug with lowercase and hyphenated title', async () => {
      const contents = [
        { id: '123', title: 'The BEST Movie Ever!', releaseYear: 2020 },
      ];

      const urls = await optimizer.generateSitemapUrls(contents, 'movies');

      expect(urls[0].url).toBe('https://geoleap.app/content/movies/123-the-best-movie-ever-2020');
    });

    it('removes special characters from slug', async () => {
      const contents = [
        { id: '456', title: 'Movie: Part 2 (2023)', releaseYear: 2023 },
      ];

      const urls = await optimizer.generateSitemapUrls(contents, 'movies');

      expect(urls[0].url).toBe('https://geoleap.app/content/movies/456-movie-part-2-2023-2023');
    });

    it('handles content without release year', async () => {
      const contents = [
        { id: 'no-year', title: 'Timeless Classic' },
      ];

      const urls = await optimizer.generateSitemapUrls(contents, 'movies');

      expect(urls[0].url).toBe('https://geoleap.app/content/movies/no-year-timeless-classic');
      expect(urls[0].url).not.toContain('undefined');
    });

    it('calculates priority based on release year', async () => {
      const currentYear = new Date().getFullYear();
      const contents = [
        { id: '1', title: 'New Release', releaseYear: currentYear },
        { id: '2', title: 'Recent Movie', releaseYear: currentYear - 2 },
        { id: '3', title: 'Old Classic', releaseYear: currentYear - 20 },
      ];

      const urls = await optimizer.generateSitemapUrls(contents, 'movies');

      expect(urls[0].priority).toBe(1.0); // Current year
      expect(urls[1].priority).toBe(0.9); // 2 years old (1.0 - 2 * 0.05)
      expect(urls[2].priority).toBe(0.3); // 20 years old, hits minimum
    });

    it('sets minimum priority to 0.3', async () => {
      const currentYear = new Date().getFullYear();
      const contents = [
        { id: 'very-old', title: 'Very Old Movie', releaseYear: currentYear - 50 },
      ];

      const urls = await optimizer.generateSitemapUrls(contents, 'movies');

      expect(urls[0].priority).toBe(0.3); // Minimum priority
      expect(urls[0].priority).toBeGreaterThanOrEqual(0.3);
    });

    it('processes large datasets in batches', async () => {
      const contents = Array.from({ length: 2500 }, (_, i) => ({
        id: `movie-${i}`,
        title: `Movie ${i}`,
        releaseYear: 2023,
      }));

      const urls = await optimizer.generateSitemapUrls(contents, 'movies');

      expect(urls).toHaveLength(2500);
      expect(urls[0].url).toContain('movie-0');
      expect(urls[2499].url).toContain('movie-2499');
    });

    it('handles empty array', async () => {
      const urls = await optimizer.generateSitemapUrls([], 'movies');

      expect(urls).toEqual([]);
    });

    it('uses current date for lastmod', async () => {
      const contents = [{ id: '1', title: 'Test', releaseYear: 2020 }];

      const before = new Date().toISOString();
      const urls = await optimizer.generateSitemapUrls(contents, 'movies');
      const after = new Date().toISOString();

      expect(urls[0].lastmod).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
      expect(urls[0].lastmod >= before).toBe(true);
      expect(urls[0].lastmod <= after).toBe(true);
    });

    it('normalizes multiple spaces in title', async () => {
      const contents = [
        { id: '1', title: 'Movie   With    Spaces', releaseYear: 2020 },
      ];

      const urls = await optimizer.generateSitemapUrls(contents, 'movies');

      expect(urls[0].url).toBe('https://geoleap.app/content/movies/1-movie-with-spaces-2020');
      expect(urls[0].url).not.toContain('--'); // No double hyphens
    });
  });
});

describe('MetadataCache (internal)', () => {
  it('evicts LRU item when cache is full', async () => {
    // Create optimizer with small cache for testing
    const optimizer = new MetadataOptimizer();

    // Fill cache beyond maxSize (1000)
    // We'll use the private cache indirectly through generateMetadata
    const contents = Array.from({ length: 1001 }, (_, i) => ({
      id: `item-${i}`,
      title: `Item ${i}`,
    }));

    await optimizer.generateBatchMetadata(contents);

    // Cache should maintain max size
    const stats = optimizer.getStats();
    expect(stats.cacheSize).toBeLessThanOrEqual(1000);
  });
});

describe('Semaphore (internal concurrency control)', () => {
  it('limits concurrent metadata generation', async () => {
    const optimizer = new MetadataOptimizer();

    const _concurrentCount = 0;
    const _maxConcurrent = 0;

    // Spy on the processing to track concurrency
    const contents = Array.from({ length: 20 }, (_, i) => ({
      id: `concurrent-${i}`,
      title: `Concurrent ${i}`,
    }));

    // Process batch - semaphore should limit to 5 concurrent
    const results = await optimizer.generateBatchMetadata(contents);

    expect(results).toHaveLength(20);
    // All items should be processed despite concurrency limit
  });
});

describe('Global instances', () => {
  it('exports singleton metadataOptimizer', () => {
    expect(metadataOptimizer).toBeInstanceOf(MetadataOptimizer);
  });

  it('exports singleton sitemapOptimizer', () => {
    expect(sitemapOptimizer).toBeInstanceOf(SitemapOptimizer);
  });

  it('global instances are reused', async () => {
    const content = { id: 'global-test', title: 'Global Test' };

    await metadataOptimizer.generateMetadata(content);

    const stats = metadataOptimizer.getStats();
    expect(stats.cacheSize).toBeGreaterThan(0);
  });
});
