'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { confirmPaymentIntent, getPaymentTransaction } from '../../../lib/api';
import { PaymentConfirmationComponent } from '../../../components/payment/PaymentConfirmation';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { SkeletonLoader } from '../../../components/common/SkeletonLoader';
import { PaymentConfirmation, PaymentTransaction } from '../../../lib/types/payment';
import { Loader2, AlertCircle } from 'lucide-react';
import { triggerSubscriptionUpdate } from '../../../hooks/useSubscription';

const PaymentSuccessContent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<PaymentConfirmation | null>(null);

  // Extract URL parameters - support both Stripe redirect and our manual redirect flow
  const paymentIntentId = searchParams.get('payment_intent');
  const transactionId = searchParams.get('transaction_id');
  const planName = searchParams.get('plan');
  const clientSecret = searchParams.get('payment_intent_client_secret');
  const redirectStatus = searchParams.get('redirect_status');

  useEffect(() => {
    const verifyPayment = async () => {
      // Support both flows:
      // 1. Stripe redirect flow: uses payment_intent query param
      // 2. Our manual redirect flow: uses transaction_id query param (for successful immediate payments)
      if (!paymentIntentId && !transactionId) {
        setError('No payment information found. Please try again.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let transaction: PaymentTransaction;

        if (paymentIntentId) {
          // Always use confirmPaymentIntent when we have a payment_intent ID
          // This syncs the transaction status with Stripe to get the actual current status
          transaction = await confirmPaymentIntent(paymentIntentId);
        } else if (transactionId) {
          // Fallback: fetch transaction directly (may have stale status)
          // This path should rarely be used now since we pass payment_intent from upgrade page
          transaction = await getPaymentTransaction(transactionId);
        } else {
          throw new Error('No payment identifier found');
        }

        if (transaction.status === 'succeeded') {
          // Trigger subscription update to refresh user's subscription status across all components
          triggerSubscriptionUpdate();

          const paymentConfirmation: PaymentConfirmation = {
            transaction,
            nextSteps: [
              'Check your email for a receipt and confirmation',
              'Your premium features are now active',
              'Start exploring unlimited global search results',
              'Access advanced filters and sorting options',
            ],
            isSubscription: transaction.description?.toLowerCase().includes('subscription') || false,
          };

          setConfirmation(paymentConfirmation);
        } else {
          // Handle other statuses
          switch (transaction.status) {
            case 'requires_action':
              setError('Additional authentication is required. Please complete the verification process.');
              break;
            case 'requires_payment_method':
              setError('Payment method failed. Please try a different payment method.');
              break;
            case 'processing':
              setError('Payment is still processing. Please wait a moment and refresh the page.');
              break;
            default:
              setError(`Payment status: ${transaction.status}. Please contact support if this persists.`);
          }
        }
      } catch (err) {
        console.error('Payment verification failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to verify payment';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [paymentIntentId, transactionId]);

  const handleContinue = () => {
    router.push('/dashboard');
  };

  const handleRetry = () => {
    router.push('/payment');
  };

  const handleContactSupport = () => {
    // In a real implementation, this would open a support ticket or chat
    window.open('mailto:hello@example.com?subject=Payment%20Issue', '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Verifying Payment</h2>
          <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted py-12">
        <div className="container mx-auto px-4 max-w-md">
          <Card className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Payment Verification Failed</h2>
            <p className="text-muted-foreground mb-6">{error}</p>

            <div className="space-y-3">
              <Button onClick={handleRetry} className="w-full bg-primary hover:bg-primary/90">
                Try Again
              </Button>

              <Button variant="outline" onClick={handleContactSupport} className="w-full">
                Contact Support
              </Button>

              <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full">
                Return to Dashboard
              </Button>
            </div>
          </Card>

          {/* Debug Information (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <Card className="mt-4 p-4 bg-warning/10 border-warning/30">
              <h4 className="font-medium text-warning mb-2">Debug Information</h4>
              <div className="text-xs text-warning/80 space-y-1">
                <p>Payment Intent: {paymentIntentId || 'Not provided'}</p>
                <p>Transaction ID: {transactionId || 'Not provided'}</p>
                <p>Plan: {planName || 'Not provided'}</p>
                <p>Redirect Status: {redirectStatus || 'Not provided'}</p>
                <p>Client Secret: {clientSecret ? 'Present' : 'Not provided'}</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (!confirmation) {
    return (
      <div className="min-h-screen bg-muted py-12">
        <div className="container mx-auto px-4 max-w-md">
          <Card className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No Payment Found</h2>
            <p className="text-muted-foreground mb-6">
              We couldn&apos;t find a payment to confirm. Please try making a payment again.
            </p>

            <div className="space-y-3">
              <Button onClick={() => router.push('/payment')} className="w-full bg-primary hover:bg-primary/90">
                Make Payment
              </Button>

              <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full">
                Return to Dashboard
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted py-12">
      <div className="container mx-auto px-4">
        <PaymentConfirmationComponent confirmation={confirmation} onContinue={handleContinue} showNextSteps={true} />
      </div>
    </div>
  );
};

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<SkeletonLoader />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
