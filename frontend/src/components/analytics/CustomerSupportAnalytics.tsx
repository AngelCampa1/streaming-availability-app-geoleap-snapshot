'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback } from'react';
import {
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
  Area,
  AreaChart,
} from'recharts';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Star,
  RefreshCw,
  Download,
  Headphones,
  Phone,
  Mail,
  MessageCircle,
} from'lucide-react';

// Type definitions
interface SupportMetricsOverview {
  totalTicketsToday: number;
  openTickets: number;
  resolvedTicketsToday: number;
  resolutionRate: number;
  averageResponseTime: string;
  averageResolutionTime: string;
  customerSatisfactionScore: number;
  slaComplianceRate: number;
  activeAgents: number;
  totalRefundsToday: number;
  ticketVolumeChange: number;
  resolutionTimeChange: number;
  satisfactionChange: number;
}

interface AgentPerformanceDto {
  agentId: string;
  agentName: string;
  agentEmail: string;
  ticketsHandled: number;
  ticketsResolved: number;
  resolutionRate: number;
  averageResponseTime: string;
  averageResolutionTime: string;
  customerSatisfactionScore: number;
  overallPerformanceScore: number;
  performanceGrade: string;
  strengths: string[];
  improvementAreas: string[];
}

interface SupportTrendDto {
  date: string;
  totalTickets: number;
  resolvedTickets: number;
  openTickets: number;
  averageResponseTime: string;
  averageResolutionTime: string;
  customerSatisfactionScore: number;
  slaComplianceRate: number;
}

interface CategoryAnalyticsDto {
  category: string;
  subCategory: string;
  ticketCount: number;
  percentage: number;
  averageResolutionTime: string;
  customerSatisfactionScore: number;
  trendChange: number;
  commonIssues: string[];
}

interface ChannelAnalyticsDto {
  channel: string;
  ticketCount: number;
  percentage: number;
  averageResponseTime: string;
  averageResolutionTime: string;
  customerSatisfactionScore: number;
  efficiencyScore: number;
}

interface SlaMetricsDto {
  overallComplianceRate: number;
  totalTicketsWithSla: number;
  ticketsWithinSla: number;
  slaBreaches: number;
  recentBreaches: any[];
  complianceByPriority: Record<string, number>;
  complianceByCategory: Record<string, number>;
}

interface CustomerSatisfactionDto {
  overallScore: number;
  totalResponses: number;
  positiveResponses: number;
  neutralResponses: number;
  negativeResponses: number;
  trends: any[];
  scoreByCategory: Record<string, number>;
  scoreByChannel: Record<string, number>;
  recentFeedback: any[];
}

interface SupportDashboardDto {
  overview: SupportMetricsOverview;
  topPerformers: AgentPerformanceDto[];
  trends: SupportTrendDto[];
  categoryBreakdown: CategoryAnalyticsDto[];
  channelDistribution: ChannelAnalyticsDto[];
  slaMetrics: SlaMetricsDto;
  customerSatisfaction: CustomerSatisfactionDto;
}

interface RealtimeMetricsDto {
  timestamp: string;
  activeTickets: number;
  ticketsInQueue: number;
  availableAgents: number;
  busyAgents: number;
  averageWaitTime: string;
  ticketsCreatedLastHour: number;
  ticketsResolvedLastHour: number;
  urgentTickets: any[];
  agentStatuses: any[];
}

// Color schemes for charts using theme tokens
const CHART_COLORS = ['hsl(var(--chart-1))','hsl(var(--chart-2))','hsl(var(--chart-3))','hsl(var(--chart-4))','hsl(var(--chart-5))','hsl(var(--accent))',
];

/**
 * Format time duration string to human-readable format
 * Exported for testing purposes
 */
