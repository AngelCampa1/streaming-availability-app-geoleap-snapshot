/**
 * Startup Optimizer - Comprehensive startup time optimization system
 * Provides lazy initialization, critical path optimization, and startup profiling
 */

import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BundleOptimizer from './BundleOptimizer';
import { performanceNow } from '../utils/performancePolyfill';
import { logger } from '../../utils/logger';

export interface StartupConfig {
  enableLazyInitialization: boolean;
  enableCriticalPathOptimization: boolean;
  enableStartupProfiling: boolean;
  deferNonCriticalServices: boolean;
  preloadCriticalData: boolean;
  startupTimeout: number; // ms
  maxConcurrentInitializations: number;
}

export interface StartupService {
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dependencies: string[];
  initialize: () => Promise<void>;
  isInitialized: boolean;
  initTime?: number;
  deferrable: boolean;
}

export interface StartupMetrics {
  totalStartupTime: number;
  criticalPathTime: number;
  serviceInitTimes: Record<string, number>;
  bundleLoadTime: number;
  dataPreloadTime: number;
  firstRenderTime: number;
  timeToInteractive: number;
  memoryUsage: number;
}

export interface StartupProfile {
  timestamp: number;
  platform: string;
  version: string;
  metrics: StartupMetrics;
  services: StartupService[];
  criticalPath: string[];
  optimizations: string[];
}

class StartupOptimizer {
  private static instance: StartupOptimizer;
  private services: Map<string, StartupService> = new Map();
  private initializedServices: Set<string> = new Set();
  private startupStartTime = 0;
  private isInitializing = false;
  private initializationQueue: string[] = [];
  private bundleOptimizer = BundleOptimizer.getInstance();

  private config: StartupConfig = {
    enableLazyInitialization: true,
    enableCriticalPathOptimization: true,
    enableStartupProfiling: true,
    deferNonCriticalServices: true,
    preloadCriticalData: true,
    startupTimeout: 10000, // 10 seconds
    maxConcurrentInitializations: 3,
  };

  private startupMetrics: StartupMetrics = {
    totalStartupTime: 0,
    criticalPathTime: 0,
    serviceInitTimes: {},
    bundleLoadTime: 0,
    dataPreloadTime: 0,
    firstRenderTime: 0,
    timeToInteractive: 0,
    memoryUsage: 0,
  };

  private constructor() {
    this.initializeOptimizer();
  }

  public static getInstance(): StartupOptimizer {
    if (!StartupOptimizer.instance) {
      StartupOptimizer.instance = new StartupOptimizer();
    }
    return StartupOptimizer.instance;
  }

  /**
   * Initialize startup optimizer
   */
  private initializeOptimizer(): void {
    this.registerDefaultServices();
    this.setupAppStateListener();
  }

  /**
   * Register default services for initialization
   */
  private registerDefaultServices(): void {
    // Critical services (must load first)
    this.registerService({
      name: 'performance-monitor',
      priority: 'critical',
      dependencies: [],
      initialize: this.initializePerformanceMonitor.bind(this),
      isInitialized: false,
      deferrable: false,
    });

    this.registerService({
      name: 'memory-optimizer',
      priority: 'critical',
      dependencies: ['performance-monitor'],
      initialize: this.initializeMemoryOptimizer.bind(this),
      isInitialized: false,
      deferrable: false,
    });

    this.registerService({
      name: 'network-optimizer',
      priority: 'critical',
      dependencies: [],
      initialize: this.initializeNetworkOptimizer.bind(this),
      isInitialized: false,
      deferrable: false,
    });

    // High priority services
    this.registerService({
      name: 'authentication',
      priority: 'high',
      dependencies: ['network-optimizer'],
      initialize: this.initializeAuthentication.bind(this),
      isInitialized: false,
      deferrable: false,
    });

    this.registerService({
      name: 'navigation',
      priority: 'high',
      dependencies: ['authentication'],
      initialize: this.initializeNavigation.bind(this),
      isInitialized: false,
      deferrable: false,
    });

    // Medium priority services (can be deferred)
    this.registerService({
      name: 'analytics',
      priority: 'medium',
      dependencies: ['authentication'],
      initialize: this.initializeAnalytics.bind(this),
      isInitialized: false,
      deferrable: true,
    });

    this.registerService({
      name: 'push-notifications',
      priority: 'medium',
      dependencies: ['authentication'],
      initialize: this.initializePushNotifications.bind(this),
      isInitialized: false,
      deferrable: true,
    });

    // Low priority services (fully deferrable)
    this.registerService({
      name: 'biometrics',
      priority: 'low',
      dependencies: ['authentication'],
      initialize: this.initializeBiometrics.bind(this),
      isInitialized: false,
      deferrable: true,
    });

    this.registerService({
      name: 'background-sync',
      priority: 'low',
      dependencies: ['network-optimizer'],
      initialize: this.initializeBackgroundSync.bind(this),
      isInitialized: false,
      deferrable: true,
    });
  }

