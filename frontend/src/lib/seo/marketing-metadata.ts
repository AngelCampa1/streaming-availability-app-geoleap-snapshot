import { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from './site-config';

/**
 * Appends "| GeoLeap" suffix to metadata title and sets OG site name / twitter site.
 */
export function withMarketingTitle(metadata: Metadata): Metadata {
  const rawTitle =
    typeof metadata.title === 'string'
      ? metadata.title
      : (metadata.title as { default?: string } | null)?.default ?? '';

  const fullTitle = rawTitle.includes(SITE_NAME) ? rawTitle : `${rawTitle} | ${SITE_NAME}`;

  return {
    ...metadata,
    title: rawTitle,
    openGraph: {
      ...metadata.openGraph,
      siteName: SITE_NAME,
      title: metadata.openGraph?.title ?? fullTitle,
    },
    twitter: {
      ...metadata.twitter,
      site: `@GeoLeapApp`,
    },
  };
}

export type EnhanceDescriptionPageType =
  | 'country'
  | 'platform'
  | 'compare'
  | 'glossary'
  | 'sport'
  | 'genre'
  | 'guide'
  | 'blog'
  | 'how-to-watch'
  | 'unblock';

const CTA_SUFFIXES: Record<EnhanceDescriptionPageType, string> = {
  country: ' Search 42 services by country.',
  platform: ' Compare prices across 57 countries.',
  compare: ' Side-by-side pricing and tradeoffs.',
  glossary: ' Plain-English definitions for streamers.',
  sport: ' Legal viewing options by country.',
  genre: ' Top platforms ranked by library size \u2014 free search.',
  guide: ' Practical tips without subscription sprawl.',
  blog: ' Streaming data, tradeoffs, and recommendations.',
  'how-to-watch': ' Check availability in your country.',
  unblock: ' Smart DNS access guidance without VPN setup.',
};

const DEFAULT_CTA_SUFFIX = ' Discover more at GeoLeap.';
const MAX_DESCRIPTION_LENGTH = 160;

/**
 * Appends an action-oriented CTA suffix to a base description.
 * Truncates the base description if needed to fit within 160 chars total.
 */
export function enhanceDescription(
  baseDescription: string,
  pageType: EnhanceDescriptionPageType | string,
): string {
  const suffix =
    CTA_SUFFIXES[pageType as EnhanceDescriptionPageType] ?? DEFAULT_CTA_SUFFIX;
  const maxBaseLength = MAX_DESCRIPTION_LENGTH - suffix.length;

  const trimmedBase =
    baseDescription.length > maxBaseLength
      ? baseDescription.slice(0, maxBaseLength - 1).trimEnd() + '\u2026'
      : baseDescription;

  return `${trimmedBase}${suffix}`;
}

export interface BuildPageMetadataOpts {
  title: string;
  description: string;
  path: string;
  canonicalPath?: string;
  ogImagePath?: string;
  keywords?: string[];
  noIndex?: boolean;
  dateModified?: string;
  datePublished?: string;
}

/**
 * Factory that returns a full Metadata object with OG, Twitter, canonical, and robots.
 */
export function buildPageMetadata(opts: BuildPageMetadataOpts): Metadata {
  const {
    title,
    description,
    path,
    canonicalPath,
    ogImagePath,
    keywords,
    noIndex,
    dateModified,
    datePublished,
  } = opts;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const canonical = `${SITE_URL}${canonicalPath ?? path}`;
  const ogImage = ogImagePath ? `${SITE_URL}${ogImagePath}` : undefined;

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: {
      canonical,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: SITE_NAME,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: title }] } : {}),
      type: (dateModified || datePublished) ? 'article' : 'website',
      ...(dateModified ? { modifiedTime: dateModified } : {}),
      ...(datePublished ? { publishedTime: datePublished } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      site: '@GeoLeapApp',
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    ...(noIndex
      ? {
          robots: {
            index: false,
            follow: true,
          },
        }
      : {}),
    other: {
      citation_title: title,
      citation_author: 'GeoLeap',
      ...(datePublished ? { citation_date: datePublished } : {}),
    },
  };
}
