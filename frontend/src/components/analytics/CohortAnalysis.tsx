'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DownloadIcon, CalendarIcon, UsersIcon, TrendingUpIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

interface CohortAnalysisProps {
  dateRange?: DateRange;
  className?: string;
}

interface CohortData {
  cohorts: CohortMetric[];
  summary: CohortSummary;
  retentionMatrix: RetentionMatrix;
  channelBreakdown: ChannelCohort[];
}

interface CohortMetric {
  cohortDate: string;
  cohortSize: number;
  channel: string;
  retentionRates: number[];
  revenue: number[];
  avgLifetimeValue: number;
  churnRate: number;
}

interface CohortSummary {
  totalCohorts: number;
  avgRetentionDay1: number;
  avgRetentionDay7: number;
  avgRetentionDay30: number;
  avgLifetimeValue: number;
  bestPerformingChannel: string;
  worstPerformingChannel: string;
}

interface RetentionMatrix {
  periods: string[];
  cohorts: {
    cohortDate: string;
    channel: string;
    retentionRates: number[];
    cohortSize: number;
  }[];
}

interface ChannelCohort {
  channel: string;
  totalUsers: number;
  avgRetention: number;
  avgLifetimeValue: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Cohort Analysis Component - User retention analysis with heatmap visualization
 * Memoized for performance optimization (UI-039)
 */
export const CohortAnalysis = React.memo(function CohortAnalysis({ dateRange, className }: CohortAnalysisProps) {
  const [data, setData] = useState<CohortData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedMetric, setSelectedMetric] = useState<'retention' | 'revenue'>('retention');
  const [activeView, setActiveView] = useState<'heatmap' | 'table' | 'trends'>('heatmap');

  const loadCohortData = useCallback(async (): Promise<void> => {
    if (!dateRange?.from || !dateRange?.to) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        channel: selectedChannel,
        metric: selectedMetric,
      });

      const response = await fetch(`/api/growth-analytics/cohort-analysis?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const cohortData = await response.json();
      setData(cohortData);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load cohort data:', err);
      }
      setError(err instanceof Error ? err.message : 'Failed to load cohort analysis');
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedChannel, selectedMetric]);

  useEffect(() => {
    loadCohortData();
  }, [loadCohortData]);

  const exportCohortData = () => {
    if (!data) return;

    const csvContent = generateCohortCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cohort-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const generateCohortCSV = (data: CohortData): string => {
    const headers = ['Cohort Date', 'Channel', 'Cohort Size', 'Day 1', 'Day 7', 'Day 30', 'LTV', 'Churn Rate'];
    const rows = data.cohorts.map(cohort => [
      cohort.cohortDate,
      cohort.channel,
      cohort.cohortSize.toString(),
      `${(cohort.retentionRates[0] || 0).toFixed(2)}%`,
      `${(cohort.retentionRates[6] || 0).toFixed(2)}%`,
      `${(cohort.retentionRates[29] || 0).toFixed(2)}%`,
      `$${cohort.avgLifetimeValue.toFixed(2)}`,
      `${cohort.churnRate.toFixed(2)}%`,
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const getRetentionColor = (rate: number): string => {
    if (rate >= 80) return 'bg-success';
    if (rate >= 60) return 'bg-success/70';
    if (rate >= 40) return 'bg-warning';
    if (rate >= 20) return 'bg-warning/70';
    if (rate > 0) return 'bg-error';
    return 'bg-muted';
  };

  const formatNumber = (value: number, type: 'number' | 'currency' | 'percentage' = 'number'): string => {
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      case 'percentage':
        return `${value.toFixed(2)}%`;
      default:
        return new Intl.NumberFormat('en-US').format(value);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="animate-pulse space-y-2 sm:space-y-3 md:space-y-4">
                <div className="h-4 sm:h-5 md:h-6 bg-muted rounded w-1/3"></div>
                <div className="h-24 sm:h-28 md:h-32 bg-muted rounded"></div>
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
            <p className="font-medium">Error loading cohort analysis</p>
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
          <p className="text-center text-muted-foreground">No cohort data available for the selected period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-3 sm:space-y-4 md:space-y-6 ${className}`} data-testid="cohort-analysis">
      {/* Controls Header */}
      <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 md:p-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Cohort Analysis</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">User retention analysis with acquisition channel breakdown</p>
        </div>

        <div className="flex flex-col w-full sm:w-auto gap-2 sm:gap-4 sm:flex-row sm:items-center">
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-full sm:w-auto sm:w-48">
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="organic">Organic</SelectItem>
              <SelectItem value="paid">Paid Ads</SelectItem>
              <SelectItem value="social">Social Media</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedMetric} onValueChange={value => setSelectedMetric(value as 'retention' | 'revenue')}>
            <SelectTrigger className="w-full sm:w-auto sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="retention">Retention</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={exportCohortData} className="w-full sm:w-auto">
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-2 sm:p-3 md:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Cohorts</CardTitle>
            <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="text-lg sm:text-2xl font-bold">{data.summary.totalCohorts}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique acquisition periods</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-2 sm:p-3 md:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Day 7 Ret.</CardTitle>
            <UsersIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="text-lg sm:text-2xl font-bold">{formatNumber(data.summary.avgRetentionDay7, 'percentage')}</div>
            <p className="text-xs text-muted-foreground mt-1">7-day retention avg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-2 sm:p-3 md:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Avg LTV</CardTitle>
            <TrendingUpIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="text-lg sm:text-2xl font-bold">{formatNumber(data.summary.avgLifetimeValue, 'currency')}</div>
            <p className="text-xs text-muted-foreground mt-1">Average lifetime value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-2 sm:p-3 md:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Top Channel</CardTitle>
            <Badge variant="secondary" className="text-xs">{data.summary.bestPerformingChannel}</Badge>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="text-lg sm:text-2xl font-bold">Performing</div>
            <p className="text-xs text-muted-foreground mt-1">Highest retention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs
        value={activeView}
        onValueChange={value => setActiveView(value as 'heatmap' | 'table' | 'trends')}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="heatmap">Retention Heatmap</TabsTrigger>
          <TabsTrigger value="table">Cohort Table</TabsTrigger>
          <TabsTrigger value="trends">Channel Trends</TabsTrigger>
        </TabsList>

