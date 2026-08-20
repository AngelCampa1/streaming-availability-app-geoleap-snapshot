'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';
import {
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Settings,
  Loader2,
  RefreshCw,
  TrendingUp,
  Shield,
} from 'lucide-react';
import {
  CustomerAccount,
  SupportSubscription,
  SupportTransaction,
  SupportPaymentMethod,
} from '../../lib/types/support';

interface CustomerBillingOverviewProps {
  customer: CustomerAccount;
  showSensitiveData: boolean;
  onActionComplete: (action: string) => void;
}

interface BillingOverviewData {
  subscriptions: SupportSubscription[];
  recentTransactions: SupportTransaction[];
  paymentMethods: SupportPaymentMethod[];
  billingMetrics: {
    totalPaid: number;
    outstandingBalance: number;
    monthlySpend: number;
    averageTransactionAmount: number;
    paymentSuccessRate: number;
    lastPaymentDate: string;
    nextBillingDate: string;
  };
  riskFactors: Array<{
    type: 'payment_failure' | 'expired_card' | 'high_churn_risk' | 'fraud_alert';
    severity: 'low' | 'medium' | 'high';
    message: string;
    recommendation: string;
  }>;
}

export const CustomerBillingOverview: React.FC<CustomerBillingOverviewProps> = ({
  customer,
  showSensitiveData,
  onActionComplete,
}) => {
  const [billingData, setBillingData] = useState<BillingOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBillingOverview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.id]);

  const loadBillingOverview = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/support/customers/${customer.id}/billing-overview`);
      if (!response.ok) {
        throw new Error('Failed to load billing overview');
      }

      const data = await response.json();
      setBillingData(data);
    } catch (error) {
      console.error('Failed to load billing overview:', error);
      setError('Failed to load customer billing information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBillingOverview();
    setRefreshing(false);
    onActionComplete('Billing overview refreshed');
  };

  const maskSensitiveData = (data: string, type: 'card' | 'ssn' | 'phone' | 'email') => {
    if (showSensitiveData) return data;

    switch (type) {
      case 'card':
        return data.replace(/\d(?=\d{4})/g, '*');
      case 'ssn':
        return data.replace(/\d(?=\d{4})/g, '*');
      case 'phone':
        return data.replace(/\d(?=\d{4})/g, '*');
      case 'email':
        const [user, domain] = data.split('@');
        return `${user.slice(0, 2)}****@${domain}`;
      default:
        return data;
    }
  };

  const formatCurrency = (amount: number) => {
    // Convert cents to dollars
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-success/10 text-success';
      case 'past_due':
        return 'bg-error/10 text-error';
      case 'cancelled':
        return 'bg-muted text-muted-foreground';
      case 'trialing':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRiskSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-error/20 bg-error/10';
      case 'medium':
        return 'border-warning/20 bg-warning/10';
      case 'low':
        return 'border-primary/20 bg-primary/10';
      default:
        return 'border-border bg-muted';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading billing overview...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="border-error/20 bg-error/10">
        <AlertTriangle className="w-4 h-4 text-error" />
        <div>
          <p className="font-medium text-error">Error Loading Billing Data</p>
          <p className="text-sm text-error">{error}</p>
          <Button variant="outline" size="sm" onClick={loadBillingOverview} className="mt-2">
            Try Again
          </Button>
        </div>
      </Alert>
    );
  }

  if (!billingData) return null;

  return (
    <div className="space-y-6">
      {/* Customer Information Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{customer.name || 'Unknown Customer'}</h2>
                <p className="text-muted-foreground">Customer ID: {customer.id}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className={getStatusColor(customer.status)}>{customer.status.toUpperCase()}</Badge>
                  <Badge variant="outline">{customer.tier.toUpperCase()}</Badge>
                  <Badge variant="outline" className="flex items-center">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </Button>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">
                  {showSensitiveData ? customer.email : maskSensitiveData(customer.email, 'email')}
                </p>
              </div>
            </div>

            {customer.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">
                    {showSensitiveData ? customer.phone : maskSensitiveData(customer.phone, 'phone')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Customer Since</p>
                <p className="font-medium">{formatDate(customer.createdAt)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Factors & Alerts */}
      {billingData.riskFactors?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {billingData.riskFactors.map((risk, index) => (
            <Alert key={index} className={getRiskSeverityColor(risk.severity)}>
              <AlertTriangle className="w-4 h-4" />
              <div>
                <p className="font-medium">{risk.message}</p>
                <p className="text-sm mt-1">{risk.recommendation}</p>
                <Badge variant="outline" className="mt-2 text-xs">
                  {risk.severity.toUpperCase()} PRIORITY
                </Badge>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Billing Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(billingData.billingMetrics.totalPaid)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Spend</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(billingData.billingMetrics.monthlySpend)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Success</p>
                <p className="text-xl font-bold text-foreground">
                  {(billingData.billingMetrics.paymentSuccessRate * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(billingData.billingMetrics.outstandingBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Active Subscriptions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {billingData.subscriptions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No active subscriptions</p>
          ) : (
            <div className="space-y-4">
              {billingData.subscriptions.map(subscription => (
                <div key={subscription.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-foreground">{subscription.planName}</h4>
                      <p className="text-sm text-muted-foreground">ID: {subscription.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">
                        {formatCurrency(subscription.amount)}/{subscription.interval}
                      </p>
                      <Badge className={getStatusColor(subscription.status)}>{subscription.status.toUpperCase()}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Current Period</p>
                      <p className="font-medium">
                        {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    </div>

                    {subscription.trialEnd && (
                      <div>
                        <p className="text-muted-foreground">Trial Ends</p>
                        <p className="font-medium">{formatDate(subscription.trialEnd)}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-muted-foreground">Cancellation</p>
                      <p className="font-medium">{subscription.cancelAtPeriodEnd ? 'Scheduled' : 'Not Scheduled'}</p>
                    </div>
                  </div>

                  {subscription.discounts && subscription.discounts.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Active Discounts:</p>
                      <div className="flex flex-wrap gap-2">
                        {subscription.discounts.map(discount => (
                          <Badge key={discount.id} variant="outline" className="text-success">
                            {discount.name}
                            {discount.percentOff && ` -${discount.percentOff}%`}
                            {discount.amountOff && ` -${formatCurrency(discount.amountOff)}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Payment Methods</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {billingData.paymentMethods.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No payment methods on file</p>
          ) : (
            <div className="space-y-3">
              {billingData.paymentMethods.map(method => (
                <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {method.brand?.toUpperCase()} •••• {method.maskedCardNumber.slice(-4)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Expires {method.expiryMonth}/{method.expiryYear}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {method.isDefault && (
                      <Badge variant="outline" className="text-primary">
                        Default
                      </Badge>
                    )}
                    <Badge className={getStatusColor(method.status)} variant="outline">
                      {method.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Recent Transactions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {billingData.recentTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recent transactions</p>
          ) : (
            <div className="space-y-3">
              {billingData.recentTransactions.slice(0, 10).map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.status === 'succeeded'
                          ? 'bg-success/10'
                          : transaction.status === 'failed'
                            ? 'bg-error/10'
                            : 'bg-warning/10'
                      }`}
                    >
                      {transaction.status === 'succeeded' ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : transaction.status === 'failed' ? (
                        <AlertTriangle className="w-4 h-4 text-error" />
                      ) : (
                        <Clock className="w-4 h-4 text-warning" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(transaction.processedAt)} • {transaction.method.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-semibold ${transaction.type === 'refund' ? 'text-error' : 'text-foreground'}`}>
                      {transaction.type === 'refund' ? '-' : ''}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </Badge>
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

export default CustomerBillingOverview;
