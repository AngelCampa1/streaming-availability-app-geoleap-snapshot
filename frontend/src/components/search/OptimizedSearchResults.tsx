'use client';

import React, { useCallback, memo, useState, useEffect } from 'react';
import { PaywalledSearchResponse, GlobalSearchRequest, PaywalledSearchResult, ContentType } from '@/lib/types/paywall';
import { useSearchQuery, useInfiniteSearchQuery } from '@/lib/hooks/useSearchQuery';
import PaywallBanner from '../paywall/PaywallBanner';
import PaywalledSearchResultCard from '../paywall/PaywalledSearchResultCard';
import SearchResultsSkeleton from './SearchResultsSkeleton';
import { StreamingDetailsModal } from '../StreamingDetailsModal';
import SearchLimitModal from './SearchLimitModal';
import SignupRequiredModal from '../paywall/SignupRequiredModal';
import UpgradeRequiredModal from '../paywall/UpgradeRequiredModal';
import type { SearchBlockedResponse } from '@/lib/anonymous-user';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAuth } from '@/contexts/AuthContext';
import { useToastNotifications, ToastContainer } from '@/components/notifications';
import { Search, TrendingUp, Sparkles, Film, Tv, AlertCircle, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';

// UX Improvement: Retry countdown component for rate-limited errors
interface RetryCountdownProps {
  initialSeconds: number;
  onComplete: () => void;
}

function RetryCountdown({ initialSeconds, onComplete }: RetryCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isAutoRetrying, setIsAutoRetrying] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) {
      setIsAutoRetrying(true);
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft(s => s - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft, onComplete]);

  if (isAutoRetrying) {
    return (
      <div className="flex items-center justify-center gap-2 text-primary">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm font-medium">Retrying now...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Countdown Circle */}
      <div className="relative w-20 h-20 mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-muted/30"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${(secondsLeft / initialSeconds) * 226} 226`}
            strokeLinecap="round"
            className="text-primary transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{secondsLeft}</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Auto-retry in {secondsLeft} {secondsLeft === 1 ? 'second' : 'seconds'}
      </p>

      {/* Skip button */}
      <button
        onClick={onComplete}
        className="text-sm text-primary hover:underline"
      >
        Retry now
      </button>
    </div>
  );
}

// E2E Bug Fix: Interface for search limit error response
// Updated to support new 2-step conversion funnel format
interface SearchLimitError {
  requiresSignup?: boolean;
  searchesUsed?: number;
  searchLimit?: number;
  message?: string;
  // New fields for 2-step conversion funnel
  blockReason?: 'signup_required' | 'upgrade_required';
  resetsAt?: string | null;
  upgradeUrl?: string;
}

// UX Improvement: Query-aware suggestions database
interface SmartSuggestion {
  title: string;
  type: 'Movie' | 'TV Show';
  keywords: string[];
  genre?: string;
}

const SMART_SUGGESTIONS: SmartSuggestion[] = [
  // Sci-Fi / Fantasy
  { title: 'Stranger Things', type: 'TV Show', keywords: ['sci-fi', 'supernatural', 'horror', 'mystery', 'kids', '80s', 'netflix'], genre: 'Sci-Fi' },
  { title: 'The Mandalorian', type: 'TV Show', keywords: ['star wars', 'sci-fi', 'space', 'action', 'disney'], genre: 'Sci-Fi' },
  { title: 'Dune', type: 'Movie', keywords: ['sci-fi', 'space', 'epic', 'desert', 'action'], genre: 'Sci-Fi' },
  { title: 'Black Mirror', type: 'TV Show', keywords: ['sci-fi', 'technology', 'anthology', 'dark', 'thriller'], genre: 'Sci-Fi' },

  // Drama
  { title: 'Breaking Bad', type: 'TV Show', keywords: ['drama', 'crime', 'dark', 'chemistry', 'teacher'], genre: 'Drama' },
  { title: 'The Crown', type: 'TV Show', keywords: ['drama', 'royal', 'british', 'history', 'queen'], genre: 'Drama' },
  { title: 'Succession', type: 'TV Show', keywords: ['drama', 'family', 'business', 'wealth', 'hbo'], genre: 'Drama' },
  { title: 'Oppenheimer', type: 'Movie', keywords: ['drama', 'history', 'war', 'science', 'biography'], genre: 'Drama' },

  // Comedy
  { title: 'The Office', type: 'TV Show', keywords: ['comedy', 'workplace', 'mockumentary', 'funny', 'office'], genre: 'Comedy' },
  { title: 'Ted Lasso', type: 'TV Show', keywords: ['comedy', 'sports', 'football', 'soccer', 'feel good'], genre: 'Comedy' },
  { title: 'Barbie', type: 'Movie', keywords: ['comedy', 'fantasy', 'pink', 'doll', 'feminist'], genre: 'Comedy' },
  { title: 'Schitt\'s Creek', type: 'TV Show', keywords: ['comedy', 'family', 'heartwarming', 'lgbtq'], genre: 'Comedy' },

  // Action / Thriller
  { title: 'John Wick', type: 'Movie', keywords: ['action', 'assassin', 'revenge', 'dog', 'keanu'], genre: 'Action' },
  { title: 'The Last of Us', type: 'TV Show', keywords: ['action', 'zombie', 'apocalypse', 'survival', 'hbo', 'game'], genre: 'Action' },
  { title: 'Jack Ryan', type: 'TV Show', keywords: ['action', 'spy', 'cia', 'thriller', 'military'], genre: 'Action' },
  { title: 'Top Gun: Maverick', type: 'Movie', keywords: ['action', 'aviation', 'military', 'sequel', 'tom cruise'], genre: 'Action' },

  // Horror
  { title: 'The Haunting of Hill House', type: 'TV Show', keywords: ['horror', 'ghost', 'haunted', 'family', 'scary'], genre: 'Horror' },
  { title: 'Get Out', type: 'Movie', keywords: ['horror', 'thriller', 'social', 'psychological'], genre: 'Horror' },

  // Documentary
  { title: 'Our Planet', type: 'TV Show', keywords: ['documentary', 'nature', 'wildlife', 'environment'], genre: 'Documentary' },
  { title: 'The Social Dilemma', type: 'Movie', keywords: ['documentary', 'technology', 'social media', 'privacy'], genre: 'Documentary' },

  // Animation
  { title: 'Arcane', type: 'TV Show', keywords: ['animation', 'anime', 'game', 'league', 'action'], genre: 'Animation' },
  { title: 'Spider-Man: Across the Spider-Verse', type: 'Movie', keywords: ['animation', 'superhero', 'marvel', 'spider'], genre: 'Animation' },

  // Romance
  { title: 'Bridgerton', type: 'TV Show', keywords: ['romance', 'period', 'regency', 'drama', 'netflix'], genre: 'Romance' },
  { title: 'Pride and Prejudice', type: 'Movie', keywords: ['romance', 'classic', 'period', 'british'], genre: 'Romance' },

  // Korean/International
  { title: 'Squid Game', type: 'TV Show', keywords: ['korean', 'thriller', 'game', 'survival', 'netflix'], genre: 'Thriller' },
  { title: 'Parasite', type: 'Movie', keywords: ['korean', 'thriller', 'social', 'dark', 'oscar'], genre: 'Thriller' },
];

// Generate query-aware suggestions
function getSmartSuggestions(query: string, limit: number = 6): SmartSuggestion[] {
  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  // Score each suggestion based on relevance to query
  const scored = SMART_SUGGESTIONS.map(suggestion => {
    let score = 0;

    // Check title similarity (partial match)
    if (suggestion.title.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // Check keyword matches
    for (const keyword of suggestion.keywords) {
      if (queryLower.includes(keyword)) {
        score += 5;
      }
      for (const word of queryWords) {
        if (keyword.includes(word) || word.includes(keyword)) {
          score += 3;
        }
      }
    }

    // Check genre match
    if (suggestion.genre && queryLower.includes(suggestion.genre.toLowerCase())) {
      score += 4;
    }

    // Check type match
    if (queryLower.includes('movie') && suggestion.type === 'Movie') {
      score += 3;
    }
    if ((queryLower.includes('show') || queryLower.includes('series') || queryLower.includes('tv')) && suggestion.type === 'TV Show') {
      score += 3;
    }

    return { suggestion, score };
  });

  // Sort by score (desc) and return top results
  // If no matches found, return random popular picks
  const hasMatches = scored.some(s => s.score > 0);

  if (hasMatches) {
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.suggestion);
  }

  // Fallback: return diverse mix of popular content
  const popularPicks = ['Stranger Things', 'Breaking Bad', 'Oppenheimer', 'Ted Lasso', 'Squid Game', 'Dune'];
  return SMART_SUGGESTIONS.filter(s => popularPicks.includes(s.title)).slice(0, limit);
}

// Generate "Did you mean?" suggestions for potential typos
function getTypoSuggestions(query: string): string[] {
  const queryLower = query.toLowerCase().trim();
  const suggestions: string[] = [];

  // Common typo patterns and corrections
  const typoMap: Record<string, string> = {
    'stranger thing': 'Stranger Things',
    'strangers things': 'Stranger Things',
    'breaking bad': 'Breaking Bad',
    'brake bad': 'Breaking Bad',
    'the office': 'The Office',
    'ofice': 'The Office',
    'game of throne': 'Game of Thrones',
    'games of thrones': 'Game of Thrones',
    'squid games': 'Squid Game',
    'squide game': 'Squid Game',
    'mandelorian': 'The Mandalorian',
    'mandalorin': 'The Mandalorian',
    'ted laso': 'Ted Lasso',
    'bridgerton': 'Bridgerton',
    'briderton': 'Bridgerton',
    'openhimer': 'Oppenheimer',
    'openheimer': 'Oppenheimer',
  };

  // Check exact typo matches
  for (const [typo, correction] of Object.entries(typoMap)) {
    if (queryLower.includes(typo)) {
      suggestions.push(correction);
    }
  }

  // Fuzzy match against known titles (simple Levenshtein-like check)
  for (const item of SMART_SUGGESTIONS) {
    const titleLower = item.title.toLowerCase();
    // Simple similarity: if query is close to title (within 2 char difference in length and shares prefix)
    if (Math.abs(titleLower.length - queryLower.length) <= 3) {
      const minLen = Math.min(titleLower.length, queryLower.length);
      let matches = 0;
      for (let i = 0; i < minLen; i++) {
        if (titleLower[i] === queryLower[i]) matches++;
      }
      if (matches >= minLen * 0.7 && !suggestions.includes(item.title)) {
        suggestions.push(item.title);
      }
    }
  }

  return suggestions.slice(0, 3);
}

interface OptimizedSearchResultsProps {
  query?: string;
  searchRequest?: Partial<GlobalSearchRequest>;
  onUpgradeClick?: () => void;
  onResultClick?: (result: PaywalledSearchResult) => void;
  className?: string;
  showGlobalView?: boolean;
  compactMode?: boolean;
  enableInfiniteScroll?: boolean;
}

/**
 * Memoized result card for performance
 */
const MemoizedResultCard = memo(PaywalledSearchResultCard, (prev, next) => {
  return (
    prev.result.id === next.result.id &&
    prev.compactMode === next.compactMode &&
    prev.showGlobalView === next.showGlobalView &&
    prev.isInWatchlist === next.isInWatchlist &&
    prev.bookmarkLoading === next.bookmarkLoading
  );
});
MemoizedResultCard.displayName = 'MemoizedResultCard';

/**
 * Optimized SearchResults with React Query caching and memoization
 */
export const OptimizedSearchResults: React.FC<OptimizedSearchResultsProps> = memo(
  ({
    query,
    searchRequest = {},
    onUpgradeClick,
    onResultClick,
    className = '',
    showGlobalView = true,
    compactMode = false,
    enableInfiniteScroll = false,
  }) => {
    // VPN Modal state
    const [vpnModalOpen, setVpnModalOpen] = useState(false);
    const [selectedShowId, setSelectedShowId] = useState<string>('');
    const [selectedShowTitle, setSelectedShowTitle] = useState<string>('');

    // E2E Bug Fix: Search limit modal state for anonymous users
    const [searchLimitModalOpen, setSearchLimitModalOpen] = useState(false);
    const [searchLimitInfo, setSearchLimitInfo] = useState<SearchLimitError>({});

    // Watchlist integration
    const { items: watchlistItems, addItem, removeItem, isAddingItem, isRemovingItem } = useWatchlist();
    const [bookmarkingItemId, setBookmarkingItemId] = useState<string | null>(null);

    // Auth and toast for watchlist feedback
    const { isAuthenticated } = useAuth();
    const toast = useToastNotifications();

    // Check if a result is in watchlist (match by title + type)
    const isInWatchlist = useCallback(
      (result: PaywalledSearchResult): boolean => {
        if (!watchlistItems || watchlistItems.length === 0) return false;
        const typeMap: Record<ContentType, string> = {
          [ContentType.All]: 'all',
          [ContentType.Movie]: 'movie',
          [ContentType.Show]: 'tv_series',
          [ContentType.Documentary]: 'documentary',
          [ContentType.Anime]: 'anime',
        };
        const mappedType = typeMap[result.type] || 'other';
        return watchlistItems.some(
          (item) => item.title.toLowerCase() === result.title.toLowerCase() && item.type === mappedType
        );
      },
      [watchlistItems]
    );

    // Handle bookmark click from search result card
    const handleBookmarkClick = useCallback(
      (result: PaywalledSearchResult, isAdding: boolean) => {
        // Check authentication before modifying watchlist
        if (!isAuthenticated) {
          toast.showWarning(
            'Sign in required',
            'Please sign in to add items to your watchlist'
          );
          setBookmarkingItemId(null);
          return;
        }

        setBookmarkingItemId(result.id);

        const typeMap: Record<ContentType, 'movie' | 'tv_series' | 'documentary' | 'anime' | 'other'> = {
          [ContentType.All]: 'other',
          [ContentType.Movie]: 'movie',
          [ContentType.Show]: 'tv_series',
          [ContentType.Documentary]: 'documentary',
          [ContentType.Anime]: 'anime',
        };

        if (isAdding) {
          addItem({
            title: result.title,
            type: typeMap[result.type] || 'other',
            year: result.year,
            genre: result.genres,
            rating: result.imdbRating,
            poster: result.posterUrl,
            description: result.description,
            priority: 'medium',
            watched: false,
            availability: [],
            addedDate: new Date(),
            lastChecked: new Date(),
          });
          logger.info('[OptimizedSearchResults] Added to watchlist', { resultId: result.id, title: result.title });
        } else {
          // Find the watchlist item to remove
          const mappedType = typeMap[result.type] || 'other';
          const watchlistItem = watchlistItems?.find(
            (item) => item.title.toLowerCase() === result.title.toLowerCase() && item.type === mappedType
          );
          if (watchlistItem) {
            removeItem(watchlistItem.id);
            logger.info('[OptimizedSearchResults] Removed from watchlist', { resultId: result.id, title: result.title });
          }
        }

        // Clear the loading state after a short delay
        setTimeout(() => setBookmarkingItemId(null), 500);
      },
      [addItem, removeItem, watchlistItems, isAuthenticated, toast]
    );

    // Build complete search request
    // BUG FIX: Ensure query prop takes precedence over searchRequest.query to prevent empty query on initial render
    const { query: _searchRequestQuery, ...searchRequestWithoutQuery } = searchRequest;
    const fullRequest: GlobalSearchRequest = {
      query: query || '',
      page: 1,
      pageSize: 10,
      ...searchRequestWithoutQuery,
    };

    // Use appropriate query based on scroll mode
    const standardQuery = useSearchQuery(fullRequest, {
      enabled: !enableInfiniteScroll && !!query?.trim(),
    });

    const infiniteQuery = useInfiniteSearchQuery(
      { ...fullRequest, page: undefined } as Omit<GlobalSearchRequest, 'page'> & { page?: undefined },
      {
        enabled: enableInfiniteScroll && !!query?.trim(),
      }
    );

    const { data: _data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = enableInfiniteScroll
      ? infiniteQuery
      : {
          data: standardQuery.data,
          isLoading: standardQuery.isLoading,
          error: standardQuery.error,
          fetchNextPage: () => {},
          hasNextPage: false,
          isFetchingNextPage: false,
        };

    const handleResultClick = useCallback(
      (result: PaywalledSearchResult) => {
        onResultClick?.(result);
      },
      [onResultClick]
    );

    const handleVpnClick = useCallback((showId: string, showTitle: string) => {
      setSelectedShowId(showId);
      setSelectedShowTitle(showTitle);
      setVpnModalOpen(true);
    }, []);

    const handleCloseVpnModal = useCallback(() => {
      setVpnModalOpen(false);
    }, []);

    const handleLoadMore = useCallback(() => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // E2E Bug Fix: Handle search limit modal close
    const handleCloseSearchLimitModal = useCallback(() => {
      setSearchLimitModalOpen(false);
    }, []);

    // UX Fix: Detect 403 error with blockReason and show appropriate modal IMMEDIATELY
    // This prevents showing a scary error screen before the paywall modal
    // Updated to support new 2-step conversion funnel format
    useEffect(() => {
      if (error) {
        try {
          const errorStr = error instanceof Error ? error.message : String(error);

          // Check if it's a 403 error with search limit block
          if (errorStr.includes('403') || errorStr.includes('blockReason') || errorStr.includes('requiresSignup')) {
            const jsonMatch = errorStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]) as SearchLimitError;

              // Handle new blockReason format
              if (parsed.blockReason) {
                setSearchLimitInfo({
                  ...parsed,
                  requiresSignup: parsed.blockReason === 'signup_required',
                });
                setSearchLimitModalOpen(true);
                return;
              }

              // Legacy support: Handle old requiresSignup format
              if (parsed.requiresSignup) {
                setSearchLimitInfo(parsed);
                setSearchLimitModalOpen(true);
                return;
              }
            }

            // Fallback: If it's a 403 but we couldn't parse, assume it's a signup required
            if (errorStr.includes('403') && errorStr.toLowerCase().includes('limit')) {
              setSearchLimitInfo({ requiresSignup: true, blockReason: 'signup_required', searchesUsed: 1, searchLimit: 1 });
              setSearchLimitModalOpen(true);
            }
          }
        } catch (_parseError) {
          console.warn('Could not parse search limit error:', _parseError);
        }
      }
    }, [error]);

    // Check if this is a search limit error - used to show paywall UI instead of error
    const isSearchLimitError = searchLimitModalOpen || (error &&
      (error instanceof Error ? error.message : String(error)).includes('requiresSignup'));

    // Early returns for empty states - UX Improvement: Enhanced empty state with trending & history
    if (!query || !query.trim()) {
      // Get trending picks (diverse selection)
      const trendingPicks = getSmartSuggestions('', 8);

      // Get search history from localStorage (client-side only)
      const getSearchHistory = (): string[] => {
        if (typeof window === 'undefined') return [];
        try {
          const history = localStorage.getItem('searchHistory');
          return history ? JSON.parse(history).slice(0, 5) : [];
        } catch {
          return [];
        }
      };

      const searchHistory = getSearchHistory();
      const genres = ['Action', 'Comedy', 'Drama', 'Thriller', 'Sci-Fi', 'Horror', 'Documentary', 'Animation'];

      return (
        <div className={`py-8 ${className}`}>
          <div className="text-center mb-10">
            <Search className="w-16 h-16 mx-auto mb-4 text-primary/30" strokeWidth={1} />
            <h3 className="text-xl font-semibold mb-2 text-foreground">Discover Streaming Content Worldwide</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Search across 42 streaming services in 57 countries. Find where to watch any movie or TV show.
            </p>
          </div>

          {/* Recent Searches (if available) */}
          {searchHistory.length > 0 && (
            <div className="mb-8">
              <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2 justify-center">
                <Search className="h-4 w-4 text-muted-foreground" />
                Recent Searches
              </h4>
              <div className="flex flex-wrap gap-2 justify-center">
                {searchHistory.map((term) => (
                  <a
                    key={term}
                    href={`/search?query=${encodeURIComponent(term)}`}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-full text-sm transition-colors"
                  >
                    {term}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Trending Now */}
          <div className="mb-8">
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2 justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
              Trending Now
            </h4>
            <div className="flex flex-wrap gap-2 justify-center max-w-3xl mx-auto">
              {trendingPicks.map((item) => (
                <a
                  key={item.title}
                  href={`/search?query=${encodeURIComponent(item.title)}`}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full text-sm transition-all hover:scale-105 inline-flex items-center gap-2"
                >
                  {item.type === 'Movie' ? (
                    <Film className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Tv className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span>{item.title}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Browse by Genre */}
          <div className="mb-8">
            <h4 className="text-sm font-medium text-foreground mb-3 text-center">Browse by Genre</h4>
            <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
              {genres.map((genre) => (
                <a
                  key={genre}
                  href={`/search?genres=${encodeURIComponent(genre)}`}
                  className="px-4 py-2 border border-border hover:border-primary hover:text-primary rounded-full text-sm transition-colors"
                >
                  {genre}
                </a>
              ))}
            </div>
          </div>

          {/* Quick suggestions */}
          <div className="text-center text-xs text-muted-foreground">
            <p>💡 Try searching for: movie titles, TV shows, actors, directors, or years</p>
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className={className}>
          <SearchResultsSkeleton count={6} showGlobalView={showGlobalView} compactMode={compactMode} />
        </div>
      );
    }

    if (error) {
      // UX Fix: Show hard paywall for search limit errors - modal opens immediately
      // Updated to support 2-step conversion funnel with different modals for signup vs upgrade
      if (isSearchLimitError) {
        const isSignupRequired = searchLimitInfo.blockReason === 'signup_required' || searchLimitInfo.requiresSignup;
        const isUpgradeRequired = searchLimitInfo.blockReason === 'upgrade_required';
        const blockData: SearchBlockedResponse = {
          blockReason: searchLimitInfo.blockReason || (isSignupRequired ? 'signup_required' : 'upgrade_required'),
          searchesUsed: searchLimitInfo.searchesUsed || 1,
          searchLimit: searchLimitInfo.searchLimit || 1,
          resetsAt: searchLimitInfo.resetsAt || null,
          upgradeUrl: searchLimitInfo.upgradeUrl || '/pricing',
          message: searchLimitInfo.message || '',
        };

        return (
          <>
            {/* Show appropriate modal based on block reason */}
            {isSignupRequired && (
              <SignupRequiredModal
                isOpen={searchLimitModalOpen}
                onClose={handleCloseSearchLimitModal}
                blockData={blockData}
              />
            )}
            {isUpgradeRequired && (
              <UpgradeRequiredModal
                isOpen={searchLimitModalOpen}
                onClose={handleCloseSearchLimitModal}
                blockData={blockData}
              />
            )}
            {/* Fallback to generic SearchLimitModal if block reason unknown */}
            {!isSignupRequired && !isUpgradeRequired && (
              <SearchLimitModal
                isOpen={searchLimitModalOpen}
                onClose={handleCloseSearchLimitModal}
                searchesUsed={searchLimitInfo.searchesUsed}
                searchLimit={searchLimitInfo.searchLimit}
              />
            )}
            {/* Background content shown when modal is dismissed */}
            <div className={`text-center py-12 ${className}`}>
              <div className="text-muted-foreground">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <h3 className="text-lg font-medium mb-2">
                  {isSignupRequired ? 'Create a Free Account' : 'Daily Search Limit Reached'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {isSignupRequired
                    ? 'Sign up for a free account to get 5 searches per day!'
                    : "You've used all your free searches today. Upgrade for unlimited access!"}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => setSearchLimitModalOpen(true)}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-medium transition-colors min-h-[44px]"
                  >
                    {isSignupRequired ? 'Sign Up Free' : 'Upgrade to Premium'}
                  </button>
                  {isSignupRequired && (
                    <a
                      href="/auth/login"
                      className="px-6 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full font-medium transition-colors min-h-[44px] inline-flex items-center justify-center"
                    >
                      Already have an account? Log in
                    </a>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      }

      // UX Improvement: Enhanced error messages with specific guidance
      const errorStr = error instanceof Error ? error.message : String(error);

      // Categorize error for better UX
      type ErrorType = 'rate_limit' | 'server' | 'traffic' | 'network' | 'timeout' | 'generic';
      let errorType: ErrorType = 'generic';
      let friendlyMessage = 'Something went wrong with your search.';
      let suggestion = 'Please try again.';
      let retryDelay = 0; // Suggested retry delay in seconds
      let iconColor = 'text-warning';

      if (errorStr.includes('429') || errorStr.toLowerCase().includes('rate limit') || errorStr.toLowerCase().includes('too fast')) {
        errorType = 'rate_limit';
        friendlyMessage = "You're searching too fast!";
        suggestion = 'Take a breath and try again in about 30 seconds.';
        retryDelay = 30;
        iconColor = 'text-warning';
      } else if (errorStr.includes('500') || errorStr.includes('server')) {
        errorType = 'server';
        friendlyMessage = 'Our servers are having a moment.';
        suggestion = 'This is on us, not you. Try again in about a minute.';
        retryDelay = 60;
        iconColor = 'text-destructive';
      } else if (errorStr.includes('503')) {
        errorType = 'traffic';
        friendlyMessage = "We're experiencing high traffic.";
        suggestion = 'Lots of people searching right now! Try again in about 30 seconds.';
        retryDelay = 30;
        iconColor = 'text-warning';
      } else if (errorStr.toLowerCase().includes('timeout') || errorStr.toLowerCase().includes('timed out')) {
        errorType = 'timeout';
        friendlyMessage = 'Search took too long.';
        suggestion = 'Try a simpler search or fewer filters.';
        retryDelay = 5;
        iconColor = 'text-warning';
      } else if (errorStr.toLowerCase().includes('network') || errorStr.toLowerCase().includes('fetch') || errorStr.toLowerCase().includes('failed')) {
        errorType = 'network';
        friendlyMessage = 'Connection issue detected.';
        suggestion = 'Check your internet connection and try again.';
        retryDelay = 5;
        iconColor = 'text-info';
      }

      return (
        <div className={`text-center py-12 ${className}`} role="alert">
          <div className="text-muted-foreground max-w-md mx-auto">
            {/* Error Icon */}
            <div className={`w-16 h-16 mx-auto mb-4 ${iconColor} rounded-full bg-current/10 flex items-center justify-center`}>
              <AlertCircle className={`w-10 h-10 ${iconColor}`} strokeWidth={1.5} />
            </div>

            {/* Error Message */}
            <h3 className="text-lg font-semibold mb-2 text-foreground">{friendlyMessage}</h3>
            <p className="text-sm text-muted-foreground mb-6">{suggestion}</p>

            {/* Retry Timer (for rate limit and traffic errors) */}
            {retryDelay > 0 && (errorType === 'rate_limit' || errorType === 'traffic' || errorType === 'server') && (
              <RetryCountdown
                initialSeconds={retryDelay}
                onComplete={() => window.location.reload()}
              />
            )}

            {/* Manual Retry Button */}
            {(errorType === 'network' || errorType === 'timeout' || errorType === 'generic') && (
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-medium transition-colors min-h-[44px] inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            )}

            {/* Additional Help for persistent issues */}
            {errorType === 'server' && (
              <p className="mt-6 text-xs text-muted-foreground">
                If this keeps happening,{' '}
                <a href="/support" className="text-primary hover:underline">contact support</a>.
              </p>
            )}
          </div>
        </div>
      );
    }

    // Get results based on query type
    const results = enableInfiniteScroll
      ? infiniteQuery.data?.pages.flatMap((page: PaywalledSearchResponse) => page.results) || []
      : standardQuery.data?.results || [];

    const currentResults = enableInfiniteScroll ? infiniteQuery.data?.pages[0] : standardQuery.data;

    const typedCurrentResults = currentResults as PaywalledSearchResponse | undefined;

    // Apply tier-based result limit for paywall enforcement (frontend safeguard)
    // This ensures free/anonymous users only see their allowed number of results
    const displayLimit = typedCurrentResults?.paywallInfo?.remainingResults;
    const limitedResults = displayLimit != null ? results.slice(0, displayLimit) : results;

    if (!currentResults || results.length === 0) {
      // UX Improvement: Query-aware smart suggestions
      const smartSuggestions = getSmartSuggestions(query || '');
      const typoSuggestions = getTypoSuggestions(query || '');
      const genres = ['Action', 'Comedy', 'Drama', 'Thriller', 'Sci-Fi', 'Documentary'];

      // Determine if suggestions are related to the query
      const hasRelevantSuggestions = smartSuggestions.some(s =>
        s.keywords.some(k => (query || '').toLowerCase().includes(k)) ||
        s.genre?.toLowerCase() === (query || '').toLowerCase()
      );

      return (
        <div className={`text-center py-12 ${className}`}>
          <div className="text-muted-foreground">
            <Search className="w-16 h-16 mx-auto mb-4 text-muted" strokeWidth={1} />
            <h3 className="text-lg font-medium mb-2 text-foreground">
              No results found for &quot;{query}&quot;
            </h3>

            {/* UX Improvement: "Did you mean?" for typos */}
            {typoSuggestions.length > 0 && (
              <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg inline-block">
                <p className="text-sm text-foreground flex items-center gap-2 justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Did you mean:</span>
                  {typoSuggestions.map((suggestion, idx) => (
                    <span key={suggestion}>
                      <a
                        href={`/search?query=${encodeURIComponent(suggestion)}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {suggestion}
                      </a>
                      {idx < typoSuggestions.length - 1 && ', '}
                    </span>
                  ))}
                  <span>?</span>
                </p>
              </div>
            )}

            <p className="text-sm mb-8">
              {hasRelevantSuggestions
                ? `We couldn't find "${query}", but here are some similar titles you might like:`
                : "We couldn't find any matches. Try one of these popular titles instead:"}
            </p>

            {/* UX Improvement: Query-aware suggestions with icons */}
            <div className="mb-8">
              <h4 className="text-sm font-medium text-foreground mb-3 flex items-center justify-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {hasRelevantSuggestions ? 'Similar Titles' : 'Trending Now'}
              </h4>
              <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                {smartSuggestions.map((item) => (
                  <a
                    key={item.title}
                    href={`/search?query=${encodeURIComponent(item.title)}`}
                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full text-sm transition-all hover:scale-105 inline-flex items-center gap-2"
                  >
                    {item.type === 'Movie' ? (
                      <Film className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Tv className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span>{item.title}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Browse by Genre */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">Browse by Genre</h4>
              <div className="flex flex-wrap gap-2 justify-center">
                {genres.map((genre) => (
                  <a
                    key={genre}
                    href={`/search?genres=${encodeURIComponent(genre)}`}
                    className="px-4 py-2 border border-border hover:border-primary hover:text-primary rounded-full text-sm transition-colors"
                  >
                    {genre}
                  </a>
                ))}
              </div>
            </div>

            {/* Search tips */}
            <div className="mt-8 text-xs text-muted-foreground">
              <p>💡 Tip: Try searching for actor names, directors, or specific years</p>
            </div>
          </div>
        </div>
      );
    }

    // UX Improvement: Calculate total results for display
    const totalResultsCount = enableInfiniteScroll
      ? infiniteQuery.data?.pages[0]?.totalResults || results.length
      : standardQuery.data?.totalResults || results.length;

    // Build active filters description for result count display
    const activeFilters: string[] = [];
    if (searchRequest?.contentType) {
      activeFilters.push(`Type: ${searchRequest.contentType}`);
    }
    if (searchRequest?.genres?.length) {
      activeFilters.push(`Genre: ${searchRequest.genres.join(', ')}`);
    }
    if (searchRequest?.countries?.length) {
      activeFilters.push(`${searchRequest.countries.length} ${searchRequest.countries.length === 1 ? 'country' : 'countries'}`);
    }
    if (searchRequest?.services?.length) {
      activeFilters.push(`${searchRequest.services.length} ${searchRequest.services.length === 1 ? 'service' : 'services'}`);
    }
    if (searchRequest?.yearFrom || searchRequest?.yearTo) {
      const yearRange = searchRequest.yearFrom && searchRequest.yearTo
        ? `${searchRequest.yearFrom}-${searchRequest.yearTo}`
        : searchRequest.yearFrom
          ? `from ${searchRequest.yearFrom}`
          : `until ${searchRequest.yearTo}`;
      activeFilters.push(yearRange);
    }

    return (
      <div className={className}>
        {/* UX Improvement: Result count with active filters */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{totalResultsCount.toLocaleString()}</span>
            {' '}{totalResultsCount === 1 ? 'result' : 'results'} for &quot;{query}&quot;
            {activeFilters.length > 0 && (
              <span className="text-xs ml-2">
                ({activeFilters.join(' • ')})
              </span>
            )}
          </p>
          {limitedResults.length < totalResultsCount && (
            <p className="text-xs text-muted-foreground">
              Showing {limitedResults.length} of {totalResultsCount.toLocaleString()}
            </p>
          )}
        </div>

        {/* Paywall Banner */}
        {typedCurrentResults?.paywallInfo?.isPaywallActive && (
          <PaywallBanner
            paywallInfo={typedCurrentResults.paywallInfo}
            onUpgradeClick={onUpgradeClick}
            position="search-results-top"
            className="mb-6"
          />
        )}

        {/* Results Grid */}
        <div className="space-y-3 sm:space-y-4">
          {limitedResults.map((result, index) => (
            <MemoizedResultCard
              key={`${result.id}-${index}`}
              result={result}
              onUpgradeClick={onUpgradeClick}
              onViewDetails={handleResultClick}
              onVpnClick={handleVpnClick}
              showGlobalView={showGlobalView}
              compactMode={compactMode}
              onBookmarkClick={handleBookmarkClick}
              isInWatchlist={isInWatchlist(result)}
              bookmarkLoading={bookmarkingItemId === result.id || isAddingItem || isRemovingItem}
            />
          ))}
        </div>

        {/* VPN Streaming Details Modal */}
        <StreamingDetailsModal
          showId={selectedShowId}
          showTitle={selectedShowTitle}
          isOpen={vpnModalOpen}
          onClose={handleCloseVpnModal}
        />

        {/* Loading More Indicator */}
        {isFetchingNextPage && (
          <div className="py-8">
            <SearchResultsSkeleton count={3} showGlobalView={showGlobalView} compactMode={compactMode} />
          </div>
        )}

        {/* Load More Button */}
        {enableInfiniteScroll && hasNextPage && !isFetchingNextPage && (
          <div className="text-center py-6">
            <button
              onClick={handleLoadMore}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-full font-medium transition-colors"
            >
              Load More Results
            </button>
          </div>
        )}

        {/* Toast Container for watchlist feedback */}
        <ToastContainer notifications={toast.notifications} position="top-right" />
      </div>
    );
  }
);

OptimizedSearchResults.displayName = 'OptimizedSearchResults';

export default OptimizedSearchResults;
