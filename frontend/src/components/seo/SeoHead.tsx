'use client';

import Head from 'next/head';
import { ContentData } from '@/lib/api/content';
import { generateCanonicalUrl, generateOgImageUrl } from '@/lib/seo/url-generation';

interface SeoHeadProps {
  content?: ContentData;
  type?: 'movie' | 'tv-show' | 'documentary';
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  additionalMeta?: Array<{
    name?: string;
    property?: string;
    content: string;
  }>;
}

/**
 * Dynamic SEO Head component for meta tags and structured data
 * Handles both content pages and generic pages
 */
export function SeoHead({
  content,
  type,
  title,
  description,
  keywords,
  image,
  url,
  additionalMeta = [],
}: SeoHeadProps) {
  // Generate dynamic metadata if content is provided
  const seoData =
    content && type
      ? {
          title: generatePageTitle(content, type),
          description: generateDescription(content, type),
          keywords: generateKeywords(content, type),
          image: content.posterUrl || content.backdropUrl || generateOgImageUrl(content.id, content.title, type),
          url: url || generateCanonicalUrl(type, `${content.id}-${content.title.toLowerCase().replace(/\s+/g, '-')}`),
        }
      : {
          title: title || 'GeoLeap - Find Where to Watch Movies and TV Shows',
          description:
            description || 'Discover where to watch your favorite movies and TV shows across streaming platforms.',
          keywords: keywords || 'streaming, movies, tv shows, watch online, netflix, hulu, amazon prime',
          image: image || '/images/og-default.jpg',
          url: url || '/',
        };

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{seoData.title}</title>
      <meta name="description" content={seoData.description} />
      <meta name="keywords" content={seoData.keywords} />
      <link rel="canonical" href={seoData.url} />

      {/* Viewport and Mobile Optimization */}
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />

      {/* Open Graph Meta Tags */}
      <meta
        property="og:type"
        content={content && type ? `video.${type === 'tv-show' ? 'tv_show' : 'movie'}` : 'website'}
      />
      <meta property="og:title" content={seoData.title} />
      <meta property="og:description" content={seoData.description} />
      <meta property="og:image" content={seoData.image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={seoData.url} />
      <meta property="og:site_name" content="GeoLeap" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta
        name="twitter:title"
        content={seoData.title.length > 70 ? seoData.title.substring(0, 67) + '...' : seoData.title}
      />
      <meta
        name="twitter:description"
        content={seoData.description.length > 160 ? seoData.description.substring(0, 157) + '...' : seoData.description}
      />
      <meta name="twitter:image" content={seoData.image} />
      <meta name="twitter:creator" content="@GeoLeap" />
      <meta name="twitter:site" content="@GeoLeap" />

      {/* Content-Specific Meta Tags */}
      {content && type && (
        <>
          {content.releaseYear && <meta property="video:release_date" content={`${content.releaseYear}-01-01`} />}
          {content.runtime && <meta property="video:duration" content={String(content.runtime * 60)} />}
          {content.genres && content.genres.length > 0 && (
            <meta property="video:genre" content={content.genres.join(', ')} />
          )}
          {content.contentRating && <meta property="video:rating" content={content.contentRating} />}
          {/* Add cast members as actors */}
          {content.cast &&
            content.cast
              .slice(0, 6)
              .map((actor, index) => <meta key={index} property="video:actor" content={actor.name} />)}
          {/* Add directors */}
          {content.crew &&
            content.crew
              .filter(member => member.job === 'Director')
              .slice(0, 3)
              .map((director, index) => <meta key={index} property="video:director" content={director.name} />)}
        </>
      )}

      {/* Robots Meta Tags */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

      {/* Additional Meta Tags */}
      {additionalMeta.map((meta, index) => (
        <meta
          key={index}
          {...(meta.name && { name: meta.name })}
          {...(meta.property && { property: meta.property })}
          content={meta.content}
        />
      ))}

      {/* Preconnect to External Domains */}
      <link rel="preconnect" href="https://image.tmdb.org" />
      <link rel="preconnect" href="https://img.omdb.com" />
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />

      {/* Theme and App Configuration */}
      <meta name="theme-color" content="#000000" />
      <meta name="color-scheme" content="dark light" />
      <link rel="manifest" href="/manifest.json" />

      {/* Favicon and Apple Touch Icons */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    </Head>
  );
}

/**
 * Generate SEO-optimized page title
 */
function generatePageTitle(content: ContentData, type: 'movie' | 'tv-show' | 'documentary'): string {
  const baseTitle = content.title;
  const year = content.releaseYear ? ` (${content.releaseYear})` : '';
  const contentType = type === 'tv-show' ? 'TV Series' : type.charAt(0).toUpperCase() + type.slice(1);

  // Include rating if available and high
  const ratingText = content.rating && content.rating >= 7.0 ? ` - ${content.rating}/10 ⭐` : '';

  // Include streaming availability
  const streamingCount = content.streamingOptions?.length || 0;
  const streamingText =
    streamingCount > 0
      ? ` | Watch on ${streamingCount} Platform${streamingCount > 1 ? 's' : ''}`
      : ' | Find Where to Watch';

  const fullTitle = `${baseTitle}${year}${ratingText} - ${contentType}${streamingText} | GeoLeap`;

  // Ensure title doesn't exceed 60 characters for optimal SEO
  if (fullTitle.length > 60) {
    return `${baseTitle}${year} | Watch ${contentType} | GeoLeap`;
  }

  return fullTitle;
}

/**
 * Generate SEO-optimized description
 */
function generateDescription(content: ContentData, type: 'movie' | 'tv-show' | 'documentary'): string {
  let description = '';

  // Always start with title for SEO
  const titlePrefix = `${content.title}. `;

  // Start with overview if available
  if (content.overview) {
    // Trim overview to leave space for title and streaming info
    const maxOverviewLength = 80;
    const trimmedOverview =
      content.overview.length > maxOverviewLength
        ? content.overview.substring(0, maxOverviewLength).replace(/\s+\S*$/, '') + '...'
        : content.overview;
    description = titlePrefix + trimmedOverview;
  } else {
    // Fallback description
    const contentType = type === 'tv-show' ? 'TV series' : type;
    description = titlePrefix + `The ${content.releaseYear || 'acclaimed'} ${contentType}`;

    if (content.genres && content.genres.length > 0) {
      description += ` in the ${content.genres[0].toLowerCase()} genre`;
    }
  }

  // Add streaming information
  const streamingCount = content.streamingOptions?.length || 0;
  if (streamingCount > 0) {
    description += ` Available on ${streamingCount} streaming platform${streamingCount > 1 ? 's' : ''}.`;
  } else {
    description += ' Find streaming options and watch online.';
  }

  // Add rating if high and space allows
  if (content.rating && content.rating >= 7.0 && description.length < 140) {
    description += ` Rated ${content.rating}/10.`;
  }

  // Ensure description is under 160 characters
  if (description.length >= 160) {
    description = description.substring(0, 156) + '...';
  }

  return description;
}

/**
 * Generate SEO keywords
 */
function generateKeywords(content: ContentData, type: 'movie' | 'tv-show' | 'documentary'): string {
  const keywords = [];

  // Add title variations
  keywords.push(content.title);
  if (content.originalTitle && content.originalTitle !== content.title) {
    keywords.push(content.originalTitle);
  }

  // Add content type keywords
  const typeKeywords = {
    movie: ['movie', 'film', 'cinema'],
    'tv-show': ['tv show', 'series', 'television'],
    documentary: ['documentary', 'doc', 'non-fiction'],
  };
  keywords.push(...typeKeywords[type]);

  // Add year
  if (content.releaseYear) {
    keywords.push(content.releaseYear.toString());
  }

  // Add genres
  if (content.genres) {
    keywords.push(...content.genres.map(g => g.toLowerCase()));
  }

  // Add cast (top 3)
  if (content.cast) {
    keywords.push(...content.cast.slice(0, 3).map(actor => actor.name));
  }

  // Add directors
  if (content.crew) {
    const directors = content.crew.filter(member => member.job === 'Director');
    keywords.push(...directors.slice(0, 2).map(director => director.name));
  }

  // Add streaming-related keywords
  keywords.push('watch online', 'streaming', 'where to watch');

  // Add platform names if available
  if (content.streamingOptions) {
    keywords.push(...content.streamingOptions.slice(0, 3).map(option => option.serviceName));
  }

  return keywords.join(', ');
}
