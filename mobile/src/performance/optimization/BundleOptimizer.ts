/**
 * Bundle Optimizer - Advanced bundle optimization and code splitting utilities
 * Provides dynamic imports, lazy loading, and bundle analysis
 */

// import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { performanceNow, performance } from '../utils/performancePolyfill';
import { logger } from '../../utils/logger';

export interface BundleConfig {
  enableCodeSplitting: boolean;
  enableLazyLoading: boolean;
  preloadCriticalModules: boolean;
  bundleSizeThreshold: number; // MB
  chunkSizeLimit: number; // KB
}

export interface ModuleInfo {
  name: string;
  size: number;
  loadTime: number;
  isLazy: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dependencies: string[];
}

export interface BundleStats {
  totalSize: number;
  loadedSize: number;
  pendingSize: number;
  moduleCount: number;
  lazyModuleCount: number;
  loadTime: number;
  cacheHitRatio: number;
}

class BundleOptimizer {
  private static instance: BundleOptimizer;
  private moduleRegistry: Map<string, ModuleInfo> = new Map();
  private loadedModules: Set<string> = new Set();
  private loadingPromises: Map<string, Promise<unknown>> = new Map(); // eslint-disable @typescript-eslint/no-explicit-any
  private moduleCache: Map<string, any> = new Map();

  private config: BundleConfig = {
    enableCodeSplitting: true,
    enableLazyLoading: true,
    preloadCriticalModules: true,
    bundleSizeThreshold: 10, // 10MB
    chunkSizeLimit: 500, // 500KB
  };

  private constructor() {
    this.initializeOptimizer();
  }

  public static getInstance(): BundleOptimizer {
    if (!BundleOptimizer.instance) {
      BundleOptimizer.instance = new BundleOptimizer();
    }
    return BundleOptimizer.instance;
  }

  /**
   * Initialize bundle optimizer
   */
  private async initializeOptimizer(): Promise<void> {
    await this.loadModuleRegistry();
    await this.preloadCriticalModules();
    this.setupBundleAnalytics();
  }

  /**
   * Load module registry from storage
   */
  private async loadModuleRegistry(): Promise<void> {
    try {
      const registry = await AsyncStorage.getItem('module_registry');
      if (registry) {
        const modules = JSON.parse(registry) as ModuleInfo[];
        modules.forEach(module => {
          this.moduleRegistry.set(module.name, module);
        });
      }
    } catch (error) {
      logger.error('[BundleOptimizer] Failed to load module registry', error);
    }
  }

  /**
   * Preload critical modules
   */
  private async preloadCriticalModules(): Promise<void> {
    if (!this.config.preloadCriticalModules) {return;}

    const criticalModules = Array.from(this.moduleRegistry.values())
      .filter(module => module.priority === 'critical')
      .sort((a, b) => a.size - b.size); // Load smaller modules first

    const preloadPromises = criticalModules.map(module =>
      this.lazyLoadModule(module.name),
    );

    try {
      await Promise.all(preloadPromises);
      logger.log('[BundleOptimizer] Critical modules preloaded', { count: criticalModules.length });
    } catch (error) {
      logger.error('[BundleOptimizer] Failed to preload critical modules', error);
    }
  }

  /**
   * Setup bundle analytics tracking
   */
  private setupBundleAnalytics(): void {
    // Track bundle loading performance
    if (performance && performance.mark) {
      performance.mark('bundle-optimizer-init');
    }
  }

  /**
   * Register a module for lazy loading
   */
  public registerModule(moduleInfo: ModuleInfo): void {
    this.moduleRegistry.set(moduleInfo.name, moduleInfo);
    this.saveModuleRegistry();
  }

