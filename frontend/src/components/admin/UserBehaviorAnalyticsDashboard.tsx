'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Activity,
  Users,
  Clock,
  Eye,
  TrendingDown,
  RefreshCw,
  Download,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  BarChart3,
  Zap,
  Target,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';

// TypeScript interfaces for user behavior data
interface UserBehaviorOverview {
  totalUsers: number;
  totalSessions: number;
  totalPageViews: number;
  avgSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  totalInteractions: number;
  avgScrollDepth: number;
}

interface PagePerformanceMetric {
  pageUrl: string;
  pageTitle: string;
  views: number;
  uniqueViews: number;
  avgTimeOnPage: number;
  bounceRate: number;
  exitRate: number;
  conversionRate: number;
  interactions: number;
}

interface DeviceMetric {
  deviceType: string;
  users: number;
  sessions: number;
  percentage: number;
  avgSessionDuration: number;
  bounceRate: number;
}

interface GeographicMetric {
  country: string;
  countryName: string;
  users: number;
  sessions: number;
  percentage: number;
  avgSessionDuration: number;
}

interface InteractionHotspot {
  pageUrl: string;
  elementSelector: string;
  elementText: string;
  clicks: number;
  clickRate: number;
  avgMouseX: number;
  avgMouseY: number;
}

interface RealTimeUserBehavior {
  activeUsers: number;
  activeSessions: number;
  livePageViews: LivePageView[];
  recentActions: RecentUserAction[];
  currentConversionRate: number;
  trendingPage: string;
}

interface LivePageView {
  pageUrl: string;
  pageTitle: string;
  activeUsers: number;
  lastActivity: string;
}

interface RecentUserAction {
  actionType: string;
  pageUrl: string;
  description: string;
  timestamp: string;
  userType: string;
}

interface UserBehaviorDashboard {
  periodStart: string;
  periodEnd: string;
  overview: UserBehaviorOverview;
  topPages: PagePerformanceMetric[];
  commonUserPaths: UserPathStep[];
  deviceBreakdown: DeviceMetric[];
  geographicBreakdown: GeographicMetric[];
  hotspots: InteractionHotspot[];
}

interface UserPathStep {
  fromPage: string;
  toPage: string;
  count: number;
  percentage: number;
}

interface UserBehaviorAnalyticsDashboardProps {
  className?: string;
  deviceType?: 'desktop' | 'tablet' | 'mobile';
  refreshInterval?: number;
  showRealTime?: boolean;
}

// Helper functions
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function calculateTrend(current: number, previous: number) {
  if (previous === 0) return { percentage: 0, direction: 'stable' as const };
  const percentage = ((current - previous) / previous) * 100;
  const direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'stable';
  return { percentage: Math.abs(percentage), direction };
}

function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

