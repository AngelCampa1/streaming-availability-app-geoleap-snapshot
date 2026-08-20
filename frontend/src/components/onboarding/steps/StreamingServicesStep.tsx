'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOnboarding } from '@/contexts/OnboardingContext';
import {
  getAllStreamingServices,
  getPopularStreamingServices,
  bulkAddUserStreamingServices,
  StreamingServiceCatalogDto,
  StreamingServiceType,
  AddStreamingServiceRequest,
} from '@/lib/api';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

export function StreamingServicesStep() {
  const { status, updateStep, addStreamingServices, trackAnalyticsEvent, isLoading } = useOnboarding();

  const [popularServices, setPopularServices] = useState<StreamingServiceCatalogDto[]>([]);
  const [allServices, setAllServices] = useState<StreamingServiceCatalogDto[]>([]);
  const [selectedServices, setSelectedServices] = useState<StreamingServiceCatalogDto[]>([]);
  const [showAdditional, setShowAdditional] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available streaming services
  useEffect(() => {
    let isMounted = true;

    const loadStreamingServices = async () => {
      try {
        setLoadingServices(true);
        const [popular, all] = await Promise.all([
          getPopularStreamingServices(undefined, 10),
          getAllStreamingServices(),
        ]);

        // Only update state if component is still mounted
        if (isMounted) {
          setPopularServices(popular);
          setAllServices(all);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load streaming services';
          setError(errorMessage);
          logger.error('Failed to load streaming services for onboarding', { error: errorMessage });
        }
      } finally {
        if (isMounted) {
          setLoadingServices(false);
        }
      }
    };

    loadStreamingServices();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize with existing services if any
  useEffect(() => {
    if (status?.streamingServices && allServices.length > 0) {
      const existingServiceNames = status.streamingServices.map(service => service.serviceName);
      const existingServices = allServices.filter(service => existingServiceNames.includes(service.name));
      setSelectedServices(existingServices);
    }
  }, [status?.streamingServices, allServices]);

  const toggleService = (service: StreamingServiceCatalogDto) => {
    setSelectedServices(prev => {
      const isSelected = prev.find(s => s.id === service.id);
      if (isSelected) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  const handleContinue = async () => {
    if (selectedServices.length > 0) {
      try {
        // Use the new streaming service API instead of the old onboarding one
        const requests: AddStreamingServiceRequest[] = selectedServices.map(service => ({
          streamingServiceId: service.id,
          prioritizeInResults: true,
          showInRecommendations: true,
        }));

        await bulkAddUserStreamingServices(requests);

        // Also add to onboarding context for backwards compatibility
        await addStreamingServices(selectedServices.map(s => s.name));

        logger.info('Added streaming services during onboarding', {
          serviceCount: selectedServices.length,
          services: selectedServices.map(s => s.name),
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add streaming services';
        logger.error('Failed to add streaming services during onboarding', { error: errorMessage });
        setError(errorMessage);
        return;
      }
    }

    await trackAnalyticsEvent('step_completed', 2, {
      services_selected: selectedServices.length,
      services: selectedServices.map(s => s.name),
    });
    await updateStep(3);
  };

  const handleSkipStep = async () => {
    await trackAnalyticsEvent('step_skipped', 2);
    await updateStep(3);
  };

  const getServiceTypeDisplay = (type: StreamingServiceType): string => {
    switch (type) {
      case StreamingServiceType.Subscription:
        return 'Subscription';
      case StreamingServiceType.Rental:
        return 'Rental';
      case StreamingServiceType.Purchase:
        return 'Purchase';
      case StreamingServiceType.Free:
        return 'Free';
      case StreamingServiceType.AdSupported:
        return 'Ad-Supported';
      case StreamingServiceType.Live:
        return 'Live TV';
      default:
        return 'Unknown';
    }
  };

  const ServiceButton = ({
    service,
    isPopular = false,
  }: {
    service: StreamingServiceCatalogDto;
    isPopular?: boolean;
  }) => {
    const isSelected = selectedServices.find(s => s.id === service.id) !== undefined;

    return (
      <button
        onClick={() => toggleService(service)}
        className={cn(
          'relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 min-h-[100px] text-sm font-medium',
          isSelected
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-surface hover:border-primary/50 hover:bg-surface-muted text-foreground'
        )}
      >
        <div className="text-center">
          <div className="font-medium">{service.displayName || service.name}</div>
          <div className="text-xs text-foreground/60 mt-1">{getServiceTypeDisplay(service.type)}</div>
          {isPopular && (
            <Badge variant="secondary" className="mt-1 text-xs">
              Popular
            </Badge>
          )}
        </div>
        {isSelected && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </button>
    );
  };

  // Filter services that are not already popular
  const additionalServices = allServices.filter(service => !popularServices.find(popular => popular.id === service.id));

  if (loadingServices) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Choose Your Streaming Services</CardTitle>
          <CardDescription>
            Select the services you currently subscribe to. This helps us personalize your search results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              <span className="text-foreground-muted">Loading streaming services...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Choose Your Streaming Services</CardTitle>
          <CardDescription>
            Select the services you currently subscribe to. This helps us personalize your search results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-destructive mr-2 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium text-destructive">Failed to load streaming services</p>
                <p className="mt-1 text-sm text-foreground-muted">{error}</p>
              </div>
            </div>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Choose Your Streaming Services</CardTitle>
        <CardDescription>
          Select the services you currently subscribe to. This helps us personalize your search results.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Popular Services */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Popular Services</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {popularServices.map(service => (
              <ServiceButton key={service.id} service={service} isPopular={true} />
            ))}
          </div>
        </div>

        {/* Additional Services */}
        {additionalServices.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">More Services</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAdditional(!showAdditional)}>
                {showAdditional ? 'Hide' : 'Show'} additional services ({additionalServices.length})
              </Button>
            </div>

            {showAdditional && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {additionalServices.map(service => (
                  <ServiceButton key={service.id} service={service} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selection Summary */}
        {selectedServices.length > 0 && (
          <div className="bg-surface-muted p-4 rounded-lg">
            <p className="text-sm text-foreground-muted mb-2">Selected services ({selectedServices.length}):</p>
            <div className="flex flex-wrap gap-2">
              {selectedServices.map(service => (
                <Badge key={service.id} variant="secondary">
                  {service.displayName || service.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
          <Button variant="ghost" onClick={handleSkipStep} disabled={isLoading} className="order-2 sm:order-1">
            Skip this step
          </Button>
          <div className="flex-1"></div>
          <Button onClick={handleContinue} disabled={isLoading} className="order-1 sm:order-2">
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              `Continue${selectedServices.length > 0 ? ` with ${selectedServices.length} service${selectedServices.length !== 1 ? 's' : ''}` : ''}`
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
