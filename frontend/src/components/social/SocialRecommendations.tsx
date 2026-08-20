'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Star,
  TrendingUp,
  Share2,
  Play,
  BookmarkPlus,
  Filter,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { useSocialAuth } from './SocialAuthProvider';

interface SocialRecommendation {
  id: string;
  contentId: string;
  contentType: 'movie' | 'show' | 'episode' | 'person';
  title: string;
  description?: string;
  poster?: string;
  backdrop?: string;
  releaseDate?: string;
  runtime?: number;
  rating?: number;
  genres: string[];

  // Social data
  recommendedBy: {
    id: string;
    name: string;
    avatar?: string;
    provider: string;
    relationship: 'friend' | 'following' | 'mutual' | 'similar_taste';
  }[];

  socialStats: {
    friendsWatched: number;
    friendsRated: number;
    averageFriendRating: number;
    friendsReviews: number;
    totalShares: number;
    trendingScore: number;
  };

  personalizedScore: number;
  reasonCodes: string[];
  timestamp: string;
}

interface RecommendationFilters {
  contentTypes: string[];
  genres: string[];
  minRating: number;
  minFriendsWatched: number;
  timeRange: 'day' | 'week' | 'month' | 'all';
  sortBy: 'score' | 'friends_watched' | 'rating' | 'trending' | 'recent';
}

interface SocialRecommendationsProps {
  maxItems?: number;
  showInSearch?: boolean;
  compactMode?: boolean;
  onItemSelect?: (recommendation: SocialRecommendation) => void;
  className?: string;
}

