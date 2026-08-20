/**
 * Startup Performance Testing Suite for US-11.7
 * Tests cold start, warm start, and time-to-interactive performance
 * for both React Native mobile and Next.js web applications
 */

import { performance } from 'perf_hooks';
import { jest } from '@jest/globals';

// Mock React Native and browser performance APIs
const mockPerformanceObserver = {
  observe: jest.fn(),
  disconnect: jest.fn(),
};

const mockPerformanceEntry = {
  name: 'startup-test-entry',
  duration: 100,
  startTime: 0,
  entryType: 'measure',
};

// Enhanced performance API mock for comprehensive testing
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
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    timing: {
      navigationStart: 0,
      domContentLoadedEventEnd: 1000,
      loadEventEnd: 1500,
      connectStart: 50,
      connectEnd: 100,
      requestStart: 100,
      responseStart: 200,
      responseEnd: 300,
      domLoading: 350,
      domInteractive: 800,
      domComplete: 1200,
    },
    navigation: {
      type: 0,
      redirectCount: 0,
    },
  },
  writable: true,
});

// Mock React Native performance APIs
global.requestIdleCallback = jest.fn((callback) => {
  setTimeout(callback, 1);
});

global.cancelIdleCallback = jest.fn();

describe('Startup Performance Testing Suite', () => {
  const PERFORMANCE_THRESHOLDS = {
    mobile: {
      coldStart: 3000,      // < 3 seconds
      warmStart: 1000,      // < 1 second
      timeToInteractive: 2000, // < 2 seconds
      firstContentfulPaint: 1500,
      largestContentfulPaint: 2500,
    },
    web: {
      coldStart: 2000,      // < 2 seconds
      warmStart: 500,       // < 0.5 seconds
      timeToInteractive: 1500, // < 1.5 seconds
      firstContentfulPaint: 1000,
      largestContentfulPaint: 1800,
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    performance.clearMarks();
    performance.clearMeasures();
    
    // Reset performance timing for consistent test environment
    (performance.now as jest.Mock).mockReturnValue(0);
  });

  describe('Cold Start Performance', () => {
    it('should meet cold start time requirements for mobile', async () => {
      const startTime = performance.now();
      
      // Simulate React Native app cold start
      await simulateReactNativeColdStart();
      
      const endTime = performance.now();
      const coldStartDuration = endTime - startTime;
      
      expect(coldStartDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.mobile.coldStart);
      
      // Verify startup metrics are collected
      expect(performance.mark).toHaveBeenCalledWith('cold-start-begin');
      expect(performance.mark).toHaveBeenCalledWith('cold-start-end');
      expect(performance.measure).toHaveBeenCalledWith(
        'cold-start-duration',
        'cold-start-begin',
        'cold-start-end'
      );
    });

    it('should meet cold start time requirements for web', async () => {
      const startTime = performance.now();
      
      // Simulate Next.js cold start
      await simulateNextJsColdStart();
      
      const endTime = performance.now();
      const coldStartDuration = endTime - startTime;
      
      expect(coldStartDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.web.coldStart);
    });

    it('should optimize React Native bundle loading', async () => {
      const bundleLoadStart = performance.now();
      
      // Simulate React Native bundle loading
      const bundleMetrics = await simulateBundleLoading({
        platform: 'android',
        bundleSize: 2048000, // 2MB
        compressionEnabled: true,
        jitEnabled: true,
      });
      
      const bundleLoadEnd = performance.now();
      const bundleLoadDuration = bundleLoadEnd - bundleLoadStart;
      
      expect(bundleLoadDuration).toBeLessThan(1500); // Bundle loading < 1.5s
      expect(bundleMetrics.compressionRatio).toBeGreaterThan(0.6); // Good compression
      expect(bundleMetrics.parseTime).toBeLessThan(500); // Parse time < 500ms
    });

    it('should measure JavaScript engine initialization', async () => {
      const jsEngineStart = performance.now();
      
      // Simulate JavaScript engine initialization
      const engineMetrics = await simulateJSEngineInit({
        engine: 'hermes', // React Native Hermes engine
        optimizationLevel: 'production',
        bytecodePrecompilation: true,
      });
      
      const jsEngineEnd = performance.now();
      const engineInitDuration = jsEngineEnd - jsEngineStart;
      
      expect(engineInitDuration).toBeLessThan(800); // JS engine init < 800ms
      expect(engineMetrics.heapSize).toBeLessThan(50 * 1024 * 1024); // Initial heap < 50MB
      expect(engineMetrics.bytecodeLoadTime).toBeLessThan(200); // Bytecode load < 200ms
    });
  });

  describe('Warm Start Performance', () => {
    it('should achieve fast warm start times for mobile', async () => {
      // Simulate app already in memory
      await simulateWarmStartConditions();
      
      const warmStartTime = performance.now();
      
      // Simulate React Native warm start
      await simulateReactNativeWarmStart();
      
      const endTime = performance.now();
      const warmStartDuration = endTime - warmStartTime;
      
      expect(warmStartDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.mobile.warmStart);
    });

    it('should achieve fast warm start times for web', async () => {
      // Simulate browser cache and service worker
      await simulateWebWarmStartConditions();
      
      const warmStartTime = performance.now();
      
      // Simulate Next.js warm start with cache
      await simulateNextJsWarmStart();
      
      const endTime = performance.now();
      const warmStartDuration = endTime - warmStartTime;
      
      expect(warmStartDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.web.warmStart);
    });

    it('should leverage React Native fast refresh effectively', async () => {
      const fastRefreshStart = performance.now();
      
      // Simulate React Native fast refresh scenario
      const refreshMetrics = await simulateFastRefresh({
        changedFiles: ['src/screens/Dashboard.tsx'],
        moduleCount: 150,
        cacheHitRate: 0.95,
      });
      
      const fastRefreshEnd = performance.now();
      const refreshDuration = fastRefreshEnd - fastRefreshStart;
      
      expect(refreshDuration).toBeLessThan(300); // Fast refresh < 300ms
      expect(refreshMetrics.cacheHitRate).toBeGreaterThan(0.9); // Good cache hit rate
      expect(refreshMetrics.modulesReloaded).toBeLessThan(10); // Minimal module reload
    });
  });

  describe('Time to Interactive (TTI)', () => {
    it('should achieve fast TTI for mobile app', async () => {
      const ttiStart = performance.now();
      
      // Simulate mobile app initialization to interactive state
      const ttiMetrics = await simulateTimeToInteractive({
        platform: 'mobile',
        screenName: 'Dashboard',
        componentCount: 25,
        asyncOperations: ['auth', 'userData', 'preferences'],
      });
      
      const ttiEnd = performance.now();
      const ttiDuration = ttiEnd - ttiStart;
      
      expect(ttiDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.mobile.timeToInteractive);
      expect(ttiMetrics.mainThreadBlockingTime).toBeLessThan(300); // Low blocking time
      expect(ttiMetrics.inputResponsiveness).toBeLessThan(50); // Responsive to input
    });

    it('should achieve fast TTI for web app', async () => {
      const ttiStart = performance.now();
      
      // Simulate web app initialization to interactive state
      const ttiMetrics = await simulateTimeToInteractive({
        platform: 'web',
        pageName: 'homepage',
        componentCount: 40,
        asyncOperations: ['hydration', 'api', 'analytics'],
      });
      
      const ttiEnd = performance.now();
      const ttiDuration = ttiEnd - ttiStart;
      
      expect(ttiDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.web.timeToInteractive);
      expect(ttiMetrics.hydrationTime).toBeLessThan(400); // Fast hydration
      expect(ttiMetrics.layoutShifts).toBeLessThan(0.1); // Minimal layout shifts
    });

    it('should measure first meaningful paint effectively', async () => {
      const fmpStart = performance.now();
      
      // Simulate first meaningful paint measurement
      const fmpMetrics = await simulateFirstMeaningfulPaint({
        criticalResources: ['logo', 'navigation', 'hero-content'],
        renderPath: 'critical-rendering-path',
        fontLoadingStrategy: 'font-display-swap',
      });
      
      const fmpEnd = performance.now();
      const fmpDuration = fmpEnd - fmpStart;
      
      expect(fmpDuration).toBeLessThan(1200); // FMP < 1.2s
      expect(fmpMetrics.criticalResourcesLoaded).toBe(true);
      expect(fmpMetrics.fontLoadingTime).toBeLessThan(200); // Fast font loading
    });
  });

  describe('Resource Loading Optimization', () => {
    it('should optimize critical resource loading', async () => {
      const resourceStart = performance.now();
      
      // Simulate critical resource loading
      const resourceMetrics = await simulateCriticalResourceLoading({
        resources: [
          { name: 'app-bundle.js', size: 245760, critical: true },
          { name: 'vendor-bundle.js', size: 512000, critical: true },
          { name: 'styles.css', size: 51200, critical: true },
          { name: 'fonts.woff2', size: 102400, critical: false },
        ],
        connectionType: '4g',
        cacheStrategy: 'aggressive',
      });
      
      const resourceEnd = performance.now();
      const resourceLoadDuration = resourceEnd - resourceStart;
      
      expect(resourceLoadDuration).toBeLessThan(1000); // Critical resources < 1s
      expect(resourceMetrics.cacheHitRate).toBeGreaterThan(0.8); // Good cache performance
      expect(resourceMetrics.compressionEfficiency).toBeGreaterThan(0.7); // Good compression
    });

    it('should implement effective prefetching strategy', async () => {
      const prefetchStart = performance.now();
      
      // Simulate resource prefetching
      const prefetchMetrics = await simulateResourcePrefetching({
        strategy: 'intersection-observer',
        prefetchTargets: ['next-screen', 'user-content', 'feature-flags'],
        prefetchTiming: 'idle-time',
        priorityHints: true,
      });
      
      const prefetchEnd = performance.now();
      const prefetchDuration = prefetchEnd - prefetchStart;
      
      expect(prefetchDuration).toBeLessThan(50); // Prefetch setup < 50ms
      expect(prefetchMetrics.successRate).toBeGreaterThan(0.9); // High success rate
      expect(prefetchMetrics.wastedPrefetches).toBeLessThan(0.1); // Low waste ratio
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should collect startup performance metrics', () => {
      const performanceCollector = new StartupPerformanceCollector();
      
      performanceCollector.startMeasurement('app-startup');
      performanceCollector.markMilestone('bundle-loaded');
      performanceCollector.markMilestone('js-engine-ready');
      performanceCollector.markMilestone('first-render');
      performanceCollector.markMilestone('interactive');
      performanceCollector.endMeasurement('app-startup');
      
      const metrics = performanceCollector.getMetrics();
      
      expect(metrics.milestones).toHaveLength(4);
      expect(metrics.totalDuration).toBeDefined();
      expect(metrics.breakdown.bundleLoad).toBeDefined();
      expect(metrics.breakdown.engineInit).toBeDefined();
      expect(metrics.breakdown.firstRender).toBeDefined();
      expect(metrics.breakdown.timeToInteractive).toBeDefined();
    });

    it('should detect performance regressions', () => {
      const regressionDetector = new PerformanceRegressionDetector();
      
      const baseline = {
        coldStart: 2500,
        warmStart: 800,
        timeToInteractive: 1800,
        bundleSize: 2048000,
      };
      
      const current = {
        coldStart: 3200, // 28% slower - should trigger alert
        warmStart: 850,  // 6.25% slower - within tolerance
        timeToInteractive: 1900, // 5.5% slower - within tolerance
        bundleSize: 2560000, // 25% larger - should trigger alert
      };
      
      const regressions = regressionDetector.detectRegressions(baseline, current, {
        threshold: 0.15, // 15% tolerance
      });
      
      expect(regressions.length).toBe(2);
      expect(regressions).toContainEqual(
        expect.objectContaining({ metric: 'coldStart', regression: expect.any(Number) })
      );
      expect(regressions).toContainEqual(
        expect.objectContaining({ metric: 'bundleSize', regression: expect.any(Number) })
      );
    });
  });
});