const UserBehaviorAnalyticsDashboard: React.FC<UserBehaviorAnalyticsDashboardProps> = ({
  className = '',
  deviceType: _deviceType = 'desktop',
  refreshInterval = 30000, // 30 seconds
  showRealTime = true,
}) => {
  const [dashboardData, setDashboardData] = useState<UserBehaviorDashboard | null>(null);
  const [realTimeData, setRealTimeData] = useState<RealTimeUserBehavior | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'pages']));
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // API base URL
  const API_BASE = '/api/UserBehaviorAnalytics';

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // SECURITY: Use cookie-based authentication instead of localStorage tokens
      const response = await fetch(`${API_BASE}/dashboard?timeRange=${selectedTimeRange}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }

      const data = await response.json();
      setDashboardData(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch user behavior data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTimeRange]);

  // Fetch real-time data
  const fetchRealTimeData = useCallback(async () => {
    if (!showRealTime) return;

    try {
      // SECURITY: Use cookie-based authentication instead of localStorage tokens
      const response = await fetch(`${API_BASE}/realtime`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRealTimeData(data);
      }
    } catch (err) {
      console.error('Failed to fetch real-time data:', err);
    }
  }, [showRealTime]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboardData();
      fetchRealTimeData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchDashboardData, fetchRealTimeData]);

  // Real-time data refresh
  useEffect(() => {
    if (showRealTime) {
      fetchRealTimeData();
      const realTimeInterval = setInterval(fetchRealTimeData, 10000); // Every 10 seconds
      return () => clearInterval(realTimeInterval);
    }
  }, [showRealTime, fetchRealTimeData]);

  // Handle section expand/collapse
  const toggleSection = useCallback(
    (sectionId: string) => {
      const newExpanded = new Set(expandedSections);
      if (newExpanded.has(sectionId)) {
        newExpanded.delete(sectionId);
      } else {
        newExpanded.add(sectionId);
      }
      setExpandedSections(newExpanded);
    },
    [expandedSections]
  );

  // Export data
  const handleExport = useCallback(async () => {
    try {
      // SECURITY: Use cookie-based authentication instead of localStorage tokens
      const response = await fetch(`${API_BASE}/export?timeRange=${selectedTimeRange}&format=excel`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-behavior-analytics-${selectedTimeRange}-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export data');
    }
  }, [selectedTimeRange]);

  // Render overview cards
  const renderOverviewCards = () => {
    if (!dashboardData?.overview) return null;

    const { overview } = dashboardData;
    const cards = [
      {
        title: 'Total Users',
        value: formatCompactNumber(overview.totalUsers),
        icon: <Users className="w-5 h-5" />,
        trend: calculateTrend(overview.totalUsers, overview.totalUsers * 0.9), // Mock previous data
        color: 'blue',
      },
      {
        title: 'Total Sessions',
        value: formatCompactNumber(overview.totalSessions),
        icon: <Activity className="w-5 h-5" />,
        trend: calculateTrend(overview.totalSessions, overview.totalSessions * 0.85),
        color: 'green',
      },
      {
        title: 'Page Views',
        value: formatCompactNumber(overview.totalPageViews),
        icon: <Eye className="w-5 h-5" />,
        trend: calculateTrend(overview.totalPageViews, overview.totalPageViews * 1.1),
        color: 'purple',
      },
      {
        title: 'Avg Session Duration',
        value: formatDuration(overview.avgSessionDuration),
        icon: <Clock className="w-5 h-5" />,
        trend: calculateTrend(overview.avgSessionDuration, overview.avgSessionDuration * 0.95),
        color: 'orange',
      },
      {
        title: 'Bounce Rate',
        value: formatPercentage(overview.bounceRate),
        icon: <TrendingDown className="w-5 h-5" />,
        trend: calculateTrend(overview.bounceRate, overview.bounceRate * 1.05),
        color: 'red',
        invertTrend: true,
      },
      {
        title: 'Conversion Rate',
        value: formatPercentage(overview.conversionRate),
        icon: <Target className="w-5 h-5" />,
        trend: calculateTrend(overview.conversionRate, overview.conversionRate * 0.92),
        color: 'emerald',
      },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, index) => {
          const TrendIcon =
            card.trend.direction === 'up' ? ArrowUpRight : card.trend.direction === 'down' ? ArrowDownRight : Minus;
          const trendColor = card.invertTrend
            ? card.trend.direction === 'up'
              ? 'text-destructive'
              : card.trend.direction === 'down'
                ? 'text-success'
                : 'text-muted-foreground'
            : card.trend.direction === 'up'
              ? 'text-success'
              : card.trend.direction === 'down'
                ? 'text-destructive'
                : 'text-muted-foreground';

          return (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-${card.color}-100 text-${card.color}-600`}>{card.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-foreground-muted">{card.title}</p>
                    <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  </div>
                </div>
                <div className={`flex items-center space-x-1 ${trendColor}`}>
                  <TrendIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{card.trend.percentage.toFixed(1)}%</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  // Render real-time section
  const renderRealTimeSection = () => {
    if (!showRealTime || !realTimeData) return null;

    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center">
            <Zap className="w-5 h-5 mr-2 text-warning" />
            Real-Time Activity
          </h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-success/10 rounded-full animate-pulse"></div>
            <span className="text-sm text-success">Live</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{realTimeData.activeUsers}</p>
            <p className="text-sm text-foreground-muted">Active Users</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">{realTimeData.activeSessions}</p>
            <p className="text-sm text-foreground-muted">Active Sessions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">{formatPercentage(realTimeData.currentConversionRate)}</p>
            <p className="text-sm text-foreground-muted">Current Conversion</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-foreground mb-3">Live Page Views</h4>
            <div className="space-y-2">
              {realTimeData.livePageViews.slice(0, 5).map((page, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{page.pageTitle || page.pageUrl}</p>
                    <p className="text-xs text-muted-foreground truncate">{page.pageUrl}</p>
                  </div>
                  <Badge variant="outline">{page.activeUsers} users</Badge>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-3">Recent Actions</h4>
            <div className="space-y-2">
              {realTimeData.recentActions.slice(0, 5).map((action, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 bg-muted rounded-lg">
                  <div className="w-2 h-2 bg-primary/10 rounded-full"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{action.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(action.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {action.userType}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  // Render top pages section
  const renderTopPagesSection = () => {
    if (!dashboardData?.topPages?.length) return null;

    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-primary" />
            Top Performing Pages
          </h3>
          <Button variant="ghost" size="sm" onClick={() => toggleSection('pages')}>
            {expandedSections.has('pages') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>

        {expandedSections.has('pages') && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-medium text-foreground-muted">Page</th>
                  <th className="text-right p-2 font-medium text-foreground-muted">Views</th>
                  <th className="text-right p-2 font-medium text-foreground-muted">Unique Views</th>
                  <th className="text-right p-2 font-medium text-foreground-muted">Avg Time</th>
                  <th className="text-right p-2 font-medium text-foreground-muted">Bounce Rate</th>
                  <th className="text-right p-2 font-medium text-foreground-muted">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.topPages.slice(0, 10).map((page, index) => (
                  <tr key={index} className="border-b border-border hover:bg-muted">
                    <td className="p-2">
                      <div>
                        <p className="font-medium text-foreground truncate" title={page.pageTitle}>
                          {page.pageTitle || page.pageUrl}
                        </p>
                        <p className="text-xs text-muted-foreground truncate" title={page.pageUrl}>
                          {page.pageUrl}
                        </p>
                      </div>
                    </td>
                    <td className="text-right p-2 text-foreground">{formatCompactNumber(page.views)}</td>
                    <td className="text-right p-2 text-foreground">{formatCompactNumber(page.uniqueViews)}</td>
                    <td className="text-right p-2 text-foreground">{formatDuration(page.avgTimeOnPage)}</td>
                    <td className="text-right p-2">
                      <span
                        className={`${page.bounceRate > 70 ? 'text-destructive' : page.bounceRate > 50 ? 'text-warning' : 'text-success'}`}
                      >
                        {formatPercentage(page.bounceRate)}
                      </span>
                    </td>
                    <td className="text-right p-2">
                      <span
                        className={`${page.conversionRate > 5 ? 'text-success' : page.conversionRate > 2 ? 'text-warning' : 'text-destructive'}`}
                      >
                        {formatPercentage(page.conversionRate)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    );
  };

  // Render device breakdown
  const renderDeviceBreakdown = () => {
    if (!dashboardData?.deviceBreakdown?.length) return null;

    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Monitor className="w-5 h-5 mr-2 text-accent" />
          Device Breakdown
        </h3>
        <div className="space-y-4">
          {dashboardData.deviceBreakdown.map((device, index) => {
            const getDeviceIcon = (type: string) => {
              switch (type.toLowerCase()) {
                case 'mobile':
                  return <Smartphone className="w-4 h-4" />;
                case 'tablet':
                  return <Tablet className="w-4 h-4" />;
                default:
                  return <Monitor className="w-4 h-4" />;
              }
            };

            return (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-background rounded-lg">{getDeviceIcon(device.deviceType)}</div>
                  <div>
                    <p className="font-medium text-foreground capitalize">{device.deviceType}</p>
                    <p className="text-sm text-foreground-muted">{formatCompactNumber(device.users)} users</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">{formatPercentage(device.percentage)}</p>
                  <p className="text-sm text-foreground-muted">{formatDuration(device.avgSessionDuration)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  // Render geographic breakdown
  const renderGeographicBreakdown = () => {
    if (!dashboardData?.geographicBreakdown?.length) return null;

    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2 text-success" />
          Geographic Distribution
        </h3>
        <div className="space-y-3">
          {dashboardData.geographicBreakdown.slice(0, 8).map((country, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium">{country.country}</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{country.countryName}</p>
                  <p className="text-sm text-foreground-muted">{formatCompactNumber(country.users)} users</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-foreground">{formatPercentage(country.percentage)}</p>
                <p className="text-sm text-foreground-muted">{formatDuration(country.avgSessionDuration)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  if (isLoading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
          <span className="text-foreground-muted">Loading user behavior analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-background rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">User Behavior Analytics</h1>
              <p className="text-foreground-muted">Comprehensive user interaction and behavior insights</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Time Range Selector */}
            <select
              value={selectedTimeRange}
              onChange={e => setSelectedTimeRange(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>

            {/* Auto Refresh Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-success/10 text-success' : 'text-muted-foreground'}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Auto Refresh
            </Button>

            {/* Manual Refresh */}
            <Button variant="ghost" size="sm" onClick={fetchDashboardData} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {/* Export */}
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Last updated: {lastRefresh.toLocaleString()}
          {autoRefresh && <span className="ml-2">(Auto-refresh enabled)</span>}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-destructive mr-2" />
            <span className="text-destructive">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto text-destructive">
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Real-Time Section */}
      {renderRealTimeSection()}

      {/* Overview Cards */}
      {renderOverviewCards()}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Pages - Full Width on Mobile, 2/3 on Desktop */}
        <div className="lg:col-span-2">{renderTopPagesSection()}</div>

        {/* Side Panels */}
        <div className="space-y-6">
          {renderDeviceBreakdown()}
          {renderGeographicBreakdown()}
        </div>
      </div>
    </div>
  );
};

export default UserBehaviorAnalyticsDashboard;
