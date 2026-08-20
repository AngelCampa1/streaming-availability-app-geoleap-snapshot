/**
 * Performance Regression Testing Suite for SEO
 * Monitors performance metrics over time to prevent SEO ranking degradation
 * Focus: Detecting performance regressions that could impact search rankings
 */

const { test, expect } = require('@playwright/test');
const lighthouse = require('lighthouse');
const fs = require('fs');
const path = require('path');

// Performance baseline thresholds
const PERFORMANCE_BASELINES = {
  desktop: {
    lcp: 2500,    // Largest Contentful Paint (ms)
    fid: 100,     // First Input Delay (ms)
    cls: 0.1,     // Cumulative Layout Shift
    fcp: 1800,    // First Contentful Paint (ms)
    tti: 3800,    // Time to Interactive (ms)
    speedIndex: 3000,
    totalBlockingTime: 300
  },
  mobile: {
    lcp: 4000,
    fid: 100,
    cls: 0.1,
    fcp: 3000,
    tti: 5000,
    speedIndex: 4000,
    totalBlockingTime: 600
  }
};

const LIGHTHOUSE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: [
      'first-contentful-paint',
      'largest-contentful-paint',
      'first-meaningful-paint',
      'speed-index',
      'total-blocking-time',
      'max-potential-fid',
      'cumulative-layout-shift',
      'server-response-time'
    ]
  }
};

