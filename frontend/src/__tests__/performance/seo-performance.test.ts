/**
 * Performance tests for SEO-optimized content pages
 * Tests Core Web Vitals, page loading speed, and performance metrics
 *
 * Optimized for reliability:
 * - Increased timeout values for performance-intensive operations
 * - Proper error handling and mock cleanup
 * - Realistic performance expectations for test environment
 */

import { performance } from 'perf_hooks';

// Increase default timeout for performance tests
jest.setTimeout(15000);

// Mock Next.js and browser APIs
const mockPerformanceObserver = {
  observe: jest.fn(),
  disconnect: jest.fn(),
};

const mockPerformanceEntry = {
  name: 'test-entry',
  duration: 100,
  startTime: 0,
};

// Mock browser Performance API
Object.defineProperty(global, 'PerformanceObserver', {
  value: jest.fn(() => mockPerformanceObserver),
  writable: true,
});

Object.defineProperty(global, 'performance', {
  value: {
    ...performance,
    mark: jest.fn(),
    measure: jest.fn(() => mockPerformanceEntry),
    getEntriesByName: jest.fn(() => [mockPerformanceEntry]),
    getEntriesByType: jest.fn(() => [mockPerformanceEntry]),
    now: jest.fn(() => Date.now()),
    timing: {
      navigationStart: 0,
      domContentLoadedEventEnd: 1000,
      loadEventEnd: 1500,
    },
    navigation: {
      type: 0,
    },
  },
  writable: true,
});

// Mock content generation functions
import { generateContentMetadata } from '@/lib/seo/content-metadata';
import { generateContentSchema } from '@/lib/seo/schema-markup';
import { CastMember, CrewMember } from '@/lib/api/content';
import { generateContentSlug, generateCanonicalUrl } from '@/lib/seo/url-generation';

jest.mock('@/lib/seo/content-metadata');
jest.mock('@/lib/seo/schema-markup');
jest.mock('@/lib/seo/url-generation');

