'use client';

import React, { useState } from'react';
import { Card } from'../ui/card';
import { Button } from'../ui/button';
import { Badge } from'../ui/badge';
import { Alert } from'../ui/alert';
import { Separator } from'../ui/separator';
import {
  AlertTriangle,
  CreditCard,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from'lucide-react';
import { usePaymentRecovery } from'../../hooks/usePaymentRecovery';
import { FailedPayment } from'../../lib/types/payment';

interface PaymentRecoveryDashboardProps {
  className?: string;
}

export const PaymentRecoveryDashboard: React.FC<PaymentRecoveryDashboardProps> = ({ className ='' }) => {
  const {
    failedPayments,
    gracePeriod,
    inGracePeriod,
    restrictedFeatures,
    isLoading,
    isRetrying,
    error,
    retryPayment,
    refreshData,
    clearError,
    hasActiveFailedPayments,
    getGracePeriodDaysRemaining,
  } = usePaymentRecovery();

  const [selectedFailedPayment, setSelectedFailedPayment] = useState<FailedPayment | null>(null);
  const [_showRetryDetails, _setShowRetryDetails] = useState(false);

  const handleRetryPayment = async (failedPayment: FailedPayment, reason?: string) => {
    try {
      clearError();
      await retryPayment(failedPayment.id, reason ? { reason } : undefined);
      // Refresh data to get updated status
      await refreshData();
    } catch (error) {
      console.error('Failed to retry payment:', error);
    }
  };

  const _formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style:'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month:'short',
      day:'numeric',
      year:'numeric',
      hour:'2-digit',
      minute:'2-digit',
    });
  };

  const _getFailureTypeColor = (failureType: string) => {
    switch (failureType) {
      case'insufficient_funds':
        return'bg-warning/10 text-warning border-warning/20';
      case'expired_card':
        return'bg-warning/10 text-warning border-warning/20';
      case'card_declined':
        return'bg-destructive/10 text-destructive border-destructive/20';
      case'authentication_required':
        return'bg-info/10 text-info border-info/20';
      default:
        return'bg-muted text-muted-foreground border-border';
    }
  };

  const _getStatusColor = (status: string) => {
    switch (status) {
      case'active':
        return'bg-destructive/10 text-destructive';
      case'resolved':
        return'bg-success/10 text-success';
      case'suspended':
        return'bg-muted text-muted-foreground';
      case'expired':
        return'bg-warning/10 text-warning';
      default:
        return'bg-muted text-muted-foreground';
    }
  };

  if (isLoading && failedPayments.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading payment recovery information...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Error Alert */}
      {error && (
        <Alert className="border-destructive/20 bg-destructive/10">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <div className="text-destructive">
            <p className="font-medium">Payment Recovery Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearError}
            className="mt-2 text-destructive border-destructive/30"
          >
            Dismiss
          </Button>
        </Alert>
      )}

      {/* Grace Period Status */}
      {inGracePeriod && gracePeriod && (
        <Card className="border-warning/20 bg-warning/10">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-warning" />
                <h3 className="font-semibold text-foreground">Grace Period Active</h3>
              </div>
              <Badge className="bg-warning/10 text-warning">
                {getGracePeriodDaysRemaining()} days remaining
              </Badge>
            </div>
            <p className="text-sm text-warning mt-2">
              Your subscription remains active while we attempt to resolve payment issues. Access will be restricted
              after {formatDate(gracePeriod.endDate)}.
            </p>
            {restrictedFeatures.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-warning">Currently restricted features:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {restrictedFeatures.map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Failed Payments Summary */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">Payment Recovery</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => refreshData()} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh
            </Button>
          </div>

          {!hasActiveFailedPayments() ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">All payments up to date</h3>
              <p className="text-muted-foreground">No failed payments require attention at this time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Failed Payments */}
              <div className="space-y-3">
                {failedPayments
                  .filter(fp => fp.recoveryStatus ==='active')
                  .map(failedPayment => (
                    <FailedPaymentCard
                      key={failedPayment.id}
                      failedPayment={failedPayment}
                      isRetrying={isRetrying}
                      onRetry={reason => handleRetryPayment(failedPayment, reason)}
                      onViewDetails={() => setSelectedFailedPayment(failedPayment)}
                    />
                  ))}
              </div>

              {/* Resolved Payments (if any) */}
              {failedPayments.some(fp => fp.recoveryStatus ==='resolved') && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium text-foreground mb-3">Recently Resolved</h3>
                    <div className="space-y-3">
                      {failedPayments
                        .filter(fp => fp.recoveryStatus ==='resolved')
                        .slice(0, 3)
                        .map(failedPayment => (
                          <ResolvedPaymentCard key={failedPayment.id} failedPayment={failedPayment} />
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Failed Payment Details Modal */}
      {selectedFailedPayment && (
        <FailedPaymentDetailsModal
          failedPayment={selectedFailedPayment}
          onClose={() => setSelectedFailedPayment(null)}
          onRetry={async reason => {
            await handleRetryPayment(selectedFailedPayment, reason);
            setSelectedFailedPayment(null);
          }}
          isRetrying={isRetrying}
        />
      )}
    </div>
  );
};

// Failed Payment Card Component
interface FailedPaymentCardProps {
  failedPayment: FailedPayment;
  isRetrying: boolean;
  onRetry: (reason?: string) => Promise<void>;
  onViewDetails: () => void;
}

const FailedPaymentCard: React.FC<FailedPaymentCardProps> = ({ failedPayment, isRetrying, onRetry, onViewDetails }) => {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style:'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getFailureTypeColor = (failureType: string) => {
    switch (failureType) {
      case'insufficient_funds':
        return'bg-warning/10 text-warning border-warning/20';
      case'expired_card':
        return'bg-warning/10 text-warning border-warning/20';
      case'card_declined':
        return'bg-destructive/10 text-destructive border-destructive/20';
      case'authentication_required':
        return'bg-info/10 text-info border-info/20';
      default:
        return'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Card className="border-l-4 border-l-destructive">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <h3 className="font-medium text-foreground">Payment Failed</h3>
              <Badge className={getFailureTypeColor(failedPayment.failureType)}>
                {failedPayment.failureType.replace(/_/g, ' ')}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-2">{failedPayment.failureMessage}</p>

            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>
                Amount:{' '}
                {formatCurrency(
                  failedPayment.paymentTransaction?.amount || 0,
                  failedPayment.paymentTransaction?.currency ||'USD'
                )}
              </span>
              <span>Attempts: {failedPayment.retryCount}</span>
              {failedPayment.nextRetryAt && (
                <span>Next retry: {new Date(failedPayment.nextRetryAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          <div className="flex space-x-2 ml-4">
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              Details
            </Button>
            {failedPayment.isRetriable && (
              <Button
                size="sm"
                onClick={() => onRetry()}
                disabled={isRetrying}
                className="bg-primary hover:bg-primary/90"
              >
                {isRetrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Retry Now
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Resolved Payment Card Component
interface ResolvedPaymentCardProps {
  failedPayment: FailedPayment;
}

const ResolvedPaymentCard: React.FC<ResolvedPaymentCardProps> = ({ failedPayment }) => {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style:'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  return (
    <Card className="border-l-4 border-l-success bg-success/10">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <h3 className="font-medium text-foreground">Payment Resolved</h3>
            <Badge className="bg-success/10 text-success">
              {failedPayment.resolutionMethod ||'Automatic'}
            </Badge>
          </div>

          <div className="text-sm text-success">
            {formatCurrency(
              failedPayment.paymentTransaction?.amount || 0,
              failedPayment.paymentTransaction?.currency ||'USD'
            )}
          </div>
        </div>

        <p className="text-sm text-success mt-1">
          Resolved on {failedPayment.resolvedAt ? new Date(failedPayment.resolvedAt).toLocaleDateString() :'Unknown'}
          {failedPayment.retryCount > 0 && ` after ${failedPayment.retryCount} attempts`}
        </p>
      </div>
    </Card>
  );
};

// Failed Payment Details Modal Component
interface FailedPaymentDetailsModalProps {
  failedPayment: FailedPayment;
  onClose: () => void;
  onRetry: (reason?: string) => Promise<void>;
  isRetrying: boolean;
}

const FailedPaymentDetailsModal: React.FC<FailedPaymentDetailsModalProps> = ({
  failedPayment,
  onClose,
  onRetry,
  isRetrying,
}) => {
  const [retryReason, setRetryReason] = useState('');

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style:'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case'active':
        return'bg-destructive/10 text-destructive';
      case'resolved':
        return'bg-success/10 text-success';
      case'pending':
        return'bg-warning/10 text-warning';
      default:
        return'bg-muted text-muted-foreground';
    }
  };

  const getFailureTypeColor = (type: string) => {
    switch (type) {
      case'card_declined':
        return'bg-destructive/10 text-destructive border-destructive/20';
      case'insufficient_funds':
        return'bg-warning/10 text-warning border-warning/20';
      case'network_error':
        return'bg-warning/10 text-warning border-warning/20';
      case'fraud_detected':
        return'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return'bg-muted text-muted-foreground border-border';
    }
  };

  const handleRetryWithReason = async () => {
    await onRetry(retryReason || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50  flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h2 className="text-xl font-semibold text-foreground">Failed Payment Details</h2>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              <XCircle className="w-4 h-4" />
            </Button>
          </div>

          <Separator />

          {/* Payment Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-foreground mb-2">Payment Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">
                    {formatCurrency(
                      failedPayment.paymentTransaction?.amount || 0,
                      failedPayment.paymentTransaction?.currency ||'USD'
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={getStatusColor(failedPayment.recoveryStatus)}>{failedPayment.recoveryStatus}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Retry Count:</span>
                  <span>{failedPayment.retryCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Failed Date:</span>
                  <span>{new Date(failedPayment.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-foreground mb-2">Failure Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <Badge className={`ml-2 ${getFailureTypeColor(failedPayment.failureType)}`}>
                    {failedPayment.failureType.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Decline Code:</span>
                  <span className="ml-2 font-mono text-xs bg-muted px-2 py-1 rounded">{failedPayment.declineCode}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Message:</span>
                  <p className="mt-1 text-foreground bg-muted p-2 rounded text-xs">{failedPayment.failureMessage}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Retry Information */}
          {failedPayment.isRetriable && (
            <>
              <Separator />
              <div>
                <h3 className="font-medium text-foreground mb-3">Retry Payment</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Retry Reason (Optional)</label>
                    <textarea
                      value={retryReason}
                      onChange={e => setRetryReason(e.target.value)}
                      placeholder="Enter reason for retry (e.g., updated payment method, resolved with bank)"
                      className="w-full p-3 border border-border rounded-md resize-none bg-background text-foreground"
                      rows={3}
                    />
                  </div>

                  <div className="flex space-x-3">
                    <Button variant="outline" className="flex-1" onClick={onClose} disabled={isRetrying}>
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-primary hover:bg-primary/90"
                      onClick={handleRetryWithReason}
                      disabled={isRetrying}
                    >
                      {isRetrying ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Retrying...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="w-4 h-4" />
                          <span>Retry Payment</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Retry Attempts History */}
          {failedPayment.retryAttempts && failedPayment.retryAttempts.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-medium text-foreground mb-3">Retry History</h3>
                <div className="space-y-2">
                  {failedPayment.retryAttempts.map(attempt => (
                    <div key={attempt.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          {attempt.status ==='succeeded' ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                          <span className="text-sm font-medium">Attempt #{attempt.attemptNumber}</span>
                        </div>
                        <Badge
                          className={
                            attempt.status ==='succeeded'
                              ?'bg-success/10 text-success'
                              :'bg-destructive/10 text-destructive'
                          }
                        >
                          {attempt.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(attempt.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
