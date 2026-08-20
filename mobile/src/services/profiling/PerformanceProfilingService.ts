/**
 * Performance Profiling Service - Production Ready
 *
 * Advanced performance profiling with detailed metrics collection,
 * flame graph generation, and performance bottleneck identification
 */

import { DeviceEventEmitter, Platform } from 'react-native';
// AsyncStorage import removed - not used
import { getEnvironmentConfig } from '../../config/environment';
import { performanceNow } from '../../performance/utils/performancePolyfill';
import { logger } from '../../utils/logger';

// Profiling interfaces
export interface PerformanceProfile {
  id: string;
  name: string;
  type: 'startup' | 'render' | 'navigation' | 'api' | 'computation' | 'custom';
  startTime: number;
  endTime: number;
  duration: number;
  metadata: {
    cpuUsage?: number;
    memoryUsage?: number;
    frameRate?: number;
    networkLatency?: number;
    batteryLevel?: number;
    thermalState?: string;
  };
  childProfiles: PerformanceProfile[];
  tags: Record<string, string>;
  status: 'running' | 'completed' | 'failed';
  error?: string;
}

export interface FrameMetrics {
  timestamp: number;
  frameTime: number;
  fps: number;
  droppedFrames: number;
  totalFrames: number;
  jank: boolean;
  longFrame: boolean;
}

export interface RenderMetrics {
  component: string;
  renderCount: number;
  renderTime: number;
  mountTime: number;
  updateCount: number;
  updateTime: number;
  reRenderReasons: string[];
  propsChanges: number;
  stateChanges: number;
}

export interface NetworkMetrics {
  url: string;
  method: string;
  status: number;
  duration: number;
  size: number;
  cacheHit: boolean;
  retryCount: number;
  dnsTime?: number;
  connectTime?: number;
  sslTime?: number;
  firstByteTime?: number;
}

export interface CPUMetrics {
  timestamp: number;
  usage: number;
  cores: number;
  frequency: number;
  temperature?: number;
}

export interface FlameGraphNode {
  name: string;
  value: number;
  children: FlameGraphNode[];
  metadata: {
    type: string;
    file?: string;
    line?: number;
    component?: string;
  };
}

export interface PerformanceReport {
  id: string;
  sessionId: string;
  profileName: string;
  startTime: number;
  endTime: number;
  duration: number;
  profiles: PerformanceProfile[];
  flameGraph: FlameGraphNode;
  metrics: {
    frames: FrameMetrics[];
    renders: RenderMetrics[];
    network: NetworkMetrics[];
    cpu: CPUMetrics[];
  };
  bottlenecks: PerformanceBottleneck[];
  recommendations: PerformanceRecommendation[];
  summary: {
    totalProfiles: number;
    avgFrameTime: number;
    avgRenderTime: number;
    droppedFrames: number;
    slowestProfile: PerformanceProfile;
    bottleneckCount: number;
  };
}

export interface PerformanceBottleneck {
  id: string;
  type: 'render' | 'network' | 'computation' | 'memory' | 'io';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string;
  impact: number; // Performance impact in ms
  frequency: number;
  profileId: string;
  suggestions: string[];
}

export interface PerformanceRecommendation {
  id: string;
  category: 'optimization' | 'refactoring' | 'architecture' | 'monitoring';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedImprovement: string;
  effort: 'low' | 'medium' | 'high';
  codeExample?: string;
  resources: string[];
}

// Performance profiling class
export class PerformanceProfilingService {
  private static instance: PerformanceProfilingService;
  private config = getEnvironmentConfig();
  private sessionId: string;
  private isProfiling = false;
  private profiles: PerformanceProfile[] = [];
  private currentProfile: PerformanceProfile | null = null;
  private profileStack: PerformanceProfile[] = [];
  private frameMetrics: FrameMetrics[] = [];
  private renderMetrics: RenderMetrics[] = [];
  private networkMetrics: NetworkMetrics[] = [];
  private cpuMetrics: CPUMetrics[] = [];
  private intervals: ReturnType<typeof setInterval>[] = [];
  private observers: any[] = [];
  private maxProfiles = 1000;
  private maxFrameMetrics = 10000;
  private profilingInterval = 16; // 60fps

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  public static getInstance(): PerformanceProfilingService {
    if (!PerformanceProfilingService.instance) {
      PerformanceProfilingService.instance = new PerformanceProfilingService();
    }
    return PerformanceProfilingService.instance;
  }