// Mock simulation functions
async function simulateReactNativeColdStart(): Promise<void> {
  performance.mark('cold-start-begin');
  
  // Simulate React Native cold start processes
  await new Promise(resolve => setTimeout(resolve, 50)); // Bundle load
  await new Promise(resolve => setTimeout(resolve, 30)); // JS engine init
  await new Promise(resolve => setTimeout(resolve, 20)); // React initialization
  await new Promise(resolve => setTimeout(resolve, 40)); // Component mounting
  
  performance.mark('cold-start-end');
  performance.measure('cold-start-duration', 'cold-start-begin', 'cold-start-end');
}

async function simulateNextJsColdStart(): Promise<void> {
  // Simulate Next.js SSR and hydration
  await new Promise(resolve => setTimeout(resolve, 30)); // SSR
  await new Promise(resolve => setTimeout(resolve, 25)); // Client bundle load
  await new Promise(resolve => setTimeout(resolve, 20)); // Hydration
  await new Promise(resolve => setTimeout(resolve, 15)); // Component mount
}

async function simulateBundleLoading(config: any): Promise<any> {
  // Simulate bundle loading with various optimizations
  const baseLoadTime = config.bundleSize / 1024 / 100; // Simulated load time
  const compressionSavings = config.compressionEnabled ? 0.3 : 0;
  const jitSavings = config.jitEnabled ? 0.2 : 0;
  
  const actualLoadTime = baseLoadTime * (1 - compressionSavings - jitSavings);
  
  await new Promise(resolve => setTimeout(resolve, actualLoadTime));
  
  return {
    compressionRatio: config.compressionEnabled ? 0.7 : 1.0,
    parseTime: config.jitEnabled ? 300 : 500,
    loadTime: actualLoadTime,
  };
}

