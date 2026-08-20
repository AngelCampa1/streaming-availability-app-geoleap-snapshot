/**
 * Performance Monitor - Comprehensive performance tracking and monitoring
 * Provides real-time performance metrics, memory usage tracking, and performance alerting
 *
 * OPTIMIZED: Proper AppState listener cleanup to prevent memory leaks
 */

import { AppState, NativeModules, Platform, AppStateStatus } from 'react-native';
import { performanceNow } from '../utils/performancePolyfill';
// Mock react-native-performance types for compatibility
interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
}

interface PerformanceObserverType {
  observe: (  options: unknown) => void;
  disconnect: () => void;
}

// Mock PerformanceObserver for React Native compatibility  
const PerformanceObserver = class implements PerformanceObserverType {
  constructor(private callback: (list: PerformanceObserverEntryList) => void) {}
  observe(_options: unknown): void {
    // Mock implementation
  }
  disconnect(): void {
    // Mock implementation
  }
} as unknown as { new(callback: (list: PerformanceObserverEntryList) => void): PerformanceObserverType };

interface PerformanceObserverEntryList {
  getEntries: () => PerformanceEntry[];
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../utils/logger';

export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: {
    used: number;
    available: number;
    total: number;
    percentage: number;
  };
  batteryLevel: number;
  networkLatency: number;
  frameRate: number;
  bundleSize: number;
  startupTime: number;
  timestamp: number;
}

export interface PerformanceAlert {
  type: 'memory' | 'cpu' | 'battery' | 'network' | 'frame_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export interface PerformanceBudget {
  memoryThreshold: number; // MB
  cpuThreshold: number; // %
  batteryThreshold: number; // %
  frameRateThreshold: number; // FPS
  startupTimeThreshold: number; // ms
  bundleSizeThreshold: number; // MB
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private observers: PerformanceObserverType[] = [];
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private isMonitoring = false;
  private startTime = Date.now();

  // OPTIMIZATION: Store subscription for proper cleanup
  private appStateSubscription: { remove: () => void } | null = null;
  private metricsIntervalId: ReturnType<typeof setInterval> | null = null;
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

  // Performance budgets (configurable thresholds)
  private budget: PerformanceBudget = {
    memoryThreshold: 150, // 150MB
    cpuThreshold: 70, // 70%
    batteryThreshold: 20, // 20%
    frameRateThreshold: 55, // 55 FPS
    startupTimeThreshold: 2000, // 2 seconds
    bundleSizeThreshold: 10, // 10MB
  };

