'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  RefreshCw,
  Calendar as CalendarIcon,
  Download,
  AlertTriangle,
  Target,
  Monitor,
  Eye,
  Search,
  FileText,
  Loader2,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { format } from 'date-fns';

// Types for Analytics Data
interface BusinessAnalyticsDashboard {
  timeFrame: {
    startDate: string;
    endDate: string;
    period: string;
  };
  userMetrics: {
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
    trialUsers: number;
    paidUsers: number;
    userRetentionRate: number;
    trialConversionRate: number;
    userGrowthRate: number;
  };
  contentMetrics: {
    totalContentItems: number;
    newContentAdded: number;
    totalSearches: number;
    averageSearchResults: number;
    contentUtilizationRate: number;
    searchSuccessRate: number;
  };
  systemHealth: {
    systemUptime: number;
    averageResponseTime: number;
    errorRate: number;
    databaseConnectionsActive: number;
    cacheHitRate: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    requestsPerSecond: number;
    overallHealthStatus: string;
  };
  financialMetrics: {
    monthlyRecurringRevenue: number;
    annualRecurringRevenue: number;
    totalRevenue: number;
    transactionCount: number;
    averageTransactionValue: number;
    churnRate: number;
    customerLifetimeValue: number;
    revenueGrowthRate: number;
  };
  engagementMetrics: {
    totalSessions: number;
    averageSessionDuration: number;
    totalPageViews: number;
    bounceRate: number;
    userEngagementScore: number;
    sessionsPerUser: number;
    pagesPerSession: number;
  };
  conversionFunnel: {
    visitors: number;
    signups: number;
    trialsStarted: number;
    paidConversions: number;
    conversionRates: Record<string, number>;
    overallConversionRate: number;
  };
  lastUpdated: string;
}

interface AnalyticsExportRequest {
  exportType: string;
  startDate?: Date;
  endDate?: Date;
  format: string;
  includeFields: string[];
}

