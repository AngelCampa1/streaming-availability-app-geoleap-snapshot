'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating?: number;
  maxRating?: number;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onRatingChange?: (rating: number) => void;
  showValue?: boolean;
  className?: string;
}

/**
 * 5-Star Rating Component for Content Recommendation System
 * Features:
 * - Interactive rating selection
 * - Readonly display mode
 * - Mobile-responsive touch targets
 * - Hover and focus states
 * - Keyboard navigation support
 * - Customizable size and styling
 */
export function StarRating({
  rating = 0,
  maxRating = 5,
  readonly = false,
  size = 'md',
  onRatingChange,
  showValue = false,
  className,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const getStar = (index: number) => {
    const starValue = index + 1;
    const currentRating = hoverRating ?? rating;
    const isFilled = starValue <= currentRating;
    const isPartial = !isFilled && starValue - 0.5 <= currentRating;

    return (
      <button
        key={index}
        type="button"
        disabled={readonly}
        className={cn(
          'relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm',
          'transition-colors duration-150 ease-in-out',
          !readonly && 'hover:scale-110 transform',
          readonly ? 'cursor-default' : 'cursor-pointer',
          // Touch target optimization for mobile
          'p-1 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center',
          'sm:p-0 sm:m-0 sm:min-w-0 sm:min-h-0'
        )}
        onClick={() => !readonly && onRatingChange?.(starValue)}
        onMouseEnter={() => !readonly && setHoverRating(starValue)}
        onMouseLeave={() => !readonly && setHoverRating(null)}
        onFocus={() => !readonly && setHoverRating(starValue)}
        onBlur={() => !readonly && setHoverRating(null)}
        aria-label={`Rate ${starValue} star${starValue !== 1 ? 's' : ''}`}
      >
        <div className="relative">
          {/* Background star */}
          <Star className={cn(sizeClasses[size], 'text-muted')} fill="currentColor" />

          {/* Filled star overlay */}
          {(isFilled || isPartial) && (
            <Star
              className={cn(
                sizeClasses[size],
                'absolute inset-0 text-warning',
                // Gradient effect for partial stars
                isPartial &&
                  'bg-gradient-to-r from-warning via-warning to-transparent bg-clip-text text-transparent'
              )}
              fill="currentColor"
              style={
                isPartial
                  ? {
                      background: 'linear-gradient(90deg, hsl(var(--warning)) 50%, transparent 50%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }
                  : undefined
              }
            />
          )}
        </div>
      </button>
    );
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center" role="radiogroup" aria-label={`Rating: ${rating} out of ${maxRating} stars`}>
        {Array.from({ length: maxRating }, (_, index) => getStar(index))}
      </div>

      {showValue && (
        <span className="ml-2 text-sm text-muted-foreground">
          {rating.toFixed(1)}/{maxRating}
        </span>
      )}
    </div>
  );
}

// Simplified readonly version for display-only use cases
export function StarRatingDisplay({
  rating,
  maxRating = 5,
  size = 'sm',
  showValue = true,
  className,
}: Pick<StarRatingProps, 'rating' | 'maxRating' | 'size' | 'showValue' | 'className'>) {
  return (
    <StarRating
      rating={rating}
      maxRating={maxRating}
      size={size}
      readonly
      showValue={showValue}
      className={className}
    />
  );
}
