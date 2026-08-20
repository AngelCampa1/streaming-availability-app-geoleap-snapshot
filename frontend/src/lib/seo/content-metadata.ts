import { Metadata } from 'next';
import { ContentData } from '@/lib/api/content';
import { ContentRouteType } from '@/lib/types';
import { generateCanonicalUrl, generateContentSlug, generateOgImageUrl } from './url-generation';

/**
 * Generate comprehensive metadata for content pages
 */
export async function generateContentMetadata(
  content: ContentData,
  type: ContentRouteType
): Promise<Metadata> {
  const title = generatePageTitle(content, type);
  const description = generateDescription(content, type);
  const keywords = generateKeywords(content, type);
  const canonical = generateCanonicalUrl(type, generateContentSlug(content.id, content.title, content.releaseYear));
  const ogImage = generateOgImageUrl(content.id, content.title, type);

  const metadata: Metadata = {
    title,
    description,
    keywords,
    authors: [{ name: 'GeoLeap' }],
    creator: 'GeoLeap',
    publisher: 'GeoLeap',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },

    // Open Graph metadata
    openGraph: {
      type: 'video.movie',
      title,
      description,
      url: canonical,
      siteName: 'GeoLeap',
      locale: 'en_US',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${content.title} - Where to Watch`,
        },
        ...(content.posterUrl
          ? [
              {
                url: content.posterUrl,
                width: 500,
                height: 750,
                alt: `${content.title} poster`,
              },
            ]
          : []),
        ...(content.backdropUrl
          ? [
              {
                url: content.backdropUrl,
                width: 1920,
                height: 1080,
                alt: `${content.title} backdrop`,
              },
            ]
          : []),
      ],
    },

    // Twitter Card metadata
    twitter: {
      card: 'summary_large_image',
      title: title.length > 70 ? title.substring(0, 67) + '...' : title,
      description: description.length > 160 ? description.substring(0, 157) + '...' : description,
      creator: '@GeoLeapApp',
      site: '@GeoLeapApp',
      images: [ogImage],
    },

    // Additional metadata
    alternates: {
      canonical,
    },

    // Robots configuration
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    // App links for mobile
    ...(content.streamingOptions &&
      content.streamingOptions.length > 0 && {
        appLinks: {
          web: {
            url: canonical,
          },
        },
      }),
  };

  // Add video-specific metadata
  if (type === 'movie' || type === 'tv-show' || type === 'anime') {
    metadata.openGraph = {
      ...metadata.openGraph,
      type: type === 'movie' ? 'video.movie' : 'video.tv_show',
    };

    // Add video metadata if available
    if (content.releaseYear) {
      (metadata.openGraph as Record<string, unknown>).releaseDate = `${content.releaseYear}-01-01`;
    }

    if (content.genres && content.genres.length > 0) {
      (metadata.openGraph as Record<string, unknown>).genre = content.genres;
    }

    if (content.cast && content.cast.length > 0) {
      (metadata.openGraph as Record<string, unknown>).actor = content.cast.slice(0, 6).map(actor => actor.name);
    }

    if (content.crew) {
      const directors = content.crew.filter(member => member.job === 'Director');
      if (directors.length > 0) {
        (metadata.openGraph as Record<string, unknown>).director = directors.map(director => director.name);
      }
    }

    if (content.runtime) {
      (metadata.openGraph as Record<string, unknown>).duration = content.runtime * 60; // Convert minutes to seconds
    }
  }

  return metadata;
}

/**
 * Generate SEO-optimized page title
 */
function generatePageTitle(content: ContentData, type: ContentRouteType): string {
  const baseTitle = content.title;
  const year = content.releaseYear ? ` (${content.releaseYear})` : '';
  const contentTypeLabels: Record<ContentRouteType, string> = {
    movie: 'Movie',
    'tv-show': 'TV Series',
    documentary: 'Documentary',
    anime: 'Anime',
  };
  const contentType = contentTypeLabels[type];

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
function generateDescription(content: ContentData, type: ContentRouteType): string {
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
    const contentTypeFallbackLabels: Record<ContentRouteType, string> = {
      movie: 'movie',
      'tv-show': 'TV series',
      documentary: 'documentary',
      anime: 'anime series',
    };
    const contentType = contentTypeFallbackLabels[type];
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
function generateKeywords(content: ContentData, type: ContentRouteType): string {
  const keywords = [];

  // Add title variations
  keywords.push(content.title);
  if (content.originalTitle && content.originalTitle !== content.title) {
    keywords.push(content.originalTitle);
  }

  // Add content type keywords
  const typeKeywords: Record<ContentRouteType, string[]> = {
    movie: ['movie', 'film', 'cinema'],
    'tv-show': ['tv show', 'series', 'television'],
    documentary: ['documentary', 'doc', 'non-fiction'],
    anime: ['anime', 'animation', 'japanese animation'],
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

/**
 * Generate meta tags for embedding in HTML head
 */
export function generateMetaTags(content: ContentData, type: string): string {
  const tags = [];
  const contentType = type as ContentRouteType;

  // Basic meta tags
  tags.push(`<meta name="description" content="${generateDescription(content, contentType)}" />`);
  tags.push(`<meta name="keywords" content="${generateKeywords(content, contentType)}" />`);

  // Open Graph tags
  tags.push(`<meta property="og:type" content="video.${type === 'tv-show' ? 'tv_show' : 'movie'}" />`);
  tags.push(`<meta property="og:title" content="${content.title}" />`);
  tags.push(`<meta property="og:description" content="${generateDescription(content, contentType)}" />`);

  if (content.posterUrl) {
    tags.push(`<meta property="og:image" content="${content.posterUrl}" />`);
  }

  if (content.releaseYear) {
    tags.push(`<meta property="video:release_date" content="${content.releaseYear}-01-01" />`);
  }

  if (content.runtime) {
    tags.push(`<meta property="video:duration" content="${content.runtime * 60}" />`);
  }

  // Twitter Card tags
  tags.push(`<meta name="twitter:card" content="summary_large_image" />`);
  tags.push(`<meta name="twitter:title" content="${content.title}" />`);
  tags.push(`<meta name="twitter:description" content="${generateDescription(content, contentType)}" />`);

  if (content.posterUrl) {
    tags.push(`<meta name="twitter:image" content="${content.posterUrl}" />`);
  }

  return tags.join('\n');
}
