'use client';

import React, { useState, useEffect, useMemo } from'react';
import Link from'next/link';
import { usePathname } from'next/navigation';
import { Button } from'../ui/button';
import { Badge } from'../ui/badge';
import {
  BarChart3,
  Users,
  CreditCard,
  MessageSquare,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Activity,
  Shield,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Archive,
  Database,
  Smartphone,
  Monitor,
  Tablet,
  LogOut,
  User,
  HelpCircle,
  Moon,
  Sun,
  Link2,
} from'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  children?: NavigationItem[];
  permissions?: string[];
  description?: string;
  isNew?: boolean;
  isActive?: boolean;
}

interface AdminNavigationBarProps {
  className?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  userRole?: string;
  permissions?: string[];
  deviceType?:'desktop' |'tablet' |'mobile';
  theme?:'light';
  onThemeChange?: (theme:'light') => void;
}

interface NotificationData {
  id: string;
  type:'info' |'warning' |'error' |'success';
  title: string;
  count: number;
}

export const AdminNavigationBar: React.FC<AdminNavigationBarProps> = ({
  className ='',
  collapsed = false,
  onCollapsedChange,
  userRole ='admin',
  permissions = [],
  deviceType ='desktop',
  theme ='light',
  onThemeChange,
}) => {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Mock notifications for demo
  const [notifications, _setNotifications] = useState<NotificationData[]>([
    { id:'1', type:'warning', title:'Payment Issues', count: 3 },
    { id:'2', type:'info', title:'New Registrations', count: 12 },
    { id:'3', type:'error', title:'System Alerts', count: 1 },
  ]);

  // Navigation structure
  const navigationItems: NavigationItem[] = useMemo(
    () => [
      {
        id:'dashboard',
        label:'Dashboard',
        href:'/admin',
        icon: <BarChart3 className="w-5 h-5" />,
        description:'Overview and key metrics',
        children: [
          {
            id:'executive',
            label:'Executive View',
            href:'/admin/dashboard/executive',
            icon: <TrendingUp className="w-4 h-4" />,
            description:'High-level business metrics',
            isNew: true,
          },
          {
            id:'analytics',
            label:'Analytics Hub',
            href:'/admin/dashboard/analytics',
            icon: <Activity className="w-4 h-4" />,
            description:'Detailed analytics and insights',
          },
          {
            id:'mobile',
            label:'Mobile Dashboard',
            href:'/admin/dashboard/mobile',
            icon: <Smartphone className="w-4 h-4" />,
            description:'Mobile-optimized interface',
          },
        ],
      },
      {
        id:'users',
        label:'User Management',
        href:'/admin/users',
        icon: <Users className="w-5 h-5" />,
        badge:'1.2k',
        description:'Manage customer accounts',
        children: [
          {
            id:'all-users',
            label:'All Users',
            href:'/admin/users',
            icon: <Users className="w-4 h-4" />,
            description:'Browse all customer accounts',
          },
          {
            id:'user-search',
            label:'Advanced Search',
            href:'/admin/users/search',
            icon: <Search className="w-4 h-4" />,
            description:'Search and filter users',
          },
          {
            id:'user-roles',
            label:'Roles & Permissions',
            href:'/admin/users/roles',
            icon: <Shield className="w-4 h-4" />,
            description:'Manage user roles',
            permissions: ['admin'],
          },
          {
            id:'user-analytics',
            label:'User Analytics',
            href:'/admin/users/analytics',
            icon: <BarChart3 className="w-4 h-4" />,
            description:'User behavior insights',
          },
          {
            id:'user-behavior',
            label:'User Behavior Analytics',
            href:'/admin/analytics/user-behavior',
            icon: <Activity className="w-4 h-4" />,
            description:'Comprehensive user interaction analytics',
            isNew: true,
          },
        ],
      },
      {
        id:'subscriptions',
        label:'Subscriptions',
        href:'/admin/subscriptions',
        icon: <CreditCard className="w-5 h-5" />,
        description:'Subscription management',
        children: [
          {
            id:'active-subs',
            label:'Active Subscriptions',
            href:'/admin/subscriptions/active',
            icon: <CheckCircle className="w-4 h-4" />,
            description:'Currently active subscriptions',
            badge:'843',
          },
          {
            id:'billing',
            label:'Billing & Invoices',
            href:'/admin/subscriptions/billing',
            icon: <FileText className="w-4 h-4" />,
            description:'Invoice and billing management',
          },
          {
            id:'payment-recovery',
            label:'Payment Recovery',
            href:'/admin/subscriptions/recovery',
            icon: <AlertTriangle className="w-4 h-4" />,
            description:'Failed payment recovery',
            badge:'23',
          },
          {
            id:'dunning',
            label:'Dunning Management',
            href:'/admin/subscriptions/dunning',
            icon: <Clock className="w-4 h-4" />,
            description:'Automated dunning campaigns',
          },
          {
            id:'subscription-analytics',
            label:'Subscription Analytics',
            href:'/admin/subscriptions/analytics',
            icon: <TrendingUp className="w-4 h-4" />,
            description:'Revenue and growth metrics',
          },
        ],
      },
      {
        id:'support',
        label:'Customer Support',
        href:'/admin/support',
        icon: <MessageSquare className="w-5 h-5" />,
        badge: notifications.find(n => n.title ==='Support Tickets')?.count || 0,
        description:'Customer support tools',
        children: [
          {
            id:'tickets',
            label:'Support Tickets',
            href:'/admin/support/tickets',
            icon: <MessageSquare className="w-4 h-4" />,
            description:'Manage support requests',
            badge:'47',
          },
          {
            id:'live-chat',
            label:'Live Chat',
            href:'/admin/support/chat',
            icon: <Activity className="w-4 h-4" />,
            description:'Real-time customer chat',
          },
          {
            id:'knowledge-base',
            label:'Knowledge Base',
            href:'/admin/support/kb',
            icon: <HelpCircle className="w-4 h-4" />,
            description:'Help articles and FAQs',
          },
          {
            id:'support-analytics',
            label:'Support Analytics',
            href:'/admin/support/analytics',
            icon: <BarChart3 className="w-4 h-4" />,
            description:'Support performance metrics',
          },
        ],
      },
      {
        id:'analytics',
        label:'Analytics & Reports',
        href:'/admin/analytics',
        icon: <BarChart3 className="w-5 h-5" />,
        description:'Business intelligence',
        children: [
          {
            id:'revenue-analytics',
            label:'Revenue Analytics',
            href:'/admin/analytics/revenue',
            icon: <TrendingUp className="w-4 h-4" />,
            description:'Revenue trends and forecasts',
          },
          {
            id:'customer-analytics',
            label:'Customer Analytics',
            href:'/admin/analytics/customers',
            icon: <Users className="w-4 h-4" />,
            description:'Customer behavior analysis',
          },
          {
            id:'cohort-analysis',
            label:'Cohort Analysis',
            href:'/admin/analytics/cohorts',
            icon: <Activity className="w-4 h-4" />,
            description:'Customer retention cohorts',
          },
          {
            id:'churn-prediction',
            label:'Churn Prediction',
            href:'/admin/analytics/churn',
            icon: <AlertTriangle className="w-4 h-4" />,
            description:'AI-powered churn forecasts',
          },
          {
            id:'custom-reports',
            label:'Custom Reports',
            href:'/admin/analytics/reports',
            icon: <FileText className="w-4 h-4" />,
            description:'Build custom reports',
          },
        ],
      },
      {
        id:'affiliates',
        label:'Affiliates',
        href:'/admin/affiliates',
        icon: <Link2 className="w-5 h-5" />,
        description:'Affiliate partner management',
        children: [
          {
            id:'affiliates-list',
            label:'Partners',
            href:'/admin/affiliates',
            icon: <Users className="w-4 h-4" />,
            description:'Manage affiliate partners',
          },
          {
            id:'affiliates-dashboard',
            label:'Dashboard',
            href:'/admin/affiliates/dashboard',
            icon: <TrendingUp className="w-4 h-4" />,
            description:'Affiliate performance overview',
          },
        ],
      },
      {
        id:'system',
        label:'System',
        href:'/admin/system',
        icon: <Settings className="w-5 h-5" />,
        description:'System administration',
        permissions: ['admin'],
        children: [
          {
            id:'system-health',
            label:'System Health',
            href:'/admin/system/health',
            icon: <Activity className="w-4 h-4" />,
            description:'System status monitoring',
          },
          {
            id:'audit-logs',
            label:'Audit Logs',
            href:'/admin/system/audit',
            icon: <Archive className="w-4 h-4" />,
            description:'System audit trail',
          },
          {
            id:'database',
            label:'Database Management',
            href:'/admin/system/database',
            icon: <Database className="w-4 h-4" />,
            description:'Database operations',
            permissions: ['superadmin'],
          },
          {
            id:'integrations',
            label:'Integrations',
            href:'/admin/system/integrations',
            icon: <Globe className="w-4 h-4" />,
            description:'Third-party integrations',
          },
          {
            id:'notifications',
            label:'Notification Center',
            href:'/admin/system/notifications',
            icon: <Bell className="w-4 h-4" />,
            description:'System notifications',
          },
        ],
      },
    ],
    [notifications]
  );

  // Filter navigation items based on permissions
  const filteredNavigationItems = useMemo(() => {
    const filterItems = (items: NavigationItem[]): NavigationItem[] => {
      return items.filter(item => {
        // Check permissions for this item
        if (item.permissions && item.permissions.length > 0) {
          const hasPermission = item.permissions.some(
            permission => permissions.includes(permission) || userRole === permission
          );
          if (!hasPermission) return false;
        }

        // Filter children
        if (item.children) {
          item.children = filterItems(item.children);
        }

        return true;
      });
    };

    return filterItems(navigationItems);
  }, [navigationItems, permissions, userRole]);

  // Search functionality
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const results: NavigationItem[] = [];

    const searchInItems = (items: NavigationItem[]) => {
      items.forEach(item => {
        const matchesQuery =
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase());

        if (matchesQuery) {
          results.push(item);
        }

        if (item.children) {
          searchInItems(item.children);
        }
      });
    };

    searchInItems(filteredNavigationItems);
    return results.slice(0, 10); // Limit to 10 results
  }, [searchQuery, filteredNavigationItems]);

  // Toggle expanded state for navigation items
  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Check if current path matches navigation item
  const isActiveRoute = (href: string) => {
    if (href ==='/admin') {
      return pathname ==='/admin';
    }
    return pathname.startsWith(href);
  };

  // Auto-expand parent items for active routes
  useEffect(() => {
    const findAndExpandParent = (items: NavigationItem[]) => {
      items.forEach(item => {
        if (item.children) {
          const hasActiveChild = item.children.some(child => isActiveRoute(child.href));
          if (hasActiveChild) {
            setExpandedItems(prev => new Set([...prev, item.id]));
          }
          findAndExpandParent(item.children);
        }
      });
    };

    findAndExpandParent(filteredNavigationItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, filteredNavigationItems]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Render navigation item
  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const isActive = isActiveRoute(item.href);
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors group ${
            isActive
              ?'bg-accent text-accent-foreground border-r-2 border-accent-foreground'
              :'text-foreground hover:bg-accent hover:text-accent-foreground'
          } ${level > 0 ?'ml-4' :''}`}
        >
          <Link href={item.href} className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0">{item.icon}</div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium truncate">{item.label}</span>
                    {item.isNew && (
                      <Badge className="bg-success/10 text-success   text-xs">
                        New
                      </Badge>
                    )}
                    {item.badge && (
                      <Badge variant="outline" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                </div>
              </>
            )}
          </Link>

          {hasChildren && !collapsed && (
            <Button variant="ghost" size="sm" onClick={() => toggleExpanded(item.id)} className="flex-shrink-0 p-1">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          )}
        </div>

        {hasChildren && isExpanded && !collapsed && (
          <div className="ml-2 mt-1 space-y-1">
            {item.children?.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const totalNotifications = notifications.reduce((sum, n) => sum + n.count, 0);

  const deviceIcon = {
    desktop: <Monitor className="w-4 h-4" />,
    tablet: <Tablet className="w-4 h-4" />,
    mobile: <Smartphone className="w-4 h-4" />,
  };

  return (
    <>
      {/* Mobile Header */}
      {deviceType ==='mobile' && (
        <div className="lg:hidden bg-background border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-6 h-6 text-primary" />
                <span className="font-semibold text-foreground">Admin</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setShowSearch(!showSearch)}>
                <Search className="w-4 h-4" />
              </Button>

              <div className="relative">
                <Button variant="ghost" size="sm">
                  <Bell className="w-4 h-4" />
                  {totalNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-error rounded-full text-xs text-primary-foreground flex items-center justify-center">
                      {totalNotifications > 99 ?'99+' : totalNotifications}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {showSearch && (
            <div className="mt-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search navigation..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Desktop/Tablet Sidebar */}
      <div
        className={`${
          deviceType ==='mobile' ?'hidden' :'flex'
        } flex-col bg-background border-r border-border transition-all duration-300 ${
          collapsed ?'w-16' :'w-64'
        } ${className}`}
      >
        {/* Header */}
        <div className={`p-4 border-b border-border ${collapsed ?'px-2' :''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-primary-foreground" />
              </div>
              {!collapsed && (
                <div>
                  <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
                  <p className="text-xs text-muted-foreground">Management Console</p>
                </div>
              )}
            </div>

            {!collapsed && deviceType ==='desktop' && (
              <Button variant="ghost" size="sm" onClick={() => onCollapsedChange?.(!collapsed)}>
                <Menu className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Search Bar */}
          {!collapsed && (
            <div className="mt-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search navigation..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && searchQuery && (
                <div className="mt-2 bg-muted rounded-lg border border-border max-h-60 overflow-y-auto">
                  {searchResults.map(item => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setSearchQuery('')}
                      className="block px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        {item.icon}
                        <div>
                          <div className="text-sm font-medium">{item.label}</div>
                          {item.description && <div className="text-xs text-muted-foreground">{item.description}</div>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredNavigationItems.map(item => renderNavigationItem(item))}
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t border-border space-y-2 ${collapsed ?'px-2' :''}`}>
          {/* System Status */}
          {!collapsed && (
            <div className="bg-success/10 border border-success/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span className="text-sm font-medium text-success">All Systems Operational</span>
              </div>
              {totalNotifications > 0 && (
                <div className="mt-1 text-xs text-success">
                  {totalNotifications} notification{totalNotifications === 1 ?'' :'s'} pending
                </div>
              )}
            </div>
          )}

          {/* User Menu */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              {!collapsed && (
                <div>
                  <div className="text-sm font-medium text-foreground">Admin User</div>
                  <div className="text-xs text-muted-foreground flex items-center space-x-1">
                    {deviceIcon[deviceType]}
                    <span className="capitalize">{deviceType}</span>
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <div className="flex items-center space-x-1">
                <Button variant="ghost" size="sm" onClick={() => onThemeChange?.('light')}>
                  <Sun className="w-4 h-4" />
                </Button>

                <Button variant="ghost" size="sm">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Overlay Menu */}
      {deviceType ==='mobile' && mobileMenuOpen && (
        <div className="fixed inset-0 z-[1300] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />

          <div className="absolute left-0 top-0 bottom-0 w-80 bg-background shadow-xl">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
                    <p className="text-xs text-muted-foreground">Management Console</p>
                  </div>
                </div>

                <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {filteredNavigationItems.map(item => renderNavigationItem(item))}
            </nav>

            <div className="p-4 border-t border-border">
              <div className="bg-success/10 border border-success/20 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span className="text-sm font-medium text-success">
                    All Systems Operational
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Admin User</div>
                    <div className="text-xs text-muted-foreground">Mobile View</div>
                  </div>
                </div>

                <Button variant="ghost" size="sm">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminNavigationBar;
