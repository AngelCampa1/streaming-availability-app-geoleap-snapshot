'use client';

import React from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Check, Download, Mail, Calendar, CreditCard, Receipt, ExternalLink, Shield, Lock } from 'lucide-react';
import { PaymentConfirmation } from '../../lib/types/payment';

interface PaymentConfirmationProps {
  confirmation: PaymentConfirmation;
  onContinue?: () => void;
  onDownloadReceipt?: () => void;
  showNextSteps?: boolean;
}

export const PaymentConfirmationComponent: React.FC<PaymentConfirmationProps> = ({
  confirmation,
  onContinue,
  onDownloadReceipt,
  showNextSteps = true,
}) => {
  const { transaction, receiptUrl, nextSteps, isSubscription } = confirmation;

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Success Header */}
      <Card className="p-6 text-center">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-success" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Payment Successful!</h2>
            <p className="text-muted-foreground">Your payment has been processed successfully</p>
          </div>

          <Badge className="bg-success/10 text-success border-success/20">
            <Receipt className="w-3 h-3 mr-1" />
            Transaction Complete
          </Badge>
        </div>
      </Card>

      {/* Transaction Details */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Transaction Details</h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold">{formatCurrency(transaction.amount, transaction.currency)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Description</span>
            <span className="font-medium">{transaction.description}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Transaction ID</span>
            <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{transaction.id.substring(0, 8)}...</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span>{formatDate(transaction.processedAt || transaction.createdAt)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge className="bg-success/10 text-success border-success/20">{transaction.status}</Badge>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex space-x-3">
          {receiptUrl && (
            <Button variant="outline" size="sm" className="flex-1" onClick={onDownloadReceipt}>
              <Download className="w-4 h-4 mr-2" />
              Receipt
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              // Copy transaction ID to clipboard
              navigator.clipboard.writeText(transaction.id);
            }}
          >
            <Mail className="w-4 h-4 mr-2" />
            Copy ID
          </Button>
        </div>
      </Card>

      {/* Next Steps */}
      {showNextSteps && nextSteps && nextSteps.length > 0 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center space-x-2 mb-3">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">What&apos;s Next?</h3>
          </div>

          <div className="space-y-3">
            {nextSteps.map((step, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <p className="text-foreground text-sm">{step}</p>
              </div>
            ))}
          </div>

          {isSubscription && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Premium features are now active!</span>
              </div>
              <p className="text-xs text-primary mt-1">
                You can start enjoying unlimited searches and global results immediately.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Continue Button */}
      {onContinue && (
        <div className="text-center">
          <Button onClick={onContinue} className="w-full bg-success hover:bg-success/90">
            <ExternalLink className="w-4 h-4 mr-2" />
            Continue to Dashboard
          </Button>
        </div>
      )}

      {/* Security Footer */}
      <div className="text-center space-y-2 pt-4">
        <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Shield className="w-3 h-3" />
            <span>Stripe Security</span>
          </div>
          <div className="flex items-center space-x-1">
            <Lock className="w-3 h-3" />
            <span>PCI Compliant</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Your payment was processed securely. Receipt sent to your email.</p>
      </div>
    </div>
  );
};
