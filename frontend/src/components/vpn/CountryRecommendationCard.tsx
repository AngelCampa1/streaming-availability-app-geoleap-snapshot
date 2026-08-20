'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Tv } from 'lucide-react';
import { CountryRecommendation } from '@/types/vpn-country';
import { VpnProviderList } from './VpnProviderList';
import { getCountryName } from '@/lib/utils/countryNames';

interface CountryRecommendationCardProps {
  country: CountryRecommendation;
  userAudioLanguages: string[];
  userSubtitleLanguages: string[];
  onSelectVpn?: (vpnId: string, countryCode: string) => void;
  className?: string;
}

/**
 * CountryRecommendationCard - Primary card component for country-first VPN recommendations
 *
 * Visual hierarchy (70% country, 30% VPN):
 * - Large country flag emoji (48x48px)
 * - Country name (text-xl, bold)
 * - Language match quality badge
 * - Language highlights with checkmarks/warnings
 * - Collapsible VPN provider list
 * - Streaming services (small icons)
 */
export const CountryRecommendationCard: React.FC<CountryRecommendationCardProps> = ({
  country,
  onSelectVpn,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Normalize country name using Intl.DisplayNames for consistent display
  // Always convert country code to full name, regardless of what the API provides
  const displayCountryName = useMemo(
    () => getCountryName(country.countryCode, country.countryName),
    [country.countryCode, country.countryName]
  );

  const getMatchQualityConfig = () => {
    switch (country.languageMatchQuality) {
      case 'Perfect':
        return {
          label: 'Perfect Match',
          bgColor: 'bg-gradient-to-r from-success/10 to-success/15',
          borderColor: 'border-success/30',
          textColor: 'text-success',
          icon: '⭐',
        };
      case 'Good':
        return {
          label: 'Good Match',
          bgColor: 'bg-gradient-to-r from-primary/10 to-primary/15',
          borderColor: 'border-primary/30',
          textColor: 'text-primary',
          icon: '✓',
        };
      case 'Partial':
        return {
          label: 'Partial Match',
          bgColor: 'bg-gradient-to-r from-warning/10 to-warning/15',
          borderColor: 'border-warning/30',
          textColor: 'text-warning',
          icon: '~',
        };
      case 'None':
        return {
          label: 'No Match',
          bgColor: 'bg-gradient-to-r from-destructive/10 to-destructive/15',
          borderColor: 'border-destructive/30',
          textColor: 'text-destructive',
          icon: '✗',
        };
      default:
        return {
          label: 'Unknown',
          bgColor: 'bg-muted',
          borderColor: 'border-border',
          textColor: 'text-muted-foreground',
          icon: '?',
        };
    }
  };

  const matchConfig = getMatchQualityConfig();

  return (
    <div
      className={`bg-background rounded-xl border-2 ${matchConfig.borderColor} shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden ${className}`}
      data-testid="country-recommendation-card"
      data-country-code={country.countryCode}
    >
      {/* Header Section - 70% Visual Weight */}
      <div className="p-5 bg-gradient-to-br from-background to-muted/50">
        <div className="flex items-start gap-4">
          {/* Large Country Flag */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 text-4xl flex items-center justify-center rounded-lg bg-background shadow-sm border border-border">
              {country.countryFlag}
            </div>
          </div>

          {/* Country Info */}
          <div className="flex-1 min-w-0">
            {/* Country Name and Rank */}
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-foreground truncate">
                {displayCountryName}
              </h3>
              {country.rank <= 3 && (
                <span className="flex-shrink-0 px-2 py-0.5 bg-warning/10 text-warning text-xs font-bold rounded-full border border-warning/30">
                  #{country.rank}
                </span>
              )}
            </div>

            {/* Match Quality Badge */}
            <div className="mb-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border-2 ${matchConfig.bgColor} ${matchConfig.borderColor} ${matchConfig.textColor} shadow-sm`}
              >
                <span className="text-base">{matchConfig.icon}</span>
                {matchConfig.label}
                <span className="text-xs font-normal">
                  ({(country.languageScore * 100).toFixed(0)}% match)
                </span>
              </span>
            </div>

            {/* Language Highlights */}
            <div className="space-y-1.5">
              {country.languageHighlights.map((highlight, index) => {
                const isPositive = highlight.includes('✓') || highlight.includes('✅') || highlight.includes('available') || highlight.includes('audio') || highlight.includes('subtitles');
                const isWarning = highlight.includes('⚠') || highlight.includes('Limited') || highlight.includes('only');

                return (
                  <div
                    key={index}
                    className={`flex items-center gap-2 text-sm ${
                      isPositive ? 'text-success' : isWarning ? 'text-warning' : 'text-foreground'
                    }`}
                  >
                    {isPositive && <CheckCircle className="h-4 w-4 flex-shrink-0" />}
                    {isWarning && <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
                    <span className="font-medium">{highlight}</span>
                  </div>
                );
              })}
            </div>

            {/* Streaming Services */}
            {country.streamingServices.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tv className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Available on:</span>
                  {country.streamingServices.slice(0, 5).map((service, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent-foreground border border-accent/20"
                    >
                      {service}
                    </span>
                  ))}
                  {country.streamingServices.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{country.streamingServices.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VPN Provider Section - 30% Visual Weight */}
      <div className="bg-muted border-t border-border">
        {/* Expand/Collapse Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Hide' : 'Show'} VPN providers for ${displayCountryName}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              VPN Options ({country.availableVpnProviders.length})
            </span>
            {country.availableVpnProviders.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Click to {isExpanded ? 'hide' : 'view'} providers
              </span>
            )}
          </div>
          {country.availableVpnProviders.length > 0 && (
            <div className="flex items-center gap-1">
              {!isExpanded && (
                <span className="text-xs text-muted-foreground mr-2">
                  from ${Math.min(...country.availableVpnProviders.filter(p => p.price).map(p => p.price || 0)).toFixed(2)}/mo
                </span>
              )}
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-primary" />
              ) : (
                <ChevronDown className="h-5 w-5 text-primary" />
              )}
            </div>
          )}
        </button>

        {/* Expanded VPN Provider List */}
        {isExpanded && (
          <div
            className="px-5 pb-4 animate-fade-in"
            data-testid="vpn-provider-list-container"
          >
            <VpnProviderList
              providers={country.availableVpnProviders}
              countryCode={country.countryCode}
              onSelectVpn={onSelectVpn}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CountryRecommendationCard;
