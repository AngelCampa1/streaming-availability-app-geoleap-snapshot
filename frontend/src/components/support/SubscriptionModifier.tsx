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
  Settings,
  Pause,
  Play,
  X,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Info,
  Loader2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import {
  SupportSubscription,
  SubscriptionModificationRequest,
  SubscriptionModificationPreview,
} from '../../lib/types/support';
import { usePermissions } from '../../hooks/usePermissions';

interface SubscriptionModifierProps {
  customerId: string;
  onModificationComplete: (type: string) => void;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
  tier: number;
}

export const SubscriptionModifier: React.FC<SubscriptionModifierProps> = ({ customerId, onModificationComplete }) => {
  const [subscriptions, setSubscriptions] = useState<SupportSubscription[]>([]);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<SupportSubscription | null>(null);
  const [showModificationForm, setShowModificationForm] = useState(false);
  const [preview, setPreview] = useState<SubscriptionModificationPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [modificationData, setModificationData] = useState<SubscriptionModificationRequest>({
    subscriptionId: '',
    action: 'upgrade',
    effectiveDate: 'immediate',
    prorationBehavior: 'create_prorations',
    reason: '',
    notifyCustomer: true,
  });

  const { hasPermission } = usePermissions();

  useEffect(() => {
    loadSubscriptions();
    loadAvailablePlans();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const loadSubscriptions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/support/customers/${customerId}/subscriptions`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data);
      }
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
      setError('Failed to load customer subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailablePlans = async () => {
    try {
      const response = await fetch('/api/support/plans');
      if (response.ok) {
        const plans = await response.json();
        setAvailablePlans(plans);
      }
    } catch (error) {
      console.error('Failed to load available plans:', error);
    }
  };

  const generatePreview = async () => {
    try {
      setError(null);
      const response = await fetch('/api/support/subscriptions/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modificationData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const previewData = await response.json();
      setPreview(previewData);
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to generate preview:', error);
      setError('Failed to generate modification preview');
    }
  };

  const executeModification = async () => {
    if (!hasPermission('modify_subscriptions')) {
      setError('You do not have permission to modify subscriptions');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch('/api/support/subscriptions/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modificationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Subscription modification failed');
      }

      await loadSubscriptions();
      setShowModificationForm(false);
      setShowPreview(false);
      setModificationData({
        subscriptionId: '',
        action: 'upgrade',
        effectiveDate: 'immediate',
        prorationBehavior: 'create_prorations',
        reason: '',
        notifyCustomer: true,
      });
      onModificationComplete(modificationData.action);
    } catch (error) {
      console.error('Subscription modification failed:', error);
      setError(error instanceof Error ? error.message : 'Subscription modification failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
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
        return 'bg-destructive/10 text-destructive';
      case 'cancelled':
        return 'bg-muted text-muted-foreground';
      case 'paused':
        return 'bg-warning/10 text-warning';
      case 'trialing':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'upgrade':
        return <ArrowUpCircle className="w-4 h-4" />;
      case 'downgrade':
        return <ArrowDownCircle className="w-4 h-4" />;
      case 'pause':
        return <Pause className="w-4 h-4" />;
      case 'resume':
        return <Play className="w-4 h-4" />;
      case 'cancel':
        return <X className="w-4 h-4" />;
      case 'extend_trial':
        return <Clock className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const getAvailableActions = (subscription: SupportSubscription): string[] => {
    const actions: string[] = [];

    if (subscription.status === 'active') {
      actions.push('upgrade', 'downgrade', 'pause', 'cancel');
    }

    if (subscription.status === 'paused') {
      actions.push('resume', 'cancel');
    }

    if (subscription.status === 'trialing') {
      actions.push('upgrade', 'downgrade', 'extend_trial');
    }

    return actions;
  };

  const renderSubscriptionCard = (subscription: SupportSubscription) => (
    <Card key={subscription.id} className="p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{subscription.planName}</h3>
          <p className="text-sm text-muted-foreground">ID: {subscription.id}</p>
          <div className="flex items-center space-x-2 mt-2">
            <Badge className={getStatusColor(subscription.status)}>{subscription.status.toUpperCase()}</Badge>
            {subscription.cancelAtPeriodEnd && (
              <Badge variant="outline" className="text-warning">
                CANCELING
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(subscription.amount, subscription.currency)}
          </p>
          <p className="text-sm text-muted-foreground">per {subscription.interval}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Current Period</p>
          <p className="font-medium">
            {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
          </p>
        </div>

        {subscription.trialEnd && (
          <div>
            <p className="text-sm text-muted-foreground">Trial Ends</p>
            <p className="font-medium">{formatDate(subscription.trialEnd)}</p>
          </div>
        )}

        {subscription.cancelledAt && (
          <div>
            <p className="text-sm text-muted-foreground">Cancelled On</p>
            <p className="font-medium">{formatDate(subscription.cancelledAt)}</p>
          </div>
        )}
      </div>

      {subscription.discounts && subscription.discounts.length > 0 && (
        <div className="mb-4">
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

      {subscription.features && subscription.features.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">Plan Features:</p>
          <div className="grid grid-cols-2 gap-1 text-sm">
            {subscription.features.slice(0, 6).map((feature, index) => (
              <div key={index} className="flex items-center">
                <CheckCircle className="w-3 h-3 text-success mr-2" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasPermission('modify_subscriptions') && (
        <div className="flex flex-wrap gap-2">
          {getAvailableActions(subscription).map(action => (
            <Button
              key={action}
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedSubscription(subscription);
                setModificationData({
                  ...modificationData,
                  subscriptionId: subscription.id,
                  action: action as "cancel" | "pause" | "upgrade" | "downgrade" | "resume" | "extend_trial",
                });
                setShowModificationForm(true);
              }}
              className="flex items-center"
            >
              {getActionIcon(action)}
              <span className="ml-1 capitalize">{action.replace('_', ' ')}</span>
            </Button>
          ))}
        </div>
      )}
    </Card>
  );

  const renderModificationForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Modify Subscription: {selectedSubscription?.planName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Subscription Info */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-foreground mb-2">Current Subscription</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Plan:</span>
              <span className="ml-2 font-medium">{selectedSubscription?.planName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Price:</span>
              <span className="ml-2 font-medium">
                {formatCurrency(selectedSubscription?.amount || 0, selectedSubscription?.currency)}/
                {selectedSubscription?.interval}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <Badge className={`ml-2 text-xs ${getStatusColor(selectedSubscription?.status || '')}`}>
                {selectedSubscription?.status.toUpperCase()}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Next Billing:</span>
              <span className="ml-2 font-medium">{formatDate(selectedSubscription?.currentPeriodEnd || '')}</span>
            </div>
          </div>
        </div>

        {/* Modification Details */}
        <div>
          <Label htmlFor="action">Modification Action</Label>
          <select
            value={modificationData.action}
            onChange={e =>
              setModificationData({
                ...modificationData,
                action: e.target.value as "cancel" | "pause" | "upgrade" | "downgrade" | "resume" | "extend_trial",
              })
            }
            className="w-full px-3 py-2 border border-input rounded-md mt-1 bg-background text-foreground"
          >
            {getAvailableActions(selectedSubscription!).map(action => (
              <option key={action} value={action}>
                {action.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Plan Selection for Upgrades/Downgrades */}
        {(modificationData.action === 'upgrade' || modificationData.action === 'downgrade') && (
          <div>
            <Label htmlFor="newPlan">New Plan</Label>
            <select
              value={modificationData.newPlanId || ''}
              onChange={e =>
                setModificationData({
                  ...modificationData,
                  newPlanId: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-input rounded-md mt-1 bg-background text-foreground"
            >
              <option value="">Select a plan...</option>
              {availablePlans
                .filter(plan => {
                  const currentPlan = availablePlans.find(p => p.name === selectedSubscription?.planName);
                  if (!currentPlan) return true;

                  return modificationData.action === 'upgrade'
                    ? plan.tier > currentPlan.tier
                    : plan.tier < currentPlan.tier;
                })
                .map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - {formatCurrency(plan.price, plan.currency)}/{plan.interval}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Effective Date */}
        <div>
          <Label htmlFor="effectiveDate">Effective Date</Label>
          <select
            value={modificationData.effectiveDate || 'immediate'}
            onChange={e =>
              setModificationData({
                ...modificationData,
                effectiveDate: e.target.value,
              })
            }
            className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md mt-1"
          >
            <option value="immediate">Immediate</option>
            <option value="next_billing">Next Billing Period</option>
            <option value="custom">Custom Date</option>
          </select>
        </div>

        {/* Proration Behavior */}
        {(modificationData.action === 'upgrade' || modificationData.action === 'downgrade') && (
          <div>
            <Label htmlFor="proration">Proration Behavior</Label>
            <select
              value={modificationData.prorationBehavior}
              onChange={e =>
                setModificationData({
                  ...modificationData,
                  prorationBehavior: e.target.value as "none" | "create_prorations" | "always_invoice",
                })
              }
              className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md mt-1"
            >
              <option value="create_prorations">Create Prorations (Standard)</option>
              <option value="none">No Proration</option>
              <option value="always_invoice">Always Create Invoice</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Prorations calculate the difference for the remaining billing period
            </p>
          </div>
        )}

        {/* Reason */}
        <div>
          <Label htmlFor="reason">Reason for Modification *</Label>
          <Input
            placeholder="e.g., Customer requested upgrade, billing issue resolution..."
            value={modificationData.reason}
            onChange={e =>
              setModificationData({
                ...modificationData,
                reason: e.target.value,
              })
            }
            required
            className="mt-1"
          />
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Internal Notes</Label>
          <Textarea
            placeholder="Add any additional notes about this modification..."
            value={modificationData.notes || ''}
            onChange={e =>
              setModificationData({
                ...modificationData,
                notes: e.target.value,
              })
            }
            rows={3}
            className="mt-1"
          />
        </div>

        {/* Options */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={modificationData.notifyCustomer}
              onChange={e =>
                setModificationData({
                  ...modificationData,
                  notifyCustomer: e.target.checked,
                })
              }
            />
            <Label htmlFor="notifyCustomer">Send notification to customer</Label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <Button
            onClick={generatePreview}
            variant="outline"
            disabled={
              !modificationData.reason.trim() ||
              ((modificationData.action === 'upgrade' || modificationData.action === 'downgrade') &&
                !modificationData.newPlanId)
            }
            className="flex items-center"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Changes
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setShowModificationForm(false);
              setShowPreview(false);
              setSelectedSubscription(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderPreview = () => {
    if (!preview) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Modification Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-primary/30 bg-primary/10">
            <Info className="w-4 h-4 text-primary" />
            <div>
              <p className="font-medium text-primary">Review Changes Carefully</p>
              <p className="text-sm text-primary/80">Please review all changes before confirming the modification.</p>
            </div>
          </Alert>

          {/* Billing Changes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-foreground mb-3">Billing Changes</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Amount:</span>
                  <span className="font-medium">{formatCurrency(preview.currentAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New Amount:</span>
                  <span className="font-medium">{formatCurrency(preview.newAmount)}</span>
                </div>
                {preview.prorationAmount !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Proration:</span>
                    <span className={`font-medium ${preview.prorationAmount > 0 ? 'text-destructive' : 'text-success'}`}>
                      {preview.prorationAmount > 0 ? '+' : ''}
                      {formatCurrency(preview.prorationAmount)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Effective Date:</span>
                    <span className="font-medium">{formatDate(preview.effectiveDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Billing:</span>
                    <span className="font-medium">{formatDate(preview.nextBillingDate)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">Plan Changes</h4>
              <div className="space-y-2">
                {preview.changes.map((change, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{change.item}:</span>
                    <div className="text-right">
                      <div className="text-muted-foreground line-through">{change.oldValue}</div>
                      <div className="font-medium text-foreground">{change.newValue}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Warnings */}
          {preview.warnings && preview.warnings.length > 0 && (
            <Alert className="border-warning/30 bg-warning/10">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <div>
                <p className="font-medium text-warning">Warnings</p>
                <ul className="text-sm text-warning/80 mt-1 space-y-1">
                  {preview.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </Alert>
          )}

          {/* Approval Required */}
          {preview.requiresApproval && (
            <Alert className="border-destructive/30 bg-destructive/10">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Approval Required</p>
                <p className="text-sm text-destructive/80">This modification requires manager approval before execution.</p>
              </div>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Back to Edit
            </Button>
            <Button onClick={executeModification} disabled={isProcessing} className="flex items-center">
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                getActionIcon(modificationData.action)
              )}
              {isProcessing ? 'Processing...' : `Confirm ${modificationData.action.replace('_', ' ')}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading subscriptions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Subscription Management</h2>
        <Button variant="outline" onClick={loadSubscriptions}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-destructive/30 bg-destructive/10">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Error</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </Alert>
      )}

      {/* Modification Form */}
      {showModificationForm && !showPreview && renderModificationForm()}

      {/* Preview */}
      {showPreview && renderPreview()}

      {/* Subscriptions List */}
      {!showModificationForm && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Active Subscriptions</h3>

          {subscriptions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Subscriptions Found</h3>
                <p className="text-muted-foreground">This customer does not have any active subscriptions.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">{subscriptions.map(renderSubscriptionCard)}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionModifier;