        {/* Retention Heatmap */}
        <TabsContent value="heatmap" className="space-y-2 sm:space-y-3 md:space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-lg sm:text-xl">Retention Heatmap</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Color-coded retention rates by cohort and time period. Darker green indicates higher retention.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <div className="min-w-[600px] sm:min-w-[800px] md:min-w-0">
                  {/* Heatmap Header */}
                  <div className="grid grid-cols-[120px_repeat(30,1fr)] sm:grid-cols-[150px_repeat(30,1fr)] md:grid-cols-[200px_repeat(30,1fr)] gap-0.5 sm:gap-1 mb-1 sm:mb-2">
                    <div className="text-[10px] sm:text-xs md:text-sm font-medium px-1 sm:px-2 py-1">Cohort</div>
                    {data.retentionMatrix.periods.slice(0, 30).map((period, index) => (
                      <div key={index} className="text-[8px] sm:text-xs px-0.5 sm:px-1 py-0.5 sm:py-1 text-center">
                        D{index + 1}
                      </div>
                    ))}
                  </div>

                  {/* Heatmap Rows */}
                  {data.retentionMatrix.cohorts.map((cohort, cohortIndex) => (
                    <div key={cohortIndex} className="grid grid-cols-[120px_repeat(30,1fr)] sm:grid-cols-[150px_repeat(30,1fr)] md:grid-cols-[200px_repeat(30,1fr)] gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
                      <div className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 py-1 bg-muted rounded">
                        <div className="font-medium truncate">{new Date(cohort.cohortDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        <div className="text-[8px] sm:text-xs text-muted-foreground hidden sm:block">{cohort.channel}</div>
                        <div className="text-[8px] hidden sm:block">{cohort.cohortSize}u</div>
                      </div>

                      {cohort.retentionRates.slice(0, 30).map((rate, dayIndex) => (
                        <div
                          key={dayIndex}
                          className={`w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded text-[7px] sm:text-[10px] flex items-center justify-center text-white font-medium ${getRetentionColor(rate)}`}
                          title={`Day ${dayIndex + 1}: ${rate.toFixed(1)}% retention`}
                        >
                          {rate > 0 ? `${rate.toFixed(0)}%` : '-'}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-3 sm:mt-4 md:mt-6">
                <p className="text-xs sm:text-sm font-medium mb-2">Retention Rate:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-error rounded flex-shrink-0"></div>
                    <span>0-20%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-warning/70 rounded flex-shrink-0"></div>
                    <span>20-40%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-warning rounded flex-shrink-0"></div>
                    <span>40-60%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-success/70 rounded flex-shrink-0"></div>
                    <span>60-80%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-success rounded flex-shrink-0"></div>
                    <span>80%+</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed Table */}
        <TabsContent value="table" className="space-y-2 sm:space-y-3 md:space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-lg sm:text-xl">Cohort Details</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Detailed breakdown of cohort performance metrics</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <table className="w-full min-w-[600px] sm:min-w-[900px] md:min-w-0 text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 font-medium">Date</th>
                      <th className="text-left px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 font-medium hidden sm:table-cell">Channel</th>
                      <th className="text-right px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 font-medium">Size</th>
                      <th className="text-right px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 font-medium">D1</th>
                      <th className="text-right px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 font-medium hidden sm:table-cell">D7</th>
                      <th className="text-right px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 font-medium hidden md:table-cell">D30</th>
                      <th className="text-right px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 font-medium">LTV</th>
                      <th className="text-right px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 font-medium hidden md:table-cell">Churn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cohorts.map((cohort, index) => (
                      <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3">{new Date(cohort.cohortDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                        <td className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 hidden sm:table-cell">
                          <Badge variant="outline" className="text-xs">{cohort.channel}</Badge>
                        </td>
                        <td className="text-right px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3">{formatNumber(cohort.cohortSize)}</td>
                        <td className="text-right px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3">{formatNumber(cohort.retentionRates[0] || 0, 'percentage')}</td>
                        <td className="text-right px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 hidden sm:table-cell">{formatNumber(cohort.retentionRates[6] || 0, 'percentage')}</td>
                        <td className="text-right px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 hidden md:table-cell">{formatNumber(cohort.retentionRates[29] || 0, 'percentage')}</td>
                        <td className="text-right px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3">{formatNumber(cohort.avgLifetimeValue, 'currency')}</td>
                        <td className="text-right px-1 sm:px-2 md:px-3 py-1 sm:py-2 md:py-3 hidden md:table-cell">{formatNumber(cohort.churnRate, 'percentage')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channel Trends */}
        <TabsContent value="trends" className="space-y-2 sm:space-y-3 md:space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-lg sm:text-xl">Channel Performance</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Retention performance breakdown by acquisition channel</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {data.channelBreakdown.map((channel, index) => (
                  <div key={index} className="p-2 sm:p-3 md:p-4 border rounded-lg">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="font-medium text-sm sm:text-base truncate">{channel.channel}</h4>
                      <Badge
                        variant={
                          channel.trend === 'up' ? 'default' : channel.trend === 'down' ? 'destructive' : 'secondary'
                        }
                        className="text-xs flex-shrink-0"
                      >
                        {channel.trend}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs sm:text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Total Users:</span>
                        <span className="font-medium">{formatNumber(channel.totalUsers)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Avg Ret.:</span>
                        <span className="font-medium">{formatNumber(channel.avgRetention, 'percentage')}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Avg LTV:</span>
                        <span className="font-medium">{formatNumber(channel.avgLifetimeValue, 'currency')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});
