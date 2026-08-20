'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StripeProvider from '../../components/payment/StripeProvider';
import { PaymentForm } from '../../components/payment/PaymentForm';
import { PaymentConfirmationComponent } from '../../components/payment/PaymentConfirmation';
import { PaymentMethodsManager } from '../../components/payment/PaymentMethodsManager';
import { PaymentHistory } from '../../components/payment/PaymentHistory';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert } from '../../components/ui/alert';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { PaymentTransaction, PaymentConfirmation } from '../../lib/types/payment';
import { CreditCard, History, Settings, ArrowLeft, Shield, AlertCircle, Check } from 'lucide-react';

type PaymentPageView = 'payment' | 'confirmation' | 'methods' | 'history';

const PaymentPageContent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [currentView, setCurrentView] = useState<PaymentPageView>('payment');
  const [paymentConfirmation, setPaymentConfirmation] = useState<PaymentConfirmation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Parse URL parameters
  const amount = searchParams.get('amount') ? parseFloat(searchParams.get('amount')!) : 2.99;
  const currency = searchParams.get('currency') || 'USD';
  const description = searchParams.get('description') || 'GeoLeap Premium Subscription';
  const initialView = (searchParams.get('view') as PaymentPageView) || 'payment';
  const paymentIntentId = searchParams.get('payment_intent');
  const successParam = searchParams.get('success');

  useEffect(() => {
    // Handle success redirect from Stripe
    if (successParam === 'true' && paymentIntentId) {
      setCurrentView('confirmation');
      // Here you would typically verify the payment with your backend
    } else {
      setCurrentView(initialView);
    }
  }, [initialView, successParam, paymentIntentId]);

  const handlePaymentSuccess = (transaction: PaymentTransaction) => {
    const confirmation: PaymentConfirmation = {
      transaction,
      nextSteps: [
        'Check your email for a receipt and confirmation',
        'Your premium features are now active',
        'Start exploring unlimited global search results',
      ],
      isSubscription: description.toLowerCase().includes('subscription'),
    };

    setPaymentConfirmation(confirmation);
    setCurrentView('confirmation');
    setError(null);
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleContinueToDashboard = () => {
    router.push('/dashboard');
  };

  const handleViewChange = (view: PaymentPageView) => {
    setCurrentView(view);
    setError(null);

    // Update URL without page reload
    const params = new URLSearchParams(searchParams);
    params.set('view', view);
    router.replace(`/payment?${params.toString()}`, { scroll: false });
  };

  const renderNavigation = () => (
    <Card className="p-4">
      <div className="flex items-center space-x-2 overflow-x-auto">
        <Button
          variant={currentView === 'payment' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleViewChange('payment')}
          className="flex items-center space-x-2 whitespace-nowrap"
        >
          <CreditCard className="w-4 h-4" />
          <span>Make Payment</span>
        </Button>

        <Button
          variant={currentView === 'methods' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleViewChange('methods')}
          className="flex items-center space-x-2 whitespace-nowrap"
        >
          <Settings className="w-4 h-4" />
          <span>Payment Methods</span>
        </Button>

        <Button
          variant={currentView === 'history' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleViewChange('history')}
          className="flex items-center space-x-2 whitespace-nowrap"
        >
          <History className="w-4 h-4" />
          <span>History</span>
        </Button>
      </div>
    </Card>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'payment':
        return (
          <StripeProvider>
            <PaymentForm
              amount={amount}
              currency={currency}
              description={description}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onCancel={() => router.back()}
              showSavePaymentMethod={true}
            />
          </StripeProvider>
        );

      case 'confirmation':
        if (!paymentConfirmation) {
          return (
            <Card className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Payment to Confirm</h3>
              <p className="text-muted-foreground mb-4">Complete a payment to see confirmation details.</p>
              <Button onClick={() => handleViewChange('payment')}>Make Payment</Button>
            </Card>
          );
        }

        return (
          <PaymentConfirmationComponent
            confirmation={paymentConfirmation}
            onContinue={handleContinueToDashboard}
            showNextSteps={true}
          />
        );

      case 'methods':
        return <PaymentMethodsManager onAddNewMethod={() => handleViewChange('payment')} showAddButton={true} />;

      case 'history':
        return <PaymentHistory pageSize={10} showFilters={true} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.back()} className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
        </div>

        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Secure Payments</h1>
          </div>
          <p className="text-muted-foreground">Manage your payments and subscriptions securely</p>
        </div>

        {/* Global Error Display */}
        {error && (
          <div className="mb-6">
            <Alert className="border-error bg-error/10">
              <AlertCircle className="w-4 h-4 text-error" />
              <div className="text-error">
                <p className="font-medium">Payment Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </Alert>
          </div>
        )}

        {/* Navigation */}
        {currentView !== 'confirmation' && <div className="mb-6">{renderNavigation()}</div>}

        {/* Main Content */}
        <div className="space-y-6">{renderContent()}</div>

        {/* Security Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <Card className="p-6 bg-success/10 border-success/30">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <Shield className="w-5 h-5 text-success" />
                <span className="font-semibold text-success">Enterprise-Grade Security</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4 text-success" />
                  <span className="text-success">256-bit SSL Encryption</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4 text-success" />
                  <span className="text-success">PCI DSS Level 1 Certified</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4 text-success" />
                  <span className="text-success">SOC 2 Type II Compliant</span>
                </div>
              </div>

              <p className="text-xs text-success/80">
                Your payment information is protected by the same security standards used by banks. We never store your
                card details on our servers.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default function PaymentPage() {
  return (
    <Suspense fallback={<SkeletonLoader />}>
      <PaymentPageContent />
    </Suspense>
  );
}
