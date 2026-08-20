'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStreamingDetails } from '@/hooks/useStreamingDetails';
import { CountryAvailability } from './CountryAvailability';
import { QuickSubscriptionSetup } from './subscriptions/QuickSubscriptionSetup';
import { useUserSubscriptions } from '@/hooks/useUserSubscriptions';

interface StreamingDetailsModalProps {
  showId: string;
  showTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function StreamingDetailsModal({ showId, showTitle, isOpen, onClose }: StreamingDetailsModalProps) {
  const { details, location, loading, error, fetchStreamingDetails, fetchUserLocation } = useStreamingDetails();
  const { subscriptionCount, hasSetupSubscriptions, getServiceIds } = useUserSubscriptions();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showSubscriptionSetup, setShowSubscriptionSetup] = useState(false);

  // Refetch data when subscriptions change
  const refetchWithSubscriptions = useCallback(() => {
    setHasLoaded(false);
  }, []);

  useEffect(() => {
    if (isOpen && !hasLoaded) {
      // Pass user's service IDs via custom header for anonymous users
      const serviceIds = getServiceIds();
      fetchStreamingDetails(showId, serviceIds);
      fetchUserLocation();
      setHasLoaded(true);
    }
  }, [isOpen, showId, hasLoaded, getServiceIds, fetchStreamingDetails, fetchUserLocation]);

  // Show subscription setup if user hasn't set up any and there are 0 matches
  useEffect(() => {
    if (details && !hasSetupSubscriptions && details.countriesWithUserSubscriptions === 0) {
      setShowSubscriptionSetup(true);
    }
  }, [details, hasSetupSubscriptions]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setHasLoaded(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[1400] p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Where to Watch &quot;{showTitle}&quot;</h2>
            <p className="text-sm text-muted-foreground mt-1">VPN to these countries to watch on your existing subscriptions</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Close modal">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="space-y-4">
              <div className="animate-pulse">
                <div className="h-32 bg-muted rounded-lg mb-4"></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-40 bg-muted rounded-lg"></div>
                  <div className="h-40 bg-muted rounded-lg"></div>
                  <div className="h-40 bg-muted rounded-lg"></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg">
              <p className="font-medium">Error loading streaming details</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {details && !loading && (
            <div>
              {/* User Location Info */}
              {location && (
                <div className="mb-6 bg-primary/10 border border-primary/30 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <p className="text-sm text-foreground">
                      Your location: <span className="font-semibold">{location.countryName}</span>
                      {location.autoDetected && ' (auto-detected)'}
                    </p>
                  </div>
                </div>
              )}

              {/* Subscription Setup Banner - Show when user has no subscriptions set */}
              {showSubscriptionSetup && (
                <div className="mb-6 bg-gradient-to-r from-warning/10 to-warning/20 border border-warning/30 rounded-lg p-4">
                  <QuickSubscriptionSetup
                    compact={true}
                    onComplete={() => {
                      setShowSubscriptionSetup(false);
                      refetchWithSubscriptions();
                    }}
                  />
                </div>
              )}

              {/* Subscription count indicator */}
              {subscriptionCount > 0 && !showSubscriptionSetup && (
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing results for your {subscriptionCount} streaming service{subscriptionCount !== 1 ? 's' : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSubscriptionSetup(true)}
                    className="text-sm text-primary hover:text-primary/80 underline"
                  >
                    Edit services
                  </button>
                </div>
              )}

              {/* Availability Display */}
              <CountryAvailability details={details} userCountry={location?.countryCode} />

              {/* VPN Instructions */}
              {details.countriesWithUserSubscriptions > 0 && (
                <div className="mt-6 bg-gradient-to-r from-success/10 to-success/20 border border-success/30 rounded-lg p-6">
                  <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                    <span>🌐</span>
                    How to Watch with VPN
                  </h3>
                  <ol className="space-y-2 text-sm text-foreground">
                    <li className="flex gap-2">
                      <span className="font-bold text-success">1.</span>
                      <span>Connect your VPN to one of the countries highlighted in green above</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-success">2.</span>
                      <span>Open your streaming service app or website</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-success">3.</span>
                      <span>Search for &quot;{showTitle}&quot; and start watching!</span>
                    </li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-4">
                    Note: Streaming availability and content may vary by region. Some services may detect VPN usage.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 bg-muted/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
