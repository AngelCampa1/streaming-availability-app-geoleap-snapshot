import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getContentBySlug, getStreamingOptionsForCountry } from '@/lib/api/content';
import type { StreamingOption } from '@/lib/api/content';
import { getPopularContent } from '@/lib/api/content';
import { getCountryBySlug, countries } from '@/data/countries';
import { platforms } from '@/data/platforms';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { buildHowToWatchRelatedSections } from '@/lib/seo/related-links';
import { SITE_URL, PROGRAMMATIC_PAGES_LAST_UPDATED, CURRENT_YEAR } from '@/lib/seo/site-config';
import { generateContentSlug, getTypeDisplayName } from '@/lib/seo/url-generation';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { FaqSection } from '@/components/seo/FaqSection';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { ContentCTA } from '@/components/cro/ContentCTA';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  params: Promise<{ type: string; slug: string; country: string }>;
}

const VALID_TYPES = ['movie', 'tv-show', 'documentary'] as const;
type ContentType = (typeof VALID_TYPES)[number];

// ---------------------------------------------------------------------------
// ISR
// ---------------------------------------------------------------------------

export const revalidate = 86400; // 24 hours
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const [movies, tvShows] = await Promise.allSettled([
      getPopularContent('movie', 30),
      getPopularContent('tv-show', 30),
    ]);

    // Pre-render top 15 countries at build time; dynamicParams handles the rest on-demand
    const topCountrySlugs = countries.slice(0, 15).map(c => c.slug);
    const params: Array<{ type: string; slug: string; country: string }> = [];

    const addParams = (items: { id: string; title: string }[], type: string) => {
      items.forEach(item => {
        const slug = generateContentSlug(item.id, item.title);
        topCountrySlugs.forEach(country => {
          params.push({ type, slug, country });
        });
      });
    };

    if (movies.status === 'fulfilled') addParams(movies.value, 'movie');
    if (tvShows.status === 'fulfilled') addParams(tvShows.value, 'tv-show');

    return params;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidType(type: string): type is ContentType {
  return (VALID_TYPES as readonly string[]).includes(type);
}

function getStreamingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    subscription: 'Subscription',
    rental: 'Rent',
    purchase: 'Buy',
    free: 'Free',
    ads: 'Free with Ads',
  };
  return labels[type] || type;
}

function sortStreamingOptions(options: StreamingOption[]): StreamingOption[] {
  const typeOrder: Record<string, number> = {
    free: 0,
    ads: 1,
    subscription: 2,
    rental: 3,
    purchase: 4,
  };

  return [...options].sort((a, b) => {
    const orderA = typeOrder[a.type] ?? 5;
    const orderB = typeOrder[b.type] ?? 5;
    if (orderA !== orderB) return orderA - orderB;
    return (a.price ?? 0) - (b.price ?? 0);
  });
}

function findCheapestIndex(options: StreamingOption[]): number {
  let minIdx = -1;
  let minPrice = Infinity;
  options.forEach((opt, i) => {
    if (opt.type === 'free' || opt.type === 'ads') {
      if (0 < minPrice) {
        minPrice = 0;
        minIdx = i;
      }
    } else if (opt.price != null && opt.price < minPrice) {
      minPrice = opt.price;
      minIdx = i;
    }
  });
  return minIdx;
}

function getPlatformSlug(serviceName: string): string | null {
  const match = platforms.find(
    p => p.name.toLowerCase() === serviceName.toLowerCase()
  );
  return match?.slug ?? null;
}

