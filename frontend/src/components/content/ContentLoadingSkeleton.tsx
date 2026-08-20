'use client';

import React from 'react';

interface ContentLoadingSkeletonProps {
  type: 'streaming' | 'grid' | 'hero' | 'details';
  className?: string;
}

/**
 * Loading skeletons for different content sections
 * Improves perceived performance and provides visual feedback
 */
export function ContentLoadingSkeleton({ type, className = '' }: ContentLoadingSkeletonProps) {
  const baseClasses = 'animate-pulse';

  switch (type) {
    case 'streaming':
      return (
        <div className={`${baseClasses} ${className}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <StreamingOptionSkeleton key={i} />
            ))}
          </div>
        </div>
      );

    case 'grid':
      return (
        <div className={`${baseClasses} ${className}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <ContentCardSkeleton key={i} />
            ))}
          </div>
        </div>
      );

    case 'hero':
      return (
        <div className={`${baseClasses} ${className}`}>
          <HeroSkeleton />
        </div>
      );

    case 'details':
      return (
        <div className={`${baseClasses} ${className}`}>
          <DetailsSkeleton />
        </div>
      );

    default:
      return (
        <div className={`${baseClasses} ${className}`}>
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      );
  }
}

/**
 * Streaming option card skeleton
 */
function StreamingOptionSkeleton() {
  return (
    <div className="bg-background rounded-lg p-6 shadow-sm border border-border">
      {/* Service logo */}
      <div className="h-12 w-32 bg-muted rounded mb-4" />

      {/* Service name */}
      <div className="h-6 bg-muted rounded mb-3" />

      {/* Type and price */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-4 w-16 bg-muted rounded" />
      </div>

      {/* Button */}
      <div className="h-10 bg-muted rounded" />

      {/* Quality badges */}
      <div className="flex gap-2 mt-3">
        <div className="h-6 w-8 bg-muted rounded" />
        <div className="h-6 w-12 bg-muted rounded" />
      </div>
    </div>
  );
}

/**
 * Content card skeleton for grids
 */
function ContentCardSkeleton() {
  return (
    <div className="space-y-3">
      {/* Poster */}
      <div className="aspect-[2/3] bg-muted rounded-lg" />

      {/* Title */}
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>

      {/* Rating */}
      <div className="flex items-center space-x-2">
        <div className="h-3 w-8 bg-muted rounded" />
        <div className="h-3 w-12 bg-muted rounded" />
      </div>
    </div>
  );
}

/**
 * Hero section skeleton
 */
function HeroSkeleton() {
  return (
    <div className="relative h-[60vh] bg-muted rounded-lg overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-t from-muted-darker to-muted" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 p-8 space-y-4">
        {/* Title */}
        <div className="h-8 w-96 bg-muted-darker rounded" />

        {/* Subtitle */}
        <div className="h-4 w-64 bg-muted-darker rounded" />

        {/* Metadata */}
        <div className="flex space-x-4">
          <div className="h-6 w-16 bg-muted-darker rounded" />
          <div className="h-6 w-20 bg-muted-darker rounded" />
          <div className="h-6 w-12 bg-muted-darker rounded" />
        </div>

        {/* Description */}
        <div className="space-y-2 max-w-2xl">
          <div className="h-4 bg-muted-darker rounded" />
          <div className="h-4 bg-muted-darker rounded w-4/5" />
          <div className="h-4 bg-muted-darker rounded w-3/5" />
        </div>
      </div>
    </div>
  );
}

/**
 * Details section skeleton
 */
function DetailsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Cast section */}
      <div className="space-y-4">
        <div className="h-6 w-24 bg-muted rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] bg-muted rounded-lg" />
              <div className="h-3 bg-muted rounded" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>

      {/* Additional info */}
      <div className="grid md:grid-cols-2 gap-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="space-y-4">
            <div className="h-5 w-32 bg-muted rounded" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-4/5" />
              <div className="h-4 bg-muted rounded w-3/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Shimmer effect for enhanced loading experience
 */
export function ShimmerSkeleton({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={`relative overflow-hidden bg-muted ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      {children}
    </div>
  );
}
