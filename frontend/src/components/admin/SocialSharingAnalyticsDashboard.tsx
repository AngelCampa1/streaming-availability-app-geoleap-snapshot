'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert } from '../ui/alert';
import { Separator as _Separator } from '../ui/separator';
import {
  Share2,
  TrendingUp,
  MousePointer,
  UserPlus,
  Target,
  Globe,
  RefreshCw,
  Download,
  AlertTriangle,
  Calendar,
  Filter,
  Activity,
  BarChart3,
  Zap,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';

// Types for social sharing analytics data
interface _SocialShareEvent {
  id: string;
  contentType: string;
  contentTitle: string;
  platform: string;
  shareMethod: string;
  isSuccessful: boolean;
  deviceType: string;
  createdAt: string;
}

interface ViralMetrics {
  metricDate: string;
  platform: string;
  totalShares: number;
  totalClicks: number;
  totalRegistrations: number;
  viralCoefficient: number;
  shareToClickRate: number;
  clickToRegistrationRate: number;
  averageSharesPerUser: number;
}

interface ContentPerformance {
  contentId: string;
  contentTitle: string;
  contentType: string;
  totalShares: number;
  totalClicks: number;
  shareVelocity: number;
  topSharingPlatform: string;
  engagementRate: number;
}

interface AbTestResult {
  testName: string;
  variantName: string;
  participants: number;
  shares: number;
  clicks: number;
  conversions: number;
  shareRate: number;
  clickThroughRate: number;
  conversionRate: number;
  statisticalSignificance: number;
}

interface RealTimeMetrics {
  today_shares: number;
  today_clicks: number;
  today_registrations: number;
  viral_coefficient: number;
  share_to_click_rate: number;
  click_to_registration_rate: number;
  '30_day_shares': number;
  '30_day_users': number;
  '30_day_new_users': number;
}

interface DashboardFilters {
  dateRange: number;
  startDate?: string;
  endDate?: string;
  platform?: string;
  contentType?: string;
  deviceType?: string;
  metricType: 'daily' | 'weekly' | 'monthly';
}

interface SocialSharingAnalyticsDashboardProps {
  className?: string;
  isExecutiveView?: boolean;
}

// Helper functions
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

const _calculateGrowthTrend = (current: number, previous: number) => {
  if (previous === 0) return { percentage: 0, direction: 'stable' as const };
  const percentage = ((current - previous) / previous) * 100;
  const direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'stable';
  return { percentage: Math.abs(percentage), direction };
};

// KPI Card Component
const KPICard: React.FC<{
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}> = ({ title, value, change, icon, trend, className = '' }) => {
  const trendIcon =
    trend === 'up' ? (
      <ArrowUpRight className="w-4 h-4 text-success" />
    ) : trend === 'down' ? (
      <ArrowDownRight className="w-4 h-4 text-destructive" />
    ) : null;

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="text-3xl font-bold text-foreground mt-1">{value}</div>
          {change !== undefined && (
            <div
              className={`flex items-center mt-2 ${
                trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {trendIcon}
              <span className="text-sm font-medium ml-1">{change.toFixed(1)}%</span>
              <span className="text-xs text-muted-foreground ml-2">vs last period</span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0">{icon}</div>
      </div>
    </Card>
  );
};

// Platform Performance Card
interface PlatformData {
  TotalShares: number;
  SuccessRate: number;
}

const PlatformPerformanceCard: React.FC<{
  platformData: Record<string, PlatformData>;
}> = ({ platformData }) => {
  const platformIcons: Record<string, React.ReactNode> = {
    facebook: <div className="w-4 h-4 bg-primary rounded" />,
    twitter: <div className="w-4 h-4 bg-accent rounded" />,
    instagram: <div className="w-4 h-4 bg-gradient-to-r from-primary to-accent rounded" />,
    linkedin: <div className="w-4 h-4 bg-primary rounded" />,
    tiktok: <div className="w-4 h-4 bg-foreground rounded" />,
    whatsapp: <div className="w-4 h-4 bg-success rounded" />,
  };

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Platform Performance</h3>
      </div>

      <div className="space-y-4">
        {Object.entries(platformData).map(([platform, data]) => (
          <div key={platform} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {platformIcons[platform] || <Globe className="w-4 h-4 text-muted-foreground" />}
                <span className="font-medium text-foreground capitalize">{platform}</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-foreground">{formatNumber(data.TotalShares)} shares</div>
                <div className="text-xs text-muted-foreground">{formatPercentage(data.SuccessRate)} success rate</div>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(data.SuccessRate * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// Content Performance Table
const ContentPerformanceTable: React.FC<{
  contentData: ContentPerformance[];
}> = ({ contentData }) => {
  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <TrendingUp className="w-5 h-5 text-success" />
        <h3 className="text-lg font-semibold text-foreground">Top Shared Content</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Content</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Shares</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Clicks</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Velocity</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Top Platform</th>
            </tr>
          </thead>
          <tbody>
            {contentData.slice(0, 10).map((content, _index) => (
              <tr key={content.contentId} className="border-b hover:bg-muted/50">
                <td className="py-3 px-2">
                  <div>
                    <div className="font-medium text-foreground truncate max-w-xs">{content.contentTitle}</div>
                    <div className="text-xs text-muted-foreground capitalize">{content.contentType}</div>
                  </div>
                </td>
                <td className="py-3 px-2 text-right font-medium">{formatNumber(content.totalShares)}</td>
                <td className="py-3 px-2 text-right">{formatNumber(content.totalClicks)}</td>
                <td className="py-3 px-2 text-right">
                  <Badge variant="outline" className="text-xs">
                    {content.shareVelocity.toFixed(1)}/day
                  </Badge>
                </td>
                <td className="py-3 px-2 text-right">
                  <span className="capitalize text-sm text-muted-foreground">{content.topSharingPlatform}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// Conversion Funnel Visualization
const ConversionFunnelCard: React.FC<{
  funnelData: { total_shares: number; total_clicks: number; total_registrations: number; total_subscriptions: number };
}> = ({ funnelData }) => {
  const funnelSteps = [
    { name: 'Shares', value: funnelData.total_shares, color: 'bg-primary' },
    { name: 'Clicks', value: funnelData.total_clicks, color: 'bg-success' },
    { name: 'Registrations', value: funnelData.total_registrations, color: 'bg-warning' },
    { name: 'Subscriptions', value: funnelData.total_subscriptions, color: 'bg-accent' },
  ];

  const maxValue = funnelSteps[0]?.value || 1;

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Target className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-semibold text-foreground">Conversion Funnel</h3>
      </div>

      <div className="space-y-4">
        {funnelSteps.map((step, index) => {
          const widthPercent = (step.value / maxValue) * 100;
          const conversionRate = index > 0 ? (step.value / funnelSteps[index - 1].value) * 100 : 100;

          return (
            <div key={step.name} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">{step.name}</span>
                <div className="text-right">
                  <span className="text-sm font-semibold">{formatNumber(step.value)}</span>
                  {index > 0 && <div className="text-xs text-muted-foreground">{conversionRate.toFixed(1)}% conversion</div>}
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${step.color} transition-all duration-1000`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// A/B Test Results Card
const AbTestResultsCard: React.FC<{
  abTestData: AbTestResult[];
}> = ({ abTestData }) => {
  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Activity className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">A/B Test Results</h3>
      </div>

      <div className="space-y-4">
        {abTestData.map((test, _index) => (
          <div key={`${test.testName}-${test.variantName}`} className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-foreground">{test.testName}</h4>
                <p className="text-sm text-muted-foreground">Variant: {test.variantName}</p>
              </div>
              <Badge
                variant={test.statisticalSignificance > 0.95 ? 'default' : 'outline'}
                className={test.statisticalSignificance > 0.95 ? 'bg-success/20 text-success' : ''}
              >
                {formatPercentage(test.statisticalSignificance)} confidence
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-foreground">{test.participants}</div>
                <div className="text-xs text-muted-foreground">Participants</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">{formatPercentage(test.shareRate)}</div>
                <div className="text-xs text-muted-foreground">Share Rate</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">{formatPercentage(test.clickThroughRate)}</div>
                <div className="text-xs text-muted-foreground">CTR</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">{formatPercentage(test.conversionRate)}</div>
                <div className="text-xs text-muted-foreground">Conversion</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// Main Dashboard Component
export const SocialSharingAnalyticsDashboard: React.FC<SocialSharingAnalyticsDashboardProps> = ({
  className = '',
  isExecutiveView = false,
}) => {
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [_viralMetrics, _setViralMetrics] = useState<ViralMetrics[]>([]);
  const [contentPerformance, setContentPerformance] = useState<ContentPerformance[]>([]);
  const [platformPerformance, setPlatformPerformance] = useState<Record<string, PlatformData>>({});
  const [conversionFunnel, setConversionFunnel] = useState<{ total_shares: number; total_clicks: number; total_registrations: number; total_subscriptions: number } | null>(null);
  const [abTestResults, setAbTestResults] = useState<AbTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: 30,
    metricType: 'daily',
  });

  // Load dashboard data
  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load all analytics data in parallel
      const [realTimeResponse, contentResponse, platformResponse, funnelResponse, abTestResponse] = await Promise.all([
        fetch('/api/social-sharing/analytics/dashboard/real-time'),
        fetch('/api/social-sharing/analytics/content-performance'),
        fetch('/api/social-sharing/analytics/platform-performance'),
        fetch('/api/social-sharing/analytics/conversion-funnel'),
        fetch('/api/social-sharing/analytics/ab-tests'),
      ]);

      if (!realTimeResponse.ok) throw new Error('Failed to load real-time metrics');

      const realTimeData = await realTimeResponse.json();
      setRealTimeMetrics(realTimeData.RealTimeMetrics);

      if (contentResponse.ok) {
        const contentData = await contentResponse.json();
        setContentPerformance(contentData.ContentPerformance || []);
      }

      if (platformResponse.ok) {
        const platformData = await platformResponse.json();
        setPlatformPerformance(platformData.PlatformPerformance || {});
      }

      if (funnelResponse.ok) {
        const funnelData = await funnelResponse.json();
        setConversionFunnel(funnelData.ConversionFunnel || { total_shares: 0, total_clicks: 0, total_registrations: 0, total_subscriptions: 0 });
      }

      if (abTestResponse.ok) {
        const abTestData = await abTestResponse.json();
        setAbTestResults(abTestData.AbTestResults || []);
      }
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

  // Export dashboard data
  const exportDashboardData = async () => {
    try {
      const response = await fetch('/api/social-sharing/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: new Date(Date.now() - filters.dateRange * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          format: 'CSV',
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `social-sharing-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export dashboard data.');
    }
  };

  if (isLoading && !realTimeMetrics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading social sharing analytics...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard Header */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Share2 className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {isExecutiveView ? 'Social Sharing Analytics' : 'Viral Growth Dashboard'}
                </h1>
                <p className="text-sm text-muted-foreground">Real-time social sharing performance and growth metrics</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Last updated: {new Date().toLocaleString()}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-success/10 border-success' : ''}
              >
                <Zap className={`w-4 h-4 mr-2 ${autoRefresh ? 'text-success' : 'text-muted-foreground'}`} />
                Auto Refresh
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={exportDashboardData}
                disabled={!realTimeMetrics || isLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              <Button variant="outline" size="sm" onClick={loadDashboardData} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
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
                className="px-3 py-1 border border-border rounded-md text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filters.metricType}
                onChange={e => setFilters({ ...filters, metricType: e.target.value as 'daily' | 'weekly' | 'monthly' })}
                className="px-3 py-1 border border-border rounded-md text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <div className="text-destructive">
            <p className="font-medium">Dashboard Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setError(null)}
            className="mt-2 text-destructive border-destructive"
          >
            Dismiss
          </Button>
        </Alert>
      )}

      {/* Real-time KPI Cards */}
      {realTimeMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Today's Shares"
            value={formatNumber(realTimeMetrics.today_shares)}
            icon={<Share2 className="w-6 h-6 text-primary" />}
            className="border-primary/20"
          />

          <KPICard
            title="Viral Coefficient"
            value={realTimeMetrics.viral_coefficient.toFixed(3)}
            icon={<TrendingUp className="w-6 h-6 text-success" />}
            className="border-success/20"
          />

          <KPICard
            title="Click-through Rate"
            value={formatPercentage(realTimeMetrics.share_to_click_rate)}
            icon={<MousePointer className="w-6 h-6 text-accent" />}
            className="border-accent/20"
          />

          <KPICard
            title="Conversion Rate"
            value={formatPercentage(realTimeMetrics.click_to_registration_rate)}
            icon={<UserPlus className="w-6 h-6 text-warning" />}
            className="border-warning/20"
          />
        </div>
      )}

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Platform Performance */}
        {Object.keys(platformPerformance).length > 0 && <PlatformPerformanceCard platformData={platformPerformance} />}

        {/* Conversion Funnel */}
        {conversionFunnel && Object.keys(conversionFunnel).length > 0 && <ConversionFunnelCard funnelData={conversionFunnel} />}
      </div>

      {/* Content Performance */}
      {contentPerformance.length > 0 && <ContentPerformanceTable contentData={contentPerformance} />}

      {/* A/B Test Results */}
      {abTestResults.length > 0 && <AbTestResultsCard abTestData={abTestResults} />}
    </div>
  );
};

export default SocialSharingAnalyticsDashboard;