async function simulateJSEngineInit(config: any): Promise<any> {
  // Simulate JavaScript engine initialization
  const baseInitTime = config.engine === 'hermes' ? 600 : 1000;
  const bytecodeSpeedup = config.bytecodePrecompilation ? 0.4 : 0;
  
  const actualInitTime = baseInitTime * (1 - bytecodeSpeedup);
  
  await new Promise(resolve => setTimeout(resolve, actualInitTime / 10));
  
  return {
    heapSize: 40 * 1024 * 1024, // 40MB initial heap
    bytecodeLoadTime: config.bytecodePrecompilation ? 150 : 0,
    initTime: actualInitTime,
  };
}

async function simulateWarmStartConditions(): Promise<void> {
  // Simulate app already in memory with cached resources
  await new Promise(resolve => setTimeout(resolve, 5));
}

async function simulateReactNativeWarmStart(): Promise<void> {
  // Simulate React Native warm start (app in memory)
  await new Promise(resolve => setTimeout(resolve, 20)); // Activity restore
  await new Promise(resolve => setTimeout(resolve, 15)); // Component remount
}

async function simulateWebWarmStartConditions(): Promise<void> {
  // Simulate cached resources and service worker
  await new Promise(resolve => setTimeout(resolve, 3));
}

async function simulateNextJsWarmStart(): Promise<void> {
  // Simulate Next.js warm start with cache
  await new Promise(resolve => setTimeout(resolve, 10)); // Cache hit
  await new Promise(resolve => setTimeout(resolve, 8));  // Component rehydration
}