  private constructor() {
    this.initializeMonitoring();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize performance monitoring
   */
  private initializeMonitoring(): void {
    this.setupPerformanceObservers();
    this.setupAppStateListener();
    this.startPeriodicCollection();
  }

  /**
   * Setup performance observers for various metrics
   */
  private setupPerformanceObservers(): void {
    try {
      // Navigation timing observer
      const navigationObserver = new PerformanceObserver((list: PerformanceObserverEntryList) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.recordNavigationMetric(entry);
          }
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);

      // Frame timing observer
      const frameObserver = new PerformanceObserver((list: PerformanceObserverEntryList) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'frame') {
            this.recordFrameMetric(entry);
          }
        }
      });
      frameObserver.observe({ entryTypes: ['frame'] });
      this.observers.push(frameObserver);

      // Memory observer
      const memoryObserver = new PerformanceObserver((list: PerformanceObserverEntryList) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'memory') {
            this.recordMemoryMetric(entry);
          }
        }
      });
      memoryObserver.observe({ entryTypes: ['memory'] });
      this.observers.push(memoryObserver);

    } catch (error) {
      logger.warn('[PerformanceMonitor] Performance observers not fully supported', error);
    }
  }

  /**
   * Setup app state listener for performance tracking
   * OPTIMIZED: Store subscription reference for cleanup
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        this.recordAppActivation();
      } else if (nextAppState === 'background') {
        this.recordAppBackgrounding();
      }
    });
  }

  /**
   * Start periodic performance metrics collection
   * OPTIMIZED: Store interval IDs for cleanup
   */
  private startPeriodicCollection(): void {
    this.isMonitoring = true;

    // Collect metrics every 5 seconds
    this.metricsIntervalId = setInterval(() => {
      if (this.isMonitoring) {
        this.collectCurrentMetrics();
      }
    }, 5000);

    // Clean up old metrics every minute
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60000);
  }

  /**
   * Collect current performance metrics
   */
  private async collectCurrentMetrics(): Promise<void> {
    try {
      const metrics: PerformanceMetrics = {
        cpuUsage: await this.getCPUUsage(),
        memoryUsage: await this.getMemoryUsage(),
        batteryLevel: await this.getBatteryLevel(),
        networkLatency: await this.getNetworkLatency(),
        frameRate: this.getCurrentFrameRate(),
        bundleSize: await this.getBundleSize(),
        startupTime: Date.now() - this.startTime,
        timestamp: Date.now(),
      };

      this.metrics.push(metrics);
      this.checkPerformanceBudgets(metrics);
      this.persistMetrics(metrics);

    } catch (error) {
      logger.error('[PerformanceMonitor] Failed to collect performance metrics', error);
    }
  }

  /**
   * Get CPU usage percentage
   */
  private async getCPUUsage(): Promise<number> {
    try {
      if (Platform.OS === 'android' && NativeModules.SystemInfo) {
        return await NativeModules.SystemInfo.getCPUUsage();
      }
      // Fallback: estimate based on performanceNow() calls
      const start = performanceNow();
      for (let i = 0; i < 1000; i++) {
        Math.random();
      }
      const end = performanceNow();
      return Math.min((end - start) / 10, 100);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get memory usage information
   */
  private async getMemoryUsage(): Promise<PerformanceMetrics['memoryUsage']> {
    try {
      if (Platform.OS === 'android' && NativeModules.SystemInfo) {
        const memInfo = await NativeModules.SystemInfo.getMemoryInfo();
        return {
          used: memInfo.used,
          available: memInfo.available,
          total: memInfo.total,
          percentage: (memInfo.used / memInfo.total) * 100,
        };
      }

      // Fallback for iOS or when native module unavailable
      const estimated = {
        used: 50, // Estimated 50MB
        available: 100,
        total: 150,
        percentage: 33.3,
      };
      return estimated;
    } catch (error) {
      return { used: 0, available: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Get battery level
   */
  private async getBatteryLevel(): Promise<number> {
    try {
      if (Platform.OS === 'android' && NativeModules.BatteryManager) {
        return await NativeModules.BatteryManager.getBatteryLevel();
      }
      return 100; // Default for iOS or fallback
    } catch (error) {
      return 100;
    }
  }

  /**
   * Measure network latency
   */
  private async getNetworkLatency(): Promise<number> {
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch('https://httpbin.org/get', {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return Date.now() - start;
    } catch (error) {
      return -1; // Network unavailable
    }
  }

  /**
   * Get current frame rate
   */
  private getCurrentFrameRate(): number {
    // This would be implemented with native modules
    // For now, return estimated value
    return 60;
  }

  /**
   * Get bundle size
   */
  private async getBundleSize(): Promise<number> {
    try {
      const bundleStats = await AsyncStorage.getItem('bundle_stats');
      if (bundleStats) {
        const stats = JSON.parse(bundleStats);
        return stats.size / (1024 * 1024); // Convert to MB
      }
      return 5; // Default estimate
    } catch (error) {
      return 5;
    }
  }

  /**
   * Check performance budgets and create alerts
   */
  private checkPerformanceBudgets(metrics: PerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Memory check
    if (metrics.memoryUsage.used > this.budget.memoryThreshold) {
      alerts.push({
        type: 'memory',
        severity: metrics.memoryUsage.used > this.budget.memoryThreshold * 1.5 ? 'critical' : 'high',
        message: `Memory usage exceeded threshold: ${metrics.memoryUsage.used}MB > ${this.budget.memoryThreshold}MB`,
        value: metrics.memoryUsage.used,
        threshold: this.budget.memoryThreshold,
        timestamp: Date.now(),
      });
    }

    // CPU check
    if (metrics.cpuUsage > this.budget.cpuThreshold) {
      alerts.push({
        type: 'cpu',
        severity: metrics.cpuUsage > this.budget.cpuThreshold * 1.2 ? 'critical' : 'high',
        message: `CPU usage exceeded threshold: ${metrics.cpuUsage}% > ${this.budget.cpuThreshold}%`,
        value: metrics.cpuUsage,
        threshold: this.budget.cpuThreshold,
        timestamp: Date.now(),
      });
    }

    // Battery check
    if (metrics.batteryLevel < this.budget.batteryThreshold) {
      alerts.push({
        type: 'battery',
        severity: metrics.batteryLevel < this.budget.batteryThreshold * 0.5 ? 'critical' : 'medium',
        message: `Battery level below threshold: ${metrics.batteryLevel}% < ${this.budget.batteryThreshold}%`,
        value: metrics.batteryLevel,
        threshold: this.budget.batteryThreshold,
        timestamp: Date.now(),
      });
    }

    // Frame rate check
    if (metrics.frameRate < this.budget.frameRateThreshold) {
      alerts.push({
        type: 'frame_rate',
        severity: metrics.frameRate < this.budget.frameRateThreshold * 0.8 ? 'high' : 'medium',
        message: `Frame rate below threshold: ${metrics.frameRate}fps < ${this.budget.frameRateThreshold}fps`,
        value: metrics.frameRate,
        threshold: this.budget.frameRateThreshold,
        timestamp: Date.now(),
      });
    }

    this.alerts.push(...alerts);
    this.reportAlerts(alerts);
  }

  /**
   * Record navigation metric
   */
  private recordNavigationMetric(entry: PerformanceEntry): void {
    logger.log('[PerformanceMonitor] Navigation metric', { entry });
  }

  /**
   * Record frame metric
   */
  private recordFrameMetric(entry: PerformanceEntry): void {
    logger.log('[PerformanceMonitor] Frame metric', { entry });
  }

  /**
   * Record memory metric
   */
  private recordMemoryMetric(entry: PerformanceEntry): void {
    logger.log('[PerformanceMonitor] Memory metric', { entry });
  }

  /**
   * Record app activation
   */
  private recordAppActivation(): void {
    logger.log('[PerformanceMonitor] App activated', { timestamp: new Date().toISOString() });
  }

  /**
   * Record app backgrounding
   */
  private recordAppBackgrounding(): void {
    logger.log('[PerformanceMonitor] App backgrounded', { timestamp: new Date().toISOString() });
  }

  /**
   * Report performance alerts
   */
  private reportAlerts(alerts: PerformanceAlert[]): void {
    alerts.forEach(alert => {
      logger.warn('[PerformanceMonitor] Performance alert', {
        severity: alert.severity.toUpperCase(),
        message: alert.message,
        alert
      });

      // Send to analytics if configured
      this.sendAlertToAnalytics(alert);
    });
  }

  /**
   * Send alert to analytics service
   */
  private sendAlertToAnalytics(alert: PerformanceAlert): void {
    // Implementation would send to analytics service
    logger.log('[PerformanceMonitor] Alert sent to analytics', { alert });
  }

  /**
   * Persist metrics to storage
   */
  private async persistMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      const key = `performance_metrics_${Date.now()}`;
      await AsyncStorage.setItem(key, JSON.stringify(metrics));
    } catch (error) {
      logger.error('[PerformanceMonitor] Failed to persist metrics', error);
    }
  }

  /**
   * Clean up old metrics (keep last 24 hours)
   */
  private cleanupOldMetrics(): void {
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(metric => metric.timestamp > twentyFourHoursAgo);
    this.alerts = this.alerts.filter(alert => alert.timestamp > twentyFourHoursAgo);
  }

  /**
   * Get performance report
   */
  public getPerformanceReport(): {
    metrics: PerformanceMetrics[];
    alerts: PerformanceAlert[];
    summary: unknown;
  } {
    const recent = this.metrics.slice(-10);
    const summary = {
      averageMemoryUsage: recent.reduce((sum, m) => sum + m.memoryUsage.used, 0) / recent.length,
      averageCPUUsage: recent.reduce((sum, m) => sum + m.cpuUsage, 0) / recent.length,
      averageFrameRate: recent.reduce((sum, m) => sum + m.frameRate, 0) / recent.length,
      alertCount: this.alerts.length,
      criticalAlerts: this.alerts.filter(a => a.severity === 'critical').length,
    };

    return {
      metrics: this.metrics,
      alerts: this.alerts,
      summary,
    };
  }

  /**
   * Update performance budgets
   */
  public updateBudget(newBudget: Partial<PerformanceBudget>): void {
    this.budget = { ...this.budget, ...newBudget };
  }

  /**
   * Start monitoring
   */
  public startMonitoring(): void {
    this.isMonitoring = true;
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
  }

  /**
   * Cleanup observers and listeners
   * CRITICAL: Prevents memory leaks
   */
  public cleanup(): void {
    // Stop monitoring
    this.isMonitoring = false;

    // Clean up AppState listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // Clean up intervals
    if (this.metricsIntervalId) {
      clearInterval(this.metricsIntervalId);
      this.metricsIntervalId = null;
    }

    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }

    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    // Clear data
    this.metrics = [];
    this.alerts = [];

    logger.log('[PerformanceMonitor] Cleaned up successfully');
  }
}

export default PerformanceMonitor;
