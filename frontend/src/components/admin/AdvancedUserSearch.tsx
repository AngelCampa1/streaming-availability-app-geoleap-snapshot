'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Search,
  Filter,
  Users,
  UserPlus,
  Download,
  Upload,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Activity,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Star,
  Ban,
} from 'lucide-react';

// Import types
import type { CustomerAccount } from '../../lib/types/support';

interface SearchFilters {
  query: string;
  status: string[];
  tier: string[];
  country: string[];
  registrationDate: {
    start?: string;
    end?: string;
  };
  lastActivity: {
    start?: string;
    end?: string;
  };
  totalSpent: {
    min?: number;
    max?: number;
  };
  tags: string[];
  hasPaymentIssues: boolean;
  hasActiveSubscription: boolean;
  sortBy: 'name' | 'email' | 'created' | 'lastActivity' | 'totalSpent';
  sortOrder: 'asc' | 'desc';
}

interface UserAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: (user: CustomerAccount) => void;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  style?: 'default' | 'destructive';
  permissions?: string[];
}

interface AdvancedUserSearchProps {
  className?: string;
  onUserSelect?: (user: CustomerAccount) => void;
  permissions?: string[];
}

// Enhanced customer data with additional fields
interface ExtendedCustomerAccount extends CustomerAccount {
  country?: string;
  city?: string;
  lastActivity?: string;
  totalSpent: number;
  subscriptionCount: number;
  paymentIssues: number;
  tags: string[];
  riskScore: number;
  lifetimeValue: number;
  avatarUrl?: string;
}

// Mock data generator
const generateExtendedCustomers = (): ExtendedCustomerAccount[] => {
  const countries = ['US', 'GB', 'CA', 'DE', 'FR', 'JP', 'AU', 'NL'];
  const cities = {
    US: ['New York', 'Los Angeles', 'Chicago', 'Houston'],
    GB: ['London', 'Manchester', 'Birmingham', 'Leeds'],
    CA: ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
    DE: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt'],
    FR: ['Paris', 'Lyon', 'Marseille', 'Toulouse'],
    JP: ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya'],
    AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
    NL: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht'],
  };

  const tags = ['VIP', 'High Value', 'At Risk', 'New Customer', 'Loyal', 'Support Priority', 'Beta User'];
  const names = [
    'John Doe',
    'Jane Smith',
    'Bob Johnson',
    'Alice Brown',
    'Charlie Wilson',
    'Diana Davis',
    'Edward Miller',
    'Fiona Garcia',
    'George Martinez',
    'Helen Lopez',
  ];

  return Array.from({ length: 50 }, (_, i) => {
    const country = countries[Math.floor(Math.random() * countries.length)];
    const cityOptions = cities[country as keyof typeof cities] || ['Unknown City'];
    const city = cityOptions[Math.floor(Math.random() * cityOptions.length)];
    const name = names[i % names.length];

    return {
      id: `cust_${String(i + 1).padStart(3, '0')}`,
      email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
      name,
      phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      createdAt: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
      status: ['active', 'suspended', 'cancelled'][Math.floor(Math.random() * 3)] as
        | 'active'
        | 'suspended'
        | 'cancelled',
      tier: ['free', 'basic', 'premium', 'enterprise'][Math.floor(Math.random() * 4)] as
        | 'free'
        | 'basic'
        | 'premium'
        | 'enterprise',
      totalPaid: Math.floor(Math.random() * 2000) + 50,
      lastPaymentDate: new Date(2024, 0, Math.floor(Math.random() * 28) + 1).toISOString(),
      nextBillingDate: new Date(2024, 1, Math.floor(Math.random() * 28) + 1).toISOString(),
      country,
      city,
      lastActivity: new Date(2024, 0, Math.floor(Math.random() * 28) + 1).toISOString(),
      totalSpent: Math.floor(Math.random() * 5000) + 100,
      subscriptionCount: Math.floor(Math.random() * 3) + 1,
      paymentIssues: Math.floor(Math.random() * 5),
      tags: tags.slice(0, Math.floor(Math.random() * 3) + 1),
      riskScore: Math.floor(Math.random() * 100),
      lifetimeValue: Math.floor(Math.random() * 10000) + 500,
    };
  });
};

