'use client';

import React, { useState, useEffect } from'react';
import { Card } from'../ui/card';
import { Button } from'../ui/button';
import { Badge } from'../ui/badge';
import { Alert } from'../ui/alert';
import { Separator as _Separator } from'../ui/separator';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  RefreshCw,
  Calendar,
  Filter,
  Download,
  AlertTriangle,
  Target,
  Zap,
  PieChart,
  Activity,
  Bell,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  UserCheck,
  UserX,
  Minus,
} from'lucide-react';

// Helper functions
function calculateGrowthTrend(current: number, previous: number) {
  if (previous === 0) return { percentage: 0, direction:'stable' as const };
  const percentage = ((current - previous) / previous) * 100;
  const direction = percentage > 0 ?'up' : percentage < 0 ?'down' :'stable';
  return { percentage: Math.abs(percentage), direction };
}

function formatCurrency(value: number, currency ='USD'): string {
  return new Intl.NumberFormat('en-US', {
    style:'currency',
    currency,
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

// Types for subscription analytics data
interface SubscriptionMetrics {
  periodStart: string;
  periodEnd: string;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  averageRevenuePerUser: number;
  customerLifetimeValue: number;
  totalActiveSubscribers: number;
  newSubscribers: number;
  churnedSubscribers: number;
  churnRate: number;
  growthRate: number;
  trialUsers: number;
  trialConversionRate: number;
  totalRevenue: number;
  revenueGrowth: number;
  paymentSuccessRate: number;
  subscriptionsByPlan: Record<string, number>;
  subscriptionsByInterval: Record<string, number>;
  revenueByPlan: Record<string, number>;
  generatedAt: string;
}

interface BusinessInsight {
  title: string;
  description: string;
  type:'RevenueOpportunity' |'ChurnRisk' |'GrowthTrend' |'PaymentOptimization' |'CustomerSegment' |'Competitive';
  priority:'Low' |'Medium' |'High' |'Critical';
  value: number | string;
  trend:'Up' |'Down' |'Stable';
  trendPercentage?: number;
  revenueImpact?: number;
  actionableRecommendations: string[];
  generatedAt: string;
  supportingData: Record<string, unknown>;
}

interface TrendAlert {
  id: string;
  alertType: string;
  severity:'Low' |'Medium' |'High' |'Critical';
  title: string;
  description: string;
  metrics: Record<string, unknown>;
  revenueImpact?: number;
  customerImpact?: number;
  triggeredAt: string;
  isActive: boolean;
  requiresAction: boolean;
  recommendedActions: string[];
}

interface DashboardSummary {
  lastUpdated: string;
  currentPeriodMetrics: SubscriptionMetrics;
  previousPeriodMetrics: SubscriptionMetrics;
  trendAlerts: TrendAlert[];
  keyPerformanceIndicators: Record<string, number>;
  topInsights: BusinessInsight[];
}

interface DashboardFilters {
  dateRange: number;
  startDate?: string;
  endDate?: string;
  groupBy:'daily' |'weekly' |'monthly' |'quarterly';
  comparisonPeriod: boolean;
}

interface SubscriptionAnalyticsDashboardProps {
  className?: string;
  isExecutiveView?: boolean;
}

// PerformanceSummaryCard component
interface PerformanceSummaryCardProps {
  currentMetrics: SubscriptionMetrics;
  previousMetrics: SubscriptionMetrics;
}

const PerformanceSummaryCard: React.FC<PerformanceSummaryCardProps> = ({ currentMetrics, previousMetrics }) => {
  const metrics = [
    {
      label:'New Subscribers',
      current: currentMetrics.newSubscribers,
      previous: previousMetrics.newSubscribers,
      format: formatNumber,
    },
    {
      label:'Churned Subscribers',
      current: currentMetrics.churnedSubscribers,
      previous: previousMetrics.churnedSubscribers,
      format: formatNumber,
      isNegativeBetter: true,
    },
    {
      label:'Total Revenue',
      current: currentMetrics.totalRevenue,
      previous: previousMetrics.totalRevenue,
      format: formatCurrency,
    },
    {
      label:'Revenue Growth',
      current: currentMetrics.revenueGrowth,
      previous: previousMetrics.revenueGrowth,
      format: formatCurrency,
    },
  ];

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center space-x-2 mb-4 sm:mb-6">
        <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Performance Summary</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map((metric, index) => {
          const trend = calculateGrowthTrend(metric.current, metric.previous);
          const isPositiveTrend = metric.isNegativeBetter ? trend.direction ==='down' : trend.direction ==='up';

          return (
            <div key={index} className="p-3 sm:p-4 bg-muted rounded-lg">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">{metric.label}</p>
              <div className="text-lg sm:text-xl font-bold text-foreground">{metric.format(metric.current)}</div>
              <div
                className={`flex items-center mt-1 ${
                  isPositiveTrend ?'text-success' :'text-destructive'
                }`}
              >
                {trend.direction ==='up' ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : trend.direction ==='down' ? (
                  <TrendingDown className="w-3 h-3 mr-1" />
                ) : (
                  <Minus className="w-3 h-3 mr-1" />
                )}
                <span className="text-xs font-medium">{trend.percentage.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ExecutiveKPICard component
interface ExecutiveKPICardProps {
  title: string;
  value: string;
  previousValue: number;
  icon: React.ReactNode;
  className?: string;
  isNegativeBetter?: boolean;
}

const ExecutiveKPICard: React.FC<ExecutiveKPICardProps> = ({
  title,
  value,
  previousValue,
  icon,
  className ='',
  isNegativeBetter = false,
}) => {
  const currentNumeric = parseFloat(value.replace(/[$,%]/g,''));
  const trend = calculateGrowthTrend(currentNumeric, previousValue);

  const isPositiveTrend = isNegativeBetter ? trend.direction ==='down' : trend.direction ==='up';

  const trendIcon =
    trend.direction ==='up' ? (
      <ArrowUpRight className="w-4 h-4" />
    ) : trend.direction ==='down' ? (
      <ArrowDownRight className="w-4 h-4" />
    ) : (
      <Minus className="w-4 h-4" />
    );

  const trendColor = isPositiveTrend ?'text-success' :'text-destructive';

  return (
    <Card className={`p-4 sm:p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
          <div className="text-2xl sm:text-3xl font-bold text-foreground mt-1">{value}</div>
          <div className={`flex items-center mt-2 ${trendColor}`}>
            {trendIcon}
            <span className="text-xs sm:text-sm font-medium ml-1">{trend.percentage.toFixed(1)}%</span>
            <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">vs last period</span>
          </div>
        </div>
        <div className="flex-shrink-0">{icon}</div>
      </div>
    </Card>
  );
};

// MetricCard component
interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon }) => {
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center space-x-2 sm:space-x-3">
        {icon}
        <div>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
          <div className="text-lg sm:text-xl font-bold text-foreground">{value}</div>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </Card>
  );
};

// RevenueBreakdownCard component
interface RevenueBreakdownCardProps {
  revenueByPlan: Record<string, number>;
  subscriptionsByPlan: Record<string, number>;
}

interface PlanData {
  plan: string;
  revenue: number;
  subscribers: number;
  percentage: number;
}

const RevenueBreakdownCard: React.FC<RevenueBreakdownCardProps> = ({ revenueByPlan, subscriptionsByPlan }) => {
  const totalRevenue = Object.values(revenueByPlan).reduce((sum, value) => sum + value, 0);

  const planData: PlanData[] = Object.entries(revenueByPlan)
    .map(([plan, revenue]) => ({
      plan,
      revenue,
      subscribers: subscriptionsByPlan[plan] || 0,
      percentage: (revenue / totalRevenue) * 100,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center space-x-2 mb-4 sm:mb-6">
        <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Revenue by Plan</h3>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {planData.map((item, index) => (
          <div key={item.plan} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)` }}
                />
                <span className="text-sm sm:text-base font-medium text-foreground capitalize">{item.plan.replace('_','')}</span>
              </div>
              <div className="text-right ml-2">
                <div className="text-sm sm:text-base font-semibold text-foreground">{formatCurrency(item.revenue)}</div>
                <div className="text-xs text-muted-foreground hidden sm:block">{formatNumber(item.subscribers)} subscribers</div>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// SubscriptionDistributionCard component
interface SubscriptionDistributionCardProps {
  subscriptionsByPlan: Record<string, number>;
  subscriptionsByInterval: Record<string, number>;
}

const SubscriptionDistributionCard: React.FC<SubscriptionDistributionCardProps> = ({
  subscriptionsByPlan,
  subscriptionsByInterval,
}) => {
  const totalSubs = Object.values(subscriptionsByPlan).reduce((sum, value) => sum + value, 0);

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center space-x-2 mb-4 sm:mb-6">
        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Subscription Distribution</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <h4 className="text-sm sm:text-base font-medium text-foreground mb-2 sm:mb-3">By Plan</h4>
          <div className="space-y-2">
            {Object.entries(subscriptionsByPlan).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground capitalize">{plan.replace('_','')}</span>
                <div className="text-right">
                  <span className="text-sm sm:text-base font-medium">{formatNumber(count)}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({((count / totalSubs) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm sm:text-base font-medium text-foreground mb-2 sm:mb-3">By Interval</h4>
          <div className="space-y-2">
            {Object.entries(subscriptionsByInterval).map(([interval, count]) => (
              <div key={interval} className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground capitalize">{interval}</span>
                <div className="text-right">
                  <span className="text-sm sm:text-base font-medium">{formatNumber(count)}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({((count / totalSubs) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Alerts Section
interface AlertsSectionProps {
  alerts: TrendAlert[];
}

const AlertsSection: React.FC<AlertsSectionProps> = ({ alerts }) => {
  const criticalAlerts = alerts.filter(a => a.severity ==='Critical');
  const otherAlerts = alerts.filter(a => a.severity !=='Critical');

  return (
    <div className="space-y-3 sm:space-y-4">
      {criticalAlerts.length > 0 && (
        <Alert className="border-destructive/20/20 bg-destructive/10/10">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
          <div>
            <h4 className="text-sm sm:text-base font-medium text-destructive">Critical Alerts Requiring Attention</h4>
            <div className="mt-2 space-y-1">
              {criticalAlerts.map(alert => (
                <div key={alert.id} className="text-xs sm:text-sm text-destructive">
                  <span className="font-medium">{alert.title}</span> - {alert.description}
                </div>
              ))}
            </div>
          </div>
        </Alert>
      )}

      {otherAlerts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {otherAlerts.slice(0, 4).map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
};

// Individual Alert Card
interface AlertCardProps {
  alert: TrendAlert;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert }) => {
  const severityColors = {
    Low:'border-primary/20/20 bg-primary/10/10',
    Medium:'border-warning/20/20 bg-warning/10/10',
    High:'border-warning/20/20 bg-warning/10/10',
    Critical:'border-destructive/20/20 bg-destructive/10/10',
  };

  return (
    <Card className={`p-3 sm:p-4 ${severityColors[alert.severity]}`}>
      <div className="flex items-start space-x-2 sm:space-x-3">
        <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 flex-wrap gap-1">
            <h4 className="text-sm sm:text-base font-medium text-foreground">{alert.title}</h4>
            <Badge variant="outline" className="text-xs">
              {alert.severity}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{alert.description}</p>
          {alert.revenueImpact && (
            <p className="text-xs text-muted-foreground mt-1">Revenue Impact: {formatCurrency(alert.revenueImpact)}</p>
          )}
        </div>
      </div>
    </Card>
  );
};

// Business Insights Section
interface BusinessInsightsSectionProps {
  insights: BusinessInsight[];
}

const BusinessInsightsSection: React.FC<BusinessInsightsSectionProps> = ({ insights }) => {
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center space-x-2 mb-4 sm:mb-6">
        <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        <h3 className="text-base sm:text-lg font-semibold text-foreground">AI-Powered Business Insights</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {insights.slice(0, 4).map((insight, index) => (
          <BusinessInsightCard key={index} insight={insight} />
        ))}
      </div>
    </Card>
  );
};

// Business Insight Card
interface BusinessInsightCardProps {
  insight: BusinessInsight;
}

const BusinessInsightCard: React.FC<BusinessInsightCardProps> = ({ insight }) => {
  const priorityColors = {
    Low:'text-muted-foreground',
    Medium:'text-primary',
    High:'text-warning',
    Critical:'text-destructive',
  };

  return (
    <div className="p-3 sm:p-4 border border-border rounded-lg">
      <div className="flex items-start justify-between mb-2 gap-2">
        <h4 className="text-sm sm:text-base font-medium text-foreground">{insight.title}</h4>
        <Badge className={priorityColors[insight.priority]} variant="outline">
          {insight.priority}
        </Badge>
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground mb-3">{insight.description}</p>
      {insight.actionableRecommendations.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Recommended Actions:</p>
          <ul className="space-y-0.5">
            {insight.actionableRecommendations.slice(0, 2).map((action, index) => (
              <li key={index} className="text-xs text-muted-foreground flex items-start">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-1.5 mr-2 flex-shrink-0" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const SubscriptionAnalyticsDashboard: React.FC<SubscriptionAnalyticsDashboardProps> = ({
  className ='',
  isExecutiveView = true,
}) => {
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: 30,
    groupBy:'monthly',
    comparisonPeriod: true,
  });
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load dashboard data
  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // This would call the subscription analytics API endpoints we created
      const response = await fetch('/api/subscription/analytics/dashboard/summary');
      if (!response.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh functionality
  useEffect(() => {
    loadDashboardData();

    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, 300000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [autoRefresh, filters.dateRange]);

  const exportDashboardData = async () => {
    try {
      const response = await fetch('/api/subscription/analytics/export', {
        method:'POST',
        headers: {'Content-Type':'application/json' },
        body: JSON.stringify({
          exportType:'dashboard_summary',
          format:'Excel',
          startDate: dashboardData?.currentPeriodMetrics.periodStart,
          endDate: dashboardData?.currentPeriodMetrics.periodEnd,
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const { exportId } = await response.json();

      // Poll for export completion (simplified)
      setTimeout(() => {
        window.open(`/api/subscription/analytics/export/${exportId}/download`);
      }, 3000);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export dashboard data.');
    }
  };

  if (isLoading && !dashboardData) {
    return (
      <div className={`space-y-4 sm:space-y-6 ${className}`}>
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
            <span className="text-sm sm:text-base">Loading subscription analytics...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* Dashboard Header */}
      <Card>
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-primary  flex-shrink-0" />
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                  {isExecutiveView ?'Executive Dashboard' :'Subscription Analytics'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Real-time subscription performance metrics and insights</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-muted-foreground">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden md:inline">Last updated: {dashboardData ? new Date(dashboardData.lastUpdated).toLocaleString() :'-'}</span>
                <span className="md:hidden">{dashboardData ? new Date(dashboardData.lastUpdated).toLocaleTimeString() :'-'}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`${autoRefresh ?'bg-success/10/10 border-success/20/20' :''} text-xs sm:text-sm`}
                >
                  <Zap
                    className={`w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 ${autoRefresh ?'text-success' :'text-muted-foreground'}`}
                  />
                  <span className="hidden sm:inline">Auto Refresh</span>
                </Button>

                <Button variant="outline" size="sm" onClick={exportDashboardData} disabled={!dashboardData || isLoading} className="text-xs sm:text-sm">
                  <Download className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadDashboardData}
                  disabled={isLoading}
                  aria-label="refresh dashboard data"
                >
                  {isLoading ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />}
                  <span className="hidden sm:inline sm:ml-2">Refresh</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
              <select
                value={filters.dateRange}
                onChange={e => setFilters({ ...filters, dateRange: Number(e.target.value) })}
                className="px-2 sm:px-3 py-1 border border-border rounded-md text-xs sm:text-sm bg-background text-foreground flex-1 sm:flex-initial"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
              <select
                value={filters.groupBy}
                onChange={e =>
                  setFilters({ ...filters, groupBy: e.target.value as'daily' |'weekly' |'monthly' |'quarterly' })
                }
                className="px-2 sm:px-3 py-1 border border-border rounded-md text-xs sm:text-sm bg-background text-foreground flex-1 sm:flex-initial"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="border-destructive/20/20 bg-destructive/10/10">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <div className="text-destructive">
            <p className="text-sm sm:text-base font-medium">Dashboard Error</p>
            <p className="text-xs sm:text-sm">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setError(null)}
            className="mt-2 text-xs sm:text-sm text-destructive  border-destructive/20/30"
          >
            Dismiss
          </Button>
        </Alert>
      )}

      {/* Active Alerts */}
      {dashboardData?.trendAlerts && dashboardData.trendAlerts.length > 0 && (
        <AlertsSection alerts={dashboardData.trendAlerts} />
      )}

      {/* Main Dashboard Content */}
      {dashboardData && dashboardData.currentPeriodMetrics && (
        <>
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <ExecutiveKPICard
              title="Monthly Recurring Revenue"
              value={formatCurrency(dashboardData.currentPeriodMetrics.monthlyRecurringRevenue)}
              previousValue={dashboardData.previousPeriodMetrics?.monthlyRecurringRevenue || 0}
              icon={<DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-success" />}
              className="border-success/20"
            />

            <ExecutiveKPICard
              title="Active Subscribers"
              value={formatNumber(dashboardData.currentPeriodMetrics.totalActiveSubscribers)}
              previousValue={dashboardData.previousPeriodMetrics?.totalActiveSubscribers || 0}
              icon={<Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />}
              className="border-primary/20"
            />

            <ExecutiveKPICard
              title="Churn Rate"
              value={formatPercentage(dashboardData.currentPeriodMetrics.churnRate)}
              previousValue={(dashboardData.previousPeriodMetrics?.churnRate || 0) * 100}
              icon={<UserX className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />}
              className="border-destructive/20"
              isNegativeBetter={true}
            />

            <ExecutiveKPICard
              title="Customer Lifetime Value"
              value={formatCurrency(dashboardData.currentPeriodMetrics.customerLifetimeValue)}
              previousValue={dashboardData.previousPeriodMetrics?.customerLifetimeValue || 0}
              icon={<Target className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />}
              className="border-accent/20"
            />
          </div>

          {/* Secondary Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard
              title="ARPU"
              value={formatCurrency(dashboardData.currentPeriodMetrics.averageRevenuePerUser)}
              subtitle="Average Revenue Per User"
              icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-success" />}
            />

            <MetricCard
              title="Growth Rate"
              value={formatPercentage(dashboardData.currentPeriodMetrics.growthRate)}
              subtitle="Month-over-Month"
              icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success" />}
            />

            <MetricCard
              title="Trial Conversion"
              value={formatPercentage(dashboardData.currentPeriodMetrics.trialConversionRate)}
              subtitle={`${formatNumber(dashboardData.currentPeriodMetrics.trialUsers)} trial users`}
              icon={<UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />}
            />

            <MetricCard
              title="Payment Success"
              value={formatPercentage(dashboardData.currentPeriodMetrics.paymentSuccessRate)}
              subtitle="Transaction Success Rate"
              icon={<CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />}
            />
          </div>

          {/* Charts and Analytics Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Revenue Breakdown */}
            <RevenueBreakdownCard
              revenueByPlan={dashboardData.currentPeriodMetrics.revenueByPlan}
              subscriptionsByPlan={dashboardData.currentPeriodMetrics.subscriptionsByPlan}
            />

            {/* Subscription Distribution */}
            <SubscriptionDistributionCard
              subscriptionsByPlan={dashboardData.currentPeriodMetrics.subscriptionsByPlan}
              subscriptionsByInterval={dashboardData.currentPeriodMetrics.subscriptionsByInterval}
            />
          </div>

          {/* Business Insights */}
          {dashboardData.topInsights && dashboardData.topInsights.length > 0 && (
            <BusinessInsightsSection insights={dashboardData.topInsights} />
          )}

          {/* Performance Summary */}
          <PerformanceSummaryCard
            currentMetrics={dashboardData.currentPeriodMetrics}
            previousMetrics={dashboardData.previousPeriodMetrics}
          />
        </>
      )}
    </div>
  );
};

export default SubscriptionAnalyticsDashboard;
