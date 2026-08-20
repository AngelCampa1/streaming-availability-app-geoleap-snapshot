'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator as _Separator } from '../ui/separator';
import {
  BarChart3,
  Users,
  DollarSign,
  Activity,
  Bell,
  Settings,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  Clock as _Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown as _TrendingDown,
  Smartphone,
  Monitor,
  Tablet,
  Grid3X3,
  Layout as _Layout,
  Maximize2 as _Maximize2,
  Eye as _Eye,
  Plus,
  MoreHorizontal,
  Star,
  Shield as _Shield,
  Target as _Target,
  Zap,
  Globe as _Globe,
  Mail as _Mail,
  Phone as _Phone,
  CreditCard,
  UserCheck,
  UserX as _UserX,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Info as _Info,
  HelpCircle as _HelpCircle,
  MessageSquare,
  Loader2 as _Loader2,
  X,
} from 'lucide-react';

// Import existing components
import { SubscriptionAnalyticsDashboard } from './SubscriptionAnalyticsDashboard';
import _MobileSubscriptionDashboard from './MobileSubscriptionDashboard';
import _UnifiedAnalyticsDashboard from './UnifiedAnalyticsDashboard';

// Import types
import type { CustomerAccount, SupportTicket as _SupportTicket, SupportMetrics, SupportAnalytics as _SupportAnalytics } from '../../lib/types/support';

// Dashboard configuration and types
interface DashboardWidget {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType<Record<string, unknown>>;
  size: 'small' | 'medium' | 'large' | 'full';
  category: 'overview' | 'customers' | 'analytics' | 'support' | 'operations';
  permissions?: string[];
  featured?: boolean;
  realtime?: boolean;
  refreshInterval?: number;
  props?: Record<string, unknown>;
}

interface _DashboardLayout {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  widgets: Array<{
    widgetId: string;
    position: { x: number; y: number; w: number; h: number };
    visible: boolean;
  }>;
  responsive: boolean;
}

interface DashboardFilter {
  dateRange: '24h' | '7d' | '30d' | '90d' | 'custom';
  customRange?: { start: string; end: string };
  status?: string[];
  category?: string[];
  priority?: string[];
  assignedTo?: string;
}

interface AdminDashboardState {
  selectedLayout: string;
  activeWidgets: Set<string>;
  filters: DashboardFilter;
  searchQuery: string;
  notifications: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
  }>;
  realTimeUpdates: boolean;
  lastRefresh: Date;
}

interface UnifiedAdminDashboardProps {
  className?: string;
  userRole?: string;
  permissions?: string[];
  deviceType?: 'desktop' | 'tablet' | 'mobile';
  defaultLayout?: string;
}

// Mock data generators (in real app, these would be API calls)
const generateMockMetrics = (): SupportMetrics => ({
  totalCustomers: 12847,
  activeSubscriptions: 9234,
  monthlyRevenue: 284750,
  pendingRefunds: 23,
  failedPayments: 156,
  supportTickets: 47,
  averageResolutionTime: 4.2,
  customerSatisfaction: 94.3,
});

const generateMockCustomers = (): CustomerAccount[] => [
  {
    id: 'cust_001',
    email: 'john.doe@example.com',
    name: 'John Doe',
    phone: '+1234567890',
    createdAt: '2024-01-15T10:30:00Z',
    status: 'active',
    tier: 'premium',
    totalPaid: 299.99,
    lastPaymentDate: '2024-01-01T00:00:00Z',
    nextBillingDate: '2024-02-01T00:00:00Z',
  },
  {
    id: 'cust_002',
    email: 'jane.smith@example.com',
    name: 'Jane Smith',
    createdAt: '2024-01-20T14:22:00Z',
    status: 'suspended',
    tier: 'basic',
    totalPaid: 59.99,
    lastPaymentDate: '2024-01-20T00:00:00Z',
  },
];

