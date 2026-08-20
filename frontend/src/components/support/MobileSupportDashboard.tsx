'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Search,
  User,
  CreditCard,
  DollarSign,
  RefreshCw,
  Phone,
  Mail,
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Menu,
  X,
  Shield,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { CustomerAccount, SupportUser, SupportMetrics } from '../../lib/types/support';
import { CustomerBillingOverview } from './CustomerBillingOverview';
import { ManualPaymentProcessor } from './ManualPaymentProcessor';
import { RefundProcessor } from './RefundProcessor';

interface MobileSupportDashboardProps {
  currentUser: SupportUser;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  requiresCustomer: boolean;
  permission?: string;
}

export const MobileSupportDashboard: React.FC<MobileSupportDashboardProps> = ({ currentUser }) => {
  const [activeCustomer, setActiveCustomer] = useState<CustomerAccount | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'customer' | 'action'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const quickActions: QuickAction[] = [
    {
      id: 'search',
      label: 'Customer Search',
      icon: Search,
      action: () => setCurrentView('dashboard'),
      requiresCustomer: false,
    },
    {
      id: 'billing',
      label: 'Billing Overview',
      icon: CreditCard,
      action: () => setActiveAction('billing'),
      requiresCustomer: true,
      permission: 'view_billing_details',
    },
    {
      id: 'payment',
      label: 'Process Payment',
      icon: DollarSign,
      action: () => setActiveAction('payment'),
      requiresCustomer: true,
      permission: 'process_payments',
    },
    {
      id: 'refund',
      label: 'Process Refund',
      icon: RefreshCw,
      action: () => setActiveAction('refund'),
      requiresCustomer: true,
      permission: 'process_refunds',
    },
  ];

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

  const handleCustomerSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/support/customers/search?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const customers = await response.json();
        if (customers.length === 1) {
          setActiveCustomer(customers[0]);
          setCurrentView('customer');
        } else if (customers.length > 1) {
          // For mobile, just take the first match
          setActiveCustomer(customers[0]);
          setCurrentView('customer');
        }
      }
    } catch (error) {
      console.error('Customer search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true;
    return currentUser.role.permissions.some(p => p.name === permission);
  };

  const renderHeader = () => (
    <div className="bg-card shadow-sm border-b sticky top-0 z-10">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {currentView !== 'dashboard' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (activeAction) {
                    setActiveAction(null);
                  } else if (currentView === 'customer') {
                    setCurrentView('dashboard');
                  }
                }}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-lg font-bold text-foreground">Support</h1>
              <p className="text-xs text-muted-foreground">{currentUser.name}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {activeCustomer && (
              <Button variant="ghost" size="sm" onClick={() => setShowSensitiveData(!showSensitiveData)}>
                {showSensitiveData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={() => setShowMenu(!showMenu)}>
              {showMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Active Customer Indicator */}
        {activeCustomer && (
          <div className="mt-2 p-2 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-foreground truncate">
                    {activeCustomer.name || 'Unknown Customer'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{activeCustomer.email}</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`text-xs ${activeCustomer.status === 'active' ? 'text-success' : 'text-muted-foreground'}`}
              >
                {activeCustomer.status}
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      {showMenu && (
        <div className="border-t bg-card">
          <div className="p-4 space-y-2">
            <Button variant="ghost" className="w-full justify-start text-sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="ghost" className="w-full justify-start text-sm">
              <Activity className="w-4 h-4 mr-2" />
              Activity Log
            </Button>
            <Button variant="ghost" className="w-full justify-start text-sm">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderDashboardView = () => (
    <div className="p-4 space-y-4">
      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search customer by email or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleCustomerSearch(searchQuery)}
                className="pl-10"
              />
            </div>

            <Button
              onClick={() => handleCustomerSearch(searchQuery)}
              disabled={isSearching || !searchQuery.trim()}
              className="w-full"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              Search Customer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{metrics.totalCustomers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Customers</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-lg font-bold text-success">${(metrics.monthlyRevenue / 1000).toFixed(1)}K</p>
                <p className="text-xs text-muted-foreground">Monthly Revenue</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-lg font-bold text-error">{metrics.failedPayments}</p>
                <p className="text-xs text-muted-foreground">Failed Payments</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-lg font-bold text-warning">{metrics.pendingRefunds}</p>
                <p className="text-xs text-muted-foreground">Pending Refunds</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {quickActions
              .filter(action => !action.requiresCustomer || activeCustomer)
              .filter(action => hasPermission(action.permission))
              .map(action => (
                <Button
                  key={action.id}
                  variant="outline"
                  onClick={action.action}
                  className="h-16 flex-col space-y-1"
                  disabled={action.requiresCustomer && !activeCustomer}
                >
                  <action.icon className="w-5 h-5" />
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-foreground">Payment processed</p>
                <p className="text-xs text-muted-foreground">2 minutes ago</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-sm">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-3 h-3 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-foreground">Customer account updated</p>
                <p className="text-xs text-muted-foreground">15 minutes ago</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-sm">
              <div className="w-6 h-6 bg-error/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-3 h-3 text-error" />
              </div>
              <div className="flex-1">
                <p className="text-foreground">Payment failed</p>
                <p className="text-xs text-muted-foreground">1 hour ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCustomerView = () => {
    if (!activeCustomer) return null;

    return (
      <div className="p-4 space-y-4">
        {/* Customer Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{activeCustomer.name || 'Unknown Customer'}</h3>
                <p className="text-sm text-muted-foreground break-all">
                  {showSensitiveData ? activeCustomer.email : activeCustomer.email.replace(/(.{2}).*@/, '$1***@')}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge
                    className={`text-xs ${
                      activeCustomer.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {activeCustomer.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {activeCustomer.tier}
                  </Badge>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="font-semibold text-lg">${activeCustomer.totalPaid.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Contact */}
        {activeCustomer.phone && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="flex items-center justify-center space-x-2"
              onClick={() => window.open(`tel:${activeCustomer.phone}`)}
            >
              <Phone className="w-4 h-4" />
              <span>Call</span>
            </Button>

            <Button
              variant="outline"
              className="flex items-center justify-center space-x-2"
              onClick={() => window.open(`mailto:${activeCustomer.email}`)}
            >
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {quickActions
            .filter(action => action.requiresCustomer)
            .filter(action => hasPermission(action.permission))
            .map(action => (
              <Button key={action.id} variant="outline" onClick={action.action} className="h-16 flex-col space-y-1">
                <action.icon className="w-5 h-5" />
                <span className="text-xs">{action.label}</span>
              </Button>
            ))}
        </div>
      </div>
    );
  };

  const renderActionView = () => {
    if (!activeAction || !activeCustomer) return null;

    switch (activeAction) {
      case 'billing':
        return (
          <div className="p-4">
            <CustomerBillingOverview
              customer={activeCustomer}
              showSensitiveData={showSensitiveData}
              onActionComplete={() => {
                // Handle action completion
              }}
            />
          </div>
        );

      case 'payment':
        return (
          <div className="p-4">
            <ManualPaymentProcessor
              customer={activeCustomer}
              onPaymentProcessed={() => {
                setActiveAction(null);
                setCurrentView('customer');
              }}
            />
          </div>
        );

      case 'refund':
        return (
          <div className="p-4">
            <RefundProcessor
              customerId={activeCustomer.id}
              onRefundProcessed={() => {
                setActiveAction(null);
                setCurrentView('customer');
              }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderHeader()}

      <div className="pb-safe">
        {currentView === 'dashboard' && renderDashboardView()}
        {currentView === 'customer' && !activeAction && renderCustomerView()}
        {activeAction && renderActionView()}
      </div>
    </div>
  );
};

export default MobileSupportDashboard;
