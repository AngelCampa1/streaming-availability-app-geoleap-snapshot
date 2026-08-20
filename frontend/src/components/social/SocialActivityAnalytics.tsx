'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  LineChart,
  TrendingUp,
  TrendingDown,
  Heart,
  Eye,
  Target,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { useSocialAuth } from './SocialAuthProvider';

interface ActivityMetrics {
  totalActivities: number;
  totalEngagement: number;
  averageEngagementRate: number;
  reach: number;
  impressions: number;
  clickThroughRate: number;
  shareRate: number;
  responseRate: number;

  // Growth metrics
  periodGrowth: {
    activities: number;
    engagement: number;
    reach: number;
    followers: number;
  };

  // Platform breakdown
  platformStats: Record<
    string,
    {
      activities: number;
      engagement: number;
      reach: number;
      topContentType: string;
      peakHour: number;
    }
  >;

  // Content performance
  contentPerformance: {
    movies: { count: number; avgEngagement: number };
    shows: { count: number; avgEngagement: number };
    reviews: { count: number; avgEngagement: number };
    lists: { count: number; avgEngagement: number };
  };

  // Time-based analytics
  hourlyActivity: number[];
  dailyActivity: number[];
  weeklyTrends: {
    week: string;
    activities: number;
    engagement: number;
    reach: number;
  }[];

  // Top performing content
  topContent: {
    id: string;
    title: string;
    type: string;
    engagement: number;
    reach: number;
    shares: number;
    timestamp: string;
  }[];

  // Audience insights
  audienceInsights: {
    demographics: {
      ageGroups: Record<string, number>;
      locations: Record<string, number>;
      platforms: Record<string, number>;
    };
    interests: Record<string, number>;
    peakTimes: {
      hour: number;
      day: string;
      engagement: number;
    }[];
  };
}

interface SocialActivityAnalyticsProps {
  userId?: string;
  timeRange?: '7d' | '30d' | '90d' | '1y';
  className?: string;
}

