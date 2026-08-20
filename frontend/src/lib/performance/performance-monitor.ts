/**
 * Enhanced Performance Monitoring Service
 * Tracks application performance metrics and identifies bottlenecks
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'memory' | 'timing' | 'network' | 'rendering';
  tags?: Record<string, string>;
}

interface PerformanceBudget {
  memory: number; // MB
  timing: number; // ms
  network: number; // ms
}

/**
 * Performance monitoring with memory-efficient storage
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Limit stored metrics to prevent memory bloat
  private budgets: PerformanceBudget = {
    memory: 100, // 100MB
    timing: 1000, // 1 second
    network: 2000, // 2 seconds
  };

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    category: PerformanceMetric['category'],
    tags?: Record<string, string>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category,
      tags,
    };

    this.metrics.push(metric);

    // Maintain maximum metrics count
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Check against budget
    this.checkBudget(metric);
  }

  /**
   * Measure and record execution time of a function
   */
  async measureTiming<T>(name: string, fn: () => Promise<T> | T, tags?: Record<string, string>): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      this.recordMetric(name, duration, 'timing', tags);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(`${name}_error`, duration, 'timing', {
        ...tags,
        error: 'true',
      });
      throw error;
    }
  }

  /**
   * Measure memory usage
   */
  measureMemory(name: string, tags?: Record<string, string>): void {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const memory = (performance as { memory: { usedJSHeapSize: number } }).memory;
      const usedMB = memory.usedJSHeapSize / (1024 * 1024);

      this.recordMetric(name, usedMB, 'memory', tags);
    }
  }

  /**
   * Measure network performance
   */
  measureNetwork(name: string, startTime: number, tags?: Record<string, string>): void {
    const duration = Date.now() - startTime;
    this.recordMetric(name, duration, 'network', tags);
  }

  /**
   * Get performance statistics
   */
  getStats(category?: PerformanceMetric['category']): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
  } {
    const filtered = category ? this.metrics.filter(m => m.category === category) : this.metrics;

    if (filtered.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, p95: 0 };
    }

    const values = filtered.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      average: sum / values.length,
      min: values[0],
      max: values[values.length - 1],
      p95: values[Math.floor(values.length * 0.95)],
    };
  }

  /**
   * Check if metric exceeds budget
   */
  private checkBudget(metric: PerformanceMetric): void {
    let budgetExceeded = false;
    let budgetValue = 0;

    switch (metric.category) {
      case 'memory':
        budgetValue = this.budgets.memory;
        budgetExceeded = metric.value > budgetValue;
        break;
      case 'timing':
        budgetValue = this.budgets.timing;
        budgetExceeded = metric.value > budgetValue;
        break;
      case 'network':
        budgetValue = this.budgets.network;
        budgetExceeded = metric.value > budgetValue;
        break;
    }

    if (budgetExceeded) {
      console.warn(`⚠️ Performance Budget Exceeded: ${metric.name} = ${metric.value} (budget: ${budgetValue})`);

      // Report to analytics in production
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
        this.reportBudgetViolation(metric, budgetValue);
      }
    }
  }

  /**
   * Report budget violations to analytics
   */
  private reportBudgetViolation(metric: PerformanceMetric, budget: number): void {
    if (
      typeof window !== 'undefined' &&
      'gtag' in window &&
      typeof (window as { gtag?: (...args: unknown[]) => void }).gtag === 'function'
    ) {
      const gtag = (window as { gtag: (...args: unknown[]) => void }).gtag;
      gtag('event', 'performance_budget_exceeded', {
        event_category: 'Performance',
        event_label: metric.name,
        value: Math.round(metric.value),
        custom_map: {
          budget_value: budget,
          metric_category: metric.category,
        },
      });
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: Record<
      string,
      {
        count: number;
        average: number;
        min: number;
        max: number;
        p95: number;
      }
    >;
    budgetViolations: PerformanceMetric[];
    recommendations: string[];
  } {
    const categories: PerformanceMetric['category'][] = ['memory', 'timing', 'network', 'rendering'];
    const summary: Record<
      string,
      {
        count: number;
        average: number;
        min: number;
        max: number;
        p95: number;
      }
    > = {};

    categories.forEach(category => {
      summary[category] = this.getStats(category);
    });

    // Find budget violations
    const budgetViolations = this.metrics.filter(metric => {
      switch (metric.category) {
        case 'memory':
          return metric.value > this.budgets.memory;
        case 'timing':
          return metric.value > this.budgets.timing;
        case 'network':
          return metric.value > this.budgets.network;
        default:
          return false;
      }
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, budgetViolations);

    return {
      summary,
      budgetViolations,
      recommendations,
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    summary: Record<
      string,
      {
        count: number;
        average: number;
        min: number;
        max: number;
        p95: number;
      }
    >,
    violations: PerformanceMetric[]
  ): string[] {
    const recommendations: string[] = [];

    // Memory recommendations
    if (summary.memory?.average > this.budgets.memory * 0.8) {
      recommendations.push('Consider implementing object pooling or reducing memory allocations');
    }

    // Timing recommendations
    if (summary.timing?.p95 > this.budgets.timing * 0.8) {
      recommendations.push('Optimize slow operations or implement async processing');
    }

    // Network recommendations
    if (summary.network?.average > this.budgets.network * 0.8) {
      recommendations.push('Consider request caching or reducing payload sizes');
    }

    // Specific violation recommendations
    violations.forEach(violation => {
      if (violation.name.includes('metadata')) {
        recommendations.push('Consider batch processing for metadata generation');
      }
      if (violation.name.includes('sitemap')) {
        recommendations.push('Implement streaming for large sitemap generation');
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Reset monitoring data
   */
  reset(): void {
    this.metrics = [];
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Performance monitoring decorators
 */
export function measurePerformance(name?: string) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      return performanceMonitor.measureTiming(metricName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Memory monitoring utilities
 */
export class MemoryMonitor {
  private snapshots: Array<{ name: string; usage: number; timestamp: number }> = [];

  takeSnapshot(name: string): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage().heapUsed / (1024 * 1024); // MB
      this.snapshots.push({
        name,
        usage,
        timestamp: Date.now(),
      });

      performanceMonitor.recordMetric(`memory_${name}`, usage, 'memory');
    }
  }

  getDelta(startSnapshot: string, endSnapshot: string): number {
    const start = this.snapshots.find(s => s.name === startSnapshot);
    const end = this.snapshots.find(s => s.name === endSnapshot);

    if (start && end) {
      return end.usage - start.usage;
    }

    return 0;
  }

  getSnapshots(): Array<{ name: string; usage: number; timestamp: number }> {
    return [...this.snapshots];
  }

  reset(): void {
    this.snapshots = [];
  }
}

export const memoryMonitor = new MemoryMonitor();
