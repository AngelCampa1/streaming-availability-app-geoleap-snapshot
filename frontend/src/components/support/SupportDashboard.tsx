'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert } from '../ui/alert';
import { Input } from '../ui/input';
import { CustomerBillingOverview } from './CustomerBillingOverview';
import { PaymentMethodManager } from './PaymentMethodManager';
import { ManualPaymentProcessor } from './ManualPaymentProcessor';
import { SubscriptionModifier } from './SubscriptionModifier';
import { InvoiceManager } from './InvoiceManager';
import { RefundProcessor } from './RefundProcessor';
import { SupportActionHistory } from './SupportActionHistory';
import {
  Search,
  User,
  CreditCard,
  FileText,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Settings,
  Users,
  Shield,
  Eye,
  EyeOff,
  Bell,
  Activity,
  Loader2,
  Menu,
  X,
  Filter,
} from 'lucide-react';
import { CustomerAccount, SupportMetrics, SupportUser, CustomerSearchFilters } from '../../lib/types/support';
import { usePermissions } from '../../hooks/usePermissions';

interface SupportDashboardProps {
  currentUser: SupportUser;
  isMobile?: boolean;
}

export const SupportDashboard: React.FC<SupportDashboardProps> = ({ currentUser, isMobile = false }) => {
  // State management
  const [activeCustomer, setActiveCustomer] = useState<CustomerAccount | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFilters, _setSearchFilters] = useState<CustomerSearchFilters>({});
  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: 'info' | 'warning' | 'error';
      message: string;
      timestamp: string;
    }>
  >([]);

  const { hasPermission } = usePermissions();

  // Load metrics on component mount
  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/support/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  // Customer search functionality
  const handleCustomerSearch = async (query: string, filters?: CustomerSearchFilters) => {
    if (!query.trim() && !filters) return;

    setIsSearching(true);
    try {
      const searchParams = new URLSearchParams();
      if (query) searchParams.append('query', query);
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, Array.isArray(value) ? value.join(',') : String(value));
          }
        });
      }

      const response = await fetch(`/api/support/customers/search?${searchParams}`);
      if (response.ok) {
        const customers = await response.json();
        if (customers.length === 1) {
          setActiveCustomer(customers[0]);
          setActiveTab('overview');
        } else if (customers.length > 1) {
          // Show customer selection modal
          // For now, just take the first one
          setActiveCustomer(customers[0]);
        }
      }
    } catch (error) {
      console.error('Customer search failed:', error);
      addNotification('error', 'Customer search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const addNotification = (type: 'info' | 'warning' | 'error', message: string) => {
    const notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date().toISOString(),
    };
    setNotifications(prev => [notification, ...prev.slice(0, 9)]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  // Tab navigation
  const tabs = [
    { id: 'overview', label: 'Overview', icon: User, permission: 'view_customer_overview' },
    { id: 'billing', label: 'Billing', icon: CreditCard, permission: 'view_billing_details' },
    { id: 'payments', label: 'Payments', icon: DollarSign, permission: 'process_payments' },
    { id: 'subscriptions', label: 'Subscriptions', icon: Settings, permission: 'modify_subscriptions' },
    { id: 'invoices', label: 'Invoices', icon: FileText, permission: 'manage_invoices' },
    { id: 'refunds', label: 'Refunds', icon: RefreshCw, permission: 'process_refunds' },
    { id: 'history', label: 'History', icon: Activity, permission: 'view_action_history' },
  ].filter(tab => hasPermission(tab.permission));

  const renderMetricsCards = () => {
    if (!metrics) return null;

    const metricCards = [
      {
        title: 'Active Customers',
        value: metrics.totalCustomers.toLocaleString(),
        icon: Users,
        color: 'blue',
      },
      {
        title: 'Monthly Revenue',
        value: `$${(metrics.monthlyRevenue / 1000).toFixed(1)}K`,
        icon: DollarSign,
        color: 'green',
      },
      {
        title: 'Failed Payments',
        value: metrics.failedPayments.toString(),
        icon: AlertTriangle,
        color: 'red',
      },
      {
        title: 'Pending Refunds',
        value: metrics.pendingRefunds.toString(),
        icon: Clock,
        color: 'yellow',
      },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metricCards.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  metric.color === 'blue' ? 'bg-primary/10' :
                  metric.color === 'green' ? 'bg-success/10' :
                  metric.color === 'red' ? 'bg-destructive/10' :
                  'bg-warning/10'
                }`}>
                  <metric.icon className={`w-5 h-5 ${
                    metric.color === 'blue' ? 'text-primary' :
                    metric.color === 'green' ? 'text-success' :
                    metric.color === 'red' ? 'text-destructive' :
                    'text-warning'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                  <p className="text-xl font-bold text-foreground">{metric.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderCustomerSearch = () => (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/60 w-4 h-4" />
              <Input
                placeholder="Search by email, customer ID, or phone number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleCustomerSearch(searchQuery)}
                className="pl-10"
              />
            </div>
          </div>
          <Button
            onClick={() => handleCustomerSearch(searchQuery, searchFilters)}
            disabled={isSearching || (!searchQuery.trim() && Object.keys(searchFilters).length === 0)}
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {activeCustomer && (
          <div className="mt-4 p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{activeCustomer.name || 'Unknown Customer'}</p>
                  <p className="text-sm text-muted-foreground">{activeCustomer.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant={activeCustomer.status === 'active' ? 'default' : 'destructive'} className="text-xs">
                      {activeCustomer.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {activeCustomer.tier}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {hasPermission('view_sensitive_data') && (
                  <Button variant="outline" size="sm" onClick={() => setShowSensitiveData(!showSensitiveData)}>
                    {showSensitiveData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setActiveCustomer(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderTabNavigation = () => (
    <Card className="mb-6">
      <CardContent className="p-0">
        <div className="border-b">
          {isMobile ? (
            <div className="p-4">
              <Button
                variant="outline"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-full justify-start"
              >
                <Menu className="w-4 h-4 mr-2" />
                {tabs.find(t => t.id === activeTab)?.label || 'Select Tab'}
              </Button>
              {mobileMenuOpen && (
                <div className="mt-2 space-y-1">
                  {tabs.map(tab => (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? 'default' : 'ghost'}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      disabled={!activeCustomer && tab.id !== 'overview'}
                      className="w-full justify-start"
                    >
                      <tab.icon className="w-4 h-4 mr-2" />
                      {tab.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <nav className="flex space-x-1 p-4">
              {tabs.map(tab => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={!activeCustomer && tab.id !== 'overview'}
                  className="flex items-center space-x-2"
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Button>
              ))}
            </nav>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderTabContent = () => {
    if (!activeCustomer && activeTab !== 'overview') {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Customer Selected</h3>
            <p className="text-muted-foreground">
              Search for a customer to view their information and perform support actions.
            </p>
          </CardContent>
        </Card>
      );
    }

    switch (activeTab) {
      case 'overview':
        return activeCustomer ? (
          <CustomerBillingOverview
            customer={activeCustomer}
            showSensitiveData={showSensitiveData}
            onActionComplete={action => {
              addNotification('info', `${action} completed successfully`);
              loadMetrics(); // Refresh metrics
            }}
          />
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Welcome to Support Dashboard</h3>
              <p className="text-muted-foreground">Search for a customer above to get started with support tasks.</p>
            </CardContent>
          </Card>
        );

      case 'billing':
        return (
          <PaymentMethodManager
            customerId={activeCustomer!.id}
            showSensitiveData={showSensitiveData}
            onUpdate={() => addNotification('info', 'Payment methods updated')}
          />
        );

      case 'payments':
        return (
          <ManualPaymentProcessor
            customer={activeCustomer!}
            onPaymentProcessed={amount => {
              addNotification('info', `Payment of $${amount} processed successfully`);
              loadMetrics();
            }}
          />
        );

      case 'subscriptions':
        return (
          <SubscriptionModifier
            customerId={activeCustomer!.id}
            onModificationComplete={type => {
              addNotification('info', `Subscription ${type} completed`);
              loadMetrics();
            }}
          />
        );

      case 'invoices':
        return (
          <InvoiceManager
            customerId={activeCustomer!.id}
            onInvoiceAction={action => {
              addNotification('info', `Invoice ${action} completed`);
            }}
          />
        );

      case 'refunds':
        return (
          <RefundProcessor
            customerId={activeCustomer!.id}
            onRefundProcessed={amount => {
              addNotification('info', `Refund of $${amount} processed`);
              loadMetrics();
            }}
          />
        );

      case 'history':
        return <SupportActionHistory customerId={activeCustomer!.id} />;

      default:
        return null;
    }
  };

  const renderNotifications = () => {
    if (notifications.length === 0) return null;

    return (
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {notifications.slice(0, 3).map(notification => (
          <Alert
            key={notification.id}
            className={`min-w-80 ${
              notification.type === 'error'
                ? 'border-destructive/30 bg-destructive/10'
                : notification.type === 'warning'
                  ? 'border-warning/30 bg-warning/10'
                  : 'border-primary/30 bg-primary/10'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            ) : notification.type === 'warning' ? (
              <Clock className="w-4 h-4 text-warning" />
            ) : (
              <CheckCircle className="w-4 h-4 text-primary" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(notification.timestamp).toLocaleTimeString()}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
              className="ml-2"
            >
              <X className="w-3 h-3" />
            </Button>
          </Alert>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Customer Support Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Logged in as {currentUser.name} ({currentUser.role.name})
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="text-success border-success/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                Online
              </Badge>
              {notifications.length > 0 && (
                <Button variant="outline" size="sm">
                  <Bell className="w-4 h-4" />
                  <span className="ml-1">{notifications.length}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 max-w-7xl mx-auto">
        {/* Metrics Overview */}
        {renderMetricsCards()}

        {/* Customer Search */}
        {renderCustomerSearch()}

        {/* Tab Navigation */}
        {renderTabNavigation()}

        {/* Tab Content */}
        {renderTabContent()}
      </div>

      {/* Notifications */}
      {renderNotifications()}
    </div>
  );
};

export default SupportDashboard;
