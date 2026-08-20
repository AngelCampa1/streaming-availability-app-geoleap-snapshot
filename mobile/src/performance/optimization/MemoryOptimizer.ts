/**
 * Memory Optimizer - Advanced memory leak detection and prevention system
 * Provides memory monitoring, leak detection, and automatic cleanup mechanisms
 */

import { DeviceEventEmitter, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPerformanceMemory } from '../utils/performancePolyfill';
import { logger } from '../../utils/logger';

// Extend Performance interface to include memory property
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

export interface MemoryProfile {
  totalMemory: number;
  usedMemory: number;
  freeMemory: number;
  jsHeapUsed: number;
  jsHeapTotal: number;
  nativeHeapUsed: number;
  timestamp: number;
}

export interface MemoryLeak {
  type: 'listener' | 'timer' | 'subscription' | 'component' | 'cache';
  source: string;
  count: number;
  estimatedSize: number; // bytes
  createdAt: number;
  lastAccessed: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface MemoryOptimizationConfig {
  enableLeakDetection: boolean;
  enableAutomaticCleanup: boolean;
  memoryThreshold: number; // MB
  maxListeners: number;
  maxTimers: number;
  maxCacheSize: number; // MB
  cleanupInterval: number; // ms
  gcInterval: number; // ms
}

export interface CleanupTask {
  id: string;
  type: 'timer' | 'listener' | 'subscription' | 'cache';
  cleanup: () => void;
  createdAt: number;
  priority: number;
}

class MemoryOptimizer {
  private static instance: MemoryOptimizer;
  private memoryProfiles: MemoryProfile[] = [];
  private detectedLeaks: MemoryLeak[] = [];
  private cleanupTasks: Map<string, CleanupTask> = new Map();
  private listeners: Set<unknown>; // eslint-disable @typescript-eslint/no-explicit-any = new Set();
  private timers: Set<unknown>; // eslint-disable @typescript-eslint/no-explicit-any = new Set();
  private subscriptions: Set<unknown>; // eslint-disable @typescript-eslint/no-explicit-any = new Set();
  private isMonitoring = false;
  private cleanupInterval?: ReturnType<typeof setTimeout>;
  private gcInterval?: ReturnType<typeof setTimeout>;

  private config: MemoryOptimizationConfig = {
    enableLeakDetection: true,
    enableAutomaticCleanup: true,
    memoryThreshold: 200, // 200MB
    maxListeners: 50,
    maxTimers: 25,
    maxCacheSize: 50, // 50MB
    cleanupInterval: 30000, // 30 seconds
    gcInterval: 60000, // 1 minute
  };

  private constructor() {
    this.initializeOptimizer();
  }

