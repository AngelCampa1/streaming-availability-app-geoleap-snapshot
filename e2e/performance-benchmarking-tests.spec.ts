import { test, expect } from '@playwright/test';
import {
  generateRandomEmail,
  generateTestPassword,
  waitForElementToBeVisible,
  waitForTextToBeVisible,
  waitForUrlToContain,
  safeClick,
  safeFill,
  navigateToHome,
  waitForNetworkIdle,
  waitForPageLoad
} from './utils/test-helpers';

test.describe('Performance Benchmarking Tests - Production Ready', () => {
  let userEmail: string;
  let userPassword: string;

  test.beforeEach(async () => {
    userEmail = generateRandomEmail();
    userPassword = generateTestPassword();
  });

  test('should meet page load performance benchmarks', async ({ page }) => {
    // Step 1: Test homepage load performance
    const startTime = Date.now();
    const response = await page.goto('http://localhost:3020', { timeout: 15000 });
    const loadTime = Date.now() - startTime;

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step 2: Check Core Web Vitals metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals: Record<string, number> = {};

          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              vitals.domContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart;
              vitals.loadComplete = navEntry.loadEventEnd - navEntry.loadEventStart;
              vitals.firstPaint = performance.getEntriesByName('first-paint')[0]?.startTime || 0;
              vitals.firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0;
            }
          });

          resolve(vitals);
        });

        observer.observe({ entryTypes: ['navigation'] });

        // Fallback timeout
        setTimeout(() => {
          observer.disconnect();
          resolve({});
        }, 5000);
      });
    });

    // Step 3: Test other key pages
    const pageLoadTimes: Record<string, number> = {};

    const keyPages = [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Search', url: '/search' },
      { name: 'Login', url: '/auth/login' },
      { name: 'Register', url: '/auth/register' }
    ];

    for (const pageData of keyPages) {
      const pageStartTime = Date.now();
      await page.goto(`http://localhost:3020${pageData.url}`, { timeout: 15000 });
      await page.waitForLoadState('networkidle');
      pageLoadTimes[pageData.name] = Date.now() - pageStartTime;
    }

    // Step 4: Check resource loading performance
    const resourceMetrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return {
        totalResources: resources.length,
        totalSize: resources.reduce((acc, resource) => {
          return acc + (resource.transferSize || 0);
        }, 0),
        imageCount: resources.filter(r => r.initiatorType === 'img').length,
        scriptCount: resources.filter(r => r.initiatorType === 'script').length,
        cssCount: resources.filter(r => r.initiatorType === 'link').length
      };
    });

    // Step 5: Performance assertions
    expect(loadTime).toBeLessThan(5000); // Homepage should load in under 5 seconds
    expect(metrics.firstContentfulPaint || 0).toBeLessThan(3000); // FCP under 3 seconds
    expect(metrics.domContentLoaded || 0).toBeLessThan(4000); // DOM content loaded under 4 seconds

    // Individual pages should load reasonably fast
    Object.values(pageLoadTimes).forEach(time => {
      expect(time).toBeLessThan(6000); // Each page under 6 seconds
    });

    console.log(`Homepage load time: ${loadTime}ms`);
    console.log(`First Contentful Paint: ${metrics.firstContentfulPaint}ms`);
    console.log(`DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log('Page load times:', pageLoadTimes);
    console.log('Resource metrics:', resourceMetrics);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    // Step 1: Navigate to search page
    await page.goto('http://localhost:3020/search', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Step 2: Perform search that returns many results
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 })) {
      const startTime = Date.now();
      await searchInput.fill('movie');
      await searchInput.press('Enter');

      await page.waitForTimeout(3000); // Wait for results
      const searchTime = Date.now() - startTime;

      // Step 3: Test rendering performance with many results
      const renderStartTime = Date.now();
      await page.waitForSelector('[data-testid="search-results"], .search-results, .results', { timeout: 10000 });
      const renderTime = Date.now() - renderStartTime;

      // Step 4: Test scrolling performance
      const resultsContainer = page.locator('[data-testid="search-results"], .search-results, .results').first();
      if (await resultsContainer.isVisible({ timeout: 3000 })) {
        const scrollStartTime = Date.now();

        // Simulate rapid scrolling
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('PageDown');
          await page.waitForTimeout(100);
        }

        const scrollTime = Date.now() - scrollStartTime;

        console.log(`Search performance: ${searchTime}ms`);
        console.log(`Render performance: ${renderTime}ms`);
        console.log(`Scroll performance: ${scrollTime}ms`);

        // Performance assertions
        expect(searchTime).toBeLessThan(5000); // Search under 5 seconds
        expect(renderTime).toBeLessThan(3000); // Render under 3 seconds
        expect(scrollTime).toBeLessThan(3000); // Scrolling under 3 seconds
      }
    }

    // Step 5: Test infinite scroll or pagination performance
    await page.goto('http://localhost:3020/dashboard', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Look for paginated or infinite scroll content
    const pagination = page.locator('.pagination, [data-testid="pagination"]').first();
    const infiniteScroll = page.locator('[data-testid="infinite-scroll"], .infinite-scroll').first();

    if (await pagination.isVisible({ timeout: 3000 })) {
      // Test pagination performance
      const nextButton = page.locator('.pagination a:has-text("Next"), .pagination button:has-text("Next")').first();
      if (await nextButton.isVisible({ timeout: 3000 })) {
        const pageLoadStartTime = Date.now();
        await nextButton.click();
        await page.waitForTimeout(2000);
        const pageLoadTime = Date.now() - pageLoadStartTime;

        expect(pageLoadTime).toBeLessThan(3000); // Pagination under 3 seconds
        console.log(`Pagination load time: ${pageLoadTime}ms`);
      }
    } else if (await infiniteScroll.isVisible({ timeout: 3000 })) {
      // Test infinite scroll performance
      const scrollLoadStartTime = Date.now();

      // Scroll to trigger more content loading
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('End');
        await page.waitForTimeout(1000);
      }

      const scrollLoadTime = Date.now() - scrollLoadStartTime;

      expect(scrollLoadTime).toBeLessThan(8000); // Infinite scroll under 8 seconds
      console.log(`Infinite scroll load time: ${scrollLoadTime}ms`);
    }
  });

  test('should maintain performance under concurrent load', async ({ page, context }) => {
    // Step 1: Create multiple concurrent pages
    const concurrentPages = [];
    const performanceMetrics: Array<{ pageId: number; loadTime: number; memoryUsage: number }> = [];

    for (let i = 0; i < 3; i++) {
      const newPage = await context.newPage();
      concurrentPages.push(newPage);

      const startTime = Date.now();
      await newPage.goto('http://localhost:3020/dashboard', { timeout: 15000 });
      await newPage.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Get memory usage if available
      const memoryUsage = await newPage.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      performanceMetrics.push({ pageId: i, loadTime, memoryUsage });
    }

    // Step 2: Analyze concurrent performance
    const averageLoadTime = performanceMetrics.reduce((sum, metric) => sum + metric.loadTime, 0) / performanceMetrics.length;
    const maxLoadTime = Math.max(...performanceMetrics.map(m => m.loadTime));
    const totalMemoryUsage = performanceMetrics.reduce((sum, metric) => sum + metric.memoryUsage, 0);

    // Step 3: Test concurrent interactions
    const interactionPromises = concurrentPages.map(async (page, index) => {
      try {
        await page.goto('http://localhost:3020/search', { timeout: 15000 });
        await page.waitForLoadState('networkidle');

        const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first();
        if (await searchInput.isVisible({ timeout: 3000 })) {
          await searchInput.fill(`concurrent search ${index}`);
          await searchInput.press('Enter');
          await page.waitForTimeout(2000);
        }

        return { pageId: index, success: true };
      } catch (error) {
        return { pageId: index, success: false, error };
      }
    });

    const interactionResults = await Promise.all(interactionPromises);
    const successfulInteractions = interactionResults.filter(result => result.success).length;

    // Step 4: Clean up pages
    for (const page of concurrentPages) {
      await page.close();
    }

    // Performance assertions
    expect(averageLoadTime).toBeLessThan(8000); // Average load under 8 seconds
    expect(maxLoadTime).toBeLessThan(12000); // Max load under 12 seconds
    expect(successfulInteractions).toBeGreaterThanOrEqual(2); // At least 2/3 interactions successful

    console.log(`Concurrent pages average load time: ${averageLoadTime}ms`);
    console.log(`Maximum load time: ${maxLoadTime}ms`);
    console.log(`Total memory usage: ${(totalMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Successful interactions: ${successfulInteractions}/3`);
  });

  test('should optimize memory usage and prevent leaks', async ({ page }) => {
    // Step 1: Get initial memory usage
    await page.goto('http://localhost:3020', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        return {
          used: mem.usedJSHeapSize,
          total: mem.totalJSHeapSize,
          limit: mem.jsHeapSizeLimit
        };
      }
      return { used: 0, total: 0, limit: 0 };
    });

    // Step 2: Perform memory-intensive operations
    const operations = [
      () => page.goto('http://localhost:3020/search', { timeout: 10000 }),
      () => page.evaluate(() => {
        // Create some objects to test memory
        const largeArray = new Array(1000).fill(0).map((_, i) => ({ id: i, data: 'test'.repeat(100) }));
        return largeArray.length;
      }),
      () => page.goto('http://localhost:3020/dashboard', { timeout: 10000 }),
      () => page.evaluate(() => {
        // Simulate DOM manipulation
        for (let i = 0; i < 100; i++) {
          const div = document.createElement('div');
          div.innerHTML = `Test content ${i}`;
          document.body.appendChild(div);
        }
        return document.querySelectorAll('div').length;
      })
    ];

    // Perform operations and track memory
    const memorySnapshots = [{ ...initialMemory, operation: 'initial' }];

    for (let i = 0; i < operations.length; i++) {
      await operations[i]();
      await page.waitForTimeout(1000);

      const currentMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          const mem = (performance as any).memory;
          return {
            used: mem.usedJSHeapSize,
            total: mem.totalJSHeapSize,
            limit: mem.jsHeapSizeLimit
          };
        }
        return { used: 0, total: 0, limit: 0 };
      });

      memorySnapshots.push({ ...currentMemory, operation: `operation-${i + 1}` });
    }

    // Step 3: Force garbage collection if available
    await page.evaluate(() => {
      if ('gc' in window) {
        (window as any).gc();
      }
    });

    await page.waitForTimeout(2000);

    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        return {
          used: mem.usedJSHeapSize,
          total: mem.totalJSHeapSize,
          limit: mem.jsHeapSizeLimit
        };
      }
      return { used: 0, total: 0, limit: 0 };
    });

    // Step 4: Analyze memory usage
    const memoryIncrease = finalMemory.used - initialMemory.used;
    const memoryIncreasePercent = (memoryIncrease / initialMemory.used) * 100;
    const maxMemoryUsed = Math.max(...memorySnapshots.map(s => s.used));
    const memoryLeakDetected = memoryIncreasePercent > 100; // More than 100% increase suggests leak

    // Step 5: Test long-running session
    const longRunningStartTime = Date.now();

    // Simulate user activity over time
    for (let i = 0; i < 10; i++) {
      await page.goto('http://localhost:3020/search', { timeout: 10000 });
      await page.waitForTimeout(500);
      await page.goto('http://localhost:3020/dashboard', { timeout: 10000 });
      await page.waitForTimeout(500);
    }

    const longRunningTime = Date.now() - longRunningStartTime;
    const longRunningMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    const longRunningMemoryIncrease = longRunningMemory - initialMemory.used;
    const longRunningMemoryIncreasePercent = (longRunningMemoryIncrease / initialMemory.used) * 100;

    console.log(`Initial memory: ${(initialMemory.used / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Final memory: ${(finalMemory.used / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(1)}%)`);
    console.log(`Long-running session memory increase: ${(longRunningMemoryIncrease / 1024 / 1024).toFixed(2)}MB (${longRunningMemoryIncreasePercent.toFixed(1)}%)`);
    console.log(`Max memory used: ${(maxMemoryUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Long-running session time: ${longRunningTime}ms`);

    // Performance assertions
    expect(memoryIncreasePercent).toBeLessThan(200); // Memory increase under 200%
    expect(longRunningMemoryIncreasePercent).toBeLessThan(300); // Long running under 300%
    expect(longRunningTime).toBeLessThan(30000); // Session under 30 seconds

    console.log(`Memory leak detected: ${memoryLeakDetected}`);
    expect(!memoryLeakDetected).toBe(true);
  });

  test('should maintain responsive UI during heavy operations', async ({ page }) => {
    // Step 1: Navigate to a page with interactive elements
    await page.goto('http://localhost:3020/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Step 2: Test UI responsiveness during operations
    const responsivenessTests = [
      {
        name: 'Navigation during load',
        action: async () => {
          const navPromise = page.goto('http://localhost:3020/search', { timeout: 15000 });

          // Try to interact while page is loading
          setTimeout(async () => {
            const buttons = page.locator('button').first();
            if (await buttons.isVisible({ timeout: 1000 }).catch(() => false)) {
              await buttons.hover();
            }
          }, 500);

          await navPromise;
        }
      },
      {
        name: 'Form interaction during API calls',
        action: async () => {
          await page.goto('http://localhost:3020/auth/register', { timeout: 10000 });

          // Start filling form while page loads
          const fillPromise = safeFill(page, '#first-name, input[name="firstName"]', 'Test User');

          // Try to interact with other elements
          const buttons = page.locator('button').first();
          if (await buttons.isVisible({ timeout: 1000 }).catch(() => false)) {
            await buttons.hover();
          }

          await fillPromise;
        }
      },
      {
        name: 'Scrolling during content loading',
        action: async () => {
          await page.goto('http://localhost:3020/search', { timeout: 10000 });

          const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first();
          if (await searchInput.isVisible({ timeout: 3000 })) {
            await searchInput.fill('test');
            await searchInput.press('Enter');

            // Scroll while results load
            for (let i = 0; i < 5; i++) {
              await page.keyboard.press('ArrowDown');
              await page.waitForTimeout(100);
            }
          }
        }
      }
    ];

    // Step 3: Measure responsiveness
    const responsivenessResults = [];

    for (const test of responsivenessTests) {
      const startTime = Date.now();

      try {
        await test.action();
        const responseTime = Date.now() - startTime;

        // Check if page is still responsive
        const isResponsive = await page.evaluate(() => {
          return document.readyState === 'complete' &&
                 !document.querySelector('.loading, .spinner, [data-testid="loading"]');
        });

        responsivenessResults.push({
          test: test.name,
          responseTime,
          responsive: isResponsive
        });
      } catch (error) {
        responsivenessResults.push({
          test: test.name,
          responseTime: Date.now() - startTime,
          responsive: false,
          error
        });
      }
    }

    // Step 4: Test animation performance
    await page.goto('http://localhost:3020', { timeout: 10000 });

    const animationPerformance = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frameCount = 0;
        let startTime = performance.now();

        function countFrames() {
          frameCount++;
          const currentTime = performance.now();

          if (currentTime - startTime >= 2000) { // Test for 2 seconds
            const fps = frameCount / 2; // frames per second
            resolve({ fps, frameCount });
          } else {
            requestAnimationFrame(countFrames);
          }
        }

        requestAnimationFrame(countFrames);
      });
    });

    // Step 5: Test input responsiveness
    await page.goto('http://localhost:3020/search', { timeout: 10000 });

    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first();
    let inputResponsiveness = 0;

    if (await searchInput.isVisible({ timeout: 3000 })) {
      const inputStartTime = Date.now();
      await searchInput.click();
      await searchInput.fill('test input responsiveness');
      inputResponsiveness = Date.now() - inputStartTime;
    }

    console.log('Responsiveness test results:', responsivenessResults);
    console.log(`Animation performance: ${animationPerformance.fps} FPS`);
    console.log(`Input responsiveness: ${inputResponsiveness}ms`);

    // Performance assertions
    const avgResponseTime = responsivenessResults.reduce((sum, result) => sum + result.responseTime, 0) / responsivenessResults.length;
    const responsiveTests = responsivenessResults.filter(result => result.responsive).length;

    expect(avgResponseTime).toBeLessThan(5000); // Average response under 5 seconds
    expect(responsiveTests).toBeGreaterThanOrEqual(2); // At least 2/3 tests responsive
    expect(animationPerformance.fps).toBeGreaterThan(30); // At least 30 FPS
    expect(inputResponsiveness).toBeLessThan(1000); // Input response under 1 second

    console.log(`Average response time: ${avgResponseTime}ms`);
    console.log(`Responsive tests: ${responsiveTests}/${responsivenessResults.length}`);
  });

  test('should optimize resource loading and caching', async ({ page }) => {
    // Step 1: Clear cache and load page first time
    await page.context().clearCookies();
    await page.goto('http://localhost:3020', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const firstLoadMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        resourceCount: resources.length,
        cachedResources: resources.filter(r => (r.transferSize || 0) === 0).length,
        totalTransferSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
        imageResources: resources.filter(r => r.initiatorType === 'img').length,
        scriptResources: resources.filter(r => r.initiatorType === 'script').length,
        cssResources: resources.filter(r => r.initiatorType === 'link').length
      };
    });

    // Step 2: Load page again to test caching
    const cachedLoadStartTime = Date.now();
    await page.goto('http://localhost:3020', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    const cachedLoadTime = Date.now() - cachedLoadStartTime;

    const secondLoadMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        resourceCount: resources.length,
        cachedResources: resources.filter(r => (r.transferSize || 0) === 0).length,
        totalTransferSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
      };
    });

    // Step 3: Test Service Worker caching if available
    const serviceWorkerSupported = await page.evaluate(() => 'serviceWorker' in navigator);
    let serviceWorkerActive = false;

    if (serviceWorkerSupported) {
      serviceWorkerActive = await page.evaluate(() => {
        return navigator.serviceWorker.getRegistration().then(registration => !!registration);
      });
    }

    // Step 4: Test resource optimization
    await page.goto('http://localhost:3020/search', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const searchPageMetrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      return {
        totalResources: resources.length,
        gzipEnabled: resources.some(r => r.responseHeaders?.some(h => h.name.toLowerCase().includes('content-encoding') && h.value.includes('gzip'))),
        minifiedJS: resources.filter(r => r.initiatorType === 'script' && r.name.includes('.min.')).length,
        minifiedCSS: resources.filter(r => r.initiatorType === 'link' && r.name.includes('.min.')).length,
        imageOptimization: resources.filter(r => r.initiatorType === 'img' && (r.name.includes('.webp') || r.name.includes('.avif'))).length
      };
    });

    // Step 5: Test lazy loading
    const lazyLoadingTest = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const imagesWithLoading = Array.from(images).filter(img => img.hasAttribute('loading'));
      const intersectionObserver = 'IntersectionObserver' in window;

      return {
        totalImages: images.length,
        lazyLoadedImages: imagesWithLoading.length,
        intersectionObserverSupported: intersectionObserver
      };
    });

    const cacheImprovement = firstLoadMetrics.totalTransferSize - secondLoadMetrics.totalTransferSize;
    const cacheImprovementPercent = (cacheImprovement / firstLoadMetrics.totalTransferSize) * 100;

    console.log('First load metrics:', firstLoadMetrics);
    console.log('Second load metrics:', secondLoadMetrics);
    console.log(`Cached load time: ${cachedLoadTime}ms`);
    console.log(`Cache improvement: ${(cacheImprovement / 1024).toFixed(2)}KB (${cacheImprovementPercent.toFixed(1)}%)`);
    console.log('Service Worker:', { supported: serviceWorkerSupported, active: serviceWorkerActive });
    console.log('Search page metrics:', searchPageMetrics);
    console.log('Lazy loading:', lazyLoadingTest);

    // Performance assertions
    expect(cachedLoadTime).toBeLessThan(firstLoadMetrics.domContentLoaded); // Cached should be faster
    expect(cacheImprovementPercent).toBeGreaterThan(10); // At least 10% improvement
    expect(secondLoadMetrics.cachedResources).toBeGreaterThan(firstLoadMetrics.cachedResources); // More resources cached

    // Test passes if basic caching is working
    expect(cacheImprovementPercent > 0 || serviceWorkerActive).toBe(true);
  });
});