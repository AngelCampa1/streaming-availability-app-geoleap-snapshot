'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { POPULAR_SERVICES } from '@/types/streaming';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tv, AlertCircle } from 'lucide-react';

export function SubscriptionManager() {
  const { subscriptions, loading, error, addSubscription, removeSubscription, hasSubscription } = useSubscriptions();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const [customServiceName, setCustomServiceName] = useState('');
  const [tier, setTier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleAddSubscription = async () => {
    // BUG-E2E-001 fix: Show validation error instead of silent return
    if (!selectedService && !customServiceName) {
      setValidationError('Please select a service or enter a custom service name.');
      return;
    }
    setValidationError('');

    try {
      setIsSubmitting(true);

      const serviceToAdd = POPULAR_SERVICES.find(s => s.id === selectedService);
      const serviceId = selectedService || customServiceName.toLowerCase().replace(/\s+/g, '');
      const serviceName = serviceToAdd?.name || customServiceName;

      await addSubscription({
        serviceId,
        serviceName,
        subscriptionTier: tier || undefined,
      });

      // Reset form
      setSelectedService('');
      setCustomServiceName('');
      setTier('');
      setValidationError('');
      setShowAddDialog(false);
    } catch (err) {
      console.error('Failed to add subscription:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSubscription = async (serviceId: string) => {
    if (!confirm('Remove this subscription from your list?')) return;

    try {
      await removeSubscription(serviceId);
    } catch (err) {
      console.error('Failed to remove subscription:', err);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="h-24 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <>
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tv className="h-5 w-5" />
              Your Subscriptions
            </CardTitle>
            <CardDescription>
              {subscriptions.length > 0
                ? `${subscriptions.length} service${subscriptions.length === 1 ? '' : 's'} added`
                : 'No services added yet'}
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="min-h-[44px]">
            + Add Service
          </Button>
        </CardHeader>
        <CardContent>

          {/* Subscriptions List */}
          {subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <Tv className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No streaming services added yet</p>
              <Button onClick={() => setShowAddDialog(true)} variant="outline" className="min-h-[44px]">
                Add your first service
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptions.map(sub => {
                const service = POPULAR_SERVICES.find(s => s.id === sub.serviceId);
                return (
                  <div
                    key={sub.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
                          style={{
                            backgroundColor: service?.brandColor || '#6b7280',
                          }}
                        >
                          {service?.logoPath ? (
                            <Image
                              src={service.logoPath}
                              alt={`${sub.serviceName} logo`}
                              width={28}
                              height={28}
                              className="object-contain brightness-0 invert"
                            />
                          ) : (
                            <span className="font-bold text-sm text-white">
                              {sub.serviceName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{sub.serviceName}</h3>
                          {sub.subscriptionTier && <span className="text-xs text-muted-foreground">{sub.subscriptionTier}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveSubscription(sub.serviceId)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove subscription"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">Added {new Date(sub.addedAt).toLocaleDateString()}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Subscription Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1400] p-4">
          <div className="bg-background rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">Add Streaming Service</h3>
              <button
                onClick={() => { setShowAddDialog(false); setValidationError(''); }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close add subscription dialog"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Validation Error - BUG-E2E-001 fix */}
            {validationError && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2 rounded-lg">
                {validationError}
              </div>
            )}

            {/* Popular Services */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Popular Services</label>
              <div className="grid grid-cols-3 gap-2">
                {POPULAR_SERVICES.map(service => (
                  <button
                    key={service.id}
                    onClick={() => {
                      setSelectedService(selectedService === service.id ? '' : service.id);
                      setCustomServiceName('');
                      setValidationError('');
                    }}
                    disabled={hasSubscription(service.id)}
                    className={`p-3 border-2 rounded-lg transition-all ${
                      selectedService === service.id
                        ? 'border-primary bg-primary/10'
                        : hasSubscription(service.id)
                          ? 'border-border bg-muted opacity-50 cursor-not-allowed'
                          : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div
                      className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-1 overflow-hidden"
                      style={{
                        backgroundColor: service.brandColor,
                      }}
                    >
                      <Image
                        src={service.logoPath}
                        alt={`${service.name} logo`}
                        width={28}
                        height={28}
                        className="object-contain brightness-0 invert"
                      />
                    </div>
                    <div className="text-xs font-medium text-foreground truncate">{service.name}</div>
                    {hasSubscription(service.id) && <div className="text-xs text-success mt-1">✓</div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Service */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Or enter custom service</label>
              <input
                type="text"
                value={customServiceName}
                onChange={e => {
                  setCustomServiceName(e.target.value);
                  setSelectedService('');
                  setValidationError('');
                }}
                placeholder="Service name"
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
              />
            </div>

            {/* Tier (Optional) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Subscription Tier (Optional)</label>
              <input
                type="text"
                value={tier}
                onChange={e => setTier(e.target.value)}
                placeholder="e.g., Premium, Basic, Family"
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => { setShowAddDialog(false); setValidationError(''); }}
                className="flex-1 min-h-[44px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSubscription}
                disabled={isSubmitting || (!selectedService && !customServiceName)}
                className="flex-1 min-h-[44px]"
              >
                {isSubmitting ? 'Adding...' : 'Add Service'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
