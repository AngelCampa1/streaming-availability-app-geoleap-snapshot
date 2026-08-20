'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  BarChart3,
  Users,
  DollarSign,
  MessageSquare,
  Search,
  RefreshCw,
  Settings,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  MoreVertical,
  Plus,
  Eye,
  Edit,
} from 'lucide-react';

// Import types
import type { CustomerAccount, SupportMetrics } from '../../lib/types/support';

interface MobileAdminDashboardProps {
  className?: string;
  userRole?: string;
  permissions?: string[];
}

interface QuickStat {
  id: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
  color: string;
  action?: () => void;
}

interface MobileMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  action: () => void;
  children?: MobileMenuItem[];
}

// Mobile-optimized components
const MobileHeader: React.FC<{
  onMenuToggle: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showSearch: boolean;
  onSearchToggle: () => void;
}> = ({ onMenuToggle, onRefresh, isRefreshing, searchQuery, onSearchChange, showSearch, onSearchToggle }) => {
  return (
    <div className="bg-background border-b border-border sticky top-0 z-[1100]">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={onMenuToggle}>
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Admin</h1>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={onSearchToggle}>
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {showSearch && (
          <div className="mt-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MobileQuickStats: React.FC<{ stats: QuickStat[] }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {stats.map(stat => (
        <Card
          key={stat.id}
          className={`p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-${stat.color}-500`}
          onClick={stat.action}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              {stat.icon}
            </div>
            {stat.trend && (
              <div
                className={`flex items-center space-x-1 text-xs ${
                  stat.trend.direction === 'up' ? 'text-success' : 'text-destructive'
                }`}
              >
                {stat.trend.direction === 'up' ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingUp className="w-3 h-3 rotate-180" />
                )}
                <span>{stat.trend.value}%</span>
              </div>
            )}
          </div>
          <div className="text-xl font-bold text-foreground mb-1">{stat.value}</div>
          <div className="text-xs text-muted-foreground">{stat.label}</div>
        </Card>
      ))}
    </div>
  );
};