function getSchemaType(type: ContentType): string {
  // Schema.org has no "Documentary" type; documentaries are either Movie or TVSeries.
  // Default to Movie for both movie and documentary types.
  return type === 'tv-show' ? 'TVSeries' : 'Movie';
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type, slug, country: countrySlug } = await params;

  if (!isValidType(type)) {
    return buildPageMetadata({
      title: 'Not Found',
      description: 'Page not found.',
      path: `/how-to-watch/${type}/${slug}/in/${countrySlug}`,
    });
  }

  const country = getCountryBySlug(countrySlug);
  const content = await getContentBySlug(type, slug);

  if (!content || !country) {
    return buildPageMetadata({
      title: 'Not Found',
      description: 'Page not found.',
      path: `/how-to-watch/${type}/${slug}/in/${countrySlug}`,
    });
  }

  const options = await getStreamingOptionsForCountry(content.id, type, country.iso);
  const path = `/how-to-watch/${type}/${slug}/in/${countrySlug}`;

  let description: string;
  if (options.length > 0) {
    const platformNames = [...new Set(options.map(o => o.serviceName))].slice(0, 3).join(', ');
    description = `Watch ${content.title} in ${country.name}. Available on ${platformNames}. Compare ${options.length} streaming option${options.length !== 1 ? 's' : ''} and pricing.`;
  } else {
    description = `Is ${content.title} available in ${country.name}? Check streaming availability and find alternatives on GeoLeap.`;
  }

  return buildPageMetadata({
    title: `How to Watch ${content.title} in ${country.name} (${CURRENT_YEAR})`,
    description,
    path,
    keywords: [
      `watch ${content.title} in ${country.name}`,
      `${content.title} streaming ${country.name}`,
      `how to watch ${content.title} ${country.name}`,
    ],
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function HowToWatchPage({ params }: Props) {
  const { type, slug, country: countrySlug } = await params;

  if (!isValidType(type)) notFound();

  const country = getCountryBySlug(countrySlug);
  if (!country) notFound();

  const content = await getContentBySlug(type, slug);
  if (!content) notFound();

  const options = await getStreamingOptionsForCountry(content.id, type, country.iso);
  const sorted = sortStreamingOptions(options);
  const cheapestIdx = findCheapestIndex(sorted);
  const isAvailable = sorted.length > 0;

  // --- JSON-LD schemas ---
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `How to Watch ${content.title} in ${country.name}`,
    url: `${SITE_URL}/how-to-watch/${type}/${slug}/in/${countrySlug}`,
    dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
  };

  const contentSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': getSchemaType(type),
    name: content.title,
    ...(content.overview && { description: content.overview }),
    ...(content.releaseYear && { datePublished: `${content.releaseYear}-01-01` }),
    ...(content.posterUrl && { image: content.posterUrl }),
    ...(content.genres?.length && { genre: content.genres }),
    ...(content.rating && content.voteCount && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: content.rating,
        ratingCount: content.voteCount,
        bestRating: 10,
        worstRating: 1,
      },
    }),
  };

  // --- Breadcrumbs ---
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: getTypeDisplayName(type), href: `/${type === 'movie' ? 'movies' : type === 'tv-show' ? 'tv-shows' : 'documentaries'}` },
    { label: content.title, href: `/content/${type}/${slug}` },
    { label: country.name, href: `/how-to-watch/${type}/${slug}/in/${countrySlug}` },
  ];

  // --- Meta line ---
  const metaParts: string[] = [];
  if (content.releaseYear) metaParts.push(String(content.releaseYear));
  if (content.contentRating) metaParts.push(content.contentRating);
  if (content.genres?.length) metaParts.push(content.genres.join(', '));
  if (content.runtime) metaParts.push(`${content.runtime} min`);

  // --- FAQs ---
  const faqs: Array<{ question: string; answer: string }> = [];

  // Q1: Where can I watch?
  if (isAvailable) {
    const platformList = [...new Set(sorted.map(o => o.serviceName))].join(', ');
    faqs.push({
      question: `Where can I watch ${content.title} in ${country.name}?`,
      answer: `${content.title} is available in ${country.name} on ${platformList}.`,
    });
  } else {
    faqs.push({
      question: `Where can I watch ${content.title} in ${country.name}?`,
      answer: `${content.title} is not currently available to stream in ${country.name}. Use GeoLeap to check availability in other countries.`,
    });
  }

  // Q2: How much does it cost?
  if (isAvailable) {
    const subs = sorted.filter(o => o.type === 'subscription');
    const rentals = sorted.filter(o => o.type === 'rental');
    const free = sorted.filter(o => o.type === 'free' || o.type === 'ads');
    const parts: string[] = [];
    if (free.length) parts.push('free with ads');
    if (subs.length) {
      const subPrices = subs.filter(s => s.price).map(s => `${s.currency ?? '$'}${s.price}`);
      parts.push(`via subscription${subPrices.length ? ` (${subPrices[0]}/mo)` : ''}`);
    }
    if (rentals.length) {
      const cheapest = rentals.reduce((min, r) => (r.price ?? Infinity) < (min.price ?? Infinity) ? r : min, rentals[0]);
      parts.push(`rent from ${cheapest.currency ?? '$'}${cheapest.price ?? '?'}`);
    }
    faqs.push({
      question: `How much does it cost to watch ${content.title} in ${country.name}?`,
      answer: `You can watch ${content.title} in ${country.name} ${parts.join(', ')}.`,
    });
  } else {
    faqs.push({
      question: `How much does it cost to watch ${content.title} in ${country.name}?`,
      answer: `${content.title} is not currently available in ${country.name}, so there is no pricing information available.`,
    });
  }

  // Q3: Is it on the most popular platform?
  const topPlatform = country.topPlatforms[0];
  if (topPlatform) {
    const topPlatformData = platforms.find(p => p.slug === topPlatform);
    const topPlatformName = topPlatformData?.name ?? topPlatform;
    const onTopPlatform = sorted.some(
      o => o.serviceId === topPlatform || o.serviceName.toLowerCase() === topPlatformName.toLowerCase()
    );
    faqs.push({
      question: `Is ${content.title} available on ${topPlatformName} in ${country.name}?`,
      answer: onTopPlatform
        ? `Yes, ${content.title} is available on ${topPlatformName} in ${country.name}.`
        : `No, ${content.title} is not currently available on ${topPlatformName} in ${country.name}. Check GeoLeap for other streaming options.`,
    });
  }

  // --- Related links ---
  const relatedSections = buildHowToWatchRelatedSections(type, slug, country);

  // --- Cheapest platform for "how to" steps ---
  const cheapestOption = cheapestIdx >= 0 ? sorted[cheapestIdx] : null;
  const cheapestPlatformName = cheapestOption?.serviceName ?? 'a streaming platform';

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={[pageSchema, contentSchema]} />
      <Breadcrumbs items={breadcrumbs} />

      {/* H1 */}
      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">
          How to Watch {content.title} in {country.name}
        </h1>
        {metaParts.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">{metaParts.join(' \u00B7 ')}</p>
        )}
      </div>

      {/* Availability banner (BLUF for AI extraction) */}
      <div className="mt-6">
        {isAvailable ? (
          <div className="bluf-summary rounded-xl border border-success/30 bg-success/5 p-4">
            <p className="font-semibold text-success">
              {content.title} is available to stream in {country.name}
            </p>
            <p className="mt-1 text-sm text-success">
              {sorted.length} streaming option{sorted.length !== 1 ? 's' : ''} available
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="font-semibold text-destructive">
              {content.title} is not currently available in {country.name}
            </p>
            <p className="mt-1 text-sm text-destructive">
              Use GeoLeap to find where it&apos;s streaming worldwide
            </p>
          </div>
        )}
      </div>

      {/* Streaming options table */}
      {isAvailable && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold text-foreground">Streaming Options</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 font-semibold text-foreground">Platform</th>
                  <th className="py-3 pr-4 font-semibold text-foreground">Type</th>
                  <th className="py-3 pr-4 font-semibold text-foreground">Price</th>
                  <th className="py-3 font-semibold text-foreground">Quality</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((option, idx) => {
                  const platformSlug = getPlatformSlug(option.serviceName);
                  const isCheapest = idx === cheapestIdx;
                  return (
                    <tr key={`${option.serviceId}-${option.type}-${idx}`} className="border-b border-border">
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-2">
                          {platformSlug ? (
                            <Link href={`/platforms/${platformSlug}`} className="font-medium text-primary hover:underline">
                              {option.serviceName}
                            </Link>
                          ) : (
                            <span className="font-medium text-foreground">{option.serviceName}</span>
                          )}
                          {isCheapest && (
                            <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                              Best value
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{getStreamingTypeLabel(option.type)}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {option.type === 'free' || option.type === 'ads'
                          ? 'Free'
                          : option.price != null
                            ? `${option.currency ?? '$'}${option.price}`
                            : 'N/A'}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {option.quality?.join(', ') ?? 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* GeoLeap CTA */}
      <section className="mt-10">
        <div className="rounded-xl bg-gradient-to-r from-primary-600 to-primary-800 p-8 text-white">
          {isAvailable ? (
            <>
              <h2 className="text-2xl font-bold">Track price changes and get alerts with GeoLeap</h2>
              <p className="mt-2 text-primary-foreground">
                Never miss a deal on {content.title}. Get notified when prices drop or new streaming
                options become available in {country.name}.
              </p>
              <Link
                href="/search"
                className="mt-4 inline-block rounded-full bg-card px-6 py-3 text-sm font-semibold text-primary shadow-sm hover:bg-primary/5 transition-colors"
              >
                Explore on GeoLeap
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold">
                Use GeoLeap to find where {content.title} is streaming worldwide
              </h2>
              <p className="mt-2 text-primary-foreground">
                {content.title} may not be available in {country.name} right now, but it could be
                streaming in other countries. Search across 57 countries on GeoLeap.
              </p>
              <Link
                href={`/search?q=${encodeURIComponent(content.title)}`}
                className="mt-4 inline-block rounded-full bg-card px-6 py-3 text-sm font-semibold text-primary shadow-sm hover:bg-primary/5 transition-colors"
              >
                Search for {content.title}
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Content overview */}
      {content.overview && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold text-foreground">About {content.title}</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">{content.overview}</p>
        </section>
      )}

      {/* How to watch steps */}
      <section className="mt-10">
        <h2 className="text-2xl font-bold text-foreground">
          How to Watch {content.title} in {country.name}
        </h2>
        <ol className="mt-4 space-y-4">
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              1
            </span>
            <div>
              <p className="font-semibold text-foreground">Check availability on GeoLeap</p>
              <p className="text-sm text-muted-foreground">
                Search for {content.title} to see all available streaming options in {country.name}.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              2
            </span>
            <div>
              <p className="font-semibold text-foreground">
                {isAvailable
                  ? `Subscribe to ${cheapestPlatformName} or compare alternatives`
                  : 'Explore alternative countries or platforms'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isAvailable
                  ? `Choose the best streaming option based on price and quality.`
                  : `Check other countries where ${content.title} is available.`}
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              3
            </span>
            <div>
              <p className="font-semibold text-foreground">Start watching</p>
              <p className="text-sm text-muted-foreground">
                Enjoy {content.title} on your preferred device.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* FAQ */}
      <ContentCTA pageType="how-to-watch" context={{ name: content.title }} />

      {faqs.length > 0 && (
        <div id="faq">
          <FaqSection faqs={faqs} title={`${content.title} in ${country.name}  -  FAQ`} />
        </div>
      )}

      {/* Related links */}
      <RelatedLinks sections={relatedSections} />

      {/* Last updated */}
      <p className="mt-10 text-xs text-muted-foreground/60">
        Last updated:{' '}
        {new Date(PROGRAMMATIC_PAGES_LAST_UPDATED).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })}
      </p>
    </main>
  );
}