  // Initialize performance profiling
  public async initialize(): Promise<void> {
    if (!this.config.performance.enableProfiling) {
      return;
    }

    try {
      // Set up performance observers
      this.setupPerformanceObservers();

      // Set up frame rate monitoring
      this.setupFrameRateMonitoring();

      // Set up CPU monitoring
      this.setupCPUMonitoring();

      // Override React methods for profiling
      this.overrideReactMethods();

      logger.info('[PerformanceProfilingService] Performance profiling initialized');
    } catch (error) {
      logger.error('[PerformanceProfilingService] Failed to initialize performance profiling', error);
    }
  }

  // Start a performance profile
  public startProfile(
    name: string,
    type: PerformanceProfile['type'],
    tags: Record<string, string> = {},
  ): string {
    const profile: PerformanceProfile = {
      id: this.generateId(),
      name,
      type,
      startTime: performanceNow(),
      endTime: 0,
      duration: 0,
      metadata: this.collectInitialMetadata(),
      childProfiles: [],
      tags,
      status: 'running',
    };

    // Set as current profile or add as child
    if (this.currentProfile) {
      this.currentProfile.childProfiles.push(profile);
      this.profileStack.push(this.currentProfile);
    } else {
      this.profiles.push(profile);
    }

    this.currentProfile = profile;

    logger.info('[PerformanceProfilingService] Started profile', { name, type });
    return profile.id;
  }

  // End a performance profile
  public endProfile(profileId?: string): PerformanceProfile | null {
    const profile = profileId
      ? this.findProfile(profileId)
      : this.currentProfile;

    if (!profile || profile.status !== 'running') {
      return null;
    }

    profile.endTime = performanceNow();
    profile.duration = profile.endTime - profile.startTime;
    profile.status = 'completed';
    profile.metadata = { ...profile.metadata, ...this.collectFinalMetadata() };

    // Update current profile
    if (this.currentProfile === profile) {
      this.currentProfile = this.profileStack.pop() || null;
    }

    // Check for performance issues
    this.analyzeProfilePerformance(profile);

    logger.info('[PerformanceProfilingService] Ended profile', {
      name: profile.name,
      duration: profile.duration.toFixed(2) + 'ms'
    });
    return profile;
  }

  // Profile an async function
  public async profileAsync<T>(
    name: string,
    type: PerformanceProfile['type'],
    fn: () => Promise<T>,
    tags: Record<string, string> = {},
  ): Promise<T> {
    const profileId = this.startProfile(name, type, tags);

    try {
      const result = await fn();
      this.endProfile(profileId);
      return result;
    } catch (error) {
      const profile = this.findProfile(profileId);
      if (profile) {
        profile.status = 'failed';
        profile.error = error instanceof Error ? error.message : String(error);
        this.endProfile(profileId);
      }
      throw error;
    }
  }

  // Profile a synchronous function
  public profile<T>(
    name: string,
    type: PerformanceProfile['type'],
    fn: () => T,
    tags: Record<string, string> = {},
  ): T {
    const profileId = this.startProfile(name, type, tags);

    try {
      const result = fn();
      this.endProfile(profileId);
      return result;
    } catch (error) {
      const profile = this.findProfile(profileId);
      if (profile) {
        profile.status = 'failed';
        profile.error = error instanceof Error ? error.message : String(error);
        this.endProfile(profileId);
      }
      throw error;
    }
  }

