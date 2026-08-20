'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert } from '../ui/alert';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  RefreshCw,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Send,
  Shield,
  Calendar,
  FileText,
  Loader2,
  ArrowLeft,
  Search,
} from 'lucide-react';
import { SupportRefund, SupportTransaction } from '../../lib/types/support';
import { usePermissions } from '../../hooks/usePermissions';

interface RefundProcessorProps {
  customerId: string;
  onRefundProcessed: (amount: number) => void;
}

interface RefundRequest {
  transactionId: string;
  amount: number;
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other';
  customReason?: string;
  notes?: string;
  requiresApproval?: boolean;
}

interface RefundStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export const RefundProcessor: React.FC<RefundProcessorProps> = ({ customerId, onRefundProcessed }) => {
  const [transactions, setTransactions] = useState<SupportTransaction[]>([]);
  const [refunds, setRefunds] = useState<SupportRefund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<SupportTransaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [refundRequest, setRefundRequest] = useState<RefundRequest>({
    transactionId: '',
    amount: 0,
    reason: 'requested_by_customer',
    notes: '',
    requiresApproval: false,
  });

  const { hasPermission } = usePermissions();

  const refundSteps: RefundStep[] = [
    {
      id: 1,
      title: 'Select Transaction',
      description: 'Choose the transaction to refund',
      completed: currentStep > 1,
    },
    {
      id: 2,
      title: 'Refund Details',
      description: 'Enter refund amount and reason',
      completed: currentStep > 2,
    },
    {
      id: 3,
      title: 'Review & Process',
      description: 'Review and confirm the refund',
      completed: currentStep > 3,
    },
    {
      id: 4,
      title: 'Complete',
      description: 'Refund processed successfully',
      completed: currentStep === 4,
    },
  ];

