'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import { useUserSubscriptions } from '@/hooks/useUserSubscriptions';
import { API_BASE_URL } from '@/config/api';

export interface CountryRecommendation {
  countryCode: string;
  countryName: string;
  countryFlag: string;
  languageMatchQuality: 'Perfect' | 'Good' | 'Partial' | 'Limited';
  streamingServices: string[];
  audioLanguages?: string[];
  subtitleLanguages?: string[];
}

export interface ContentCountryRecommendationsDto {
  contentId: string;
  contentTitle?: string;
  recommendedCountries: CountryRecommendation[];
}

interface VpnCountryInlineExpansionProps {
  contentId: string;
  isExpanded: boolean;
  onCollapse: () => void;
  audioLanguages?: string[];
  subtitleLanguages?: string[];
}

export const VpnCountryInlineExpansion: React.FC<VpnCountryInlineExpansionProps> = ({
  contentId,
  isExpanded,
  onCollapse,
  audioLanguages = [],
  subtitleLanguages = [],
}) => {
  const [data, setData] = useState<ContentCountryRecommendationsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const { getServiceIds, hasSetupSubscriptions } = useUserSubscriptions();
  const userServiceIds = getServiceIds();

  // Fetch VPN country data when expanded
  useEffect(() => {
    if (!isExpanded) return;

    let cancelled = false;

    const fetchCountryData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build query parameters
        const params = new URLSearchParams();
        audioLanguages.forEach(lang => params.append('audioLanguages', lang));
        subtitleLanguages.forEach(lang => params.append('subtitleLanguages', lang));

        const url = `${API_BASE_URL}/api/vpnguidance/countries-for-content/${contentId}?${params.toString()}`;

        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch VPN locations');
        }

        const result: ContentCountryRecommendationsDto = await response.json();

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching VPN country data:', err);
          setError(err instanceof Error ? err.message : 'Failed to load VPN locations');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCountryData();

    return () => {
      cancelled = true;
    };
  }, [isExpanded, contentId, audioLanguages, subtitleLanguages, retryTrigger]);

  // Don't render anything when collapsed
  if (!isExpanded) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div
        className="mt-4 bg-card border border-border rounded-lg p-6"
        data-testid="vpn-expansion-loading"
      >
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Finding VPN locations for you...</span>
        </div>
      </div>
    );
  }

  // Error state with retry functionality
  const handleRetry = () => {
    setError(null);
    setData(null);
    setRetryTrigger(prev => prev + 1); // Trigger re-fetch
  };

  // Error state
  if (error) {
    return (
      <div
        className="mt-4 bg-card border border-border rounded-lg p-6"
        data-testid="vpn-expansion-error"
      >
        <div className="flex items-start gap-3 text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Failed to load VPN locations</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!data || !data.recommendedCountries || data.recommendedCountries.length === 0) {
    return (
      <div
        className="mt-4 bg-card border border-border rounded-lg p-6"
        data-testid="vpn-expansion-container"
      >
        <div className="text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>This content is not available via VPN in any region.</p>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Hide VPN locations"
          className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
        >
          <span>Hide</span>
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Group countries by streaming service
  const countriesByService: Record<string, CountryRecommendation[]> = {};

  // Determine which services to show
  const servicesToShow = hasSetupSubscriptions ? userServiceIds : null;

  data.recommendedCountries.forEach(country => {
    country.streamingServices.forEach(serviceId => {
      // Filter by user subscriptions if they have any configured
      if (servicesToShow && !servicesToShow.includes(serviceId)) {
        return;
      }

      if (!countriesByService[serviceId]) {
        countriesByService[serviceId] = [];
      }

      // Avoid duplicates
      if (!countriesByService[serviceId].some(c => c.countryCode === country.countryCode)) {
        countriesByService[serviceId].push(country);
      }
    });
  });

  // Map service IDs to display names
  const serviceNames: Record<string, string> = {
    netflix: 'Netflix',
    prime: 'Prime Video',
    disney: 'Disney+',
    hbo: 'HBO Max',
    hulu: 'Hulu',
    apple: 'Apple TV+',
    paramount: 'Paramount+',
    peacock: 'Peacock',
  };

  // Get quality badge styles
  const getQualityBadgeClass = (quality: string): string => {
    switch (quality) {
      case 'Perfect':
        return 'text-success bg-success/10 border-success/30';
      case 'Good':
        return 'text-primary bg-primary/10 border-primary/30';
      case 'Partial':
        return 'text-warning bg-warning/10 border-warning/30';
      default:
        return 'text-muted-foreground bg-muted/10 border-muted/30';
    }
  };

  return (
    <div
      className="mt-4 bg-card border border-border rounded-lg p-4"
      data-testid="vpn-expansion-container"
    >
      <div className="space-y-4">
        {Object.entries(countriesByService).map(([serviceId, countries]) => (
          <div key={serviceId} data-testid={`service-${serviceId}`}>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <span className="text-lg">📺</span>
              {serviceNames[serviceId] || serviceId}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {countries.map(country => (
                <div
                  key={country.countryCode}
                  data-testid={`country-${country.countryCode}`}
                  className="bg-background border border-border rounded-md p-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{country.countryFlag}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {country.countryName}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase">
                          {country.countryCode}
                        </p>
                      </div>
                    </div>

                    <span
                      data-quality={country.languageMatchQuality}
                      className={`text-xs px-2 py-1 rounded-full border font-medium ${getQualityBadgeClass(
                        country.languageMatchQuality
                      )}`}
                    >
                      {country.languageMatchQuality}
                    </span>
                  </div>

                  {/* Language info */}
                  {(country.audioLanguages && country.audioLanguages.length > 0) && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">
                        Audio: {country.audioLanguages.join(', ')}
                      </p>
                    </div>
                  )}
                  {(country.subtitleLanguages && country.subtitleLanguages.length > 0) && (
                    <div className="mt-1">
                      <p className="text-xs text-muted-foreground">
                        Subs: {country.subtitleLanguages.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Collapse button */}
      <button
        type="button"
        onClick={onCollapse}
        aria-label="Hide VPN locations"
        className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
      >
        <span>Hide</span>
        <ChevronUp className="h-4 w-4" />
      </button>
    </div>
  );
};
