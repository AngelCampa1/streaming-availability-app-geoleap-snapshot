'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert } from '../ui/alert';
import { Separator } from '../ui/separator';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  RefreshCw,
  Calendar,
  Download,
  AlertTriangle,
  CheckCircle,
  Mail,
  MessageSquare,
  Bell,
  Loader2,
  Activity,
} from 'lucide-react';
import { getRecoveryMetrics, getDunningCampaigns } from '../../lib/api';
import { RecoveryMetrics, RetryAnalytics, GracePeriodAnalytics } from '../../lib/types/payment';

interface DunningAnalyticsDashboardProps {
  className?: string;
  isAdminView?: boolean;
}

interface DashboardFilters {
  dateRange: number;
  startDate?: string;
  endDate?: string;
  customerSegment?: string;
  campaignType?: string;
}

interface Campaign {
  id?: string;
  campaignName: string;
  customerSegment?: string;
  status: 'active' | 'completed' | 'suspended' | string;
  createdAt?: string;
  targetUsers?: number;
  recoveredAmount?: number;
  recoveryRate?: number;
}

export const DunningAnalyticsDashboard: React.FC<DunningAnalyticsDashboardProps> = ({
  className = '',
  isAdminView: _isAdminView = true,
}) => {
  const [metrics, setMetrics] = useState<RecoveryMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: 30,
    customerSegment: '',
    campaignType: '',
  });

  // Load data on mount and filter changes
  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateRange]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - filters.dateRange);

      const [metricsData, campaignsData] = await Promise.all([
        getRecoveryMetrics(startDate, endDate),
        getDunningCampaigns(),
      ]);

      setMetrics(metricsData);
      setCampaigns(campaignsData as Campaign[]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomDateLoad = () => {
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);

      getRecoveryMetrics(startDate, endDate)
        .then(setMetrics)
        .catch(error => {
          console.error('Failed to load custom date metrics:', error);
          setError('Failed to load custom date range data.');
        });
    }
  };

  const exportAnalytics = async () => {
    try {
      if (!metrics) return;

      const data = {
        export_date: new Date().toISOString(),
        period: metrics.period,
        retry_analytics: metrics.retry_analytics,
        grace_period_analytics: metrics.grace_period_analytics,
        campaigns: campaigns.map((c: Campaign) => ({
          id: c.id,
          name: c.campaignName,
          segment: c.customerSegment,
          status: c.status,
          created: c.createdAt,
        })),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dunning-analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export analytics:', error);
      setError('Failed to export analytics data.');
    }
  };

  const _formatCurrency = (value: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value);
  };

  if (isLoading && !metrics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading dunning analytics...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Dunning Analytics Dashboard</h1>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" onClick={exportAnalytics} disabled={!metrics || isLoading}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              <Button variant="outline" size="sm" onClick={loadDashboardData} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <select
                value={filters.dateRange}
                onChange={e => setFilters({ ...filters, dateRange: Number(e.target.value) })}
                className="px-3 py-1 border border-border rounded-md text-sm bg-background text-foreground"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>

            {/* Custom Date Range */}
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-muted-foreground">Custom:</span>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                className="px-2 py-1 border border-border rounded text-sm"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                className="px-2 py-1 border border-border rounded text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCustomDateLoad}
                disabled={!filters.startDate || !filters.endDate}
              >
                Load
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="border-error/20 bg-error/10">
          <AlertTriangle className="w-4 h-4 text-error" />
          <div className="text-error">
            <p className="font-medium">Analytics Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setError(null)}
            className="mt-2 text-error border-error/30"
          >
            Dismiss
          </Button>
        </Alert>
      )}

      {/* Analytics Content */}
      {metrics && (
        <>
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ExecutiveSummaryCard
              title="Failed Payments"
              value={formatNumber(metrics.retry_analytics.totalFailedPayments)}
              subtitle="Total payment failures"
              icon={<AlertTriangle className="w-6 h-6 text-error" />}
              trend={null}
              className="border-error/20"
            />

            <ExecutiveSummaryCard
              title="Recovery Rate"
              value={formatPercentage(metrics.retry_analytics.recoveryRate)}
              subtitle="Overall success rate"
              icon={<CheckCircle className="w-6 h-6 text-success" />}
              trend={metrics.retry_analytics.recoveryRate > 60 ? 'positive' : 'negative'}
              className="border-success/20"
            />

            <ExecutiveSummaryCard
              title="Grace Periods"
              value={formatNumber(metrics.grace_period_analytics.totalGracePeriods)}
              subtitle={`${metrics.grace_period_analytics.activeGracePeriods} active`}
              icon={<Clock className="w-6 h-6 text-warning" />}
              trend={null}
              className="border-warning/20"
            />

            <ExecutiveSummaryCard
              title="Avg Retry Count"
              value={metrics.retry_analytics.averageRetriesToRecovery.toFixed(1)}
              subtitle="Retries to recovery"
              icon={<RefreshCw className="w-6 h-6 text-primary" />}
              trend={metrics.retry_analytics.averageRetriesToRecovery < 3 ? 'positive' : 'negative'}
              className="border-primary/20"
            />
          </div>

          {/* Detailed Analytics Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Retry Analytics Deep Dive */}
            <RetryAnalyticsDetailCard analytics={metrics.retry_analytics} />

            {/* Grace Period Performance */}
            <GracePeriodDetailCard analytics={metrics.grace_period_analytics} />
          </div>

          {/* Campaign Performance and Channel Effectiveness */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Campaign Performance */}
            <DunningCampaignPerformanceCard campaigns={campaigns} />

            {/* Channel Effectiveness */}
            <NotificationChannelEffectivenessCard analytics={metrics.retry_analytics} />
          </div>

          {/* Recovery Timeline and Trends */}
          <RecoveryTimelineCard analytics={metrics.retry_analytics} />
        </>
      )}
    </div>
  );
};

