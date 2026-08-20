'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card as _Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Clock as _Clock,
  RefreshCw,
  Calendar as _Calendar,
  Filter as _Filter,
  Download,
  AlertTriangle,
  Bell,
  Loader2 as _Loader2,
  Settings,
  Eye as _Eye,
  EyeOff as _EyeOff,
  Maximize2 as _Maximize2,
  Minimize2 as _Minimize2,
  Grid3X3,
  Layout,
  PieChart as _PieChart,
  Activity,
  Target,
  CreditCard,
  UserCheck as _UserCheck,
  Smartphone,
  Monitor,
  ChevronDown as _ChevronDown,
  ChevronRight as _ChevronRight,
  Info as _Info,
} from 'lucide-react';

// Import existing dashboard components
import SubscriptionAnalyticsDashboard from './SubscriptionAnalyticsDashboard';
import MobileSubscriptionDashboard from './MobileSubscriptionDashboard';
import { DunningAnalyticsDashboard } from './DunningAnalyticsDashboard';
import { PaymentRecoveryAnalytics } from '../payment/PaymentRecoveryAnalytics';
import UserBehaviorAnalyticsDashboard from './UserBehaviorAnalyticsDashboard';
import { RevenueGrowthChart, CohortHeatmap, SubscriptionFunnel, ChurnPredictionChart } from '../charts/AnalyticsCharts';

// Dashboard configuration types
interface DashboardView {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>;
  category: 'overview' | 'financial' | 'customer' | 'operations' | 'mobile';
  permissions?: string[];
  featured?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>;
}

interface LayoutConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  views: string[];
  responsive: boolean;
}

interface UnifiedAnalyticsDashboardProps {
  className?: string;
  defaultView?: string;
  userRole?: string;
  deviceType?: 'desktop' | 'tablet' | 'mobile';
  permissions?: string[];
}