const MobileCustomerCard: React.FC<{ customer: CustomerAccount }> = ({ customer }) => {
  const [expanded, setExpanded] = useState(false);

  const statusColors = {
    active: 'bg-success/10 text-success',
    suspended: 'bg-warning/10 text-warning',
    cancelled: 'bg-error/10 text-error',
  };

  const tierColors = {
    free: 'bg-muted text-muted-foreground',
    basic: 'bg-primary/10 text-primary',
    premium: 'bg-primary/20 text-primary',
    enterprise: 'bg-warning/10 text-warning',
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
            {customer.name?.charAt(0) || customer.email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-foreground truncate">{customer.name || 'N/A'}</div>
            <div className="text-sm text-muted-foreground truncate">{customer.email}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge className={statusColors[customer.status]}>{customer.status}</Badge>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Tier:</span>
              <Badge className={`ml-2 ${tierColors[customer.tier]}`}>{customer.tier}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Total Paid:</span>
              <span className="ml-2 font-medium">${customer.totalPaid.toFixed(2)}</span>
            </div>
            {customer.phone && (
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <span className="ml-2">{customer.phone}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Joined:</span>
              <span className="ml-2">{new Date(customer.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex space-x-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

const MobileTicketCard: React.FC<{
  ticket: {
    id: string;
    title: string;
    customer: string;
    status: string;
    priority: string;
    createdAt: string;
    assignedTo?: string;
  };
}> = ({ ticket }) => {
  const priorityColors = {
    high: 'bg-error/10 text-error',
    medium: 'bg-warning/10 text-warning',
    low: 'bg-success/10 text-success',
  };

  const statusColors = {
    open: 'bg-primary/10 text-primary',
    in_progress: 'bg-primary/20 text-primary',
    pending: 'bg-muted text-muted-foreground',
    closed: 'bg-success/10 text-success',
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground text-sm leading-tight mb-1">{ticket.title}</h4>
          <p className="text-xs text-muted-foreground">Customer: {ticket.customer}</p>
        </div>
        <div className="flex flex-col items-end space-y-1 ml-2">
          <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>{ticket.priority}</Badge>
          <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
            {ticket.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
        <span>{ticket.assignedTo || 'Unassigned'}</span>
      </div>

      <div className="flex space-x-2 mt-3">
        <Button variant="outline" size="sm" className="flex-1">
          View
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          Assign
        </Button>
      </div>
    </Card>
  );
};

const MobileMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  menuItems: MobileMenuItem[];
}> = ({ isOpen, onClose, menuItems }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1400]">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-80 bg-background shadow-xl">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Menu</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto h-full pb-20">
          {menuItems.map(item => (
            <div key={item.id}>
              <div
                className="flex items-center justify-between px-4 py-3 hover:bg-muted cursor-pointer"
                onClick={() => {
                  if (item.children) {
                    toggleExpanded(item.id);
                  } else {
                    item.action();
                    onClose();
                  }
                }}
              >
                <div className="flex items-center space-x-3">
                  {item.icon}
                  <span className="font-medium text-foreground">{item.label}</span>
                </div>

                <div className="flex items-center space-x-2">
                  {item.badge && (
                    <Badge variant="outline" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                  {item.children &&
                    (expandedItems.has(item.id) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    ))}
                </div>
              </div>

              {item.children && expandedItems.has(item.id) && (
                <div className="bg-muted pl-12">
                  {item.children.map(child => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between px-4 py-2 hover:bg-muted/80 cursor-pointer"
                      onClick={() => {
                        child.action();
                        onClose();
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        {child.icon}
                        <span className="text-foreground">{child.label}</span>
                      </div>
                      {child.badge && (
                        <Badge variant="outline" className="text-xs">
                          {child.badge}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MobileSystemStatus: React.FC = () => {
  const [systemStatus] = useState({
    api: { status: 'operational', value: '99.9%' },
    database: { status: 'operational', value: '< 50ms' },
    payments: { status: 'degraded', value: '97.2%' },
    notifications: { status: 'operational', value: '156' },
  });

  const statusColors = {
    operational: 'text-success',
    degraded: 'text-warning',
    outage: 'text-error',
  };

  const statusIcons = {
    operational: <CheckCircle className="w-4 h-4" />,
    degraded: <AlertTriangle className="w-4 h-4" />,
    outage: <X className="w-4 h-4" />,
  };

  return (
    <Card className="p-4 m-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">System Status</h3>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(systemStatus).map(([service, data]) => (
          <div key={service} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={statusColors[data.status as keyof typeof statusColors]}>
                {statusIcons[data.status as keyof typeof statusIcons]}
              </div>
              <span className="text-sm font-medium capitalize text-foreground">{service}</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-foreground-muted">{data.value}</span>
              <Badge
                variant="outline"
                className={`text-xs ${statusColors[data.status as keyof typeof statusColors]} border-current`}
              >
                {data.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// Main Mobile Admin Dashboard
export const MobileAdminDashboard: React.FC<MobileAdminDashboardProps> = ({
  className = '',
  userRole: _userRole = 'admin',
  permissions: _permissions = [],
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'tickets'>('overview');
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data
  const [metrics] = useState<SupportMetrics>({
    totalCustomers: 12847,
    activeSubscriptions: 9234,
    monthlyRevenue: 284750,
    pendingRefunds: 23,
    failedPayments: 156,
    supportTickets: 47,
    averageResolutionTime: 4.2,
    customerSatisfaction: 94.3,
  });

  const [customers] = useState<CustomerAccount[]>([
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
  ]);

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
  ]);

  // Quick stats configuration
  const quickStats: QuickStat[] = useMemo(
    () => [
      {
        id: 'customers',
        label: 'Total Customers',
        value: metrics.totalCustomers.toLocaleString(),
        icon: <Users className="w-4 h-4 text-primary" />,
        trend: { value: 12.5, direction: 'up' },
        color: 'blue',
        action: () => setActiveTab('customers'),
      },
      {
        id: 'revenue',
        label: 'Monthly Revenue',
        value: `$${(metrics.monthlyRevenue / 1000).toFixed(0)}k`,
        icon: <DollarSign className="w-4 h-4 text-success" />,
        trend: { value: 8.2, direction: 'up' },
        color: 'green',
      },
      {
        id: 'subscriptions',
        label: 'Active Subs',
        value: (metrics.activeSubscriptions / 1000).toFixed(1) + 'k',
        icon: <CreditCard className="w-4 h-4 text-primary" />,
        trend: { value: 5.7, direction: 'up' },
        color: 'purple',
      },
      {
        id: 'tickets',
        label: 'Support Tickets',
        value: metrics.supportTickets.toString(),
        icon: <MessageSquare className="w-4 h-4 text-warning" />,
        trend: { value: 15.3, direction: 'down' },
        color: 'orange',
        action: () => setActiveTab('tickets'),
      },
    ],
    [metrics]
  );

  // Mobile menu items
  const menuItems: MobileMenuItem[] = useMemo(
    () => [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <BarChart3 className="w-5 h-5" />,
        action: () => setActiveTab('overview'),
      },
      {
        id: 'customers',
        label: 'Customers',
        icon: <Users className="w-5 h-5" />,
        badge: customers.length.toString(),
        action: () => setActiveTab('customers'),
        children: [
          {
            id: 'all-customers',
            label: 'All Customers',
            icon: <Users className="w-4 h-4" />,
            action: () => setActiveTab('customers'),
          },
          {
            id: 'add-customer',
            label: 'Add Customer',
            icon: <Plus className="w-4 h-4" />,
            action: () => {
              // TODO: Implement add customer
            },
          },
        ],
      },
      {
        id: 'support',
        label: 'Support',
        icon: <MessageSquare className="w-5 h-5" />,
        badge: tickets.length.toString(),
        action: () => setActiveTab('tickets'),
        children: [
          {
            id: 'tickets',
            label: 'Tickets',
            icon: <MessageSquare className="w-4 h-4" />,
            badge: tickets.filter(t => t.status === 'open').length.toString(),
            action: () => setActiveTab('tickets'),
          },
          {
            id: 'create-ticket',
            label: 'Create Ticket',
            icon: <Plus className="w-4 h-4" />,
            action: () => {
              // TODO: Implement create ticket
            },
          },
        ],
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: <BarChart3 className="w-5 h-5" />,
        action: () => {
          // TODO: Implement analytics navigation
        },
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: <Settings className="w-5 h-5" />,
        action: () => {
          // TODO: Implement settings navigation
        },
      },
    ],
    [customers.length, tickets]
  );

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  // Filter data based on search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    return customers.filter(
      customer =>
        customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customers, searchQuery]);

  const filteredTickets = useMemo(() => {
    if (!searchQuery) return tickets;
    return tickets.filter(
      ticket =>
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.customer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tickets, searchQuery]);

  return (
    <div className={`min-h-screen bg-muted ${className}`}>
      <MobileHeader
        onMenuToggle={() => setShowMenu(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showSearch={showSearch}
        onSearchToggle={() => setShowSearch(!showSearch)}
      />

      <MobileMenu isOpen={showMenu} onClose={() => setShowMenu(false)} menuItems={menuItems} />

      {/* Tab Navigation */}
      <div className="bg-background border-b border-border px-4">
        <div className="flex space-x-1">
          {[
            { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
            { id: 'tickets', label: 'Tickets', icon: <MessageSquare className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'customers' | 'tickets')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-20">
        {activeTab === 'overview' && (
          <div>
            <MobileQuickStats stats={quickStats} />
            <MobileSystemStatus />
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Customers</h2>
              <Badge variant="outline">{filteredCustomers.length} total</Badge>
            </div>

            {filteredCustomers.map(customer => (
              <MobileCustomerCard key={customer.id} customer={customer} />
            ))}

            {filteredCustomers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No customers found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Support Tickets</h2>
              <Badge variant="outline">{filteredTickets.length} total</Badge>
            </div>

            {filteredTickets.map(ticket => (
              <MobileTicketCard key={ticket.id} ticket={ticket} />
            ))}

            {filteredTickets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tickets found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6">
        <Button className="w-14 h-14 rounded-full shadow-lg" size="sm">
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};

export default MobileAdminDashboard;
