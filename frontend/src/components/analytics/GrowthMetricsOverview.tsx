'use client';

import React, { useState, useEffect } from'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from'@/components/ui/card';
import {
  AreaChart,
  Area,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from'recharts';
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from'lucide-react';
import type { DateRange } from'react-day-picker';

interface GrowthMetricsOverviewProps {
  dateRange?: DateRange;
  className?: string;
}

interface MetricsData {
  dailyMetrics: DailyMetric[];
  eventCategories: EventCategoryMetric[];
  userSegments: UserSegmentMetric[];
  performanceMetrics: PerformanceMetric[];
  trends: TrendMetric[];
}

interface DailyMetric {
  date: string;
  events: number;
  users: number;
  sessions: number;
  revenue: number;
  conversionRate: number;
}

interface EventCategoryMetric {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

interface UserSegmentMetric {
  segment: string;
  users: number;
  revenue: number;
  avgSessionDuration: number;
  conversionRate: number;
}

interface PerformanceMetric {
  metric: string;
  current: number;
  previous: number;
  change: number;
  trend:'up' |'down' |'stable';
}

interface TrendMetric {
  name: string;
  value: number;
  change: number;
  trend:'up' |'down' |'stable';
  description: string;
}

// Using CSS variables for chart colors
const CHART_COLORS = ['hsl(var(--chart-1))','hsl(var(--chart-2))','hsl(var(--chart-3))','hsl(var(--chart-4))','hsl(var(--chart-5))','hsl(var(--accent))',
];

/**
 * Helper function to get trend icon based on trend direction
 * Exported for testing purposes
 */
export const getTrendIcon = (trend:'up' |'down' |'stable') => {
  switch (trend) {
    case'up':
      return <TrendingUpIcon className="h-4 w-4 text-success" />;
    case'down':
      return <TrendingDownIcon className="h-4 w-4 text-destructive" />;
    default:
      return <MinusIcon className="h-4 w-4 text-muted-foreground" />;
  }
};

export const formatNumber = (value: number, type:'number' |'currency' |'percentage' |'duration' ='number'): string => {
  switch (type) {
    case'currency':
      return new Intl.NumberFormat('en-US', {
        style:'currency',
        currency:'USD',
      }).format(value);
    case'percentage':
      return `${value.toFixed(2)}%`;
    case'duration':
      const minutes = Math.floor(value / 60);
      const seconds = value % 60;
      return `${minutes}m ${seconds}s`;
    default:
      return new Intl.NumberFormat('en-US').format(value);
  }
};

/**
 * Helper function to format tooltip values based on data name
 * Exported for testing purposes
 */
export const getTooltipFormatter = (value: number, name: string): [string, string] => {
  const formatType =
    name ==='revenue'
      ?'currency'
      : name ==='conversionRate'
        ?'percentage'
        : name ==='avgSessionDuration'
          ?'duration'
          :'number';
  return [formatNumber(value, formatType), name];
};

/**
 * Tooltip label formatter for date values
 * Exported for testing purposes
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const formatTooltipDate = (value: any): string => {
  return new Date(value).toLocaleDateString();
};

/**
 * Simple tooltip formatter that returns formatted number
 * Exported for testing purposes
 */
export const formatTooltipNumber = (value: number): string => {
  return formatNumber(value);
};

/**
 * Comprehensive Growth Metrics Overview with charts and insights
 * Memoized for performance optimization (UI-039)
 */
export const GrowthMetricsOverview = React.memo(function GrowthMetricsOverview({
  dateRange,
  className,
}: GrowthMetricsOverviewProps) {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetricsData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const loadMetricsData = async (): Promise<void> => {
    if (!dateRange?.from || !dateRange?.to) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });

      const response = await fetch(`/api/growth-analytics/metrics-overview?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const metricsData = await response.json();
      setData(metricsData);
    } catch (err) {
      if (process.env.NODE_ENV !=='test') {
        console.error('Failed to load metrics data:', err);
      }
      setError(err instanceof Error ? err.message :'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="text-destructive text-center">
            <p className="font-medium">Error loading metrics overview</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No data available for the selected period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`} data-testid="growth-metrics-overview">
      {/* Trend Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {data?.trends?.map((trend, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{trend.name}</CardTitle>
              {getTrendIcon(trend.trend)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(trend.value)}</div>
              <div className="flex items-center text-sm">
                <span
                  className={`${trend.change >= 0 ?'text-success' :'text-destructive'}`}
                >
                  {trend.change >= 0 ?'+' :''}
                  {trend.change.toFixed(1)}%
                </span>
                <span className="text-muted-foreground ml-1">vs. previous period</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{trend.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily Metrics Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily Metrics Trend</CardTitle>
            <CardDescription>Events, users, and revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data?.dailyMetrics || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-muted-foreground" />
                <YAxis yAxisId="left" className="text-muted-foreground" />
                <YAxis yAxisId="right" orientation="right" className="text-muted-foreground" />
                <Tooltip
                  labelFormatter={formatTooltipDate}
                  formatter={getTooltipFormatter}
                  contentStyle={{
                    backgroundColor:'hsl(var(--card))',
                    border:'1px solid hsl(var(--border))',
                    borderRadius:'0.5rem',
                    color:'hsl(var(--foreground))',
                  }}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="events"
                  stackId="1"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.6}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="users"
                  stackId="2"
                  stroke="hsl(var(--accent))"
                  fill="hsl(var(--accent))"
                  fillOpacity={0.6}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={3}
                  dot={{ fill:'hsl(var(--chart-3))' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Event Categories Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Event Categories</CardTitle>
            <CardDescription>Distribution of tracked events by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data?.eventCategories || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="count"
                >
                  {data?.eventCategories?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={formatTooltipNumber}
                  contentStyle={{
                    backgroundColor:'hsl(var(--card))',
                    border:'1px solid hsl(var(--border))',
                    borderRadius:'0.5rem',
                    color:'hsl(var(--foreground))',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Segments Performance */}
        <Card>
          <CardHeader>
            <CardTitle>User Segments</CardTitle>
            <CardDescription>Performance by user segment</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.userSegments || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="segment" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip
                  formatter={getTooltipFormatter}
                  contentStyle={{
                    backgroundColor:'hsl(var(--card))',
                    border:'1px solid hsl(var(--border))',
                    borderRadius:'0.5rem',
                    color:'hsl(var(--foreground))',
                  }}
                />
                <Legend />
                <Bar dataKey="users" fill="hsl(var(--primary))" />
                <Bar dataKey="revenue" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Key performance indicators with period-over-period comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-foreground">Metric</th>
                  <th className="text-right p-2 text-foreground">Current</th>
                  <th className="text-right p-2 text-foreground">Previous</th>
                  <th className="text-right p-2 text-foreground">Change</th>
                  <th className="text-center p-2 text-foreground">Trend</th>
                </tr>
              </thead>
              <tbody>
                {data?.performanceMetrics?.map((metric, index) => (
                  <tr key={index} className="border-b border-border last:border-0">
                    <td className="p-2 font-medium text-foreground">{metric.metric}</td>
                    <td className="text-right p-2 text-foreground">{formatNumber(metric.current)}</td>
                    <td className="text-right p-2 text-foreground">{formatNumber(metric.previous)}</td>
                    <td
                      className={`text-right p-2 ${metric.change >= 0 ?'text-success' :'text-destructive'}`}
                    >
                      {metric.change >= 0 ?'+' :''}
                      {metric.change.toFixed(1)}%
                    </td>
                    <td className="text-center p-2">{getTrendIcon(metric.trend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