  /**
   * Lazy load a module with caching and error handling
   */
  public async lazyLoadModule<T = any>(moduleName: string): Promise<T> {
    // Check if already loaded
    if (this.loadedModules.has(moduleName)) {
      const cached = this.moduleCache.get(moduleName);
      if (cached) {return cached;}
    }

    // Check if currently loading
    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName)! as Promise<T>;
    }

    // Start loading
    const loadingPromise = this.performModuleLoad<T>(moduleName);
    this.loadingPromises.set(moduleName, loadingPromise);

    try {
      const module = await loadingPromise;
      this.loadedModules.add(moduleName);
      this.moduleCache.set(moduleName, module);
      this.loadingPromises.delete(moduleName);
      return module;
    } catch (error) {
      this.loadingPromises.delete(moduleName);
      throw error;
    }
  }

  /**
   * Perform actual module loading with timing
   */
  private async performModuleLoad<T>(moduleName: string): Promise<T> {
    const startTime = Date.now();

    try {
      let module: T;

      // Module-specific loading logic
      switch (moduleName) {
        case 'biometrics':
          // @ts-expect-error - Dynamic import for lazy loading
          module = await import('expo-local-authentication') as unknown as T;
          break;
        case 'camera':
          module = {} as T; // Module not installed
          break;
        case 'contacts':
          module = {} as T; // Module not installed
          break;
        case 'calendar':
          module = {} as T; // Module not installed
          break;
        case 'voice':
          // @ts-expect-error - Dynamic import for lazy loading
          module = await import('@react-native-voice/voice') as unknown as T;
          break;
        case 'push-notifications':
          module = {} as T; // Module not installed
          break;
        case 'background-fetch':
          module = {} as T; // Module not installed
          break;
        case 'expo-image':
          module = {} as T; // Use expo-image for image caching
          break;
        case 'svg':
          module = {} as T; // Module not installed
          break;
        case 'share':
          module = {} as T; // Module not installed
          break;
        case 'modal':
          module = {} as T; // Module not installed
          break;
        case 'qr-scanner':
          module = {} as T; // Module not installed
          break;
        default:
          throw new Error(`Unknown module: ${moduleName}`);
      }

      const loadTime = Date.now() - startTime;
      this.updateModuleStats(moduleName, loadTime);

      logger.log('[BundleOptimizer] Module loaded', { moduleName, loadTime });
      return module;

    } catch (error) {
      logger.error('[BundleOptimizer] Failed to load module', { moduleName, error });
      throw error;
    }
  }

  /**
   * Update module loading statistics
   */
  private updateModuleStats(moduleName: string, loadTime: number): void {
    const moduleInfo = this.moduleRegistry.get(moduleName);
    if (moduleInfo) {
      moduleInfo.loadTime = loadTime;
      this.moduleRegistry.set(moduleName, moduleInfo);
      this.saveModuleRegistry();
    }
  }

  /**
   * Preload modules based on usage patterns
   */
  public async preloadModules(moduleNames: string[]): Promise<void> {
    const promises = moduleNames.map(name => this.lazyLoadModule(name));

    try {
      await Promise.allSettled(promises);
      logger.log('[BundleOptimizer] Modules preloaded', { count: moduleNames.length });
    } catch (error) {
      logger.error('[BundleOptimizer] Failed to preload modules', error);
    }
  }

  /**
   * Unload unused modules to free memory
   */
  public unloadModule(moduleName: string): void {
    if (this.loadedModules.has(moduleName)) {
      this.moduleCache.delete(moduleName);
      this.loadedModules.delete(moduleName);
      logger.log('[BundleOptimizer] Module unloaded', { moduleName });
    }
  }

  /**
   * Unload modules that haven't been used recently
   */
  public cleanupUnusedModules(unusedThresholdMs: number = 5 * 60 * 1000): void {
    const now = Date.now();
    const modulesToUnload: string[] = [];

    this.moduleRegistry.forEach((moduleInfo, moduleName) => {
      if (
        this.loadedModules.has(moduleName) &&
        moduleInfo.priority !== 'critical' &&
        (now - moduleInfo.loadTime) > unusedThresholdMs
      ) {
        modulesToUnload.push(moduleName);
      }
    });

    modulesToUnload.forEach(module => this.unloadModule(module));

    if (modulesToUnload.length > 0) {
      logger.log('[BundleOptimizer] Cleaned up unused modules', { cleanedCount: modulesToUnload.length });
    }
  }

  /**
   * Get bundle statistics
   */
  public getBundleStats(): BundleStats {
    const modules = Array.from(this.moduleRegistry.values());
    const loadedModules = modules.filter(m => this.loadedModules.has(m.name));

    const totalSize = modules.reduce((sum, m) => sum + m.size, 0);
    const loadedSize = loadedModules.reduce((sum, m) => sum + m.size, 0);
    const pendingSize = totalSize - loadedSize;

    const totalLoadTime = loadedModules.reduce((sum, m) => sum + m.loadTime, 0);
    const cacheHits = this.moduleCache.size;
    const cacheAttempts = this.loadedModules.size;

    return {
      totalSize,
      loadedSize,
      pendingSize,
      moduleCount: modules.length,
      lazyModuleCount: modules.filter(m => m.isLazy).length,
      loadTime: totalLoadTime,
      cacheHitRatio: cacheAttempts > 0 ? cacheHits / cacheAttempts : 0,
    };
  }

  /**
   * Analyze bundle and suggest optimizations
   */
  public analyzeBundleOptimizations(): {
    suggestions: string[];
    criticalIssues: string[];
    stats: BundleStats;
  } {
    const stats = this.getBundleStats();
    const suggestions: string[] = [];
    const criticalIssues: string[] = [];

    // Check bundle size
    if (stats.totalSize > this.config.bundleSizeThreshold * 1024 * 1024) {
      criticalIssues.push(`Bundle size (${(stats.totalSize / 1024 / 1024).toFixed(2)}MB) exceeds threshold`);
    }

    // Check module loading performance
    const slowModules = Array.from(this.moduleRegistry.values())
      .filter(m => m.loadTime > 1000 && this.loadedModules.has(m.name));

    if (slowModules.length > 0) {
      suggestions.push(`${slowModules.length} modules have slow load times (>1s)`);
    }

    // Check cache efficiency
    if (stats.cacheHitRatio < 0.8) {
      suggestions.push(`Low cache hit ratio (${(stats.cacheHitRatio * 100).toFixed(1)}%)`);
    }

    // Check lazy loading usage
    const lazyLoadingRatio = stats.lazyModuleCount / stats.moduleCount;
    if (lazyLoadingRatio < 0.7) {
      suggestions.push(`Consider making more modules lazy-loadable (${(lazyLoadingRatio * 100).toFixed(1)}% currently lazy)`);
    }

    return { suggestions, criticalIssues, stats };
  }

  /**
   * Save module registry to storage
   */
  private async saveModuleRegistry(): Promise<void> {
    try {
      const modules = Array.from(this.moduleRegistry.values());
      await AsyncStorage.setItem('module_registry', JSON.stringify(modules));
    } catch (error) {
      logger.error('[BundleOptimizer] Failed to save module registry', error);
    }
  }

  /**
   * Configure bundle optimizer
   */
  public configure(newConfig: Partial<BundleConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.log('[BundleOptimizer] Configured', { config: this.config });
  }

  /**
   * Reset optimizer state
   */
  public reset(): void {
    this.moduleCache.clear();
    this.loadedModules.clear();
    this.loadingPromises.clear();
    logger.log('[BundleOptimizer] Reset');
  }
}

// Factory functions for common module loading patterns
export const createLazyComponent = <T>(
  moduleName: string,
  componentName: string = 'default',
) => {
  return async (): Promise<T> => {
    const optimizer = BundleOptimizer.getInstance();
    const module = await optimizer.lazyLoadModule<Record<string, T>>(moduleName);
    return module[componentName];
  };
};

export const withLazyLoading = <T>(
  Component: T,
  _moduleName: string,
): T => {
  // This would wrap a component with lazy loading logic
  return Component;
};

export default BundleOptimizer;
