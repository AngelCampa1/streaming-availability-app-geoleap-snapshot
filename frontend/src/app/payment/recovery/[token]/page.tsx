'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { PaymentForm } from '../../../../components/payment/PaymentForm';
import { StripeProvider } from '../../../../components/payment/StripeProvider';
import { CreditCard, AlertTriangle, CheckCircle, Clock, ArrowLeft, Shield, Loader2, AlertCircle } from 'lucide-react';
import { usePaymentRecovery } from '../../../../hooks/usePaymentRecovery';
import { usePayment } from '../../../../hooks/usePayment';
import { FailedPayment, PaymentTransaction } from '../../../../lib/types/payment';

export default function PaymentRecoveryPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const { recoverySession, isLoading, error, loadRecoverySession, completeRecovery, getFailedPaymentDetails } =
    usePaymentRecovery();

  const { createPayment: _createPayment } = usePayment();

  const [failedPayment, setFailedPayment] = useState<FailedPayment | null>(null);
  const [_isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Load recovery session on mount
  useEffect(() => {
    if (token) {
      loadRecoverySession(token);
    }
  }, [token, loadRecoverySession]);

  // Load failed payment details when recovery session is loaded
  useEffect(() => {
    if (recoverySession && !failedPayment) {
      getFailedPaymentDetails(recoverySession.failedPaymentId)
        .then(setFailedPayment)
        .catch((err) => {
          console.error('Failed to load payment details:', err);
          setLocalError('Failed to load payment details. Please try refreshing the page.');
        });
    }
  }, [recoverySession, failedPayment, getFailedPaymentDetails]);

  const handlePaymentSuccess = async (_transaction: PaymentTransaction) => {
    try {
      setIsProcessingPayment(true);
      setLocalError(null);
      setPaymentSuccess(true);

      // Complete the recovery session
      if (recoverySession) {
        await completeRecovery(recoverySession.sessionToken, 'payment_completed');
        setSessionCompleted(true);
      }

      // Redirect to success page after a short delay
      setTimeout(() => {
        router.push('/payment/success?recovery=true');
      }, 3000);
    } catch (err) {
      console.error('Error completing recovery session:', err);
      setLocalError('Payment was processed but we encountered an issue finalizing your session. Please contact support.');
      setPaymentSuccess(false);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentError = (errorMsg: string) => {
    console.error('Payment error during recovery:', errorMsg);
    setLocalError(errorMsg || 'Payment failed. Please try again or use a different payment method.');
  };

  const handleSessionComplete = async (type: string = 'user_dismissed') => {
    try {
      setLocalError(null);
      if (recoverySession) {
        await completeRecovery(recoverySession.sessionToken, type);
        setSessionCompleted(true);
      }
    } catch (err) {
      console.error('Error completing recovery session:', err);
      setLocalError('Failed to complete session. Please try again.');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const isSessionExpired = () => {
    if (!recoverySession) return false;
    return new Date(recoverySession.expiresAt) < new Date();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Card className="w-full max-w-md p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading payment recovery session...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (error || localError || !recoverySession || !failedPayment) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-error mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">
              {localError ? 'Something Went Wrong' : 'Session Not Found'}
            </h2>
            <p className="text-muted-foreground">
              {error || localError || 'This recovery session is invalid or has expired.'}
            </p>
            {localError && (
              <Button onClick={() => setLocalError(null)} variant="outline" className="w-full mb-2">
                Try Again
              </Button>
            )}
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isSessionExpired()) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-center space-y-4">
            <Clock className="w-12 h-12 text-warning mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Session Expired</h2>
            <p className="text-muted-foreground">
              This payment recovery link has expired. Please check your account for new recovery options.
            </p>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (paymentSuccess || sessionCompleted) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-success mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Payment Recovered!</h2>
            <p className="text-muted-foreground">
              Your payment has been successfully processed. Your subscription is now active.
            </p>
            <div className="text-sm text-muted-foreground">Redirecting to confirmation page...</div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <CreditCard className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Payment Recovery</h1>
          </div>
          <p className="text-lg text-muted-foreground">Complete your payment to restore full access to GeoLeap Premium</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Recovery Information */}
          <div className="lg:col-span-1 space-y-4">
            {/* Failed Payment Summary */}
            <Card>
              <div className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-error" />
                  <h3 className="font-semibold text-foreground">Payment Issue</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Amount Due:</span>
                    <span className="font-semibold">
                      {formatCurrency(
                        failedPayment.paymentTransaction?.amount || 0,
                        failedPayment.paymentTransaction?.currency || 'USD'
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Issue:</span>
                    <div className="text-right">
                      <Badge className="mb-1">{failedPayment.failureType.replace('_', ' ')}</Badge>
                      <p className="text-xs text-muted-foreground">{failedPayment.failureMessage}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Attempts:</span>
                    <span>{failedPayment.retryCount} failed attempts</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Failed Date:</span>
                    <span className="text-sm">{new Date(failedPayment.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Security Notice */}
            <Card className="border-primary/30 bg-primary/10">
              <div className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <h4 className="font-medium text-foreground">Secure Recovery</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  This recovery session is secure and expires in{' '}
                  {Math.ceil((new Date(recoverySession.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60))}{' '}
                  hours. Your payment information is protected by bank-level encryption.
                </p>
              </div>
            </Card>

            {/* Help Section */}
            <Card>
              <div className="p-4">
                <h4 className="font-medium text-foreground mb-2">Need Help?</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Update your payment method if your card has expired</p>
                  <p>• Contact your bank if payments are being declined</p>
                  <p>• Try a different payment method if issues persist</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => window.open('/support', '_blank')}
                >
                  Contact Support
                </Button>
              </div>
            </Card>
          </div>

          {/* Payment Form */}
          <div className="lg:col-span-2">
            <StripeProvider>
              <PaymentForm
                amount={failedPayment.paymentTransaction?.amount || 0}
                currency={failedPayment.paymentTransaction?.currency || 'USD'}
                description={`Recovery: ${failedPayment.paymentTransaction?.description || 'GeoLeap Premium'}`}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={() => handleSessionComplete('user_cancelled')}
                showSavePaymentMethod={true}
              />
            </StripeProvider>
          </div>
        </div>

        {/* Alternative Actions */}
        <div className="mt-8 text-center">
          <Card className="p-6 bg-muted">
            <h3 className="font-medium text-foreground mb-4">Alternative Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Dashboard</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push('/settings')}
                className="flex items-center justify-center space-x-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>Update Payment Methods</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleSessionComplete('user_dismissed')}
                className="flex items-center justify-center space-x-2"
              >
                <Clock className="w-4 h-4" />
                <span>Remind Me Later</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