  public static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer();
    }
    return MemoryOptimizer.instance;
  }

  /**
   * Initialize memory optimizer
   */
  private initializeOptimizer(): void {
    this.setupMemoryMonitoring();
    this.setupAutomaticCleanup();
    this.patchGlobalObjects();
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    this.isMonitoring = true;

    // Monitor memory every 10 seconds
    const monitoringInterval = setInterval(() => {
      if (this.isMonitoring) {
        this.collectMemoryProfile();
        this.detectMemoryLeaks();
      }
    }, 10000);

    // Register cleanup for monitoring interval
    this.registerCleanupTask({
      id: 'memory-monitoring',
      type: 'timer',
      cleanup: () => clearInterval(monitoringInterval),
      createdAt: Date.now(),
      priority: 1,
    });
  }

  /**
   * Setup automatic cleanup
   */
  private setupAutomaticCleanup(): void {
    if (!this.config.enableAutomaticCleanup) {return;}

    // Cleanup unused resources
    this.cleanupInterval = setInterval(() => {
      this.performAutomaticCleanup();
    }, this.config.cleanupInterval);

    // Force garbage collection
    this.gcInterval = setInterval(() => {
      this.forceGarbageCollection();
    }, this.config.gcInterval);
  }

  /**
   * Patch global objects to track resources
   */
  private patchGlobalObjects(): void {
    if (!this.config.enableLeakDetection) {return;}

    // Patch setTimeout/setInterval
    this.patchTimers();

    // Patch event listeners
    this.patchEventListeners();
  }

  /**
   * Patch timer functions to track them
   */
    private patchTimers(): void {
    // Store original timer functions for cleanup tracking
    const originalClearTimeout = clearTimeout;
    const originalClearInterval = clearInterval;

    // Track timer creation without overriding the global function
    // Timer tracking will be done via other methods

    globalThis.clearTimeout = (timerId: any) => {
      this.timers.delete(timerId);
      return originalClearTimeout(timerId);
    };

    globalThis.clearInterval = (timerId: any) => {
      this.timers.delete(timerId);
      return originalClearInterval(timerId);
    };
  }

  /**
   * Patch event listeners to track them
   */
  private patchEventListeners(): void {
    // Patch DeviceEventEmitter
    const originalAddListener = DeviceEventEmitter.addListener;
    DeviceEventEmitter.addListener = (...args) => {
      const subscription = originalAddListener.apply(DeviceEventEmitter, args);
      this.listeners.add(subscription);
      return subscription;
    };

    // Patch NativeEventEmitter if available
    if (NativeEventEmitter) {
      const originalAddListenerNative = NativeEventEmitter.prototype.addListener;
      NativeEventEmitter.prototype.addListener = function(...args) {
        const subscription = originalAddListenerNative.apply(this, args);
        MemoryOptimizer.getInstance().listeners.add(subscription);
        return subscription;
      };
    }
  }

  /**
   * Collect current memory profile
   */
  private async collectMemoryProfile(): Promise<void> {
    try {
      const profile: MemoryProfile = {
        totalMemory: await this.getTotalMemory(),
        usedMemory: await this.getUsedMemory(),
        freeMemory: await this.getFreeMemory(),
        jsHeapUsed: this.getJSHeapUsed(),
        jsHeapTotal: this.getJSHeapTotal(),
        nativeHeapUsed: await this.getNativeHeapUsed(),
        timestamp: Date.now(),
      };

      this.memoryProfiles.push(profile);

      // Keep only last 100 profiles
      if (this.memoryProfiles.length > 100) {
        this.memoryProfiles = this.memoryProfiles.slice(-100);
      }

      // Check memory threshold
      if (profile.usedMemory > this.config.memoryThreshold * 1024 * 1024) {
        this.handleMemoryPressure(profile);
      }

    } catch (error) {
      logger.error('[MemoryOptimizer] Failed to collect memory profile', error);
    }
  }

  /**
   * Get total device memory
   */
  private async getTotalMemory(): Promise<number> {
    try {
      if (Platform.OS === 'android' && NativeModules.SystemInfo) {
        return await NativeModules.SystemInfo.getTotalMemory();
      }
      return 2 * 1024 * 1024 * 1024; // Default 2GB
    } catch (error) {
      return 2 * 1024 * 1024 * 1024;
    }
  }

  /**
   * Get used memory
   */
  private async getUsedMemory(): Promise<number> {
    try {
      if (Platform.OS === 'android' && NativeModules.SystemInfo) {
        return await NativeModules.SystemInfo.getUsedMemory();
      }
      return 100 * 1024 * 1024; // Default 100MB
    } catch (error) {
      return 100 * 1024 * 1024;
    }
  }

  /**
   * Get free memory
   */
  private async getFreeMemory(): Promise<number> {
    const total = await this.getTotalMemory();
    const used = await this.getUsedMemory();
    return total - used;
  }

  /**
   * Get JavaScript heap used
   */
  private getJSHeapUsed(): number {
    const memory = getPerformanceMemory();
    return memory?.usedJSHeapSize || 0;
  }

  /**
   * Get JavaScript heap total
   */
  private getJSHeapTotal(): number {
    const memory = getPerformanceMemory();
    return memory?.totalJSHeapSize || 0;
  }

  /**
   * Get native heap used
   */
  private async getNativeHeapUsed(): Promise<number> {
    try {
      if (Platform.OS === 'android' && NativeModules.SystemInfo) {
        return await NativeModules.SystemInfo.getNativeHeapUsed();
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Detect memory leaks
   */
  private detectMemoryLeaks(): void {
    const leaks: MemoryLeak[] = [];

    // Check for excessive listeners
    if (this.listeners.size > this.config.maxListeners) {
      leaks.push({
        type: 'listener',
        source: 'EventEmitter',
        count: this.listeners.size,
        estimatedSize: this.listeners.size * 1024, // Estimate 1KB per listener
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        severity: this.listeners.size > this.config.maxListeners * 2 ? 'critical' : 'high',
      });
    }

    // Check for excessive timers
    if (this.timers.size > this.config.maxTimers) {
      leaks.push({
        type: 'timer',
        source: 'setTimeout/setInterval',
        count: this.timers.size,
        estimatedSize: this.timers.size * 512, // Estimate 512B per timer
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        severity: this.timers.size > this.config.maxTimers * 2 ? 'critical' : 'high',
      });
    }

    // Check memory growth pattern
    if (this.memoryProfiles.length >= 10) {
      const recentProfiles = this.memoryProfiles.slice(-10);
      const memoryGrowth = this.calculateMemoryGrowth(recentProfiles);

      if (memoryGrowth > 10 * 1024 * 1024) { // 10MB growth
        leaks.push({
          type: 'component',
          source: 'Memory growth pattern',
          count: 1,
          estimatedSize: memoryGrowth,
          createdAt: Date.now(),
          lastAccessed: Date.now(),
          severity: memoryGrowth > 50 * 1024 * 1024 ? 'critical' : 'medium',
        });
      }
    }

    this.detectedLeaks.push(...leaks);

    if (leaks.length > 0) {
      this.reportMemoryLeaks(leaks);
    }
  }

  /**
   * Calculate memory growth rate
   */
  private calculateMemoryGrowth(profiles: MemoryProfile[]): number {
    if (profiles.length < 2) {return 0;}

    const first = profiles[0];
    const last = profiles[profiles.length - 1];

    return last.usedMemory - first.usedMemory;
  }

  /**
   * Handle memory pressure
   */
  private handleMemoryPressure(profile: MemoryProfile): void {
    logger.warn('[MemoryOptimizer] Memory pressure detected', {
      usedMemory: `${(profile.usedMemory / 1024 / 1024).toFixed(2)}MB`,
      threshold: `${this.config.memoryThreshold}MB`,
    });

    // Trigger aggressive cleanup
    this.performAggressiveCleanup();

    // Force garbage collection
    this.forceGarbageCollection();
  }

  /**
   * Perform automatic cleanup
   */
  private performAutomaticCleanup(): void {
    let cleanedCount = 0;

    // Clean up old cleanup tasks
    const now = Date.now();
    const oldTasks = Array.from(this.cleanupTasks.values())
      .filter(task => now - task.createdAt > 5 * 60 * 1000); // 5 minutes old

    oldTasks.forEach(task => {
      this.cleanupTasks.delete(task.id);
      cleanedCount++;
    });

    // Clean up old memory profiles
    if (this.memoryProfiles.length > 50) {
      this.memoryProfiles = this.memoryProfiles.slice(-50);
      cleanedCount++;
    }

    // Clean up old leak records
    if (this.detectedLeaks.length > 100) {
      this.detectedLeaks = this.detectedLeaks.slice(-100);
      cleanedCount++;
    }

    if (cleanedCount > 0) {
      logger.log('[MemoryOptimizer] Automatic cleanup completed', { cleanedCount });
    }
  }

  /**
   * Perform aggressive cleanup during memory pressure
   */
  private performAggressiveCleanup(): void {
    logger.log('[MemoryOptimizer] Performing aggressive memory cleanup');

    // Execute all cleanup tasks
    this.cleanupTasks.forEach(task => {
      try {
        task.cleanup();
      } catch (error) {
        logger.error('[MemoryOptimizer] Cleanup task failed', error);
      }
    });

    // Clear caches
    this.clearAllCaches();

    // Remove old listeners
    this.cleanupStaleListeners();

    logger.log('[MemoryOptimizer] Aggressive cleanup completed');
  }

  /**
   * Clear all caches
   */
  private clearAllCaches(): void {
    // Clear AsyncStorage cache if needed
    AsyncStorage.getAllKeys().then(keys => {
      const cacheKeys = keys.filter(key =>
        key.startsWith('cache_') ||
        key.startsWith('temp_') ||
        key.startsWith('image_cache_'),
      );

      if (cacheKeys.length > 0) {
        AsyncStorage.multiRemove(cacheKeys);
        logger.log('[MemoryOptimizer] Cleared cache entries', { count: cacheKeys.length });
      }
    });
  }

  /**
   * Cleanup stale listeners
   */
  private cleanupStaleListeners(): void {
    let removedCount = 0;

    this.listeners.forEach(listener => {
      try {
        if (listener && typeof (listener as any).remove === 'function') {
          (listener as any).remove();
          this.listeners.delete(listener);
          removedCount++;
        }
      } catch (error) {
        logger.error('[MemoryOptimizer] Failed to remove listener', error);
      }
    });

    if (removedCount > 0) {
      logger.log('[MemoryOptimizer] Removed stale listeners', { removedCount });
    }
  }

  /**
   * Force garbage collection
   */
  private forceGarbageCollection(): void {
    if ((globalThis as any).gc) {
      try {
        (globalThis as any).gc();
        logger.log('[MemoryOptimizer] Forced garbage collection');
      } catch (error) {
        logger.error('[MemoryOptimizer] Failed to force GC', error);
      }
    }
  }

  /**
   * Register cleanup task
   */
  public registerCleanupTask(task: CleanupTask): void {
    this.cleanupTasks.set(task.id, task);
  }

  /**
   * Unregister cleanup task
   */
  public unregisterCleanupTask(taskId: string): void {
    const task = this.cleanupTasks.get(taskId);
    if (task) {
      try {
        task.cleanup();
      } catch (error) {
        logger.error('[MemoryOptimizer] Cleanup task execution failed', error);
      }
      this.cleanupTasks.delete(taskId);
    }
  }

  /**
   * Track component lifecycle
   */
  public trackComponent(componentName: string): () => void {
    const startTime = Date.now();
    const taskId = `component-${componentName}-${startTime}`;

    logger.log('[MemoryOptimizer] Tracking component', { componentName });

    // Return cleanup function
    return () => {
      this.unregisterCleanupTask(taskId);
      logger.log('[MemoryOptimizer] Component unmounted', { componentName });
    };
  }

  /**
   * Report memory leaks
   */
  private reportMemoryLeaks(leaks: MemoryLeak[]): void {
    leaks.forEach(leak => {
      const message = `Memory leak detected: ${leak.type} - ${leak.source} (${leak.count} instances, ~${(leak.estimatedSize / 1024).toFixed(2)}KB)`;

      if (leak.severity === 'critical') {
        logger.error('[MemoryOptimizer] Memory leak - critical', { leak });
      } else {
        logger.warn('[MemoryOptimizer] Memory leak detected', { leak });
      }
    });
  }

  /**
   * Get memory report
   */
  public getMemoryReport(): {
    currentProfile: MemoryProfile | null;
    recentProfiles: MemoryProfile[];
    detectedLeaks: MemoryLeak[];
    cleanupTasks: number;
    activeListeners: number;
    activeTimers: number;
  } {
    return {
      currentProfile: this.memoryProfiles[this.memoryProfiles.length - 1] || null,
      recentProfiles: this.memoryProfiles.slice(-10),
      detectedLeaks: this.detectedLeaks.slice(-20),
      cleanupTasks: this.cleanupTasks.size,
      activeListeners: this.listeners.size,
      activeTimers: this.timers.size,
    };
  }

  /**
   * Configure memory optimizer
   */
  public configure(newConfig: Partial<MemoryOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.log('[MemoryOptimizer] Configured', { config: this.config });
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
   * Cleanup unused modules based on threshold
   */
  public cleanupUnusedModules(thresholdMs: number): void {
    logger.log('[MemoryOptimizer] Cleaning up unused modules', { thresholdMs });

    // Clean up old cleanup tasks
    const now = Date.now();
    let cleanedCount = 0;

    this.cleanupTasks.forEach((task, id) => {
      if (now - task.createdAt > thresholdMs) {
        try {
          task.cleanup();
          this.cleanupTasks.delete(id);
          cleanedCount++;
        } catch (error) {
          logger.error('[MemoryOptimizer] Failed to cleanup task', error);
        }
      }
    });

    // Force memory cleanup if threshold exceeded
    if (cleanedCount > 0) {
      this.performAutomaticCleanup();
      this.forceGarbageCollection();
      logger.log('[MemoryOptimizer] Cleaned up unused modules', { cleanedCount });
    }
  }

  /**
   * Cleanup optimizer
   */
  public cleanup(): void {
    this.stopMonitoring();

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }

    this.performAggressiveCleanup();
  }
}

export default MemoryOptimizer;
