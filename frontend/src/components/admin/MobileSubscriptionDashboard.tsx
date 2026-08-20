'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert } from '../ui/alert';
import {
  BarChart3,
  Users,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  Menu,
  X,
  Eye,
  Bell,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  ChevronDown,
  Activity,
  Target,
  CreditCard,
  UserCheck,
  UserX,
  Smartphone,
  Tablet,
} from 'lucide-react';

// Mobile-optimized interfaces
interface MobileMetric {
  id: string;
  title: string;
  value: string;
  previousValue: number;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'red' | 'purple' | 'orange' | 'yellow';
  priority: 'high' | 'medium' | 'low';
  change: number;
  isPositiveBetter?: boolean;
}

interface MobileAlert {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  value: string;
  change?: number;
  timestamp: string;
}

interface MobileDashboardProps {
  className?: string;
  deviceType?: 'mobile' | 'tablet';
  showOnlyPriority?: boolean;
}

const MobileSubscriptionDashboard: React.FC<MobileDashboardProps> = ({
  className = '',
  deviceType = 'mobile',
  showOnlyPriority = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MobileMetric[]>([]);
  const [alerts, setAlerts] = useState<MobileAlert[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['metrics']));
  const [refreshTime, setRefreshTime] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hiddenMetrics, setHiddenMetrics] = useState<Set<string>>(new Set());
  const [internalShowOnlyPriority, setShowOnlyPriority] = useState(showOnlyPriority);

  // Simulate loading dashboard data
  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // In real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data optimized for mobile display
      const mockMetrics: MobileMetric[] = [
        {
          id: 'mrr',
          title: 'MRR',
          value: '$89,432',
          previousValue: 84231,
          icon: <DollarSign className="w-5 h-5" />,
          color: 'green',
          priority: 'high',
          change: 6.2,
          isPositiveBetter: true,
        },
        {
          id: 'subscribers',
          title: 'Active Subscribers',
          value: '2,847',
          previousValue: 2698,
          icon: <Users className="w-5 h-5" />,
          color: 'blue',
          priority: 'high',
          change: 5.5,
          isPositiveBetter: true,
        },
        {
          id: 'churn',
          title: 'Churn Rate',
          value: '3.2%',
          previousValue: 4.1,
          icon: <UserX className="w-5 h-5" />,
          color: 'red',
          priority: 'high',
          change: -22.0,
          isPositiveBetter: false,
        },
        {
          id: 'ltv',
          title: 'Customer LTV',
          value: '$847',
          previousValue: 823,
          icon: <Target className="w-5 h-5" />,
          color: 'purple',
          priority: 'high',
          change: 2.9,
          isPositiveBetter: true,
        },
        {
          id: 'arpu',
          title: 'ARPU',
          value: '$31.42',
          previousValue: 29.87,
          icon: <DollarSign className="w-4 h-4" />,
          color: 'green',
          priority: 'medium',
          change: 5.2,
          isPositiveBetter: true,
        },
        {
          id: 'trial_conversion',
          title: 'Trial Conversion',
          value: '18.5%',
          previousValue: 16.2,
          icon: <UserCheck className="w-4 h-4" />,
          color: 'blue',
          priority: 'medium',
          change: 14.2,
          isPositiveBetter: true,
        },
        {
          id: 'payment_success',
          title: 'Payment Success',
          value: '97.8%',
          previousValue: 96.4,
          icon: <CreditCard className="w-4 h-4" />,
          color: 'green',
          priority: 'medium',
          change: 1.5,
          isPositiveBetter: true,
        },
      ];

      const mockAlerts: MobileAlert[] = [
        {
          id: 'revenue_spike',
          title: 'Revenue Growth Accelerating',
          severity: 'high',
          value: '+$12k this week',
          change: 15.8,
          timestamp: '2 hours ago',
        },
        {
          id: 'trial_drop',
          title: 'Trial Sign-ups Declining',
          severity: 'medium',
          value: '-18% vs last week',
          change: -18,
          timestamp: '6 hours ago',
        },
      ];

      setMetrics(mockMetrics);
      setAlerts(mockAlerts);
      setRefreshTime(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh functionality
  useEffect(() => {
    loadDashboardData();

    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, 60000); // 1 minute
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Toggle metric visibility
  const toggleMetricVisibility = (metricId: string) => {
    const newHidden = new Set(hiddenMetrics);
    if (newHidden.has(metricId)) {
      newHidden.delete(metricId);
    } else {
      newHidden.add(metricId);
    }
    setHiddenMetrics(newHidden);
  };

  // Filter metrics based on priority and visibility
  const getVisibleMetrics = () => {
    let filteredMetrics = metrics.filter(m => !hiddenMetrics.has(m.id));
    if (internalShowOnlyPriority) {
      filteredMetrics = filteredMetrics.filter(m => m.priority === 'high');
    }
    return filteredMetrics;
  };

  // Color mapping
  const _getColorClasses = (color: string, variant: 'bg' | 'text' | 'border' = 'text') => {
    const colorMap = {
      green: {
        bg: 'bg-success/10 border-success/20',
        text: 'text-success',
        border: 'border-success/20',
      },
      blue: {
        bg: 'bg-primary/10 border-primary/20',
        text: 'text-primary',
        border: 'border-primary/20',
      },
      red: {
        bg: 'bg-destructive/10 border-destructive/20',
        text: 'text-destructive',
        border: 'border-destructive/20',
      },
      purple: {
        bg: 'bg-accent/10 border-accent/20',
        text: 'text-accent',
        border: 'border-accent/20',
      },
      orange: {
        bg: 'bg-warning/10 border-warning/20',
        text: 'text-warning',
        border: 'border-warning/20',
      },
      yellow: {
        bg: 'bg-warning/10 border-warning/20',
        text: 'text-warning',
        border: 'border-warning/20',
      },
    };
    return colorMap[color as keyof typeof colorMap]?.[variant] || colorMap.blue[variant];
  };

  const formatPercentageChange = (change: number) => {
    const isPositive = change > 0;
    return (
      <div className={`flex items-center space-x-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        <span className="text-xs font-medium">{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-muted ${className}`}>
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-primary" />
            <div>
              <h1 className="font-semibold text-foreground">
                {deviceType === 'tablet' ? 'Executive Dashboard' : 'Analytics'}
              </h1>
              <p className="text-xs text-muted-foreground">{refreshTime.toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 ${autoRefresh ? 'text-success' : 'text-muted-foreground'}`}
            >
              <Activity className="w-4 h-4" />
            </Button>

            <Button variant="ghost" size="sm" onClick={loadDashboardData} disabled={isLoading} className="p-2">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsMenuOpen(false)}>
          <div className="absolute right-0 top-16 w-80 max-w-[90vw] bg-background rounded-l-lg shadow-xl p-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-foreground mb-2">Display Options</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 text-sm">
                    <input
                      type="checkbox"
                      checked={internalShowOnlyPriority}
                      onChange={e => setShowOnlyPriority(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span>Show only high priority metrics</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">Hide Metrics</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {metrics.map(metric => (
                    <label key={metric.id} className="flex items-center space-x-3 text-sm">
                      <input
                        type="checkbox"
                        checked={hiddenMetrics.has(metric.id)}
                        onChange={() => toggleMetricVisibility(metric.id)}
                        className="rounded border-border"
                      />
                      <span>{metric.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button onClick={() => setIsMenuOpen(false)} className="w-full">
                Apply Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4">
          <Alert className="border-destructive/20 bg-destructive/10">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <div className="text-destructive">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setError(null)}
              className="mt-2 text-destructive border-destructive/20"
            >
              Dismiss
            </Button>
          </Alert>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !metrics.length && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-foreground-muted">Loading dashboard...</p>
          </div>
        </div>
      )}

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="p-4">
          <Card className="overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => toggleSection('alerts')}
            >
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-warning" />
                <h2 className="font-semibold text-foreground">Alerts</h2>
                <Badge variant="outline">{alerts.length}</Badge>
              </div>
              {expandedSections.has('alerts') ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </div>

            {expandedSections.has('alerts') && (
              <div className="border-t border-border">
                {alerts.map((alert, index) => (
                  <div key={alert.id} className={`p-4 ${index > 0 ? 'border-t border-muted/50' : ''}`}>
                    <div className="flex items-start space-x-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          alert.severity === 'critical'
                            ? 'bg-destructive/10'
                            : alert.severity === 'high'
                              ? 'bg-warning/10'
                              : alert.severity === 'medium'
                                ? 'bg-warning/10'
                                : 'bg-primary/10'
                        }`}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-foreground text-sm">{alert.title}</p>
                            <p className="text-foreground-muted text-sm">{alert.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
                          </div>

                          {alert.change !== undefined && (
                            <div className="ml-2">{formatPercentageChange(alert.change)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="p-4">
        <Card className="overflow-hidden">
          <div
            className="flex items-center justify-between p-4 cursor-pointer"
            onClick={() => toggleSection('metrics')}
          >
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Key Metrics</h2>
            </div>
            {expandedSections.has('metrics') ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </div>

          {expandedSections.has('metrics') && (
            <div className="border-t border-border">
              <div className={`grid gap-3 p-4 ${deviceType === 'tablet' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {getVisibleMetrics().map(metric => (
                  <MobileMetricCard key={metric.id} metric={metric} />
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="p-4">
        <Card>
          <div className="p-4">
            <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="sm" className="h-12 flex-col space-y-1">
                <Download className="w-4 h-4" />
                <span className="text-xs">Export Data</span>
              </Button>

              <Button variant="outline" size="sm" className="h-12 flex-col space-y-1">
                <Bell className="w-4 h-4" />
                <span className="text-xs">Set Alerts</span>
              </Button>

              <Button variant="outline" size="sm" className="h-12 flex-col space-y-1">
                <Eye className="w-4 h-4" />
                <span className="text-xs">View Details</span>
              </Button>

              <Button variant="outline" size="sm" className="h-12 flex-col space-y-1">
                <Activity className="w-4 h-4" />
                <span className="text-xs">Live View</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer Info */}
      <div className="p-4 pb-8">
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>Last updated: {refreshTime.toLocaleString()}</p>
          <p>Auto-refresh: {autoRefresh ? 'On' : 'Off'}</p>
          <div className="flex items-center justify-center space-x-4 mt-2">
            <div className="flex items-center space-x-1">
              {deviceType === 'mobile' ? <Smartphone className="w-3 h-3" /> : <Tablet className="w-3 h-3" />}
              <span>{deviceType}</span>
            </div>
            <span>•</span>
            <span>{getVisibleMetrics().length} metrics shown</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mobile-optimized metric card
interface MobileMetricCardProps {
  metric: MobileMetric;
}

const MobileMetricCard: React.FC<MobileMetricCardProps> = ({ metric }) => {
  const isPositiveChange = metric.change > 0;
  const isGoodChange = metric.isPositiveBetter ? isPositiveChange : !isPositiveChange;

  return (
    <div
      className={`p-4 rounded-lg border-2 ${getColorClasses(metric.color, 'bg')} transition-all duration-200 active:scale-95`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${getColorClasses(metric.color, 'bg')}`}>
          <div className={getColorClasses(metric.color, 'text')}>{metric.icon}</div>
        </div>

        <div className={`flex items-center space-x-1 ${isGoodChange ? 'text-success' : 'text-destructive'}`}>
          {isPositiveChange ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          <span className="text-xs font-medium">{Math.abs(metric.change).toFixed(1)}%</span>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-foreground-muted mb-1">{metric.title}</p>
        <p className="text-xl font-bold text-foreground mb-1">{metric.value}</p>

        {metric.priority === 'high' && <Badge className="bg-primary/10 text-primary text-xs">Priority</Badge>}
      </div>
    </div>
  );
};

// Helper function for color classes
const getColorClasses = (color: string, variant: 'bg' | 'text' | 'border' = 'text') => {
  const colorMap = {
    green: {
      bg: 'bg-success/10 border-success/20',
      text: 'text-success',
      border: 'border-success/20',
    },
    blue: {
      bg: 'bg-primary/10 border-primary/20',
      text: 'text-primary',
      border: 'border-primary/20',
    },
    red: {
      bg: 'bg-destructive/10 border-destructive/20',
      text: 'text-destructive',
      border: 'border-destructive/20',
    },
    purple: {
      bg: 'bg-accent/10 border-accent/20',
      text: 'text-accent',
      border: 'border-accent/20',
    },
    orange: {
      bg: 'bg-warning/10 border-warning/20',
      text: 'text-warning',
      border: 'border-warning/20',
    },
    yellow: {
      bg: 'bg-warning/10 border-warning/20',
      text: 'text-warning',
      border: 'border-warning/20',
    },
  };
  return colorMap[color as keyof typeof colorMap]?.[variant] || colorMap.blue[variant];
};

export default MobileSubscriptionDashboard;
