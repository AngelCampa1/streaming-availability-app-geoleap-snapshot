'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import Image from 'next/image';
import { Film, Tv, ChevronDown, ChevronUp, Bookmark, BookmarkCheck } from 'lucide-react';
import { PaywalledSearchResult, ContentType, StreamingOption } from '@/lib/types/paywall';
import { logPaywallInteraction } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { VpnCountryInlineExpansion } from '@/components/vpn/VpnCountryInlineExpansion';

interface PaywalledSearchResultCardProps {
  result: PaywalledSearchResult;
  onUpgradeClick?: () => void;
  onViewDetails?: (result: PaywalledSearchResult) => void;
  onVpnClick?: (showId: string, showTitle: string, audioLanguages?: string[], subtitleLanguages?: string[]) => void;
  onBookmarkClick?: (result: PaywalledSearchResult, isAdding: boolean) => void;
  isInWatchlist?: boolean;
  bookmarkLoading?: boolean;
  className?: string;
  showGlobalView?: boolean;
  compactMode?: boolean;
  userCountryCode?: string;
  audioLanguages?: string[];
  subtitleLanguages?: string[];
}

// Pure utility functions moved outside component to prevent recreation
const getContentTypeName = (type: ContentType): string => {
  switch (type) {
    case ContentType.Movie:
      return 'Movie';
    case ContentType.Show:
      return 'TV Show';
    case ContentType.Documentary:
      return 'Documentary';
    case ContentType.Anime:
      return 'Anime';
    default:
      return 'Content';
  }
};

const getStreamingTypeIcon = (type: string): string => {
  switch (type) {
    case 'subscription':
      return '📺';
    case 'rent':
      return '💰';
    case 'buy':
      return '🛒';
    case 'free':
      return '🆓';
    default:
      return '📺';
  }
};

const getAvailabilityBadgeColor = (count: number): string => {
  if (count >= 10) return 'bg-success/10 text-success';
  if (count >= 5) return 'bg-warning/10 text-warning';
  return 'bg-destructive/10 text-destructive';
};

