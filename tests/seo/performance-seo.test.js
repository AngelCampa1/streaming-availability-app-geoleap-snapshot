/**
 * Performance SEO Testing Suite
 * Tests Core Web Vitals, page speed, and performance metrics that impact SEO
 * Focus: Ensuring pages meet Google's performance requirements for search ranking
 */

const { chromium } = require('playwright');
const lighthouse = require('lighthouse');

describe('Performance SEO Tests', () => {
  let browser, page;
  
  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Core Web Vitals', () => {
    test('should meet LCP (Largest Contentful Paint) requirements', async () => {
      await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
      
      const lcpMetric = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry?.startTime || 0);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Fallback timeout
          setTimeout(() => resolve(0), 5000);
        });
      });

      expect(lcpMetric).toBeLessThan(2500); // Good LCP is < 2.5s
    });

    test('should meet FID (First Input Delay) requirements', async () => {
      await page.goto('http://localhost:3000/search');
      
      const fidMetric = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry?.processingStart - lastEntry?.startTime || 0);
          }).observe({ entryTypes: ['first-input'] });
          
          // Simulate user interaction
          document.body.click();
          
          setTimeout(() => resolve(0), 3000);
        });
      });

      expect(fidMetric).toBeLessThan(100); // Good FID is < 100ms
    });

    test('should meet CLS (Cumulative Layout Shift) requirements', async () => {
      await page.goto('http://localhost:3000/');
      
      const clsMetric = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;
          
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
          }).observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => resolve(clsValue), 3000);
        });
      });

      expect(clsMetric).toBeLessThan(0.1); // Good CLS is < 0.1
    });
  });

  describe('Page Load Performance', () => {
    test('should load main pages within performance budgets', async () => {
      const testPages = [
        { path: '/', maxLoadTime: 3000 },
        { path: '/search', maxLoadTime: 3500 },
        { path: '/content/movie-123', maxLoadTime: 4000 },
        { path: '/pricing', maxLoadTime: 2500 }
      ];

      for (const { path, maxLoadTime } of testPages) {
        const startTime = Date.now();
        await page.goto(`http://localhost:3000${path}`, { 
          waitUntil: 'domcontentloaded' 
        });
        const loadTime = Date.now() - startTime;

        expect(loadTime).toBeLessThan(maxLoadTime);
      }
    });

    test('should optimize resource loading', async () => {
      await page.goto('http://localhost:3000/');
      
      const resourceMetrics = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        const metrics = {
          totalResources: resources.length,
          totalSize: 0,
          largeResources: [],
          slowResources: []
        };

        resources.forEach(resource => {
          const size = resource.transferSize || 0;
          const duration = resource.responseEnd - resource.startTime;
          
          metrics.totalSize += size;
          
          if (size > 500000) { // > 500KB
            metrics.largeResources.push({
              name: resource.name,
              size: size
            });
          }
          
          if (duration > 2000) { // > 2s
            metrics.slowResources.push({
              name: resource.name,
              duration: duration
            });
          }
        });

        return metrics;
      });

      expect(resourceMetrics.largeResources.length).toBeLessThan(3);
      expect(resourceMetrics.slowResources.length).toBeLessThan(2);
      expect(resourceMetrics.totalSize).toBeLessThan(5000000); // < 5MB total
    });
  });

  describe('Image Optimization', () => {
    test('should use optimized image formats and sizes', async () => {
      await page.goto('http://localhost:3000/');
      
      const imageMetrics = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const metrics = {
          total: images.length,
          withAlt: 0,
          withLazyLoad: 0,
          optimizedFormats: 0,
          problematicImages: []
        };

        images.forEach(img => {
          if (img.alt) metrics.withAlt++;
          if (img.loading === 'lazy') metrics.withLazyLoad++;
          
          const src = img.src.toLowerCase();
          if (src.includes('.webp') || src.includes('.avif')) {
            metrics.optimizedFormats++;
          }
          
          if (img.naturalWidth > 2000 || img.naturalHeight > 2000) {
            metrics.problematicImages.push({
              src: img.src,
              width: img.naturalWidth,
              height: img.naturalHeight
            });
          }
        });

        return metrics;
      });

      expect(imageMetrics.withAlt / imageMetrics.total).toBeGreaterThan(0.9); // 90% have alt text
      expect(imageMetrics.withLazyLoad / imageMetrics.total).toBeGreaterThan(0.7); // 70% lazy loaded
      expect(imageMetrics.problematicImages.length).toBeLessThan(2); // Few oversized images
    });
  });

  describe('Mobile Performance', () => {
    test('should perform well on mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
      
      const mobileMetrics = await page.evaluate(() => {
        const paint = performance.getEntriesByType('paint');
        const fcp = paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0;
        
        return {
          firstContentfulPaint: fcp,
          domElements: document.querySelectorAll('*').length,
          viewportWidth: window.innerWidth
        };
      });

      expect(mobileMetrics.firstContentfulPaint).toBeLessThan(2000); // < 2s FCP on mobile
      expect(mobileMetrics.domElements).toBeLessThan(1500); // Not too DOM-heavy
      expect(mobileMetrics.viewportWidth).toBe(375); // Proper viewport
    });

    test('should handle touch interactions efficiently', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/search');
      
      // Test touch interaction performance
      const searchInput = await page.$('input[type="search"], input[name="search"], #search');
      if (searchInput) {
        const startTime = Date.now();
        await searchInput.tap();
        await searchInput.type('test query');
        const interactionTime = Date.now() - startTime;
        
        expect(interactionTime).toBeLessThan(500); // Quick response to touch
      }
    });
  });

  describe('JavaScript Performance', () => {
    test('should have efficient JavaScript execution', async () => {
      await page.goto('http://localhost:3000/');
      
      const jsMetrics = await page.evaluate(() => {
        const navEntries = performance.getEntriesByType('navigation')[0];
        return {
          domInteractive: navEntries.domInteractive,
          domContentLoaded: navEntries.domContentLoadedEventEnd,
          loadComplete: navEntries.loadEventEnd
        };
      });

      expect(jsMetrics.domInteractive).toBeLessThan(2000);
      expect(jsMetrics.domContentLoaded).toBeLessThan(3000);
      expect(jsMetrics.loadComplete).toBeLessThan(5000);
    });

    test('should minimize main thread blocking', async () => {
      await page.goto('http://localhost:3000/');
      
      const longTasks = await page.evaluate(() => {
        return new Promise((resolve) => {
          const tasks = [];
          
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              tasks.push({
                duration: entry.duration,
                startTime: entry.startTime
              });
            }
          }).observe({ entryTypes: ['longtask'] });
          
          setTimeout(() => resolve(tasks), 3000);
        });
      });

      const blockedTime = longTasks.reduce((total, task) => total + task.duration, 0);
      expect(blockedTime).toBeLessThan(500); // < 500ms total blocking time
    });
  });

  describe('Caching and Compression', () => {
    test('should implement proper caching headers', async () => {
      const response = await page.goto('http://localhost:3000/');
      const headers = response.headers();
      
      // Check for caching headers
      const cacheControl = headers['cache-control'];
      const etag = headers['etag'];
      
      expect(cacheControl || etag).toBeTruthy(); // Some form of caching
    });

    test('should compress text resources', async () => {
      const response = await page.goto('http://localhost:3000/');
      const headers = response.headers();
      
      const contentEncoding = headers['content-encoding'];
      const contentType = headers['content-type'];
      
      if (contentType && contentType.includes('text/')) {
        expect(contentEncoding).toMatch(/gzip|br|deflate/);
      }
    });
  });

  describe('Third-Party Performance Impact', () => {
    test('should minimize third-party script impact', async () => {
      await page.goto('http://localhost:3000/');
      
      const thirdPartyMetrics = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        const currentDomain = location.hostname;
        
        const thirdParty = resources.filter(resource => {
          const url = new URL(resource.name);
          return url.hostname !== currentDomain;
        });

        return {
          count: thirdParty.length,
          totalTime: thirdParty.reduce((sum, r) => sum + (r.responseEnd - r.startTime), 0),
          largestDelay: Math.max(...thirdParty.map(r => r.responseEnd - r.startTime), 0)
        };
      });

      expect(thirdPartyMetrics.count).toBeLessThan(10); // Limit third-party requests
      expect(thirdPartyMetrics.largestDelay).toBeLessThan(3000); // No single slow third-party
    });
  });
});