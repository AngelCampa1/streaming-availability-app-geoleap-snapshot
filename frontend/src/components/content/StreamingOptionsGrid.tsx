'use client';

import React, { useState } from 'react';
import { OptimizedImage } from '@/components/common/OptimizedImage';
import { useStreamingAvailability } from '@/hooks/useStreamingAvailability';
import { EnhancedStreamingOption } from '@/services/streamingAvailabilityService';
import { ContentType } from '@/lib/types';
import { LanguageMatchIndicator, MatchQuality } from '@/components/vpn/LanguageMatchIndicator';
import { useLanguagePreferences } from '@/hooks/useLanguagePreferences';
import VpnRecommendationModal from '@/components/vpn/VpnRecommendationModal';

interface StreamingOptionsGridProps {
  contentId: string;
  contentType: ContentType;
  contentTitle?: string;
  className?: string;
}

export function StreamingOptionsGrid({ contentId, contentType, contentTitle = 'this content', className = '' }: StreamingOptionsGridProps) {
  const { streamingOptions, loading, error, refresh } = useStreamingAvailability({
    contentId,
    contentType: contentType === 'anime' ? 'tv-show' : contentType === 'tv' ? 'tv-show' : contentType,
    autoFetch: true,
  });

  const { preferences } = useLanguagePreferences();
  const [vpnModalOpen, setVpnModalOpen] = useState(false);

  const hasLimitedAvailability = streamingOptions.length > 0 && streamingOptions.length < 5;

  if (loading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6 p-3 sm:p-4 md:p-6 ${className}`}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-background rounded-lg p-3 sm:p-4 md:p-6 animate-pulse border">
            <div className="h-16 bg-muted rounded mb-4"></div>
            <div className="h-4 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-foreground-muted">{error}</p>
        <button
          onClick={refresh}
          className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-primary-hover transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (streamingOptions.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-6 max-w-md mx-auto">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-warning-foreground mb-2">No Streaming Options Available</h3>
          <p className="text-sm text-warning-foreground/90 mb-4">
            This content might not be available in your region, or streaming information is currently unavailable.
          </p>
          <button
            onClick={() => setVpnModalOpen(true)}
            className="w-full bg-warning hover:bg-warning/90 text-warning-foreground px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Find VPN Location</span>
          </button>
        </div>

        {/* VPN Modal */}
        <VpnRecommendationModal
          isOpen={vpnModalOpen}
          onClose={() => setVpnModalOpen(false)}
          contentId={contentId}
          contentTitle={contentTitle}
          audioLanguages={preferences.audioLanguages}
          subtitleLanguages={preferences.subtitleLanguages}
        />
      </div>
    );
  }

  // Group options by type
  const groupedOptions = streamingOptions.reduce(
    (acc, option) => {
      const type = option.type || 'subscription';
      if (!acc[type]) acc[type] = [];
      acc[type].push(option);
      return acc;
    },
    {} as Record<string, EnhancedStreamingOption[]>
  );

  const typeOrder = ['subscription', 'free', 'ads', 'rental', 'purchase'];
  const sortedTypes = typeOrder.filter(type => groupedOptions[type]);

  return (
    <div className={className}>
      {/* VPN Options Banner for limited availability */}
      {hasLimitedAvailability && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foreground mb-1">Not Available in Your Country?</h3>
              <p className="text-xs text-muted-foreground mb-3">
                This content may be available in other countries on your existing subscriptions. Use your VPN to access it.
              </p>
              <button
                onClick={() => setVpnModalOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Find VPN Location</span>
              </button>
            </div>
            <svg className="w-8 h-8 text-primary/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      )}

      {sortedTypes.map(type => (
        <div key={type} className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4 capitalize">
            {getTypeDisplayName(type)} ({groupedOptions[type].length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
            {groupedOptions[type].map((option, index) => (
              <StreamingOptionCard
                key={`${option.serviceId}-${index}`}
                option={option}
                userAudioLanguages={preferences.audioLanguages || []}
                userSubtitleLanguages={preferences.subtitleLanguages || []}
              />
            ))}
          </div>
        </div>
      ))}

      {/* VPN Modal */}
      <VpnRecommendationModal
        isOpen={vpnModalOpen}
        onClose={() => setVpnModalOpen(false)}
        contentId={contentId}
        contentTitle={contentTitle}
        audioLanguages={preferences.audioLanguages}
        subtitleLanguages={preferences.subtitleLanguages}
      />
    </div>
  );
}

interface StreamingOptionCardProps {
  option: EnhancedStreamingOption;
  userAudioLanguages: string[];
  userSubtitleLanguages: string[];
}

function StreamingOptionCard({ option, userAudioLanguages, userSubtitleLanguages }: StreamingOptionCardProps) {
  // Calculate language match quality
  const calculateMatchQuality = (): MatchQuality => {
    if (!option.audioLanguages && !option.subtitleLanguages) return 'None';

    const audioMatch = option.audioLanguages && userAudioLanguages.length > 0
      ? option.audioLanguages.filter(lang => userAudioLanguages.includes(lang)).length
      : 0;

    const subtitleMatch = option.subtitleLanguages && userSubtitleLanguages.length > 0
      ? option.subtitleLanguages.filter(lang => userSubtitleLanguages.includes(lang)).length
      : 0;

    const totalUserPrefs = userAudioLanguages.length + userSubtitleLanguages.length;
    const totalMatches = audioMatch + subtitleMatch;

    if (totalUserPrefs === 0) return 'None';
    if (totalMatches === totalUserPrefs) return 'Perfect';
    if (totalMatches >= totalUserPrefs * 0.7) return 'Good';
    if (totalMatches > 0) return 'Partial';
    return 'None';
  };

  const matchQuality = calculateMatchQuality();

  const handleClick = () => {
    // Prefer videoLink for direct content access, fallback to service link
    const url = option.videoLink || option.url;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="bg-background rounded-lg p-3 sm:p-4 md:p-6 border hover:border-primary hover:shadow-md transition-all cursor-pointer group min-h-[44px]"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Service Logo */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {option.serviceLogoUrl ? (
            <div className="w-12 h-12 relative">
              <OptimizedImage
                src={option.serviceLogoUrl}
                alt={`${option.serviceName} logo`}
                fill
                className="object-contain"
                sizes="48px"
              />
            </div>
          ) : (
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <span className="text-primary font-bold text-lg">{option.serviceName.charAt(0)}</span>
            </div>
          )}

          <div className="flex-1">
            <h4 className="font-medium text-foreground text-sm sm:text-base md:text-lg">{option.serviceName}</h4>
            <p className="text-xs sm:text-sm md:text-base text-foreground-muted capitalize">{option.type?.replace('-', ' ')}</p>
          </div>
        </div>

        {/* External Link Icon */}
        <svg
          className="w-5 h-5 text-foreground-muted group-hover:text-primary transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </div>

      {/* Language Match Indicator */}
      {(option.audioLanguages || option.subtitleLanguages) && matchQuality !== 'None' && (
        <div className="mb-3">
          <LanguageMatchIndicator
            matchQuality={matchQuality}
            audioLanguages={option.audioLanguages || []}
            subtitleLanguages={option.subtitleLanguages || []}
          />
        </div>
      )}

      {/* Price and Quality Info */}
      <div className="space-y-2">
        {option.price && option.currency && (
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm md:text-base text-foreground-muted">Price:</span>
            <span className="font-medium text-foreground text-xs sm:text-sm md:text-base">
              {option.currency} {option.price.toFixed(2)}
            </span>
          </div>
        )}

        {option.quality && option.quality.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm md:text-base text-foreground-muted">Quality:</span>
            <span className="text-xs sm:text-sm md:text-base font-medium text-foreground">
              {option.quality.map(q => q.toUpperCase()).join(', ')}
            </span>
          </div>
        )}

        {option.audioLanguages && option.audioLanguages.length > 0 && (
          <div className="flex items-start justify-between">
            <span className="text-xs sm:text-sm md:text-base text-foreground-muted">Audio:</span>
            <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
              {option.audioLanguages.slice(0, 3).map(lang => (
                <span
                  key={lang}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs sm:text-xs md:text-sm font-medium min-h-[44px] flex items-center ${
                    userAudioLanguages.includes(lang)
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {lang}
                </span>
              ))}
              {option.audioLanguages.length > 3 && (
                <span className="text-xs text-foreground-muted">+{option.audioLanguages.length - 3}</span>
              )}
            </div>
          </div>
        )}

        {option.subtitleLanguages && option.subtitleLanguages.length > 0 && (
          <div className="flex items-start justify-between">
            <span className="text-xs sm:text-sm md:text-base text-foreground-muted">Subtitles:</span>
            <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
              {option.subtitleLanguages.slice(0, 3).map(lang => (
                <span
                  key={lang}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs sm:text-xs md:text-sm font-medium min-h-[44px] flex items-center ${
                    userSubtitleLanguages.includes(lang)
                      ? 'bg-accent/10 text-accent border border-accent/20'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {lang}
                </span>
              ))}
              {option.subtitleLanguages.length > 3 && (
                <span className="text-xs text-foreground-muted">+{option.subtitleLanguages.length - 3}</span>
              )}
            </div>
          </div>
        )}

        {option.expiresAt && (
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm md:text-base text-foreground-muted">Expires:</span>
            <span className={`text-xs sm:text-sm md:text-base ${option.expiresSoon ? 'text-warning font-medium' : 'text-foreground'}`}>
              {new Date(option.expiresAt).toLocaleDateString()}
              {option.expiresSoon && ' (Soon)'}
            </span>
          </div>
        )}

        {option.availableSince && (
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm md:text-base text-foreground-muted">Available:</span>
            <span className="text-xs sm:text-sm md:text-base text-foreground">{new Date(option.availableSince).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Call to Action */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-center text-primary group-hover:text-primary-hover font-medium">
          <span>Watch on {option.serviceName}</span>
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function getTypeDisplayName(type: string): string {
  const typeMap: Record<string, string> = {
    subscription: 'Streaming',
    free: 'Free',
    ads: 'Free with Ads',
    rental: 'Rent',
    purchase: 'Buy',
  };

  return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
}