// Memoized component to prevent unnecessary re-renders
const PaywalledSearchResultCardComponent: React.FC<PaywalledSearchResultCardProps> = ({
  result,
  onUpgradeClick,
  onViewDetails,
  onVpnClick,
  onBookmarkClick,
  isInWatchlist = false,
  bookmarkLoading = false,
  className = '',
  showGlobalView = true,
  compactMode = false,
  userCountryCode = 'us',
  audioLanguages = [],
  subtitleLanguages = [],
}) => {
  const [imageError, setImageError] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [isVpnExpanded, setIsVpnExpanded] = useState(false);

  // Geo-restriction detection
  const isGeoRestricted = useMemo(() => {
    // Check if streaming options is empty
    if (!result.streamingOptions || result.streamingOptions.length === 0) {
      return true;
    }

    // Check if user's country is not in any available countries
    const hasUserCountry = result.streamingOptions.some(option =>
      option.availableInCountries?.some(country =>
        country.toLowerCase() === userCountryCode.toLowerCase()
      )
    );

    return !hasUserCountry;
  }, [result.streamingOptions, userCountryCode]);

  // Memoized event handlers to prevent child re-renders
  const _handleUpgradeClick = useCallback(
    async (_e: React.MouseEvent) => {
      await logPaywallInteraction('upgrade_clicked', {
        paywallPosition: 'search-result-card',
      });
      if (onUpgradeClick) {
        onUpgradeClick();
      }
    },
    [onUpgradeClick]
  );

  const handleCardClick = useCallback(() => {
    if (onViewDetails) {
      onViewDetails(result);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.id, onViewDetails]);

  const handleStreamingLinkClick = useCallback(
    (e: React.MouseEvent, option: StreamingOption) => {
      e.stopPropagation();
      if (option.url) {
        window.open(option.url, '_blank', 'noopener,noreferrer');
      }
    },
    []
  );

  const handleVpnToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsVpnExpanded(prev => !prev);

      // Keep the old onVpnClick functionality for backward compatibility (opens modal)
      // But prefer inline expansion
      if (!isVpnExpanded && onVpnClick && result.id) {
        onVpnClick(result.id, result.title, audioLanguages, subtitleLanguages);
      }
    },
    [isVpnExpanded, onVpnClick, result.id, result.title, audioLanguages, subtitleLanguages]
  );

  const handleBookmarkClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onBookmarkClick) {
        onBookmarkClick(result, !isInWatchlist);
      }
    },
    [onBookmarkClick, result, isInWatchlist]
  );

  // Memoized computed values to prevent recalculation
  // const contentTypeIcon = useMemo(() => getContentTypeIcon(result.contentType), [result.contentType]);
  // const contentTypeName = useMemo(() => getContentTypeName(result.contentType), [result.contentType]);
  // const availabilityBadgeColor = useMemo(() => getAvailabilityBadgeColor(result.availableCountries), [result.availableCountries]);

  // Memoized streaming options processing
  // const visibleStreamingOptions = useMemo(() => {
  //   if (!result.streamingOptions) return [];
  //   return showAllServices ? result.streamingOptions : result.streamingOptions.slice(0, 3);
  // }, [result.streamingOptions, showAllServices]);

  // const hasMoreServices = useMemo(() => {
  //   return result.streamingOptions && result.streamingOptions.length > 3;
  // }, [result.streamingOptions]);

  // Paywall overlay removed  -  all results are fully visible for all users

  const renderGlobalAvailability = () => {
    // Geo-restricted content warning
    if (isGeoRestricted) {
      return (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium text-warning">Not Available in Your Region</span>
          </div>
          <p className="text-sm text-warning/90 mb-2">
            This content is currently not available in your country ({userCountryCode.toUpperCase()}).
            Use a VPN to access it from other regions.
          </p>
        </div>
      );
    }

    if (!result.streamingOptions || result.streamingOptions.length === 0) {
      return (
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-foreground">Global Availability</span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityBadgeColor(result.availableCountries)}`}
            >
              {result.availableCountries} {result.availableCountries === 1 ? 'country' : 'countries'}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">Availability data being updated...</div>
        </div>
      );
    }

    const displayOptions = showAllServices ? result.streamingOptions : result.streamingOptions.slice(0, 3);

    return (
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-foreground">Global Availability</span>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityBadgeColor(result.availableCountries)}`}
          >
            {result.availableCountries} {result.availableCountries === 1 ? 'country' : 'countries'}
          </span>
        </div>

        <div className="space-y-2">
          {displayOptions.map((option, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-background rounded-md p-2 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center space-x-2 flex-1">
                {option.serviceLogoUrl ? (
                  <Image
                    src={option.serviceLogoUrl}
                    alt={`${option.serviceName} logo`}
                    width={20}
                    height={20}
                    className="rounded"
                  />
                ) : (
                  <span className="text-lg">{getStreamingTypeIcon(option.type)}</span>
                )}
                <span className="font-medium text-sm">{option.serviceName}</span>
                <span className="text-xs text-muted-foreground uppercase">{option.type}</span>
              </div>

              <div className="flex items-center space-x-2">
                {option.price && option.currency && (
                  <span className="text-sm font-medium text-success">
                    {option.currency}
                    {option.price}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{option.availableInCountries?.length || 0} regions</span>
                {option.url && (
                  <button
                    onClick={e => handleStreamingLinkClick(e, option)}
                    className="text-primary hover:text-primary/80 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring rounded px-1"
                    title={`Watch ${result.title} on ${option.serviceName}`}
                    aria-label={`Watch ${result.title} on ${option.serviceName}`}
                  >
                    <span aria-hidden="true">→</span>
                    <span className="sr-only">Watch on {option.serviceName}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {result.streamingOptions.length > 3 && (
          <button
            onClick={e => {
              e.stopPropagation();
              setShowAllServices(!showAllServices);
            }}
            className="mt-2 text-xs text-primary hover:text-primary/80 font-medium focus:outline-none focus:ring-1 focus:ring-ring rounded px-1"
            aria-expanded={showAllServices}
            aria-controls={`services-list-${result.id}`}
            aria-label={
              showAllServices
                ? 'Show fewer streaming services'
                : `Show ${result.streamingOptions.length - 3} more streaming services for ${result.title}`
            }
          >
            {showAllServices ? 'Show less' : `Show ${result.streamingOptions.length - 3} more services`}
          </button>
        )}
      </div>
    );
  };

  const renderStreamingOptions = () => {
    if (showGlobalView) {
      return renderGlobalAvailability();
    }

    // Legacy compact view
    if (!result.streamingOptions || result.streamingOptions.length === 0) {
      return (
        <div className="flex items-center text-muted-foreground text-sm">
          <span className="w-2 h-2 bg-muted rounded-full mr-2"></span>
          Available in {result.availableCountries} {result.availableCountries === 1 ? 'country' : 'countries'}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {result.streamingOptions.slice(0, 3).map((option, index) => (
          <div key={index} className="flex items-center text-sm">
            <span className="w-2 h-2 bg-success rounded-full mr-2"></span>
            <span className="font-medium">{option.serviceName}</span>
            {option.price && option.currency && (
              <span className="ml-2 text-muted-foreground">
                {option.currency}
                {option.price}
              </span>
            )}
          </div>
        ))}
        {result.streamingOptions.length > 3 && (
          <div className="text-xs text-muted-foreground">+{result.streamingOptions.length - 3} more services</div>
        )}
      </div>
    );
  };

  const renderCastAndCrew = () => {
    const hasCast = result.cast && result.cast.length > 0;
    const hasDirector = result.director;

    if (!hasCast && !hasDirector) return null;

    return (
      <div className="mb-3 text-sm">
        {hasDirector && (
          <div className="mb-1">
            <span className="text-muted-foreground">Director:</span> <span className="font-medium">{result.director}</span>
          </div>
        )}
        {hasCast && result.cast && (
          <div>
            <span className="text-muted-foreground">Cast:</span> <span>{result.cast.slice(0, 3).join(', ')}</span>
            {result.cast.length > 3 && <span className="text-muted-foreground"> +{result.cast.length - 3} more</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <article
      className={`relative bg-background rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        compactMode ? 'border border-border' : 'shadow-md'
      } ${className}`}
      onClick={handleCardClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${result.title} - ${getContentTypeName(result.type)} ${result.year ? `from ${result.year}` : ''}. Available in ${result.availableCountries} ${result.availableCountries === 1 ? 'country' : 'countries'}. ${result.imdbRating ? `Rating ${result.imdbRating}/10` : ''}. Click to expand for streaming options.`}
    >
      <div className={compactMode ? 'flex p-3' : 'flex p-4'}>
        {/* Poster */}
        <div
          className={`flex-shrink-0 bg-muted rounded-md overflow-hidden ${compactMode ? 'w-12 h-18' : 'w-16 h-24'}`}
        >
          {result.posterUrl && !imageError ? (
            <Image
              src={result.posterUrl}
              alt={`${result.title} poster`}
              width={compactMode ? 48 : 64}
              height={compactMode ? 72 : 96}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              {result.type === ContentType.Movie ? (
                <Film className="h-8 w-8 text-muted-foreground" />
              ) : (
                <Tv className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 ml-4 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  className={`font-semibold leading-tight ${
                    compactMode ? 'text-base' : 'text-lg'
                  }`}
                >
                  {result.title}
                </h3>
                {/* Expand indicator */}
                <span className="flex-shrink-0 text-muted-foreground" aria-hidden="true">
                  <ChevronDown className="h-4 w-4" />
                </span>
                {/* Bookmark/Watchlist button */}
                {onBookmarkClick && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 ml-auto"
                    onClick={handleBookmarkClick}
                    disabled={bookmarkLoading}
                    aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                    title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                  >
                    {isInWatchlist ? (
                      <BookmarkCheck className="h-5 w-5 text-primary" />
                    ) : (
                      <Bookmark className="h-5 w-5" />
                    )}
                  </Button>
                )}
              </div>

              {/* Metadata Row */}
              <div className="flex items-center flex-wrap gap-2 text-sm text-muted-foreground">
                <span
                  className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full"
                >
                  {getContentTypeName(result.type)}
                </span>

                {result.year && <span>{result.year}</span>}

                {result.imdbRating && (
                  <span className="flex items-center">
                    ⭐ {result.imdbRating.toFixed(1)}
                  </span>
                )}

                {/* UX Fix: Only show match percentage if it's a meaningful value (>= 10%), capped at 100% */}
                {result.relevanceScore != null && result.relevanceScore >= 10 && (
                  <span className="ml-auto text-xs text-muted-foreground">{Math.min(result.relevanceScore, 100).toFixed(0)}% match</span>
                )}
              </div>
            </div>
          </div>

          {/* Description - only show in non-compact mode */}
          {!compactMode && (result.description || result.previewData?.shortDescription) && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {result.description || result.previewData?.shortDescription}
            </p>
          )}

          {/* Cast and Crew - only show in non-compact mode */}
          {!compactMode && <div>{renderCastAndCrew()}</div>}

          {/* Genres */}
          {result.genres && result.genres.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {result.genres.slice(0, compactMode ? 2 : 3).map((genre, index) => (
                  <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {genre}
                  </span>
                ))}
                {result.genres.length > (compactMode ? 2 : 3) && (
                  <span className="text-xs text-muted-foreground">+{result.genres.length - (compactMode ? 2 : 3)} more</span>
                )}
              </div>
            </div>
          )}

          {/* Streaming Options */}
          <div>{renderStreamingOptions()}</div>

          {/* VPN Availability Button - Only show for geo-restricted content */}
          {result.id && isGeoRestricted && (
            <>
              <button
                onClick={handleVpnToggle}
                className="mt-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md bg-primary hover:bg-primary/90 text-primary-foreground ring-2 ring-primary/30 ring-offset-2"
                aria-label={`${isVpnExpanded ? 'Hide' : 'Find'} VPN streaming options for ${result.title}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{isVpnExpanded ? 'Hide VPN Locations' : 'Find with Your VPN'}</span>
                {isVpnExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {/* Inline VPN Country Expansion */}
              <VpnCountryInlineExpansion
                contentId={result.id}
                isExpanded={isVpnExpanded}
                onCollapse={() => setIsVpnExpanded(false)}
                audioLanguages={audioLanguages}
                subtitleLanguages={subtitleLanguages}
              />
            </>
          )}
        </div>
      </div>

      {/* Global availability indicator */}
      {showGlobalView && (
        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center">
          🌍 {result.availableCountries}
        </div>
      )}
    </article>
  );
};

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: PaywalledSearchResultCardProps, nextProps: PaywalledSearchResultCardProps) => {
  // Compare result object properties that affect rendering
  if (prevProps.result.id !== nextProps.result.id) return false;
  if (prevProps.result.isPaywalled !== nextProps.result.isPaywalled) return false;
  if (prevProps.result.title !== nextProps.result.title) return false;
  if (prevProps.result.posterUrl !== nextProps.result.posterUrl) return false;
  if (prevProps.result.availableCountries !== nextProps.result.availableCountries) return false;

  // Compare streaming options length (full deep comparison would be expensive)
  const prevOptionsLength = prevProps.result.streamingOptions?.length || 0;
  const nextOptionsLength = nextProps.result.streamingOptions?.length || 0;
  if (prevOptionsLength !== nextOptionsLength) return false;

  // Compare other props
  if (prevProps.showGlobalView !== nextProps.showGlobalView) return false;
  if (prevProps.compactMode !== nextProps.compactMode) return false;
  if (prevProps.className !== nextProps.className) return false;

  // Compare watchlist props
  if (prevProps.isInWatchlist !== nextProps.isInWatchlist) return false;
  if (prevProps.bookmarkLoading !== nextProps.bookmarkLoading) return false;

  // Compare callback references (note: this might cause re-renders if callbacks aren't memoized)
  if (prevProps.onUpgradeClick !== nextProps.onUpgradeClick) return false;
  if (prevProps.onViewDetails !== nextProps.onViewDetails) return false;
  if (prevProps.onVpnClick !== nextProps.onVpnClick) return false;
  if (prevProps.onBookmarkClick !== nextProps.onBookmarkClick) return false;

  // userCountryCode drives geo-restriction detection  -  must be compared
  if (prevProps.userCountryCode !== nextProps.userCountryCode) return false;

  return true;
};

// Export the memoized component
export const PaywalledSearchResultCard = memo(PaywalledSearchResultCardComponent, arePropsEqual);

export default PaywalledSearchResultCard;
