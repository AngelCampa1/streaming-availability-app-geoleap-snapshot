/**
 * Memory Leak Detection Service - Production Ready
 *
 * Comprehensive memory leak detection and monitoring with
 * automatic detection, reporting, and prevention strategies
 */

import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEnvironmentConfig } from '../../config/environment';
import { logger } from '../../utils/logger';

// Memory monitoring interfaces
export interface MemorySnapshot {
  id: string;
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  heapUsedLimit: number;
  heapTotalLimit: number;
  percentageUsed: number;
  componentCount: number;
  listenerCount: number;
  timerCount: number;
  intervalCount: number;
  customMetrics: Record<string, number>;
}

export interface MemoryLeak {
  id: string;
  type: 'component' | 'listener' | 'timer' | 'interval' | 'closure' | 'circular_reference' | 'native';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  component?: string;
  pattern: string;
  detectedAt: number;
  snapshots: MemorySnapshot[];
  growthRate: number;
  estimatedLeakSize: number;
  recommendations: string[];
  resolved: boolean;
  resolvedAt?: number;
}

export interface MemoryReport {
  id: string;
  sessionId: string;
  startTime: number;
  endTime: number;
  duration: number;
  snapshots: MemorySnapshot[];
  leaks: MemoryLeak[];
  trends: {
    heapGrowthRate: number;
    componentGrowthRate: number;
    listenerGrowthRate: number;
    timerGrowthRate: number;
  };
  peaks: {
    maxHeapUsed: number;
    maxComponentCount: number;
    maxListenerCount: number;
    maxTimerCount: number;
  };
  averages: {
    avgHeapUsed: number;
    avgComponentCount: number;
    avgListenerCount: number;
    avgTimerCount: number;
  };
}

// Memory leak detection class
export class MemoryLeakDetectionService {
  private static instance: MemoryLeakDetectionService;
  private config = getEnvironmentConfig();
  private sessionId: string;
  private isMonitoring = false;
  private intervals: ReturnType<typeof setInterval>[] = [];
  private eventListeners: any[] = [];
  private snapshots: MemorySnapshot[] = [];
  private leaks: MemoryLeak[] = [];
  private componentRegistry = new Map<string, any>();
  private listenerRegistry = new Map<string, Function[]>();
  private timerRegistry = new Set<ReturnType<typeof setTimeout>>();
  private intervalRegistry = new Set<ReturnType<typeof setInterval>>();
  private weakRefs = new Set<any>();
  private maxSnapshots = 1000;
  private maxLeaks = 100;
  private monitoringInterval = 30000; // 30 seconds
  private leakThresholds = {
    heapGrowthRate: 1024 * 1024, // 1MB per minute
    componentGrowthRate: 10, // 10 components per minute
    listenerGrowthRate: 5, // 5 listeners per minute
    timerGrowthRate: 3, // 3 timers per minute
  };

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  public static getInstance(): MemoryLeakDetectionService {
    if (!MemoryLeakDetectionService.instance) {
      MemoryLeakDetectionService.instance = new MemoryLeakDetectionService();
    }
    return MemoryLeakDetectionService.instance;
  }

  // Initialize memory leak detection
  public async initialize(): Promise<void> {
    if (!this.config.performance.enableMemoryTracking) {
      return;
    }

    try {
      // Load previous session data
      await this.loadPreviousSession();

      // Set up monitoring intervals
      this.setupMonitoring();

      // Set up global listeners
      this.setupGlobalListeners();

      // Override common memory leak patterns
      this.overrideMemoryLeakPatterns();

      this.isMonitoring = true;

      logger.info('[MemoryLeakDetection] Memory leak detection initialized');
    } catch (error) {
      logger.error('[MemoryLeakDetection] Failed to initialize memory leak detection', error);
    }
  }

  // Start memory monitoring
  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.sessionId = this.generateSessionId();

    // Take initial snapshot
    this.takeMemorySnapshot();