test.describe('Performance Regression Testing', () => {
  const testPages = [
    { path: '/', name: 'Homepage', critical: true },
    { path: '/search', name: 'Search Page', critical: true },
    { path: '/content/movie-123', name: 'Content Page', critical: true },
    { path: '/pricing', name: 'Pricing Page', critical: false }
  ];

  test.describe('Core Web Vitals Monitoring', () => {
    testPages.forEach(({ path, name, critical }) => {
      test(`should maintain Core Web Vitals for ${name}`, async ({ page, browserName }) => {
        const viewport = browserName === 'webkit' ? 'mobile' : 'desktop';
        const baselines = PERFORMANCE_BASELINES[viewport];
        
        if (viewport === 'mobile') {
          await page.setViewportSize({ width: 375, height: 667 });
        }

        await page.goto(path, { waitUntil: 'networkidle' });
        
        const vitals = await page.evaluate(async () => {
          return new Promise((resolve) => {
            const metrics = {};
            let metricsCount = 0;
            const expectedMetrics = 3;

            // LCP
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              if (entries.length > 0) {
                metrics.lcp = entries[entries.length - 1].startTime;
                metricsCount++;
                if (metricsCount === expectedMetrics) resolve(metrics);
              }
            }).observe({ entryTypes: ['largest-contentful-paint'] });

            // FID (simulated)
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              if (entries.length > 0) {
                const lastEntry = entries[entries.length - 1];
                metrics.fid = lastEntry.processingStart - lastEntry.startTime;
                metricsCount++;
                if (metricsCount === expectedMetrics) resolve(metrics);
              }
            }).observe({ entryTypes: ['first-input'] });

            // CLS
            let clsValue = 0;
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                  clsValue += entry.value;
                }
              }
              metrics.cls = clsValue;
            }).observe({ entryTypes: ['layout-shift'] });

            // Simulate user interaction for FID
            setTimeout(() => {
              document.body.click();
            }, 100);

            // Fallback timeout
            setTimeout(() => {
              metrics.cls = clsValue;
              resolve(metrics);
            }, 5000);
          });
        });

        // Assert against baselines
        if (vitals.lcp) {
          expect(vitals.lcp).toBeLessThan(baselines.lcp);
        }
        if (vitals.fid) {
          expect(vitals.fid).toBeLessThan(baselines.fid);
        }
        expect(vitals.cls).toBeLessThan(baselines.cls);

        // Store metrics for trend analysis
        await storePerformanceMetrics(name, viewport, vitals);
      });
    });
  });

  test.describe('Lighthouse Performance Audits', () => {
    testPages.forEach(({ path, name, critical }) => {
      test(`should pass Lighthouse performance audit for ${name}`, async ({ page }) => {
        // Run Lighthouse audit
        const lighthouseResult = await lighthouse(
          `http://localhost:3000${path}`,
          {
            port: new URL(page.context()._browser._options.wsEndpoint).port,
            output: 'json',
            logLevel: 'error'
          },
          LIGHTHOUSE_CONFIG
        );

        const audits = lighthouseResult.lhr.audits;
        const performanceScore = lighthouseResult.lhr.categories.performance.score * 100;

        // Performance score thresholds
        const minScore = critical ? 85 : 75;
        expect(performanceScore).toBeGreaterThan(minScore);

        // Individual metric assertions
        const fcp = audits['first-contentful-paint'].numericValue;
        const lcp = audits['largest-contentful-paint'].numericValue;
        const cls = audits['cumulative-layout-shift'].numericValue;
        const tbt = audits['total-blocking-time'].numericValue;

        expect(fcp).toBeLessThan(PERFORMANCE_BASELINES.desktop.fcp);
        expect(lcp).toBeLessThan(PERFORMANCE_BASELINES.desktop.lcp);
        expect(cls).toBeLessThan(PERFORMANCE_BASELINES.desktop.cls);
        expect(tbt).toBeLessThan(PERFORMANCE_BASELINES.desktop.totalBlockingTime);

        // Store Lighthouse results
        await storeLighthouseResults(name, lighthouseResult.lhr);
      });
    });
  });

  test.describe('Resource Loading Performance', () => {
    test('should maintain efficient resource loading', async ({ page }) => {
      const resourceMetrics = [];
      
      page.on('response', response => {
        resourceMetrics.push({
          url: response.url(),
          status: response.status(),
          size: response.headers()['content-length'] || 0,
          type: response.request().resourceType(),
          timing: {
            startTime: response.timing().startTime,
            responseTime: response.timing().responseEnd
          }
        });
      });

      await page.goto('/', { waitUntil: 'networkidle' });

      const analysis = analyzeResourceMetrics(resourceMetrics);

      // Assert resource loading efficiency
      expect(analysis.totalRequests).toBeLessThan(50); // Reasonable request count
      expect(analysis.totalSize).toBeLessThan(3000000); // < 3MB total
      expect(analysis.slowestResource.timing).toBeLessThan(5000); // No resource > 5s
      expect(analysis.failed.length).toBe(0); // No failed requests

      // Check for render-blocking resources
      const renderBlocking = resourceMetrics.filter(resource => 
        resource.type === 'stylesheet' || 
        (resource.type === 'script' && !resource.url.includes('async'))
      );
      expect(renderBlocking.length).toBeLessThan(8); // Limit render-blocking resources
    });

    test('should optimize image loading performance', async ({ page }) => {
      await page.goto('/');

      const imageMetrics = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.map(img => ({
          src: img.src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          displayWidth: img.offsetWidth,
          displayHeight: img.offsetHeight,
          loading: img.loading,
          decoded: img.complete && img.naturalHeight !== 0
        }));
      });

      // Image optimization checks
      const oversizedImages = imageMetrics.filter(img => 
        img.naturalWidth > img.displayWidth * 2 || 
        img.naturalHeight > img.displayHeight * 2
      );
      expect(oversizedImages.length).toBeLessThan(2); // Few oversized images

      const lazyImages = imageMetrics.filter(img => img.loading === 'lazy');
      const eagerImages = imageMetrics.filter(img => img.loading === 'eager' || !img.loading);
      
      // Most images should be lazy loaded
      if (imageMetrics.length > 3) {
        expect(lazyImages.length).toBeGreaterThan(eagerImages.length * 0.5);
      }
    });
  });

  test.describe('JavaScript Performance', () => {
    test('should maintain efficient JavaScript execution', async ({ page }) => {
      await page.goto('/search');

      const jsMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource')
          .filter(r => r.initiatorType === 'script');

        return {
          domInteractive: navigation.domInteractive,
          domContentLoaded: navigation.domContentLoadedEventEnd,
          loadComplete: navigation.loadEventEnd,
          scriptCount: resources.length,
          scriptTransferSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
          largestScript: Math.max(...resources.map(r => r.transferSize || 0))
        };
      });

      expect(jsMetrics.domInteractive).toBeLessThan(2500);
      expect(jsMetrics.domContentLoaded).toBeLessThan(3500);
      expect(jsMetrics.scriptTransferSize).toBeLessThan(800000); // < 800KB total JS
      expect(jsMetrics.largestScript).toBeLessThan(300000); // No single script > 300KB
    });

    test('should prevent long tasks that block main thread', async ({ page }) => {
      await page.goto('/');

      const longTasks = await page.evaluate(() => {
        return new Promise((resolve) => {
          const tasks = [];
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              tasks.push({
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name
              });
            }
          }).observe({ entryTypes: ['longtask'] });

          setTimeout(() => resolve(tasks), 5000);
        });
      });

      const totalBlockingTime = longTasks.reduce((sum, task) => sum + task.duration, 0);
      expect(totalBlockingTime).toBeLessThan(600); // < 600ms TBT

      // Individual long tasks should be reasonable
      const excessiveTasks = longTasks.filter(task => task.duration > 200);
      expect(excessiveTasks.length).toBeLessThan(3);
    });
  });

  test.describe('Memory Usage Monitoring', () => {
    test('should maintain reasonable memory usage', async ({ page }) => {
      await page.goto('/');

      const initialMemory = await page.evaluate(() => {
        return performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        } : null;
      });

      if (initialMemory) {
        // Simulate user interactions to stress test memory
        await page.click('input[type="search"], input[name="search"]');
        await page.type('input[type="search"], input[name="search"]', 'test query');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        const finalMemory = await page.evaluate(() => {
          return performance.memory ? {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          } : null;
        });

        const memoryIncrease = finalMemory.used - initialMemory.used;
        expect(memoryIncrease).toBeLessThan(10000000); // < 10MB increase
        expect(finalMemory.used / finalMemory.limit).toBeLessThan(0.5); // < 50% of limit
      }
    });
  });

  test.describe('Performance Trend Analysis', () => {
    test('should not degrade over time', async ({ page }) => {
      const currentMetrics = await runPerformanceTest(page, '/');
      const historicalMetrics = await getHistoricalMetrics('/');

      if (historicalMetrics.length > 0) {
        const baseline = calculateBaseline(historicalMetrics);
        
        // Check for significant regressions (> 20% increase)
        const regressions = [];
        
        if (currentMetrics.lcp > baseline.lcp * 1.2) {
          regressions.push(`LCP increased by ${((currentMetrics.lcp / baseline.lcp - 1) * 100).toFixed(1)}%`);
        }
        
        if (currentMetrics.fcp > baseline.fcp * 1.2) {
          regressions.push(`FCP increased by ${((currentMetrics.fcp / baseline.fcp - 1) * 100).toFixed(1)}%`);
        }
        
        if (currentMetrics.cls > baseline.cls * 1.5) {
          regressions.push(`CLS increased by ${((currentMetrics.cls / baseline.cls - 1) * 100).toFixed(1)}%`);
        }

        expect(regressions).toEqual([]);
      }
    });
  });
});