  /**
   * Setup app state listener for deferred initialization
   */
  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && !this.isInitializing) {
        // Initialize deferred services when app becomes active
        this.initializeDeferredServices();
      }
    });
  }

  /**
   * Register a service for initialization
   */
  public registerService(service: StartupService): void {
    this.services.set(service.name, service);
    logger.log('[StartupOptimizer] Registered startup service', { serviceName: service.name, priority: service.priority });
  }

  /**
   * Start the application initialization process
   */
  public async startInitialization(): Promise<StartupMetrics> {
    if (this.isInitializing) {
      throw new Error('Initialization already in progress');
    }

    logger.log('[StartupOptimizer] Starting application initialization');
    this.isInitializing = true;
    this.startupStartTime = performanceNow();

    try {
      // Phase 1: Bundle optimization
      await this.optimizeBundle();

      // Phase 2: Critical path initialization
      await this.initializeCriticalPath();

      // Phase 3: High priority services
      await this.initializeHighPriorityServices();

      // Phase 4: Preload critical data
      if (this.config.preloadCriticalData) {
        await this.preloadCriticalData();
      }

      // Phase 5: First render preparation
      await this.prepareFirstRender();

      // Calculate final metrics
      this.finalizeStartupMetrics();

      logger.log('[StartupOptimizer] Application initialized', { totalStartupTime: this.startupMetrics.totalStartupTime });

      // Schedule deferred services
      if (this.config.deferNonCriticalServices) {
        this.scheduleDeferredInitialization();
      }

      return this.startupMetrics;

    } catch (error) {
      logger.error('[StartupOptimizer] Initialization failed', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Optimize bundle loading
   */
  private async optimizeBundle(): Promise<void> {
    const bundleStart = performanceNow();

    try {
      // Preload critical modules
      await this.bundleOptimizer.preloadModules([
        'navigation',
        'authentication',
        'network',
      ]);

      this.startupMetrics.bundleLoadTime = performanceNow() - bundleStart;
      logger.log('[StartupOptimizer] Bundle optimized', { bundleLoadTime: this.startupMetrics.bundleLoadTime });

    } catch (error) {
      logger.error('[StartupOptimizer] Bundle optimization failed', error);
      this.startupMetrics.bundleLoadTime = performanceNow() - bundleStart;
    }
  }

  /**
   * Initialize critical path services
   */
  private async initializeCriticalPath(): Promise<void> {
    const criticalStart = performanceNow();

    const criticalServices = Array.from(this.services.values())
      .filter(service => service.priority === 'critical')
      .sort((a, b) => this.calculateServicePriority(a) - this.calculateServicePriority(b));

    logger.log('[StartupOptimizer] Initializing critical services', { count: criticalServices.length });

    for (const service of criticalServices) {
      await this.initializeService(service.name);
    }

    this.startupMetrics.criticalPathTime = performanceNow() - criticalStart;
    logger.log('[StartupOptimizer] Critical path initialized', { criticalPathTime: this.startupMetrics.criticalPathTime });
  }

  /**
   * Initialize high priority services
   */
  private async initializeHighPriorityServices(): Promise<void> {
    const highPriorityServices = Array.from(this.services.values())
      .filter(service => service.priority === 'high' && !service.isInitialized);

    logger.log('[StartupOptimizer] Initializing high priority services', { count: highPriorityServices.length });

    // Initialize in parallel with concurrency limit
    await this.initializeServicesInParallel(
      highPriorityServices.map(s => s.name),
      this.config.maxConcurrentInitializations,
    );
  }

  /**
   * Initialize a single service
   */
  private async initializeService(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }

    if (service.isInitialized) {
      return; // Already initialized
    }

    // Check dependencies
    for (const dependency of service.dependencies) {
      if (!this.initializedServices.has(dependency)) {
        await this.initializeService(dependency);
      }
    }

    const startTime = performanceNow();

    try {
      logger.log('[StartupOptimizer] Initializing service', { serviceName });
      await service.initialize();

      const initTime = performanceNow() - startTime;
      service.initTime = initTime;
      service.isInitialized = true;
      this.initializedServices.add(serviceName);
      this.startupMetrics.serviceInitTimes[serviceName] = initTime;

      logger.log('[StartupOptimizer] Service initialized', { serviceName, initTime });

    } catch (error) {
      logger.error('[StartupOptimizer] Failed to initialize service', error);
      throw error;
    }
  }

  /**
   * Initialize services in parallel with concurrency limit
   */
  private async initializeServicesInParallel(serviceNames: string[], maxConcurrent: number): Promise<void> {
    const batches: string[][] = [];

    // Create batches
    for (let i = 0; i < serviceNames.length; i += maxConcurrent) {
      batches.push(serviceNames.slice(i, i + maxConcurrent));
    }

    // Execute batches sequentially, services within batch in parallel
    for (const batch of batches) {
      await Promise.all(batch.map(serviceName => this.initializeService(serviceName)));
    }
  }

  /**
   * Preload critical data
   */
  private async preloadCriticalData(): Promise<void> {
    const preloadStart = performanceNow();

    try {
      // Simulate critical data preloading
      const preloadTasks = [
        this.preloadUserData(),
        this.preloadAppConfig(),
        this.preloadCachedContent(),
      ];

      await Promise.all(preloadTasks);

      this.startupMetrics.dataPreloadTime = performanceNow() - preloadStart;
      logger.log('[StartupOptimizer] Critical data preloaded', { dataPreloadTime: this.startupMetrics.dataPreloadTime });

    } catch (error) {
      logger.error('[StartupOptimizer] Data preloading failed', error);
      this.startupMetrics.dataPreloadTime = performanceNow() - preloadStart;
    }
  }

  /**
   * Prepare for first render
   */
  private async prepareFirstRender(): Promise<void> {
    const renderStart = performanceNow();

    try {
      // Prepare initial UI state
      await this.prepareInitialUIState();

      this.startupMetrics.firstRenderTime = performanceNow() - renderStart;
      logger.log('[StartupOptimizer] First render prepared', { firstRenderTime: this.startupMetrics.firstRenderTime });

    } catch (error) {
      logger.error('[StartupOptimizer] First render preparation failed', error);
      this.startupMetrics.firstRenderTime = performanceNow() - renderStart;
    }
  }

  /**
   * Schedule deferred service initialization
   */
  private scheduleDeferredInitialization(): void {
    const deferredServices = Array.from(this.services.values())
      .filter(service => service.deferrable && !service.isInitialized);

    if (deferredServices.length === 0) {return;}

    logger.log('[StartupOptimizer] Scheduling deferred services', { count: deferredServices.length });

    // Initialize after a short delay to avoid blocking the UI
    setTimeout(() => {
      this.initializeDeferredServices();
    }, 1000);
  }

  /**
   * Initialize deferred services
   */
  private async initializeDeferredServices(): Promise<void> {
    const deferredServices = Array.from(this.services.values())
      .filter(service => service.deferrable && !service.isInitialized)
      .sort((a, b) => this.calculateServicePriority(a) - this.calculateServicePriority(b));

    logger.log('[StartupOptimizer] Initializing deferred services', { count: deferredServices.length });

    try {
      await this.initializeServicesInParallel(
        deferredServices.map(s => s.name),
        Math.max(1, this.config.maxConcurrentInitializations - 1),
      );

      logger.log('[StartupOptimizer] Deferred services initialization completed');
    } catch (error) {
      logger.error('[StartupOptimizer] Deferred services initialization failed', error);
    }
  }

  /**
   * Calculate service priority for sorting
   */
  private calculateServicePriority(service: StartupService): number {
    const priorityWeights = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityWeights[service.priority] * 100 + service.dependencies.length;
  }

  /**
   * Finalize startup metrics
   */
  private finalizeStartupMetrics(): void {
    this.startupMetrics.totalStartupTime = performanceNow() - this.startupStartTime;
    this.startupMetrics.timeToInteractive = this.startupMetrics.totalStartupTime;
    this.startupMetrics.memoryUsage = this.estimateMemoryUsage();
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // This would use native modules in a real implementation
    return 50 * 1024 * 1024; // 50MB estimate
  }

  // Service initialization methods
  private async initializePerformanceMonitor(): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve, 10));
  }

  private async initializeMemoryOptimizer(): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve, 15));
  }

  private async initializeNetworkOptimizer(): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve, 20));
  }

  private async initializeAuthentication(): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve, 50));
  }

  private async initializeNavigation(): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve, 30));
  }

  private async initializeAnalytics(): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve, 40));
  }

  private async initializePushNotifications(): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve, 60));
  }

  private async initializeBiometrics(): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve, 100));
  }

  private async initializeBackgroundSync(): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve, 80));
  }

  // Data preloading methods
  private async preloadUserData(): Promise<void> {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        logger.log('[StartupOptimizer] User data preloaded from cache');
      }
    } catch (error) {
      logger.error('[StartupOptimizer] Failed to preload user data', error);
    }
  }

  private async preloadAppConfig(): Promise<void> {
    try {
      const config = await AsyncStorage.getItem('app_config');
      if (config) {
        logger.log('[StartupOptimizer] App config preloaded from cache');
      }
    } catch (error) {
      logger.error('[StartupOptimizer] Failed to preload app config', error);
    }
  }

  private async preloadCachedContent(): Promise<void> {
    try {
      const cachedContent = await AsyncStorage.getItem('cached_content');
      if (cachedContent) {
        logger.log('[StartupOptimizer] Cached content preloaded');
      }
    } catch (error) {
      logger.error('[StartupOptimizer] Failed to preload cached content', error);
    }
  }

  private async prepareInitialUIState(): Promise<void> {
    // Prepare initial UI state
    await new Promise<void>(resolve => setTimeout(resolve, 10));
  }

  /**
   * Get startup metrics
   */
  public getStartupMetrics(): StartupMetrics {
    return { ...this.startupMetrics };
  }

  /**
   * Get startup profile
   */
  public getStartupProfile(): StartupProfile {
    return {
      timestamp: Date.now(),
      platform: Platform.OS,
      version: Platform.Version.toString(),
      metrics: this.startupMetrics,
      services: Array.from(this.services.values()),
      criticalPath: this.getCriticalPath(),
      optimizations: this.getAppliedOptimizations(),
    };
  }

  /**
   * Get critical path services
   */
  private getCriticalPath(): string[] {
    return Array.from(this.services.values())
      .filter(service => service.priority === 'critical' || service.priority === 'high')
      .sort((a, b) => this.calculateServicePriority(a) - this.calculateServicePriority(b))
      .map(service => service.name);
  }

  /**
   * Get applied optimizations
   */
  private getAppliedOptimizations(): string[] {
    const optimizations: string[] = [];

    if (this.config.enableLazyInitialization) {
      optimizations.push('Lazy service initialization');
    }

    if (this.config.enableCriticalPathOptimization) {
      optimizations.push('Critical path optimization');
    }

    if (this.config.deferNonCriticalServices) {
      optimizations.push('Deferred non-critical services');
    }

    if (this.config.preloadCriticalData) {
      optimizations.push('Critical data preloading');
    }

    return optimizations;
  }

  /**
   * Configure startup optimizer
   */
  public configure(newConfig: Partial<StartupConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.log('[StartupOptimizer] Configured', { config: this.config });
  }

  /**
   * Reset startup state
   */
  public reset(): void {
    this.initializedServices.clear();
    this.initializationQueue = [];
    this.isInitializing = false;

    // Reset service states
    this.services.forEach(service => {
      service.isInitialized = false;
      service.initTime = undefined;
    });

    logger.log('[StartupOptimizer] Reset');
  }
}

export default StartupOptimizer;