export function SocialRecommendations({
  maxItems = 20,
  showInSearch = false,
  compactMode = false,
  onItemSelect,
  className = '',
}: SocialRecommendationsProps) {
  const { user, connections: _connections } = useSocialAuth();
  const [recommendations, setRecommendations] = useState<SocialRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RecommendationFilters>({
    contentTypes: [],
    genres: [],
    minRating: 0,
    minFriendsWatched: 0,
    timeRange: 'week',
    sortBy: 'score',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Load recommendations
  useEffect(() => {
    if (user?.privacySettings.allowFriendDiscovery) {
      loadRecommendations();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filters]);

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: maxItems.toString(),
        sortBy: filters.sortBy,
        timeRange: filters.timeRange,
        minRating: filters.minRating.toString(),
        minFriendsWatched: filters.minFriendsWatched.toString(),
        ...(filters.contentTypes.length > 0 && { contentTypes: filters.contentTypes.join(',') }),
        ...(filters.genres.length > 0 && { genres: filters.genres.join(',') }),
      });

      const response = await fetch(`/api/social-recommendations?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations);
    } catch (error) {
      console.error('Failed to load social recommendations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const trackRecommendationInteraction = useCallback(
    async (recommendationId: string, action: 'view' | 'click' | 'save' | 'share' | 'dismiss') => {
      try {
        await fetch('/api/social-recommendations/track', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recommendationId,
            action,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (error) {
        console.error('Failed to track recommendation interaction:', error);
      }
    },
    []
  );

  const handleItemClick = (recommendation: SocialRecommendation) => {
    trackRecommendationInteraction(recommendation.id, 'click');
    onItemSelect?.(recommendation);
  };

  const handleSaveItem = async (recommendation: SocialRecommendation) => {
    await trackRecommendationInteraction(recommendation.id, 'save');
    // Add to watchlist logic here
  };

  const getReasonText = (codes: string[]) => {
    const reasons: Record<string, string> = {
      similar_taste: 'Similar taste',
      friend_loved: 'Friend loved this',
      trending_friends: 'Trending with friends',
      genre_match: 'Matches your preferences',
      high_rated: 'Highly rated',
      recent_release: 'Recently released',
      mutual_friends: 'Mutual friends watched',
      platform_popular: 'Popular on your platforms',
    };

    return codes.map(code => reasons[code] || code).join(' • ');
  };

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship) {
      case 'friend':
        return '👥';
      case 'following':
        return '👁️';
      case 'mutual':
        return '🤝';
      case 'similar_taste':
        return '⭐';
      default:
        return '👤';
    }
  };

  const renderCompactRecommendation = (recommendation: SocialRecommendation) => (
    <div
      key={recommendation.id}
      onClick={() => handleItemClick(recommendation)}
      className="flex items-center space-x-3 p-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={recommendation.poster || '/placeholder-movie.png'}
        alt={recommendation.title}
        className="w-12 h-18 object-cover rounded"
      />

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-foreground truncate">{recommendation.title}</h4>

        <div className="flex items-center space-x-2 mt-1">
          <div className="flex -space-x-1">
            {recommendation.recommendedBy.slice(0, 3).map(user => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={user.id}
                src={user.avatar || '/default-avatar.png'}
                alt={user.name}
                className="w-5 h-5 rounded-full border-2 border-background"
                title={user.name}
              />
            ))}
          </div>

          <span className="text-xs text-foreground">{recommendation.socialStats.friendsWatched} friends watched</span>

          {recommendation.rating && (
            <div className="flex items-center space-x-1">
              <Star size={12} className="text-warning fill-current" />
              <span className="text-xs text-foreground">{recommendation.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      <ChevronRight size={16} className="text-muted-foreground" />
    </div>
  );

  const renderFullRecommendation = (recommendation: SocialRecommendation) => (
    <div
      key={recommendation.id}
      className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Header Image */}
      <div className="relative h-48 bg-muted">
        {recommendation.backdrop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={recommendation.backdrop} alt={recommendation.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Play size={48} />
          </div>
        )}

        <div className="absolute top-2 right-2">
          <div className="bg-black/70 text-white px-2 py-1 rounded text-sm flex items-center space-x-1">
            <Star size={12} className="text-warning fill-current" />
            <span>{recommendation.personalizedScore.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Title and Basic Info */}
        <div className="mb-3">
          <h3 className="font-semibold text-foreground mb-1">{recommendation.title}</h3>
          <div className="flex items-center space-x-2 text-sm text-foreground">
            <span className="capitalize">{recommendation.contentType}</span>
            {recommendation.releaseDate && (
              <>
                <span>•</span>
                <span>{new Date(recommendation.releaseDate).getFullYear()}</span>
              </>
            )}
            {recommendation.runtime && (
              <>
                <span>•</span>
                <span>{recommendation.runtime}min</span>
              </>
            )}
          </div>

          {recommendation.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {recommendation.genres.slice(0, 3).map(genre => (
                <span key={genre} className="px-2 py-1 text-xs bg-muted text-foreground rounded">
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Recommended By */}
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-2">
            <Users size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Recommended by</span>
          </div>

          <div className="flex -space-x-2 mb-2">
            {recommendation.recommendedBy.slice(0, 5).map(user => (
              <div key={user.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.avatar || '/default-avatar.png'}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border-2 border-background"
                  title={`${user.name} (${user.relationship})`}
                />
                <span className="absolute -bottom-1 -right-1 text-xs">{getRelationshipIcon(user.relationship)}</span>
              </div>
            ))}

            {recommendation.recommendedBy.length > 5 && (
              <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                <span className="text-xs text-foreground">+{recommendation.recommendedBy.length - 5}</span>
              </div>
            )}
          </div>
        </div>

        {/* Social Stats */}
        <div className="grid grid-cols-3 gap-4 py-3 border-t border-b border-border mb-3">
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">{recommendation.socialStats.friendsWatched}</div>
            <div className="text-xs text-foreground">Friends watched</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold text-foreground flex items-center justify-center space-x-1">
              <Star size={16} className="text-warning fill-current" />
              <span>{recommendation.socialStats.averageFriendRating.toFixed(1)}</span>
            </div>
            <div className="text-xs text-foreground">Avg rating</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">{recommendation.socialStats.totalShares}</div>
            <div className="text-xs text-foreground">Shares</div>
          </div>
        </div>

        {/* Reason */}
        <div className="mb-4">
          <p className="text-sm text-foreground">{getReasonText(recommendation.reasonCodes)}</p>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={e => {
              e.stopPropagation();
              handleItemClick(recommendation);
            }}
            className="flex-1 bg-primary/10 border-primary/20 text-primary px-4 py-2 rounded-md hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            <Play size={16} className="inline mr-2" />
            Watch Now
          </button>

          <button
            onClick={e => {
              e.stopPropagation();
              handleSaveItem(recommendation);
            }}
            className="px-3 py-2 border border-border rounded-md hover:bg-accent transition-colors"
          >
            <BookmarkPlus size={16} />
          </button>

          <button
            onClick={e => {
              e.stopPropagation();
              trackRecommendationInteraction(recommendation.id, 'share');
            }}
            className="px-3 py-2 border border-border rounded-md hover:bg-accent transition-colors"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  if (!user?.privacySettings.allowFriendDiscovery && !showInSearch) {
    return null;
  }

  return (
    <div className={className}>
      {!showInSearch && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp size={20} className="text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Friend Recommendations</h2>
            <span className="px-2 py-1 text-xs bg-primary/10 border-primary/20 text-primary rounded-full">
              {recommendations.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent"
            >
              <Filter size={16} />
            </button>

            <button
              onClick={loadRecommendations}
              disabled={isLoading}
              className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && !showInSearch && (
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    sortBy: e.target.value as 'score' | 'friends_watched' | 'rating' | 'trending' | 'recent',
                  }))
                }
                className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground"
              >
                <option value="score">Personalized Score</option>
                <option value="friends_watched">Friends Watched</option>
                <option value="rating">Highest Rated</option>
                <option value="trending">Trending</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Content Type</label>
              <select
                multiple
                value={filters.contentTypes}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    contentTypes: Array.from(e.target.selectedOptions, option => option.value),
                  }))
                }
                className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground"
              >
                <option value="movie">Movies</option>
                <option value="show">TV Shows</option>
                <option value="episode">Episodes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Min Friends Watched: {filters.minFriendsWatched}
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={filters.minFriendsWatched}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    minFriendsWatched: parseInt(e.target.value),
                  }))
                }
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <RefreshCw size={32} className="animate-spin text-primary mx-auto mb-2" />
          <p className="text-foreground">Loading recommendations...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-error/10 border border-error/20 text-error rounded-lg p-4">
          <p>{error}</p>
        </div>
      )}

      {/* Recommendations */}
      {!isLoading && !error && (
        <div className={compactMode || showInSearch ? 'space-y-0' : 'grid gap-4 md:grid-cols-2 xl:grid-cols-3'}>
          {recommendations.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-muted rounded-lg">
              <TrendingUp size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Recommendations Yet</h3>
              <p className="text-foreground">
                Connect with friends and rate content to get personalized recommendations!
              </p>
            </div>
          ) : (
            recommendations.map(rec =>
              compactMode || showInSearch ? renderCompactRecommendation(rec) : renderFullRecommendation(rec)
            )
          )}
        </div>
      )}
    </div>
  );
}

export default SocialRecommendations;