export const formatDuration = (timeString: string): string => {
  if (!timeString) return'0m';

  // Parse duration string (e.g.,"01:30:00" or"PT1H30M")
  const parts = timeString.split(':');
  if (parts.length === 3) {
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  return timeString;
};

/**
 * Format pie chart label with percentage
 * Exported for testing purposes
 * Accepts full recharts LabelListProps object
 */
export const formatPieChartLabel = (props: any): string => {
  const { name, percent } = props;
  return `${name} (${(percent * 100).toFixed(1)}%)`;
};

const CustomerSupportAnalytics: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<SupportDashboardDto | null>(null);
  const [realtimeData, setRealtimeData] = useState<RealtimeMetricsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [timeFrame, setTimeFrame] = useState('daily');
  const [_selectedAgent, _setSelectedAgent] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      // SECURITY: Use credentials:'include' for cookie-based auth
      const response = await fetch(
        `/api/customersupportanalytics/dashboard?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&timeFrame=${timeFrame}`,
        {
          credentials:'include',
          headers: {'Content-Type':'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message :'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [dateRange, timeFrame]);

  // Fetch realtime data
  const fetchRealtimeData = useCallback(async () => {
    try {
      // SECURITY: Use credentials:'include' for cookie-based auth
      const response = await fetch('/api/customersupportanalytics/realtime', {
        credentials:'include',
        headers: {'Content-Type':'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRealtimeData(data);
    } catch (err) {
      console.error('Error fetching realtime data:', err);
    }
  }, []);

  // Export analytics data
  const exportData = async () => {
    try {
      // SECURITY: Use credentials:'include' for cookie-based auth
      const response = await fetch('/api/customersupportanalytics/export', {
        method:'POST',
        credentials:'include',
        headers: {'Content-Type':'application/json',
        },
        body: JSON.stringify({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          timeFrame,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display ='none';
      a.href = url;
      a.download = `support_analytics_${dateRange.startDate}_${dateRange.endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting data:', err);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardData(), fetchRealtimeData()]);
    setRefreshing(false);
  };

  // Initialize data
  useEffect(() => {
    fetchDashboardData();
    fetchRealtimeData();
  }, [fetchDashboardData, fetchRealtimeData]);

  // Auto-refresh realtime data
  useEffect(() => {
    const interval = setInterval(fetchRealtimeData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchRealtimeData]);


  // Format percentage change
  const formatPercentageChange = (change: number): React.ReactElement => {
    const isPositive = change > 0;
    const color = isPositive ?'text-success' :'text-destructive';
    const icon = isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;

    return (
      <div className={`flex items-center ${color}`}>
        {icon}
        <span className="ml-1">{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  };

  // Metric card component
  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
    color?: string;
  }> = ({ title, value, change, icon, color ='bg-primary/10' }) => (
    <div className="bg-card rounded-lg shadow-md p-6 border border-border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {change !== undefined && <div className="mt-2">{formatPercentageChange(change)}</div>}
        </div>
        <div className={`p-3 rounded-full ${color}`}>{icon}</div>
      </div>
    </div>
  );

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive rounded-md p-4">
        <h3 className="text-lg font-medium text-destructive">Error Loading Analytics</h3>
        <p className="text-destructive/80 mt-2">{error}</p>
        <button
          onClick={refreshData}
          className="mt-3 bg-destructive text-destructive-foreground px-4 py-2 rounded-full hover:bg-destructive/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Customer Support Analytics</h1>
          <p className="text-muted-foreground mt-1">Comprehensive support metrics and performance insights</p>
        </div>

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Date Range Selector */}
          <div className="flex space-x-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground"
            />
          </div>

          {/* Time Frame Selector */}
          <select
            value={timeFrame}
            onChange={e => setTimeFrame(e.target.value)}
            className="px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ?'animate-spin' :''}`} />
              Refresh
            </button>

            <button
              onClick={exportData}
              className="flex items-center px-4 py-2 bg-success text-success-foreground rounded-full hover:bg-success/90 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Metrics Banner */}
      {realtimeData && (
        <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-lg p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
            <div>
              <p className="text-primary-foreground/80 text-sm">Active Tickets</p>
              <p className="text-2xl font-bold">{realtimeData.activeTickets}</p>
            </div>
            <div>
              <p className="text-primary-foreground/80 text-sm">In Queue</p>
              <p className="text-2xl font-bold">{realtimeData.ticketsInQueue}</p>
            </div>
            <div>
              <p className="text-primary-foreground/80 text-sm">Available Agents</p>
              <p className="text-2xl font-bold">{realtimeData.availableAgents}</p>
            </div>
            <div>
              <p className="text-primary-foreground/80 text-sm">Busy Agents</p>
              <p className="text-2xl font-bold">{realtimeData.busyAgents}</p>
            </div>
            <div>
              <p className="text-primary-foreground/80 text-sm">Avg Wait Time</p>
              <p className="text-2xl font-bold">{formatDuration(realtimeData.averageWaitTime)}</p>
            </div>
            <div>
              <p className="text-primary-foreground/80 text-sm">Last Hour</p>
              <p className="text-2xl font-bold">
                +{realtimeData.ticketsCreatedLastHour} / -{realtimeData.ticketsResolvedLastHour}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Overview */}
      {dashboardData?.overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Tickets Today"
            value={dashboardData.overview.totalTicketsToday}
            change={dashboardData.overview.ticketVolumeChange}
            icon={<MessageSquare className="w-6 h-6 text-primary" />}
            color="bg-primary/10"
          />

          <MetricCard
            title="Open Tickets"
            value={dashboardData.overview.openTickets}
            icon={<AlertTriangle className="w-6 h-6 text-warning" />}
            color="bg-warning/10"
          />

          <MetricCard
            title="Resolution Rate"
            value={`${dashboardData.overview.resolutionRate.toFixed(1)}%`}
            icon={<CheckCircle className="w-6 h-6 text-success" />}
            color="bg-success/10"
          />

          <MetricCard
            title="Avg Response Time"
            value={formatDuration(dashboardData.overview.averageResponseTime)}
            change={dashboardData.overview.resolutionTimeChange}
            icon={<Clock className="w-6 h-6 text-accent" />}
            color="bg-accent/10"
          />

          <MetricCard
            title="Customer Satisfaction"
            value={`${dashboardData.overview.customerSatisfactionScore.toFixed(1)}/5`}
            change={dashboardData.overview.satisfactionChange}
            icon={<Star className="w-6 h-6 text-warning" />}
            color="bg-warning/10"
          />

          <MetricCard
            title="SLA Compliance"
            value={`${dashboardData.overview.slaComplianceRate.toFixed(1)}%`}
            icon={<CheckCircle className="w-6 h-6 text-success" />}
            color="bg-success/10"
          />

          <MetricCard
            title="Active Agents"
            value={dashboardData.overview.activeAgents}
            icon={<Users className="w-6 h-6 text-primary" />}
            color="bg-primary/10"
          />

          <MetricCard
            title="Refunds Today"
            value={`$${dashboardData.overview.totalRefundsToday.toFixed(2)}`}
            icon={<RefreshCw className="w-6 h-6 text-destructive" />}
            color="bg-destructive/10"
          />
        </div>
      )}

      {/* Support Trends Chart */}
      {dashboardData?.trends && dashboardData.trends.length > 0 && (
        <div className="bg-card rounded-lg shadow-md p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Support Volume Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardData.trends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor:'hsl(var(--card))',
                    border:'1px solid hsl(var(--border))',
                    borderRadius:'0.5rem',
                    color:'hsl(var(--foreground))',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="totalTickets"
                  stackId="1"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.6}
                  name="Total Tickets"
                />
                <Area
                  type="monotone"
                  dataKey="resolvedTickets"
                  stackId="2"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.6}
                  name="Resolved Tickets"
                />
                <Area
                  type="monotone"
                  dataKey="openTickets"
                  stackId="3"
                  stroke="hsl(var(--chart-3))"
                  fill="hsl(var(--chart-3))"
                  fillOpacity={0.6}
                  name="Open Tickets"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        {dashboardData?.categoryBreakdown && dashboardData.categoryBreakdown.length > 0 && (
          <div className="bg-card rounded-lg shadow-md p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Tickets by Category</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="ticketCount"
                    label={formatPieChartLabel}
                  >
                    {dashboardData.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor:'hsl(var(--card))',
                      border:'1px solid hsl(var(--border))',
                      borderRadius:'0.5rem',
                      color:'hsl(var(--foreground))',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Channel Distribution */}
        {dashboardData?.channelDistribution && dashboardData.channelDistribution.length > 0 && (
          <div className="bg-card rounded-lg shadow-md p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Tickets by Channel</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.channelDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="channel" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor:'hsl(var(--card))',
                      border:'1px solid hsl(var(--border))',
                      borderRadius:'0.5rem',
                      color:'hsl(var(--foreground))',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="ticketCount" fill="hsl(var(--chart-1))" name="Ticket Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Channel icons and stats */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              {dashboardData.channelDistribution.map((channel) => (
                <div key={channel.channel} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center">
                    {channel.channel ==='email' && <Mail className="w-5 h-5 text-primary mr-2" />}
                    {channel.channel ==='chat' && <MessageCircle className="w-5 h-5 text-success mr-2" />}
                    {channel.channel ==='phone' && <Phone className="w-5 h-5 text-warning mr-2" />}
                    {channel.channel ==='self_service' && <Headphones className="w-5 h-5 text-accent mr-2" />}
                    <span className="font-medium capitalize">{channel.channel.replace('_','')}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{channel.ticketCount}</p>
                    <p className="text-sm text-muted-foreground">{channel.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top Performers */}
      {dashboardData?.topPerformers && dashboardData.topPerformers.length > 0 && (
        <div className="bg-card rounded-lg shadow-md p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Top Performing Agents</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Tickets Handled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Resolution Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Avg Response Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Satisfaction Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {dashboardData.topPerformers.slice(0, 10).map(agent => (
                  <tr key={agent.agentId} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-foreground">{agent.agentName}</div>
                        <div className="text-sm text-muted-foreground">{agent.agentEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{agent.ticketsHandled}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {agent.resolutionRate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {formatDuration(agent.averageResponseTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-warning mr-1" />
                        {agent.customerSatisfactionScore.toFixed(1)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          agent.performanceGrade ==='A'
                            ?'bg-success/10 text-success'
                            : agent.performanceGrade ==='B'
                              ?'bg-primary/10 text-primary'
                              : agent.performanceGrade ==='C'
                                ?'bg-warning/10 text-warning'
                                :'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {agent.performanceGrade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SLA Metrics */}
      {dashboardData?.slaMetrics && (
        <div className="bg-card rounded-lg shadow-md p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">SLA Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-success">
                {dashboardData.slaMetrics.overallComplianceRate.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Overall Compliance</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{dashboardData.slaMetrics.ticketsWithinSla}</p>
              <p className="text-sm text-muted-foreground">Within SLA</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">{dashboardData.slaMetrics.slaBreaches}</p>
              <p className="text-sm text-muted-foreground">SLA Breaches</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{dashboardData.slaMetrics.totalTicketsWithSla}</p>
              <p className="text-sm text-muted-foreground">Total Tickets</p>
            </div>
          </div>
        </div>
      )}

      {/* Customer Satisfaction */}
      {dashboardData?.customerSatisfaction && (
        <div className="bg-card rounded-lg shadow-md p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Customer Satisfaction</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-warning">
                {dashboardData.customerSatisfaction.overallScore?.toFixed(1) ??'N/A'}/5
              </p>
              <p className="text-sm text-muted-foreground">Overall Score</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-success">
                {dashboardData.customerSatisfaction.positiveResponses ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Positive (4-5)</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-warning">
                {dashboardData.customerSatisfaction.neutralResponses ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Neutral (3)</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">{dashboardData.customerSatisfaction.negativeResponses ?? 0}</p>
              <p className="text-sm text-muted-foreground">Negative (1-2)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSupportAnalytics;
