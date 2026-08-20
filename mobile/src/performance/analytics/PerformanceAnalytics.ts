/**
 * Performance Analytics - Comprehensive performance data collection and reporting
 * Provides real-time performance tracking, trend analysis, and automated reporting
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import PerformanceMonitor from '../monitoring/PerformanceMonitor';
import { Platform } from 'react-native';
import { logger } from '../../utils/logger';

export interface PerformanceEvent {
  id: string;
  type: 'startup' | 'navigation' | 'network' | 'render' | 'memory' | 'crash' | 'error';
  name: string;
  duration: number;
  timestamp: number;
  metadata: Record<string, any>;
  userId?: string;
  sessionId: string;
  buildVersion: string;
  platform: string;
}

export interface PerformanceSession {
  id: string;
  startTime: number;
  endTime?: number;
  userId?: string;
  deviceInfo: DeviceInfo;
  events: PerformanceEvent[];
  crashes: number;
  totalDuration: number;
  averageMemoryUsage: number;
  averageCPUUsage: number;
}

export interface DeviceInfo {
  platform: string;
  version: string;
  model: string;
  totalMemory: number;
  availableMemory: number;
  screenDimensions: { width: number; height: number };
  networkType: string;
}

export interface PerformanceTrend {
  metric: string;
  timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly';
  data: Array<{ timestamp: number; value: number }>;
  trend: 'improving' | 'degrading' | 'stable';
  changePercentage: number;
}

export interface PerformanceReport {
  period: { start: number; end: number };
  summary: {
    totalSessions: number;
    averageSessionDuration: number;
    crashRate: number;
    errorRate: number;
    averageStartupTime: number;
    averageMemoryUsage: number;
    top5SlowOperations: Array<{ name: string; averageDuration: number }>;
  };
  trends: PerformanceTrend[];
  recommendations: string[];
  alerts: PerformanceAlert[];
}

export interface PerformanceAlert {
  type: 'performance_degradation' | 'memory_leak' | 'crash_spike' | 'slow_operation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface AnalyticsConfig {
  enableAutoTracking: boolean;
  enableCrashReporting: boolean;
  enableMemoryTracking: boolean;
  enableNetworkTracking: boolean;
  sampleRate: number; // 0-1
  batchSize: number;
  flushInterval: number; // ms
  maxStorageSize: number; // MB
  enableTrendAnalysis: boolean;
}

class PerformanceAnalytics {
  private static instance: PerformanceAnalytics;
  private currentSession: PerformanceSession | null = null;
  private eventQueue: PerformanceEvent[] = [];
  private sessions: PerformanceSession[] = [];
  private flushTimer?: ReturnType<typeof setTimeout>;
  private performanceMonitor = PerformanceMonitor.getInstance();

  private config: AnalyticsConfig = {
    enableAutoTracking: true,
    enableCrashReporting: true,
    enableMemoryTracking: true,
    enableNetworkTracking: true,
    sampleRate: 1.0, // Track all events initially
    batchSize: 50,
    flushInterval: 30000, // 30 seconds
    maxStorageSize: 10, // 10MB
    enableTrendAnalysis: true,
  };

  private constructor() {
    this.initializeAnalytics();
  }

  public static getInstance(): PerformanceAnalytics {
    if (!PerformanceAnalytics.instance) {
      PerformanceAnalytics.instance = new PerformanceAnalytics();
    }
    return PerformanceAnalytics.instance;
  }

  /**
   * Initialize performance analytics
   */
  private async initializeAnalytics(): Promise<void> {
    await this.loadStoredData();
    this.startNewSession();
    this.setupAutoTracking();
    this.startFlushTimer();
  }

  /**
   * Load stored analytics data
   */
  private async loadStoredData(): Promise<void> {
    try {
      const storedSessions = await AsyncStorage.getItem('performance_sessions');
      if (storedSessions) {
        this.sessions = JSON.parse(storedSessions);
        logger.log('[PerformanceAnalytics] Loaded stored sessions', { count: this.sessions.length });
      }

      const storedEvents = await AsyncStorage.getItem('performance_events');
      if (storedEvents) {
        this.eventQueue = JSON.parse(storedEvents);
        logger.log('[PerformanceAnalytics] Loaded queued events', { count: this.eventQueue.length });
      }
    } catch (error) {
      logger.error('[PerformanceAnalytics] Failed to load stored analytics data', error);
    }
  }

  /**
   * Start a new performance session
   */
  private async startNewSession(): Promise<void> {
    const deviceInfo = await this.getDeviceInfo();

    this.currentSession = {
      id: this.generateSessionId(),
      startTime: Date.now(),
      deviceInfo,
      events: [],
      crashes: 0,
      totalDuration: 0,
      averageMemoryUsage: 0,
      averageCPUUsage: 0,
    };

    logger.log('[PerformanceAnalytics] Started new performance session', { sessionId: this.currentSession.id });
  }

  /**
   * Setup automatic performance tracking
   */
  private setupAutoTracking(): void {
    if (!this.config.enableAutoTracking) {return;}

    // Track app lifecycle events
    this.setupAppLifecycleTracking();

    // Track performance metrics
    this.setupMetricsTracking();

    // Track errors and crashes
    this.setupErrorTracking();
  }

  /**
   * Setup app lifecycle tracking
   */
  private setupAppLifecycleTracking(): void {
    // Track app startup
    this.trackEvent({
      type: 'startup',
      name: 'app_startup',
      duration: 0, // Will be updated when startup completes
      metadata: {
        platform: Platform.OS,
        version: Platform.Version,
      },
    });
  }

  /**
   * Setup metrics tracking
   */
  private setupMetricsTracking(): void {
    if (!this.config.enableMemoryTracking) {return;}

    // Track memory usage every 30 seconds
    setInterval(() => {
      const report = this.performanceMonitor.getPerformanceReport();
      const latestMetrics = report.metrics[report.metrics.length - 1];

      if (latestMetrics && this.shouldTrackEvent()) {
        this.trackEvent({
          type: 'memory',
          name: 'memory_usage',
          duration: 0,
          metadata: {
            memoryUsage: latestMetrics.memoryUsage,
            cpuUsage: latestMetrics.cpuUsage,
            batteryLevel: latestMetrics.batteryLevel,
          },
        });
      }
    }, 30000);
  }

  /**
   * Setup error tracking
   */
  private setupErrorTracking(): void {
    if (!this.config.enableCrashReporting) {return;}

    // In a real implementation, this would set up global error handlers
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.trackEvent({
        type: 'error',
        name: 'console_error',
        duration: 0,
        metadata: {
          message: args.join(' '),
          stack: new Error().stack,
        },
      });
      originalConsoleError.apply(console, args);
    };
  }

  /**
   * Track a performance event
   */
  public trackEvent(eventData: Partial<PerformanceEvent>): void {
    if (!this.shouldTrackEvent()) {return;}

    const event: PerformanceEvent = {
      id: this.generateEventId(),
      type: eventData.type || 'render',
      name: eventData.name || 'unknown',
      duration: eventData.duration || 0,
      timestamp: Date.now(),
      metadata: eventData.metadata || {},
      userId: eventData.userId,
      sessionId: this.currentSession?.id || 'unknown',
      buildVersion: this.getBuildVersion(),
      platform: Platform.OS,
    };

    this.eventQueue.push(event);

    if (this.currentSession) {
      this.currentSession.events.push(event);
    }

    logger.log('[PerformanceAnalytics] Tracked event', { type: event.type, name: event.name, duration: event.duration });

    // Flush if queue is full
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flushEvents();
    }
  }

  /**
   * Track navigation performance
   */
  public trackNavigation(screenName: string, duration: number, metadata: Record<string, any> = {}): void {
    this.trackEvent({
      type: 'navigation',
      name: `navigate_to_${screenName}`,
      duration,
      metadata: {
        screenName,
        ...metadata,
      },
    });
  }

  /**
   * Track network request performance
   */
  public trackNetworkRequest(url: string, method: string, duration: number, success: boolean, metadata: Record<string, any> = {}): void {
    if (!this.config.enableNetworkTracking) {return;}

    this.trackEvent({
      type: 'network',
      name: `${method.toLowerCase()}_request`,
      duration,
      metadata: {
        url,
        method,
        success,
        ...metadata,
      },
    });
  }

  /**
   * Track render performance
   */
  public trackRender(componentName: string, duration: number, metadata: Record<string, any> = {}): void {
    this.trackEvent({
      type: 'render',
      name: `render_${componentName}`,
      duration,
      metadata: {
        componentName,
        ...metadata,
      },
    });
  }

  /**
   * Track startup completion
   */
  public trackStartupComplete(totalDuration: number, metrics: Record<string, any> = {}): void {
    this.trackEvent({
      type: 'startup',
      name: 'startup_complete',
      duration: totalDuration,
      metadata: {
        totalDuration,
        ...metrics,
      },
    });
  }

  /**
   * Track application crash
   */
  public trackCrash(error: Error, metadata: Record<string, any> = {}): void {
    if (this.currentSession) {
      this.currentSession.crashes++;
    }

    this.trackEvent({
      type: 'crash',
      name: 'app_crash',
      duration: 0,
      metadata: {
        message: error.message,
        stack: error.stack,
        ...metadata,
      },
    });

    // Immediately flush crash events
    this.flushEvents();
  }

  /**
   * End current session
   */
  public endSession(): void {
    if (!this.currentSession) {return;}

    this.currentSession.endTime = Date.now();
    this.currentSession.totalDuration = this.currentSession.endTime - this.currentSession.startTime;

    // Calculate average metrics
    const memoryEvents = this.currentSession.events.filter(e => e.type === 'memory');
    if (memoryEvents.length > 0) {
      this.currentSession.averageMemoryUsage =
        memoryEvents.reduce((sum, e) => sum + (e.metadata.memoryUsage || 0), 0) / memoryEvents.length;
      this.currentSession.averageCPUUsage =
        memoryEvents.reduce((sum, e) => sum + (e.metadata.cpuUsage || 0), 0) / memoryEvents.length;
    }

    this.sessions.push(this.currentSession);
    logger.log('[PerformanceAnalytics] Ended session', { sessionId: this.currentSession.id, totalDuration: this.currentSession.totalDuration });

    this.currentSession = null;
    this.flushEvents();
  }

  /**
   * Flush events to storage and analytics service
   */
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) {return;}

    try {
      // Save to local storage
      await this.saveToStorage();

      // Send to analytics service (if configured)
      await this.sendToAnalyticsService();

      // Clear the queue
      this.eventQueue = [];
      logger.log('[PerformanceAnalytics] Performance events flushed');

    } catch (error) {
      logger.error('[PerformanceAnalytics] Failed to flush events', error);
    }
  }

  /**
   * Save data to local storage
   */
  private async saveToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem('performance_events', JSON.stringify(this.eventQueue));
      await AsyncStorage.setItem('performance_sessions', JSON.stringify(this.sessions));
    } catch (error) {
      logger.error('[PerformanceAnalytics] Failed to save to storage', error);
    }
  }

  /**
   * Send events to analytics service
   */
  private async sendToAnalyticsService(): Promise<void> {
    // In a real implementation, this would send to Azure Application Insights,
    // Azure Monitor, or custom analytics endpoint
    logger.log('[PerformanceAnalytics] Would send events to analytics service', { count: this.eventQueue.length });
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.config.flushInterval);
  }

  /**
   * Generate performance report
   */
  public async generateReport(timeframe: { start: number; end: number }): Promise<PerformanceReport> {
    const relevantSessions = this.sessions.filter(
      session => session.startTime >= timeframe.start && session.startTime <= timeframe.end,
    );

    const allEvents = relevantSessions.flatMap(session => session.events);

    // Calculate summary metrics
    const summary = {
      totalSessions: relevantSessions.length,
      averageSessionDuration: relevantSessions.length > 0
        ? relevantSessions.reduce((sum, s) => sum + s.totalDuration, 0) / relevantSessions.length
        : 0,
      crashRate: relevantSessions.length > 0
        ? relevantSessions.reduce((sum, s) => sum + s.crashes, 0) / relevantSessions.length
        : 0,
      errorRate: allEvents.filter(e => e.type === 'error').length / Math.max(allEvents.length, 1),
      averageStartupTime: this.calculateAverageEventDuration(allEvents, 'startup'),
      averageMemoryUsage: relevantSessions.length > 0
        ? relevantSessions.reduce((sum, s) => sum + s.averageMemoryUsage, 0) / relevantSessions.length
        : 0,
      top5SlowOperations: this.getTopSlowOperations(allEvents, 5),
    };

    // Generate trends
    const trends = this.config.enableTrendAnalysis ? await this.generateTrends(timeframe) : [];

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, allEvents);

    // Generate alerts
    const alerts = this.generateAlerts(summary, allEvents);

    return {
      period: timeframe,
      summary,
      trends,
      recommendations,
      alerts,
    };
  }

  /**
   * Calculate average event duration by type
   */
  private calculateAverageEventDuration(events: PerformanceEvent[], type: string): number {
    const filteredEvents = events.filter(e => e.type === type);
    if (filteredEvents.length === 0) {return 0;}

    return filteredEvents.reduce((sum, e) => sum + e.duration, 0) / filteredEvents.length;
  }

  /**
   * Get top slow operations
   */
  private getTopSlowOperations(events: PerformanceEvent[], count: number): Array<{ name: string; averageDuration: number }> {
    const operationMap = new Map<string, number[]>();

    events.forEach(event => {
      const key = `${event.type}/${event.name}`;
      if (!operationMap.has(key)) {
        operationMap.set(key, []);
      }
      operationMap.get(key)!.push(event.duration);
    });

    const averages = Array.from(operationMap.entries()).map(([name, durations]) => ({
      name,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
    }));

    return averages
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, count);
  }

  /**
   * Generate performance trends
   */
  private async generateTrends(_timeframe: { start: number; end: number }): Promise<PerformanceTrend[]> {
    // This would analyze historical data to generate trends
    // For now, return empty array
    return [];
  }

  /**
   * Generate recommendations based on performance data
   */
  private generateRecommendations(summary: PerformanceReport['summary'], events: PerformanceEvent[]): string[] {
    const recommendations: string[] = [];

    if (summary.averageStartupTime > 3000) {
      recommendations.push('Consider implementing startup optimization to reduce app launch time');
    }

    if (summary.crashRate > 0.01) { // More than 1% crash rate
      recommendations.push('Implement better error handling to reduce crash rate');
    }

    if (summary.averageMemoryUsage > 200 * 1024 * 1024) { // 200MB
      recommendations.push('Optimize memory usage to improve app performance');
    }

    const slowNetworkRequests = events.filter(e => e.type === 'network' && e.duration > 5000);
    if (slowNetworkRequests.length > 0) {
      recommendations.push('Optimize network requests and implement better caching');
    }

    return recommendations;
  }

  /**
   * Generate performance alerts
   */
  private generateAlerts(summary: PerformanceReport['summary'], _events: PerformanceEvent[]): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    if (summary.crashRate > 0.05) { // More than 5% crash rate
      alerts.push({
        type: 'crash_spike',
        severity: 'critical',
        message: `High crash rate detected: ${(summary.crashRate * 100).toFixed(2)}%`,
        timestamp: Date.now(),
        metadata: { crashRate: summary.crashRate },
      });
    }

    if (summary.averageStartupTime > 5000) {
      alerts.push({
        type: 'slow_operation',
        severity: 'high',
        message: `Slow startup time: ${summary.averageStartupTime}ms`,
        timestamp: Date.now(),
        metadata: { startupTime: summary.averageStartupTime },
      });
    }

    return alerts;
  }

  /**
   * Determine if event should be tracked based on sample rate
   */
  private shouldTrackEvent(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<DeviceInfo> {
    // This would use native modules to get actual device info
    return {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      model: 'Unknown',
      totalMemory: 2 * 1024 * 1024 * 1024, // 2GB
      availableMemory: 1 * 1024 * 1024 * 1024, // 1GB
      screenDimensions: { width: 375, height: 812 },
      networkType: 'wifi',
    };
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get build version
   */
  private getBuildVersion(): string {
    // This would get the actual build version from the app
    return '1.0.0';
  }

  /**
   * Configure analytics
   */
  public configure(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.log('[PerformanceAnalytics] Configured', { config: this.config });
  }

  /**
   * Get current session
   */
  public getCurrentSession(): PerformanceSession | null {
    return this.currentSession;
  }

  /**
   * Get all sessions
   */
  public getSessions(): PerformanceSession[] {
    return [...this.sessions];
  }

  /**
   * Clear all analytics data
   */
  public async clearData(): Promise<void> {
    this.eventQueue = [];
    this.sessions = [];
    this.currentSession = null;

    await AsyncStorage.removeItem('performance_events');
    await AsyncStorage.removeItem('performance_sessions');

    logger.log('[PerformanceAnalytics] Analytics data cleared');
  }

  /**
   * Cleanup analytics
   */
  public cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.endSession();
    this.flushEvents();
  }
}

export default PerformanceAnalytics;
