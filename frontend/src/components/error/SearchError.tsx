'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SearchErrorProps {
  type: 'no-results' | 'search-failed' | 'invalid-query' | 'service-unavailable' | 'rate-limited';
  query?: string;
  originalQuery?: string;
  suggestions?: string[];
  onRetrySearch?: (query: string) => void;
  onClearFilters?: () => void;
  onNewSearch?: () => void;
  onContactSupport?: () => void;
  className?: string;
  showAlternatives?: boolean;
}

const errorConfigs = {
  'no-results': {
    title: 'No results found',
    icon: (
      <svg className="w-12 h-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
    severity: 'info' as const,
    defaultMessage: "We couldn't find any content matching your search.",
    tips: [
      'Try different or more general search terms',
      'Check your spelling',
      'Remove filters to broaden your search',
      'Try searching for a specific movie or show title',
    ],
    actions: ['retry', 'clear-filters', 'new-search'],
  },
  'search-failed': {
    title: 'Search temporarily unavailable',
    icon: (
      <svg className="w-12 h-12 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    severity: 'warning' as const,
    defaultMessage: 'Our search service is experiencing issues right now.',
    tips: [
      'Try again in a few moments',
      'Check your internet connection',
      'Clear your browser cache if the problem persists',
    ],
    actions: ['retry', 'support'],
  },
  'invalid-query': {
    title: 'Invalid search query',
    icon: (
      <svg className="w-12 h-12 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    severity: 'error' as const,
    defaultMessage: 'Your search query contains invalid characters or is too short.',
    tips: [
      'Use at least 2 characters for your search',
      'Avoid special characters like @#$%',
      'Try using common words and phrases',
    ],
    actions: ['new-search'],
  },
  'service-unavailable': {
    title: 'Service temporarily unavailable',
    icon: (
      <svg className="w-12 h-12 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        />
      </svg>
    ),
    severity: 'error' as const,
    defaultMessage: 'Our search service is currently under maintenance.',
    tips: [
      "We're working to restore service as quickly as possible",
      'Try again in a few minutes',
      'Check our status page for updates',
    ],
    actions: ['retry', 'support'],
  },
  'rate-limited': {
    title: 'Too many search requests',
    icon: (
      <svg className="w-12 h-12 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    severity: 'warning' as const,
    defaultMessage: "You've reached the search limit for your account.",
    tips: [
      'Wait a moment before searching again',
      'Consider upgrading to Premium for unlimited searches',
      'Use more specific search terms to find what you need faster',
    ],
    actions: ['retry', 'upgrade'],
  },
};

const popularSuggestions = [
  'The Office',
  'Stranger Things',
  'Game of Thrones',
  'Breaking Bad',
  'Friends',
  'The Crown',
  'Ozark',
  'The Mandalorian',
  'House of Cards',
  'Black Mirror',
];

const searchTips = [
  'Use quotes for exact phrases: "The Office"',
  'Try searching by genre: "comedy series"',
  'Include the year: "Batman 2022"',
  'Search by actor: "Ryan Reynolds movies"',
  'Use "AND" or "OR": "comedy AND 2020"',
];

export function SearchError({
  type,
  query = '',
  originalQuery,
  suggestions = [],
  onRetrySearch,
  onClearFilters,
  onNewSearch,
  onContactSupport,
  className,
  showAlternatives = true,
}: SearchErrorProps) {
  const [showTips, setShowTips] = useState(false);
  const config = errorConfigs[type];

  const handleSuggestionClick = (suggestion: string) => {
    if (onRetrySearch) {
      onRetrySearch(suggestion);
    }
  };

  const handleRetry = () => {
    if (onRetrySearch && (query || originalQuery)) {
      onRetrySearch(query || originalQuery || '');
    }
  };

  const getSeverityStyles = () => {
    switch (config.severity) {
      case 'info':
        return 'bg-info/10 border-info/20 text-info';
      case 'warning':
        return 'bg-warning/10 border-warning/20 text-warning';
      case 'error':
        return 'bg-error/10 border-error/20 text-error';
      default:
        return 'bg-muted border-border text-foreground';
    }
  };

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      {/* Main error display */}
      <div className="text-center py-12 px-6">
        <div className="mb-6">{config.icon}</div>

        <h2 className="text-2xl font-bold text-foreground mb-2">{config.title}</h2>

        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {query ? (
            <>
              {config.defaultMessage} Try searching for something else or adjusting your filters.
              {query && (
                <span className="block mt-2 font-mono text-sm bg-muted px-2 py-1 rounded">
                  &quot;{query}&quot;
                </span>
              )}
            </>
          ) : (
            config.defaultMessage
          )}
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {config.actions.includes('retry') && (onRetrySearch || query) && (
            <Button onClick={handleRetry} variant="default" disabled={!query && !originalQuery}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Again
            </Button>
          )}

          {config.actions.includes('clear-filters') && onClearFilters && (
            <Button onClick={onClearFilters} variant="outline">
              Clear Filters
            </Button>
          )}

          {config.actions.includes('new-search') && onNewSearch && (
            <Button onClick={onNewSearch} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              New Search
            </Button>
          )}

          {config.actions.includes('upgrade') && (
            <Button onClick={() => window.open('/pricing', '_blank')} variant="default">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Upgrade to Premium
            </Button>
          )}

          {config.actions.includes('support') && onContactSupport && (
            <Button onClick={onContactSupport} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Get Help
            </Button>
          )}
        </div>

        {/* Tips section */}
        <div className={cn('border rounded-lg p-4 text-left', getSeverityStyles())}>
          <button
            onClick={() => setShowTips(!showTips)}
            className="flex items-center justify-between w-full text-sm font-medium focus:outline-none"
          >
            <span>Search Tips</span>
            <svg
              className={cn('w-4 h-4 transition-transform', showTips && 'rotate-180')}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showTips && (
            <div className="mt-3 text-sm">
              <ul className="space-y-1">
                {config.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="opacity-60 mt-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Suggestions section */}
      {showAlternatives && type === 'no-results' && (
        <div className="border-t pt-8">
          {/* Custom suggestions from API */}
          {suggestions.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">Did you mean?</h3>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 6).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1 bg-info/10 text-info rounded-full text-sm hover:bg-info/20 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular searches */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Popular Searches</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {popularSuggestions.slice(0, 9).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="p-2 text-left bg-muted hover:bg-muted/80 rounded-full text-sm transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced search tips */}
          <div className="bg-muted rounded-lg p-4">
            <h3 className="text-lg font-semibold text-foreground mb-3">Advanced Search Tips</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              {searchTips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="opacity-60 mt-1">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact search error for inline display
export function SearchErrorInline({
  type,
  query: _query,
  onRetry,
  className,
}: {
  type: SearchErrorProps['type'];
  query?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const config = errorConfigs[type];

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border',
        'bg-muted border-border text-foreground',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{React.cloneElement(config.icon, { className: 'w-5 h-5' })}</div>
        <div>
          <p className="font-medium text-sm">{config.title}</p>
          <p className="text-xs opacity-80">{config.defaultMessage}</p>
        </div>
      </div>

      {onRetry && config.actions.includes('retry') && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

// Hook for search error handling
export function useSearchError() {
  const [error, setError] = useState<{
    type: SearchErrorProps['type'];
    message?: string;
    query?: string;
    suggestions?: string[];
  } | null>(null);

  const handleSearchError = (
    type: SearchErrorProps['type'],
    query?: string,
    message?: string,
    suggestions?: string[]
  ) => {
    setError({ type, query, message, suggestions });
  };

  const clearError = () => {
    setError(null);
  };

  const retryLastSearch = () => {
    return error?.query || '';
  };

  return {
    error,
    handleSearchError,
    clearError,
    retryLastSearch,
  };
}
