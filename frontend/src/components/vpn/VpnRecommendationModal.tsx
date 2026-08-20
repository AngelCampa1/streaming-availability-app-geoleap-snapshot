'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Globe, Languages, Sparkles, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/lib/api';
import { logger } from '@/lib/logger';
import { CountriesForContentResponse, CountryRecommendation, GroupedCountries } from '@/types/vpn-country';
import { CountryRecommendationCard } from './CountryRecommendationCard';

interface VpnRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle: string;
  audioLanguages?: string[];
  subtitleLanguages?: string[];
}

/**
 * Fetch country recommendations for content with language preferences
 */
async function fetchCountriesForContent(
  contentId: string,
  audioLanguages: string[],
  subtitleLanguages: string[]
): Promise<CountriesForContentResponse> {
  const params = new URLSearchParams();
  audioLanguages.forEach(lang => params.append('audioLanguages', lang));
  subtitleLanguages.forEach(lang => params.append('subtitleLanguages', lang));

  return apiCall<CountriesForContentResponse>(
    `/api/vpnguidance/countries-for-content/${contentId}?${params.toString()}`
  );
}

/**
 * Group countries by match quality for organized display
 */
function groupCountriesByMatchQuality(countries: CountryRecommendation[]): GroupedCountries {
  return countries.reduce<GroupedCountries>(
    (groups, country) => {
      switch (country.languageMatchQuality) {
        case 'Perfect':
          groups.perfect.push(country);
          break;
        case 'Good':
          groups.good.push(country);
          break;
        case 'Partial':
          groups.partial.push(country);
          break;
        default:
          groups.other.push(country);
      }
      return groups;
    },
    { perfect: [], good: [], partial: [], other: [] }
  );
}

/**
 * VpnRecommendationModal - Redesigned to prioritize countries over VPN providers
 *
 * New user flow:
 * 1. User clicks "Where to Watch with VPN"
 * 2. Modal shows countries grouped by match quality
 * 3. Each country card shows language support prominently
 * 4. VPN providers are secondary, collapsible within each country
 */
