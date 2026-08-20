'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ContentType } from '@/lib/types';
import { ContentData, getRelatedContent, generateContentUrl } from '@/lib/api/content';
import { OptimizedImage } from '@/components/common/OptimizedImage';
import { ContentLoadingSkeleton } from './ContentLoadingSkeleton';
import { genreGuides } from '@/data/genres';

interface RelatedContentProps {
  contentId: string;
  contentType: ContentType;
  genres: string[];
  limit?: number;
  className?: string;
}

/**
 * Related content component with internal linking optimization
 * Uses semantic similarity and genre matching for recommendations
 */
export function RelatedContent({ contentId, contentType, genres, limit = 12, className = '' }: RelatedContentProps) {
  const [relatedItems, setRelatedItems] = useState<ContentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert ContentType to API string
  const contentTypeString = useMemo(() => {
    switch (contentType) {
      case 'movie':
        return 'movie';
      case 'tv':
        return 'tv-show';
      case 'documentary':
        return 'documentary';
      default:
        return 'movie';
    }
  }, [contentType]);

  useEffect(() => {
    async function fetchRelated() {
      try {
        setLoading(true);
        const items = await getRelatedContent(
          contentId,
          contentTypeString as 'movie' | 'tv-show' | 'documentary',
          genres,
          limit
        );
        setRelatedItems(items);
      } catch (err) {
        console.error('Error fetching related content:', err);
        setError('Failed to load related content');
      } finally {
        setLoading(false);
      }
    }

    fetchRelated();
  }, [contentId, contentTypeString, genres, limit]);

  if (loading) {
    return <ContentLoadingSkeleton type="grid" className={className} />;
  }

  if (error || relatedItems.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-foreground-muted">{error || 'No related content found.'}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {relatedItems.map(item => (
          <RelatedContentCard
            key={item.id}
            content={item}
            contentType={contentTypeString as 'movie' | 'tv-show' | 'documentary'}
          />
        ))}
      </div>

      {/* Internal linking for SEO */}
      <div className="mt-8 text-center">
        <p className="text-sm text-foreground-muted mb-4">
          Looking for more {contentTypeString === 'tv-show' ? 'TV shows' : `${contentTypeString}s`}?
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {genres.slice(0, 3).flatMap(genre => {
            const matched = genreGuides.find(
              g => g.name.toLowerCase() === genre.toLowerCase() || g.slug === genre.toLowerCase().replace(/\s+/g, '-')
            );
            if (!matched) return [];
            return [
              <Link
                key={genre}
                href={`/genres/${matched.slug}`}
                className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                More {genre}
              </Link>,
            ];
          })}
          <Link
            href="/search"
            className="bg-surface text-foreground px-3 py-1 rounded-full text-sm font-medium hover:bg-surface/80 transition-colors"
          >
            All{' '}
            {contentTypeString === 'tv-show'
              ? 'TV Shows'
              : `${contentTypeString.charAt(0).toUpperCase() + contentTypeString.slice(1)}s`}
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual related content card
 */
function RelatedContentCard({
  content,
  contentType,
}: {
  content: ContentData;
  contentType: 'movie' | 'tv-show' | 'documentary';
}) {
  const contentUrl = generateContentUrl(content, contentType);

  return (
    <Link
      href={contentUrl}
      className="group block space-y-2 transition-transform hover:scale-105 focus:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
      aria-label={`View details for ${content.title}`}
    >
      {/* Poster Image */}
      <div className="aspect-[2/3] relative rounded-lg overflow-hidden bg-surface shadow-md group-hover:shadow-lg transition-shadow">
        {content.posterUrl ? (
          <OptimizedImage
            src={content.posterUrl}
            alt={`${content.title} poster`}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
            quality={75}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground-muted bg-surface">
            <span className="text-4xl">{contentType === 'movie' ? '🎬' : contentType === 'tv-show' ? '📺' : '🎭'}</span>
          </div>
        )}

        {/* Overlay with rating */}
        {content.rating && (
          <div className="absolute top-2 left-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-semibold">
            ⭐ {content.rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="space-y-1">
        <h3 className="font-medium text-foreground text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">
          {content.title}
        </h3>

        <div className="flex items-center justify-between text-xs text-foreground-muted">
          <span>{content.releaseYear || 'TBD'}</span>
          {content.genres && content.genres[0] && <span className="truncate ml-2">{content.genres[0]}</span>}
        </div>

        {/* Streaming availability indicator */}
        {content.streamingOptions && content.streamingOptions.length > 0 && (
          <div className="flex items-center text-xs text-success">
            <span className="w-2 h-2 bg-success rounded-full mr-1" />
            Available on {content.streamingOptions.length} platform{content.streamingOptions.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </Link>
  );
}

/**
 * Hook for preloading related content on hover
 */
export function usePreloadRelatedContent(contentId: string, contentType: ContentType, genres: string[]) {
  useEffect(() => {
    const preloadTimer = setTimeout(() => {
      // Preload related content after 2 seconds
      const contentTypeString = contentType === 'tv' ? 'tv-show' : (contentType as 'movie' | 'documentary');
      getRelatedContent(
        contentId,
        contentTypeString,
        genres,
        6 // Preload fewer items
      ).catch(() => {
        // Silently fail - this is just preloading
      });
    }, 2000);

    return () => clearTimeout(preloadTimer);
  }, [contentId, contentType, genres]);
}