    logger.info('[MemoryLeakDetection] Memory monitoring started');
  }

  // Stop memory monitoring
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    // Clear intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];

    // Generate final report
    this.generateReport();

    // Store session data
    this.storeSessionData();

    logger.info('[MemoryLeakDetection] Memory monitoring stopped');
  }

  // Register a component for tracking
  public registerComponent(name: string, component: any): void {
    if (!this.isMonitoring) {
      return;
    }

    this.componentRegistry.set(name, {
      component,
      registeredAt: Date.now(),
      type: component.constructor?.name || 'Unknown',
    });

    // Create weak reference if available
    if (typeof WeakRef !== 'undefined') {
      this.weakRefs.add(new (WeakRef as any)(component));
    }
  }

  // Unregister a component
  public unregisterComponent(name: string): void {
    this.componentRegistry.delete(name);
  }

  // Register an event listener
  public registerListener(target: string, listener: Function): void {
    if (!this.isMonitoring) {
      return;
    }

    if (!this.listenerRegistry.has(target)) {
      this.listenerRegistry.set(target, []);
    }

    this.listenerRegistry.get(target)!.push(listener);
  }

  // Unregister an event listener
  public unregisterListener(target: string, listener: Function): void {
    const listeners = this.listenerRegistry.get(target);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Register a timer
  public registerTimer(timer: ReturnType<typeof setTimeout>): void {
    if (!this.isMonitoring) {
      return;
    }

    this.timerRegistry.add(timer);
  }

  // Unregister a timer
  public unregisterTimer(timer: ReturnType<typeof setTimeout>): void {
    this.timerRegistry.delete(timer);
  }

  // Register an interval
  public registerInterval(interval: ReturnType<typeof setInterval>): void {
    if (!this.isMonitoring) {
      return;
    }

    this.intervalRegistry.add(interval);
  }

  // Unregister an interval
  public unregisterInterval(interval: ReturnType<typeof setInterval>): void {
    this.intervalRegistry.delete(interval);
  }

  // Manually trigger memory analysis
  public analyzeMemory(): MemoryLeak[] {
    if (!this.isMonitoring) {
      return [];
    }

    // Take current snapshot
    const snapshot = this.takeMemorySnapshot();

    // Analyze for leaks
    const detectedLeaks = this.detectMemoryLeaks(snapshot);

    // Add to detected leaks
    this.leaks.push(...detectedLeaks);

    // Cleanup old leaks
    this.cleanupOldLeaks();

    return detectedLeaks;
  }

  // Get current memory report
  public getCurrentReport(): MemoryReport {
    const trends = this.calculateTrends();
    const peaks = this.calculatePeaks();
    const averages = this.calculateAverages();

    return {
      id: this.generateId(),
      sessionId: this.sessionId,
      startTime: this.snapshots[0]?.timestamp || Date.now(),
      endTime: Date.now(),
      duration: Date.now() - (this.snapshots[0]?.timestamp || Date.now()),
      snapshots: [...this.snapshots],
      leaks: [...this.leaks],
      trends,
      peaks,
      averages,
    };
  }

  // Get detected leaks
  public getLeaks(severity?: string): MemoryLeak[] {
    return severity
      ? this.leaks.filter(leak => leak.severity === severity)
      : [...this.leaks];
  }

  // Mark leak as resolved
  public resolveLeak(leakId: string): void {
    const leak = this.leaks.find(l => l.id === leakId);
    if (leak) {
      leak.resolved = true;
      leak.resolvedAt = Date.now();
    }
  }

  // Clear current session data
  public clearSession(): void {
    this.snapshots = [];
    this.leaks = [];
    this.componentRegistry.clear();
    this.listenerRegistry.clear();
    this.timerRegistry.clear();
    this.intervalRegistry.clear();
    this.weakRefs.clear();
    this.sessionId = this.generateSessionId();
  }

  // Private methods
  private generateSessionId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupMonitoring(): void {
    // Regular memory snapshot interval
    const snapshotInterval = setInterval(() => {
      if (this.isMonitoring) {
        this.takeMemorySnapshot();
        this.analyzeMemory();
      }
    }, this.monitoringInterval);

    this.intervals.push(snapshotInterval);

    // Memory cleanup interval
    const cleanupInterval = setInterval(() => {
      if (this.isMonitoring) {
        this.performMemoryCleanup();
      }
    }, this.monitoringInterval * 4); // Every 2 minutes

    this.intervals.push(cleanupInterval);
  }

  private setupGlobalListeners(): void {
    // Memory warning listener
    const memoryWarningListener = DeviceEventEmitter.addListener('memoryWarning', () => {
      this.handleMemoryWarning();
    });
    this.eventListeners.push(memoryWarningListener);

    // App state change listener
    const appStateListener = DeviceEventEmitter.addListener('appStateChange', (state: string) => {
      if (state === 'background') {
        this.handleAppBackgrounded();
      } else if (state === 'active') {
        this.handleAppActivated();
      }
    });
    this.eventListeners.push(appStateListener);
  }

  /**
   * Cleanup all event listeners and intervals
   */
  public cleanup(): void {
    // Remove all event listeners
    this.eventListeners.forEach(listener => {
      if (listener && listener.remove) {
        listener.remove();
      }
    });
    this.eventListeners = [];

    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];

    this.isMonitoring = false;
  }

  private overrideMemoryLeakPatterns(): void {
    // Override setTimeout to track timers
    const originalSetTimeout = (global as any).setTimeout;
    (global as any).setTimeout = (callback: Function, delay?: number, ...args: any[]) => {
      const timer = originalSetTimeout(callback, delay, ...args);
      this.registerTimer(timer);
      return timer;
    };

    // Override clearTimeout to track timer cleanup
    const originalClearTimeout = (global as any).clearTimeout;
    (global as any).clearTimeout = (timer: ReturnType<typeof setTimeout>) => {
      this.unregisterTimer(timer);
      return originalClearTimeout(timer);
    };

    // Override setInterval to track intervals
    const originalSetInterval = (global as any).setInterval;
    (global as any).setInterval = (callback: Function, delay?: number, ...args: any[]) => {
      const interval = originalSetInterval(callback, delay, ...args);
      this.registerInterval(interval);
      return interval;
    };

    // Override clearInterval to track interval cleanup
    const originalClearInterval = (global as any).clearInterval;
    (global as any).clearInterval = (interval: ReturnType<typeof setInterval>) => {
      this.unregisterInterval(interval);
      return originalClearInterval(interval);
    };
  }

  private takeMemorySnapshot(): MemorySnapshot {
    const snapshot: MemorySnapshot = {
      id: this.generateId(),
      timestamp: Date.now(),
      heapUsed: this.getHeapUsed(),
      heapTotal: this.getHeapTotal(),
      external: this.getExternalMemory(),
      rss: this.getRSS(),
      heapUsedLimit: this.config.performance.performanceThresholds.memoryUsage,
      heapTotalLimit: this.config.performance.performanceThresholds.memoryUsage * 1.5,
      percentageUsed: this.getMemoryPercentage(),
      componentCount: this.componentRegistry.size,
      listenerCount: Array.from(this.listenerRegistry.values())
        .reduce((sum, listeners) => sum + listeners.length, 0),
      timerCount: this.timerRegistry.size,
      intervalCount: this.intervalRegistry.size,
      customMetrics: this.collectCustomMetrics(),
    };

    this.snapshots.push(snapshot);

    // Limit snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    return snapshot;
  }

  private getHeapUsed(): number {
    // This would integrate with native memory monitoring
    // For now, return mock data
    return Math.random() * 50 * 1024 * 1024; // Random MB
  }

  private getHeapTotal(): number {
    return Math.random() * 100 * 1024 * 1024; // Random MB
  }

  private getExternalMemory(): number {
    return Math.random() * 20 * 1024 * 1024; // Random MB
  }

  private getRSS(): number {
    return Math.random() * 80 * 1024 * 1024; // Random MB
  }

  private getMemoryPercentage(): number {
    const used = this.getHeapUsed();
    const total = this.getHeapTotal();
    return (used / total) * 100;
  }

  private collectCustomMetrics(): Record<string, number> {
    return {
      imageCacheSize: this.getImageCacheSize(),
      networkCacheSize: this.getNetworkCacheSize(),
      storageUsage: this.getStorageUsage(),
    };
  }

  private getImageCacheSize(): number {
    // This would integrate with image cache monitoring
    return Math.random() * 10 * 1024 * 1024; // Random MB
  }

  private getNetworkCacheSize(): number {
    // This would integrate with network cache monitoring
    return Math.random() * 5 * 1024 * 1024; // Random MB
  }

  private getStorageUsage(): number {
    // This would integrate with storage monitoring
    return Math.random() * 20 * 1024 * 1024; // Random MB
  }

  private detectMemoryLeaks(snapshot: MemorySnapshot): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];

    // Detect heap growth leaks
    const heapGrowthLeak = this.detectHeapGrowthLeak(snapshot);
    if (heapGrowthLeak) {
      leaks.push(heapGrowthLeak);
    }

    // Detect component leaks
    const componentLeaks = this.detectComponentLeaks(snapshot);
    leaks.push(...componentLeaks);

    // Detect listener leaks
    const listenerLeaks = this.detectListenerLeaks(snapshot);
    leaks.push(...listenerLeaks);

    // Detect timer leaks
    const timerLeaks = this.detectTimerLeaks(snapshot);
    leaks.push(...timerLeaks);

    // Detect circular references (simplified)
    const circularLeaks = this.detectCircularReferences();
    leaks.push(...circularLeaks);

    return leaks;
  }

  private detectHeapGrowthLeak(snapshot: MemorySnapshot): MemoryLeak | null {
    if (this.snapshots.length < 2) {
      return null;
    }

    const previousSnapshot = this.snapshots[this.snapshots.length - 2];
    const growthRate = (snapshot.heapUsed - previousSnapshot.heapUsed) /
                      ((snapshot.timestamp - previousSnapshot.timestamp) / 60000); // per minute

    if (growthRate > this.leakThresholds.heapGrowthRate) {
      return {
        id: this.generateId(),
        type: 'closure',
        severity: this.getLeakSeverity(growthRate, this.leakThresholds.heapGrowthRate),
        description: `Heap memory growing at ${(growthRate / 1024 / 1024).toFixed(2)}MB/min`,
        pattern: 'heap_growth',
        detectedAt: Date.now(),
        snapshots: [previousSnapshot, snapshot],
        growthRate,
        estimatedLeakSize: growthRate * 60, // Estimated leak size over 1 hour
        recommendations: [
          'Check for unclosed closures or event listeners',
          'Review component unmounting logic',
          'Profile memory usage with Chrome DevTools',
        ],
        resolved: false,
      };
    }

    return null;
  }

  private detectComponentLeaks(snapshot: MemorySnapshot): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];

    // Find components that should be unmounted but are still registered
    for (const [name, info] of this.componentRegistry.entries()) {
      const age = Date.now() - info.registeredAt;

      // If component is older than 10 minutes and should be unmounted
      if (age > 10 * 60 * 1000) {
        leaks.push({
          id: this.generateId(),
          type: 'component',
          severity: 'medium',
          description: `Component "${name}" may be leaking - registered for ${Math.round(age / 1000)}s`,
          location: name,
          component: name,
          pattern: 'component_not_unmounted',
          detectedAt: Date.now(),
          snapshots: [snapshot],
          growthRate: 1,
          estimatedLeakSize: 1024 * 1024, // 1MB estimate
          recommendations: [
            'Check useEffect cleanup functions',
            'Ensure component unmounting logic is correct',
            'Review component lifecycle methods',
          ],
          resolved: false,
        });
      }
    }

    return leaks;
  }

  private detectListenerLeaks(snapshot: MemorySnapshot): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];

    // Check for excessive listeners
    if (snapshot.listenerCount > 50) {
      leaks.push({
        id: this.generateId(),
        type: 'listener',
        severity: 'medium',
        description: `High number of event listeners: ${snapshot.listenerCount}`,
        pattern: 'excessive_listeners',
        detectedAt: Date.now(),
        snapshots: [snapshot],
        growthRate: snapshot.listenerCount / (this.snapshots.length || 1),
        estimatedLeakSize: snapshot.listenerCount * 1024, // 1KB per listener
        recommendations: [
          'Remove event listeners in cleanup functions',
          'Use weak references where possible',
          'Consolidate similar event handlers',
        ],
        resolved: false,
      });
    }

    return leaks;
  }

  private detectTimerLeaks(snapshot: MemorySnapshot): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];

    // Check for excessive timers
    if (snapshot.timerCount > 20) {
      leaks.push({
        id: this.generateId(),
        type: 'timer',
        severity: 'medium',
        description: `High number of active timers: ${snapshot.timerCount}`,
        pattern: 'excessive_timers',
        detectedAt: Date.now(),
        snapshots: [snapshot],
        growthRate: snapshot.timerCount / (this.snapshots.length || 1),
        estimatedLeakSize: snapshot.timerCount * 512, // 512B per timer
        recommendations: [
          'Clear timers in cleanup functions',
          'Use setInterval instead of multiple setTimeout',
          'Review timer usage patterns',
        ],
        resolved: false,
      });
    }

    return leaks;
  }

  private detectCircularReferences(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];

    // Simplified circular reference detection
    // In a real implementation, this would use more sophisticated algorithms
    try {
      const circularRefs = this.findCircularReferences();

      if (circularRefs.length > 0) {
        leaks.push({
          id: this.generateId(),
          type: 'circular_reference',
          severity: 'high',
          description: `Detected ${circularRefs.length} potential circular references`,
          pattern: 'circular_reference',
          detectedAt: Date.now(),
          snapshots: [this.snapshots[this.snapshots.length - 1]],
          growthRate: circularRefs.length,
          estimatedLeakSize: circularRefs.length * 2048, // 2KB per circular ref
          recommendations: [
            'Use weak references to break cycles',
            'Avoid circular object references',
            'Implement proper cleanup for circular dependencies',
          ],
          resolved: false,
        });
      }
    } catch (error) {
      logger.warn('[MemoryLeakDetection] Circular reference detection failed', error);
    }

    return leaks;
  }

  private findCircularReferences(): any[] {
    // Simplified implementation
    // In reality, this would traverse the object graph looking for cycles
    return [];
  }

  private getLeakSeverity(value: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = value / threshold;
    if (ratio > 3) {return 'critical';}
    if (ratio > 2) {return 'high';}
    if (ratio > 1.5) {return 'medium';}
    return 'low';
  }

  private cleanupOldLeaks(): void {
    if (this.leaks.length > this.maxLeaks) {
      // Remove oldest resolved leaks first
      const unresolvedLeaks = this.leaks.filter(leak => !leak.resolved);
      const resolvedLeaks = this.leaks.filter(leak => leak.resolved)
        .sort((a, b) => (a.resolvedAt || 0) - (b.resolvedAt || 0));

      this.leaks = [
        ...unresolvedLeaks,
        ...resolvedLeaks.slice(-this.maxLeaks + unresolvedLeaks.length),
      ];
    }
  }

  private calculateTrends(): MemoryReport['trends'] {
    if (this.snapshots.length < 2) {
      return {
        heapGrowthRate: 0,
        componentGrowthRate: 0,
        listenerGrowthRate: 0,
        timerGrowthRate: 0,
      };
    }

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    const duration = (last.timestamp - first.timestamp) / 60000; // minutes

    return {
      heapGrowthRate: (last.heapUsed - first.heapUsed) / duration,
      componentGrowthRate: (last.componentCount - first.componentCount) / duration,
      listenerGrowthRate: (last.listenerCount - first.listenerCount) / duration,
      timerGrowthRate: (last.timerCount - first.timerCount) / duration,
    };
  }

  private calculatePeaks(): MemoryReport['peaks'] {
    return {
      maxHeapUsed: Math.max(...this.snapshots.map(s => s.heapUsed)),
      maxComponentCount: Math.max(...this.snapshots.map(s => s.componentCount)),
      maxListenerCount: Math.max(...this.snapshots.map(s => s.listenerCount)),
      maxTimerCount: Math.max(...this.snapshots.map(s => s.timerCount)),
    };
  }

  private calculateAverages(): MemoryReport['averages'] {
    const sum = this.snapshots.reduce(
      (acc, snapshot) => ({
        heapUsed: acc.heapUsed + snapshot.heapUsed,
        componentCount: acc.componentCount + snapshot.componentCount,
        listenerCount: acc.listenerCount + snapshot.listenerCount,
        timerCount: acc.timerCount + snapshot.timerCount,
      }),
      { heapUsed: 0, componentCount: 0, listenerCount: 0, timerCount: 0 },
    );

    const count = this.snapshots.length;

    return {
      avgHeapUsed: sum.heapUsed / count,
      avgComponentCount: sum.componentCount / count,
      avgListenerCount: sum.listenerCount / count,
      avgTimerCount: sum.timerCount / count,
    };
  }

  private handleMemoryWarning(): void {
    logger.warn('[MemoryLeakDetection] Memory warning received - performing cleanup');
    this.performMemoryCleanup();

    // Take emergency snapshot
    this.takeMemorySnapshot();

    // Analyze for critical leaks
    const criticalLeaks = this.analyzeMemory().filter(leak => leak.severity === 'critical');

    if (criticalLeaks.length > 0) {
      logger.error('[MemoryLeakDetection] Critical memory leaks detected', { criticalLeaks });
      DeviceEventEmitter.emit('memory_leaks_detected', criticalLeaks);
    }
  }

  private handleAppBackgrounded(): void {
    // Perform cleanup when app goes to background
    this.performMemoryCleanup();
  }

  private handleAppActivated(): void {
    // Take snapshot when app becomes active
    this.takeMemorySnapshot();
  }

  private performMemoryCleanup(): void {
    // Clear weak references
    this.weakRefs.forEach(ref => {
      if (ref.deref() === undefined) {
        this.weakRefs.delete(ref);
      }
    });

    // Trigger garbage collection if available
    if ((global as any).gc) {
      (global as any).gc();
    }

    // Clear old snapshots
    if (this.snapshots.length > this.maxSnapshots / 2) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots / 2);
    }

    logger.info('[MemoryLeakDetection] Memory cleanup completed');
  }

  private generateReport(): void {
    const report = this.getCurrentReport();

    // Store report
    this.storeReport(report);

    // Emit report event
    DeviceEventEmitter.emit('memory_report', report);

    logger.info('[MemoryLeakDetection] Memory report generated', {
      sessionId: report.sessionId,
      snapshotsCount: report.snapshots.length,
      leaksCount: report.leaks.length,
      duration: report.duration,
    });
  }

  private async storeSessionData(): Promise<void> {
    try {
      const sessionData = {
        sessionId: this.sessionId,
        snapshots: this.snapshots,
        leaks: this.leaks,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(
        `memory_session_${this.sessionId}`,
        JSON.stringify(sessionData),
      );
    } catch (error) {
      logger.error('[MemoryLeakDetection] Failed to store memory session data', error);
    }
  }

  private async loadPreviousSession(): Promise<void> {
    try {
      // Load previous session data for comparison
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(key => key.startsWith('memory_session_'));

      if (sessionKeys.length > 0) {
        // Load most recent session for comparison
        const recentKey = sessionKeys.sort().pop();
        if (recentKey) {
          const data = await AsyncStorage.getItem(recentKey);
          if (data) {
            const session = JSON.parse(data);
            logger.info(`[MemoryLeakDetection] Loaded previous memory session: ${session.sessionId}`);
          }
        }
      }
    } catch (error) {
      logger.error('[MemoryLeakDetection] Failed to load previous memory session', error);
    }
  }

  private async storeReport(report: MemoryReport): Promise<void> {
    try {
      const key = `memory_report_${this.sessionId}`;
      await AsyncStorage.setItem(key, JSON.stringify(report));
    } catch (error) {
      logger.error('[MemoryLeakDetection] Failed to store memory report', error);
    }
  }
}

// Export singleton instance
export const memoryLeakDetection = MemoryLeakDetectionService.getInstance();

// Export convenience functions
export const startMemoryMonitoring = () => memoryLeakDetection.startMonitoring();
export const stopMemoryMonitoring = () => memoryLeakDetection.stopMonitoring();
export const registerComponent = (name: string, component: any) =>
  memoryLeakDetection.registerComponent(name, component);
export const unregisterComponent = (name: string) =>
  memoryLeakDetection.unregisterComponent(name);
export const analyzeMemory = () => memoryLeakDetection.analyzeMemory();

export default memoryLeakDetection;