const BusinessAnalyticsDashboard: React.FC = () => {
  // State management
  const [dashboardData, setDashboardData] = useState<BusinessAnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('last30days');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [_exportLoading, setExportLoading] = useState(false);

  // Predefined timeframe options
  const timeframeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'last90days', label: 'Last 90 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' },
  ];

  // UNIFIED COLOR SYSTEM - Stream Violet palette chart colors
  // See docs/UNIFIED_COLOR_SYSTEM.md
  const _chartColors = {
    primary: '#7c3aed',   // Stream Violet 500
    secondary: '#10b981', // Stream Green 500
    accent: '#f59e0b',    // Golden Popcorn 500
    warning: '#ef4444',   // Alert Red 500
    info: '#06b6d4',      // Electric Cyan 500
    success: '#10b981',   // Stream Green 500
  };

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (selectedTimeframe === 'custom' && customDateRange.start && customDateRange.end) {
        params.set('startDate', customDateRange.start.toISOString());
        params.set('endDate', customDateRange.end.toISOString());
      } else {
        params.set('timeframe', selectedTimeframe);
      }

      // SECURITY: Use credentials: 'include' for cookie-based auth instead of localStorage tokens
      const response = await fetch(`/api/business/analytics/dashboard?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      const data = await response.json();
      setDashboardData(data);
      setLastRefresh(new Date());
    } catch (err) {
       
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [selectedTimeframe, customDateRange]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 300000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchDashboardData]);

  // Initial data load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Export data to CSV
  const handleExport = async (exportType: string) => {
    setExportLoading(true);

    try {
      const exportRequest: AnalyticsExportRequest = {
        exportType,
        format: 'csv',
        includeFields: [],
        ...(selectedTimeframe === 'custom' &&
          customDateRange.start &&
          customDateRange.end && {
            startDate: customDateRange.start,
            endDate: customDateRange.end,
          }),
      };

      // SECURITY: Use credentials: 'include' for cookie-based auth instead of localStorage tokens
      const response = await fetch('/api/business/analytics/export', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportRequest),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${exportType}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
       
      console.error('Export error:', err);
      setError('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  // Format number with proper units
  const formatNumber = (num: number, type: 'currency' | 'percentage' | 'number' = 'number') => {
    if (type === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(num);
    }
    if (type === 'percentage') {
      return `${num.toFixed(1)}%`;
    }
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Get trend indicator
  const _getTrendIndicator = (current: number, previous: number) => {
    if (current > previous) return { icon: ArrowUp, color: 'text-success', trend: 'up' };
    if (current < previous) return { icon: ArrowDown, color: 'text-error', trend: 'down' };
    return { icon: Minus, color: 'text-muted-foreground', trend: 'flat' };
  };

  // Render metric card
  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: number;
    trendType?: 'up' | 'down' | 'flat';
    description?: string;
    color?: string;
  }> = ({ title, value, icon, trend, trendType, description, color = 'blue' }) => (
    <Card data-testid={`metric-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium" data-testid="metric-title">
          {title}
        </CardTitle>
        <div className={`h-4 w-4 text-${color}-600`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid="metric-value">
          {value}
        </div>
        {trend !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground">
            {trendType === 'up' && <ArrowUp className="mr-1 h-3 w-3 text-success" />}
            {trendType === 'down' && <ArrowDown className="mr-1 h-3 w-3 text-error" />}
            {trendType === 'flat' && <Minus className="mr-1 h-3 w-3 text-muted-foreground" />}
            <span
              className={
                trendType === 'up' ? 'text-success' : trendType === 'down' ? 'text-error' : 'text-muted-foreground'
              }
            >
              {Math.abs(trend)}% from last period
            </span>
          </div>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-error mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">Error Loading Dashboard</p>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchDashboardData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into user engagement, content performance, and system health
          </p>
        </div>

        <div className="flex items-center space-x-2 mt-4 lg:mt-0">
          {/* Auto Refresh Toggle */}
          <Button variant={autoRefresh ? 'default' : 'outline'} size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
            <Activity className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
            Auto Refresh
          </Button>

          {/* Manual Refresh */}
          <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* Export Dropdown */}
          <Select onValueChange={value => handleExport(value)}>
            <SelectTrigger className="w-32">
              <Download className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="users">Users CSV</SelectItem>
              <SelectItem value="content">Content CSV</SelectItem>
              <SelectItem value="financial">Financial CSV</SelectItem>
              <SelectItem value="system">System CSV</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Time Range Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Time Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-48">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeframeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedTimeframe === 'custom' && (
              <div className="flex items-center space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      {customDateRange.start ? format(customDateRange.start, 'MMM d, yyyy') : 'Start Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customDateRange.start || undefined}
                      onSelect={date => setCustomDateRange(prev => ({ ...prev, start: date || null }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <span>to</span>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      {customDateRange.end ? format(customDateRange.end, 'MMM d, yyyy') : 'End Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customDateRange.end || undefined}
                      onSelect={date => setCustomDateRange(prev => ({ ...prev, end: date || null }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <Badge variant="outline">Last updated: {format(lastRefresh, 'MMM d, h:mm a')}</Badge>
          </div>
        </CardContent>
      </Card>

      {dashboardData && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Users"
                value={formatNumber(dashboardData.userMetrics.totalUsers)}
                icon={<Users className="h-4 w-4" />}
                description="Registered users"
              />
              <MetricCard
                title="Monthly Revenue"
                value={formatNumber(dashboardData.financialMetrics.monthlyRecurringRevenue, 'currency')}
                icon={<DollarSign className="h-4 w-4" />}
                color="green"
                description="MRR this period"
              />
              <MetricCard
                title="System Uptime"
                value={formatNumber(dashboardData.systemHealth.systemUptime, 'percentage')}
                icon={<Activity className="h-4 w-4" />}
                color="blue"
                description="Last 24 hours"
              />
              <MetricCard
                title="Content Items"
                value={formatNumber(dashboardData.contentMetrics.totalContentItems)}
                icon={<FileText className="h-4 w-4" />}
                color="purple"
                description="Available content"
              />
            </div>

            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>User journey from visitor to paid customer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-info">
                      {formatNumber(dashboardData.conversionFunnel.visitors)}
                    </div>
                    <div className="text-sm text-muted-foreground">Visitors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">
                      {formatNumber(dashboardData.conversionFunnel.signups)}
                    </div>
                    <div className="text-sm text-muted-foreground">Signups</div>
                    <div className="text-xs text-success">
                      {formatNumber(dashboardData.conversionFunnel.conversionRates.signup_rate || 0, 'percentage')}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-warning">
                      {formatNumber(dashboardData.conversionFunnel.trialsStarted)}
                    </div>
                    <div className="text-sm text-muted-foreground">Trials</div>
                    <div className="text-xs text-warning">
                      {formatNumber(dashboardData.conversionFunnel.conversionRates.trial_rate || 0, 'percentage')}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {formatNumber(dashboardData.conversionFunnel.paidConversions)}
                    </div>
                    <div className="text-sm text-muted-foreground">Paid</div>
                    <div className="text-xs text-primary">
                      {formatNumber(dashboardData.conversionFunnel.conversionRates.conversion_rate || 0, 'percentage')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Health Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Health Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        dashboardData.systemHealth.overallHealthStatus === 'Healthy'
                          ? 'bg-success'
                          : dashboardData.systemHealth.overallHealthStatus === 'Warning'
                            ? 'bg-warning'
                            : 'bg-destructive'
                      }`}
                    />
                    <span className="text-sm font-medium">{dashboardData.systemHealth.overallHealthStatus}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Response Time: </span>
                    <span className="font-medium">{dashboardData.systemHealth.averageResponseTime.toFixed(1)}ms</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Error Rate: </span>
                    <span className="font-medium">
                      {formatNumber(dashboardData.systemHealth.errorRate * 100, 'percentage')}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Cache Hit: </span>
                    <span className="font-medium">
                      {formatNumber(dashboardData.systemHealth.cacheHitRate, 'percentage')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCard
                title="New Users"
                value={formatNumber(dashboardData.userMetrics.newUsers)}
                icon={<Users className="h-4 w-4" />}
                trend={dashboardData.userMetrics.userGrowthRate}
                trendType={dashboardData.userMetrics.userGrowthRate > 0 ? 'up' : 'down'}
              />
              <MetricCard
                title="Active Users"
                value={formatNumber(dashboardData.userMetrics.activeUsers)}
                icon={<Activity className="h-4 w-4" />}
                color="green"
              />
              <MetricCard
                title="Trial Conversion"
                value={formatNumber(dashboardData.userMetrics.trialConversionRate, 'percentage')}
                icon={<Target className="h-4 w-4" />}
                color="purple"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>User Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">Subscription Types</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Trial Users</span>
                        <span className="font-medium">{formatNumber(dashboardData.userMetrics.trialUsers)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Paid Users</span>
                        <span className="font-medium">{formatNumber(dashboardData.userMetrics.paidUsers)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-4">Engagement</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Retention Rate</span>
                        <span className="font-medium">
                          {formatNumber(dashboardData.userMetrics.userRetentionRate, 'percentage')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sessions per User</span>
                        <span className="font-medium">
                          {dashboardData.engagementMetrics.sessionsPerUser.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCard
                title="Total Searches"
                value={formatNumber(dashboardData.contentMetrics.totalSearches)}
                icon={<Search className="h-4 w-4" />}
              />
              <MetricCard
                title="Content Utilization"
                value={formatNumber(dashboardData.contentMetrics.contentUtilizationRate, 'percentage')}
                icon={<Eye className="h-4 w-4" />}
                color="blue"
              />
              <MetricCard
                title="Search Success Rate"
                value={formatNumber(dashboardData.contentMetrics.searchSuccessRate, 'percentage')}
                icon={<Target className="h-4 w-4" />}
                color="green"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Content Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">Content Stats</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Items</span>
                        <span className="font-medium">
                          {formatNumber(dashboardData.contentMetrics.totalContentItems)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>New Added</span>
                        <span className="font-medium">
                          {formatNumber(dashboardData.contentMetrics.newContentAdded)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-4">Search Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Avg Results</span>
                        <span className="font-medium">
                          {dashboardData.contentMetrics.averageSearchResults.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Searches</span>
                        <span className="font-medium">{formatNumber(dashboardData.contentMetrics.totalSearches)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCard
                title="Monthly Recurring Revenue"
                value={formatNumber(dashboardData.financialMetrics.monthlyRecurringRevenue, 'currency')}
                icon={<DollarSign className="h-4 w-4" />}
                color="green"
              />
              <MetricCard
                title="Annual Recurring Revenue"
                value={formatNumber(dashboardData.financialMetrics.annualRecurringRevenue, 'currency')}
                icon={<TrendingUp className="h-4 w-4" />}
                color="blue"
              />
              <MetricCard
                title="Customer LTV"
                value={formatNumber(dashboardData.financialMetrics.customerLifetimeValue, 'currency')}
                icon={<Target className="h-4 w-4" />}
                color="purple"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Financial Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">Revenue Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Revenue</span>
                        <span className="font-medium">
                          {formatNumber(dashboardData.financialMetrics.totalRevenue, 'currency')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transactions</span>
                        <span className="font-medium">
                          {formatNumber(dashboardData.financialMetrics.transactionCount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Transaction</span>
                        <span className="font-medium">
                          {formatNumber(dashboardData.financialMetrics.averageTransactionValue, 'currency')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-4">Customer Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Churn Rate</span>
                        <span className="font-medium">
                          {formatNumber(dashboardData.financialMetrics.churnRate, 'percentage')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Growth Rate</span>
                        <span className="font-medium">
                          {formatNumber(dashboardData.financialMetrics.revenueGrowthRate, 'percentage')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="CPU Usage"
                value={formatNumber(dashboardData.systemHealth.cpuUsage, 'percentage')}
                icon={<Monitor className="h-4 w-4" />}
                color={dashboardData.systemHealth.cpuUsage > 80 ? 'red' : 'blue'}
              />
              <MetricCard
                title="Memory Usage"
                value={formatNumber(dashboardData.systemHealth.memoryUsage, 'percentage')}
                icon={<Activity className="h-4 w-4" />}
                color={dashboardData.systemHealth.memoryUsage > 80 ? 'red' : 'green'}
              />
              <MetricCard
                title="Active Connections"
                value={formatNumber(dashboardData.systemHealth.activeConnections)}
                icon={<Users className="h-4 w-4" />}
              />
              <MetricCard
                title="Requests/Sec"
                value={dashboardData.systemHealth.requestsPerSecond.toFixed(1)}
                icon={<TrendingUp className="h-4 w-4" />}
                color="purple"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>System Performance Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">Performance</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Response Time</span>
                        <span className="font-medium">
                          {dashboardData.systemHealth.averageResponseTime.toFixed(1)}ms
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Error Rate</span>
                        <span className="font-medium">
                          {formatNumber(dashboardData.systemHealth.errorRate * 100, 'percentage')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cache Hit Rate</span>
                        <span className="font-medium">
                          {formatNumber(dashboardData.systemHealth.cacheHitRate, 'percentage')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-4">Infrastructure</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>System Uptime</span>
                        <span className="font-medium">
                          {formatNumber(dashboardData.systemHealth.systemUptime, 'percentage')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>DB Connections</span>
                        <span className="font-medium">
                          {formatNumber(dashboardData.systemHealth.databaseConnectionsActive)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default BusinessAnalyticsDashboard;
