import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { generateContentMetadata } from '@/lib/seo/content-metadata';
import { generateContentSchema } from '@/lib/seo/schema-markup';
import { getContentBySlug } from '@/lib/api/content';
import { ContentBreadcrumbs } from '@/components/content/ContentBreadcrumbs';
import { RelatedContent } from '@/components/content/RelatedContent';
import { StreamingOptionsGrid } from '@/components/content/StreamingOptionsGrid';
import { ContentDetails } from '@/components/content/ContentDetails';
import { OptimizedImage } from '@/components/common/OptimizedImage';
import { ContentType, ContentRouteType } from '@/lib/types';

interface ContentPageProps {
  params: Promise<{
    type: ContentRouteType;
    slug: string;
  }>;
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params, searchParams: _searchParams }: ContentPageProps): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const content = await getContentBySlug(resolvedParams.type, resolvedParams.slug);

    if (!content) {
      return {
        title: 'Content Not Found | GeoLeap',
        description: 'The requested content could not be found.',
      };
    }

    return await generateContentMetadata(content, resolvedParams.type);
  } catch (_error) {
    return {
      title: 'Content | GeoLeap',
      description: 'Discover where to watch your favorite movies and TV shows.',
    };
  }
}

// Generate static parameters for popular content (optional)
export async function generateStaticParams() {
  // Only pre-generate most popular content
  // Other content will be generated on-demand
  return [];
}

// Main content page component with SSR
export default async function ContentPage({ params, searchParams: _searchParams }: ContentPageProps) {
  const resolvedParams = await params;
  let content;

  try {
    content = await getContentBySlug(resolvedParams.type, resolvedParams.slug);
  } catch (_error) {
    notFound();
  }

  if (!content) {
    notFound();
  }

  const schema = generateContentSchema(content, resolvedParams.type);
  const contentTypeEnum = getContentTypeEnum(resolvedParams.type);

  return (
    <>
      {/* JSON-LD Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema),
        }}
      />

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative">
          {/* Background Image */}
          <div className="absolute inset-0 h-[40vh] sm:h-[50vh] lg:h-[60vh]">
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
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative z-10 container mx-auto px-4 pt-8">
            <ContentBreadcrumbs type={resolvedParams.type} title={content.title} genre={content.primaryGenre} />

            <div className="flex flex-col lg:flex-row gap-8 mt-8">
              {/* Poster */}
              <div className="flex-shrink-0 mx-auto lg:mx-0">
                <div className="w-64 h-96 relative rounded-lg overflow-hidden shadow-2xl">
                  {content.posterUrl && (
                    <OptimizedImage
                      src={content.posterUrl}
                      alt={`${content.title} poster`}
                      fill
                      className="object-cover"
                      sizes="256px"
                      quality={90}
                    />
                  )}
                </div>
              </div>

              {/* Content Info */}
              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                  {content.title}
                  {content.releaseYear && (
                    <span className="text-2xl sm:text-3xl lg:text-4xl text-foreground-muted ml-2">
                      ({content.releaseYear})
                    </span>
                  )}
                </h1>

                {content.tagline && <p className="text-lg text-foreground-muted mb-6 italic">{content.tagline}</p>}

                <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-6">
                  {content.rating && (
                    <div className="flex items-center bg-surface px-3 py-2 rounded-lg">
                      <span className="text-warning mr-1">⭐</span>
                      <span className="font-semibold">{content.rating.toFixed(1)}</span>
                      {content.voteCount && (
                        <span className="text-sm text-foreground-muted ml-1">
                          ({content.voteCount.toLocaleString()})
                        </span>
                      )}
                    </div>
                  )}

                  {content.runtime && (
                    <div className="bg-surface px-3 py-2 rounded-lg">
                      <span className="font-semibold">{content.runtime} min</span>
                    </div>
                  )}

                  {content.contentRating && (
                    <div className="bg-surface px-3 py-2 rounded-lg">
                      <span className="font-semibold">{content.contentRating}</span>
                    </div>
                  )}
                </div>

                {content.genres && content.genres.length > 0 && (
                  <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-6">
                    {content.genres.map(genre => (
                      <span
                        key={genre}
                        className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {content.overview && (
                  <p className="text-foreground-muted leading-relaxed max-w-3xl">{content.overview}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Streaming Options */}
        <section className="py-12 bg-surface">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Where to Watch {content.title}</h2>
            <Suspense
              fallback={
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-background rounded-lg p-6 animate-pulse">
                      <div className="h-16 bg-muted rounded mb-4"></div>
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              }
            >
              <StreamingOptionsGrid contentId={content.id} contentType={contentTypeEnum} />
            </Suspense>
          </div>
        </section>

        {/* Content Details */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <ContentDetails content={content} type={contentTypeEnum} />
          </div>
        </section>

        {/* Related Content */}
        <section className="py-12 bg-surface">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground mb-8">
              Similar{' '}
              {resolvedParams.type === 'movie'
                ? 'Movies'
                : resolvedParams.type === 'documentary'
                  ? 'Documentaries'
                  : resolvedParams.type === 'anime'
                    ? 'Anime'
                    : 'Shows'}
            </h2>
            <Suspense
              fallback={
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[2/3] bg-muted rounded-lg mb-2"></div>
                      <div className="h-4 bg-muted rounded mb-1"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              }
            >
              <RelatedContent contentId={content.id} contentType={contentTypeEnum} genres={content.genres} limit={12} />
            </Suspense>
          </div>
        </section>
      </div>
    </>
  );
}

function getContentTypeEnum(type: string): ContentType {
  switch (type) {
    case 'movie':
      return 'movie';
    case 'tv-show':
      return 'tv';
    case 'documentary':
      return 'documentary';
    case 'anime':
      return 'anime';
    default:
      return 'movie';
  }
}
