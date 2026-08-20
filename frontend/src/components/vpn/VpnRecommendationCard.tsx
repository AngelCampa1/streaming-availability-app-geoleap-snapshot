'use client';

import React, { useState } from 'react';
import { MapPin, Star, ChevronDown, ChevronUp, AlertTriangle, Award } from 'lucide-react';
import { LanguageMatchIndicator, MatchQuality } from './LanguageMatchIndicator';

export interface CountryLanguageInfo {
  countryCode: string;
  countryName: string;
  audioLanguages: string[];
  subtitleLanguages: string[];
  matchQuality: MatchQuality;
}

export interface VpnRecommendationData {
  vpnName: string;
  countries: CountryLanguageInfo[];
  overallScore: number;
  warnings?: string[];
  isBestMatch?: boolean;
}

interface VpnRecommendationCardProps {
  recommendation: VpnRecommendationData;
  className?: string;
}

export const VpnRecommendationCard: React.FC<VpnRecommendationCardProps> = ({
  recommendation,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getBestMatchQuality = (): MatchQuality => {
    if (recommendation.countries.length === 0) return 'None';

    const qualities = recommendation.countries.map(c => c.matchQuality);
    if (qualities.includes('Perfect')) return 'Perfect';
    if (qualities.includes('Good')) return 'Good';
    if (qualities.includes('Partial')) return 'Partial';
    return 'None';
  };

  const bestMatchQuality = getBestMatchQuality();

  return (
    <div
      className={`bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow ${className}`}
      data-testid="vpn-recommendation-card"
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-foreground">{recommendation.vpnName}</h3>
              {recommendation.isBestMatch && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/30"
                  data-testid="best-match-badge"
                >
                  <Award className="h-3 w-3" />
                  Best Language Match
                </span>
              )}
            </div>

            {/* Overall Score and Match Quality */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-warning fill-warning" />
                <span className="text-sm font-medium text-foreground">
                  {recommendation.overallScore.toFixed(1)}
                </span>
              </div>
              <LanguageMatchIndicator
                matchQuality={bestMatchQuality}
                audioLanguages={
                  recommendation.countries.length > 0
                    ? recommendation.countries[0].audioLanguages
                    : []
                }
                subtitleLanguages={
                  recommendation.countries.length > 0
                    ? recommendation.countries[0].subtitleLanguages
                    : []
                }
              />
            </div>

            {/* Warnings */}
            {recommendation.warnings && recommendation.warnings.length > 0 && (
              <div className="mb-3">
                {recommendation.warnings.map((warning, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-sm text-warning bg-warning/10 border border-warning/30 rounded p-2 mt-1"
                    data-testid={`warning-${index}`}
                  >
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Country Summary */}
            <div className="text-sm text-muted-foreground">
              <MapPin className="inline h-4 w-4 mr-1" />
              {recommendation.countries.length} {recommendation.countries.length === 1 ? 'country' : 'countries'} available
            </div>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        {recommendation.countries.length > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-3 flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
            data-testid="toggle-countries"
          >
            {isExpanded ? (
              <>
                <span>Hide Country Details</span>
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Show Country Details</span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Expanded Country Details */}
      {isExpanded && recommendation.countries.length > 0 && (
        <div className="border-t border-border bg-muted/50 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">Available Countries</h4>
          <div className="space-y-3">
            {recommendation.countries.map((country, index) => (
              <div
                key={index}
                className="bg-background rounded-md border border-border p-3"
                data-testid={`country-${country.countryCode}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{country.countryName}</span>
                    <span className="text-xs text-muted-foreground uppercase">{country.countryCode}</span>
                  </div>
                  <LanguageMatchIndicator
                    matchQuality={country.matchQuality}
                    audioLanguages={country.audioLanguages}
                    subtitleLanguages={country.subtitleLanguages}
                  />
                </div>

                {/* Language Lists */}
                {(country.audioLanguages.length > 0 || country.subtitleLanguages.length > 0) && (
                  <div className="space-y-2 mt-2">
                    {country.audioLanguages.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-1">Audio:</p>
                        <div className="flex flex-wrap gap-1">
                          {country.audioLanguages.map(lang => (
                            <span
                              key={lang}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {country.subtitleLanguages.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-1">Subtitles:</p>
                        <div className="flex flex-wrap gap-1">
                          {country.subtitleLanguages.map(lang => (
                            <span
                              key={lang}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/50 text-accent-foreground"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