const UnifiedAnalyticsDashboard: React.FC<UnifiedAnalyticsDashboardProps> = ({
  className = '',
  defaultView = 'executive',
  userRole: _userRole = 'admin',
  deviceType = 'desktop',
  permissions = [],
}) => {
  const [activeView, setActiveView] = useState(defaultView);
  const [activeLayout, setActiveLayout] = useState('single');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenViews, setHiddenViews] = useState<Set<string>>(new Set());
  const [pinnedViews, setPinnedViews] = useState<Set<string>>(new Set(['executive']));
  const [refreshTime, setRefreshTime] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [_dashboardSettings, _setDashboardSettings] = useState({
    showGridLines: true,
    compactMode: false,
    
    animationsEnabled: true,
  });

  // Define all available dashboard views
  const dashboardViews: DashboardView[] = useMemo(
    () => [
      {
        id: 'executive',
        name: 'Executive Overview',
        description: 'High-level KPIs and business insights for executives',
        icon: <BarChart3 className="w-5 h-5" />,
        component: SubscriptionAnalyticsDashboard,
        category: 'overview',
        featured: true,
        props: { isExecutiveView: true },
      },
      {
        id: 'financial',
        name: 'Financial Analytics',
        description: 'Revenue, pricing, and financial performance metrics',
        icon: <DollarSign className="w-5 h-5" />,
        component: SubscriptionAnalyticsDashboard,
        category: 'financial',
        featured: true,
        props: { isExecutiveView: false, focusArea: 'financial' },
      },
      {
        id: 'customer',
        name: 'Customer Analytics',
        description: 'Customer lifecycle, retention, and behavioral insights',
        icon: <Users className="w-5 h-5" />,
        component: SubscriptionAnalyticsDashboard,
        category: 'customer',
        featured: true,
        props: { focusArea: 'customer' },
      },
      {
        id: 'revenue_trends',
        name: 'Revenue Trends',
        description: 'Advanced revenue growth and forecasting charts',
        icon: <TrendingUp className="w-5 h-5" />,
        component: RevenueGrowthChart,
        category: 'financial',
        props: { title: 'Comprehensive Revenue Analysis' },
      },
      {
        id: 'cohort_analysis',
        name: 'Cohort Analysis',
        description: 'Customer retention cohort heatmaps and analysis',
        icon: <Target className="w-5 h-5" />,
        component: CohortHeatmap,
        category: 'customer',
        props: { title: 'Customer Retention Cohorts' },
      },
      {
        id: 'conversion_funnel',
        name: 'Conversion Funnel',
        description: 'Subscription conversion and drop-off analysis',
        icon: <Activity className="w-5 h-5" />,
        component: SubscriptionFunnel,
        category: 'customer',
        props: { title: 'Subscription Conversion Pipeline' },
      },
      {
        id: 'churn_prediction',
        name: 'Churn Prediction',
        description: 'AI-powered churn forecasting and risk analysis',
        icon: <AlertTriangle className="w-5 h-5" />,
        component: ChurnPredictionChart,
        category: 'customer',
        props: { title: 'Predictive Churn Analysis' },
      },
      {
        id: 'payment_recovery',
        name: 'Payment Recovery',
        description: 'Payment failure recovery and dunning analytics',
        icon: <CreditCard className="w-5 h-5" />,
        component: PaymentRecoveryAnalytics,
        category: 'operations',
        props: { showDatePicker: true },
      },
      {
        id: 'dunning',
        name: 'Dunning Management',
        description: 'Comprehensive dunning campaign and recovery analytics',
        icon: <Bell className="w-5 h-5" />,
        component: DunningAnalyticsDashboard,
        category: 'operations',
        props: { isAdminView: true },
      },
      {
        id: 'user_behavior',
        name: 'User Behavior Analytics',
        description: 'Comprehensive user interaction and behavior insights',
        icon: <Activity className="w-5 h-5" />,
        component: UserBehaviorAnalyticsDashboard,
        category: 'customer',
        featured: true,
        props: { deviceType, showRealTime: true },
      },
      {
        id: 'mobile',
        name: 'Mobile Executive',
        description: 'Mobile-optimized executive dashboard',
        icon: <Smartphone className="w-5 h-5" />,
        component: MobileSubscriptionDashboard,
        category: 'mobile',
        props: { deviceType: deviceType === 'tablet' ? 'tablet' : 'mobile' },
      },
    ],
    [deviceType]
  );

  // Layout configurations
  const layoutConfigs: LayoutConfig[] = [
    {
      id: 'single',
      name: 'Single View',
      icon: <Monitor className="w-4 h-4" />,
      description: 'Focus on one dashboard at a time',
      views: ['single'],
      responsive: true,
    },
    {
      id: 'split',
      name: 'Split View',
      icon: <Layout className="w-4 h-4" />,
      description: 'Two dashboards side by side',
      views: ['left', 'right'],
      responsive: true,
    },
    {
      id: 'grid',
      name: 'Grid Layout',
      icon: <Grid3X3 className="w-4 h-4" />,
      description: 'Multiple dashboards in grid format',
      views: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      responsive: deviceType === 'desktop',
    },
  ];

  // Filter views based on permissions and device type
  const availableViews = useMemo(() => {
    return dashboardViews.filter(view => {
      // Filter by device type
      if (deviceType === 'mobile' && view.category !== 'mobile' && !view.featured) {
        return false;
      }

      // Filter by permissions
      if (view.permissions && view.permissions.length > 0) {
        return view.permissions.some(permission => permissions.includes(permission));
      }

      // Filter hidden views
      if (hiddenViews.has(view.id)) {
        return false;
      }

      return true;
    });
  }, [dashboardViews, deviceType, permissions, hiddenViews]);

  // Get current view configuration
  const currentView = useMemo(() => {
    return availableViews.find(view => view.id === activeView) || availableViews[0];
  }, [availableViews, activeView]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setRefreshTime(new Date());
        // Trigger refresh in child components by updating a key or calling their refresh methods
      }, 300000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Handle view changes
  const handleViewChange = useCallback((viewId: string) => {
    setActiveView(viewId);
    setError(null);
  }, []);

  // Handle layout changes
  const handleLayoutChange = useCallback((layoutId: string) => {
    setActiveLayout(layoutId);
  }, []);

  // Handle view visibility toggle
  const _toggleViewVisibility = useCallback(
    (viewId: string) => {
      const newHiddenViews = new Set(hiddenViews);
      if (newHiddenViews.has(viewId)) {
        newHiddenViews.delete(viewId);
      } else {
        newHiddenViews.add(viewId);
      }
      setHiddenViews(newHiddenViews);
    },
    [hiddenViews]
  );

  // Handle view pinning
  const _toggleViewPin = useCallback(
    (viewId: string) => {
      const newPinnedViews = new Set(pinnedViews);
      if (newPinnedViews.has(viewId)) {
        newPinnedViews.delete(viewId);
      } else {
        newPinnedViews.add(viewId);
      }
      setPinnedViews(newPinnedViews);
    },
    [pinnedViews]
  );

  // Global refresh function
  const handleGlobalRefresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRefreshTime(new Date());
      // Additional global refresh logic could go here
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate refresh
    } catch (error) {
      console.error('Global refresh failed:', error);
      setError('Failed to refresh dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Export all dashboard data
  const handleGlobalExport = useCallback(async () => {
    try {
      const response = await fetch('/api/subscription/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exportType: 'unified_dashboard',
          format: 'Excel',
          includeViews: availableViews.map(v => v.id),
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const { exportId } = await response.json();

      // Poll for completion and download
      setTimeout(() => {
        window.open(`/api/subscription/analytics/export/${exportId}/download`);
      }, 3000);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export dashboard data');
    }
  }, [availableViews]);

  // Group views by category
  const groupedViews = useMemo(() => {
    const groups: Record<string, DashboardView[]> = {};
    availableViews.forEach(view => {
      if (!groups[view.category]) {
        groups[view.category] = [];
      }
      groups[view.category].push(view);
    });
    return groups;
  }, [availableViews]);

  const renderDashboardContent = () => {
    // Show loading state when initially loading data
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-48 sm:h-64">
          <div className="text-center p-4">
            <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 animate-spin text-primary" />
            <span className="text-sm sm:text-base text-foreground-muted">Loading analytics data...</span>
          </div>
        </div>
      );
    }

    if (!currentView) {
      return (
        <div className="flex items-center justify-center h-48 sm:h-64">
          <div className="text-center text-muted-foreground p-4">
            <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-50" />
            <p className="text-sm sm:text-base">No dashboard views available</p>
          </div>
        </div>
      );
    }

    const DashboardComponent = currentView.component;
    const componentProps = {
      ...currentView.props,
      key: `${currentView.id}-${refreshTime.getTime()}`, // Force re-render on refresh
      className: 'w-full h-full',
    };

    return (
      <div className="flex-1 overflow-auto p-2 sm:p-3 md:p-4">
        <DashboardComponent {...componentProps} />
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-screen bg-muted ${className}`}>
      {/* Unified Header */}
      <div className="bg-background border-b border-border px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2 sm:gap-3">
              <BarChart3 className="w-6 h-6 sm:w-7 md:w-8 sm:h-7 md:h-8 text-primary" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Analytics Hub</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Unified subscription analytics and business intelligence</p>
              </div>
            </div>

            {currentView && (
              <div className="flex items-center gap-2 ml-8 sm:ml-0">
                <Separator orientation="vertical" className="h-6 hidden sm:block" />
                {currentView.icon}
                <span className="text-sm sm:text-base font-medium text-foreground">{currentView.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
            {/* Device type indicator */}
            <Badge variant="outline" className="hidden lg:flex">
              {deviceType === 'mobile' ? <Smartphone className="w-3 h-3 mr-1" /> : <Monitor className="w-3 h-3 mr-1" />}
              {deviceType}
            </Badge>

            {/* Auto refresh toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-success/10 text-success' : 'text-muted-foreground'}
            >
              <Activity className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Auto Refresh</span>
            </Button>

            {/* Manual refresh */}
            <Button variant="ghost" size="sm" onClick={handleGlobalRefresh} disabled={isLoading}>
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Refresh</span>
            </Button>

            {/* Global export */}
            <Button variant="ghost" size="sm" onClick={handleGlobalExport} className="hidden sm:flex">
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Export All</span>
            </Button>

            {/* Settings (placeholder) */}
            <Button variant="ghost" size="sm">
              <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>

        {/* Last updated info */}
        <div className="flex items-center justify-between mt-2 sm:mt-3">
          <div className="text-xs sm:text-sm text-muted-foreground">
            <span className="hidden sm:inline">Last updated: </span>
            <span className="sm:hidden">Updated: </span>
            {refreshTime.toLocaleString()}
            {autoRefresh && <span className="ml-1 sm:ml-2 hidden md:inline">(Auto-refresh enabled)</span>}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-3 sm:px-4 md:px-6 py-2">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 sm:p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-destructive flex-shrink-0" />
              <span className="text-xs sm:text-sm text-destructive flex-1">{error}</span>
              <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-destructive p-1">
                ×
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-72 lg:w-80 bg-background border-r border-border flex flex-col max-h-64 md:max-h-none overflow-y-auto md:overflow-visible">
          {/* View Categories */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            <div className="space-y-4 sm:space-y-6">
              {Object.entries(groupedViews).map(([category, views]) => (
                <div key={category}>
                  <h3 className="text-xs sm:text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-2 sm:mb-3">
                    {category.replace('_', ' ')}
                  </h3>
                  <div className="space-y-1">
                    {views.map(view => (
                      <div
                        key={view.id}
                        className={`flex items-center justify-between p-2 sm:p-3 rounded-lg cursor-pointer transition-colors ${
                          activeView === view.id ? 'bg-primary/10 border-primary/20 text-primary' : 'hover:bg-muted'
                        }`}
                        onClick={() => handleViewChange(view.id)}
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="flex-shrink-0">{view.icon}</div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-xs sm:text-sm truncate">{view.name}</div>
                            <div className="text-xs text-muted-foreground hidden sm:block truncate">{view.description}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {view.featured && (
                            <Badge variant="outline" className="text-xs hidden lg:inline-flex">
                              Featured
                            </Badge>
                          )}
                          {pinnedViews.has(view.id) && <div className="w-2 h-2 bg-primary/10 rounded-full" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Layout Controls */}
          {deviceType === 'desktop' && (
            <div className="border-t border-border p-3 sm:p-4 hidden lg:block">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground-muted mb-2 sm:mb-3">Layout</h3>
              <div className="grid grid-cols-3 gap-1 sm:gap-2">
                {layoutConfigs
                  .filter(config => config.responsive || deviceType === 'desktop')
                  .map(layout => (
                    <Button
                      key={layout.id}
                      variant={activeLayout === layout.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleLayoutChange(layout.id)}
                      className="flex flex-col items-center p-1 sm:p-2 h-auto"
                    >
                      {layout.icon}
                      <span className="text-xs mt-1">{layout.name}</span>
                    </Button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Dashboard Area */}
        <div className="flex-1 flex flex-col overflow-hidden">{renderDashboardContent()}</div>
      </div>
    </div>
  );
};

export default UnifiedAnalyticsDashboard;
