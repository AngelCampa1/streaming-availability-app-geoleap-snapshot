'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert } from '../ui/alert';
import {
  Activity,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Target,
  Loader2,
} from 'lucide-react';

// Types for performance monitoring
interface _ShareWidgetPerformance {
  widgetId: string;
  loadTime: number;
  renderTime: number;
  interactionTime: number;
  bundleSize: number;
  cacheHitRate: number;
  errorRate: number;
  deviceType: string;
  networkType: string;
  timestamp: string;
}

interface CoreWebVitals {
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay
  lcp: number; // Largest Contentful Paint
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
}

interface PerformanceMetrics {
  shareWidgetLoadTime: number;
  pageLoadImpact: number;
  coreWebVitals: CoreWebVitals;
  networkLatency: number;
  bundleOptimization: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    loadingStrategy: string;
  };
  cachePerformance: {
    hitRate: number;
    missRate: number;
    averageHitTime: number;
    averageMissTime: number;
  };
  errorTracking: {
    totalErrors: number;
    errorRate: number;
    commonErrors: Array<{ type: string; count: number; percentage: number }>;
  };
  userExperience: {
    shareButtonClickRate: number;
    shareCompletionRate: number;
    averageShareTime: number;
    mobileUsabilityScore: number;
  };
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
  timestamp: string;
}

interface SharePerformanceMonitorProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Performance monitoring utilities
const measurePerformance = (): Promise<PerformanceMetrics> => {
  return new Promise(resolve => {
    // Simulate performance measurement with realistic data
    setTimeout(() => {
      const _performanceEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      resolve({
        shareWidgetLoadTime: Math.random() * 500 + 100, // 100-600ms
        pageLoadImpact: Math.random() * 200 + 50, // 50-250ms
        coreWebVitals: {
          cls: Math.random() * 0.1 + 0.05, // 0.05-0.15
          fid: Math.random() * 100 + 50, // 50-150ms
          lcp: Math.random() * 1000 + 1500, // 1.5-2.5s
          fcp: Math.random() * 800 + 800, // 0.8-1.6s
          ttfb: Math.random() * 300 + 200, // 200-500ms
        },
        networkLatency: Math.random() * 100 + 50,
        bundleOptimization: {
          originalSize: 250000, // 250KB
          compressedSize: 45000, // 45KB
          compressionRatio: 0.82,
          loadingStrategy: 'lazy',
        },
        cachePerformance: {
          hitRate: 0.85 + Math.random() * 0.1,
          missRate: 0.05 + Math.random() * 0.1,
          averageHitTime: Math.random() * 50 + 10,
          averageMissTime: Math.random() * 200 + 100,
        },
        errorTracking: {
          totalErrors: Math.floor(Math.random() * 50),
          errorRate: Math.random() * 0.05,
          commonErrors: [
            { type: 'Network timeout', count: 15, percentage: 35.7 },
            { type: 'Platform API error', count: 12, percentage: 28.6 },
            { type: 'Widget load failure', count: 8, percentage: 19.0 },
            { type: 'Permission denied', count: 7, percentage: 16.7 },
          ],
        },
        userExperience: {
          shareButtonClickRate: 0.15 + Math.random() * 0.1,
          shareCompletionRate: 0.78 + Math.random() * 0.15,
          averageShareTime: Math.random() * 5000 + 2000,
          mobileUsabilityScore: 85 + Math.random() * 10,
        },
      });
    }, 1000);
  });
};

// Performance score calculation
const calculatePerformanceScore = (metrics: PerformanceMetrics): number => {
  const clsScore = metrics.coreWebVitals.cls < 0.1 ? 100 : Math.max(0, 100 - metrics.coreWebVitals.cls * 1000);
  const lcpScore = metrics.coreWebVitals.lcp < 2500 ? 100 : Math.max(0, 100 - (metrics.coreWebVitals.lcp - 2500) / 50);
  const fidScore = metrics.coreWebVitals.fid < 100 ? 100 : Math.max(0, 100 - (metrics.coreWebVitals.fid - 100));
  const errorScore = (1 - metrics.errorTracking.errorRate) * 100;
  const cacheScore = metrics.cachePerformance.hitRate * 100;

  return Math.round((clsScore + lcpScore + fidScore + errorScore + cacheScore) / 5);
};