  useEffect(() => {
    loadTransactions();
    loadRefunds();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/support/customers/${customerId}/transactions?status=succeeded`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setError('Failed to load customer transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRefunds = async () => {
    try {
      const response = await fetch(`/api/support/customers/${customerId}/refunds`);
      if (response.ok) {
        const data = await response.json();
        setRefunds(data);
      }
    } catch (error) {
      console.error('Failed to load refunds:', error);
    }
  };

  const processRefund = async () => {
    if (!hasPermission('process_refunds')) {
      setError('You do not have permission to process refunds');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch('/api/support/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...refundRequest,
          customerId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process refund');
      }

      const refundData = await response.json();

      if (refundData.requiresApproval) {
        setCurrentStep(4);
        // Show approval required message
      } else {
        setCurrentStep(4);
        await loadRefunds();
        onRefundProcessed(refundRequest.amount);
      }
    } catch (error) {
      console.error('Failed to process refund:', error);
      setError(error instanceof Error ? error.message : 'Failed to process refund');
    } finally {
      setIsProcessing(false);
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
        return 'bg-success/10 text-success';
      case 'pending':
        return 'bg-warning/10 text-warning';
      case 'failed':
        return 'bg-destructive/10 text-destructive';
      case 'cancelled':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRefundableAmount = (transactionId: string): number => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return 0;

    const existingRefunds = refunds.filter(
      r => r.transactionId === transactionId && (r.status === 'succeeded' || r.status === 'pending')
    );

    const refundedAmount = existingRefunds.reduce((sum, refund) => sum + refund.amount, 0);
    return transaction.amount - refundedAmount;
  };

  const renderStepProgress = () => (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {refundSteps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step.completed || currentStep === step.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.completed ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="ml-2 hidden md:block">
                <p
                  className={`text-sm font-medium ${
                    step.completed || currentStep === step.id ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground/60">{step.description}</p>
              </div>
              {index < refundSteps.length - 1 && (
                <div className={`w-12 h-0.5 mx-4 ${step.completed ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderTransactionSelection = () => {
    const filteredTransactions = transactions.filter(transaction => {
      const matchesSearch =
        searchQuery === '' ||
        transaction.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;

      const hasRefundableAmount = getRefundableAmount(transaction.id) > 0;

      return matchesSearch && matchesStatus && hasRefundableAmount;
    });

    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Transaction to Refund</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/60 w-4 h-4" />
                <Input
                  placeholder="Search by transaction ID or description..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md"
            >
              <option value="all">All Transactions</option>
              <option value="succeeded">Successful Only</option>
            </select>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Refundable Transactions</h3>
              <p className="text-muted-foreground">This customer has no transactions available for refund.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredTransactions.map(transaction => {
                const refundableAmount = getRefundableAmount(transaction.id);
                const existingRefunds = refunds.filter(r => r.transactionId === transaction.id);

                return (
                  <div
                    key={transaction.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedTransaction?.id === transaction.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-input'
                    }`}
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setRefundRequest({
                        ...refundRequest,
                        transactionId: transaction.id,
                        amount: refundableAmount,
                      });
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-foreground">{transaction.description}</h4>
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status.toUpperCase()}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">Transaction ID: {transaction.id}</p>

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(transaction.processedAt)}
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {transaction.method.toUpperCase()}
                          </div>
                        </div>

                        {existingRefunds.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Existing refunds: {existingRefunds.length}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {existingRefunds.map(refund => (
                                <Badge key={refund.id} variant="outline" className="text-xs">
                                  {formatCurrency(refund.amount)} - {refund.status}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-semibold text-foreground">
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </p>
                        <p className="text-sm text-success font-medium">
                          Refundable: {formatCurrency(refundableAmount, transaction.currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedTransaction && (
            <div className="flex justify-end mt-6">
              <Button onClick={() => setCurrentStep(2)} className="flex items-center">
                Continue to Refund Details
                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderRefundDetails = () => (
    <Card>
      <CardHeader>
        <CardTitle>Refund Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selected Transaction Info */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-foreground mb-2">Selected Transaction</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Transaction:</span>
              <span className="ml-2 font-medium">{selectedTransaction?.description}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Amount:</span>
              <span className="ml-2 font-medium">
                {formatCurrency(selectedTransaction?.amount || 0, selectedTransaction?.currency)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Date:</span>
              <span className="ml-2 font-medium">{formatDate(selectedTransaction?.processedAt || '')}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Refundable:</span>
              <span className="ml-2 font-medium text-success">
                {formatCurrency(getRefundableAmount(selectedTransaction?.id || ''), selectedTransaction?.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Refund Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="refundAmount">Refund Amount *</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/60 w-4 h-4" />
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={getRefundableAmount(selectedTransaction?.id || '')}
                placeholder="0.00"
                value={refundRequest.amount || ''}
                onChange={e =>
                  setRefundRequest({
                    ...refundRequest,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Maximum refundable:{' '}
              {formatCurrency(getRefundableAmount(selectedTransaction?.id || ''), selectedTransaction?.currency)}
            </p>
          </div>

          <div>
            <Label htmlFor="refundReason">Refund Reason *</Label>
            <select
              value={refundRequest.reason}
              onChange={e =>
                setRefundRequest({
                  ...refundRequest,
                  reason: e.target.value as "other" | "duplicate" | "fraudulent" | "requested_by_customer",
                })
              }
              className="w-full px-3 py-2 border border-input rounded-md mt-1"
              required
            >
              <option value="requested_by_customer">Requested by Customer</option>
              <option value="duplicate">Duplicate Transaction</option>
              <option value="fraudulent">Fraudulent Transaction</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {refundRequest.reason === 'other' && (
          <div>
            <Label htmlFor="customReason">Custom Reason *</Label>
            <Input
              placeholder="Please specify the reason for this refund..."
              value={refundRequest.customReason || ''}
              onChange={e =>
                setRefundRequest({
                  ...refundRequest,
                  customReason: e.target.value,
                })
              }
              className="mt-1"
              required
            />
          </div>
        )}

        <div>
          <Label htmlFor="refundNotes">Internal Notes</Label>
          <Textarea
            placeholder="Add any internal notes about this refund..."
            value={refundRequest.notes || ''}
            onChange={e =>
              setRefundRequest({
                ...refundRequest,
                notes: e.target.value,
              })
            }
            rows={3}
            className="mt-1"
          />
        </div>

        {/* Approval Requirements */}
        {refundRequest.amount > 1000 && (
          <Alert className="border-warning/30 bg-warning/10">
            <Shield className="w-4 h-4 text-warning" />
            <div>
              <p className="font-medium text-warning">Manager Approval Required</p>
              <p className="text-sm text-warning/80">Refunds over $1,000 require manager approval before processing.</p>
            </div>
          </Alert>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Selection
          </Button>
          <Button
            onClick={() => setCurrentStep(3)}
            disabled={
              refundRequest.amount <= 0 ||
              refundRequest.amount > getRefundableAmount(selectedTransaction?.id || '') ||
              !refundRequest.reason ||
              (refundRequest.reason === 'other' && !refundRequest.customReason?.trim())
            }
            className="flex items-center"
          >
            Continue to Review
            <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderReviewAndProcess = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-destructive">
          <Shield className="w-5 h-5 mr-2" />
          Review & Confirm Refund
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-destructive/30 bg-destructive/10">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Final Confirmation Required</p>
            <p className="text-sm text-destructive/80">
              You are about to process a refund of {formatCurrency(refundRequest.amount)}
              for transaction {selectedTransaction?.id}. This action may not be reversible.
            </p>
          </div>
        </Alert>

        {/* Refund Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-foreground mb-3">Transaction Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Amount:</span>
                <span className="font-medium">
                  {formatCurrency(selectedTransaction?.amount || 0, selectedTransaction?.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{formatDate(selectedTransaction?.processedAt || '')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method:</span>
                <span className="font-medium">{selectedTransaction?.method.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description:</span>
                <span className="font-medium">{selectedTransaction?.description}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-3">Refund Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Refund Amount:</span>
                <span className="font-medium text-destructive">
                  {formatCurrency(refundRequest.amount, selectedTransaction?.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reason:</span>
                <span className="font-medium capitalize">
                  {refundRequest.reason === 'other'
                    ? refundRequest.customReason
                    : refundRequest.reason.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processing Time:</span>
                <span className="font-medium">5-10 business days</span>
              </div>
              {refundRequest.amount > 1000 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approval:</span>
                  <span className="font-medium text-warning">Required</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {refundRequest.notes && (
          <div>
            <h4 className="font-medium text-foreground mb-2">Internal Notes</h4>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-foreground">{refundRequest.notes}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(2)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Edit
          </Button>
          <Button
            onClick={processRefund}
            disabled={isProcessing}
            variant="destructive"
            className="flex items-center"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            {isProcessing ? 'Processing Refund...' : 'Process Refund Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderCompletion = () => (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Refund Processed Successfully!</h2>
          <p className="text-muted-foreground">
            The refund of {formatCurrency(refundRequest.amount, selectedTransaction?.currency)} has been processed.
          </p>
        </div>

        <div className="mb-6 p-4 bg-success/10 rounded-lg text-left max-w-md mx-auto">
          <h3 className="font-medium text-success mb-2">What happens next:</h3>
          <ul className="text-sm text-success space-y-1">
            <li>• Customer will receive an email notification</li>
            <li>• Refund will appear on their statement in 5-10 business days</li>
            <li>• Transaction status will be updated automatically</li>
            {refundRequest.amount > 1000 && <li>• Manager approval will be requested via email</li>}
          </ul>
        </div>

        <div className="flex justify-center space-x-3">
          <Button
            onClick={() => {
              setCurrentStep(1);
              setSelectedTransaction(null);
              setRefundRequest({
                transactionId: '',
                amount: 0,
                reason: 'requested_by_customer',
                notes: '',
                requiresApproval: false,
              });
              setError(null);
            }}
          >
            Process Another Refund
          </Button>
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            View Refund Details
          </Button>
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
            <span>Loading transactions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Refund Processing</h2>
        <Badge variant="outline" className="flex items-center">
          <Shield className="w-3 h-3 mr-1" />
          Secure Processing
        </Badge>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-destructive/30 bg-destructive/10">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Refund Error</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </Alert>
      )}

      {/* Progress Steps */}
      {renderStepProgress()}

      {/* Step Content */}
      {currentStep === 1 && renderTransactionSelection()}
      {currentStep === 2 && renderRefundDetails()}
      {currentStep === 3 && renderReviewAndProcess()}
      {currentStep === 4 && renderCompletion()}
    </div>
  );
};

export default RefundProcessor;
