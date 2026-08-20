'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecommendationCard } from './RecommendationCard';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { ErrorMessage } from '@/components/error/ErrorMessage';
import {
  TrendingUp,
  Star,
  Zap,
  Users,
  RefreshCw,
  Settings,
  Grid3X3,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface Recommendation {
  contentId: string;
  contentType: string;
  title: string;
  overview?: string;
  rating?: number;
  releaseYear?: number;
  genres: string[];
  posterUrl?: string;
  backdropUrl?: string;
  recommendationScore: number;
  recommendationType: string;
  recommendationReason: string;
  generatedAt: string;
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  recommendationType: string;
  responseTime: string;
}

interface RecommendationsSectionProps {
  userId?: string;
  className?: string;
  showSettings?: boolean;
  maxItems?: number;
  enableInfiniteScroll?: boolean;
}

/**
 * Recommendations Section Component for Homepage
 * Features:
 * - Multiple recommendation types (trending, personalized, popular, similar)
 * - Tabbed interface for different recommendation categories
 * - Horizontal scrolling for mobile optimization
 * - Loading states and error handling
 * - Integration with watchlist and rating systems
 * - Responsive grid/list view toggle
 * - Real-time updates and refresh functionality
 */
export function RecommendationsSection({
  userId,
  className,
  showSettings = true,
  maxItems = 20,
  enableInfiniteScroll: _enableInfiniteScroll = false,
}: RecommendationsSectionProps) {
  const [activeTab, setActiveTab] = useState('personalized');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [recommendations, setRecommendations] = useState<Record<string, RecommendationsResponse>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const [dismissedItems, setDismissedItems] = useState<Set<string>>(new Set());

  const tabs = [
    {
      id: 'personalized',
      label: 'For You',
      icon: Zap,
      description: 'Personalized recommendations based on your preferences',
      color: 'text-primary',
    },
    {
      id: 'trending',
      label: 'Trending',
      icon: TrendingUp,
      description: "What's hot right now",
      color: 'text-error',
    },
    {
      id: 'popular',
      label: 'Popular',
      icon: Star,
      description: 'Most loved by our community',
      color: 'text-warning',
    },
    {
      id: 'mixed',
      label: 'Mixed',
      icon: Users,
      description: 'A variety of recommendations',
      color: 'text-accent',
    },
  ];

  // Mock API calls - replace with actual API integration
  const fetchRecommendations = async (type: string, page = 1): Promise<RecommendationsResponse> => {
    setLoading(prev => ({ ...prev, [type]: true }));
    setError(prev => ({ ...prev, [type]: '' }));

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data - replace with actual API call
      const mockRecommendations: Recommendation[] = Array.from({ length: maxItems }, (_, i) => ({
        contentId: `${type}-${i + 1}`,
        contentType: ['movie', 'tv', 'documentary'][Math.floor(Math.random() * 3)],
        title: `Sample ${type} Content ${i + 1}`,
        overview: `This is a sample ${type} recommendation with an engaging storyline that showcases the best of entertainment.`,
        rating: Math.random() * 5,
        releaseYear: 2020 + Math.floor(Math.random() * 4),
        genres: ['Action', 'Drama', 'Comedy', 'Thriller'].slice(0, Math.floor(Math.random() * 3) + 1),
        posterUrl: `https://picsum.photos/300/450?random=${i}`,
        recommendationScore: Math.random() * 100,
        recommendationType: type,
        recommendationReason: `Recommended because you enjoyed similar ${type} content`,
        generatedAt: new Date().toISOString(),
      }));

      return {
        recommendations: mockRecommendations,
        totalCount: mockRecommendations.length,
        page,
        pageSize: maxItems,
        hasNextPage: false,
        recommendationType: type,
        responseTime: '150ms',
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch recommendations';
      setError(prev => ({ ...prev, [type]: errorMessage }));
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleTabChange = async (tabId: string) => {
    setActiveTab(tabId);
    if (!recommendations[tabId] && !loading[tabId]) {
      try {
        const response = await fetchRecommendations(tabId);
        setRecommendations(prev => ({ ...prev, [tabId]: response }));
      } catch (err) {
        logger.error(`[RecommendationsSection] Failed to fetch recommendations`, { tabId, error: err });
      }
    }
  };

  const handleRefresh = async (type?: string) => {
    const targetType = type || activeTab;
    try {
      const response = await fetchRecommendations(targetType);
      setRecommendations(prev => ({ ...prev, [targetType]: response }));
    } catch (err) {
      logger.error(`[RecommendationsSection] Failed to refresh recommendations`, { targetType, error: err });
    }
  };

  const handleDismiss = (contentId: string) => {
    setDismissedItems(prev => new Set(prev).add(contentId));
    // TODO: Call API to dismiss recommendation
  };

  const handleAddToWatchlist = (contentId: string) => {
    // TODO: Integrate with watchlist API
    logger.info('[RecommendationsSection] Adding to watchlist', { contentId });
  };

  const handleViewDetails = (contentId: string) => {
    // TODO: Navigate to content details page
    logger.info('[RecommendationsSection] Viewing details', { contentId });
  };

  const handleRate = (contentId: string) => {
    // TODO: Open rating modal
    logger.info('[RecommendationsSection] Rating content', { contentId });
  };

  // Load initial recommendations
  useEffect(() => {
    if (userId) {
      handleTabChange('personalized');
    } else {
      handleTabChange('trending');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const currentRecommendations =
    recommendations[activeTab]?.recommendations.filter(rec => !dismissedItems.has(rec.contentId)) || [];

  const isLoading = loading[activeTab];
  const hasError = error[activeTab];

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4 p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold">Recommendations</CardTitle>
            {showSettings && (
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground min-h-[44px]">
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="w-8 h-8 p-0 min-h-[44px]"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="w-8 h-8 p-0 min-h-[44px]"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRefresh()}
              disabled={isLoading}
              className="flex items-center gap-2 flex-1 sm:flex-none min-h-[44px] text-xs sm:text-sm"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-3 sm:p-4 md:p-6">
        {/* Recommendation Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2 text-xs sm:text-sm min-h-[44px]">
                  <Icon className={cn('w-4 h-4', tab.color)} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="space-y-4">
              {/* Tab Description */}
              <div className="text-center text-muted-foreground text-xs sm:text-sm md:text-base">{tab.description}</div>

              {/* Loading State */}
              {isLoading && (
                <div
                  className={cn(
                    'grid gap-3 sm:gap-4 md:gap-6',
                    viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'
                  )}
                >
                  {Array.from({ length: 8 }, (_, i) => (
                    <SkeletonLoader key={i} className="h-60 sm:h-72 md:h-80 min-h-[44px]" />
                  ))}
                </div>
              )}

              {/* Error State */}
              {hasError && (
                <ErrorMessage
                  message={hasError}
                  severity="warning"
                  category="network"
                  isRetryable={true}
                  actions={[
                    {
                      label: 'Try Again',
                      onClick: () => handleRefresh(),
                      variant: 'primary',
                    },
                  ]}
                  className="my-8"
                />
              )}

              {/* Recommendations Grid */}
              {!isLoading && !hasError && currentRecommendations.length > 0 && (
                <div
                  className={cn(
                    'grid gap-3 sm:gap-4 md:gap-6',
                    viewMode === 'grid'
                      ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                      : 'grid-cols-1 md:grid-cols-2'
                  )}
                >
                  {currentRecommendations.map(recommendation => (
                    <RecommendationCard
                      key={recommendation.contentId}
                      id={recommendation.contentId}
                      title={recommendation.title}
                      type={recommendation.contentType}
                      overview={recommendation.overview}
                      rating={recommendation.rating}
                      releaseYear={recommendation.releaseYear}
                      genres={recommendation.genres}
                      posterUrl={recommendation.posterUrl}
                      backdropUrl={recommendation.backdropUrl}
                      recommendationScore={recommendation.recommendationScore}
                      recommendationType={recommendation.recommendationType}
                      recommendationReason={recommendation.recommendationReason}
                      onAddToWatchlist={() => handleAddToWatchlist(recommendation.contentId)}
                      onDismiss={() => handleDismiss(recommendation.contentId)}
                      onViewDetails={() => handleViewDetails(recommendation.contentId)}
                      onRate={() => handleRate(recommendation.contentId)}
                      className={viewMode === 'list' ? 'flex-row' : ''}
                    />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !hasError && currentRecommendations.length === 0 && (
                <div className="text-center py-8 sm:py-12 md:py-16 p-3 sm:p-4 md:p-6">
                  <div className="w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <Star className="w-6 sm:w-7 md:w-8 h-6 sm:h-7 md:h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-foreground mb-2">
                    No recommendations available
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-4">
                    We&apos;re working on finding great content for you. Try refreshing or check back later.
                  </p>
                  <Button onClick={() => handleRefresh()} variant="outline" className="min-h-[44px] text-xs sm:text-sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
