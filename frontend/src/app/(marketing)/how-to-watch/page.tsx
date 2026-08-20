import { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { SITE_URL, PROGRAMMATIC_PAGES_LAST_UPDATED, PLATFORM_COUNT } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { countries } from '@/data/countries';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { buildHowToWatchIndexSections } from '@/lib/seo/related-links';

export const revalidate = 86400;

export function generateMetadata(): Metadata {
  return buildPageMetadata({
    title: 'How to Watch Streaming Content Worldwide',
    description:
      'Find where to watch movies, TV shows, and documentaries in your country. Compare streaming availability, pricing, and platforms across 57 countries.',
    path: '/how-to-watch',
    keywords: [
      'how to watch',
      'streaming availability',
      'where to watch',
      'streaming by country',
      'watch movies online',
    ],
  });
}

const popularCountries = countries.filter(c =>
  ['united-states', 'united-kingdom', 'canada', 'australia', 'germany',
    'france', 'india', 'brazil', 'japan', 'spain'].includes(c.slug)
);

export default function HowToWatchIndexPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'How to Watch Streaming Content Worldwide',
    description:
      'Find where to watch movies, TV shows, and documentaries in your country.',
    url: `${SITE_URL}/how-to-watch`,
    dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'How to Watch', href: '/how-to-watch' },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={pageSchema} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">
          How to Watch Streaming Content Worldwide
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          Streaming availability varies by country. Use GeoLeap to find where your favorite
          movies, TV shows, and documentaries are available to stream, rent, or buy in your region.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-foreground">Search for Content</h2>
        <p className="mt-4 text-muted-foreground">
          Looking for a specific title- Use our search to find streaming availability across
          57 countries and {PLATFORM_COUNT} streaming services.
        </p>
        <Link
          href="/search"
          className="mt-4 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition-colors"
        >
          Search Streaming Availability
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-foreground">Browse by Country</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popularCountries.map(country => (
            <Link
              key={country.slug}
              href={`/countries/${country.slug}`}
              className="group rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {country.name}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {country.availablePlatforms.length} streaming platforms available
              </p>
            </Link>
          ))}
        </div>
      </section>

      <RelatedLinks sections={buildHowToWatchIndexSections()} />

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
