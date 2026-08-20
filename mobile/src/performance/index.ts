/**
 * Performance Optimization System - Main Export
 * Complete React Native performance optimization suite for US-11.7
 */

import * as React from 'react';
import PerformanceAnalytics from './analytics/PerformanceAnalytics';
import { performanceNow } from './utils/performancePolyfill';

// Re-export the polyfill for external use
export { performance, performanceNow, isPerformanceAvailable, getPerformanceMemory } from './utils/performancePolyfill';

// Monitoring System
export { default as PerformanceMonitor } from './monitoring/PerformanceMonitor';

// Optimization Systems
export { default as BundleOptimizer } from './optimization/BundleOptimizer';
export { default as ImageOptimizer } from './optimization/ImageOptimizer';
export { default as ListOptimizer } from './optimization/ListOptimizer';
export { default as MemoryOptimizer } from './optimization/MemoryOptimizer';
export { default as StartupOptimizer } from './optimization/StartupOptimizer';
export { default as AnimationOptimizer } from './optimization/AnimationOptimizer';

// Testing System
export { default as PerformanceTestSuite } from './testing/PerformanceTestSuite';

// Analytics System
export { default as PerformanceAnalytics } from './analytics/PerformanceAnalytics';

// Type Exports
export type {
  PerformanceMetrics,
  PerformanceAlert,
  PerformanceBudget,
} from './monitoring/PerformanceMonitor';

export type {
  BundleConfig,
  ModuleInfo,
  BundleStats,
} from './optimization/BundleOptimizer';

export type {
  ImageOptimizationConfig,
  ImageMetadata,
  ImageLoadingStats,
} from './optimization/ImageOptimizer';

export type {
  ListOptimizationConfig,
  ListPerformanceMetrics,
} from './optimization/ListOptimizer';

export type {
  MemoryProfile,
  MemoryLeak,
  MemoryOptimizationConfig,
} from './optimization/MemoryOptimizer';

export type {
  StartupConfig,
  StartupService,
  StartupMetrics,
  StartupProfile,
} from './optimization/StartupOptimizer';

export type {
  AnimationConfig,
  AnimationPerformanceMetrics,
  OptimizedAnimation,
} from './optimization/AnimationOptimizer';

export type {
  PerformanceTest,
  PerformanceTestResult,
  PerformanceBenchmark,
  PerformanceReport,
} from './testing/PerformanceTestSuite';

export type {
  PerformanceEvent,
  PerformanceSession,
  DeviceInfo,
  PerformanceTrend,
  AnalyticsConfig,
} from './analytics/PerformanceAnalytics';

// Utility Functions
export const withPerformanceTracking = (Component: React.ComponentType, componentName: string) => {
  return (props: unknown) => {
    const performanceAnalytics = PerformanceAnalytics.getInstance();

    React.useEffect(() => {
      const startTime = performanceNow();

      return () => {
        const renderTime = performanceNow() - startTime;
        performanceAnalytics.trackRender(componentName, renderTime);
      };
    }, [performanceAnalytics]);

    return React.createElement(Component, props);
  };
};

export const withImageOptimization = (Component: React.ComponentType) => {
  return (props: unknown) => {
    return React.createElement(Component, props);
  };
};

export const withListOptimization = (Component: React.ComponentType, _listId: string) => {
  return (props: unknown) => {
    return React.createElement(Component, props);
  };
};

// Performance Hook (simplified version without PerformanceManager)
export const usePerformance = () => {
  const performanceAnalytics = PerformanceAnalytics.getInstance();

  return {
    analytics: performanceAnalytics,
  };
};