// Widget Components
const MetricsOverviewWidget: React.FC<{ className?: string }> = ({ className }) => {
  const [metrics, _setMetrics] = useState<SupportMetrics>(generateMockMetrics());
  const [loading, setLoading] = useState(false);

  const keyMetrics = [
    {
      label: 'Total Customers',
      value: metrics.totalCustomers.toLocaleString(),
      icon: <Users className="w-5 h-5 text-primary" />,
      trend: { value: 12.5, direction: 'up' as const },
      color: 'primary',
    },
    {
      label: 'Monthly Revenue',
      value: `$${metrics.monthlyRevenue.toLocaleString()}`,
      icon: <DollarSign className="w-5 h-5 text-success" />,
      trend: { value: 8.2, direction: 'up' as const },
      color: 'success',
    },
    {
      label: 'Active Subscriptions',
      value: metrics.activeSubscriptions.toLocaleString(),
      icon: <UserCheck className="w-5 h-5 text-primary/80" />,
      trend: { value: 5.7, direction: 'up' as const },
      color: 'primary',
    },
    {
      label: 'Support Tickets',
      value: metrics.supportTickets.toString(),
      icon: <MessageSquare className="w-5 h-5 text-warning" />,
      trend: { value: 15.3, direction: 'down' as const },
      color: 'orange',
    },
  ];

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Key Metrics</h3>
        <Button variant="ghost" size="sm" onClick={() => setLoading(!loading)}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {keyMetrics.map((metric, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center space-x-2">
              {metric.icon}
              <span className="text-sm font-medium text-foreground-muted">{metric.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-foreground">{metric.value}</span>
              <div
                className={`flex items-center space-x-1 text-xs ${
                  metric.trend.direction === 'up' ? 'text-success' : 'text-destructive'
                }`}
              >
                {metric.trend.direction === 'up' ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                <span>{metric.trend.value}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const RecentCustomersWidget: React.FC<{ className?: string }> = ({ className }) => {
  const [customers, _setCustomers] = useState<CustomerAccount[]>(generateMockCustomers());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch =
        customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, searchQuery, statusFilter]);

  const statusColors = {
    active: 'bg-success/10 text-success',
    suspended: 'bg-warning/10 text-warning',
    cancelled: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Recent Customers</h3>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:border-ring"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:border-ring"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {filteredCustomers.map(customer => (
          <div
            key={customer.id}
            className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
                {customer.name?.charAt(0) || customer.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-foreground">{customer.name || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">{customer.email}</div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Badge className={statusColors[customer.status]}>{customer.status}</Badge>
              <Badge variant="outline">{customer.tier}</Badge>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <Button variant="outline" className="w-full">
          View All Customers
        </Button>
      </div>
    </Card>
  );
};

const SupportTicketsWidget: React.FC<{ className?: string }> = ({ className }) => {
  const [tickets] = useState([
    {
      id: 'tick_001',
      title: 'Payment failed for subscription renewal',
      customer: 'John Doe',
      status: 'open',
      priority: 'high',
      createdAt: '2024-01-29T10:30:00Z',
      assignedTo: 'Sarah Johnson',
    },
    {
      id: 'tick_002',
      title: 'Unable to access premium features',
      customer: 'Jane Smith',
      status: 'in_progress',
      priority: 'medium',
      createdAt: '2024-01-29T09:15:00Z',
      assignedTo: 'Mike Wilson',
    },
    {
      id: 'tick_003',
      title: 'Refund request for annual subscription',
      customer: 'Bob Johnson',
      status: 'pending',
      priority: 'low',
      createdAt: '2024-01-28T16:45:00Z',
      assignedTo: null,
    },
  ]);

  const priorityColors = {
    high: 'bg-destructive/10 text-destructive',
    medium: 'bg-warning/10 text-warning',
    low: 'bg-success/10 text-success',
  };

  const statusColors = {
    open: 'bg-info/10 text-info',
    in_progress: 'bg-primary/10 text-primary',
    pending: 'bg-muted text-foreground',
    closed: 'bg-success/10 text-success',
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Support Tickets</h3>
        <div className="flex items-center space-x-2">
          <Badge className="bg-destructive/10 text-destructive">
            {tickets.filter(t => t.priority === 'high').length} High Priority
          </Badge>
          <Button variant="ghost" size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {tickets.map(ticket => (
          <div
            key={ticket.id}
            className="border border-border rounded-lg p-4 hover:border-border transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-medium text-foreground mb-1">{ticket.title}</h4>
                <p className="text-sm text-muted-foreground">Customer: {ticket.customer}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>
                  {ticket.priority}
                </Badge>
                <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
                  {ticket.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
              <span>Assigned to: {ticket.assignedTo || 'Unassigned'}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <Button variant="outline" className="w-full">
          View All Tickets
        </Button>
      </div>
    </Card>
  );
};

const QuickActionsWidget: React.FC<{ className?: string }> = ({ className }) => {
  const quickActions = [
    {
      label: 'Create Customer',
      icon: <Users className="w-5 h-5" />,
      action: () => {
        // TODO: Implement create customer
      },
      color: 'blue',
    },
    {
      label: 'Process Refund',
      icon: <CreditCard className="w-5 h-5" />,
      action: () => {
        // TODO: Implement process refund
      },
      color: 'green',
    },
    {
      label: 'Send Notification',
      icon: <Bell className="w-5 h-5" />,
      action: () => {
        // TODO: Implement send notification
      },
      color: 'purple',
    },
    {
      label: 'Generate Report',
      icon: <FileText className="w-5 h-5" />,
      action: () => {
        // TODO: Implement generate report
      },
      color: 'orange',
    },
  ];

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
        <Button variant="ghost" size="sm">
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            onClick={action.action}
            className="h-auto flex-col space-y-2 p-4 hover:bg-muted"
          >
            <div
              className={`w-8 h-8 rounded-full bg-${action.color}-100 flex items-center justify-center text-${action.color}-600`}
            >
              {action.icon}
            </div>
            <span className="text-sm font-medium">{action.label}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
};

const SystemStatusWidget: React.FC<{ className?: string }> = ({ className }) => {
  const [systemStatus] = useState({
    api: { status: 'operational', latency: 45 },
    database: { status: 'operational', connections: 23 },
    payments: { status: 'degraded', successRate: 97.2 },
    notifications: { status: 'operational', queue: 156 },
  });

  const statusColors = {
    operational: 'bg-success/10 text-success',
    degraded: 'bg-warning/10 text-warning',
    outage: 'bg-destructive/10 text-destructive',
  };

  const statusIcons = {
    operational: <CheckCircle className="w-4 h-4" />,
    degraded: <AlertTriangle className="w-4 h-4" />,
    outage: <X className="w-4 h-4" />,
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">System Status</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">Live</span>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(systemStatus).map(([service, data]) => (
          <div key={service} className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-1 ${statusColors[data.status as keyof typeof statusColors]}`}>
                {statusIcons[data.status as keyof typeof statusIcons]}
                <span className="text-sm font-medium capitalize">{service}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Badge className={statusColors[data.status as keyof typeof statusColors]}>{data.status}</Badge>
              {service === 'api' && 'latency' in data && (
                <span className="text-xs text-muted-foreground">{data.latency}ms</span>
              )}
              {service === 'payments' && 'successRate' in data && (
                <span className="text-xs text-muted-foreground">{data.successRate}%</span>
              )}
              {service === 'notifications' && 'queue' in data && (
                <span className="text-xs text-muted-foreground">{data.queue} queued</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <Button variant="outline" className="w-full">
          View System Details
        </Button>
      </div>
    </Card>
  );
};

// Main Dashboard Component
export const UnifiedAdminDashboard: React.FC<UnifiedAdminDashboardProps> = ({
  className = '',
  userRole: _userRole = 'admin',
  permissions = [],
  deviceType = 'desktop',
  defaultLayout = 'default',
}) => {
  const [dashboardState, setDashboardState] = useState<AdminDashboardState>({
    selectedLayout: defaultLayout,
    activeWidgets: new Set(['metrics', 'customers', 'tickets', 'actions', 'status']),
    filters: {
      dateRange: '30d',
      status: [],
      category: [],
      priority: [],
    },
    searchQuery: '',
    notifications: [],
    realTimeUpdates: true,
    lastRefresh: new Date(),
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(deviceType === 'mobile');
  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Available dashboard widgets
  const availableWidgets: DashboardWidget[] = useMemo(
    () => [
      {
        id: 'metrics',
        title: 'Key Metrics Overview',
        description: 'Essential business metrics and KPIs',
        icon: <BarChart3 className="w-5 h-5" />,
        component: MetricsOverviewWidget,
        size: 'large',
        category: 'overview',
        featured: true,
        realtime: true,
        refreshInterval: 30000,
      },
      {
        id: 'customers',
        title: 'Recent Customers',
        description: 'Latest customer registrations and updates',
        icon: <Users className="w-5 h-5" />,
        component: RecentCustomersWidget,
        size: 'medium',
        category: 'customers',
        featured: true,
      },
      {
        id: 'tickets',
        title: 'Support Tickets',
        description: 'Customer support tickets and their status',
        icon: <MessageSquare className="w-5 h-5" />,
        component: SupportTicketsWidget,
        size: 'medium',
        category: 'support',
        featured: true,
        realtime: true,
      },
      {
        id: 'actions',
        title: 'Quick Actions',
        description: 'Common administrative actions',
        icon: <Zap className="w-5 h-5" />,
        component: QuickActionsWidget,
        size: 'small',
        category: 'operations',
      },
      {
        id: 'status',
        title: 'System Status',
        description: 'Real-time system health monitoring',
        icon: <Activity className="w-5 h-5" />,
        component: SystemStatusWidget,
        size: 'medium',
        category: 'operations',
        realtime: true,
        refreshInterval: 15000,
      },
      {
        id: 'analytics',
        title: 'Subscription Analytics',
        description: 'Detailed subscription and revenue analytics',
        icon: <TrendingUp className="w-5 h-5" />,
        component: SubscriptionAnalyticsDashboard,
        size: 'full',
        category: 'analytics',
        props: { isExecutiveView: false },
      },
    ],
    []
  );

  // Filter widgets based on permissions and active state
  const visibleWidgets = useMemo(() => {
    return availableWidgets.filter(widget => {
      // Check if widget is active
      if (!dashboardState.activeWidgets.has(widget.id)) return false;

      // Check permissions
      if (widget.permissions && widget.permissions.length > 0) {
        return widget.permissions.some(permission => permissions.includes(permission));
      }

      return true;
    });
  }, [availableWidgets, dashboardState.activeWidgets, permissions]);

  // Real-time updates effect
  useEffect(() => {
    if (!dashboardState.realTimeUpdates) return;

    const intervals: NodeJS.Timeout[] = [];

    visibleWidgets.forEach(widget => {
      if (widget.realtime && widget.refreshInterval) {
        const interval = setInterval(() => {
          setDashboardState(prev => ({
            ...prev,
            lastRefresh: new Date(),
          }));
        }, widget.refreshInterval);
        intervals.push(interval);
      }
    });

    return () => intervals.forEach(clearInterval);
  }, [dashboardState.realTimeUpdates, visibleWidgets]);

  // Handle global refresh
  const handleGlobalRefresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));

      setDashboardState(prev => ({
        ...prev,
        lastRefresh: new Date(),
      }));
    } catch (error) {
      console.error('Refresh failed:', error);
      setError('Failed to refresh dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle widget toggle
  const toggleWidget = useCallback((widgetId: string) => {
    setDashboardState(prev => {
      const newActiveWidgets = new Set(prev.activeWidgets);
      if (newActiveWidgets.has(widgetId)) {
        newActiveWidgets.delete(widgetId);
      } else {
        newActiveWidgets.add(widgetId);
      }
      return {
        ...prev,
        activeWidgets: newActiveWidgets,
      };
    });
  }, []);

  // Handle export
  const handleExport = useCallback(async () => {
    try {
      // Simulate export
      // TODO: Implement dashboard data export
    } catch (_error) {
      setError('Failed to export dashboard data');
    }
  }, []);

  // Get widget component with appropriate sizing
  const getWidgetComponent = (widget: DashboardWidget) => {
    const Component = widget.component;
    const sizeClasses = {
      small: 'col-span-1 row-span-1',
      medium: 'col-span-1 md:col-span-2 row-span-1',
      large: 'col-span-1 md:col-span-3 lg:col-span-4 row-span-1',
      full: 'col-span-full row-span-2',
    };

    return (
      <div key={widget.id} className={`${sizeClasses[widget.size]} min-h-[300px]`}>
        <Component
          key={`${widget.id}-${dashboardState.lastRefresh.getTime()}`}
          className="h-full"
          {...(widget.props || {})}
        />
      </div>
    );
  };

  const deviceIcon = {
    desktop: <Monitor className="w-4 h-4" />,
    tablet: <Tablet className="w-4 h-4" />,
    mobile: <Smartphone className="w-4 h-4" />,
  };

  return (
    <div className={`min-h-screen bg-muted ${className}`}>
      {/* Top Navigation Bar */}
      <div className="bg-background border-b border-border sticky top-0 z-[1100]">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left Section */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="lg:hidden"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
                  <p className="text-sm text-muted-foreground">Unified administrative interface</p>
                </div>
              </div>
            </div>

            {/* Center Section - Search */}
            <div className="flex-1 max-w-lg mx-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search customers, tickets, transactions..."
                  value={dashboardState.searchQuery}
                  onChange={e => setDashboardState(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-2">
              {/* Device Type Indicator */}
              <Badge variant="outline" className="hidden sm:flex items-center space-x-1">
                {deviceIcon[deviceType]}
                <span className="capitalize">{deviceType}</span>
              </Badge>

              {/* Real-time Updates Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setDashboardState(prev => ({
                    ...prev,
                    realTimeUpdates: !prev.realTimeUpdates,
                  }))
                }
                className={dashboardState.realTimeUpdates ? 'bg-success/10 text-success' : 'text-muted-foreground'}
              >
                <Activity className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Live</span>
              </Button>

              {/* Filters */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-primary/10 text-primary' : ''}
              >
                <Filter className="w-4 h-4" />
              </Button>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="w-4 h-4" />
                {dashboardState.notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-xs text-destructive-foreground flex items-center justify-center">
                    {dashboardState.notifications.filter(n => !n.read).length}
                  </span>
                )}
              </Button>

              {/* Refresh */}
              <Button variant="ghost" size="sm" onClick={handleGlobalRefresh} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>

              {/* Export */}
              <Button variant="ghost" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4" />
              </Button>

              {/* Settings */}
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        {showFilters && (
          <div className="border-t border-border px-4 sm:px-6 lg:px-8 py-3 bg-muted">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <select
                  value={dashboardState.filters.dateRange}
                  onChange={e =>
                    setDashboardState(prev => ({
                      ...prev,
                      filters: {
                        ...prev.filters,
                        dateRange: e.target.value as "24h" | "7d" | "30d" | "90d" | "custom",
                      },
                    }))
                  }
                  className="px-3 py-1 border border-border rounded-md text-sm"
                >
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="custom">Custom range</option>
                </select>
              </div>

              <div className="text-sm text-muted-foreground">
                Last updated: {dashboardState.lastRefresh.toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Widget Sidebar */}
        {!sidebarCollapsed && (
          <div className="w-80 bg-background border-r border-border overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Widgets</h3>
                <Button variant="ghost" size="sm" onClick={() => setSidebarCollapsed(true)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {Object.entries(
                  availableWidgets.reduce(
                    (acc, widget) => {
                      if (!acc[widget.category]) acc[widget.category] = [];
                      acc[widget.category].push(widget);
                      return acc;
                    },
                    {} as Record<string, DashboardWidget[]>
                  )
                ).map(([category, widgets]) => (
                  <div key={category}>
                    <h4 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-2">{category}</h4>
                    <div className="space-y-2">
                      {widgets.map(widget => (
                        <div
                          key={widget.id}
                          className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            dashboardState.activeWidgets.has(widget.id)
                              ? 'bg-primary/10 border border-primary/20'
                              : 'hover:bg-muted border border-transparent'
                          }`}
                          onClick={() => toggleWidget(widget.id)}
                        >
                          <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-lg">
                            {widget.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h5 className="text-sm font-medium text-foreground">{widget.title}</h5>
                              {widget.featured && <Star className="w-3 h-3 text-warning" />}
                              {widget.realtime && <div className="w-2 h-2 bg-success rounded-full" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{widget.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Dashboard Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {visibleWidgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No widgets selected</h3>
              <p className="text-muted-foreground mb-4">Choose widgets from the sidebar to customize your dashboard</p>
              <Button onClick={() => setSidebarCollapsed(false)}>Show Widgets</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-min">
              {visibleWidgets.map(getWidgetComponent)}
            </div>
          )}
        </div>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed inset-y-0 right-0 w-96 bg-background shadow-xl border-l border-border z-[1300]">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowNotifications(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="text-center text-muted-foreground py-8">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No notifications</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedAdminDashboard;
