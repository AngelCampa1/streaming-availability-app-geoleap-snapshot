'use client';

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { TrendingUpIcon, UsersIcon, DollarSignIcon, BarChart3Icon } from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { RealTimeDataProvider, RealTimeStatus, useRealTimeMetrics } from './RealTimeDataProvider';
import type { DateRange } from 'react-day-picker';

// Lazy-load tab components for performance (only load when tab is active)
const GrowthMetricsOverview = lazy(() =>
  import('./GrowthMetricsOverview').then(mod => ({ default: mod.GrowthMetricsOverview }))
);
const AttributionAnalysis = lazy(() =>
  import('./AttributionAnalysis').then(mod => ({ default: mod.AttributionAnalysis }))
);
const ConversionFunnels = lazy(() =>
  import('./ConversionFunnels').then(mod => ({ default: mod.ConversionFunnels }))
);
const RealTimeEventsFeed = lazy(() =>
  import('./RealTimeEventsFeed').then(mod => ({ default: mod.RealTimeEventsFeed }))
);
const CohortAnalysis = lazy(() => import('./CohortAnalysis').then(mod => ({ default: mod.CohortAnalysis })));
const ChannelPerformance = lazy(() =>
  import('./ChannelPerformance').then(mod => ({ default: mod.ChannelPerformance }))
);

// Loading fallback component
const TabLoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    <span className="ml-3">Loading...</span>
  </div>
);


interface GrowthAnalyticsDashboardProps {
  className?: string;
}

interface DashboardMetrics {
  totalEvents: number;
  uniqueUsers: number;
  conversionRate: number;
  revenue: number;
  avgSessionDuration: number;
  retentionRate: number;
  lastUpdated: string;
}

/**
 * Main Growth Analytics Dashboard - Real-time analytics with comprehensive metrics
 */
export function GrowthAnalyticsDashboard({ className }: GrowthAnalyticsDashboardProps) {
  return (
    <RealTimeDataProvider refreshInterval={60000}>
      <GrowthAnalyticsDashboardContent className={className} />
    </RealTimeDataProvider>
  );
}

/**
 * Internal dashboard content component with real-time data access
 */
function GrowthAnalyticsDashboardContent({ className }: GrowthAnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Real-time data integration
  useRealTimeMetrics();

  const loadDashboardMetrics = useCallback(async (): Promise<void> => {
    if (!dateRange?.from || !dateRange?.to) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });

      const response = await fetch(`/api/growth-analytics/dashboard-metrics?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to load dashboard metrics:', err);
      }
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Load dashboard metrics
  useEffect(() => {
    loadDashboardMetrics();
  }, [loadDashboardMetrics]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadDashboardMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, loadDashboardMetrics]);

  // Memoized formatting function to prevent recreation on each render
  const formatMetric = useCallback(
    (value: number, type: 'number' | 'currency' | 'percentage' | 'duration' = 'number'): string => {
      switch (type) {
        case 'currency':
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(value);
        case 'percentage':
          return `${value.toFixed(2)}%`;
        case 'duration':
          const minutes = Math.floor(value / 60);
          const seconds = value % 60;
          return `${minutes}m ${seconds}s`;
        default:
          return new Intl.NumberFormat('en-US').format(value);
      }
    },
    []
  );

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-6 sm:p-8">
        <div
          className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary"
          data-testid="loading-spinner"
        ></div>
        <span className="ml-2 sm:ml-3 text-sm sm:text-base">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* Dashboard Header */}
      <div className="flex flex-col space-y-3 sm:space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Growth Analytics</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Comprehensive analytics and attribution insights
            {metrics?.lastUpdated && (
              <span className="hidden sm:inline ml-2 text-xs sm:text-sm">• Updated {new Date(metrics.lastUpdated).toLocaleTimeString()}</span>
            )}
          </p>
        </div>

        <div className="flex flex-col space-y-2 sm:flex-row sm:flex-wrap sm:items-center sm:space-y-0 sm:space-x-2 lg:space-x-4">
          {/* Real-time status */}
          <div className="hidden sm:block">
            <RealTimeStatus />
          </div>

          {/* Auto-refresh toggle - Hidden on mobile */}
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="hidden sm:flex"
          >
            {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
          </Button>

          {/* Date range picker */}
          <div className="w-full sm:w-auto">
            <DatePickerWithRange value={dateRange} onChange={setDateRange} data-testid="date-picker-input" />
          </div>

          {/* Manual refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardMetrics}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0 text-destructive">
              <span className="text-sm sm:text-base font-medium">Error loading dashboard:</span>
              <span className="text-sm sm:text-base break-words">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Overview */}
      {metrics && (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Events</CardTitle>
              <BarChart3Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{formatMetric(metrics.totalEvents)}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">All tracked events in period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Unique Users</CardTitle>
              <UsersIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{formatMetric(metrics.uniqueUsers)}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Active users in period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUpIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{formatMetric(metrics.conversionRate, 'percentage')}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Overall conversion rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Revenue</CardTitle>
              <DollarSignIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{formatMetric(metrics.revenue, 'currency')}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Total attributed revenue</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4" data-testid="tabs">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-0 h-auto sm:h-10">
          <TabsTrigger value="overview" data-testid="tab-trigger-overview" className="text-xs sm:text-sm px-2 sm:px-3 py-2">
            Overview
          </TabsTrigger>
          <TabsTrigger value="attribution" data-testid="tab-trigger-attribution" className="text-xs sm:text-sm px-2 sm:px-3 py-2">
            <span className="hidden sm:inline">Attribution</span>
            <span className="sm:hidden">Attrib</span>
          </TabsTrigger>
          <TabsTrigger value="funnels" data-testid="tab-trigger-funnels" className="text-xs sm:text-sm px-2 sm:px-3 py-2">
            Funnels
          </TabsTrigger>
          <TabsTrigger value="cohorts" data-testid="tab-trigger-cohorts" className="text-xs sm:text-sm px-2 sm:px-3 py-2">
            Cohorts
          </TabsTrigger>
          <TabsTrigger value="channels" data-testid="tab-trigger-channels" className="text-xs sm:text-sm px-2 sm:px-3 py-2">
            Channels
          </TabsTrigger>
          <TabsTrigger value="realtime" data-testid="tab-trigger-realtime" className="text-xs sm:text-sm px-2 sm:px-3 py-2">
            <span className="hidden sm:inline">Real-time</span>
            <span className="sm:hidden">Live</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4" data-testid="tab-content-overview">
          <Suspense fallback={<TabLoadingFallback />}>
            <GrowthMetricsOverview dateRange={dateRange} />
          </Suspense>
        </TabsContent>

        <TabsContent value="attribution" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4" data-testid="tab-content-attribution">
          <Suspense fallback={<TabLoadingFallback />}>
            <AttributionAnalysis dateRange={dateRange} />
          </Suspense>
        </TabsContent>

        <TabsContent value="funnels" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4" data-testid="tab-content-funnels">
          <Suspense fallback={<TabLoadingFallback />}>
            <ConversionFunnels dateRange={dateRange} />
          </Suspense>
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4" data-testid="tab-content-cohorts">
          <Suspense fallback={<TabLoadingFallback />}>
            <CohortAnalysis dateRange={dateRange} />
          </Suspense>
        </TabsContent>

        <TabsContent value="channels" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4" data-testid="tab-content-channels">
          <Suspense fallback={<TabLoadingFallback />}>
            <ChannelPerformance dateRange={dateRange} />
          </Suspense>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4" data-testid="tab-content-realtime">
          <Suspense fallback={<TabLoadingFallback />}>
            <RealTimeEventsFeed />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