// Executive Summary Card Component
interface ExecutiveSummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: 'positive' | 'negative' | null;
  className?: string;
}

const ExecutiveSummaryCard: React.FC<ExecutiveSummaryCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className = '',
}) => {
  const trendIcon =
    trend === 'positive' ? (
      <TrendingUp className="w-4 h-4 text-success" />
    ) : trend === 'negative' ? (
      <TrendingDown className="w-4 h-4 text-destructive" />
    ) : null;

  return (
    <Card className={`${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-shrink-0">{icon}</div>
          <div className="text-right">{trendIcon}</div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </Card>
  );
};

// Retry Analytics Detail Card
interface RetryAnalyticsDetailCardProps {
  analytics: RetryAnalytics;
}

const RetryAnalyticsDetailCard: React.FC<RetryAnalyticsDetailCardProps> = ({ analytics }) => {
  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Payment Retry Performance</h3>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <div className="text-xl font-bold text-primary">{formatNumber(analytics.totalRetryAttempts)}</div>
            <div className="text-sm text-primary">Total Retry Attempts</div>
          </div>

          <div className="text-center p-4 bg-success/10 rounded-lg">
            <div className="text-xl font-bold text-success">{formatNumber(analytics.successfulRecoveries)}</div>
            <div className="text-sm text-success">Successful Recoveries</div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Failure Reasons Breakdown */}
        <div>
          <h4 className="font-medium text-foreground mb-4">Top Failure Reasons</h4>
          <div className="space-y-3">
            {analytics.topFailureReasons.slice(0, 5).map((reason, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {reason.reason.replace('_', ' ').toUpperCase()}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">{formatNumber(reason.count)}</span>
                    <Badge variant="outline">{formatPercentage(reason.percentage)}</Badge>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${reason.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Grace Period Detail Card
interface GracePeriodDetailCardProps {
  analytics: GracePeriodAnalytics;
}

const GracePeriodDetailCard: React.FC<GracePeriodDetailCardProps> = ({ analytics }) => {
  const extensionRateColor = analytics.extensionRate > 0.2 ? 'text-warning' : 'text-success';

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Clock className="w-5 h-5 text-warning" />
          <h3 className="text-lg font-semibold text-foreground">Grace Period Analytics</h3>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center p-3 bg-warning/10 rounded-lg border border-warning/20">
            <div className="text-lg font-bold text-warning">{analytics.activeGracePeriods}</div>
            <div className="text-xs text-warning">Active</div>
          </div>
          <div className="text-center p-3 bg-success/10 rounded-lg border border-success/20">
            <div className="text-lg font-bold text-success">{analytics.resolvedGracePeriods}</div>
            <div className="text-xs text-success">Resolved</div>
          </div>
          <div className="text-center p-3 bg-error/10 rounded-lg border border-error/20">
            <div className="text-lg font-bold text-error">{analytics.expiredGracePeriods}</div>
            <div className="text-xs text-error">Expired</div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Performance Metrics */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Average Duration:</span>
            <span className="font-medium">{analytics.averageGracePeriodDuration.toFixed(1)} days</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Resolution Rate:</span>
            <Badge className="bg-success/10 text-success">
              {formatPercentage(analytics.gracePeriodResolutionRate)}
            </Badge>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Extension Rate:</span>
            <span className={`font-medium ${extensionRateColor}`}>{formatPercentage(analytics.extensionRate)}</span>
          </div>
        </div>

        <Separator className="my-4" />

        {/* End Reasons */}
        <div>
          <h4 className="font-medium text-foreground mb-3">End Reasons</h4>
          <div className="space-y-2">
            {analytics.topEndReasons.slice(0, 4).map((reason, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground capitalize">{reason.reason.replace('_', ' ')}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-12 bg-muted rounded-full h-1.5">
                    <div className="bg-warning h-1.5 rounded-full" style={{ width: `${reason.percentage}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-6 text-right">{reason.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Campaign Performance Card
interface DunningCampaignPerformanceCardProps {
  campaigns: Campaign[];
}

const DunningCampaignPerformanceCard: React.FC<DunningCampaignPerformanceCardProps> = ({ campaigns }) => {
  const activeCampaigns = campaigns.filter((c: Campaign) => c.status === 'active');
  const completedCampaigns = campaigns.filter((c: Campaign) => c.status === 'completed');
  const suspendedCampaigns = campaigns.filter((c: Campaign) => c.status === 'suspended');

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Mail className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Campaign Performance</h3>
        </div>

        {/* Campaign Status Overview */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="text-lg font-bold text-primary">{activeCampaigns.length}</div>
            <div className="text-xs text-primary">Active</div>
          </div>
          <div className="text-center p-3 bg-success/10 rounded-lg border border-success/20">
            <div className="text-lg font-bold text-success">{completedCampaigns.length}</div>
            <div className="text-xs text-success">Completed</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg border border-border">
            <div className="text-lg font-bold text-muted-foreground">{suspendedCampaigns.length}</div>
            <div className="text-xs text-muted-foreground">Suspended</div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Recent Campaigns */}
        <div>
          <h4 className="font-medium text-foreground mb-3">Recent Campaigns</h4>
          <div className="space-y-2">
            {campaigns.slice(0, 5).map((campaign: Campaign, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-foreground">{campaign.campaignName}</span>
                    <Badge
                      className={
                        campaign.status === 'active'
                          ? 'bg-primary/10 text-primary'
                          : campaign.status === 'completed'
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                      }
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {campaign.customerSegment} • {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Notification Channel Effectiveness Card
interface NotificationChannelEffectivenessCardProps {
  analytics: RetryAnalytics;
}

const NotificationChannelEffectivenessCard: React.FC<NotificationChannelEffectivenessCardProps> = ({ analytics: _analytics }) => {
  const channels = [
    { name: 'Email', icon: Mail, color: 'text-primary', effectiveness: 0.45 },
    { name: 'SMS', icon: MessageSquare, color: 'text-success', effectiveness: 0.62 },
    { name: 'Push', icon: Bell, color: 'text-primary/70', effectiveness: 0.38 },
    { name: 'In-App', icon: Activity, color: 'text-warning', effectiveness: 0.71 },
  ];

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Channel Effectiveness</h3>
        </div>

        <div className="space-y-4">
          {channels.map((channel, index) => {
            const Icon = channel.icon;
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${channel.color}`} />
                  <span className="font-medium text-foreground">{channel.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        channel.effectiveness > 0.6
                          ? 'bg-success'
                          : channel.effectiveness > 0.4
                            ? 'bg-warning'
                            : 'bg-error'
                      }`}
                      style={{ width: `${channel.effectiveness * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground w-12 text-right">
                    {formatPercentage(channel.effectiveness)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-start space-x-2">
            <TrendingUp className="w-4 h-4 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary">Performance Insight</p>
              <p className="text-xs text-muted-foreground">
                In-app notifications show highest engagement (71%) while SMS has strong conversion (62%). Consider
                increasing in-app notification frequency for better results.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Recovery Timeline Card
interface RecoveryTimelineCardProps {
  analytics: RetryAnalytics;
}

const RecoveryTimelineCard: React.FC<RecoveryTimelineCardProps> = ({ analytics }) => {
  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Recovery Timeline Distribution</h3>
        </div>

        <div className="space-y-4">
          {analytics.timeToRecoveryDistribution.map((bucket, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{bucket.timeBucket}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">{formatNumber(bucket.count)} payments</span>
                  <Badge variant="outline">{formatPercentage(bucket.percentage)}</Badge>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all duration-700"
                  style={{ width: `${bucket.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-start space-x-2">
            <Clock className="w-4 h-4 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary">Recovery Timing Insight</p>
              <p className="text-xs text-muted-foreground">
                {analytics.averageRetriesToRecovery.toFixed(1)} average retries needed for successful recovery. Most
                recoveries happen within 24-72 hours of initial failure.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatPercentage(value: number): string {
  // Value is already a percentage (e.g., 68.5 means 68.5%)
  return `${value.toFixed(1)}%`;
}
