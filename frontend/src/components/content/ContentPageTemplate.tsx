'use client';

import React, { Suspense } from'react';
import { ContentData } from'@/lib/api/content';
import { ContentType } from'@/lib/types';
import { OptimizedImage } from'@/components/common/OptimizedImage';
import { ContentBreadcrumbs } from'./ContentBreadcrumbs';
import { StreamingOptionsGrid } from'./StreamingOptionsGrid';
import { ContentDetails } from'./ContentDetails';
import { RelatedContent } from'./RelatedContent';
import { SocialShareSection } from'./SocialShareSection';
import { ContentLoadingSkeleton } from'./ContentLoadingSkeleton';
import { StructuredDataScript } from'../seo/StructuredDataScript';
import { generateContentSchema, generateContentFaqSchema, generateStreamingHowToSchema } from'@/lib/seo/schema-markup';

interface ContentPageTemplateProps {
  content: ContentData;
  type:'movie' |'tv-show' |'documentary';
  className?: string;
}

/**
 * Server-side rendered content page template with SEO optimization
 * Features:
 * - Mobile-first responsive design
 * - Progressive image loading
 * - Structured data (JSON-LD)
 * - Social sharing optimization
 * - Performance-optimized layout
 * - Accessibility compliance (WCAG)
 */
export default function ContentPageTemplate({ content, type, className ='' }: ContentPageTemplateProps) {
  const contentTypeEnum = getContentTypeEnum(type);

  // Generate structured data
  const mainSchema = generateContentSchema(content, type);
  const faqSchema = generateContentFaqSchema(content, type);
  const howToSchema = generateStreamingHowToSchema(content, type);

  const schemas = [mainSchema, faqSchema, howToSchema].filter(Boolean).flat();

  return (
    <>
      {/* Structured Data */}
      <StructuredDataScript schemas={schemas} />

      <article className={`min-h-screen bg-background ${className}`}>
        {/* Hero Section with Progressive Enhancement */}
        <HeroSection content={content} type={type} />

        {/* Streaming Options Section */}
        <StreamingSection content={content} type={contentTypeEnum} />

        {/* Content Details Section */}
        <DetailsSection content={content} type={contentTypeEnum} />

        {/* Social Sharing Section */}
        <SocialShareSection content={content} type={type} className="py-8 bg-surface/50" />

        {/* Related Content Section */}
        <RelatedSection content={content} type={contentTypeEnum} />
      </article>
    </>
  );
}

/**
 * Hero section with background image and content info
 */
function HeroSection({ content, type }: { content: ContentData; type:'movie' |'tv-show' |'documentary' }) {
  return (
    <section className="relative">
      {/* Background with Progressive Enhancement */}
      <div className="absolute inset-0 h-[40vh] sm:h-[50vh] lg:h-[60vh] overflow-hidden">
        {content.backdropUrl && (
          <OptimizedImage
            src={content.backdropUrl}
            alt={`${content.title} backdrop`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
            quality={85}
          />
        )}
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-8 pb-12">
        <ContentBreadcrumbs type={type} title={content.title} genre={content.primaryGenre} className="mb-8" />

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Poster with Loading State */}
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <div className="w-64 h-96 relative rounded-lg overflow-hidden shadow-2xl bg-surface/20">
              {content.posterUrl ? (
                <OptimizedImage
                  src={content.posterUrl}
                  alt={`${content.title} poster`}
                  fill
                  className="object-cover"
                  sizes="256px"
                  quality={90}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface text-foreground-muted">
                  <span className="text-4xl">🎬</span>
                </div>
              )}
            </div>
          </div>

          {/* Content Info */}
          <div className="flex-1 text-center lg:text-left">
            <header>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
                {content.title}
                {content.releaseYear && (
                  <span className="text-2xl sm:text-3xl lg:text-4xl text-foreground-muted ml-2 font-normal">
                    ({content.releaseYear})
                  </span>
                )}
              </h1>

              {content.tagline && (
                <p className="text-lg text-foreground-muted mb-6 italic font-light leading-relaxed">
                  {content.tagline}
                </p>
              )}
            </header>

            {/* Metadata Pills */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-6">
              <MetadataPills content={content} />
            </div>

            {/* Genres */}
            {content.genres && content.genres.length > 0 && (
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-6">
                {content.genres.map(genre => (
                  <span
                    key={genre}
                    className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            {content.overview && (
              <div className="prose prose-sm max-w-none lg:prose-base">
                <p className="text-foreground-muted leading-relaxed">{content.overview}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Metadata pills component
 */
function MetadataPills({ content }: { content: ContentData }) {
  return (
    <>
      {content.rating && (
        <div className="flex items-center bg-surface px-3 py-2 rounded-lg shadow-sm">
          <span className="text-warning mr-2" aria-label="Rating">
            ⭐
          </span>
          <span className="font-semibold">{content.rating.toFixed(1)}</span>
          {content.voteCount && (
            <span className="text-sm text-foreground-muted ml-1">({content.voteCount.toLocaleString()})</span>
          )}
        </div>
      )}

      {content.runtime && (
        <div className="bg-surface px-3 py-2 rounded-lg shadow-sm">
          <span className="font-semibold">{content.runtime} min</span>
        </div>
      )}

      {content.contentRating && (
        <div className="bg-surface px-3 py-2 rounded-lg shadow-sm">
          <span className="font-semibold">{content.contentRating}</span>
        </div>
      )}
    </>
  );
}

/**
 * Streaming options section
 */
function StreamingSection({ content, type }: { content: ContentData; type: ContentType }) {
  return (
    <section className="py-12 bg-surface" role="region" aria-labelledby="streaming-heading">
      <div className="container mx-auto px-4">
        <h2 id="streaming-heading" className="text-2xl font-bold text-foreground mb-8 text-center">
          Where to Watch {content.title}
        </h2>
        <Suspense fallback={<ContentLoadingSkeleton type="streaming" />}>
          <StreamingOptionsGrid contentId={content.id} contentType={type} />
        </Suspense>
      </div>
    </section>
  );
}

/**
 * Content details section
 */
function DetailsSection({ content, type }: { content: ContentData; type: ContentType }) {
  return (
    <section className="py-12" role="region" aria-labelledby="details-heading">
      <div className="container mx-auto px-4">
        <h2 id="details-heading" className="sr-only">
          {content.title} Details
        </h2>
        <ContentDetails content={content} type={type} />
      </div>
    </section>
  );
}

/**
 * Related content section
 */
function RelatedSection({ content, type }: { content: ContentData; type: ContentType }) {
  const sectionTitle =
    type ==='movie' ?'Similar Movies' : type ==='documentary' ?'Similar Documentaries' :'Similar Shows';

  return (
    <section className="py-12 bg-surface" role="region" aria-labelledby="related-heading">
      <div className="container mx-auto px-4">
        <h2 id="related-heading" className="text-2xl font-bold text-foreground mb-8">
          {sectionTitle}
        </h2>
        <Suspense fallback={<ContentLoadingSkeleton type="grid" />}>
          <RelatedContent contentId={content.id} contentType={type} genres={content.genres} limit={12} />
        </Suspense>
      </div>
    </section>
  );
}

/**
 * Convert string type to ContentType enum
 */
function getContentTypeEnum(type: string): ContentType {
  switch (type) {
    case'movie':
      return'movie' as ContentType;
    case'tv-show':
      return'tv' as ContentType;
    case'documentary':
      return'documentary' as ContentType;
    default:
      return'movie' as ContentType;
  }
}
