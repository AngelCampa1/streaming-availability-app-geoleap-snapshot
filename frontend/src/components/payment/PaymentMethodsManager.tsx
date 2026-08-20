'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert } from '../ui/alert';
import { getPaymentMethods, detachPaymentMethod, setDefaultPaymentMethod, ApiError } from '../../lib/api';
import { PaymentMethod } from '../../lib/types/payment';
import { CreditCard, Star, Trash2, Plus, Loader2, AlertCircle, Check } from 'lucide-react';

interface PaymentMethodsManagerProps {
  onAddNewMethod?: () => void;
  showAddButton?: boolean;
}

export const PaymentMethodsManager: React.FC<PaymentMethodsManagerProps> = ({
  onAddNewMethod,
  showAddButton = true,
}) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingMethodId, setProcessingMethodId] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);
      const methods = await getPaymentMethods();
      setPaymentMethods(methods);
    } catch (err) {
      console.error('Failed to load payment methods:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load payment methods';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      setProcessingMethodId(methodId);
      setError(null);

      const updatedMethod = await setDefaultPaymentMethod(methodId);

      // Update local state
      setPaymentMethods(methods =>
        methods.map(method => ({
          ...method,
          isDefault: method.id === updatedMethod.id,
        }))
      );
    } catch (err) {
      console.error('Failed to set default payment method:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to set default payment method';
      setError(errorMessage);
    } finally {
      setProcessingMethodId(null);
    }
  };

  const handleDelete = async (methodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      setProcessingMethodId(methodId);
      setError(null);

      await detachPaymentMethod(methodId);

      // Remove from local state
      setPaymentMethods(methods => methods.filter(method => method.id !== methodId));
    } catch (err) {
      console.error('Failed to remove payment method:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to remove payment method';
      setError(errorMessage);
    } finally {
      setProcessingMethodId(null);
    }
  };

  const getCardBrandIcon = (_brand?: string) => {
    // Return a generic credit card icon for now
    // In a real implementation, you might use specific brand icons
    return <CreditCard className="w-5 h-5 text-muted-foreground" />;
  };

  const formatCardBrand = (brand?: string) => {
    if (!brand) return 'Card';
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading payment methods...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Payment Methods</h3>
        {showAddButton && (
          <Button variant="outline" size="sm" onClick={onAddNewMethod} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add New</span>
          </Button>
        )}
      </div>

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

      {/* Payment Methods List */}
      {paymentMethods.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-lg font-medium text-foreground mb-2">No Payment Methods</h4>
          <p className="text-muted-foreground mb-4">Add a payment method to start making purchases and subscriptions.</p>
          {showAddButton && onAddNewMethod && (
            <Button onClick={onAddNewMethod} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {paymentMethods.map(method => (
            <Card key={method.id} className="p-4">
              <div className="flex items-center space-x-4">
                {/* Card Icon */}
                <div className="flex-shrink-0">{getCardBrandIcon(method.brand)}</div>

                {/* Card Details */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-foreground">
                      {formatCardBrand(method.brand)} •••• {method.last4}
                    </span>
                    {method.isDefault && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        <Star className="w-3 h-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                    {method.expiryMonth && method.expiryYear && (
                      <span>
                        Expires {method.expiryMonth}/{method.expiryYear}
                      </span>
                    )}
                    <span>Added {formatDate(method.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {!method.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(method.id)}
                      disabled={processingMethodId === method.id}
                    >
                      {processingMethodId === method.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <div className="flex items-center space-x-1">
                          <Star className="w-3 h-3" />
                          <span className="hidden sm:inline">Default</span>
                        </div>
                      )}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(method.id)}
                    disabled={processingMethodId === method.id}
                    className="text-error hover:text-error hover:bg-error/10"
                  >
                    {processingMethodId === method.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Security Information */}
      <Card className="p-4 bg-muted">
        <div className="flex items-start space-x-3">
          <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Your payment methods are secure</p>
            <p className="text-xs text-muted-foreground">
              All payment information is encrypted and stored securely by Stripe. We never have access to your full card
              details.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
