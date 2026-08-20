'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getUserStreamingServices,
  addUserStreamingService,
  removeUserStreamingService,
  updateUserStreamingService,
  StreamingServiceCatalogDto,
  UserStreamingServiceDto,
  StreamingServiceType,
  UserStreamingServicesResponse,
  AddStreamingServiceRequest,
} from '@/lib/api';
import { logger } from '@/lib/logger';

interface StreamingServicesManagerProps {
  countryCode?: string;
}

export function StreamingServicesManager({ countryCode }: StreamingServicesManagerProps) {
  const [data, setData] = useState<UserStreamingServicesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingService, setProcessingService] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getUserStreamingServices(countryCode);
      setData(response);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load streaming services';
      setError(errorMessage);
      logger.error('Failed to load streaming services', { error: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [countryCode]);

  useEffect(() => {
    loadData();
  }, [countryCode, loadData]);

  const handleAddService = async (service: StreamingServiceCatalogDto) => {
    try {
      setProcessingService(service.id);
      const request: AddStreamingServiceRequest = {
        streamingServiceId: service.id,
        prioritizeInResults: true,
        showInRecommendations: true,
      };

      await addUserStreamingService(request);
      await loadData(); // Reload data to get updated state
      logger.info('Added streaming service', { serviceName: service.name });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add streaming service';
      setError(errorMessage);
      logger.error('Failed to add streaming service', { serviceName: service.name, error: errorMessage });
    } finally {
      setProcessingService(null);
    }
  };

  const handleRemoveService = async (userService: UserStreamingServiceDto) => {
    try {
      setProcessingService(userService.streamingServiceId);
      await removeUserStreamingService(userService.streamingServiceId);
      await loadData(); // Reload data to get updated state
      logger.info('Removed streaming service', { serviceName: userService.serviceName });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove streaming service';
      setError(errorMessage);
      logger.error('Failed to remove streaming service', { serviceName: userService.serviceName, error: errorMessage });
    } finally {
      setProcessingService(null);
    }
  };

  const handleTogglePreference = async (
    userService: UserStreamingServiceDto,
    field: 'prioritizeInResults' | 'showInRecommendations'
  ) => {
    try {
      setProcessingService(userService.streamingServiceId);
      const updatedPreferences = {
        streamingServiceId: userService.streamingServiceId,
        prioritizeInResults:
          field === 'prioritizeInResults' ? !userService.prioritizeInResults : userService.prioritizeInResults,
        showInRecommendations:
          field === 'showInRecommendations' ? !userService.showInRecommendations : userService.showInRecommendations,
      };

      await updateUserStreamingService(userService.streamingServiceId, updatedPreferences);
      await loadData(); // Reload data to get updated state
      logger.info('Updated streaming service preferences', { serviceName: userService.serviceName, field });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMessage);
      logger.error('Failed to update streaming service preferences', {
        serviceName: userService.serviceName,
        field,
        error: errorMessage,
      });
    } finally {
      setProcessingService(null);
    }
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

  const getServiceTypeBadgeColor = (type: StreamingServiceType): string => {
    switch (type) {
      case StreamingServiceType.Subscription:
        return 'bg-primary/10 text-primary';
      case StreamingServiceType.Free:
        return 'bg-success/10 text-success';
      case StreamingServiceType.AdSupported:
        return 'bg-warning/10 text-warning';
      case StreamingServiceType.Rental:
        return 'bg-primary/10 text-primary';
      case StreamingServiceType.Purchase:
        return 'bg-error/10 text-error';
      case StreamingServiceType.Live:
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-muted-foreground">Loading streaming services...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-error mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-medium">Failed to load streaming services</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        </div>
        <button
          onClick={loadData}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition duration-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-foreground mb-4">Your Streaming Services</h3>

        {data.userServices.length === 0 ? (
          <div className="bg-muted border-2 border-dashed border-border rounded-lg p-6 text-center">
            <svg className="h-12 w-12 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 48 48">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.712-3.714M14 40v-4a9.971 9.971 0 01.712-3.714M18 20a6 6 0 1112 0c0 1.657-.672 3.157-1.757 4.243M18 20a6 6 0 016-6 6 6 0 016 6M18 20H8a8 8 0 108 8v-8z"
              />
            </svg>
            <p className="text-muted-foreground font-medium">No streaming services selected</p>
            <p className="text-muted-foreground text-sm mt-1">Choose your services below to get personalized search results</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.userServices.map(userService => (
              <div key={userService.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-foreground">{userService.serviceName}</h4>
                      {userService.streamingService && (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getServiceTypeBadgeColor(userService.streamingService.type)}`}
                        >
                          {getServiceTypeDisplay(userService.streamingService.type)}
                        </span>
                      )}
                    </div>

                    {userService.streamingService?.description && (
                      <p className="text-muted-foreground text-sm mt-1">{userService.streamingService.description}</p>
                    )}

                    <div className="mt-3 space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={userService.prioritizeInResults}
                          onChange={() => handleTogglePreference(userService, 'prioritizeInResults')}
                          disabled={processingService === userService.streamingServiceId}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="ml-2 text-sm text-muted-foreground">Prioritize in search results</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={userService.showInRecommendations}
                          onChange={() => handleTogglePreference(userService, 'showInRecommendations')}
                          disabled={processingService === userService.streamingServiceId}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="ml-2 text-sm text-muted-foreground">Show in recommendations</span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveService(userService)}
                    disabled={processingService === userService.streamingServiceId}
                    className="ml-4 text-error hover:text-error/90 disabled:opacity-50"
                    title="Remove service"
                  >
                    {processingService === userService.streamingServiceId ? (
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-medium text-foreground mb-4">Available Services</h3>

        {data.availableServices.length === 0 ? (
          <div className="bg-success/10 border border-success/20 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-success mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-success">You&apos;ve added all available streaming services!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.availableServices.map(service => (
              <div
                key={service.id}
                className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-foreground">{service.displayName || service.name}</h4>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getServiceTypeBadgeColor(service.type)}`}
                      >
                        {getServiceTypeDisplay(service.type)}
                      </span>
                    </div>

                    {service.description && (
                      <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{service.description}</p>
                    )}

                    <div className="mt-3">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                        {service.category}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleAddService(service)}
                  disabled={processingService === service.id}
                  className="w-full mt-4 bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 flex items-center justify-center"
                >
                  {processingService === service.id ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Add Service
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {data.userServices.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm text-primary">
              <p className="font-medium">How this affects your search results:</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Services with &quot;Prioritize in search results&quot; will appear first in search results</li>
                <li>Services with &quot;Show in recommendations&quot; will be suggested for new content</li>
                <li>Search results will be filtered to show content available on your selected services</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
