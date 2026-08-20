import { SITE_URL } from './site-config';

export interface OgImageOptions {
  title: string;
  subtitle?: string;
  category?: string;
}

/**
 * Returns a URL string for an OG image.
 *
 * Generates a URL with query params pointing to the /api/og route. This
 * approach is compatible with @opennextjs/cloudflare where edge ImageResponse
 * support may be limited, allowing the OG route to handle actual image
 * generation separately.
 */
export function buildOgImageUrl(opts: OgImageOptions): string {
  const params = new URLSearchParams();
  params.set('title', opts.title.substring(0, 80));
  if (opts.subtitle) {
    params.set('subtitle', opts.subtitle.substring(0, 120));
  }
  if (opts.category) {
    params.set('category', opts.category);
  }
  return `${SITE_URL}/api/og?${params.toString()}`;
}
