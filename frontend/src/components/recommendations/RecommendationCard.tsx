'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StarRatingDisplay } from './StarRating';
import { Plus, X, Eye, Info, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecommendationCardProps {
  id: string;
  title: string;
  type: string;
  overview?: string;
  rating?: number;
  releaseYear?: number;
  genres: string[];
  posterUrl?: string;
  backdropUrl?: string;
  recommendationScore: number;
  recommendationType: string;
  recommendationReason: string;
  onAddToWatchlist?: () => void;
  onDismiss?: () => void;
  onViewDetails?: () => void;
  onRate?: () => void;
  isInWatchlist?: boolean;
  isDismissible?: boolean;
  className?: string;
}

/**
 * Recommendation Card Component for Content Recommendation System
 * Features:
 * - Mobile-responsive design with optimal touch targets
 * - Lazy loading images with fallbacks
 * - Dismissal functionality
 * - Watchlist integration
 * - Rating display and interaction
 * - Accessibility-compliant
 * - Animation and hover effects
 */
export function RecommendationCard({
  id: _id,
  title,
  type,
  overview,
  rating,
  releaseYear,
  genres,
  posterUrl,
  backdropUrl: _backdropUrl,
  recommendationScore: _recommendationScore,
  recommendationType,
  recommendationReason,
  onAddToWatchlist,
  onDismiss,
  onViewDetails,
  onRate,
  isInWatchlist = false,
  isDismissible = true,
  className,
}: RecommendationCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const getTypeColor = (contentType: string) => {
    switch (contentType.toLowerCase()) {
      case 'movie':
        return 'bg-primary/10 text-primary';
      case 'tv':
        return 'bg-success/10 text-success';
      case 'documentary':
        return 'bg-accent/10 text-accent';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRecommendationTypeLabel = (recType: string) => {
    switch (recType) {
      case 'trending':
        return '🔥 Trending';
      case 'popular':
        return '⭐ Popular';
      case 'similar':
        return '🎯 Similar';
      case 'personalized':
        return '💡 For You';
      case 'collaborative':
        return '👥 Loved by Similar Users';
      case 'content_based':
        return '🎬 Based on Your Preferences';
      default:
        return '💫 Recommended';
    }
  };

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300 ease-in-out',
        'hover:shadow-2xl focus-within:shadow-2xl',
        'bg-background/95 backdrop-blur-sm border border-border/50',
        'w-full max-w-sm mx-auto cursor-pointer',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Dismiss Button */}
      {isDismissible && onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'absolute top-2 right-2 z-10 w-8 h-8 p-0 rounded-full',
            'bg-black/20 hover:bg-black/40 text-white',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            'focus:opacity-100'
          )}
          onClick={e => {
            e.stopPropagation();
            onDismiss();
          }}
          aria-label={`Dismiss ${title} recommendation`}
        >
          <X className="w-4 h-4" />
        </Button>
      )}

      {/* Content Image */}
      <div className="relative aspect-[2/3] bg-muted overflow-hidden">
        {posterUrl && !imageError ? (
          <Image
            src={posterUrl}
            alt={`${title} poster`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            onError={handleImageError}
            loading="lazy"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Eye className="w-12 h-12" />
          </div>
        )}

        {/* Overlay with quick actions */}
        <div
          className={cn(
            'absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-200',
            'flex items-center justify-center gap-2',
            isHovered && 'opacity-100'
          )}
        >
          <Button
            size="sm"
            variant="secondary"
            onClick={onViewDetails}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
          >
            <Info className="w-4 h-4 mr-1" />
            Details
          </Button>

          {!isInWatchlist && onAddToWatchlist && (
            <Button
              size="sm"
              onClick={e => {
                e.stopPropagation();
                onAddToWatchlist();
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          )}
        </div>

        {/* Recommendation Type Badge */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs bg-black/60 text-white border-0">
            {getRecommendationTypeLabel(recommendationType)}
          </Badge>
        </div>

        {/* Rating */}
        {rating && (
          <div className="absolute bottom-2 left-2">
            <div className="bg-black/60 rounded px-2 py-1">
              <StarRatingDisplay rating={rating} size="sm" showValue={false} className="text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Content Details */}
      <CardContent className="p-4 space-y-3">
        {/* Title and Year */}
        <div className="space-y-1">
          <h3
            className="font-semibold text-lg leading-tight line-clamp-2 cursor-pointer hover:text-primary"
            onClick={onViewDetails}
            title={title}
          >
            {title}
          </h3>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className={cn('text-xs', getTypeColor(type))}>
              {type.toUpperCase()}
            </Badge>
            {releaseYear && <span>{releaseYear}</span>}
          </div>
        </div>

        {/* Genres */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {genres.slice(0, 3).map(genre => (
              <Badge
                key={genre}
                variant="outline"
                className="text-xs bg-muted text-muted-foreground"
              >
                {genre}
              </Badge>
            ))}
            {genres.length > 3 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{genres.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Overview */}
        {overview && (
          <p className="text-sm text-muted-foreground line-clamp-2" title={overview}>
            {overview}
          </p>
        )}

        {/* Recommendation Reason */}
        <div className="text-xs text-primary bg-primary/10 rounded p-2">
          💡 {recommendationReason}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            {rating && (
              <div className="flex items-center gap-1">
                <StarRatingDisplay rating={rating} size="sm" showValue />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onRate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation();
                  onRate();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Rate
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onViewDetails}
              className="text-primary hover:text-primary/80"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
