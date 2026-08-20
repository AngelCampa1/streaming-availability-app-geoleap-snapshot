'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert } from '../ui/alert';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  CreditCard,
  Star,
  Trash2,
  Plus,
  Shield,
  AlertTriangle,
  Loader2,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import { SupportPaymentMethod } from '../../lib/types/support';
import { usePermissions } from '../../hooks/usePermissions';

interface PaymentMethodManagerProps {
  customerId: string;
  showSensitiveData: boolean;
  onUpdate: () => void;
}

interface PaymentMethodForm {
  type: 'card' | 'bank_account';
  cardNumber?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cvv?: string;
  accountNumber?: string;
  routingNumber?: string;
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  setAsDefault: boolean;
}

export const PaymentMethodManager: React.FC<PaymentMethodManagerProps> = ({
  customerId,
  showSensitiveData,
  onUpdate,
}) => {
  const [paymentMethods, setPaymentMethods] = useState<SupportPaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState<SupportPaymentMethod | null>(null);
  const [formData, setFormData] = useState<PaymentMethodForm>({
    type: 'card',
    billingAddress: {
      line1: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
    },
    setAsDefault: false,
  });

  const { hasPermission } = usePermissions();

  useEffect(() => {
    loadPaymentMethods();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const loadPaymentMethods = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/support/customers/${customerId}/payment-methods`);
      if (!response.ok) {
        throw new Error('Failed to load payment methods');
      }

      const data = await response.json();
      setPaymentMethods(data);
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      setError('Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    if (!hasPermission('modify_payment_methods')) return;

    try {
      setProcessingId(methodId);
      setError(null);

      const response = await fetch(`/api/support/payment-methods/${methodId}/set-default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to set default payment method');
      }

      await loadPaymentMethods();
      onUpdate();
    } catch (error) {
      console.error('Failed to set default:', error);
      setError('Failed to set default payment method');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (methodId: string, methodDescription: string) => {
    if (!hasPermission('delete_payment_methods')) return;

    if (!confirm(`Are you sure you want to remove ${methodDescription}? This action cannot be undone.`)) {
      return;
    }

    try {
      setProcessingId(methodId);
      setError(null);

      const response = await fetch(`/api/support/payment-methods/${methodId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to remove payment method');
      }

      await loadPaymentMethods();
      onUpdate();
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      setError('Failed to remove payment method');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('add_payment_methods')) return;

    try {
      setProcessingId('adding');
      setError(null);

      const response = await fetch(`/api/support/customers/${customerId}/payment-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add payment method');
      }

      await loadPaymentMethods();
      setShowAddForm(false);
      resetForm();
      onUpdate();
    } catch (error) {
      console.error('Failed to add payment method:', error);
      setError(error instanceof Error ? error.message : 'Failed to add payment method');
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerifyPaymentMethod = async (methodId: string) => {
    if (!hasPermission('verify_payment_methods')) return;

    try {
      setProcessingId(methodId);
      setError(null);

      const response = await fetch(`/api/support/payment-methods/${methodId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to verify payment method');
      }

      await loadPaymentMethods();
      onUpdate();
    } catch (error) {
      console.error('Failed to verify payment method:', error);
      setError('Failed to verify payment method');
    } finally {
      setProcessingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'card',
      billingAddress: {
        line1: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
      },
      setAsDefault: false,
    });
    setEditingMethod(null);
  };

  const maskCardNumber = (cardNumber: string) => {
    if (showSensitiveData) return cardNumber;
    return cardNumber.replace(/\d(?=\d{4})/g, '*');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-success/10 text-success';
      case 'expired':
        return 'bg-error/10 text-error';
      case 'declined':
        return 'bg-error/10 text-error';
      case 'requires_verification':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getCardIcon = (_brand?: string) => {
    // In a real app, you might want to use specific brand icons
    return <CreditCard className="w-5 h-5 text-muted-foreground" />;
  };

  const renderPaymentMethodForm = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{editingMethod ? 'Edit Payment Method' : 'Add New Payment Method'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddPaymentMethod} className="space-y-4">
          {/* Payment Method Type */}
          <div>
            <Label>Payment Method Type</Label>
            <div className="flex space-x-4 mt-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="card"
                  checked={formData.type === 'card'}
                  onChange={e => setFormData({ ...formData, type: e.target.value as 'card' })}
                  className="mr-2"
                />
                Credit/Debit Card
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="bank_account"
                  checked={formData.type === 'bank_account'}
                  onChange={e => setFormData({ ...formData, type: e.target.value as 'bank_account' })}
                  className="mr-2"
                />
                Bank Account
              </label>
            </div>
          </div>

          {/* Card Details */}
          {formData.type === 'card' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  placeholder="1234 5678 9012 3456"
                  value={formData.cardNumber || ''}
                  onChange={e => setFormData({ ...formData, cardNumber: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="expiryMonth">Expiry Month</Label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  placeholder="MM"
                  value={formData.expiryMonth || ''}
                  onChange={e => setFormData({ ...formData, expiryMonth: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="expiryYear">Expiry Year</Label>
                <Input
                  type="number"
                  min={new Date().getFullYear()}
                  placeholder="YYYY"
                  value={formData.expiryYear || ''}
                  onChange={e => setFormData({ ...formData, expiryYear: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  placeholder="123"
                  maxLength={4}
                  value={formData.cvv || ''}
                  onChange={e => setFormData({ ...formData, cvv: e.target.value })}
                  required
                />
              </div>
            </div>
          )}

          {/* Bank Account Details */}
          {formData.type === 'bank_account' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="routingNumber">Routing Number</Label>
                <Input
                  placeholder="123456789"
                  value={formData.routingNumber || ''}
                  onChange={e => setFormData({ ...formData, routingNumber: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  placeholder="1234567890"
                  value={formData.accountNumber || ''}
                  onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                  required
                />
              </div>
            </div>
          )}

          {/* Billing Address */}
          <div>
            <h4 className="font-medium mb-3 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Billing Address
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="line1">Address Line 1</Label>
                <Input
                  placeholder="123 Main Street"
                  value={formData.billingAddress.line1}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, line1: e.target.value },
                    })
                  }
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="line2">Address Line 2 (Optional)</Label>
                <Input
                  placeholder="Apartment, suite, etc."
                  value={formData.billingAddress.line2 || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, line2: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  placeholder="New York"
                  value={formData.billingAddress.city}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, city: e.target.value },
                    })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  placeholder="NY"
                  value={formData.billingAddress.state}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, state: e.target.value },
                    })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  placeholder="10001"
                  value={formData.billingAddress.postalCode}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, postalCode: e.target.value },
                    })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <select
                  value={formData.billingAddress.country}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, country: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md"
                  required
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  {/* Add more countries as needed */}
                </select>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.setAsDefault}
              onChange={e => setFormData({ ...formData, setAsDefault: e.target.checked })}
            />
            <Label htmlFor="setAsDefault">Set as default payment method</Label>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button type="submit" disabled={processingId === 'adding'} className="flex items-center">
              {processingId === 'adding' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {editingMethod ? 'Update Payment Method' : 'Add Payment Method'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddForm(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading payment methods...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Payment Methods Management</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadPaymentMethods}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {hasPermission('add_payment_methods') && (
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-error/20 bg-error/10">
          <AlertTriangle className="w-4 h-4 text-error" />
          <div>
            <p className="font-medium text-error">Error</p>
            <p className="text-sm text-error">{error}</p>
          </div>
        </Alert>
      )}

      {/* Add/Edit Form */}
      {showAddForm && renderPaymentMethodForm()}

      {/* Payment Methods List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Payment Methods</h3>
              <p className="text-muted-foreground">This customer has no payment methods on file.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map(method => (
                <div key={method.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">{getCardIcon(method.brand)}</div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-foreground">
                            {method.brand?.toUpperCase() || method.type.toUpperCase()}
                          </h4>
                          {method.isDefault && (
                            <Badge className="bg-primary/10 text-primary">
                              <Star className="w-3 h-3 mr-1" />
                              Default
                            </Badge>
                          )}
                          <Badge className={getStatusColor(method.status)}>
                            {method.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>

                        <p className="text-muted-foreground mb-1">{maskCardNumber(method.maskedCardNumber)}</p>

                        {method.expiryMonth && method.expiryYear && (
                          <p className="text-sm text-muted-foreground">
                            Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                          </p>
                        )}

                        {method.billingAddress && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <p className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {method.billingAddress.line1}
                              {method.billingAddress.line2 && `, ${method.billingAddress.line2}`}
                            </p>
                            <p className="ml-4">
                              {method.billingAddress.city}, {method.billingAddress.state}{' '}
                              {method.billingAddress.postalCode}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                          <span>Added: {new Date(method.createdAt).toLocaleDateString()}</span>
                          {method.lastUsed && <span>Last used: {new Date(method.lastUsed).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                      {method.status === 'requires_verification' && hasPermission('verify_payment_methods') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerifyPaymentMethod(method.id)}
                          disabled={processingId === method.id}
                        >
                          {processingId === method.id ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-2" />
                          ) : (
                            <Shield className="w-3 h-3 mr-2" />
                          )}
                          Verify
                        </Button>
                      )}

                      {!method.isDefault && hasPermission('modify_payment_methods') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(method.id)}
                          disabled={processingId === method.id}
                        >
                          {processingId === method.id ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-2" />
                          ) : (
                            <Star className="w-3 h-3 mr-2" />
                          )}
                          Set Default
                        </Button>
                      )}

                      {hasPermission('delete_payment_methods') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDelete(
                              method.id,
                              `${method.brand || method.type} •••• ${method.maskedCardNumber.slice(-4)}`
                            )
                          }
                          disabled={processingId === method.id}
                          className="text-error hover:text-error hover:bg-error/10"
                        >
                          {processingId === method.id ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-2" />
                          ) : (
                            <Trash2 className="w-3 h-3 mr-2" />
                          )}
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentMethodManager;
