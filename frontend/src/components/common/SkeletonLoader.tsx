'use client';

import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className = '',
  width = '100%',
  height = '1rem',
  rounded = false,
  animate = true,
}) => {
  return (
    <div
      className={`
        bg-gradient-to-r from-muted via-muted/70 to-muted
        ${animate ? 'animate-pulse' : ''}
        ${rounded ? 'rounded-full' : 'rounded'}
        ${className}
      `}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      aria-label="Loading..."
    />
  );
};

interface SearchResultSkeletonProps {
  count?: number;
  showImages?: boolean;
}

export const SearchResultSkeleton: React.FC<SearchResultSkeletonProps> = ({ count = 3, showImages = true }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="bg-card rounded-lg shadow-sm border border-border p-4 animate-pulse">
          <div className="flex space-x-4">
            {showImages && <SkeletonLoader width={120} height={180} className="flex-shrink-0" />}
            <div className="flex-1 space-y-3">
              <SkeletonLoader width="75%" height={24} />
              <SkeletonLoader width="50%" height={16} />
              <SkeletonLoader width="100%" height={16} />
              <SkeletonLoader width="60%" height={16} />

              <div className="flex space-x-2 mt-4">
                <SkeletonLoader width={80} height={28} rounded />
                <SkeletonLoader width={100} height={28} rounded />
                <SkeletonLoader width={60} height={28} rounded />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface ImageSkeletonProps {
  aspectRatio?: 'square' | 'poster' | 'landscape';
  width?: number;
  height?: number;
  className?: string;
}

export const ImageSkeleton: React.FC<ImageSkeletonProps> = ({
  aspectRatio = 'poster',
  width,
  height,
  className = '',
}) => {
  let dimensions = { width: 200, height: 300 };

  if (width && height) {
    dimensions = { width, height };
  } else {
    switch (aspectRatio) {
      case 'square':
        dimensions = { width: 200, height: 200 };
        break;
      case 'poster':
        dimensions = { width: 200, height: 300 };
        break;
      case 'landscape':
        dimensions = { width: 300, height: 169 };
        break;
    }
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-muted ${className}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
      }}
    >
      {/* Animated shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-background/20 to-transparent" />
      </div>

      {/* Placeholder icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    </div>
  );
};

interface CardSkeletonProps {
  showImage?: boolean;
  imageAspectRatio?: 'square' | 'poster' | 'landscape';
  lines?: number;
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  showImage = true,
  imageAspectRatio = 'poster',
  lines = 3,
  className = '',
}) => {
  return (
    <div className={`bg-card rounded-lg shadow-sm border border-border overflow-hidden animate-pulse ${className}`}>
      {showImage && <ImageSkeleton aspectRatio={imageAspectRatio} className="w-full" />}
      <div className="p-4 space-y-3">
        {Array.from({ length: lines }, (_, index) => (
          <SkeletonLoader key={index} height={16} width={index === 0 ? '100%' : index === lines - 1 ? '60%' : '80%'} />
        ))}
        <div className="flex space-x-2 mt-4">
          <SkeletonLoader width={60} height={24} rounded />
          <SkeletonLoader width={80} height={24} rounded />
        </div>
      </div>
    </div>
  );
};

interface FilterSkeletonProps {
  count?: number;
}

export const FilterSkeleton: React.FC<FilterSkeletonProps> = ({ count = 5 }) => {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-3">
          <SkeletonLoader width="40%" height={20} />
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, optionIndex) => (
              <div key={optionIndex} className="flex items-center space-x-2">
                <SkeletonLoader width={16} height={16} />
                <SkeletonLoader width="60%" height={16} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

interface ListSkeletonProps {
  itemCount?: number;
  showImages?: boolean;
  horizontal?: boolean;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({ itemCount = 6, showImages = true, horizontal = false }) => {
  if (horizontal) {
    return (
      <div className="flex space-x-4 overflow-hidden">
        {Array.from({ length: itemCount }, (_, index) => (
          <div key={index} className="flex-shrink-0 w-48 animate-pulse">
            {showImages && <ImageSkeleton aspectRatio="poster" width={192} className="mb-3" />}
            <SkeletonLoader width="100%" height={16} className="mb-2" />
            <SkeletonLoader width="70%" height={14} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: itemCount }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
};

export default SkeletonLoader;
