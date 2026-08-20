'use client';

import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement, AddressElement } from '@stripe/react-stripe-js';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Alert } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { createPaymentIntent, confirmPaymentIntent, mapStripeErrorToPaymentError, getPaymentErrorMessage } from '../../lib/api';
import {
  PaymentFormErrors,
  PaymentTransaction,
  CreatePaymentIntentRequest,
  PaymentFormProps,
} from '../../lib/types/payment';
import { CreditCard, Shield, Lock, Check, AlertCircle, Loader2 } from 'lucide-react';
import { premiumPlan } from '@/lib/pricing';

export const PaymentForm: React.FC<PaymentFormProps> = ({
  amount = premiumPlan.priceUsd,
  currency = 'USD',
  description = 'GeoLeap Premium Subscription',
  onSuccess,
  onError,
  onCancel,
  showSavePaymentMethod = true,
  prefilledPaymentMethodId: _prefilledPaymentMethodId,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<PaymentFormErrors>({});
  const [savePaymentMethod, setSavePaymentMethod] = useState(showSavePaymentMethod);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setErrors({ general: 'Payment system not ready. Please try again.' });
      return;
    }

    setIsProcessing(true);
    setErrors({});

    try {
      // First, validate the form elements
      const { error: submitError } = await elements.submit();
      if (submitError) {
        const paymentError = mapStripeErrorToPaymentError(submitError);
        const errorMessage = getPaymentErrorMessage(paymentError);
        setErrors({ processing: errorMessage });
        onError?.(errorMessage);
        return;
      }

      // Create payment intent on our backend
      const request: CreatePaymentIntentRequest = {
        amount,
        currency,
        description,
        confirmPayment: false,
      };

      const transaction = await createPaymentIntent(request);

      if (!transaction.clientSecret) {
        throw new Error('Failed to get payment client secret');
      }

      // Confirm payment with the client secret from our backend
      const { error: confirmError, paymentIntent: confirmedIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: transaction.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
          save_payment_method: savePaymentMethod,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        const paymentError = mapStripeErrorToPaymentError(confirmError);
        const errorMessage = getPaymentErrorMessage(paymentError);
        setErrors({ processing: errorMessage });
        onError?.(errorMessage);
        return;
      }

      if (confirmedIntent && confirmedIntent.status === 'succeeded') {
        // CRITICAL: Call backend to confirm payment and upgrade user subscription
        // This triggers UpgradeUserSubscriptionAsync on the backend
        try {
          const confirmedTransaction = await confirmPaymentIntent(confirmedIntent.id);
          onSuccess?.(confirmedTransaction);
        } catch (confirmError) {
          // Even if backend confirmation fails, the payment succeeded with Stripe
          // Log the error but still show success to user
          console.error('Backend confirmation failed, but Stripe payment succeeded:', confirmError);
          const updatedTransaction: PaymentTransaction = {
            ...transaction,
            status: 'succeeded',
            processedAt: new Date().toISOString(),
          };
          onSuccess?.(updatedTransaction);
        }
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      setErrors({ general: errorMessage });
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amountValue: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode.toUpperCase(),
    }).format(amountValue);
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Secure Payment</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground">{description}</h2>
        <p className="text-3xl font-bold text-primary">{formatCurrency(amount, currency)}</p>
      </div>

      <Separator />

      {/* Error Display */}
      {(errors.general || errors.processing || errors.card) && (
        <Alert className="border-error/20 bg-error/10">
          <AlertCircle className="w-4 h-4 text-error" />
          <div className="text-error">
            <p className="font-medium">Payment Error</p>
            <p className="text-sm">{errors.general || errors.processing || errors.card}</p>
          </div>
        </Alert>
      )}

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Element */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">
            <CreditCard className="inline w-4 h-4 mr-2" />
            Payment Information
          </label>
          <div className="p-3 border border-border rounded-lg">
            <PaymentElement
              options={{
                layout: 'tabs',
                wallets: {
                  applePay: 'auto',
                  googlePay: 'auto',
                  // Link requires domain registration in Stripe Dashboard
                  // Enable once geoleap.app is registered at: Stripe Dashboard → Settings → Link
                  link: process.env.NEXT_PUBLIC_STRIPE_LINK_ENABLED === 'true' ? 'auto' : 'never',
                },
                defaultValues: {
                  billingDetails: {
                    email: '', // Will be auto-filled if user is logged in
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Billing Address */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">Billing Address</label>
          <div className="p-3 border border-border rounded-lg">
            <AddressElement
              options={{
                mode: 'billing',
                autocomplete: {
                  mode: 'automatic',
                },
              }}
            />
          </div>
        </div>

        {/* Save Payment Method Option */}
        {showSavePaymentMethod && (
          <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
            <input
              type="checkbox"
              checked={savePaymentMethod}
              onChange={e => setSavePaymentMethod(e.target.checked)}
              className="w-4 h-4 text-primary border-border rounded focus:ring-ring"
            />
            <label htmlFor="savePaymentMethod" className="flex-1 text-sm text-foreground">
              Save payment method for future purchases
            </label>
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
        )}

        {/* Security Badge */}
        <div className="bg-success/10 border border-success/20 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-success" />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-success">Secured by Stripe</span>
                <Badge
                  variant="outline"
                  className="text-xs bg-success/10 text-success border-success/20"
                >
                  PCI DSS Level 1
                </Badge>
              </div>
              <p className="text-xs text-success mt-1">
                Your payment information is encrypted and securely processed.
              </p>
            </div>
            <Check className="w-5 h-5 text-success" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {onCancel && (
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isProcessing}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={!stripe || !elements || isProcessing || !!errors.general}
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>Pay {formatCurrency(amount, currency)}</span>
              </div>
            )}
          </Button>
        </div>
      </form>

      {/* Additional Security Information */}
      <div className="text-center space-y-2 pt-4 border-t border-border">
        <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Lock className="w-3 h-3" />
            <span>256-bit SSL</span>
          </div>
          <div className="flex items-center space-x-1">
            <Shield className="w-3 h-3" />
            <span>PCI Compliant</span>
          </div>
          <div className="flex items-center space-x-1">
            <Check className="w-3 h-3" />
            <span>Bank-level Security</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/80">
          We never store your card details. All transactions are processed securely by Stripe.
        </p>
      </div>
    </Card>
  );
};