export function SocialActivityAnalytics({ userId, timeRange = '30d', className = '' }: SocialActivityAnalyticsProps) {
  const { user: _user } = useSocialAuth();
  const [metrics, setMetrics] = useState<ActivityMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'engagement' | 'reach' | 'activities'>('engagement');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [compareMode, setCompareMode] = useState(false);
  const [comparisonPeriod, setComparisonPeriod] = useState<'previous' | 'year_ago'>('previous');

  // Load analytics data
  useEffect(() => {
    loadAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, timeRange, compareMode, comparisonPeriod]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        timeRange,
        ...(userId && { userId }),
        ...(compareMode && { compare: comparisonPeriod }),
      });

      const response = await fetch(`/api/social-analytics/activity?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Failed to load activity analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async (format: 'csv' | 'json' | 'pdf') => {
    try {
      const params = new URLSearchParams({
        timeRange,
        format,
        ...(userId && { userId }),
      });

      const response = await fetch(`/api/social-analytics/export?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `social-analytics-${timeRange}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="text-success" size={16} />;
    if (growth < 0) return <TrendingDown className="text-destructive" size={16} />;
    return <div className="w-4 h-4" />; // Empty space for zero growth
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  const renderMetricCard = (
    title: string,
    value: number | string,
    growth?: number,
    icon?: React.ReactNode,
    format: 'number' | 'percentage' | 'currency' = 'number'
  ) => {
    const formatValue = (val: number | string) => {
      if (typeof val === 'string') return val;
      if (format === 'percentage') return `${val.toFixed(1)}%`;
      if (format === 'currency') return `$${val.toFixed(2)}`;
      return formatNumber(val);
    };

    return (
      <div className="bg-card p-6 rounded-lg border border-border hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {icon}
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          </div>
          {growth !== undefined && (
            <div className="flex items-center space-x-1">
              {getGrowthIcon(growth)}
              <span
                className={`text-sm font-medium ${
                  growth > 0 ? 'text-success' : growth < 0 ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                {formatPercentage(growth)}
              </span>
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-foreground">{formatValue(value)}</div>
      </div>
    );
  };

  const renderChart = () => {
    if (!metrics) return null;

    const _data =
      chartType === 'line'
        ? metrics.weeklyTrends
        : metrics.hourlyActivity.map((value, index) => ({ hour: index, value }));

    return (
      <div className="bg-card p-6 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-foreground">
            {chartType === 'line' ? 'Weekly Trends' : 'Hourly Activity'}
          </h3>

          <div className="flex items-center space-x-2">
            <select
              value={selectedMetric}
              onChange={e => setSelectedMetric(e.target.value as 'engagement' | 'reach' | 'activities')}
              className="px-3 py-1 border border-border rounded text-sm bg-background text-foreground"
            >
              <option value="engagement">Engagement</option>
              <option value="reach">Reach</option>
              <option value="activities">Activities</option>
            </select>

            <button
              onClick={() => setChartType(chartType === 'line' ? 'bar' : 'line')}
              className="px-3 py-1 border border-border rounded text-sm hover:bg-muted"
            >
              {chartType === 'line' ? <BarChart3 size={16} /> : <LineChart size={16} />}
            </button>
          </div>
        </div>

        {/* Simple chart representation - in a real app, you'd use a charting library */}
        <div className="h-64 flex items-end space-x-2 p-4 bg-muted rounded">
          {(chartType === 'line'
            ? metrics.weeklyTrends
            : metrics.hourlyActivity.map((value, index) => ({
                value,
                label: `${index}:00`,
              }))
          )
            .slice(0, 12)
            .map((item, index) => {
              const weeklyTrend = chartType === 'line' ? (item as (typeof metrics.weeklyTrends)[0]) : null;
              const hourlyData = chartType !== 'line' ? (item as { value: number; label: string }) : null;

              const value = weeklyTrend ? weeklyTrend[selectedMetric] : (hourlyData?.value ?? 0);
              const maxValue =
                chartType === 'line'
                  ? Math.max(...metrics.weeklyTrends.map(w => w[selectedMetric]))
                  : Math.max(...metrics.hourlyActivity);
              const height = (value / maxValue) * 200;

              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-primary rounded-t transition-all duration-300 hover:bg-primary/80"
                    style={{ height: `${height}px` }}
                    title={`${value} ${selectedMetric}`}
                  />
                  <span className="text-xs text-muted-foreground mt-1">
                    {weeklyTrend ? weeklyTrend.week.split('-').pop() : hourlyData?.label}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  const renderPlatformBreakdown = () => {
    if (!metrics) return null;

    return (
      <div className="bg-card p-6 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-foreground">Platform Performance</h3>
          <button onClick={() => toggleSection('platforms')} className="text-muted-foreground hover:text-foreground">
            {expandedSections.has('platforms') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {expandedSections.has('platforms') && (
          <div className="space-y-4">
            {Object.entries(metrics.platformStats).map(([platform, stats]) => {
              const totalActivities = Object.values(metrics.platformStats).reduce((sum, p) => sum + p.activities, 0);
              const percentage = totalActivities > 0 ? (stats.activities / totalActivities) * 100 : 0;

              return (
                <div key={platform} className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-foreground capitalize">{platform}</span>
                      <span className="text-sm text-muted-foreground">({percentage.toFixed(1)}%)</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Peak: {stats.peakHour}:00</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Activities</div>
                      <div className="font-semibold text-foreground">{formatNumber(stats.activities)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Engagement</div>
                      <div className="font-semibold text-foreground">{formatNumber(stats.engagement)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Top Content</div>
                      <div className="font-semibold capitalize text-foreground">{stats.topContentType}</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full bg-border rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderTopContent = () => {
    if (!metrics) return null;

    return (
      <div className="bg-card p-6 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-foreground">Top Performing Content</h3>
          <button onClick={() => toggleSection('content')} className="text-muted-foreground hover:text-foreground">
            {expandedSections.has('content') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {expandedSections.has('content') && (
          <div className="space-y-3">
            {metrics.topContent.slice(0, 5).map((content, index) => (
              <div key={content.id} className="flex items-center space-x-4 p-3 hover:bg-muted/50 rounded-lg">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">{content.title}</h4>
                  <p className="text-sm text-muted-foreground capitalize">{content.type}</p>
                </div>

                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-foreground">{formatNumber(content.engagement)}</div>
                    <div className="text-muted-foreground">Engagement</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-foreground">{formatNumber(content.reach)}</div>
                    <div className="text-muted-foreground">Reach</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-foreground">{formatNumber(content.shares)}</div>
                    <div className="text-muted-foreground">Shares</div>
                  </div>
                </div>

                <button className="text-muted-foreground hover:text-foreground">
                  <ExternalLink size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAudienceInsights = () => {
    if (!metrics) return null;

    const { audienceInsights } = metrics;

    return (
      <div className="bg-card p-6 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-foreground">Audience Insights</h3>
          <button onClick={() => toggleSection('audience')} className="text-muted-foreground hover:text-foreground">
            {expandedSections.has('audience') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {expandedSections.has('audience') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Interests */}
            <div>
              <h4 className="font-medium text-foreground mb-3">Top Interests</h4>
              <div className="space-y-2">
                {Object.entries(audienceInsights.interests)
                  .slice(0, 5)
                  .map(([interest, count]) => {
                    const maxCount = Math.max(...Object.values(audienceInsights.interests));
                    const percentage = (count / maxCount) * 100;

                    return (
                      <div key={interest} className="flex items-center space-x-3">
                        <div className="w-20 text-sm text-muted-foreground capitalize">{interest}</div>
                        <div className="flex-1 bg-border rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-12 text-sm text-foreground text-right">{count}</div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Peak Engagement Times */}
            <div>
              <h4 className="font-medium text-foreground mb-3">Peak Engagement Times</h4>
              <div className="space-y-3">
                {audienceInsights.peakTimes.slice(0, 3).map((peak, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium text-foreground">
                        {peak.day} at {peak.hour}:00
                      </div>
                      <div className="text-sm text-muted-foreground">{formatNumber(peak.engagement)} avg engagement</div>
                    </div>
                    <div className="text-lg font-bold text-primary">#{index + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw size={32} className="animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading activity analytics...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <BarChart3 size={48} className="mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Analytics Data</h3>
        <p className="text-muted-foreground">Start sharing content to see your social activity analytics!</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Social Activity Analytics</h2>
          <p className="text-muted-foreground">Track your social media performance and engagement</p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={compareMode}
              onChange={e => setCompareMode(e.target.checked)}
              className="text-primary"
            />
            <span className="text-sm text-foreground">Compare periods</span>
          </label>

          {compareMode && (
            <select
              value={comparisonPeriod}
              onChange={e => setComparisonPeriod(e.target.value as 'previous' | 'year_ago')}
              className="px-3 py-1 border border-border rounded text-sm bg-background text-foreground"
            >
              <option value="previous">Previous period</option>
              <option value="year_ago">Year ago</option>
            </select>
          )}

          <button
            onClick={() => exportData('csv')}
            className="flex items-center space-x-2 px-3 py-2 border border-border rounded-full hover:bg-muted"
          >
            <Download size={16} />
            <span>Export</span>
          </button>

          <button onClick={loadAnalytics} className="p-2 text-muted-foreground hover:text-foreground rounded-full">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderMetricCard(
          'Total Activities',
          metrics.totalActivities,
          metrics.periodGrowth.activities,
          <BarChart3 size={20} className="text-primary" />
        )}

        {renderMetricCard(
          'Total Engagement',
          metrics.totalEngagement,
          metrics.periodGrowth.engagement,
          <Heart size={20} className="text-destructive" />
        )}

        {renderMetricCard(
          'Average Reach',
          metrics.reach,
          metrics.periodGrowth.reach,
          <Eye size={20} className="text-success" />
        )}

        {renderMetricCard(
          'Engagement Rate',
          metrics.averageEngagementRate,
          undefined,
          <Target size={20} className="text-accent" />,
          'percentage'
        )}
      </div>

      {/* Charts */}
      {renderChart()}

      {/* Additional Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderPlatformBreakdown()}
        {renderTopContent()}
      </div>

      {/* Audience Insights */}
      {renderAudienceInsights()}
    </div>
  );
}

export default SocialActivityAnalytics;
