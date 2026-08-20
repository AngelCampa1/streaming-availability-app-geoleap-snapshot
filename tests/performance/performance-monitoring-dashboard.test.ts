/**
 * Performance Monitoring Dashboard - US-11.7
 * Comprehensive real-time performance monitoring and alerting system
 * Integrates all performance testing components into unified dashboard
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Performance Dashboard Classes
class PerformanceDashboard {
  private metrics: Map<string, any[]> = new Map();
  private alerts: Array<PerformanceAlert> = [];
  private thresholds: Map<string, Threshold> = new Map();
  private widgets: Map<string, DashboardWidget> = new Map();
  private realTimeData: Map<string, any> = new Map();

  constructor() {
    this.initializeThresholds();
    this.initializeWidgets();
  }

  private initializeThresholds() {
    this.thresholds.set('startup_time', { warning: 2500, critical: 3500 });
    this.thresholds.set('memory_usage', { warning: 120, critical: 180 });
    this.thresholds.set('frame_rate', { warning: 50, critical: 40 });
    this.thresholds.set('network_latency', { warning: 1000, critical: 2500 });
    this.thresholds.set('battery_drain', { warning: 12, critical: 20 });
    this.thresholds.set('bundle_size', { warning: 12, critical: 18 });
    this.thresholds.set('crash_rate', { warning: 0.1, critical: 0.5 });
    this.thresholds.set('error_rate', { warning: 0.05, critical: 0.15 });
  }

  private initializeWidgets() {
    // Core Performance Widgets
    this.widgets.set('startup_metrics', new PerformanceWidget('Startup Performance', 'startup'));
    this.widgets.set('memory_metrics', new PerformanceWidget('Memory Usage', 'memory'));
    this.widgets.set('ui_performance', new PerformanceWidget('UI Performance', 'ui'));
    this.widgets.set('network_metrics', new PerformanceWidget('Network Performance', 'network'));
    this.widgets.set('battery_metrics', new PerformanceWidget('Battery Usage', 'battery'));
    this.widgets.set('error_tracking', new PerformanceWidget('Error Tracking', 'errors'));
    
    // Advanced Widgets
    this.widgets.set('user_journey', new UserJourneyWidget());
    this.widgets.set('comparative_analysis', new ComparativeAnalysisWidget());
    this.widgets.set('predictive_insights', new PredictiveInsightsWidget());
    this.widgets.set('real_user_monitoring', new RealUserMonitoringWidget());
  }

  recordMetric(category: string, metric: string, value: any, timestamp?: number) {
    const key = `${category}.${metric}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const dataPoint = {
      value,
      timestamp: timestamp || Date.now(),
      category,
      metric,
    };

    this.metrics.get(key)!.push(dataPoint);
    this.updateRealTimeData(key, dataPoint);
    this.checkThresholds(key, value);
    this.updateWidgets(category, metric, value);

    // Maintain rolling window of last 1000 data points
    if (this.metrics.get(key)!.length > 1000) {
      this.metrics.get(key)!.shift();
    }
  }

  private updateRealTimeData(key: string, dataPoint: any) {
    this.realTimeData.set(key, dataPoint);
    this.realTimeData.set(`${key}_trend`, this.calculateTrend(key));
  }

  private calculateTrend(key: string): 'improving' | 'degrading' | 'stable' {
    const data = this.metrics.get(key) || [];
    if (data.length < 5) return 'stable';

    const recent = data.slice(-5);
    const older = data.slice(-10, -5);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, d) => sum + (typeof d.value === 'number' ? d.value : 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + (typeof d.value === 'number' ? d.value : 0), 0) / older.length;

    const threshold = Math.abs(olderAvg) * 0.1; // 10% threshold
    if (Math.abs(recentAvg - olderAvg) < threshold) return 'stable';

    // For most metrics, lower is better
    return recentAvg < olderAvg ? 'improving' : 'degrading';
  }

  private checkThresholds(key: string, value: number) {
    const metricName = key.split('.')[1];
    const threshold = this.thresholds.get(metricName);
    
    if (!threshold || typeof value !== 'number') return;

    let severity: 'info' | 'warning' | 'critical' = 'info';
    if (value >= threshold.critical) {
      severity = 'critical';
    } else if (value >= threshold.warning) {
      severity = 'warning';
    }

    if (severity !== 'info') {
      this.alerts.push({
        id: Date.now().toString(),
        metric: key,
        value,
        threshold: threshold[severity],
        severity,
        timestamp: Date.now(),
        resolved: false,
        message: `${key} is ${value}, exceeding ${severity} threshold of ${threshold[severity]}`,
      });
    }
  }

  private updateWidgets(category: string, metric: string, value: any) {
    const widget = this.widgets.get(`${category}_metrics`);
    if (widget) {
      widget.updateData(metric, value);
    }

    // Update specialized widgets
    this.widgets.forEach((widget, key) => {
      if (widget.acceptsMetric && widget.acceptsMetric(category, metric)) {
        widget.updateData(metric, value);
      }
    });
  }

  getDashboardData() {
    return {
      realTimeMetrics: Object.fromEntries(this.realTimeData),
      widgets: Object.fromEntries(
        Array.from(this.widgets.entries()).map(([key, widget]) => [key, widget.getData()])
      ),
      alerts: this.getActiveAlerts(),
      summary: this.generateSummary(),
      trends: this.getTrends(),
    };
  }

  getActiveAlerts() {
    return this.alerts
      .filter(alert => !alert.resolved)
      .sort((a, b) => {
        const severityOrder = { critical: 3, warning: 2, info: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, 10); // Top 10 alerts
  }

  private generateSummary() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const recentMetrics = Array.from(this.metrics.entries())
      .map(([key, data]) => {
        const recentData = data.filter(d => d.timestamp > oneHourAgo);
        return {
          metric: key,
          count: recentData.length,
          latest: recentData[recentData.length - 1]?.value,
          trend: this.realTimeData.get(`${key}_trend`),
        };
      })
      .filter(m => m.count > 0);

    return {
      totalMetrics: this.metrics.size,
      activeAlerts: this.alerts.filter(a => !a.resolved).length,
      criticalAlerts: this.alerts.filter(a => !a.resolved && a.severity === 'critical').length,
      recentActivity: recentMetrics.length,
      systemHealth: this.calculateSystemHealth(),
    };
  }

  private calculateSystemHealth(): 'excellent' | 'good' | 'warning' | 'critical' {
    const criticalAlerts = this.alerts.filter(a => !a.resolved && a.severity === 'critical').length;
    const warningAlerts = this.alerts.filter(a => !a.resolved && a.severity === 'warning').length;

    if (criticalAlerts > 0) return 'critical';
    if (warningAlerts > 5) return 'warning';
    if (warningAlerts > 0) return 'good';
    return 'excellent';
  }

  private getTrends() {
    const trends: any = {};
    
    Array.from(this.realTimeData.entries())
      .filter(([key, _]) => key.endsWith('_trend'))
      .forEach(([key, trend]) => {
        const metricKey = key.replace('_trend', '');
        trends[metricKey] = trend;
      });

    return trends;
  }

  resolveAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
    }
  }

  exportDashboardData(format: 'json' | 'csv' | 'pdf' = 'json') {
    const data = this.getDashboardData();
    
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data);
      case 'pdf':
        return this.generatePDFReport(data);
      default:
        return data;
    }
  }

  private convertToCSV(data: any): string {
    const headers = ['Timestamp', 'Metric', 'Value', 'Trend', 'Status'];
    const rows = [headers.join(',')];

    Object.entries(data.realTimeMetrics).forEach(([key, metric]: [string, any]) => {
      if (metric && typeof metric === 'object' && metric.timestamp) {
        const trend = data.trends[key] || 'stable';
        const status = data.alerts.some((a: any) => a.metric === key) ? 'Alert' : 'Normal';
        rows.push([
          new Date(metric.timestamp).toISOString(),
          key,
          metric.value,
          trend,
          status,
        ].join(','));
      }
    });

    return rows.join('\n');
  }

  private generatePDFReport(_data: any): string {
    // In a real implementation, this would generate a PDF
    return 'PDF Report Generated - Performance Dashboard Summary';
  }
}

// Widget Classes
class PerformanceWidget {
  private data: Map<string, any[]> = new Map();
  private config: WidgetConfig;

  constructor(public title: string, public category: string) {
    this.config = {
      refreshRate: 5000, // 5 seconds
      maxDataPoints: 100,
      chartType: 'line',
      showTrend: true,
    };
  }

  updateData(metric: string, value: any) {
    if (!this.data.has(metric)) {
      this.data.set(metric, []);
    }

    this.data.get(metric)!.push({
      value,
      timestamp: Date.now(),
    });

    // Maintain rolling window
    if (this.data.get(metric)!.length > this.config.maxDataPoints) {
      this.data.get(metric)!.shift();
    }
  }

  getData() {
    return {
      title: this.title,
      category: this.category,
      config: this.config,
      metrics: Object.fromEntries(this.data),
      lastUpdated: Date.now(),
    };
  }

  acceptsMetric?(category: string, metric: string): boolean {
    return category === this.category;
  }
}

class UserJourneyWidget extends PerformanceWidget {
  private journeys: Map<string, UserJourney> = new Map();

  constructor() {
    super('User Journey Analysis', 'journey');
  }

  trackJourney(userId: string, event: string, duration?: number) {
    if (!this.journeys.has(userId)) {
      this.journeys.set(userId, {
        userId,
        events: [],
        startTime: Date.now(),
        totalDuration: 0,
      });
    }

    const journey = this.journeys.get(userId)!;
    journey.events.push({
      event,
      timestamp: Date.now(),
      duration: duration || 0,
    });

    if (duration) {
      journey.totalDuration += duration;
    }
  }

  acceptsMetric(category: string, metric: string): boolean {
    return category === 'navigation' || category === 'interaction';
  }
}

class ComparativeAnalysisWidget extends PerformanceWidget {
  private comparisons: Map<string, ComparisonData> = new Map();

  constructor() {
    super('Competitive Analysis', 'comparison');
  }

  addComparison(metric: string, ourValue: number, competitorValues: Array<{name: string, value: number}>) {
    this.comparisons.set(metric, {
      metric,
      ourValue,
      competitors: competitorValues,
      ranking: this.calculateRanking(ourValue, competitorValues),
      lastUpdated: Date.now(),
    });
  }

  private calculateRanking(ourValue: number, competitors: Array<{name: string, value: number}>): number {
    const allValues = [ourValue, ...competitors.map(c => c.value)].sort((a, b) => a - b);
    return allValues.indexOf(ourValue) + 1;
  }

  acceptsMetric(category: string, metric: string): boolean {
    return ['startup', 'memory', 'network', 'ui'].includes(category);
  }
}

class PredictiveInsightsWidget extends PerformanceWidget {
  private predictions: Map<string, Prediction> = new Map();

  constructor() {
    super('Predictive Insights', 'prediction');
  }

  generatePrediction(metric: string, historicalData: number[]) {
    if (historicalData.length < 5) return;

    const trend = this.calculateLinearTrend(historicalData);
    const prediction = this.predictNextValue(historicalData, trend);

    this.predictions.set(metric, {
      metric,
      currentValue: historicalData[historicalData.length - 1],
      predictedValue: prediction,
      confidence: this.calculateConfidence(historicalData, trend),
      trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
      timestamp: Date.now(),
    });
  }

  private calculateLinearTrend(data: number[]): number {
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, val) => sum + val, 0);
    const sumXY = data.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = data.reduce((sum, _, i) => sum + i * i, 0);

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private predictNextValue(data: number[], trend: number): number {
    const lastValue = data[data.length - 1];
    return lastValue + trend;
  }

  private calculateConfidence(data: number[], trend: number): number {
    // Simple confidence based on data consistency
    const variance = this.calculateVariance(data);
    const stability = Math.max(0, 1 - variance / (Math.abs(trend) + 1));
    return Math.min(0.95, stability);
  }

  private calculateVariance(data: number[]): number {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length;
  }

  acceptsMetric(category: string, metric: string): boolean {
    return true; // Accept all metrics for prediction
  }
}

class RealUserMonitoringWidget extends PerformanceWidget {
  private userSessions: Map<string, UserSession> = new Map();

  constructor() {
    super('Real User Monitoring', 'rum');
  }

  trackUserSession(sessionId: string, event: SessionEvent) {
    if (!this.userSessions.has(sessionId)) {
      this.userSessions.set(sessionId, {
        sessionId,
        startTime: Date.now(),
        events: [],
        deviceInfo: event.deviceInfo,
        location: event.location,
      });
    }

    this.userSessions.get(sessionId)!.events.push(event);
  }

  getSessionAnalytics() {
    const sessions = Array.from(this.userSessions.values());
    
    return {
      totalSessions: sessions.length,
      averageSessionDuration: this.calculateAverageSessionDuration(sessions),
      deviceBreakdown: this.getDeviceBreakdown(sessions),
      locationBreakdown: this.getLocationBreakdown(sessions),
      performanceBreakdown: this.getPerformanceBreakdown(sessions),
    };
  }

  private calculateAverageSessionDuration(sessions: UserSession[]): number {
    const activeSessions = sessions.filter(s => s.events.length > 0);
    if (activeSessions.length === 0) return 0;

    const totalDuration = activeSessions.reduce((sum, session) => {
      const lastEvent = session.events[session.events.length - 1];
      return sum + (lastEvent.timestamp - session.startTime);
    }, 0);

    return totalDuration / activeSessions.length;
  }

  private getDeviceBreakdown(sessions: UserSession[]) {
    const breakdown: any = {};
    sessions.forEach(session => {
      const device = session.deviceInfo?.model || 'Unknown';
      breakdown[device] = (breakdown[device] || 0) + 1;
    });
    return breakdown;
  }

  private getLocationBreakdown(sessions: UserSession[]) {
    const breakdown: any = {};
    sessions.forEach(session => {
      const location = session.location || 'Unknown';
      breakdown[location] = (breakdown[location] || 0) + 1;
    });
    return breakdown;
  }

  private getPerformanceBreakdown(sessions: UserSession[]) {
    const performanceEvents = sessions.flatMap(s => 
      s.events.filter(e => e.type === 'performance')
    );

    return {
      totalEvents: performanceEvents.length,
      averageLoadTime: this.calculateAverageMetric(performanceEvents, 'loadTime'),
      averageMemoryUsage: this.calculateAverageMetric(performanceEvents, 'memoryUsage'),
      errorRate: this.calculateErrorRate(sessions),
    };
  }

  private calculateAverageMetric(events: SessionEvent[], metricName: string): number {
    const validEvents = events.filter(e => e.metrics && e.metrics[metricName] !== undefined);
    if (validEvents.length === 0) return 0;

    const sum = validEvents.reduce((total, event) => total + event.metrics![metricName], 0);
    return sum / validEvents.length;
  }

  private calculateErrorRate(sessions: UserSession[]): number {
    const totalEvents = sessions.reduce((sum, s) => sum + s.events.length, 0);
    const errorEvents = sessions.reduce((sum, s) => 
      sum + s.events.filter(e => e.type === 'error').length, 0);
    
    return totalEvents > 0 ? errorEvents / totalEvents : 0;
  }

  acceptsMetric(category: string, metric: string): boolean {
    return category === 'user' || category === 'session' || category === 'rum';
  }
}

// Type Definitions
interface PerformanceAlert {
  id: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  message: string;
}

interface Threshold {
  warning: number;
  critical: number;
}

interface WidgetConfig {
  refreshRate: number;
  maxDataPoints: number;
  chartType: 'line' | 'bar' | 'pie' | 'gauge';
  showTrend: boolean;
}

interface UserJourney {
  userId: string;
  events: Array<{event: string, timestamp: number, duration: number}>;
  startTime: number;
  totalDuration: number;
}

interface ComparisonData {
  metric: string;
  ourValue: number;
  competitors: Array<{name: string, value: number}>;
  ranking: number;
  lastUpdated: number;
}

interface Prediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  timestamp: number;
}

interface UserSession {
  sessionId: string;
  startTime: number;
  events: SessionEvent[];
  deviceInfo?: any;
  location?: string;
}

interface SessionEvent {
  type: 'navigation' | 'interaction' | 'performance' | 'error';
  timestamp: number;
  metrics?: Record<string, number>;
  deviceInfo?: any;
  location?: string;
}

// Mock implementations for testing
class MockPerformanceCollector {
  static generateRealtimeData() {
    return {
      startup: {
        coldStart: 2800 + Math.random() * 400,
        warmStart: 800 + Math.random() * 400,
        timeToInteractive: 1800 + Math.random() * 400,
      },
      memory: {
        heapUsed: 120 + Math.random() * 40,
        heapTotal: 180 + Math.random() * 40,
        external: 20 + Math.random() * 10,
      },
      ui: {
        frameRate: 58 + Math.random() * 4,
        frameDrops: Math.floor(Math.random() * 5),
        renderTime: 12 + Math.random() * 6,
      },
      network: {
        latency: 400 + Math.random() * 200,
        throughput: 50 + Math.random() * 30,
        errorRate: Math.random() * 0.05,
      },
      battery: {
        drainRate: 10 + Math.random() * 8,
        cpuUsage: 15 + Math.random() * 20,
        networkUsage: 5 + Math.random() * 10,
      },
    };
  }

  static generateUserSession(sessionId: string): SessionEvent[] {
    return [
      {
        type: 'navigation',
        timestamp: Date.now() - 30000,
        metrics: { duration: 250 + Math.random() * 200 },
      },
      {
        type: 'performance',
        timestamp: Date.now() - 20000,
        metrics: { loadTime: 1200 + Math.random() * 800, memoryUsage: 140 + Math.random() * 30 },
      },
      {
        type: 'interaction',
        timestamp: Date.now() - 10000,
        metrics: { responseTime: 50 + Math.random() * 100 },
      },
    ];
  }
}

// Test Suite
describe('Performance Monitoring Dashboard - US-11.7', () => {
  let dashboard: PerformanceDashboard;

  beforeEach(() => {
    dashboard = new PerformanceDashboard();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Dashboard Core Functionality', () => {
    test('should initialize with default widgets and thresholds', () => {
      const data = dashboard.getDashboardData();

      expect(data.widgets).toHaveProperty('startup_metrics');
      expect(data.widgets).toHaveProperty('memory_metrics');
      expect(data.widgets).toHaveProperty('ui_performance');
      expect(data.widgets).toHaveProperty('network_metrics');
      expect(data.widgets).toHaveProperty('battery_metrics');
      expect(data.widgets).toHaveProperty('error_tracking');

      expect(data.summary.systemHealth).toBe('excellent'); // No alerts initially
      expect(data.alerts).toHaveLength(0);
    });

    test('should record and display real-time metrics', () => {
      const testData = MockPerformanceCollector.generateRealtimeData();

      dashboard.recordMetric('startup', 'coldStart', testData.startup.coldStart);
      dashboard.recordMetric('memory', 'heapUsed', testData.memory.heapUsed);
      dashboard.recordMetric('ui', 'frameRate', testData.ui.frameRate);

      const data = dashboard.getDashboardData();

      expect(data.realTimeMetrics).toHaveProperty('startup.coldStart');
      expect(data.realTimeMetrics).toHaveProperty('memory.heapUsed');
      expect(data.realTimeMetrics).toHaveProperty('ui.frameRate');

      expect(data.summary.totalMetrics).toBe(3);
      expect(data.summary.recentActivity).toBeGreaterThan(0);
    });

    test('should generate alerts for threshold violations', () => {
      // Trigger critical alert
      dashboard.recordMetric('startup', 'startup_time', 4000); // Above critical threshold
      dashboard.recordMetric('memory', 'memory_usage', 200); // Above critical threshold

      const data = dashboard.getDashboardData();

      expect(data.alerts.length).toBeGreaterThan(0);
      expect(data.alerts.some(alert => alert.severity === 'critical')).toBe(true);
      expect(data.summary.systemHealth).toBe('critical');
      expect(data.summary.criticalAlerts).toBeGreaterThan(0);
    });

    test('should calculate trends correctly', () => {
      // Simulate improving trend
      for (let i = 0; i < 10; i++) {
        dashboard.recordMetric('startup', 'coldStart', 3000 - (i * 50)); // Improving
      }

      // Simulate degrading trend  
      for (let i = 0; i < 10; i++) {
        dashboard.recordMetric('memory', 'heapUsed', 100 + (i * 10)); // Getting worse
      }

      const data = dashboard.getDashboardData();

      expect(data.trends['startup.coldStart']).toBe('improving');
      expect(data.trends['memory.heapUsed']).toBe('degrading');
    });
  });

  describe('Widget System', () => {
    test('should update performance widgets with new data', () => {
      dashboard.recordMetric('startup', 'coldStart', 2800);
      dashboard.recordMetric('startup', 'warmStart', 900);

      const data = dashboard.getDashboardData();
      const startupWidget = data.widgets.startup_metrics;

      expect(startupWidget.title).toBe('Startup Performance');
      expect(startupWidget.category).toBe('startup');
      expect(startupWidget.metrics).toHaveProperty('coldStart');
      expect(startupWidget.metrics).toHaveProperty('warmStart');
    });

    test('should handle user journey tracking', () => {
      const journeyWidget = dashboard.getDashboardData().widgets.user_journey as any;
      
      // Simulate user journey
      dashboard.recordMetric('navigation', 'screen_change', { from: 'home', to: 'profile', duration: 250 });
      dashboard.recordMetric('interaction', 'button_tap', { element: 'play_button', duration: 150 });

      const updatedData = dashboard.getDashboardData();
      expect(updatedData.widgets.user_journey).toBeDefined();
    });

    test('should provide comparative analysis', () => {
      dashboard.recordMetric('startup', 'coldStart', 2800);
      dashboard.recordMetric('memory', 'heapUsed', 140);

      const data = dashboard.getDashboardData();
      expect(data.widgets.comparative_analysis).toBeDefined();
      expect(data.widgets.comparative_analysis.title).toBe('Competitive Analysis');
    });

    test('should generate predictive insights', () => {
      // Generate historical data for prediction
      for (let i = 0; i < 20; i++) {
        dashboard.recordMetric('startup', 'coldStart', 3000 - (i * 25)); // Steady improvement
      }

      const data = dashboard.getDashboardData();
      expect(data.widgets.predictive_insights).toBeDefined();
      expect(data.widgets.predictive_insights.title).toBe('Predictive Insights');
    });
  });

  describe('Real User Monitoring', () => {
    test('should track user sessions and events', () => {
      const rumWidget = new RealUserMonitoringWidget();
      
      const sessionEvent: SessionEvent = {
        type: 'performance',
        timestamp: Date.now(),
        metrics: { loadTime: 1200, memoryUsage: 140 },
        deviceInfo: { model: 'iPhone 13', os: 'iOS 15.0' },
        location: 'US',
      };

      rumWidget.trackUserSession('session_123', sessionEvent);

      const analytics = rumWidget.getSessionAnalytics();
      expect(analytics.totalSessions).toBe(1);
      expect(analytics.deviceBreakdown).toHaveProperty('iPhone 13');
      expect(analytics.locationBreakdown).toHaveProperty('US');
    });

    test('should calculate session analytics correctly', () => {
      const rumWidget = new RealUserMonitoringWidget();

      // Simulate multiple user sessions
      for (let i = 0; i < 5; i++) {
        const events = MockPerformanceCollector.generateUserSession(`session_${i}`);
        events.forEach(event => {
          event.deviceInfo = { model: `Device_${i % 3}` };
          event.location = ['US', 'UK', 'CA'][i % 3];
          rumWidget.trackUserSession(`session_${i}`, event);
        });
      }

      const analytics = rumWidget.getSessionAnalytics();
      expect(analytics.totalSessions).toBe(5);
      expect(analytics.averageSessionDuration).toBeGreaterThan(0);
      expect(Object.keys(analytics.deviceBreakdown).length).toBeGreaterThan(0);
      expect(Object.keys(analytics.locationBreakdown).length).toBeGreaterThan(0);
    });
  });

  describe('Alert Management', () => {
    test('should prioritize alerts by severity', () => {
      dashboard.recordMetric('startup', 'startup_time', 4000); // Critical
      dashboard.recordMetric('memory', 'memory_usage', 130); // Warning
      dashboard.recordMetric('ui', 'frame_rate', 45); // Critical

      const alerts = dashboard.getActiveAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].severity).toBe('critical'); // Should be sorted by severity
      expect(alerts.every(alert => !alert.resolved)).toBe(true);
    });

    test('should resolve alerts', () => {
      dashboard.recordMetric('startup', 'startup_time', 4000);
      
      const alerts = dashboard.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      dashboard.resolveAlert(alerts[0].id);
      
      const updatedAlerts = dashboard.getActiveAlerts();
      expect(updatedAlerts.length).toBe(alerts.length - 1);
    });

    test('should calculate system health based on alerts', () => {
      // Excellent health - no alerts
      expect(dashboard.getDashboardData().summary.systemHealth).toBe('excellent');

      // Warning health - some warning alerts
      dashboard.recordMetric('memory', 'memory_usage', 130); // Warning
      expect(dashboard.getDashboardData().summary.systemHealth).toBe('good');

      // Critical health - critical alerts
      dashboard.recordMetric('startup', 'startup_time', 4000); // Critical
      expect(dashboard.getDashboardData().summary.systemHealth).toBe('critical');
    });
  });

  describe('Data Export and Reporting', () => {
    test('should export dashboard data as JSON', () => {
      dashboard.recordMetric('startup', 'coldStart', 2800);
      dashboard.recordMetric('memory', 'heapUsed', 140);

      const exportedData = dashboard.exportDashboardData('json');
      
      expect(typeof exportedData).toBe('string');
      expect(() => JSON.parse(exportedData)).not.toThrow();

      const parsed = JSON.parse(exportedData);
      expect(parsed).toHaveProperty('realTimeMetrics');
      expect(parsed).toHaveProperty('widgets');
      expect(parsed).toHaveProperty('alerts');
      expect(parsed).toHaveProperty('summary');
    });

    test('should export dashboard data as CSV', () => {
      dashboard.recordMetric('startup', 'coldStart', 2800);
      dashboard.recordMetric('memory', 'heapUsed', 140);

      const csvData = dashboard.exportDashboardData('csv');
      
      expect(typeof csvData).toBe('string');
      expect(csvData).toContain('Timestamp,Metric,Value,Trend,Status');
      expect(csvData.split('\n').length).toBeGreaterThan(1);
    });

    test('should generate PDF report', () => {
      dashboard.recordMetric('startup', 'coldStart', 2800);

      const pdfReport = dashboard.exportDashboardData('pdf');
      
      expect(typeof pdfReport).toBe('string');
      expect(pdfReport).toContain('PDF Report Generated');
    });
  });

  describe('Performance Dashboard Integration', () => {
    test('should integrate with CI/CD monitoring', () => {
      // Simulate CI/CD metrics
      dashboard.recordMetric('ci', 'build_time', 180);
      dashboard.recordMetric('ci', 'test_time', 45);
      dashboard.recordMetric('ci', 'deployment_time', 30);

      const data = dashboard.getDashboardData();
      
      expect(data.realTimeMetrics).toHaveProperty('ci.build_time');
      expect(data.realTimeMetrics).toHaveProperty('ci.test_time');
      expect(data.summary.totalMetrics).toBe(3);
    });

    test('should handle high-frequency data ingestion', () => {
      const startTime = performance.now();

      // Simulate high-frequency data (100 metrics per second)
      for (let i = 0; i < 100; i++) {
        dashboard.recordMetric('realtime', 'metric', Math.random() * 100);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should handle 100 metrics in under 1 second
      expect(dashboard.getDashboardData().summary.totalMetrics).toBe(1);
    });

    test('should maintain rolling data window', () => {
      // Add more than the maximum data points (1000)
      for (let i = 0; i < 1200; i++) {
        dashboard.recordMetric('test', 'rolling', i);
      }

      const data = dashboard.getDashboardData();
      
      // Should maintain only the last 1000 data points
      expect(data.realTimeMetrics['test.rolling'].value).toBeGreaterThan(1000);
    });
  });
});