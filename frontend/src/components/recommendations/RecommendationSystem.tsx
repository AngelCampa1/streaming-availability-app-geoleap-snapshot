'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FiveStarRating } from '../rating/FiveStarRating';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Recommendation {
  id: string;
  contentId: string;
  contentType: 'movie' | 'show' | 'documentary';
  title: string;
  description: string;
  poster: string;
  rating: number;
  genres: string[];
  reasonCodes: string[];
  personalizedScore: number;
  timestamp: string;
}

interface RecommendationSystemProps {
  onRateContent?: (contentId: string, rating: number) => void;
  initialSettings?: {
    enableTrending: boolean;
    enableSimilar: boolean;
    enableGenreBased: boolean;
  };
  className?: string;
}

interface RecommendationSettings {
  enableTrending: boolean;
  enableSimilar: boolean;
  enableGenreBased: boolean;
}

/**
 * Complete Recommendation System for US-8.4
 * Features:
 * - Multiple recommendation categories (trending, similar, genre-based)
 * - 5-star rating system integration
 * - User settings for category preferences
 * - Mobile-responsive design
 * - Loading states and error handling
 * - Performance optimized with caching
 */
export function RecommendationSystem({
  onRateContent,
  initialSettings = {
    enableTrending: true,
    enableSimilar: true,
    enableGenreBased: true,
  },
  className,
}: RecommendationSystemProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<RecommendationSettings>(initialSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [showRatingInterface, setShowRatingInterface] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [dismissedItems, setDismissedItems] = useState<Set<string>>(new Set());

  // Cache for recommendation data
  const [cache, setCache] = useState<Map<string, { data: Recommendation[]; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const fetchRecommendations = useCallback(
    async (forceRefresh = false) => {
      const cacheKey = JSON.stringify(settings);
      const cachedData = cache.get(cacheKey);
      const now = Date.now();

      // Use cache if available and not expired
      if (!forceRefresh && cachedData && now - cachedData.timestamp < CACHE_DURATION) {
        setRecommendations(cachedData.data);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // SECURITY: Use credentials: 'include' for cookie-based auth instead of localStorage tokens
        const response = await fetch('/api/recommendations/trending', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Service temporarily unavailable. Please try again later.');
          }
          throw new Error('Failed to load recommendations');
        }

        const data = await response.json();
        const newRecommendations = data.recommendations || [];

        // Update cache
        setCache(prev => new Map(prev).set(cacheKey, { data: newRecommendations, timestamp: now }));
        setRecommendations(newRecommendations);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load recommendations';
        setError(errorMessage);
        if (process.env.NODE_ENV !== 'test') {
          console.error('Failed to fetch recommendations:', err);
        }
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, cache]
  );

  // Load recommendations on mount
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleRateContent = (contentId: string) => {
    setSelectedContentId(contentId);
    setShowRatingInterface(true);
  };

  const handleRatingSubmit = (rating: number) => {
    if (selectedContentId) {
      onRateContent?.(selectedContentId, rating);
      setShowRatingInterface(false);
      setSelectedContentId(null);

      // Trigger recommendation refresh after rating
      setTimeout(() => {
        fetchRecommendations(true);
      }, 500);
    }
  };

  const handleDismissRecommendation = async (recommendationId: string) => {
    try {
      // SECURITY: Use credentials: 'include' for cookie-based auth instead of localStorage tokens
      await fetch(`/api/recommendations/${recommendationId}/dismiss`, {
        method: 'POST',
        credentials: 'include',
      });

      setDismissedItems(prev => new Set(prev).add(recommendationId));
    } catch (err) {
      console.error('Failed to dismiss recommendation:', err);
    }
  };

  const handleSettingsChange = (key: keyof RecommendationSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleRetry = () => {
    fetchRecommendations(true);
  };

  const filteredRecommendations = recommendations.filter(rec => !dismissedItems.has(rec.id));

  // Check mobile viewport
  const _isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  if (loading) {
    return (
      <div data-testid="recommendations-container" className={cn('mobile-responsive', className)}>
        <Card>
          <CardContent className="p-8">
            <div data-testid="recommendations-loading" className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading recommendations...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="recommendations-container" className={cn('mobile-responsive', className)}>
        <Card>
          <CardContent className="p-8">
            <div data-testid="recommendations-error" className="text-center">
              <div className="text-error mb-4">
                <p className="font-semibold">Failed to load recommendations</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <Button onClick={handleRetry} data-testid="retry-recommendations" variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div data-testid="recommendations-container" className={cn('mobile-responsive space-y-6', className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">Content Recommendations</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              data-testid="recommendation-settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Settings Panel */}
          {showSettings && (
            <div data-testid="settings-panel" className="mb-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-3">Recommendation Categories</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    data-testid="toggle-trending"
                    checked={settings.enableTrending}
                    onChange={e => handleSettingsChange('enableTrending', e.target.checked)}
                  />
                  <span>Trending Content</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    data-testid="toggle-similar"
                    checked={settings.enableSimilar}
                    onChange={e => handleSettingsChange('enableSimilar', e.target.checked)}
                  />
                  <span>Similar to Your Watchlist</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    data-testid="toggle-genre-based"
                    checked={settings.enableGenreBased}
                    onChange={e => handleSettingsChange('enableGenreBased', e.target.checked)}
                  />
                  <span>Genre-Based Recommendations</span>
                </label>
              </div>
            </div>
          )}

          {/* Rating Interface Modal */}
          {showRatingInterface && selectedContentId && (
            <div data-testid="rating-interface" className="mb-6 p-4 bg-primary/10 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Rate This Content</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowRatingInterface(false);
                    setSelectedContentId(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <FiveStarRating contentId={selectedContentId} onRatingSubmit={handleRatingSubmit} />
            </div>
          )}

          {/* Recommendation Sections */}
          <div role="region" aria-label="Content Recommendations" className="space-y-8">
            {settings.enableTrending && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Trending Now</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredRecommendations.slice(0, 6).map((rec, index) => (
                    <RecommendationCard
                      key={`trending-${rec.id}-${index}`}
                      recommendation={rec}
                      onRate={() => handleRateContent(rec.contentId)}
                      onDismiss={() => handleDismissRecommendation(rec.id)}
                      sectionType="trending"
                      index={index}
                    />
                  ))}
                </div>
              </section>
            )}

            {settings.enableSimilar && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Similar to Your Watchlist</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredRecommendations.slice(0, 6).map((rec, index) => (
                    <RecommendationCard
                      key={`similar-${rec.id}-${index}`}
                      recommendation={rec}
                      onRate={() => handleRateContent(rec.contentId)}
                      onDismiss={() => handleDismissRecommendation(rec.id)}
                      sectionType="similar"
                      index={index}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {filteredRecommendations.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No recommendations available at the moment.</p>
              <Button onClick={handleRetry} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Individual Recommendation Card Component
function RecommendationCard({
  recommendation,
  onRate,
  onDismiss,
  sectionType = 'default',
  index = 0,
}: {
  recommendation: Recommendation;
  onRate: () => void;
  onDismiss: () => void;
  sectionType?: string;
  index?: number;
}) {
  const uniqueCardId = `${sectionType}-recommendation-card-${recommendation.id}-${index}`;
  const uniqueRateId = `rate-content-${recommendation.contentId}-${sectionType}-${index}`;
  const uniqueDismissId = `dismiss-recommendation-${recommendation.id}-${sectionType}-${index}`;
  const uniqueStarRatingId = `star-rating-${recommendation.id}-${sectionType}-${index}`;
  return (
    <Card data-testid={uniqueCardId} className="transition-all hover:shadow-md" tabIndex={0}>
      <CardContent className="p-4">
        <div className="aspect-[2/3] bg-muted rounded-md mb-3">
          {recommendation.poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recommendation.poster}
              alt={recommendation.title}
              className="w-full h-full object-cover rounded-md"
            />
          )}
        </div>

        <h3 className="font-semibold text-sm mb-1 line-clamp-2">{recommendation.title}</h3>

        <div className="flex items-center gap-1 mb-2 flex-wrap">
          {recommendation.genres.slice(0, 2).map(genre => (
            <Badge key={genre} variant="secondary" className="text-xs">
              {genre}
            </Badge>
          ))}
        </div>

        <div data-testid={uniqueStarRatingId} className="text-warning text-sm mb-3">
          {'★'.repeat(Math.floor(recommendation.rating / 2))}
          {'☆'.repeat(5 - Math.floor(recommendation.rating / 2))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onRate}
            data-testid={uniqueRateId}
            aria-label="Rate this content"
            className="flex-1 text-xs"
          >
            Rate
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            data-testid={uniqueDismissId}
            aria-label="Dismiss recommendation"
            className="text-xs"
          >
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default RecommendationSystem;