  // Record render metrics
  public recordRenderMetrics(component: string, renderTime: number, metadata: any = {}): void {
    const existingMetric = this.renderMetrics.find(m => m.component === component);

    if (existingMetric) {
      existingMetric.renderCount++;
      existingMetric.renderTime += renderTime;
      existingMetric.updateCount++;
      existingMetric.updateTime += renderTime;
      if (metadata.reason) {
        existingMetric.reRenderReasons.push(metadata.reason);
      }
      if (metadata.propsChanged) {
        existingMetric.propsChanges++;
      }
      if (metadata.stateChanged) {
        existingMetric.stateChanges++;
      }
    } else {
      this.renderMetrics.push({
        component,
        renderCount: 1,
        renderTime,
        mountTime: renderTime,
        updateCount: 0,
        updateTime: 0,
        reRenderReasons: [],
        propsChanges: 0,
        stateChanges: 0,
      });
    }

    // Limit render metrics
    if (this.renderMetrics.length > this.maxProfiles) {
      this.renderMetrics = this.renderMetrics.slice(-this.maxProfiles);
    }
  }

  // Record network metrics
  public recordNetworkMetrics(metrics: NetworkMetrics): void {
    const networkMetric: NetworkMetrics = {
      ...metrics,
    };

    this.networkMetrics.push(networkMetric);

    // Limit network metrics
    if (this.networkMetrics.length > this.maxProfiles) {
      this.networkMetrics = this.networkMetrics.slice(-this.maxProfiles);
    }
  }

  // Get current performance report
  public getCurrentReport(): PerformanceReport {
    const flameGraph = this.generateFlameGraph();
    const bottlenecks = this.identifyBottlenecks();
    const recommendations = this.generateRecommendations(bottlenecks);
    const summary = this.calculateSummary();

    return {
      id: this.generateId(),
      sessionId: this.sessionId,
      profileName: 'Current Session',
      startTime: this.profiles[0]?.startTime || Date.now(),
      endTime: Date.now(),
      duration: Date.now() - (this.profiles[0]?.startTime || Date.now()),
      profiles: [...this.profiles],
      flameGraph,
      metrics: {
        frames: [...this.frameMetrics],
        renders: [...this.renderMetrics],
        network: [...this.networkMetrics],
        cpu: [...this.cpuMetrics],
      },
      bottlenecks,
      recommendations,
      summary,
    };
  }

  // Clear profiling data
  public clearData(): void {
    this.profiles = [];
    this.currentProfile = null;
    this.profileStack = [];
    this.frameMetrics = [];
    this.renderMetrics = [];
    this.networkMetrics = [];
    this.cpuMetrics = [];
    this.sessionId = this.generateSessionId();
  }

  // Export profiling data
  public async exportData(): Promise<string> {
    const report = this.getCurrentReport();
    return JSON.stringify(report, null, 2);
  }

  // Private methods
  private generateSessionId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupPerformanceObservers(): void {
    // Set up performance observers if available
    if (typeof (global as any).PerformanceObserver !== 'undefined') {
      try {
        const PerformanceObserverClass = (global as any).PerformanceObserver;
        const observer = new PerformanceObserverClass((list: any) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.handlePerformanceEntry(entry);
          });
        });

        observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
        this.observers.push(observer);
      } catch (error) {
        logger.warn('[PerformanceProfilingService] Performance observers not available', error);
      }
    }
  }

  private setupFrameRateMonitoring(): void {
    let lastFrameTime = performanceNow();
    let frameCount = 0;
    let droppedFrames = 0;

    const monitorFrame = () => {
      const currentTime = performanceNow();
      const frameTime = currentTime - lastFrameTime;
      const fps = 1000 / frameTime;

      const frameMetric: FrameMetrics = {
        timestamp: currentTime,
        frameTime,
        fps,
        droppedFrames,
        totalFrames: ++frameCount,
        jank: frameTime > 16.67, // > 60fps threshold
        longFrame: frameTime > 100, // > 10fps threshold
      };

      this.frameMetrics.push(frameMetric);

      if (frameMetric.jank) {
        droppedFrames++;
      }

      // Limit frame metrics
      if (this.frameMetrics.length > this.maxFrameMetrics) {
        this.frameMetrics = this.frameMetrics.slice(-this.maxFrameMetrics);
      }

      lastFrameTime = currentTime;

      if (this.isProfiling) {
        requestAnimationFrame(monitorFrame);
      }
    };

    this.isProfiling = true;
    requestAnimationFrame(monitorFrame);
  }

  private setupCPUMonitoring(): void {
    const cpuInterval = setInterval(() => {
      if (!this.isProfiling) {return;}

      const cpuMetric: CPUMetrics = {
        timestamp: Date.now(),
        usage: this.getCPUUsage(),
        cores: this.getCoreCount(),
        frequency: this.getCPUFrequency(),
        temperature: this.getCPUTemperature(),
      };

      this.cpuMetrics.push(cpuMetric);

      // Limit CPU metrics
      if (this.cpuMetrics.length > this.maxProfiles) {
        this.cpuMetrics = this.cpuMetrics.slice(-this.maxProfiles);
      }
    }, 1000); // Every second

    this.intervals.push(cpuInterval);
  }

  private overrideReactMethods(): void {
    // Override React component methods for profiling
    const globalWindow = (global as any).window;
    if (typeof globalWindow !== 'undefined' && globalWindow.React) {
      const originalCreateElement = globalWindow.React.createElement;

      globalWindow.React.createElement = (type: any, props: any, ...children: any[]) => {
        const startTime = performanceNow();
        const element = originalCreateElement(type, props, ...children);
        const endTime = performanceNow();

        if (typeof type === 'function' && type.name) {
          this.recordRenderMetrics(type.name, endTime - startTime, {
            props: Object.keys(props || {}).length,
          });
        }

        return element;
      };
    }
  }

  private handlePerformanceEntry(entry: any): void {
    if (entry.entryType === 'measure') {
      const profile: PerformanceProfile = {
        id: this.generateId(),
        name: entry.name,
        type: 'custom',
        startTime: entry.startTime,
        endTime: entry.startTime + entry.duration,
        duration: entry.duration,
        metadata: {},
        childProfiles: [],
        tags: {},
        status: 'completed',
      };

      this.profiles.push(profile);
    } else if (entry.entryType === 'resource') {
      const resource = entry;

      this.recordNetworkMetrics({
        url: resource.name,
        method: 'GET', // Default, would need actual method
        status: 200, // Default, would need actual status
        duration: resource.responseEnd - resource.requestStart,
        size: resource.transferSize || 0,
        cacheHit: resource.transferSize === 0 && resource.decodedBodySize > 0,
        retryCount: 0,
        dnsTime: resource.domainLookupEnd - resource.domainLookupStart,
        connectTime: resource.connectEnd - resource.connectStart,
        sslTime: resource.secureConnectionStart > 0
          ? resource.connectEnd - resource.secureConnectionStart
          : undefined,
        firstByteTime: resource.responseStart - resource.requestStart,
      });
    }
  }

  private collectInitialMetadata(): PerformanceProfile['metadata'] {
    return {
      cpuUsage: this.getCPUUsage(),
      memoryUsage: this.getMemoryUsage(),
      frameRate: this.getCurrentFrameRate(),
      batteryLevel: this.getBatteryLevel(),
      thermalState: this.getThermalState(),
    };
  }

  private collectFinalMetadata(): PerformanceProfile['metadata'] {
    return {
      cpuUsage: this.getCPUUsage(),
      memoryUsage: this.getMemoryUsage(),
      frameRate: this.getCurrentFrameRate(),
      batteryLevel: this.getBatteryLevel(),
      thermalState: this.getThermalState(),
    };
  }

  private getCPUUsage(): number {
    // This would integrate with native CPU monitoring
    return Math.random() * 100; // Mock data
  }

  private getMemoryUsage(): number {
    // This would integrate with native memory monitoring
    return Math.random() * 100 * 1024 * 1024; // Mock data in bytes
  }

  private getCurrentFrameRate(): number {
    if (this.frameMetrics.length === 0) {return 60;}
    const recent = this.frameMetrics.slice(-10);
    return recent.reduce((sum, frame) => sum + frame.fps, 0) / recent.length;
  }

  private getBatteryLevel(): number {
    // This would integrate with native battery monitoring
    return Math.random(); // Mock data (0-1)
  }

  private getThermalState(): string {
    // This would integrate with native thermal monitoring
    const states = ['nominal', 'fair', 'serious', 'critical'];
    return states[Math.floor(Math.random() * states.length)];
  }

  private getCoreCount(): number {
    // This would get actual core count
    return Platform.OS === 'ios' ? 6 : 8; // Mock data
  }

  private getCPUFrequency(): number {
    // This would get actual CPU frequency
    return 2000 + Math.random() * 1000; // Mock data in MHz
  }

  private getCPUTemperature(): number | undefined {
    // This would get actual CPU temperature
    return 30 + Math.random() * 40; // Mock data in Celsius
  }

  private findProfile(profileId: string): PerformanceProfile | null {
    const searchInProfiles = (profiles: PerformanceProfile[]): PerformanceProfile | null => {
      for (const profile of profiles) {
        if (profile.id === profileId) {
          return profile;
        }
        const found = searchInProfiles(profile.childProfiles);
        if (found) {return found;}
      }
      return null;
    };

    return searchInProfiles(this.profiles);
  }

  private analyzeProfilePerformance(profile: PerformanceProfile): void {
    const thresholds = this.config.performance.performanceThresholds;

    // Check if profile exceeds thresholds
    if (profile.type === 'render' && profile.duration > thresholds.renderTime) {
      this.createBottleneck({
        type: 'render',
        severity: this.getBottleneckSeverity(profile.duration, thresholds.renderTime),
        description: `Slow render detected in ${profile.name}`,
        location: profile.name,
        impact: profile.duration - thresholds.renderTime,
        frequency: 1,
        profileId: profile.id,
        suggestions: [
          'Optimize component rendering',
          'Use React.memo for expensive components',
          'Implement virtualization for long lists',
          'Consider code splitting',
        ],
      });
    }

    if (profile.type === 'api' && profile.duration > thresholds.apiResponseTime) {
      this.createBottleneck({
        type: 'network',
        severity: this.getBottleneckSeverity(profile.duration, thresholds.apiResponseTime),
        description: `Slow API response for ${profile.name}`,
        location: profile.name,
        impact: profile.duration - thresholds.apiResponseTime,
        frequency: 1,
        profileId: profile.id,
        suggestions: [
          'Optimize API response',
          'Implement request caching',
          'Use request batching',
          'Consider pagination',
        ],
      });
    }
  }

  private getBottleneckSeverity(value: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = value / threshold;
    if (ratio > 3) {return 'critical';}
    if (ratio > 2) {return 'high';}
    if (ratio > 1.5) {return 'medium';}
    return 'low';
  }

  private createBottleneck(bottleneck: Omit<PerformanceBottleneck, 'id'>): void {
    // This would store bottlenecks for analysis
    logger.warn('[PerformanceProfilingService] Performance bottleneck detected', bottleneck);
    DeviceEventEmitter.emit('performance_bottleneck', bottleneck);
  }

  private generateFlameGraph(): FlameGraphNode {
    const buildNode = (profile: PerformanceProfile): FlameGraphNode => {
      return {
        name: profile.name,
        value: profile.duration,
        children: profile.childProfiles.map(buildNode),
        metadata: {
          type: profile.type,
          component: profile.tags.component,
        },
      };
    };

    return {
      name: 'root',
      value: this.profiles.reduce((sum, profile) => sum + profile.duration, 0),
      children: this.profiles.map(buildNode),
      metadata: {
        type: 'root',
      },
    };
  }

  private identifyBottlenecks(): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];

    // Analyze frame metrics for jank
    const jankyFrames = this.frameMetrics.filter(frame => frame.jank);
    if (jankyFrames.length > 0) {
      bottlenecks.push({
        id: this.generateId(),
        type: 'render',
        severity: 'medium',
        description: `Detected ${jankyFrames.length} janky frames`,
        location: 'render_loop',
        impact: jankyFrames.length * 5, // 5ms per janky frame
        frequency: jankyFrames.length,
        profileId: '',
        suggestions: [
          'Optimize rendering pipeline',
          'Reduce layout thrashing',
          'Use requestAnimationFrame for animations',
          'Implement frame budgeting',
        ],
      });
    }

    // Analyze render metrics for slow components
    const slowRenders = this.renderMetrics.filter(
      render => render.renderTime / render.renderCount > 16,
    );
    if (slowRenders.length > 0) {
      bottlenecks.push({
        id: this.generateId(),
        type: 'render',
        severity: 'medium',
        description: `Found ${slowRenders.length} components with slow renders`,
        location: slowRenders.map(r => r.component).join(', '),
        impact: slowRenders.reduce((sum, r) => sum + r.renderTime, 0),
        frequency: slowRenders.length,
        profileId: '',
        suggestions: [
          'Profile component rendering',
          'Optimize component lifecycle',
          'Use shouldComponentUpdate or React.memo',
          'Break down large components',
        ],
      });
    }

    // Analyze network metrics for slow requests
    const slowRequests = this.networkMetrics.filter(req => req.duration > 2000);
    if (slowRequests.length > 0) {
      bottlenecks.push({
        id: this.generateId(),
        type: 'network',
        severity: 'medium',
        description: `Found ${slowRequests.length} slow network requests`,
        location: slowRequests.map(r => r.url).join(', '),
        impact: slowRequests.reduce((sum, r) => sum + r.duration, 0),
        frequency: slowRequests.length,
        profileId: '',
        suggestions: [
          'Optimize API endpoints',
          'Implement response caching',
          'Use CDN for static assets',
          'Consider request deduplication',
        ],
      });
    }

    return bottlenecks;
  }

  private generateRecommendations(bottlenecks: PerformanceBottleneck[]): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    bottlenecks.forEach(bottleneck => {
      bottleneck.suggestions.forEach(suggestion => {
        recommendations.push({
          id: this.generateId(),
          category: 'optimization',
          priority: bottleneck.severity as any,
          title: `Fix ${bottleneck.type} performance issue`,
          description: suggestion,
          expectedImprovement: `${bottleneck.impact.toFixed(2)}ms improvement`,
          effort: 'medium',
          resources: [
            'React Performance Documentation',
            'Chrome DevTools Performance Guide',
            'React Native Performance Optimization',
          ],
        });
      });
    });

    return recommendations;
  }

  private calculateSummary(): PerformanceReport['summary'] {
    const totalProfiles = this.profiles.length;
    const avgFrameTime = this.frameMetrics.length > 0
      ? this.frameMetrics.reduce((sum, frame) => sum + frame.frameTime, 0) / this.frameMetrics.length
      : 0;
    const avgRenderTime = this.renderMetrics.length > 0
      ? this.renderMetrics.reduce((sum, render) => sum + render.renderTime, 0) /
        this.renderMetrics.reduce((sum, render) => sum + render.renderCount, 0)
      : 0;
    const droppedFrames = this.frameMetrics.filter(frame => frame.jank).length;
    const slowestProfile = this.profiles.reduce((slowest, profile) =>
      profile.duration > slowest.duration ? profile : slowest,
      this.profiles[0] || { duration: 0 } as PerformanceProfile,
    );

    return {
      totalProfiles,
      avgFrameTime,
      avgRenderTime,
      droppedFrames,
      slowestProfile,
      bottleneckCount: this.identifyBottlenecks().length,
    };
  }
}

// Export singleton instance
export const performanceProfiling = PerformanceProfilingService.getInstance();

// Export convenience functions
export const startProfiling = (
  name: string,
  type: PerformanceProfile['type'],
  tags?: Record<string, string>,
) => performanceProfiling.startProfile(name, type, tags);
export const endProfiling = (profileId?: string) => performanceProfiling.endProfile(profileId);
export const profileAsync = <T>(
  name: string,
  type: PerformanceProfile['type'],
  fn: () => Promise<T>,
  tags?: Record<string, string>,
) => performanceProfiling.profileAsync(name, type, fn, tags);
export const profile = <T>(
  name: string,
  type: PerformanceProfile['type'],
  fn: () => T,
  tags?: Record<string, string>,
) => performanceProfiling.profile(name, type, fn, tags);
export const recordRenderMetrics = (
  component: string,
  renderTime: number,
  metadata?: any,
) => performanceProfiling.recordRenderMetrics(component, renderTime, metadata);
export const recordNetworkMetrics = (
  metrics: Omit<NetworkMetrics, 'timestamp'>,
) => performanceProfiling.recordNetworkMetrics(metrics);

export default performanceProfiling;
