'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Alert } from '../ui/alert';
import {
  Activity,
  User,
  Calendar,
  Filter,
  Search,
  Download,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  CreditCard,
  Settings,
  FileText,
  Shield,
  Loader2,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { SupportAction } from '../../lib/types/support';

interface SupportActionHistoryProps {
  customerId: string;
}

interface ActionFilters {
  dateRange: '24h' | '7d' | '30d' | '90d' | 'all';
  actionTypes: string[];
  performedBy: string;
  success?: boolean;
}


export const SupportActionHistory: React.FC<SupportActionHistoryProps> = ({ customerId }) => {
  const [actions, setActions] = useState<SupportAction[]>([]);
  const [filteredActions, setFilteredActions] = useState<SupportAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  const [filters, setFilters] = useState<ActionFilters>({
    dateRange: '30d',
    actionTypes: [],
    performedBy: '',
  });

  const actionTypeOptions = [
    'payment_processed',
    'refund_issued',
    'subscription_modified',
    'payment_method_updated',
    'invoice_regenerated',
    'grace_period_extended',
    'account_suspended',
    'account_reactivated',
    'notes_added',
    'escalated',
  ];

  useEffect(() => {
    loadActionHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  useEffect(() => {
    applyFilters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, filters, searchQuery]);

  const loadActionHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/support/customers/${customerId}/actions`);
      if (!response.ok) {
        throw new Error('Failed to load action history');
      }

      const data = await response.json();
      setActions(data);
    } catch (error) {
      console.error('Failed to load action history:', error);
      setError('Failed to load customer action history');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...actions];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        action =>
          action.description.toLowerCase().includes(query) ||
          action.action.toLowerCase().includes(query) ||
          action.performedByName.toLowerCase().includes(query) ||
          action.id.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();

      switch (filters.dateRange) {
        case '24h':
          cutoff.setHours(now.getHours() - 24);
          break;
        case '7d':
          cutoff.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoff.setDate(now.getDate() - 30);
          break;
        case '90d':
          cutoff.setDate(now.getDate() - 90);
          break;
      }

      filtered = filtered.filter(action => new Date(action.timestamp) >= cutoff);
    }

    // Action type filter
    if (filters.actionTypes.length > 0) {
      filtered = filtered.filter(action => filters.actionTypes.includes(action.action));
    }

    // Performed by filter
    if (filters.performedBy.trim()) {
      const query = filters.performedBy.toLowerCase();
      filtered = filtered.filter(
        action =>
          action.performedByName.toLowerCase().includes(query) || action.performedBy.toLowerCase().includes(query)
      );
    }

    // Success filter
    if (filters.success !== undefined) {
      filtered = filtered.filter(action => action.success === filters.success);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setFilteredActions(filtered);
  };

  const exportActionHistory = async () => {
    try {
      const response = await fetch(`/api/support/customers/${customerId}/actions/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters,
          searchQuery,
          format: 'csv',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export action history');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `support-actions-${customerId}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export action history:', error);
      setError('Failed to export action history');
    }
  };

  const parseUserAgent = (userAgent?: string): { browser?: string; device?: string } => {
    if (!userAgent) return {};

    const browser = userAgent.includes('Chrome')
      ? 'Chrome'
      : userAgent.includes('Firefox')
        ? 'Firefox'
        : userAgent.includes('Safari')
          ? 'Safari'
          : userAgent.includes('Edge')
            ? 'Edge'
            : 'Unknown';

    const device = userAgent.includes('Mobile') ? 'Mobile' : userAgent.includes('Tablet') ? 'Tablet' : 'Desktop';

    return { browser, device };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'payment_processed':
        return <DollarSign className="w-4 h-4 text-success" />;
      case 'refund_issued':
        return <DollarSign className="w-4 h-4 text-error" />;
      case 'subscription_modified':
        return <Settings className="w-4 h-4 text-primary" />;
      case 'payment_method_updated':
        return <CreditCard className="w-4 h-4 text-primary" />;
      case 'invoice_regenerated':
        return <FileText className="w-4 h-4 text-muted-foreground" />;
      case 'grace_period_extended':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'account_suspended':
        return <AlertTriangle className="w-4 h-4 text-error" />;
      case 'account_reactivated':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'notes_added':
        return <FileText className="w-4 h-4 text-muted-foreground" />;
      case 'escalated':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionColor = (action: string, success: boolean) => {
    if (!success) return 'bg-error/10 text-error';

    switch (action) {
      case 'payment_processed':
      case 'account_reactivated':
        return 'bg-success/10 text-success';
      case 'refund_issued':
      case 'account_suspended':
        return 'bg-error/10 text-error';
      case 'subscription_modified':
      case 'payment_method_updated':
        return 'bg-primary/10 text-primary';
      case 'grace_period_extended':
      case 'escalated':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const renderFilters = () => (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search and Quick Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search actions, descriptions, or performed by..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={filters.dateRange}
                onChange={e => setFilters({ ...filters, dateRange: e.target.value as unknown as typeof filters.dateRange })}
                className="px-3 py-2 border border-border rounded-md text-sm"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center"
              >
                <Filter className="w-4 h-4 mr-2" />
                Advanced
                {(filters.actionTypes.length > 0 || filters.performedBy || filters.success !== undefined) && (
                  <Badge variant="outline" className="ml-2">
                    {filters.actionTypes.length +
                      (filters.performedBy ? 1 : 0) +
                      (filters.success !== undefined ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="border-t pt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Action Types</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {actionTypeOptions.map(actionType => (
                    <label key={actionType} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={filters.actionTypes.includes(actionType)}
                        onChange={e => {
                          if (e.target.checked) {
                            setFilters({
                              ...filters,
                              actionTypes: [...filters.actionTypes, actionType],
                            });
                          } else {
                            setFilters({
                              ...filters,
                              actionTypes: filters.actionTypes.filter(t => t !== actionType),
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="capitalize">{actionType.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Performed By</label>
                  <Input
                    placeholder="Enter user name or ID..."
                    value={filters.performedBy}
                    onChange={e => setFilters({ ...filters, performedBy: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Success Status</label>
                  <select
                    value={filters.success === undefined ? 'all' : filters.success.toString()}
                    onChange={e =>
                      setFilters({
                        ...filters,
                        success: e.target.value === 'all' ? undefined : e.target.value === 'true',
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md text-sm"
                  >
                    <option value="all">All Actions</option>
                    <option value="true">Successful Only</option>
                    <option value="false">Failed Only</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters({ dateRange: '30d', actionTypes: [], performedBy: '', success: undefined });
                    setSearchQuery('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderActionDetails = (action: SupportAction) => {
    if (expandedAction !== action.id) return null;

    const { browser, device } = parseUserAgent(action.userAgent);

    return (
      <div className="mt-4 p-4 bg-muted rounded-lg border-t">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium text-foreground mb-3">Session Information</h5>
            <div className="space-y-2 text-sm">
              {action.sessionId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session ID:</span>
                  <code className="text-xs bg-background px-2 py-1 rounded border font-mono">{action.sessionId}</code>
                </div>
              )}

              {action.ipAddress && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IP Address:</span>
                  <span className="font-mono text-xs">{action.ipAddress}</span>
                </div>
              )}

              {browser && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Browser:</span>
                  <div className="flex items-center">
                    <Monitor className="w-3 h-3 mr-1 text-muted-foreground" />
                    <span>{browser}</span>
                  </div>
                </div>
              )}

              {device && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Device:</span>
                  <div className="flex items-center">
                    {device === 'Mobile' ? (
                      <Smartphone className="w-3 h-3 mr-1 text-muted-foreground" />
                    ) : (
                      <Monitor className="w-3 h-3 mr-1 text-muted-foreground" />
                    )}
                    <span>{device}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h5 className="font-medium text-foreground mb-3">Action Details</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Action ID:</span>
                <code className="text-xs bg-background px-2 py-1 rounded border font-mono">{action.id}</code>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Success:</span>
                <div className="flex items-center">
                  {action.success ? (
                    <CheckCircle className="w-3 h-3 text-success mr-1" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-error mr-1" />
                  )}
                  <span>{action.success ? 'Yes' : 'No'}</span>
                </div>
              </div>

              {action.errorMessage && (
                <div>
                  <span className="text-muted-foreground block mb-1">Error:</span>
                  <div className="bg-error/10 border border-error/20 rounded p-2">
                    <p className="text-error text-xs">{action.errorMessage}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {action.details && Object.keys(action.details).length > 0 && (
          <div className="mt-4">
            <h5 className="font-medium text-foreground mb-2">Additional Details</h5>
            <div className="bg-background border rounded p-3">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                {JSON.stringify(action.details, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {action.userAgent && (
          <div className="mt-4">
            <h5 className="font-medium text-foreground mb-2">User Agent</h5>
            <div className="bg-background border rounded p-2">
              <p className="text-xs text-muted-foreground font-mono break-all">{action.userAgent}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderActionCard = (action: SupportAction) => (
    <Card key={action.id} className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0 mt-1">{getActionIcon(action.action)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-foreground truncate">{action.description}</h4>
                <Badge className={getActionColor(action.action, action.success)}>
                  {action.action.replace('_', ' ').toUpperCase()}
                </Badge>
                {!action.success && (
                  <Badge variant="outline" className="text-error border-error/30">
                    FAILED
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                <div className="flex items-center">
                  <User className="w-3 h-3 mr-1" />
                  {action.performedByName}
                </div>
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDate(action.timestamp)}
                </div>
                {action.sessionId && (
                  <div className="flex items-center">
                    <Shield className="w-3 h-3 mr-1" />
                    Session: {action.sessionId.slice(-8)}
                  </div>
                )}
              </div>

              {action.errorMessage && (
                <div className="mt-2 p-2 bg-error/10 border border-error/20 rounded">
                  <p className="text-error text-xs">{action.errorMessage}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedAction(expandedAction === action.id ? null : action.id)}
              className="flex items-center"
            >
              <Eye className="w-3 h-3 mr-1" />
              {expandedAction === action.id ? 'Hide' : 'Details'}
            </Button>
          </div>
        </div>

        {renderActionDetails(action)}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading action history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Support Action History</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadActionHistory}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportActionHistory}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-error/20 bg-error/10">
          <AlertTriangle className="w-4 h-4 text-error" />
          <div>
            <p className="font-medium text-error">Error</p>
            <p className="text-sm text-error">{error}</p>
          </div>
        </Alert>
      )}

      {/* Filters */}
      {renderFilters()}

      {/* Summary Stats */}
      {filteredActions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{filteredActions.length}</p>
                <p className="text-sm text-muted-foreground">Total Actions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-success">{filteredActions.filter(a => a.success).length}</p>
                <p className="text-sm text-muted-foreground">Successful</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-error">{filteredActions.filter(a => !a.success).length}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {new Set(filteredActions.map(a => a.performedBy)).size}
                </p>
                <p className="text-sm text-muted-foreground">Unique Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Action Timeline ({filteredActions.length})</h3>
        </div>

        {filteredActions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Actions Found</h3>
              <p className="text-muted-foreground">
                {actions.length === 0
                  ? 'No support actions have been performed for this customer.'
                  : 'No actions match your current filters.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">{filteredActions.map(renderActionCard)}</div>
        )}
      </div>
    </div>
  );
};

export default SupportActionHistory;