export const VpnRecommendationModal: React.FC<VpnRecommendationModalProps> = ({
  isOpen,
  onClose,
  contentId,
  contentTitle,
  audioLanguages = [],
  subtitleLanguages = [],
}) => {
  const [showOtherCountries, setShowOtherCountries] = useState(false);

  // Fetch country recommendations using React Query
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['vpn-countries-for-content', contentId, audioLanguages, subtitleLanguages],
    queryFn: () => fetchCountriesForContent(contentId, audioLanguages, subtitleLanguages),
    enabled: isOpen && !!contentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Group countries by match quality
  const groupedCountries = response?.countries
    ? groupCountriesByMatchQuality(response.countries)
    : { perfect: [], good: [], partial: [], other: [] };

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Don't render if not open or during SSR
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleVpnSelect = (vpnId: string, countryCode: string) => {
    // Track VPN selection with country context
    logger.info('[VpnRecommendationModal] VPN selected', { vpnId, countryCode, contentId });
  };

  // Use Portal to render at document.body level for proper fixed positioning
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vpn-modal-title"
      aria-describedby="vpn-modal-description"
    >
      <div className="bg-card rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-6 w-6 text-primary" />
              <h2 id="vpn-modal-title" className="text-2xl font-bold text-foreground">
                Where to Watch with VPN
              </h2>
            </div>
            <p id="vpn-modal-description" className="text-sm text-foreground mt-1">
              Watch &ldquo;{contentTitle}&rdquo; in these countries with VPN access
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded-full p-1"
            aria-label="Close country recommendations dialog"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Language Preferences Display */}
        {(audioLanguages.length > 0 || subtitleLanguages.length > 0) && (
          <div className="px-6 py-3 bg-primary/5 border-b border-primary/10">
            <div className="flex items-start gap-3">
              <Languages className="h-4 w-4 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-2">Your Language Preferences:</p>
                <div className="flex flex-wrap gap-2">
                  {audioLanguages.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-primary font-medium">Audio:</span>
                      {audioLanguages.map(lang => (
                        <span
                          key={lang}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  )}
                  {subtitleLanguages.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-accent font-medium">Subtitles:</span>
                      {subtitleLanguages.map(lang => (
                        <span
                          key={lang}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent border border-accent/20"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
              <p className="text-center text-muted-foreground">Finding the best countries for you...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warning/10">
                  <Globe className="w-8 h-8 text-warning" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Country Data Temporarily Unavailable</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                We&apos;re having trouble fetching streaming availability data for this content.
                This is usually temporary  -  please try again in a moment.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => refetch()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground px-4 py-2 rounded-full text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Success State - Country Groups */}
          {response && response.countries.length > 0 && (
            <div className="space-y-6">
              {/* Info Banner */}
              <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-1">
                      {response.totalCountries} {response.totalCountries === 1 ? 'Country' : 'Countries'} Found
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Countries are ranked by language match quality and VPN availability for &ldquo;{contentTitle}&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {/* Perfect Match Countries */}
              {groupedCountries.perfect.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-success mb-3 flex items-center gap-2">
                    <span className="text-xl">⭐</span>
                    Perfect Match Countries ({groupedCountries.perfect.length})
                  </h3>
                  <div className="space-y-4">
                    {groupedCountries.perfect.map((country, index) => (
                      <CountryRecommendationCard
                        key={`${country.countryCode}-${index}`}
                        country={country}
                        userAudioLanguages={audioLanguages}
                        userSubtitleLanguages={subtitleLanguages}
                        onSelectVpn={handleVpnSelect}
                        className="animate-fade-in"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Good Match Countries */}
              {groupedCountries.good.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                    <span className="text-xl">✓</span>
                    Good Match Countries ({groupedCountries.good.length})
                  </h3>
                  <div className="space-y-4">
                    {groupedCountries.good.map((country, index) => (
                      <CountryRecommendationCard
                        key={`${country.countryCode}-${index}`}
                        country={country}
                        userAudioLanguages={audioLanguages}
                        userSubtitleLanguages={subtitleLanguages}
                        onSelectVpn={handleVpnSelect}
                        className="animate-fade-in"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Partial Match Countries */}
              {groupedCountries.partial.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-warning mb-3 flex items-center gap-2">
                    <span className="text-xl">~</span>
                    Partial Match Countries ({groupedCountries.partial.length})
                  </h3>
                  <div className="space-y-4">
                    {groupedCountries.partial.map((country, index) => (
                      <CountryRecommendationCard
                        key={`${country.countryCode}-${index}`}
                        country={country}
                        userAudioLanguages={audioLanguages}
                        userSubtitleLanguages={subtitleLanguages}
                        onSelectVpn={handleVpnSelect}
                        className="animate-fade-in"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other Countries - Collapsible */}
              {groupedCountries.other.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowOtherCountries(!showOtherCountries)}
                    className="w-full text-left mb-3 p-3 bg-muted hover:bg-muted/80 rounded-full transition-colors"
                  >
                    <h3 className="text-lg font-bold text-foreground flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Other Countries ({groupedCountries.other.length})
                      </span>
                      <span className="text-sm font-normal">
                        {showOtherCountries ? 'Click to hide' : 'Click to expand'}
                      </span>
                    </h3>
                  </button>
                  {showOtherCountries && (
                    <div className="space-y-4">
                      {groupedCountries.other.map((country, index) => (
                        <CountryRecommendationCard
                          key={`${country.countryCode}-${index}`}
                          country={country}
                          userAudioLanguages={audioLanguages}
                          userSubtitleLanguages={subtitleLanguages}
                          onSelectVpn={handleVpnSelect}
                          className="animate-fade-in"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {response && response.countries.length === 0 && (
            <div className="text-center py-8">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                  <Globe className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No Countries Found</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                We couldn&apos;t find any countries where &ldquo;{contentTitle}&rdquo; is available with VPN access at
                this time. Try adjusting your language preferences or check back later.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted">
          <p className="text-xs text-muted-foreground">
            Recommendations updated:{' '}
            {response?.generatedAt
              ? new Date(response.generatedAt).toLocaleString()
              : 'Just now'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VpnRecommendationModal;
