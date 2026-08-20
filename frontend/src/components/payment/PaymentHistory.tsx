'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert } from '../ui/alert';
import { getPaymentHistory, getPaymentTransaction, ApiError } from '../../lib/api';
import { PaymentTransaction } from '../../lib/types/payment';
import {
  CreditCard,
  Receipt,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Filter,
} from 'lucide-react';

interface PaymentHistoryProps {
  pageSize?: number;
  showFilters?: boolean;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({ pageSize = 10, showFilters = true }) => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadPaymentHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const newTransactions = await getPaymentHistory(currentPage, pageSize);

      // Always append to existing transactions
      // handleRefresh clears transactions before calling setCurrentPage(1)
      setTransactions(prev => (prev.length === 0 ? newTransactions : [...prev, ...newTransactions]));

      setHasMore(newTransactions.length === pageSize);
    } catch (err) {
      console.error('Failed to load payment history:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load payment history';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    // Clear transactions immediately for better UX
    setTransactions([]);
    // If already on page 1, manually reload since setCurrentPage won't trigger useEffect
    if (currentPage === 1) {
      loadPaymentHistory();
    } else {
      // Setting to page 1 will trigger useEffect which calls loadPaymentHistory
      setCurrentPage(1);
    }
  };

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const handleTransactionClick = async (transaction: PaymentTransaction) => {
    try {
      // Fetch full transaction details
      const fullTransaction = await getPaymentTransaction(transaction.id);
      setSelectedTransaction(fullTransaction);
    } catch (err) {
      console.error('Failed to load transaction details:', err);
      setSelectedTransaction(transaction); // Fallback to basic info
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
        return 'bg-success/10 text-success border-success/20';
      case 'failed':
        return 'bg-error/10 text-error border-error/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'canceled':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredTransactions =
    statusFilter === 'all'
      ? transactions
      : transactions.filter(t => t.status.toLowerCase() === statusFilter.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Receipt className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Payment History</h3>
        </div>

        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="flex items-center space-x-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex space-x-2">
              {['all', 'succeeded', 'failed', 'pending'].map(status => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="border-error/20 bg-error/10">
          <AlertCircle className="w-4 h-4 text-error" />
          <div className="text-error">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </Alert>
      )}

      {/* Loading State */}
      {loading && transactions.length === 0 && (
        <Card className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading payment history...</span>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredTransactions.length === 0 && !error && (
        <Card className="p-8 text-center">
          <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-lg font-medium text-foreground mb-2">
            {statusFilter === 'all' ? 'No Payment History' : `No ${statusFilter} Payments`}
          </h4>
          <p className="text-muted-foreground mb-4">
            {statusFilter === 'all'
              ? "You haven't made any payments yet."
              : `You don't have any ${statusFilter} payments.`}
          </p>
          {statusFilter !== 'all' && (
            <Button variant="outline" onClick={() => setStatusFilter('all')}>
              View All Payments
            </Button>
          )}
        </Card>
      )}

      {/* Transactions List */}
      {filteredTransactions.length > 0 && (
        <div className="space-y-3">
          {filteredTransactions.map(transaction => (
            <Card
              key={transaction.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleTransactionClick(transaction)}
            >
              <div className="flex items-center space-x-4">
                {/* Transaction Icon */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{transaction.description || 'Payment'}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(transaction.createdAt)}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      <Badge className={getStatusColor(transaction.status)}>{transaction.status}</Badge>
                    </div>
                  </div>

                  {/* Failure Reason */}
                  {transaction.failureReason && (
                    <div className="mt-2 p-2 bg-error/10 border border-error/20 rounded text-sm text-error">
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      {transaction.failureReason}
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
          ))}

          {/* Load More */}
          {hasMore && !loading && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={handleLoadMore} disabled={loading}>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">Transaction Details</h4>
              <Button variant="outline" size="sm" onClick={() => setSelectedTransaction(null)}>
                ✕
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-mono text-sm">{selectedTransaction.id}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">
                  {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={getStatusColor(selectedTransaction.status)}>{selectedTransaction.status}</Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(selectedTransaction.createdAt)}</span>
              </div>

              {selectedTransaction.processedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processed</span>
                  <span>{formatDate(selectedTransaction.processedAt)}</span>
                </div>
              )}

              {selectedTransaction.description && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description</span>
                  <span>{selectedTransaction.description}</span>
                </div>
              )}

              {selectedTransaction.failureReason && (
                <div className="col-span-2 p-2 bg-error/10 border border-error/20 rounded text-sm text-error">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  {selectedTransaction.failureReason}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  // Copy transaction details to clipboard
                  const details = `Transaction ID: ${selectedTransaction.id}\nAmount: ${formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}\nStatus: ${selectedTransaction.status}\nDate: ${formatDate(selectedTransaction.createdAt)}`;
                  navigator.clipboard.writeText(details);
                }}
              >
                Copy Details
              </Button>
              <Button onClick={() => setSelectedTransaction(null)}>Close</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