// Core Web Vitals Card
const CoreWebVitalsCard: React.FC<{ vitals: CoreWebVitals }> = ({ vitals }) => {
  const getVitalStatus = (metric: string, value: number) => {
    const thresholds = {
      cls: { good: 0.1, needsImprovement: 0.25 },
      lcp: { good: 2500, needsImprovement: 4000 },
      fid: { good: 100, needsImprovement: 300 },
      fcp: { good: 1800, needsImprovement: 3000 },
      ttfb: { good: 800, needsImprovement: 1800 },
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needsImprovement';
    return 'poor';
  };

  const formatValue = (metric: string, value: number) => {
    if (metric === 'cls') return value.toFixed(3);
    return `${Math.round(value)}ms`;
  };

  const vitalItems = [
    { name: 'CLS', key: 'cls', value: vitals.cls, description: 'Cumulative Layout Shift' },
    { name: 'LCP', key: 'lcp', value: vitals.lcp, description: 'Largest Contentful Paint' },
    { name: 'FID', key: 'fid', value: vitals.fid, description: 'First Input Delay' },
    { name: 'FCP', key: 'fcp', value: vitals.fcp, description: 'First Contentful Paint' },
    { name: 'TTFB', key: 'ttfb', value: vitals.ttfb, description: 'Time to First Byte' },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Zap className="w-5 h-5 text-info" />
        <h3 className="text-lg font-semibold text-foreground">Core Web Vitals</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {vitalItems.map(vital => {
          const status = getVitalStatus(vital.key, vital.value);
          const statusColors = {
            good: 'bg-success/10 text-success border-success/20',
            needsImprovement: 'bg-warning/10 text-warning border-warning/20',
            poor: 'bg-destructive/10 text-destructive border-destructive/20',
          };

          return (
            <div key={vital.key} className="text-center">
              <div className="text-2xl font-bold text-foreground mb-1">{formatValue(vital.key, vital.value)}</div>
              <div className="text-sm font-medium text-foreground mb-2">{vital.name}</div>
              <Badge variant="outline" className={`text-xs ${statusColors[status]}`}>
                {status === 'good' ? 'Good' : status === 'needsImprovement' ? 'Needs Work' : 'Poor'}
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">{vital.description}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// Performance Metrics Grid
const PerformanceMetricsGrid: React.FC<{ metrics: PerformanceMetrics }> = ({ metrics }) => {
  const metricCards = [
    {
      title: 'Widget Load Time',
      value: `${Math.round(metrics.shareWidgetLoadTime)}ms`,
      target: '< 500ms',
      status: metrics.shareWidgetLoadTime < 500 ? 'good' : metrics.shareWidgetLoadTime < 800 ? 'warning' : 'error',
      icon: <Clock className="w-5 h-5" />,
    },
    {
      title: 'Page Load Impact',
      value: `${Math.round(metrics.pageLoadImpact)}ms`,
      target: '< 200ms',
      status: metrics.pageLoadImpact < 200 ? 'good' : metrics.pageLoadImpact < 400 ? 'warning' : 'error',
      icon: <Activity className="w-5 h-5" />,
    },
    {
      title: 'Cache Hit Rate',
      value: `${(metrics.cachePerformance.hitRate * 100).toFixed(1)}%`,
      target: '> 90%',
      status:
        metrics.cachePerformance.hitRate > 0.9 ? 'good' : metrics.cachePerformance.hitRate > 0.8 ? 'warning' : 'error',
      icon: <Target className="w-5 h-5" />,
    },
    {
      title: 'Error Rate',
      value: `${(metrics.errorTracking.errorRate * 100).toFixed(2)}%`,
      target: '< 1%',
      status:
        metrics.errorTracking.errorRate < 0.01 ? 'good' : metrics.errorTracking.errorRate < 0.05 ? 'warning' : 'error',
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      title: 'Bundle Size',
      value: `${Math.round(metrics.bundleOptimization.compressedSize / 1024)}KB`,
      target: '< 50KB',
      status:
        metrics.bundleOptimization.compressedSize < 50000
          ? 'good'
          : metrics.bundleOptimization.compressedSize < 100000
            ? 'warning'
            : 'error',
      icon: <Download className="w-5 h-5" />,
    },
    {
      title: 'Share Completion',
      value: `${(metrics.userExperience.shareCompletionRate * 100).toFixed(1)}%`,
      target: '> 85%',
      status:
        metrics.userExperience.shareCompletionRate > 0.85
          ? 'good'
          : metrics.userExperience.shareCompletionRate > 0.7
            ? 'warning'
            : 'error',
      icon: <CheckCircle className="w-5 h-5" />,
    },
  ];

  const statusColors = {
    good: { bg: 'bg-success/10', border: 'border-success/20', text: 'text-success', icon: 'text-success' },
    warning: { bg: 'bg-warning/10', border: 'border-warning/20', text: 'text-warning', icon: 'text-warning' },
    error: { bg: 'bg-destructive/10', border: 'border-destructive/20', text: 'text-destructive', icon: 'text-destructive' },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metricCards.map((metric, index) => {
        const colors = statusColors[metric.status as keyof typeof statusColors] || statusColors.good;

        return (
          <Card key={index} className={`p-4 ${colors.bg} ${colors.border}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                <div className="text-2xl font-bold text-foreground mt-1">{metric.value}</div>
                <div className="text-xs text-muted-foreground mt-1">Target: {metric.target}</div>
              </div>
              <div className={`flex-shrink-0 ${colors.icon}`}>{metric.icon}</div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

// Error Analysis Card
const ErrorAnalysisCard: React.FC<{ errorData: PerformanceMetrics['errorTracking'] }> = ({ errorData }) => {
  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <h3 className="text-lg font-semibold text-foreground">Error Analysis</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-foreground">Error Summary</h4>
            <Badge
              variant="outline"
              className={
                errorData.errorRate < 0.01
                  ? 'text-success'
                  : errorData.errorRate < 0.05
                    ? 'text-warning'
                    : 'text-destructive'
              }
            >
              {(errorData.errorRate * 100).toFixed(2)}% error rate
            </Badge>
          </div>
          <div className="text-3xl font-bold text-foreground mb-2">{errorData.totalErrors}</div>
          <div className="text-sm text-muted-foreground">Total errors in last 24 hours</div>
        </div>

        <div>
          <h4 className="font-medium text-foreground mb-4">Common Error Types</h4>
          <div className="space-y-3">
            {errorData.commonErrors.map((error, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{error.type}</div>
                  <div className="text-xs text-muted-foreground">{error.count} occurrences</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground">{error.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Bundle Optimization Card
const BundleOptimizationCard: React.FC<{ bundleData: PerformanceMetrics['bundleOptimization'] }> = ({ bundleData }) => {
  const compressionPercentage = (1 - bundleData.compressedSize / bundleData.originalSize) * 100;

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Download className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Bundle Optimization</h3>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-foreground mb-2">{Math.round(bundleData.compressedSize / 1024)}KB</div>
          <div className="text-sm text-muted-foreground mb-4">Compressed Size</div>
          <Badge variant="outline" className="bg-success/10 text-success">
            {compressionPercentage.toFixed(1)}% reduction
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Original Size</span>
            <span className="font-medium">{Math.round(bundleData.originalSize / 1024)}KB</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Compressed Size</span>
            <span className="font-medium">{Math.round(bundleData.compressedSize / 1024)}KB</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Loading Strategy</span>
            <Badge variant="outline" className="capitalize">
              {bundleData.loadingStrategy}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Main Performance Monitor Component
export const SharePerformanceMonitor: React.FC<SharePerformanceMonitorProps> = ({
  className = '',
  autoRefresh = true,
  refreshInterval = 60000,
}) => {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [performanceScore, setPerformanceScore] = useState<number>(0);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load performance metrics
  const loadPerformanceMetrics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const metrics = await measurePerformance();
      setPerformanceMetrics(metrics);

      const score = calculatePerformanceScore(metrics);
      setPerformanceScore(score);

      // Generate alerts based on metrics
      const newAlerts: PerformanceAlert[] = [];

      if (metrics.coreWebVitals.cls > 0.1) {
        newAlerts.push({
          id: 'cls-warning',
          type: 'warning',
          title: 'High Cumulative Layout Shift',
          message: `CLS is ${metrics.coreWebVitals.cls.toFixed(3)}, which may impact user experience`,
          metric: 'cls',
          threshold: 0.1,
          currentValue: metrics.coreWebVitals.cls,
          timestamp: new Date().toISOString(),
        });
      }

      if (metrics.shareWidgetLoadTime > 500) {
        newAlerts.push({
          id: 'widget-load-warning',
          type: 'error',
          title: 'Slow Widget Load Time',
          message: `Share widget is taking ${Math.round(metrics.shareWidgetLoadTime)}ms to load`,
          metric: 'shareWidgetLoadTime',
          threshold: 500,
          currentValue: metrics.shareWidgetLoadTime,
          timestamp: new Date().toISOString(),
        });
      }

      if (metrics.errorTracking.errorRate > 0.05) {
        newAlerts.push({
          id: 'error-rate-warning',
          type: 'error',
          title: 'High Error Rate',
          message: `Error rate is ${(metrics.errorTracking.errorRate * 100).toFixed(2)}%`,
          metric: 'errorRate',
          threshold: 0.05,
          currentValue: metrics.errorTracking.errorRate,
          timestamp: new Date().toISOString(),
        });
      }

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
      setError('Failed to load performance data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh functionality
  useEffect(() => {
    loadPerformanceMetrics();

    if (autoRefresh) {
      intervalRef.current = setInterval(loadPerformanceMetrics, refreshInterval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval]);

  // Export performance data
  const exportPerformanceData = () => {
    if (!performanceMetrics) return;

    const data = {
      timestamp: new Date().toISOString(),
      performanceScore,
      metrics: performanceMetrics,
      alerts,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `share-performance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading && !performanceMetrics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Measuring performance...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="w-8 h-8 text-info" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Share Performance Monitor</h1>
                <p className="text-sm text-muted-foreground">
                  Real-time monitoring of share widget performance and page impact
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-foreground">{performanceScore}</div>
                <div className="text-sm text-muted-foreground">
                  Performance
                  <br />
                  Score
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={exportPerformanceData} disabled={!performanceMetrics}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              <Button variant="outline" size="sm" onClick={loadPerformanceMetrics} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="border-destructive/20 bg-destructive/10">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <div className="text-destructive">
            <p className="font-medium">Performance Monitoring Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setError(null)}
            className="mt-2 text-destructive border-destructive/30"
          >
            Dismiss
          </Button>
        </Alert>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-4">
          {alerts.map(alert => (
            <Alert
              key={alert.id}
              className={
                alert.type === 'error'
                  ? 'border-destructive/20 bg-destructive/10'
                  : alert.type === 'warning'
                    ? 'border-warning/20 bg-warning/10'
                    : 'border-info/20 bg-info/10'
              }
            >
              <AlertTriangle
                className={`w-4 h-4 ${
                  alert.type === 'error'
                    ? 'text-destructive'
                    : alert.type === 'warning'
                      ? 'text-warning'
                      : 'text-info'
                }`}
              />
              <div
                className={
                  alert.type === 'error'
                    ? 'text-destructive'
                    : alert.type === 'warning'
                      ? 'text-warning'
                      : 'text-info'
                }
              >
                <p className="font-medium">{alert.title}</p>
                <p className="text-sm">{alert.message}</p>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Performance Metrics */}
      {performanceMetrics && (
        <>
          {/* Performance Metrics Grid */}
          <PerformanceMetricsGrid metrics={performanceMetrics} />

          {/* Core Web Vitals */}
          <CoreWebVitalsCard vitals={performanceMetrics.coreWebVitals} />

          {/* Analysis Cards */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ErrorAnalysisCard errorData={performanceMetrics.errorTracking} />
            <BundleOptimizationCard bundleData={performanceMetrics.bundleOptimization} />
          </div>
        </>
      )}
    </div>
  );
};

export default SharePerformanceMonitor;