const UserCard: React.FC<{
  user: ExtendedCustomerAccount;
  onSelect?: (user: CustomerAccount) => void;
  actions: UserAction[];
  compact?: boolean;
}> = ({ user, onSelect, actions, compact = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);

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

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-error';
    if (score >= 40) return 'text-warning';
    return 'text-success';
  };

  return (
    <Card className="p-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
            {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4
                  className="font-medium text-foreground cursor-pointer hover:text-primary"
                  onClick={() => onSelect?.(user)}
                >
                  {user.name || 'N/A'}
                </h4>
                {user.tags.includes('VIP') && <Star className="w-4 h-4 text-warning" />}
                {user.paymentIssues > 0 && <AlertTriangle className="w-4 h-4 text-error" />}
              </div>

              <div className="text-sm text-foreground-muted space-y-1">
                <div className="flex items-center space-x-2">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{user.email}</span>
                </div>

                {!compact && (
                  <>
                    {user.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3 h-3" />
                        <span>{user.phone}</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {user.city}, {user.country}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Tags */}
              {user.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {user.tags.slice(0, compact ? 2 : undefined).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  \n{' '}
                  {compact && user.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{user.tags.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Status and Actions */}
            <div className="flex flex-col items-end space-y-2">
              <div className="flex items-center space-x-2">
                <Badge className={statusColors[user.status]}>{user.status}</Badge>
                <Badge className={tierColors[user.tier]}>{user.tier}</Badge>
              </div>

              <div className="flex items-center space-x-1">
                <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>

                <div className="relative">
                  <Button variant="ghost" size="sm" onClick={() => setShowActions(!showActions)}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>

                  {showActions && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-background rounded-lg shadow-lg border border-border z-10">
                      <div className="py-1">
                        {actions.map(action => (
                          <button
                            key={action.id}
                            onClick={() => {
                              action.action(user);
                              setShowActions(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center space-x-2 ${
                              action.style === 'destructive' ? 'text-destructive' : 'text-foreground'
                            }`}
                          >
                            {action.icon}
                            <span>{action.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Expanded Details */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Spent:</span>
                <div className="font-medium">${user.totalSpent.toLocaleString()}</div>
              </div>

              <div>
                <span className="text-muted-foreground">Lifetime Value:</span>
                <div className="font-medium">${user.lifetimeValue.toLocaleString()}</div>
              </div>

              <div>
                <span className="text-muted-foreground">Subscriptions:</span>
                <div className="font-medium">{user.subscriptionCount}</div>
              </div>

              <div>
                <span className="text-muted-foreground">Risk Score:</span>
                <div className={`font-medium ${getRiskColor(user.riskScore)}`}>{user.riskScore}/100</div>
              </div>

              <div>
                <span className="text-muted-foreground">Joined:</span>
                <div className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</div>
              </div>

              <div>
                <span className="text-muted-foreground">Last Activity:</span>
                <div className="font-medium">
                  {user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'N/A'}
                </div>
              </div>

              <div>
                <span className="text-muted-foreground">Payment Issues:</span>
                <div className={`font-medium ${user.paymentIssues > 0 ? 'text-error' : 'text-success'}`}>
                  {user.paymentIssues}
                </div>
              </div>

              <div>
                <span className="text-muted-foreground">Next Billing:</span>
                <div className="font-medium">
                  {user.nextBillingDate ? new Date(user.nextBillingDate).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const SearchStats: React.FC<{
  totalUsers: number;
  filteredUsers: number;
  activeUsers: number;
  totalRevenue: number;
}> = ({ totalUsers, filteredUsers, activeUsers, totalRevenue }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="p-4">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-primary" />
          <div>
            <div className="text-2xl font-bold text-foreground">{filteredUsers.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">
              {filteredUsers === totalUsers ? 'Total Users' : `of ${totalUsers.toLocaleString()}`}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-success" />
          <div>
            <div className="text-2xl font-bold text-foreground">{activeUsers.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Active Users</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <div>
            <div className="text-2xl font-bold text-foreground">${totalRevenue.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-warning" />
          <div>
            <div className="text-2xl font-bold text-foreground">
              ${Math.round(totalRevenue / Math.max(filteredUsers, 1)).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Avg. Revenue</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export const AdvancedUserSearch: React.FC<AdvancedUserSearchProps> = ({
  className = '',
  onUserSelect,
  permissions: _permissions = [],
}) => {
  const [users, setUsers] = useState<ExtendedCustomerAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, _setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    status: [],
    tier: [],
    country: [],
    registrationDate: {},
    lastActivity: {},
    totalSpent: {},
    tags: [],
    hasPaymentIssues: false,
    hasActiveSubscription: false,
    sortBy: 'created',
    sortOrder: 'desc',
  });

  // Load mock data
  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setUsers(generateExtendedCustomers());
      setLoading(false);
    }, 1000);
  }, []);

  // User actions
  const userActions: UserAction[] = useMemo(
    () => [
      {
        id: 'view',
        label: 'View Profile',
        icon: <Eye className="w-4 h-4" />,
        action: _user => {
          // TODO: Implement view user profile
        },
      },
      {
        id: 'edit',
        label: 'Edit Profile',
        icon: <Edit className="w-4 h-4" />,
        action: _user => {
          // TODO: Implement edit user profile
        },
      },
      {
        id: 'send_email',
        label: 'Send Email',
        icon: <Mail className="w-4 h-4" />,
        action: _user => {
          // TODO: Implement send email to user
        },
      },
      {
        id: 'suspend',
        label: 'Suspend Account',
        icon: <Ban className="w-4 h-4" />,
        action: _user => {
          // TODO: Implement suspend user account
        },
        style: 'destructive',
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to suspend this account?',
      },
      {
        id: 'delete',
        label: 'Delete Account',
        icon: <Trash2 className="w-4 h-4" />,
        action: _user => {
          // TODO: Implement delete user account
        },
        style: 'destructive',
        requiresConfirmation: true,
        confirmationMessage: 'This action cannot be undone. Are you sure?',
      },
    ],
    []
  );

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    const filtered = users.filter(user => {
      // Text search
      if (filters.query) {
        const query = filters.query.toLowerCase();
        const searchFields = [
          user.name || '',
          user.email,
          user.phone || '',
          user.city || '',
          user.country || '',
          ...user.tags,
        ]
          .join(' ')
          .toLowerCase();

        if (!searchFields.includes(query)) return false;
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(user.status)) {
        return false;
      }

      // Tier filter
      if (filters.tier.length > 0 && !filters.tier.includes(user.tier)) {
        return false;
      }

      // Country filter
      if (filters.country.length > 0 && !filters.country.includes(user.country || '')) {
        return false;
      }

      // Registration date filter
      if (filters.registrationDate.start) {
        if (new Date(user.createdAt) < new Date(filters.registrationDate.start)) {
          return false;
        }
      }
      if (filters.registrationDate.end) {
        if (new Date(user.createdAt) > new Date(filters.registrationDate.end)) {
          return false;
        }
      }

      // Total spent filter
      if (filters.totalSpent.min !== undefined && user.totalSpent < filters.totalSpent.min) {
        return false;
      }
      if (filters.totalSpent.max !== undefined && user.totalSpent > filters.totalSpent.max) {
        return false;
      }

      // Payment issues filter
      if (filters.hasPaymentIssues && user.paymentIssues === 0) {
        return false;
      }

      // Active subscription filter
      if (filters.hasActiveSubscription && user.status !== 'active') {
        return false;
      }

      return true;
    });

    // Sort results
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (filters.sortBy) {
        case 'name':
          aVal = a.name || a.email;
          bVal = b.name || b.email;
          break;
        case 'email':
          aVal = a.email;
          bVal = b.email;
          break;
        case 'created':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'lastActivity':
          aVal = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
          bVal = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
          break;
        case 'totalSpent':
          aVal = a.totalSpent;
          bVal = b.totalSpent;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return filters.sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return filters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return filtered;
  }, [users, filters]);

  // Calculate stats
  const stats = useMemo(() => {
    const activeUsers = filteredUsers.filter(u => u.status === 'active').length;
    const totalRevenue = filteredUsers.reduce((sum, u) => sum + u.totalSpent, 0);

    return {
      totalUsers: users.length,
      filteredUsers: filteredUsers.length,
      activeUsers,
      totalRevenue,
    };
  }, [users, filteredUsers]);

  // Handle bulk actions
  const handleBulkAction = useCallback(
    (_actionId: string) => {
      const _selectedUserObjects = users.filter(u => selectedUsers.has(u.id));
      // TODO: Implement bulk action on _selectedUserObjects.length users
      setSelectedUsers(new Set());
    },
    [users, selectedUsers]
  );

  // Handle export
  const handleExport = useCallback(() => {
    const _csvData = filteredUsers.map(user => ({
      Name: user.name || '',
      Email: user.email,
      Status: user.status,
      Tier: user.tier,
      'Total Spent': user.totalSpent,
      Country: user.country || '',
      'Created At': user.createdAt,
      'Last Activity': user.lastActivity || '',
    }));

    // In a real app, you'd generate and download the CSV file
    // CSV data prepared with filteredUsers.length rows
  }, [filteredUsers]);

  const uniqueCountries = useMemo(() => Array.from(new Set(users.map(u => u.country).filter(Boolean))), [users]);

  const _uniqueTags = useMemo(() => Array.from(new Set(users.flatMap(u => u.tags))), [users]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-foreground-muted">Search, filter, and manage customer accounts</p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>

          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Main Search */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, phone, location, or tags..."
                value={filters.query}
                onChange={e => setFilters(prev => ({ ...prev, query: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-primary/10 border-primary/20 text-primary' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>

            <Button variant="ghost" onClick={() => setLoading(true)} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-border">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <div className="space-y-2">
                  {['active', 'suspended', 'cancelled'].map(status => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status)}
                        onChange={e => {
                          const newStatus = e.target.checked
                            ? [...filters.status, status]
                            : filters.status.filter(s => s !== status);
                          setFilters(prev => ({ ...prev, status: newStatus }));
                        }}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm capitalize">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tier Filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tier</label>
                <div className="space-y-2">
                  {['free', 'basic', 'premium', 'enterprise'].map(tier => (
                    <label key={tier} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.tier.includes(tier)}
                        onChange={e => {
                          const newTier = e.target.checked
                            ? [...filters.tier, tier]
                            : filters.tier.filter(t => t !== tier);
                          setFilters(prev => ({ ...prev, tier: newTier }));
                        }}
                        className="rounded border-border text-primary focus:ring-ring"
                      />
                      <span className="ml-2 text-sm capitalize">{tier}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Country Filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Country</label>
                <select
                  multiple
                  value={filters.country}
                  onChange={e =>
                    setFilters(prev => ({
                      ...prev,
                      country: Array.from(e.target.selectedOptions, option => option.value),
                    }))
                  }
                  className="w-full border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                  size={4}
                >
                  {uniqueCountries.map(country => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              {/* Spending Range */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Total Spent Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.totalSpent.min || ''}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        totalSpent: {
                          ...prev.totalSpent,
                          min: e.target.value ? Number(e.target.value) : undefined,
                        },
                      }))
                    }
                    className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.totalSpent.max || ''}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        totalSpent: {
                          ...prev.totalSpent,
                          max: e.target.value ? Number(e.target.value) : undefined,
                        },
                      }))
                    }
                    className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                  />
                </div>
              </div>

              {/* Special Filters */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Special Filters</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.hasPaymentIssues}
                      onChange={e => setFilters(prev => ({ ...prev, hasPaymentIssues: e.target.checked }))}
                      className="rounded border-border text-primary focus:ring-ring"
                    />
                    <span className="ml-2 text-sm">Has Payment Issues</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.hasActiveSubscription}
                      onChange={e => setFilters(prev => ({ ...prev, hasActiveSubscription: e.target.checked }))}
                      className="rounded border-border text-primary focus:ring-ring"
                    />
                    <span className="ml-2 text-sm">Has Active Subscription</span>
                  </label>
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Sort By</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={filters.sortBy}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        sortBy: e.target.value as 'name' | 'email' | 'created' | 'lastActivity' | 'totalSpent',
                      }))
                    }
                    className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                  >
                    <option value="name">Name</option>
                    <option value="email">Email</option>
                    <option value="created">Created Date</option>
                    <option value="lastActivity">Last Activity</option>
                    <option value="totalSpent">Total Spent</option>
                  </select>
                  <select
                    value={filters.sortOrder}
                    onChange={e => setFilters(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
                    className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Stats */}
      <SearchStats {...stats} />

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-foreground">
                {selectedUsers.size} user{selectedUsers.size === 1 ? '' : 's'} selected
              </span>
              <Button variant="outline" size="sm" onClick={() => setSelectedUsers(new Set())}>
                Clear Selection
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('send_email')}>
                <Mail className="w-4 h-4 mr-1" />
                Send Email
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('export')}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Results */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-foreground-muted">Loading users...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted" />
            <h3 className="text-xl font-medium text-foreground mb-2">No users found</h3>
            <p className="text-muted-foreground mb-6">
              {users.length === 0
                ? 'There are no users in the system yet.'
                : 'Try adjusting your search criteria or filters.'}
            </p>
            <Button
              onClick={() =>
                setFilters({
                  query: '',
                  status: [],
                  tier: [],
                  country: [],
                  registrationDate: {},
                  lastActivity: {},
                  totalSpent: {},
                  tags: [],
                  hasPaymentIssues: false,
                  hasActiveSubscription: false,
                  sortBy: 'created',
                  sortOrder: 'desc',
                })
              }
            >
              Reset Filters
            </Button>
          </Card>
        ) : (
          filteredUsers.map(user => (
            <UserCard
              key={user.id}
              user={user}
              onSelect={onUserSelect}
              actions={userActions}
              compact={viewMode === 'list'}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AdvancedUserSearch;