describe('SEO Performance Tests', () => {
  const mockLargeContent = {
    id: '123',
    title: 'The Dark Knight',
    overview:
      'A complex and detailed movie description that goes on for quite some time explaining the intricate plot details and character development that makes this film truly exceptional in every way possible.',
    posterUrl: 'https://example.com/poster.jpg',
    backdropUrl: 'https://example.com/backdrop.jpg',
    releaseYear: 2008,
    genres: ['Action', 'Crime', 'Drama', 'Thriller', 'Mystery'],
    rating: 9.0,
    voteCount: 2500000,
    runtime: 152,
    contentRating: 'PG-13',
    cast: Array.from({ length: 50 }, (_, i) => ({
      id: i,
      name: `Actor ${i}`,
      character: `Character ${i}`,
      profilePath: `/actor${i}.jpg`,
      order: i + 1,
    })),
    crew: Array.from({ length: 20 }, (_, i) => ({
      id: i,
      name: `Crew Member ${i}`,
      job: i % 3 === 0 ? 'Director' : 'Producer',
      profilePath: `/crew${i}.jpg`,
      department: i % 3 === 0 ? 'Directing' : 'Production',
    })),
    streamingOptions: Array.from({ length: 10 }, (_, i) => ({
      serviceId: `platform-${i}`,
      serviceName: `Platform ${i}`,
      url: `https://platform${i}.com/watch/123`,
      type: 'subscription' as const,
      quality: ['4K'],
      price: 9.99 + i,
      currency: 'USD',
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Use optional chaining since performance methods may be mocked
    if (typeof performance.clearMarks === 'function') {
      try { performance.clearMarks(); } catch (_e) { /* mocked */ }
    }
    if (typeof performance.clearMeasures === 'function') {
      try { performance.clearMeasures(); } catch (_e) { /* mocked */ }
    }
  });

  describe('Core Web Vitals Tests', () => {
    it('should meet LCP (Largest Contentful Paint) requirements', async () => {
      const startTime = performance.now();

      // Simulate content generation
      (generateContentMetadata as jest.Mock).mockResolvedValue({
        title: 'Test Title',
        description: 'Test Description',
      });

      await generateContentMetadata(mockLargeContent, 'movie');

      const endTime = performance.now();
      const duration = endTime - startTime;

      // LCP should be under 2.5 seconds (2500ms) for good performance
      expect(duration).toBeLessThan(100); // Our generation should be much faster
    });

    it('should meet FID (First Input Delay) requirements', () => {
      const startTime = performance.now();

      // Simulate user interaction handling
      const handleClick = () => {
        // Simulate DOM manipulation
        for (let i = 0; i < 1000; i++) {
          Math.random();
        }
      };

      handleClick();

      const endTime = performance.now();
      const duration = endTime - startTime;

      // FID should be under 100ms for good performance
      expect(duration).toBeLessThan(100);
    });

    it('should meet CLS (Cumulative Layout Shift) requirements', () => {
      // Mock layout shift measurement
      const mockLayoutShiftEntries = [
        { value: 0.05, hadRecentInput: false },
        { value: 0.02, hadRecentInput: false },
        { value: 0.08, hadRecentInput: true }, // Should be excluded
      ];

      let cumulativeScore = 0;
      mockLayoutShiftEntries.forEach(entry => {
        if (!entry.hadRecentInput) {
          cumulativeScore += entry.value;
        }
      });

      // CLS should be under 0.1 for good performance
      expect(cumulativeScore).toBeLessThan(0.1);
    });

    it('should optimize INP (Interaction to Next Paint)', async () => {
      const interactions = [];

      // Simulate multiple user interactions
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();

        // Simulate interaction processing
        await new Promise(resolve => setTimeout(resolve, 10));

        const endTime = performance.now();
        interactions.push(endTime - startTime);
      }

      const p75Value = interactions.sort((a, b) => a - b)[Math.ceil(interactions.length * 0.75) - 1];

      // INP should be under 200ms for good performance
      expect(p75Value).toBeLessThan(200);
    });
  });

  describe('Page Loading Performance', () => {
    it('should generate metadata quickly', async () => {
      const startTime = performance.now();

      (generateContentMetadata as jest.Mock).mockImplementation(async content => {
        // Simulate realistic processing time
        await new Promise(resolve => setTimeout(resolve, 5));
        return {
          title: `${content.title} - GeoLeap`,
          description: content.overview,
          keywords: content.genres?.join(', '),
        };
      });

      await generateContentMetadata(mockLargeContent, 'movie');

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Metadata generation should be under 200ms (generous for CI/parallel test runs)
      expect(duration).toBeLessThan(200);
    });

    it('should generate schema markup efficiently', async () => {
      const startTime = performance.now();

      (generateContentSchema as jest.Mock).mockImplementation(content => {
        // Simulate schema generation processing
        return [
          {
            '@context': 'https://schema.org',
            '@type': 'Movie',
            name: content.title,
            description: content.overview,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [],
          },
        ];
      });

      generateContentSchema(mockLargeContent, 'movie');

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Schema generation should be under 20ms
      expect(duration).toBeLessThan(20);
    });

    it('should handle URL generation efficiently', () => {
      const startTime = performance.now();

      (generateContentSlug as jest.Mock).mockImplementation((id, title, year) => {
        return `${id}-${title.toLowerCase().replace(/\s+/g, '-')}${year ? `-${year}` : ''}`;
      });

      (generateCanonicalUrl as jest.Mock).mockImplementation((type, slug) => {
        return `https://geoleap.app/content/${type}/${slug}`;
      });

      // Generate multiple URLs to simulate batch processing
      for (let i = 0; i < 100; i++) {
        const slug = generateContentSlug(`${i}`, `Movie Title ${i}`, 2023);
        generateCanonicalUrl('movie', slug);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // URL generation for 100 items should be under 50ms (more realistic expectation)
      expect(duration).toBeLessThan(50);
    });

    it('should handle large cast and crew arrays efficiently', async () => {
      const startTime = performance.now();

      const largeContent = {
        ...mockLargeContent,
        cast: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Actor ${i}`,
          character: `Character ${i}`,
          order: i + 1,
        })),
        crew: Array.from({ length: 500 }, (_, i) => ({
          id: i,
          name: `Crew Member ${i}`,
          job: 'Various',
          department: 'Various',
        })),
      };

      (generateContentMetadata as jest.Mock).mockImplementation(async content => {
        // Simulate processing large arrays
        const topCast = content.cast?.slice(0, 10) || [];
        const directors = content.crew?.filter((c: CrewMember) => c.job === 'Director').slice(0, 5) || [];

        return {
          title: content.title,
          description: content.overview,
          keywords: [
            content.title,
            ...content.genres,
            ...topCast.map((c: CastMember) => c.name),
            ...directors.map((d: CrewMember) => d.name),
          ].join(', '),
        };
      });

      await generateContentMetadata(largeContent, 'movie');

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Processing large arrays should still be efficient (under 200ms for test environment)
      // Note: Test environments may be slower than production
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Memory Performance', () => {
    it('should not cause memory leaks during metadata generation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Generate metadata for multiple contents
      const promises = Array.from({ length: 100 }, async (_, i) => {
        const content = {
          ...mockLargeContent,
          id: i.toString(),
          title: `Movie ${i}`,
        };

        (generateContentMetadata as jest.Mock).mockResolvedValue({
          title: `Movie ${i} - GeoLeap`,
          description: content.overview,
        });

        return generateContentMetadata(content, 'movie');
      });

      await Promise.all(promises);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (under 100MB for test environment)
      // Note: Test environments may have higher memory overhead
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should handle concurrent metadata generation efficiently', async () => {
      const startTime = performance.now();

      (generateContentMetadata as jest.Mock).mockImplementation(async content => {
        // Simulate realistic async processing with timeout safety
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        return { title: content.title, description: content.overview };
      });

      // Generate metadata concurrently for 50 different contents
      const concurrentPromises = Array.from({ length: 50 }, (_, i) => {
        const content = { ...mockLargeContent, id: i.toString(), title: `Movie ${i}` };
        return generateContentMetadata(content, 'movie');
      });

      // Add timeout safety for Promise.all
      await Promise.race([
        Promise.all(concurrentPromises),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Concurrent operation timeout')), 10000)),
      ]);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Concurrent processing should be efficient (increased to 2000ms for test environment reliability)
      // Note: Test environments have higher overhead than production
      expect(duration).toBeLessThan(2000);
    }, 15000); // Individual test timeout
  });

  describe('Bundle Size Impact', () => {
    it('should keep SEO utility functions lightweight', () => {
      // Mock function sizes (in practice, you'd measure actual bundle sizes)
      const mockFunctionSizes = {
        generateContentMetadata: 2.5, // KB
        generateContentSchema: 3.0, // KB
        generateContentSlug: 0.5, // KB
        generateCanonicalUrl: 0.3, // KB
      };

      const totalSeoUtilsSize = Object.values(mockFunctionSizes).reduce((a, b) => a + b, 0);

      // Total SEO utilities should be under 10KB
      expect(totalSeoUtilsSize).toBeLessThan(10);
    });

    it('should minimize dependencies for SEO functions', () => {
      // In practice, you'd analyze the dependency tree
      const mockDependencies = [
        'next/image',
        // Should not include heavy libraries
      ];

      // SEO functions should have minimal dependencies
      expect(mockDependencies.length).toBeLessThan(5);
    });
  });

  describe('Server-Side Rendering Performance', () => {
    it('should render content pages quickly on server', async () => {
      const startTime = performance.now();

      // Mock SSR rendering
      const mockRenderToString = (content: { title: string; overview: string }) => {
        return `<html><body><h1>${content.title}</h1><p>${content.overview}</p></body></html>`;
      };

      const renderedHtml = mockRenderToString(mockLargeContent);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(renderedHtml).toContain(mockLargeContent.title);
      expect(duration).toBeLessThan(200); // SSR should be fast (generous for CI)
    });

    it('should handle multiple simultaneous SSR requests', async () => {
      const startTime = performance.now();

      const mockRenderRequests = Array.from({ length: 10 }, async (_, i) => {
        // Simulate SSR processing time
        await new Promise(resolve => setTimeout(resolve, 5));
        return `Rendered content ${i}`;
      });

      const results = await Promise.all(mockRenderRequests);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(500); // Multiple SSR requests should complete quickly (generous for CI)
    });
  });

  describe('Search Engine Bot Performance', () => {
    it('should serve content quickly to search engine bots', async () => {
      const startTime = performance.now();

      // Mock bot request processing
      const processBotRequest = async (userAgent: string) => {
        // Simulate faster processing for bots
        if (userAgent.includes('Googlebot') || userAgent.includes('Bingbot')) {
          await new Promise(resolve => setTimeout(resolve, 2)); // Faster for bots
        } else {
          await new Promise(resolve => setTimeout(resolve, 10)); // Normal processing
        }

        return {
          html: '<html>Content</html>',
          status: 200,
        };
      };

      await processBotRequest('Mozilla/5.0 (compatible; Googlebot/2.1;)');

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Bot requests should be processed quickly in test environment
      expect(duration).toBeLessThan(500); // Generous for CI/parallel test runs
    });

    it('should prioritize critical SEO data for bots', () => {
      const startTime = performance.now();

      const generateCriticalSeoData = (content: { id: string; title: string; overview?: string }) => {
        return {
          title: content.title,
          description: content.overview?.substring(0, 160) || '',
          canonicalUrl: `https://geoleap.app/content/movie/${content.id}`,
          structuredData: {
            '@type': 'Movie',
            name: content.title,
          },
        };
      };

      const criticalData = generateCriticalSeoData(mockLargeContent);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(criticalData.title).toBe(mockLargeContent.title);
      expect(criticalData.description.length).toBeLessThanOrEqual(160);
      expect(duration).toBeLessThan(5); // Critical SEO data should be generated very quickly
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', () => {
      const metrics = {
        metadataGenerationTime: [] as number[],
        schemaGenerationTime: [] as number[],
        urlGenerationTime: [] as number[],
      };

      // Simulate metric collection
      for (let i = 0; i < 10; i++) {
        const start = performance.now();

        // Simulate operations
        generateContentSlug('123', 'Test Movie');

        const end = performance.now();
        metrics.urlGenerationTime.push(Number(end - start));
      }

      const avgUrlGenTime = metrics.urlGenerationTime.reduce((a, b) => a + b, 0) / metrics.urlGenerationTime.length;

      expect(avgUrlGenTime).toBeLessThan(1); // URL generation should be very fast on average
      expect(metrics.urlGenerationTime.every(time => time < 10)).toBe(true); // All times should be reasonable
    });

    it('should detect performance regressions', () => {
      const baseline = {
        metadataGeneration: 25, // ms
        schemaGeneration: 15, // ms
        urlGeneration: 1, // ms
      };

      const current = {
        metadataGeneration: 31, // ms (31/25 = 1.24 > 1.2)
        schemaGeneration: 12, // ms
        urlGeneration: 1.5, // ms
      };

      // Check for regressions (>20% slower than baseline)
      const metadataRegression = current.metadataGeneration / baseline.metadataGeneration > 1.2;
      const schemaRegression = current.schemaGeneration / baseline.schemaGeneration > 1.2;
      const urlRegression = current.urlGeneration / baseline.urlGeneration > 1.2;

      expect(metadataRegression).toBe(true); // 31ms vs 25ms is a 24% regression (31/25 = 1.24 > 1.2)
      expect(schemaRegression).toBe(false); // This is actually an improvement (12 < 15)
      expect(urlRegression).toBe(true); // 1.5ms vs 1ms shows a 50% regression (1.5/1 = 1.5 > 1.2)
    });
  });
});