// Helper Functions

async function runPerformanceTest(page, path) {
  await page.goto(path, { waitUntil: 'networkidle' });
  
  return await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    return {
      fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      lcp: 0, // Would need PerformanceObserver in real implementation
      cls: 0, // Would need PerformanceObserver in real implementation
      domContentLoaded: navigation.domContentLoadedEventEnd,
      loadComplete: navigation.loadEventEnd
    };
  });
}

function analyzeResourceMetrics(resources) {
  const analysis = {
    totalRequests: resources.length,
    totalSize: resources.reduce((sum, r) => sum + Number(r.size), 0),
    byType: {},
    failed: resources.filter(r => r.status >= 400),
    slowestResource: resources.reduce((slowest, current) => 
      current.timing.responseTime > slowest.timing.responseTime ? current : slowest,
      resources[0] || { timing: { responseTime: 0 } }
    )
  };

  resources.forEach(resource => {
    if (!analysis.byType[resource.type]) {
      analysis.byType[resource.type] = { count: 0, size: 0 };
    }
    analysis.byType[resource.type].count++;
    analysis.byType[resource.type].size += Number(resource.size);
  });

  return analysis;
}

async function storePerformanceMetrics(pageName, viewport, metrics) {
  const dataDir = path.join(__dirname, 'performance-data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const filename = path.join(dataDir, `${pageName.toLowerCase().replace(' ', '-')}-${viewport}.json`);
  let history = [];
  
  try {
    if (fs.existsSync(filename)) {
      history = JSON.parse(fs.readFileSync(filename, 'utf8'));
    }
  } catch (error) {
    console.warn('Error reading performance history:', error);
  }

  history.push({
    timestamp: new Date().toISOString(),
    metrics
  });

  // Keep only last 50 measurements
  if (history.length > 50) {
    history = history.slice(-50);
  }

  fs.writeFileSync(filename, JSON.stringify(history, null, 2));
}

async function storeLighthouseResults(pageName, results) {
  const dataDir = path.join(__dirname, 'lighthouse-data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const filename = path.join(dataDir, `${pageName.toLowerCase().replace(' ', '-')}-lighthouse.json`);
  let history = [];
  
  try {
    if (fs.existsSync(filename)) {
      history = JSON.parse(fs.readFileSync(filename, 'utf8'));
    }
  } catch (error) {
    console.warn('Error reading lighthouse history:', error);
  }

  history.push({
    timestamp: new Date().toISOString(),
    score: results.categories.performance.score,
    audits: {
      fcp: results.audits['first-contentful-paint'].numericValue,
      lcp: results.audits['largest-contentful-paint'].numericValue,
      cls: results.audits['cumulative-layout-shift'].numericValue,
      tbt: results.audits['total-blocking-time'].numericValue
    }
  });

  if (history.length > 30) {
    history = history.slice(-30);
  }

  fs.writeFileSync(filename, JSON.stringify(history, null, 2));
}

async function getHistoricalMetrics(pagePath) {
  const dataDir = path.join(__dirname, 'performance-data');
  const filename = path.join(dataDir, `${pagePath.replace('/', 'homepage')}-desktop.json`);
  
  try {
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename, 'utf8'));
    }
  } catch (error) {
    console.warn('Error reading historical metrics:', error);
  }
  
  return [];
}

function calculateBaseline(historicalMetrics) {
  const recentMetrics = historicalMetrics.slice(-10); // Last 10 measurements
  const baseline = {};
  
  if (recentMetrics.length === 0) return {};
  
  ['lcp', 'fcp', 'cls'].forEach(metric => {
    const values = recentMetrics.map(m => m.metrics[metric]).filter(Boolean);
    if (values.length > 0) {
      baseline[metric] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }
  });
  
  return baseline;
}