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
  DollarSign,
  CheckCircle,
  AlertTriangle,
  FileText,
  Send,
  Calculator,
  Shield,
  Info,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import {
  CustomerAccount,
  ManualPaymentRequest,
  ManualPaymentConfirmation,
  SupportInvoice,
} from '../../lib/types/support';
import { usePermissions } from '../../hooks/usePermissions';

interface ManualPaymentProcessorProps {
  customer: CustomerAccount;
  onPaymentProcessed: (amount: number) => void;
}

interface PaymentStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

interface PaymentCalculation {
  subtotal: number;
  tax: number;
  fees: number;
  total: number;
  currency: string;
}

export const ManualPaymentProcessor: React.FC<ManualPaymentProcessorProps> = ({ customer, onPaymentProcessed }) => {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ManualPaymentConfirmation | null>(null);
  const [openInvoices, setOpenInvoices] = useState<SupportInvoice[]>([]);
  const [calculation, setCalculation] = useState<PaymentCalculation | null>(null);

  const [paymentData, setPaymentData] = useState<ManualPaymentRequest>({
    customerId: customer.id,
    amount: 0,
    currency: 'USD',
    method: 'card',
    description: '',
    reference: '',
    notes: '',
    skipNotification: false,
    markAsPaid: false,
  });

  const { hasPermission } = usePermissions();

  const paymentSteps: PaymentStep[] = [
    {
      id: 1,
      title: 'Payment Details',
      description: 'Enter payment amount and method',
      completed: step > 1,
    },
    {
      id: 2,
      title: 'Review & Verify',
      description: 'Review payment information',
      completed: step > 2,
    },
    {
      id: 3,
      title: 'Confirmation',
      description: 'Confirm payment processing',
      completed: step > 3,
    },
    {
      id: 4,
      title: 'Complete',
      description: 'Payment processed successfully',
      completed: step === 4,
    },
  ];

  useEffect(() => {
    loadOpenInvoices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.id]);

  useEffect(() => {
    if (paymentData.amount > 0) {
      calculatePaymentTotal();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentData.amount, paymentData.currency]);

  const loadOpenInvoices = async () => {
    try {
      const response = await fetch(`/api/support/customers/${customer.id}/invoices?status=open,past_due`);
      if (response.ok) {
        const invoices = await response.json();
        setOpenInvoices(invoices);
      }
    } catch (error) {
      console.error('Failed to load open invoices:', error);
    }
  };

  const calculatePaymentTotal = async () => {
    try {
      const response = await fetch('/api/support/payments/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paymentData.amount,
          currency: paymentData.currency,
          customerId: customer.id,
          method: paymentData.method,
        }),
      });

      if (response.ok) {
        const calc = await response.json();
        setCalculation(calc);
      }
    } catch (error) {
      console.error('Failed to calculate payment total:', error);
    }
  };

  const handleProcessPayment = async () => {
    if (!hasPermission('process_manual_payments')) {
      setError('You do not have permission to process manual payments');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch('/api/support/payments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment processing failed');
      }

      const confirmationData = await response.json();
      setConfirmation(confirmationData);
      setStep(4);
      onPaymentProcessed(paymentData.amount);
    } catch (error) {
      console.error('Payment processing failed:', error);
      setError(error instanceof Error ? error.message : 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const validatePaymentData = (): string[] => {
    const errors: string[] = [];

    if (paymentData.amount <= 0) {
      errors.push('Payment amount must be greater than 0');
    }

    if (paymentData.amount > 10000) {
      errors.push('Payment amount exceeds maximum limit ($10,000)');
    }

    if (!paymentData.description.trim()) {
      errors.push('Payment description is required');
    }

    if (paymentData.method === 'check' && !paymentData.reference?.trim()) {
      errors.push('Check number is required for check payments');
    }

    return errors;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const renderStepProgress = () => (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {paymentSteps.map((stepItem, index) => (
            <div key={stepItem.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  stepItem.completed || step === stepItem.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {stepItem.completed ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-medium">{stepItem.id}</span>
                )}
              </div>
              <div className="ml-2 hidden md:block">
                <p
                  className={`text-sm font-medium ${
                    stepItem.completed || step === stepItem.id ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {stepItem.title}
                </p>
                <p className="text-xs text-muted-foreground">{stepItem.description}</p>
              </div>
              {index < paymentSteps.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground mx-4" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderPaymentDetailsStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Customer Information */}
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-medium text-foreground mb-2">Processing payment for:</h3>
          <p className="text-lg font-semibold">{customer.name || 'Unknown Customer'}</p>
          <p className="text-muted-foreground">{customer.email}</p>
          <div className="flex space-x-2 mt-2">
            <Badge className="bg-primary/10 text-primary">{customer.tier.toUpperCase()}</Badge>
            <Badge variant="outline">{customer.status}</Badge>
          </div>
        </div>

        {/* Open Invoices */}
        {openInvoices.length > 0 && (
          <div>
            <h4 className="font-medium text-foreground mb-3">Outstanding Invoices</h4>
            <div className="space-y-2">
              {openInvoices.map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Invoice #{invoice.number}</p>
                    <p className="text-sm text-muted-foreground">{invoice.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(invoice.amountDue)}</p>
                    <Badge
                      className="text-xs"
                      variant={['past_due', 'overdue'].includes(invoice.status as string) ? 'destructive' : 'outline'}
                    >
                      {invoice.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="amount">Payment Amount *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max="10000"
                placeholder="0.00"
                value={paymentData.amount || ''}
                onChange={e =>
                  setPaymentData({
                    ...paymentData,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                className="pl-10"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="currency">Currency</Label>
            <select
              value={paymentData.currency}
              onChange={e => setPaymentData({ ...paymentData, currency: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
            </select>
          </div>

          <div>
            <Label htmlFor="method">Payment Method *</Label>
            <select
              value={paymentData.method}
              onChange={e => setPaymentData({ ...paymentData, method: e.target.value as unknown as typeof paymentData.method })}
              className="w-full px-3 py-2 border border-border rounded-md"
              required
            >
              <option value="card">Credit/Debit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="wire_transfer">Wire Transfer</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
            </select>
          </div>

          {paymentData.method === 'check' && (
            <div>
              <Label htmlFor="reference">Check Number *</Label>
              <Input
                placeholder="Enter check number"
                value={paymentData.reference || ''}
                onChange={e => setPaymentData({ ...paymentData, reference: e.target.value })}
                required
              />
            </div>
          )}

          {(paymentData.method === 'bank_transfer' || paymentData.method === 'wire_transfer') && (
            <div>
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                placeholder="Enter reference/confirmation number"
                value={paymentData.reference || ''}
                onChange={e => setPaymentData({ ...paymentData, reference: e.target.value })}
              />
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="description">Payment Description *</Label>
          <Input
            placeholder="e.g., Manual payment for subscription renewal"
            value={paymentData.description}
            onChange={e => setPaymentData({ ...paymentData, description: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="notes">Internal Notes</Label>
          <Textarea
            placeholder="Add any internal notes about this payment..."
            value={paymentData.notes || ''}
            onChange={e => setPaymentData({ ...paymentData, notes: e.target.value })}
            rows={3}
          />
        </div>

        {/* Options */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={paymentData.skipNotification}
              onChange={e => setPaymentData({ ...paymentData, skipNotification: e.target.checked })}
            />
            <Label htmlFor="skipNotification">Skip customer notification</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={paymentData.markAsPaid}
              onChange={e => setPaymentData({ ...paymentData, markAsPaid: e.target.checked })}
            />
            <Label htmlFor="markAsPaid">Mark as already paid (record-only)</Label>
          </div>
        </div>

        {/* Calculation Preview */}
        {calculation && (
          <div className="p-4 bg-primary/10 rounded-lg">
            <div className="flex items-center mb-3">
              <Calculator className="w-4 h-4 text-primary mr-2" />
              <h4 className="font-medium text-primary">Payment Calculation</h4>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(calculation.subtotal, calculation.currency)}</span>
              </div>
              {calculation.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(calculation.tax, calculation.currency)}</span>
                </div>
              )}
              {calculation.fees > 0 && (
                <div className="flex justify-between">
                  <span>Processing Fees:</span>
                  <span>{formatCurrency(calculation.fees, calculation.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Total:</span>
                <span>{formatCurrency(calculation.total, calculation.currency)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-end">
          <Button
            onClick={() => {
              const errors = validatePaymentData();
              if (errors.length > 0) {
                setError(errors.join(', '));
                return;
              }
              setError(null);
              setStep(2);
            }}
            className="flex items-center"
          >
            Continue to Review
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderReviewStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Review Payment Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-primary/20 bg-primary/10">
          <Info className="w-4 h-4 text-primary" />
          <div>
            <p className="font-medium text-primary">Please review all details carefully</p>
            <p className="text-sm text-primary">Once processed, this payment cannot be easily reversed.</p>
          </div>
        </Alert>

        {/* Payment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-foreground mb-2">Customer Details</h4>
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p>
                  <span className="font-medium">Name:</span> {customer.name}
                </p>
                <p>
                  <span className="font-medium">Email:</span> {customer.email}
                </p>
                <p>
                  <span className="font-medium">ID:</span> {customer.id}
                </p>
                <p>
                  <span className="font-medium">Tier:</span> {customer.tier.toUpperCase()}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-2">Payment Details</h4>
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p>
                  <span className="font-medium">Amount:</span>{' '}
                  {formatCurrency(paymentData.amount, paymentData.currency)}
                </p>
                <p>
                  <span className="font-medium">Method:</span> {paymentData.method.replace('_', ' ').toUpperCase()}
                </p>
                <p>
                  <span className="font-medium">Description:</span> {paymentData.description}
                </p>
                {paymentData.reference && (
                  <p>
                    <span className="font-medium">Reference:</span> {paymentData.reference}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {calculation && (
              <div>
                <h4 className="font-medium text-foreground mb-2">Final Calculation</h4>
                <div className="p-3 bg-success/10 rounded-lg">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Payment Amount:</span>
                      <span>{formatCurrency(calculation.subtotal, calculation.currency)}</span>
                    </div>
                    {calculation.tax > 0 && (
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>{formatCurrency(calculation.tax, calculation.currency)}</span>
                      </div>
                    )}
                    {calculation.fees > 0 && (
                      <div className="flex justify-between">
                        <span>Fees:</span>
                        <span>{formatCurrency(calculation.fees, calculation.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>Total to Process:</span>
                      <span>{formatCurrency(calculation.total, calculation.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium text-foreground mb-2">Processing Options</h4>
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p>
                  <span className="font-medium">Customer Notification:</span>{' '}
                  {paymentData.skipNotification ? 'Disabled' : 'Enabled'}
                </p>
                <p>
                  <span className="font-medium">Record Type:</span>{' '}
                  {paymentData.markAsPaid ? 'Record Only' : 'Live Processing'}
                </p>
              </div>
            </div>

            {paymentData.notes && (
              <div>
                <h4 className="font-medium text-foreground mb-2">Internal Notes</h4>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{paymentData.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(1)}>
            Back to Edit
          </Button>
          <Button onClick={() => setStep(3)} className="flex items-center">
            Continue to Confirmation
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderConfirmationStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-error">
          <Shield className="w-5 h-5 mr-2" />
          Final Confirmation Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-error/20 bg-error/10">
          <AlertTriangle className="w-4 h-4 text-error" />
          <div>
            <p className="font-medium text-error">Security Confirmation</p>
            <p className="text-sm text-error">
              You are about to process a manual payment of {formatCurrency(paymentData.amount, paymentData.currency)}
              for {customer.name}. This action cannot be undone.
            </p>
          </div>
        </Alert>

        <div className="p-6 border-2 border-border rounded-lg">
          <h3 className="text-lg font-semibold text-foreground mb-4">Final Payment Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Customer:</p>
              <p className="font-medium">{customer.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount:</p>
              <p className="font-medium text-xl">{formatCurrency(paymentData.amount, paymentData.currency)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Method:</p>
              <p className="font-medium">{paymentData.method.replace('_', ' ').toUpperCase()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Processing Time:</p>
              <p className="font-medium">{paymentData.markAsPaid ? 'Immediate (Record Only)' : 'Immediate'}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(2)}>
            Back to Review
          </Button>
          <Button
            onClick={handleProcessPayment}
            disabled={isProcessing}
            className="bg-error hover:bg-error/90 text-white flex items-center"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            {isProcessing ? 'Processing Payment...' : 'Process Payment Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderCompletionStep = () => (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Payment Processed Successfully!</h2>
          <p className="text-muted-foreground">
            The payment of {formatCurrency(paymentData.amount, paymentData.currency)} has been processed for{' '}
            {customer.name}.
          </p>
        </div>

        {confirmation && (
          <div className="mb-6 p-4 bg-success/10 rounded-lg text-left">
            <h3 className="font-medium text-success mb-2">Transaction Details</h3>
            <div className="space-y-1 text-sm text-success">
              <p>
                <span className="font-medium">Transaction ID:</span> {confirmation.transactionId}
              </p>
              <p>
                <span className="font-medium">Processing Time:</span> {confirmation.estimatedProcessingTime}
              </p>
              <p>
                <span className="font-medium">Status:</span>{' '}
                {confirmation.confirmationType.replace('_', ' ').toUpperCase()}
              </p>
            </div>

            {confirmation.nextSteps.length > 0 && (
              <div className="mt-3">
                <p className="font-medium text-success mb-1">Next Steps:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-success">
                  {confirmation.nextSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center space-x-3">
          <Button
            onClick={() => {
              setStep(1);
              setPaymentData({
                customerId: customer.id,
                amount: 0,
                currency: 'USD',
                method: 'card',
                description: '',
                reference: '',
                notes: '',
                skipNotification: false,
                markAsPaid: false,
              });
              setConfirmation(null);
              setError(null);
            }}
          >
            Process Another Payment
          </Button>
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            View Transaction
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Manual Payment Processing</h2>
        <Badge variant="outline" className="flex items-center">
          <Shield className="w-3 h-3 mr-1" />
          Secure Processing
        </Badge>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-error/20 bg-error/10">
          <AlertTriangle className="w-4 h-4 text-error" />
          <div>
            <p className="font-medium text-error">Payment Error</p>
            <p className="text-sm text-error">{error}</p>
          </div>
        </Alert>
      )}

      {/* Progress Steps */}
      {renderStepProgress()}

      {/* Step Content */}
      {step === 1 && renderPaymentDetailsStep()}
      {step === 2 && renderReviewStep()}
      {step === 3 && renderConfirmationStep()}
      {step === 4 && renderCompletionStep()}
    </div>
  );
};

export default ManualPaymentProcessor;
