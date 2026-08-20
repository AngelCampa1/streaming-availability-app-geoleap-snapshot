export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://geoleap.app';
export const SITE_NAME = 'GeoLeap';
export const SITE_DESCRIPTION =
  'Find where to stream movies and TV shows across 42 streaming services in 57 countries. Compare availability, pricing, and content libraries by country.';
// Keep SEO copy tied to the verified content set rather than automatically rolling
// into a new year before prices, rights, and availability have been reviewed.
export const CONTENT_YEAR = 2026;
export const CURRENT_YEAR = CONTENT_YEAR;
export const PLATFORM_COUNT = 42;
export const COUNTRY_COUNT = 57;
export const PROGRAMMATIC_PAGES_LAST_UPDATED = '2026-05-31';

export const LAST_UPDATED = {
  platforms: '2026-05-31',
  countries: '2026-05-31',
  comparisons: '2026-05-31',
  sports: '2026-05-31',
  genres: '2026-05-31',
  guides: '2026-05-31',
  glossary: '2026-05-31',
  howToWatch: '2026-05-31',
} as const;

export const SOCIAL_LINKS = {
  twitter: 'https://twitter.com/GeoLeapApp',
  instagram: 'https://instagram.com/GeoLeapApp',
  linkedin: 'https://linkedin.com/company/geoleap',
  github: 'https://github.com/geoleap',
};

export const BRAND_COLORS = {
  violet: '#7c3aed',
  amber: '#f59e0b',
  cyan: '#06b6d4',
  green: '#10b981',
};

export function formatLastUpdated(date: string): string {
  return new Date(date).toISOString();
}
