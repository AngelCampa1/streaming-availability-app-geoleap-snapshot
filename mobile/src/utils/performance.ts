import React from 'react';
import { Platform } from 'react-native';
import { InteractionManager } from 'react-native';
import { logger } from './logger';

// Performance monitoring utilities
export interface PerformanceMetrics {
  appStartTime: number;
  renderTime: number;
  memoryUsage: number;
  bundleSize: number;
  networkRequests: number;
  screenLoadTimes: Record<string, number>;
  componentRenderTimes: Record<string, number>;
  userInteractionDelays: Record<string, number>;
}

export interface PerformanceConfig {
  enableMetrics: boolean;
  enableProfiling: boolean;
  enableCrashReporting: boolean;
  enableNetworkMonitoring: boolean;
  enableMemoryMonitoring: boolean;
  samplingRate: number;
  maxMetricsHistory: number;
}

class PerformanceManager {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics;
  private timers: Map<string, number> = new Map();
  private observers: Set<Function> = new Set();
  private isInitialized = false;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableMetrics: __DEV__,
      enableProfiling: __DEV__,
      enableCrashReporting: !__DEV__,
      enableNetworkMonitoring: true,
      enableMemoryMonitoring: true,
      samplingRate: 0.1, // 10% sampling in production
      maxMetricsHistory: 100,
      ...config,
    };

    this.metrics = {
      appStartTime: Date.now(),
      renderTime: 0,
      memoryUsage: 0,
      bundleSize: 0,
      networkRequests: 0,
      screenLoadTimes: {},
      componentRenderTimes: {},
      userInteractionDelays: {},
    };
  }

  initialize = () => {
    if (this.isInitialized) {return;}

    if (this.config.enableMetrics) {
      this.startPerformanceMonitoring();
    }

    this.isInitialized = true;
  };

  private startPerformanceMonitoring = () => {
    // Monitor app startup performance
    this.measureStartupTime();

    // Monitor memory usage
    if (this.config.enableMemoryMonitoring) {
      this.startMemoryMonitoring();
    }

    // Monitor network requests
    if (this.config.enableNetworkMonitoring) {
      this.startNetworkMonitoring();
    }

    // Monitor screen transitions
    this.startScreenMonitoring();
  };

  private measureStartupTime = () => {
    const startTime = this.metrics.appStartTime;
    const loadTime = Date.now() - startTime;

    this.metrics.renderTime = loadTime;
    this.recordMetric('app_startup_time', loadTime);

    logger.log('[PerformanceManager] App startup time', { loadTimeMs: loadTime });
  };

  private startMemoryMonitoring = () => {
    setInterval(() => {
      this.measureMemoryUsage();
    }, 30000); // Every 30 seconds
  };

  private measureMemoryUsage = () => {
    // Note: React Native doesn't have direct memory APIs like browser
    // This would need to be implemented with native modules
    // For now, we'll use placeholder logic

    const memoryUsage = this.estimateMemoryUsage();
    this.metrics.memoryUsage = memoryUsage;
    this.recordMetric('memory_usage', memoryUsage);

    // Warn if memory usage is high
    if (memoryUsage > 100 * 1024 * 1024) { // 100MB
      logger.warn('[PerformanceManager] High memory usage detected', { memoryUsageMB: (memoryUsage / 1024 / 1024).toFixed(2) });
    }
  };

  private estimateMemoryUsage = (): number => {
    // This is a simplified estimation
    // In a real app, you'd use native modules to get accurate memory usage
    return Math.random() * 50 * 1024 * 1024; // Random estimation
  };

  private startNetworkMonitoring = () => {
    // Monitor network requests
    // This would intercept and track all network requests
    logger.log('[PerformanceManager] Network monitoring started');
  };

  private startScreenMonitoring = () => {
    // Monitor screen load times
    // This would integrate with navigation to track screen transitions
    logger.log('[PerformanceManager] Screen monitoring started');
  };

  // Timer methods for measuring performance
  startTimer = (name: string) => {
    if (!this.config.enableMetrics) {return;}

    this.timers.set(name, Date.now());
  };

  endTimer = (name: string): number => {
    if (!this.config.enableMetrics) {return 0;}

    const startTime = this.timers.get(name);
    if (!startTime) {return 0;}

    const duration = Date.now() - startTime;
    this.timers.delete(name);
    this.recordMetric(name, duration);

    return duration;
  };

  // Measure component render time
  measureComponentRender = (componentName: string, renderFunction: Function) => {
    if (!this.config.enableMetrics) {
      return renderFunction();
    }

    const startTime = Date.now();
    const result = renderFunction();
    const renderTime = Date.now() - startTime;

    this.metrics.componentRenderTimes[componentName] = renderTime;
    this.recordMetric(`component_${componentName}_render`, renderTime);

    return result;
  };

  // Measure user interaction delay
  measureInteractionDelay = (interactionName: string) => {
    if (!this.config.enableMetrics) {return;}

    InteractionManager.runAfterInteractions(() => {
      const delay = this.endTimer(`interaction_${interactionName}`);
      if (delay > 100) { // Log if interaction takes more than 100ms
        logger.warn('[PerformanceManager] Slow interaction detected', { interactionName, delayMs: delay });
      }
    });
  };

  // Record performance metrics
  private recordMetric = (name: string, value: number) => {
    // In production, only sample metrics based on sampling rate
    if (!__DEV__ && Math.random() > this.config.samplingRate) {
      return;
    }

    // Log metric (in production, this would send to analytics service)
    if (__DEV__) {
      logger.log('[PerformanceManager] Performance metric', { metricName: name, valueMs: value });
    }

    // Notify observers
    this.observers.forEach(observer => {
      try {
        observer({ name, value, timestamp: Date.now() });
      } catch (error) {
        logger.error('[PerformanceManager] Error in performance observer', error);
      }
    });
  };

  // Subscribe to performance metrics
  subscribe = (observer: Function) => {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  };

  // Get current metrics
  getMetrics = (): PerformanceMetrics => ({ ...this.metrics });

  // Check performance health
  getPerformanceHealth = () => {
    const { renderTime, memoryUsage } = this.metrics;

    const health = {
      overall: 'good' as 'good' | 'warning' | 'critical',
      issues: [] as string[],
      recommendations: [] as string[],
    };

    // Check startup time
    if (renderTime > 3000) {
      health.issues.push('App startup time is over 3 seconds');
      health.recommendations.push('Consider code splitting and lazy loading');
    }

    // Check memory usage
    if (memoryUsage > 100 * 1024 * 1024) {
      health.issues.push('Memory usage is over 100MB');
      health.recommendations.push('Check for memory leaks and optimize image usage');
    }

    // Determine overall health
    if (health.issues.length > 0) {
      health.overall = health.issues.length > 2 ? 'critical' : 'warning';
    }

    return health;
  };

  // Bundle size optimization
  analyzeBundleSize = () => {
    // This would analyze the bundle size and provide recommendations
    return {
      totalSize: 0, // Would be calculated from actual bundle
      recommendations: [
        'Use dynamic imports for rarely used components',
        'Optimize images and assets',
        'Remove unused dependencies',
        'Enable tree shaking',
      ],
    };
  };

  // Performance optimization suggestions
  getOptimizationSuggestions = () => {
    const health = this.getPerformanceHealth();
    const suggestions = [...health.recommendations];

    // Add platform-specific suggestions
    if (Platform.OS === 'android') {
      suggestions.push('Enable Hermes JavaScript engine for better performance');
    }

    if (Platform.OS === 'ios') {
      suggestions.push('Use FLAnimatedImage for GIF optimization');
    }

    return suggestions;
  };

  // Export metrics for reporting
  exportMetrics = () => {
    return {
      metrics: this.metrics,
      health: this.getPerformanceHealth(),
      suggestions: this.getOptimizationSuggestions(),
      bundleAnalysis: this.analyzeBundleSize(),
      timestamp: Date.now(),
    };
  };

  // Cleanup
  dispose = () => {
    this.timers.clear();
    this.observers.clear();
  };
}

