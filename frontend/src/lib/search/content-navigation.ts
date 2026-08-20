/**
 * Navigation helpers for search results.
 *
 * Search results carry a numeric {@link ContentType} enum, but content detail
 * pages live at `/content/{type}/{slug}` where `{type}` is a URL segment the
 * backend recognizes (`movie`, `tv-show`, `documentary`, `anime`). Linking to
 * `/content/{id}` 404s because no such single-segment route exists. This module
 * is the single source of truth for turning a result into a valid detail path.
 */
import { ContentType, PaywalledSearchResult } from '@/lib/types/paywall';
import { generateContentSlug } from '@/lib/seo/url-generation';

/**
 * Maps the search {@link ContentType} enum to the URL segment used by the
 * `/content/[type]/[slug]` route and accepted by the backend content endpoint.
 */
const CONTENT_TYPE_PATH_SEGMENT: Record<ContentType, string> = {
  [ContentType.All]: 'movie',
  [ContentType.Movie]: 'movie',
  [ContentType.Show]: 'tv-show',
  [ContentType.Documentary]: 'documentary',
  [ContentType.Anime]: 'anime',
};

type ContentLinkFields = Pick<PaywalledSearchResult, 'id' | 'title' | 'type' | 'year'>;

/**
 * Builds the canonical in-app path for a content detail page from an already
 * resolved route segment. Always returns `/content/{segment}/{id}-{slug}[-{year}]`.
 * Use this when the caller already knows the URL segment (e.g. dashboards that
 * model type as a plain string rather than the {@link ContentType} enum).
 */
export function buildContentPath(segment: string, id: string, title: string, year?: number): string {
  const slug = generateContentSlug(id, title, year);
  return `/content/${segment}/${slug}`;
}

/**
 * Builds the canonical in-app path for a search result's detail page,
 * translating the {@link ContentType} enum to its URL segment.
 */
export function buildContentPathFromResult(result: ContentLinkFields): string {
  const segment = CONTENT_TYPE_PATH_SEGMENT[result.type] ?? 'movie';
  return buildContentPath(segment, result.id, result.title, result.year);
}
