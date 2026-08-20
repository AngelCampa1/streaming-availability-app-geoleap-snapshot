'use client';

import React, { useState, useEffect } from 'react';
import { designTokens } from '@/lib/design-tokens';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Star,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Interfaces (same as main component)
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
}

interface SupportDashboardDto {
  overview: SupportMetricsOverview;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  topPerformers: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trends: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categoryBreakdown: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  channelDistribution: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slaMetrics: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customerSatisfaction: any;
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
}

const CustomerSupportAnalyticsMobile: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<SupportDashboardDto | null>(null);
  const [realtimeData, setRealtimeData] = useState<RealtimeMetricsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    trends: false,
    agents: false,
    categories: false,
    satisfaction: false,
  });

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Fetch data functions (same as main component but optimized for mobile)
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // SECURITY: Use credentials: 'include' for cookie-based auth
      const response = await fetch('/api/customersupportanalytics/dashboard', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtimeData = async () => {
    try {
      // SECURITY: Use credentials: 'include' for cookie-based auth
      const response = await fetch('/api/customersupportanalytics/realtime', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
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
  };

  useEffect(() => {
    fetchDashboardData();
    fetchRealtimeData();
  }, []);

  // Auto-refresh realtime data
  useEffect(() => {
    const interval = setInterval(fetchRealtimeData, 60000); // Refresh every minute for mobile
    return () => clearInterval(interval);
  }, []);

  // Format duration for mobile display
  const formatDuration = (timeString: string): string => {
    if (!timeString) return '0m';

    const parts = timeString.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    }

    return timeString;
  };

  // Compact metric card for mobile
  const MobileMetricCard: React.FC<{
    title: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
    color?: string;
  }> = ({ title, value, change, icon, color = 'bg-primary' }) => (
    <div className="bg-card rounded-lg shadow-sm p-4 border border-border">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-1">
              {change > 0 ? (
                <TrendingUp className="w-3 h-3 text-success mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 text-error mr-1" />
              )}
              <span className={`text-xs ${change > 0 ? 'text-success' : 'text-error'}`}>
                {Math.abs(change).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-2 rounded-full ${color} text-primary-foreground`}>{icon}</div>
      </div>
    </div>
  );

  // Expandable section component
  const MobileSection: React.FC<{
    title: string;
    id: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
  }> = ({ title, id, children, defaultExpanded = false }) => {
    const isExpanded = expandedSections[id] ?? defaultExpanded;

    return (
      <div className="bg-card rounded-lg shadow-sm border border-border mb-4">
        <button
          onClick={() => toggleSection(id)}
          className="w-full px-4 py-3 flex items-center justify-between text-left"
        >
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
        {isExpanded && <div className="px-4 pb-4">{children}</div>}
      </div>
    );
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/10 border border-error rounded-md p-4 m-4">
        <h3 className="text-lg font-medium text-error">Error Loading Analytics</h3>
        <p className="text-error/80 mt-2">{error}</p>
        <button
          onClick={() => {
            fetchDashboardData();
            fetchRealtimeData();
          }}
          className="mt-3 bg-error text-error-foreground px-4 py-2 rounded-full hover:bg-error/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 bg-muted min-h-screen">
      {/* Mobile Header */}
      <div className="bg-card rounded-lg shadow-sm p-4 border border-border">
        <h1 className="text-xl font-bold text-foreground">Support Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Customer support metrics</p>

        {/* Quick Refresh Button */}
        <button
          onClick={() => {
            fetchDashboardData();
            fetchRealtimeData();
          }}
          className="mt-3 flex items-center justify-center w-full bg-primary text-primary-foreground py-2 px-4 rounded-full text-sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </button>
      </div>

      {/* Real-time Status Bar */}
      {realtimeData && (
        <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-primary-foreground/80 text-xs">Active Tickets</p>
              <p className="text-xl font-bold">{realtimeData.activeTickets}</p>
            </div>
            <div>
              <p className="text-primary-foreground/80 text-xs">In Queue</p>
              <p className="text-xl font-bold">{realtimeData.ticketsInQueue}</p>
            </div>
            <div>
              <p className="text-primary-foreground/80 text-xs">Available Agents</p>
              <p className="text-xl font-bold">{realtimeData.availableAgents}</p>
            </div>
            <div>
              <p className="text-primary-foreground/80 text-xs">Last Hour</p>
              <p className="text-xl font-bold">+{realtimeData.ticketsCreatedLastHour}</p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Overview */}
      <MobileSection title="Key Metrics" id="overview" defaultExpanded={true}>
        {dashboardData?.overview && (
          <div className="grid grid-cols-2 gap-3">
            <MobileMetricCard
              title="Today's Tickets"
              value={dashboardData.overview.totalTicketsToday}
              change={dashboardData.overview.ticketVolumeChange}
              icon={<MessageSquare className="w-4 h-4" />}
              color="bg-primary"
            />

            <MobileMetricCard
              title="Open Tickets"
              value={dashboardData.overview.openTickets}
              icon={<AlertTriangle className="w-4 h-4" />}
              color="bg-warning"
            />

            <MobileMetricCard
              title="Resolution Rate"
              value={`${dashboardData.overview.resolutionRate.toFixed(1)}%`}
              icon={<CheckCircle className="w-4 h-4" />}
              color="bg-success"
            />

            <MobileMetricCard
              title="Avg Response"
              value={formatDuration(dashboardData.overview.averageResponseTime)}
              icon={<Clock className="w-4 h-4" />}
              color="bg-accent"
            />

            <MobileMetricCard
              title="Satisfaction"
              value={`${dashboardData.overview.customerSatisfactionScore.toFixed(1)}/5`}
              icon={<Star className="w-4 h-4" />}
              color="bg-warning"
            />

            <MobileMetricCard
              title="SLA Compliance"
              value={`${dashboardData.overview.slaComplianceRate.toFixed(1)}%`}
              icon={<CheckCircle className="w-4 h-4" />}
              color="bg-success"
            />
          </div>
        )}
      </MobileSection>

      {/* Support Trends */}
      <MobileSection title="Ticket Trends" id="trends">
        {dashboardData?.trends && dashboardData.trends.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboardData.trends.slice(-7)}>
                {' '}
                {/* Show last 7 days for mobile */}
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="totalTickets" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Total" />
                <Line type="monotone" dataKey="resolvedTickets" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </MobileSection>

      {/* Top Agents */}
      <MobileSection title="Top Agents" id="agents">
        {dashboardData?.topPerformers && dashboardData.topPerformers.length > 0 && (
          <div className="space-y-3">
            {dashboardData.topPerformers.slice(0, 5).map((agent) => (
              <div key={agent.agentId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">{agent.agentName}</p>
                  <p className="text-xs text-muted-foreground">
                    {agent.ticketsHandled} tickets • {agent.resolutionRate.toFixed(1)}% resolved
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      agent.performanceGrade === 'A'
                        ? 'bg-success/10 text-success'
                        : agent.performanceGrade === 'B'
                          ? 'bg-primary/10 text-primary'
                          : agent.performanceGrade === 'C'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-error/10 text-error'
                    }`}
                  >
                    {agent.performanceGrade}
                  </span>
                  <div className="flex items-center">
                    <Star className="w-3 h-3 text-warning" />
                    <span className="text-xs ml-1">{agent.customerSatisfactionScore.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </MobileSection>

      {/* Category Breakdown */}
      <MobileSection title="Categories" id="categories">
        {dashboardData?.categoryBreakdown && dashboardData.categoryBreakdown.length > 0 && (
          <div>
            <div className="h-48 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.categoryBreakdown.slice(0, 5)} // Top 5 for mobile
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill={designTokens.brand.primary[500]}
                    dataKey="ticketCount"
                  >
                    {dashboardData.categoryBreakdown.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {dashboardData.categoryBreakdown.slice(0, 5).map((category, index) => (
                <div key={category.category} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="font-medium">{category.category}</span>
                  </div>
                  <span className="text-muted-foreground">{category.ticketCount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </MobileSection>

      {/* Customer Satisfaction */}
      <MobileSection title="Satisfaction" id="satisfaction">
        {dashboardData?.customerSatisfaction && (
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">
                {dashboardData.customerSatisfaction.overallScore.toFixed(1)}/5
              </p>
              <p className="text-sm text-muted-foreground">Overall Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">
                {dashboardData.customerSatisfaction.positiveResponses}
              </p>
              <p className="text-sm text-muted-foreground">Positive</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">
                {dashboardData.customerSatisfaction.neutralResponses}
              </p>
              <p className="text-sm text-muted-foreground">Neutral</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-error">{dashboardData.customerSatisfaction.negativeResponses}</p>
              <p className="text-sm text-muted-foreground">Negative</p>
            </div>
          </div>
        )}
      </MobileSection>
    </div>
  );
};

export default CustomerSupportAnalyticsMobile;