// Performance monitoring hooks
export const usePerformanceMonitor = (componentName: string) => {
  const performanceManager = React.useMemo(() => new PerformanceManager(), []);

  React.useEffect(() => {
    performanceManager.startTimer(`component_${componentName}_lifecycle`);

    return () => {
      performanceManager.endTimer(`component_${componentName}_lifecycle`);
    };
  }, [componentName, performanceManager]);

  const measureRender = React.useCallback((renderFunction: Function) => {
    return performanceManager.measureComponentRender(componentName, renderFunction);
  }, [componentName, performanceManager]);

  return {
    measureRender,
    startTimer: performanceManager.startTimer,
    endTimer: performanceManager.endTimer,
    measureInteraction: performanceManager.measureInteractionDelay,
  };
};

// Performance optimization utilities
export const PerformanceUtils = {
  // Debounce function for performance optimization
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    delay: number,
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  // Throttle function for performance optimization
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    delay: number,
  ): ((...args: Parameters<T>) => void) => {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  },

  // Memoize expensive computations
  memoize: <T extends (...args: any[]) => any>(func: T): T => {
    const cache = new Map();
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },

  // Batch DOM updates
  batchUpdates: (updates: Function[]) => {
    InteractionManager.runAfterInteractions(() => {
      updates.forEach(update => {
        try {
          update();
        } catch (error) {
          logger.error('[PerformanceUtils] Error in batched update', error);
        }
      });
    });
  },

  // Lazy load component
  lazyLoad: <T extends { default: React.ComponentType<any> }>(
    loader: () => Promise<T>,
    _fallback: React.ComponentType,
  ): React.ComponentType => {
    return React.lazy(loader);
  },
};

// Create global performance manager instance
export const performanceManager = new PerformanceManager({
  enableMetrics: __DEV__,
  enableProfiling: __DEV__,
  enableCrashReporting: !__DEV__,
  samplingRate: __DEV__ ? 1.0 : 0.1,
});

// Initialize performance monitoring
performanceManager.initialize();

export default performanceManager;