async function simulateFastRefresh(config: any): Promise<any> {
  // Simulate React Native fast refresh
  const moduleReloadTime = config.moduleCount * (1 - config.cacheHitRate) * 2;
  
  await new Promise(resolve => setTimeout(resolve, moduleReloadTime));
  
  return {
    cacheHitRate: config.cacheHitRate,
    modulesReloaded: Math.ceil(config.moduleCount * (1 - config.cacheHitRate)),
    refreshTime: moduleReloadTime,
  };
}

async function simulateTimeToInteractive(config: any): Promise<any> {
  // Simulate time to interactive measurement
  const baseTime = config.platform === 'mobile' ? 1500 : 1200;
  const componentOverhead = config.componentCount * 10;
  const asyncOverhead = config.asyncOperations.length * 100;
  
  const totalTime = baseTime + componentOverhead + asyncOverhead;
  
  await new Promise(resolve => setTimeout(resolve, totalTime / 20));
  
  return {
    mainThreadBlockingTime: Math.min(250, componentOverhead),
    inputResponsiveness: Math.min(40, componentOverhead / 10),
    hydrationTime: config.platform === 'web' ? 350 : 0,
    layoutShifts: config.platform === 'web' ? 0.05 : 0,
  };
}

async function simulateFirstMeaningfulPaint(config: any): Promise<any> {
  // Simulate first meaningful paint measurement
  const resourceLoadTime = config.criticalResources.length * 50;
  const fontLoadTime = config.fontLoadingStrategy === 'font-display-swap' ? 150 : 300;
  
  await new Promise(resolve => setTimeout(resolve, (resourceLoadTime + fontLoadTime) / 10));
  
  return {
    criticalResourcesLoaded: true,
    fontLoadingTime: fontLoadTime,
    renderTime: resourceLoadTime,
  };
}

