/**
 * SEO-friendly URL generation utilities
 * Creates clean, readable URLs for content pages
 */
import { SITE_URL } from './site-config';
import { ContentRouteType } from '@/lib/types';

/**
 * Generate a SEO-friendly slug from content ID and title
 * Format: {id}-{title-slug}
 * Example: "550-fight-club-1999"
 */
export function generateContentSlug(id: string, title: string, year?: number): string {
  // Clean the title for URL use
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  // Combine ID, title slug, and optional year
  let slug = `${id}-${titleSlug}`;
  if (year) {
    slug += `-${year}`;
  }

  return slug;
}

/**
 * Parse a content slug to extract ID and title
 * Returns the ID and reconstructed title
 */
export function parseContentSlug(slug: string): { id: string; title: string } {
  // Content ids may be GUIDs, which themselves contain hyphens (8-4-4-4-12).
  // Match a leading GUID first so it is not truncated to its first hex group
  // (which would make the API receive a fragment id and return 404, rendering
  // content detail/anime deep links as notFound()). Otherwise fall back to the
  // legacy "id is everything before the first hyphen" rule for numeric ids.
  const guidPrefix = slug.match(
    /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(?:-(.*))?$/
  );

  let id: string;
  let titleParts: string[];

  if (guidPrefix) {
    id = guidPrefix[1];
    const remainder = guidPrefix[2] ?? '';
    titleParts = remainder.length > 0 ? remainder.split('-') : [];
  } else {
    // The ID is everything before the first hyphen
    const parts = slug.split('-');
    if (parts.length < 2) {
      throw new Error('Invalid content slug format');
    }

    id = parts[0];
    titleParts = parts.slice(1);
  }

  // Remove year from the end if present (4 digits)
  if (titleParts.length > 0) {
    const lastPart = titleParts[titleParts.length - 1];
    if (/^\d{4}$/.test(lastPart)) {
      titleParts.pop();
    }
  }

  const title = titleParts.join(' ').replace(/\b\w/g, l => l.toUpperCase());

  return { id, title };
}

/**
 * Generate category URLs for content types
 */
export function generateCategoryUrl(type: ContentRouteType): string {
  const typeMap: Record<ContentRouteType, string> = {
    movie: '/how-to-watch',
    'tv-show': '/how-to-watch',
    documentary: '/how-to-watch',
    anime: '/genres/anime',
  };

  return typeMap[type] ?? '/content';
}

/**
 * Generate genre URLs
 */
export function generateGenreUrl(type: ContentRouteType, _genre: string): string {
  if (type === 'anime') return '/genres/anime';
  return generateCategoryUrl(type);
}

/**
 * Generate year-based URLs
 */
export function generateYearUrl(type: ContentRouteType, _year: number): string {
  return generateCategoryUrl(type);
}

/**
 * Generate search URLs with SEO-friendly parameters
 */
export function generateSearchUrl(
  query: string,
  filters?: Partial<{
    type: 'movie' | 'tv-show' | 'documentary';
    genre: string;
    year: number;
    rating: number;
  }>
): string {
  const params = new URLSearchParams();

  if (query) {
    params.set('q', query);
  }

  if (filters) {
    if (filters.type) params.set('type', filters.type);
    if (filters.genre) params.set('genre', filters.genre);
    if (filters.year) params.set('year', filters.year.toString());
    if (filters.rating) params.set('rating', filters.rating.toString());
  }

  return `/search${params.toString()}`;
}

/**
 * Generate canonical URLs for content pages
 */
export function generateCanonicalUrl(type: string, slug: string): string {
  const baseUrl = SITE_URL;
  return `${baseUrl}/content/${type}/${slug}`;
}

/**
 * Generate Open Graph URLs for social sharing
 */
export function generateOgImageUrl(id: string, title: string, type: ContentRouteType): string {
  const params = new URLSearchParams({
    id,
    title: title.substring(0, 60), // Limit title length
    type,
  });

  const baseUrl = SITE_URL;
  return `${baseUrl}/api/og?${params.toString()}`;
}

/**
 * Validate slug format
 */
export function isValidSlug(slug: string): boolean {
  // Check if slug matches our expected format
  const slugRegex = /^[a-z0-9]+-[a-z0-9-]+$/;
  return slugRegex.test(slug) && slug.length > 3 && slug.length < 200;
}

/**
 * Generate breadcrumb URLs
 */
export function generateBreadcrumbUrls(type: string, genre?: string, year?: number) {
  const breadcrumbs = [
    { label: 'Home', url: '/' },
    { label: getTypeDisplayName(type), url: generateCategoryUrl(type as ContentRouteType) },
  ];

  if (genre) {
    breadcrumbs.push({
      label: genre,
      url: generateGenreUrl(type as ContentRouteType, genre),
    });
  }

  if (year) {
    breadcrumbs.push({
      label: year.toString(),
      url: generateYearUrl(type as 'movie' | 'tv-show' | 'documentary', year),
    });
  }

  return breadcrumbs;
}

/**
 * Get display name for content type
 */
export function getTypeDisplayName(type: string): string {
  const typeMap: Record<string, string> = {
    movie: 'Movies',
    'tv-show': 'TV Shows',
    documentary: 'Documentaries',
    anime: 'Anime',
  };

  return typeMap[type] || 'Content';
}

// ---------------------------------------------------------------------------
// pSEO URL generators
// ---------------------------------------------------------------------------

/** Returns absolute URL for a platform page: /platforms/{slug} */
export function generatePlatformUrl(slug: string): string {
  return `${SITE_URL}/platforms/${slug}`;
}

/** Returns absolute URL for a country page: /countries/{slug} */
export function generateCountryUrl(slug: string): string {
  return `${SITE_URL}/countries/${slug}`;
}

/** Returns absolute URL for a platform x country page: /platforms/{platform}/countries/{country} */
export function generatePlatformCountryUrl(platform: string, country: string): string {
  return `${SITE_URL}/platforms/${platform}/countries/${country}`;
}

/** Returns absolute URL for a comparison page: /compare/{slug} */
export function generateComparisonUrl(slug: string): string {
  return `${SITE_URL}/compare/${slug}`;
}

/** Returns absolute URL for a guide page: /guides/{slug} */
export function generateGuideUrl(slug: string): string {
  return `${SITE_URL}/guides/${slug}`;
}

/** Returns absolute URL for a blog page: /blog/{slug} */
export function generateBlogUrl(slug: string): string {
  return `${SITE_URL}/blog/${slug}`;
}

/** Returns absolute URL for a glossary term page: /glossary/{slug} */
export function generateGlossaryUrl(slug: string): string {
  return `${SITE_URL}/glossary/${slug}`;
}

// ---------------------------------------------------------------------------

/**
 * Generate sitemap URLs for content
 */
export function generateSitemapUrls(
  contents: Array<{ id: string; title: string; releaseYear?: number }>,
  type: 'movie' | 'tv-show' | 'documentary'
): Array<{ url: string; lastmod: string; priority: number }> {
  const baseUrl = SITE_URL;

  return contents.map(content => {
    const slug = generateContentSlug(content.id, content.title, content.releaseYear);
    const url = `${baseUrl}/content/${type}/${slug}`;

    // Higher priority for newer content
    const currentYear = new Date().getFullYear();
    const contentYear = content.releaseYear || 2000;
    const yearsOld = currentYear - contentYear;
    const priority = Math.max(0.31, Math.min(1.0, 1.0 - yearsOld * 0.05));

    return {
      url,
      lastmod: new Date().toISOString(),
      priority: Math.round(priority * 10) / 10,
    };
  });
}
