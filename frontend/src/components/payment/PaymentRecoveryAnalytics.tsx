'use client';

import React, { useState, useEffect } from'react';
import { Card } from'../ui/card';
import { Button } from'../ui/button';
import { Badge } from'../ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  BarChart3,
  PieChart,
  RefreshCw,
  AlertCircle,
  Loader2,
} from'lucide-react';
import { usePaymentRecovery } from'../../hooks/usePaymentRecovery';
import { RetryAnalytics, GracePeriodAnalytics } from'../../lib/types/payment';

interface PaymentRecoveryAnalyticsProps {
  className?: string;
  showDatePicker?: boolean;
  defaultDateRange?: number; // Days
}

export const PaymentRecoveryAnalytics: React.FC<PaymentRecoveryAnalyticsProps> = ({
  className ='',
  showDatePicker = true,
  defaultDateRange = 30,
}) => {
  const { recoveryMetrics, isLoading, error, loadRecoveryMetrics, clearError } = usePaymentRecovery();

  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Load metrics on component mount and when date range changes
  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    loadRecoveryMetrics(startDate, endDate);
  }, [dateRange, loadRecoveryMetrics]);

  const handleCustomDateLoad = () => {
    if (customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      loadRecoveryMetrics(startDate, endDate);
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (isLoading && !recoveryMetrics) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading recovery analytics...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Date Controls */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-info" />
              <h2 className="text-xl font-semibold text-foreground">Payment Recovery Analytics</h2>
            </div>

            {showDatePicker && (
              <div className="flex items-center space-x-3">
                <select
                  value={dateRange}
                  onChange={e => setDateRange(Number(e.target.value))}
                  className="px-3 py-1 border border-border rounded-md text-sm bg-background"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={365}>Last year</option>
                </select>

                <Button variant="outline" size="sm" onClick={() => loadRecoveryMetrics()} disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Refresh
                </Button>
              </div>
            )}
          </div>

          {/* Custom Date Range */}
          {showDatePicker && (
            <div className="flex items-center space-x-3 text-sm">
              <span className="text-muted-foreground">Custom range:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="px-2 py-1 border border-border rounded text-sm bg-background"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-2 py-1 border border-border rounded text-sm bg-background"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCustomDateLoad}
                disabled={!customStartDate || !customEndDate}
              >
                Load
              </Button>
            </div>
          )}

          {recoveryMetrics && (
            <div className="mt-4 text-sm text-muted-foreground">
              <span>
                Showing data from {new Date(recoveryMetrics.period.start).toLocaleDateString()} to{''}
                {new Date(recoveryMetrics.period.end).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Analytics Error</p>
                  <p className="text-sm text-destructive/80">{error}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Analytics Cards */}
      {recoveryMetrics && (
        <>
          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Failed Payments"
              value={formatNumber(recoveryMetrics.retry_analytics.totalFailedPayments)}
              icon={<AlertCircle className="w-5 h-5 text-destructive" />}
              trend={null}
              className="border-destructive/30"
            />

            <MetricCard
              title="Recovery Rate"
              value={formatPercentage(recoveryMetrics.retry_analytics.recoveryRate)}
              icon={<TrendingUp className="w-5 h-5 text-success" />}
              trend={recoveryMetrics.retry_analytics.recoveryRate > 0.5 ?'positive' :'negative'}
              className="border-success/30"
            />

            <MetricCard
              title="Average Retries"
              value={recoveryMetrics.retry_analytics.averageRetriesToRecovery.toFixed(1)}
              icon={<RefreshCw className="w-5 h-5 text-info" />}
              trend={null}
              className="border-info/30"
            />

            <MetricCard
              title="Active Grace Periods"
              value={formatNumber(recoveryMetrics.grace_period_analytics.activeGracePeriods)}
              icon={<Clock className="w-5 h-5 text-warning" />}
              trend={null}
              className="border-warning/30"
            />
          </div>

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Retry Analytics */}
            <PaymentRetryAnalyticsCard analytics={recoveryMetrics.retry_analytics} />

            {/* Grace Period Analytics */}
            <GracePeriodAnalyticsCard analytics={recoveryMetrics.grace_period_analytics} />
          </div>

          {/* Failure Reasons and Recovery Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Failure Reasons */}
            <Card>
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <PieChart className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Top Failure Reasons</h3>
                </div>

                <div className="space-y-3">
                  {recoveryMetrics.retry_analytics.topFailureReasons.map((reason, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{reason.reason.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatNumber(reason.count)} ({formatPercentage(reason.percentage / 100)})
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${reason.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Retry Method Effectiveness */}
            <Card>
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Activity className="w-5 h-5 text-info" />
                  <h3 className="font-semibold text-foreground">Retry Method Effectiveness</h3>
                </div>

                <div className="space-y-3">
                  {recoveryMetrics.retry_analytics.retryMethodEffectiveness.map((method, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{method.method.replace(/_/g, ' ')}</span>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-info/10 text-info">
                            {formatPercentage(method.successRate)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{method.averageTime.toFixed(1)}h avg</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted/50 rounded-full h-1.5">
                        <div
                          className="bg-info h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${method.successRate * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?:'positive' |'negative' | null;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, trend, className ='' }) => {
  const trendIcon =
    trend ==='positive' ? (
      <TrendingUp className="w-4 h-4 text-success" />
    ) : trend ==='negative' ? (
      <TrendingDown className="w-4 h-4 text-destructive" />
    ) : null;

  return (
    <Card className={className}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
          <div className="flex items-center space-x-2">
            {icon}
            {trendIcon}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Payment Retry Analytics Card
interface PaymentRetryAnalyticsCardProps {
  analytics: RetryAnalytics;
}

const PaymentRetryAnalyticsCard: React.FC<PaymentRetryAnalyticsCardProps> = ({ analytics }) => {
  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <RefreshCw className="w-5 h-5 text-info" />
          <h3 className="font-semibold text-foreground">Payment Recovery Performance</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-info/10 rounded-lg">
            <div className="text-2xl font-bold text-info">
              {formatNumber(analytics.successfulRecoveries)}
            </div>
            <div className="text-sm text-info/80">Successful Recoveries</div>
          </div>

          <div className="text-center p-4 bg-success/10 rounded-lg">
            <div className="text-2xl font-bold text-success">
              {formatPercentage(analytics.recoveryRate)}
            </div>
            <div className="text-sm text-success/80">Recovery Rate</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground mb-2">Recovery Time Distribution</h4>
            <div className="space-y-2">
              {analytics.timeToRecoveryDistribution.map((bucket, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{bucket.timeBucket}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className="bg-info h-2 rounded-full transition-all duration-300"
                        style={{ width: `${bucket.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">{formatNumber(bucket.count)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Grace Period Analytics Card
interface GracePeriodAnalyticsCardProps {
  analytics: GracePeriodAnalytics;
}

const GracePeriodAnalyticsCard: React.FC<GracePeriodAnalyticsCardProps> = ({ analytics }) => {
  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="w-5 h-5 text-warning" />
          <h3 className="font-semibold text-foreground">Grace Period Analytics</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-warning/10 rounded-lg">
            <div className="text-2xl font-bold text-warning">
              {analytics.averageGracePeriodDuration.toFixed(1)}
            </div>
            <div className="text-sm text-warning/80">Avg Duration (days)</div>
          </div>

          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {formatPercentage(analytics.gracePeriodResolutionRate)}
            </div>
            <div className="text-sm text-primary/80">Resolution Rate</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 border border-border rounded-lg">
            <div className="font-semibold text-foreground">{analytics.activeGracePeriods}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="text-center p-3 border border-border rounded-lg">
            <div className="font-semibold text-foreground">{analytics.resolvedGracePeriods}</div>
            <div className="text-xs text-muted-foreground">Resolved</div>
          </div>
          <div className="text-center p-3 border border-border rounded-lg">
            <div className="font-semibold text-foreground">{analytics.expiredGracePeriods}</div>
            <div className="text-xs text-muted-foreground">Expired</div>
          </div>
        </div>

        {/* Top End Reasons */}
        <div>
          <h4 className="font-medium text-foreground mb-2">Grace Period End Reasons</h4>
          <div className="space-y-2">
            {analytics.topEndReasons.slice(0, 5).map((reason, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{reason.reason.replace(/_/g, ' ')}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-muted rounded-full h-1.5">
                    <div className="bg-warning h-1.5 rounded-full" style={{ width: `${reason.percentage}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{reason.count}</span>
                </div>
              </div>
            ))}
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
  return `${(value * 100).toFixed(1)}%`;
}
