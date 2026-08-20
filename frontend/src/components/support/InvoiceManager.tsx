'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert } from '../ui/alert';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  FileText,
  Download,
  Send,
  RefreshCw,
  Edit,
  Trash2,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Mail,
  Loader2,
  Search,
  Filter,
} from 'lucide-react';
import { SupportInvoice } from '../../lib/types/support';
import { usePermissions } from '../../hooks/usePermissions';

interface InvoiceManagerProps {
  customerId: string;
  onInvoiceAction: (action: string) => void;
}

interface InvoiceFilters {
  status: string[];
  dateRange: 'all' | '30d' | '90d' | '1y';
  amountRange: {
    min: number;
    max: number;
  };
}

interface InvoiceAction {
  type: 'regenerate' | 'send' | 'void' | 'mark_paid' | 'download';
  invoiceId: string;
  notes?: string;
}

export const InvoiceManager: React.FC<InvoiceManagerProps> = ({ customerId, onInvoiceAction }) => {
  const [invoices, setInvoices] = useState<SupportInvoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<SupportInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingInvoiceId, setProcessingInvoiceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  const [filters, setFilters] = useState<InvoiceFilters>({
    status: [],
    dateRange: 'all',
    amountRange: { min: 0, max: 99999 },
  });

  const { hasPermission } = usePermissions();

  useEffect(() => {
    loadInvoices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  useEffect(() => {
    applyFilters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, filters, searchQuery]);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/support/customers/${customerId}/invoices`);
      if (!response.ok) {
        throw new Error('Failed to load invoices');
      }

      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      console.error('Failed to load invoices:', error);
      setError('Failed to load customer invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...invoices];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        invoice =>
          invoice.number.toLowerCase().includes(query) ||
          invoice.description?.toLowerCase().includes(query) ||
          invoice.id.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(invoice => filters.status.includes(invoice.status));
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();

      switch (filters.dateRange) {
        case '30d':
          cutoff.setDate(now.getDate() - 30);
          break;
        case '90d':
          cutoff.setDate(now.getDate() - 90);
          break;
        case '1y':
          cutoff.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(invoice => new Date(invoice.createdAt) >= cutoff);
    }

    // Amount range filter
    filtered = filtered.filter(
      invoice => invoice.amount >= filters.amountRange.min && invoice.amount <= filters.amountRange.max
    );

    setFilteredInvoices(filtered);
  };

  const executeInvoiceAction = async (action: InvoiceAction) => {
    const permissionMap = {
      regenerate: 'regenerate_invoices',
      send: 'send_invoices',
      void: 'void_invoices',
      mark_paid: 'mark_invoices_paid',
      download: 'download_invoices',
    };

    if (!hasPermission(permissionMap[action.type])) {
      setError(`You do not have permission to ${action.type.replace('_', ' ')} invoices`);
      return;
    }

    try {
      setProcessingInvoiceId(action.invoiceId);
      setError(null);

      const response = await fetch(`/api/support/invoices/${action.invoiceId}/${action.type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: action.notes }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action.type} invoice`);
      }

      // Handle download action
      if (action.type === 'download') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${action.invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        await loadInvoices();
      }

      onInvoiceAction(action.type);
    } catch (error) {
      console.error(`Failed to ${action.type} invoice:`, error);
      setError(error instanceof Error ? error.message : `Failed to ${action.type} invoice`);
    } finally {
      setProcessingInvoiceId(null);
    }
  };

  const executeBulkAction = async (actionType: string) => {
    if (selectedInvoices.length === 0) return;

    try {
      setError(null);

      const promises = selectedInvoices.map(invoiceId => executeInvoiceAction({ type: actionType as "send" | "void" | "download" | "regenerate" | "mark_paid", invoiceId }));

      await Promise.all(promises);
      setSelectedInvoices([]);
      onInvoiceAction(`bulk_${actionType}`);
    } catch (error) {
      console.error(`Failed to execute bulk ${actionType}:`, error);
      setError(`Failed to execute bulk ${actionType}`);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-success/10 text-success';
      case 'open':
        return 'bg-primary/10 text-primary';
      case 'draft':
        return 'bg-muted text-muted-foreground';
      case 'void':
        return 'bg-destructive/10 text-destructive';
      case 'uncollectible':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'open':
        return <Clock className="w-4 h-4 text-primary" />;
      case 'draft':
        return <Edit className="w-4 h-4 text-muted-foreground" />;
      case 'void':
      case 'uncollectible':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const renderFilters = () => (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search and Status Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/60 w-4 h-4" />
                <Input
                  placeholder="Search by invoice number, ID, or description..."
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
                className="px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="all">All Time</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {filters.status.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {filters.status.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="border-t pt-4 space-y-4">
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['draft', 'open', 'paid', 'void', 'uncollectible'].map(status => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status)}
                        onChange={e => {
                          if (e.target.checked) {
                            setFilters({
                              ...filters,
                              status: [...filters.status, status],
                            });
                          } else {
                            setFilters({
                              ...filters,
                              status: filters.status.filter(s => s !== status),
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm capitalize">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minAmount" className="text-sm font-medium">
                    Min Amount
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={filters.amountRange.min}
                    onChange={e =>
                      setFilters({
                        ...filters,
                        amountRange: { ...filters.amountRange, min: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="maxAmount" className="text-sm font-medium">
                    Max Amount
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={filters.amountRange.max}
                    onChange={e =>
                      setFilters({
                        ...filters,
                        amountRange: { ...filters.amountRange, max: parseFloat(e.target.value) || 99999 },
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters({ status: [], dateRange: 'all', amountRange: { min: 0, max: 99999 } });
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

  const renderBulkActions = () => {
    if (selectedInvoices.length === 0) return null;

    return (
      <Card className="mb-6 bg-primary/10 border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <p className="font-medium text-primary">
                {selectedInvoices.length} invoice{selectedInvoices.length > 1 ? 's' : ''} selected
              </p>
            </div>

            <div className="flex space-x-2">
              {hasPermission('send_invoices') && (
                <Button size="sm" onClick={() => executeBulkAction('send')} className="flex items-center">
                  <Mail className="w-3 h-3 mr-1" />
                  Send
                </Button>
              )}

              {hasPermission('download_invoices') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => executeBulkAction('download')}
                  className="flex items-center"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
              )}

              <Button size="sm" variant="outline" onClick={() => setSelectedInvoices([])}>
                Clear Selection
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderInvoiceCard = (invoice: SupportInvoice) => (
    <Card key={invoice.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={selectedInvoices.includes(invoice.id)}
              onChange={e => {
                if (e.target.checked) {
                  setSelectedInvoices([...selectedInvoices, invoice.id]);
                } else {
                  setSelectedInvoices(selectedInvoices.filter(id => id !== invoice.id));
                }
              }}
              className="mt-1"
            />

            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-lg font-semibold text-foreground">Invoice #{invoice.number}</h3>
                <Badge className={getStatusColor(invoice.status)}>
                  {getStatusIcon(invoice.status)}
                  <span className="ml-1">{invoice.status.toUpperCase()}</span>
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-2">ID: {invoice.id}</p>

              {invoice.description && <p className="text-foreground mb-2">{invoice.description}</p>}

              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  Created: {formatDate(invoice.createdAt)}
                </div>

                {invoice.dueDate && (
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    Due: {formatDate(invoice.dueDate)}
                  </div>
                )}

                {invoice.paidAt && (
                  <div className="flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Paid: {formatDate(invoice.paidAt)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-foreground mb-1">
              {formatCurrency(invoice.amount, invoice.currency)}
            </div>

            {invoice.amountDue > 0 && invoice.status !== 'paid' && (
              <div className="text-sm">
                <span className="text-muted-foreground">Due: </span>
                <span className="font-medium text-destructive">{formatCurrency(invoice.amountDue, invoice.currency)}</span>
              </div>
            )}

            {invoice.amountPaid > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Paid: </span>
                <span className="font-medium text-success">
                  {formatCurrency(invoice.amountPaid, invoice.currency)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        {invoice.lineItems && invoice.lineItems.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-foreground mb-2">Line Items</h4>
            <div className="space-y-1">
              {invoice.lineItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.description} {item.quantity > 1 && `(${item.quantity}x)`}
                  </span>
                  <span className="font-medium">{formatCurrency(item.amount, invoice.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {hasPermission('download_invoices') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => executeInvoiceAction({ type: 'download', invoiceId: invoice.id })}
              disabled={processingInvoiceId === invoice.id}
              className="flex items-center"
            >
              {processingInvoiceId === invoice.id ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Download className="w-3 h-3 mr-1" />
              )}
              Download
            </Button>
          )}

          {invoice.status === 'draft' && hasPermission('send_invoices') && (
            <Button
              size="sm"
              onClick={() => executeInvoiceAction({ type: 'send', invoiceId: invoice.id })}
              disabled={processingInvoiceId === invoice.id}
              className="flex items-center"
            >
              {processingInvoiceId === invoice.id ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Send className="w-3 h-3 mr-1" />
              )}
              Send
            </Button>
          )}

          {invoice.status === 'open' && hasPermission('send_invoices') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => executeInvoiceAction({ type: 'send', invoiceId: invoice.id })}
              disabled={processingInvoiceId === invoice.id}
              className="flex items-center"
            >
              {processingInvoiceId === invoice.id ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Mail className="w-3 h-3 mr-1" />
              )}
              Resend
            </Button>
          )}

          {invoice.status === 'open' && hasPermission('mark_invoices_paid') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => executeInvoiceAction({ type: 'mark_paid', invoiceId: invoice.id })}
              disabled={processingInvoiceId === invoice.id}
              className="flex items-center"
            >
              {processingInvoiceId === invoice.id ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <CheckCircle className="w-3 h-3 mr-1" />
              )}
              Mark Paid
            </Button>
          )}

          {hasPermission('regenerate_invoices') && (invoice.status === 'draft' || invoice.status === 'open') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => executeInvoiceAction({ type: 'regenerate', invoiceId: invoice.id })}
              disabled={processingInvoiceId === invoice.id}
              className="flex items-center"
            >
              {processingInvoiceId === invoice.id ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1" />
              )}
              Regenerate
            </Button>
          )}

          {hasPermission('void_invoices') && (invoice.status === 'draft' || invoice.status === 'open') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (confirm('Are you sure you want to void this invoice? This action cannot be undone.')) {
                  executeInvoiceAction({ type: 'void', invoiceId: invoice.id });
                }
              }}
              disabled={processingInvoiceId === invoice.id}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 flex items-center"
            >
              {processingInvoiceId === invoice.id ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Trash2 className="w-3 h-3 mr-1" />
              )}
              Void
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading invoices...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Invoice Management</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadInvoices}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {hasPermission('create_invoices') && (
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-destructive/30 bg-destructive/10">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Error</p>
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </Alert>
      )}

      {/* Filters */}
      {renderFilters()}

      {/* Bulk Actions */}
      {renderBulkActions()}

      {/* Invoices List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Invoices ({filteredInvoices.length})</h3>

          {filteredInvoices.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>Total: {formatCurrency(filteredInvoices.reduce((sum, invoice) => sum + invoice.amount, 0))}</span>
              <span>|</span>
              <span>Due: {formatCurrency(filteredInvoices.reduce((sum, invoice) => sum + invoice.amountDue, 0))}</span>
            </div>
          )}
        </div>

        {filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Invoices Found</h3>
              <p className="text-muted-foreground">
                {invoices.length === 0 ? 'This customer has no invoices.' : 'No invoices match your current filters.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">{filteredInvoices.map(renderInvoiceCard)}</div>
        )}
      </div>
    </div>
  );
};

export default InvoiceManager;