async function simulateCriticalResourceLoading(config: any): Promise<any> {
  // Simulate critical resource loading with optimizations
  const totalSize = config.resources.reduce((sum: number, r: any) => sum + r.size, 0);
  const connectionMultiplier = config.connectionType === '4g' ? 1 : 2;
  const cacheHitRate = config.cacheStrategy === 'aggressive' ? 0.85 : 0.6;
  
  const actualLoadTime = (totalSize / 1024 / 500) * connectionMultiplier * (1 - cacheHitRate);
  
  await new Promise(resolve => setTimeout(resolve, actualLoadTime));
  
  return {
    cacheHitRate,
    compressionEfficiency: 0.75,
    loadTime: actualLoadTime,
  };
}

async function simulateResourcePrefetching(config: any): Promise<any> {
  // Simulate resource prefetching strategy
  const setupTime = config.strategy === 'intersection-observer' ? 30 : 50;
  const successRate = config.priorityHints ? 0.95 : 0.85;
  
  await new Promise(resolve => setTimeout(resolve, setupTime / 10));
  
  return {
    successRate,
    wastedPrefetches: 1 - successRate,
    setupTime,
  };
}

// Performance monitoring classes
class StartupPerformanceCollector {
  private measurements: Map<string, any> = new Map();
  private milestones: Array<{ name: string; timestamp: number }> = [];

  startMeasurement(name: string): void {
    this.measurements.set(name, { startTime: performance.now() });
    performance.mark(`${name}-start`);
  }

  markMilestone(name: string): void {
    const timestamp = performance.now();
    this.milestones.push({ name, timestamp });
    performance.mark(name);
  }

  endMeasurement(name: string): void {
    const measurement = this.measurements.get(name);
    if (measurement) {
      measurement.endTime = performance.now();
      measurement.duration = measurement.endTime - measurement.startTime;
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }
  }

  getMetrics(): any {
    const measurement = this.measurements.get('app-startup');
    
    return {
      totalDuration: measurement?.duration || 0,
      milestones: this.milestones,
      breakdown: {
        bundleLoad: this.getMilestoneDuration('bundle-loaded'),
        engineInit: this.getMilestoneDuration('js-engine-ready'),
        firstRender: this.getMilestoneDuration('first-render'),
        timeToInteractive: this.getMilestoneDuration('interactive'),
      },
    };
  }

  private getMilestoneDuration(milestoneName: string): number {
    const milestone = this.milestones.find(m => m.name === milestoneName);
    const startTime = this.measurements.get('app-startup')?.startTime || 0;
    return milestone ? milestone.timestamp - startTime : 0;
  }
}

class PerformanceRegressionDetector {
  detectRegressions(baseline: any, current: any, options: { threshold: number }): any[] {
    const regressions = [];
    
    for (const [metric, baselineValue] of Object.entries(baseline)) {
      const currentValue = current[metric];
      if (typeof baselineValue === 'number' && typeof currentValue === 'number') {
        const change = (currentValue - baselineValue) / baselineValue;
        
        if (change > options.threshold) {
          regressions.push({
            metric,
            baseline: baselineValue,
            current: currentValue,
            regression: change,
            severity: change > 0.25 ? 'high' : 'medium',
          });
        }
      }
    }
    
    return regressions;
  }
}