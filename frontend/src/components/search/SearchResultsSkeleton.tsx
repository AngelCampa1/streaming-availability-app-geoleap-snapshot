'use client';

import React from 'react';

interface SearchResultsSkeletonProps {
  count?: number;
  showGlobalView?: boolean;
  compactMode?: boolean;
  className?: string;
}

const SearchResultSkeleton: React.FC<{ showGlobalView?: boolean; compactMode?: boolean }> = ({
  showGlobalView = true,
  compactMode = false,
}) => {
  return (
    <div
      className={`bg-card rounded-lg shadow-md overflow-hidden animate-pulse ${compactMode ? 'border' : 'shadow-md'}`}
    >
      <div className={compactMode ? 'flex p-3' : 'flex p-4'}>
        {/* Poster Skeleton */}
        <div className={`flex-shrink-0 bg-muted rounded-md ${compactMode ? 'w-12 h-18' : 'w-16 h-24'}`} />

        {/* Content Skeleton */}
        <div className="flex-1 ml-4 min-w-0">
          {/* Header */}
          <div className="mb-2">
            <div className={`bg-muted rounded ${compactMode ? 'h-5 w-3/4 mb-2' : 'h-6 w-3/4 mb-3'}`} />

            {/* Metadata Row */}
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-muted rounded-full h-5 w-16" />
              <div className="bg-muted rounded h-4 w-12" />
              <div className="bg-muted rounded h-4 w-16" />
              <div className="bg-muted rounded h-4 w-12 ml-auto" />
            </div>
          </div>

          {/* Description - only in non-compact mode */}
          {!compactMode && (
            <div className="mb-3">
              <div className="bg-muted rounded h-4 w-full mb-2" />
              <div className="bg-muted rounded h-4 w-2/3" />
            </div>
          )}

          {/* Cast and Crew - only in non-compact mode */}
          {!compactMode && (
            <div className="mb-3">
              <div className="bg-muted rounded h-4 w-1/3 mb-1" />
              <div className="bg-muted rounded h-4 w-1/2" />
            </div>
          )}

          {/* Genres */}
          <div className="mb-3">
            <div className="flex gap-2">
              <div className="bg-muted rounded-full h-6 w-16" />
              <div className="bg-muted rounded-full h-6 w-20" />
              <div className="bg-muted rounded-full h-6 w-14" />
            </div>
          </div>

          {/* Global Availability Skeleton */}
          {showGlobalView ? (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="bg-muted rounded h-4 w-32" />
                <div className="bg-muted rounded-full h-5 w-20" />
              </div>

              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between bg-card rounded-md p-2">
                    <div className="flex items-center space-x-2 flex-1">
                      <div className="bg-muted rounded w-5 h-5" />
                      <div className="bg-muted rounded h-4 w-24" />
                      <div className="bg-muted rounded h-3 w-16" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="bg-muted rounded h-4 w-12" />
                      <div className="bg-muted rounded h-3 w-16" />
                      <div className="bg-muted rounded h-3 w-3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-muted rounded-full mr-2" />
                <div className="bg-muted rounded h-4 w-32" />
                <div className="bg-muted rounded h-4 w-16 ml-2" />
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-muted rounded-full mr-2" />
                <div className="bg-muted rounded h-4 w-28" />
              </div>
              <div className="bg-muted rounded h-3 w-24" />
            </div>
          )}
        </div>
      </div>

      {/* Global availability indicator skeleton */}
      {showGlobalView && <div className="absolute top-2 left-2 bg-muted rounded-full w-8 h-6" />}
    </div>
  );
};

const SearchResultsSkeleton: React.FC<SearchResultsSkeletonProps> = ({
  count = 5,
  showGlobalView = true,
  compactMode = false,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Stats Skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="bg-muted rounded h-4 w-64 animate-pulse" />
        <div className="bg-muted rounded-full h-6 w-24 animate-pulse" />
      </div>

      {/* Results Skeletons */}
      {Array.from({ length: count }).map((_, index) => (
        <SearchResultSkeleton key={index} showGlobalView={showGlobalView} compactMode={compactMode} />
      ))}

      {/* Pagination Skeleton */}
      <div className="flex justify-center items-center space-x-2 mt-8">
        <div className="bg-muted rounded-md h-8 w-20 animate-pulse" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="bg-muted rounded-md h-8 w-8 animate-pulse" />
        ))}
        <div className="bg-muted rounded-md h-8 w-16 animate-pulse" />
      </div>
    </div>
  );
};

export default SearchResultsSkeleton;
