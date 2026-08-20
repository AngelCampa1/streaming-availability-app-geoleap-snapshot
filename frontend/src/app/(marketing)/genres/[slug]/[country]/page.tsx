import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { genreGuides } from '@/data/genres';
import { countries } from '@/data/countries';
import { platforms } from '@/data/platforms';
import { getGenreCountryData } from '@/data/genre-country-utils';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { getGenreCountryGovernance } from '@/lib/seo/page-governance';
import { buildGenreCountryRelatedSections } from '@/lib/seo/related-links';
import { SITE_URL, PROGRAMMATIC_PAGES_LAST_UPDATED, CURRENT_YEAR } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { FaqSection } from '@/components/seo/FaqSection';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { ContentCTA } from '@/components/cro/ContentCTA';

interface Props {
  params: Promise<{ slug: string; country: string }>;
}

export async function generateStaticParams() {
  const params: Array<{ slug: string; country: string }> = [];

  for (const genre of genreGuides) {
    for (const country of countries) {
      params.push({ slug: genre.slug, country: country.slug });
    }
  }

  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, country: countryParam } = await params;
  const data = getGenreCountryData(slug, countryParam);

  if (!data) {
    return buildPageMetadata({
      title: 'Page Not Found',
      description: 'This page could not be found.',
      path: `/genres/${slug}/${countryParam}`,
    });
  }

  const { genre, country, availablePlatforms } = data;
  const governance = getGenreCountryGovernance(genre);
  const topPlatformName = availablePlatforms[0]
    ? platforms.find((p) => p.slug === availablePlatforms[0].platformSlug)?.name ??
      availablePlatforms[0].platformSlug
    : '';

  return buildPageMetadata({
    title: `Best ${genre.displayName} Streaming in ${country.name} ${CURRENT_YEAR}`,
    description: `Stream ${genre.displayName.toLowerCase()} in ${country.name}. ${availablePlatforms.length} platforms available${topPlatformName ? ` including ${topPlatformName}` : ''}. Compare libraries and pricing.`,
    path: `/genres/${slug}/${countryParam}`,
    canonicalPath: governance.canonicalPath,
    keywords: [
      `${genre.name} streaming ${country.name}`,
      `watch ${genre.name} ${country.name}`,
      `best ${genre.name} platforms ${country.name}`,
    ],
    noIndex: governance.indexing !== 'index',
  });
}

export default async function GenreCountryPage({ params }: Props) {
  const { slug, country: countryParam } = await params;
  const data = getGenreCountryData(slug, countryParam);

  if (!data) notFound();

  const { genre, country, availablePlatforms, unavailablePlatforms, isTopCountry, topCountryReason } = data;

  const hasAvailable = availablePlatforms.length > 0;
  const topPlatform = availablePlatforms[0]
    ? platforms.find((p) => p.slug === availablePlatforms[0].platformSlug)
    : null;
  const topPlatformName = topPlatform?.name ?? availablePlatforms[0]?.platformSlug ?? '';

  const relatedSections = buildGenreCountryRelatedSections(genre, country);

  // Generate country-specific FAQs
  const countryFaqs = [
    {
      question: `What are the best ${genre.displayName} streaming services in ${country.name}?`,
      answer: hasAvailable
        ? `In ${country.name}, the best platforms for ${genre.displayName.toLowerCase()} are ${availablePlatforms.map((bp) => platforms.find((p) => p.slug === bp.platformSlug)?.name ?? bp.platformSlug).join(', ')}. ${topPlatformName ? `${topPlatformName} leads with ${availablePlatforms[0].librarySize}.` : ''}`
        : `Streaming options for ${genre.displayName.toLowerCase()} in ${country.name} are currently limited. Check back soon for updates.`,
    },
    {
      question: `Is ${topPlatformName || genre.bestPlatforms[0]?.platformSlug || genre.displayName} available in ${country.name}?`,
      answer: topPlatform && country.availablePlatforms.includes(topPlatform.slug)
        ? `Yes, ${topPlatformName} is available in ${country.name} and is one of the top platforms for ${genre.displayName.toLowerCase()} content.`
        : `${topPlatformName || 'This platform'} is not currently available in ${country.name}. Consider alternative platforms for ${genre.displayName.toLowerCase()} streaming.`,
    },
    {
      question: `How many ${genre.displayName} streaming platforms are available in ${country.name}?`,
      answer: `There ${availablePlatforms.length === 1 ? 'is 1 platform' : `are ${availablePlatforms.length} platforms`} available for ${genre.displayName.toLowerCase()} streaming in ${country.name}${hasAvailable ? `, including ${availablePlatforms.slice(0, 3).map((bp) => platforms.find((p) => p.slug === bp.platformSlug)?.name ?? bp.platformSlug).join(', ')}` : ''}.`,
    },
    ...genre.faqs.slice(0, 2),
  ];

  // Schema
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Best ${genre.displayName} Streaming in ${country.name} ${CURRENT_YEAR}`,
    description: genre.longDescription,
    url: `${SITE_URL}/genres/${genre.slug}/${country.slug}`,
    dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
    about: {
      '@type': 'Thing',
      name: genre.displayName,
    },
    spatialCoverage: {
      '@type': 'Country',
      name: country.name,
    },
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Genres', href: '/genres' },
    { label: genre.displayName, href: `/genres/${genre.slug}` },
    { label: country.name, href: `/genres/${genre.slug}/${country.slug}` },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={webPageSchema} />
      <Breadcrumbs items={breadcrumbs} />

      {/* Hero */}
      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">
          Best {genre.displayName} Streaming in {country.name}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">{genre.shortDescription}</p>
      </div>

      {/* Availability status banner */}
      {hasAvailable ? (
        <div className="mt-6 rounded-lg border border-success/30 bg-success/5 p-4">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-success shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-semibold text-success">
              {genre.displayName} streaming is available in {country.name}
            </span>
          </div>
          <p className="mt-1 ml-7 text-sm text-success">
            {availablePlatforms.length} streaming{' '}
            {availablePlatforms.length === 1 ? 'platform' : 'platforms'} available
            {topPlatformName ? `, led by ${topPlatformName}` : ''}
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-amber-600 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-semibold text-amber-800">
              Limited {genre.displayName} streaming options in {country.name}
            </span>
          </div>
          <p className="mt-1 ml-7 text-sm text-amber-700">
            The top {genre.displayName.toLowerCase()} platforms are not yet available in{' '}
            {country.name}. Explore alternative countries below.
          </p>
        </div>
      )}

      {/* BLUF summary */}
      <div className="bluf-summary mt-6 rounded-lg bg-muted border border-border p-4 text-sm text-foreground leading-relaxed">
        <p>
          <strong>Summary:</strong> {availablePlatforms.length} of {genre.bestPlatforms.length} top{' '}
          {genre.displayName.toLowerCase()} platforms are available in {country.name}.
          {topPlatformName && hasAvailable && (
            <> Top pick: {topPlatformName} with {availablePlatforms[0].librarySize}.</>
          )}{' '}
          {genre.viewingStats}.
          {isTopCountry && topCountryReason && (
            <> {country.name} is a top country for {genre.displayName.toLowerCase()}: {topCountryReason}.</>
          )}
        </p>
      </div>

      {/* Available platforms */}
      {hasAvailable && (
        <section className="mt-10" id="platforms">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Available {genre.displayName} Platforms in {country.name}
          </h2>
          <div className="space-y-6">
            {availablePlatforms.map((entry, index) => {
              const platform = platforms.find((p) => p.slug === entry.platformSlug);
              const displayName =
                platform?.name ??
                entry.platformSlug
                  .replace(/-/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <div
                  key={entry.platformSlug}
                  className="rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {index + 1}
                        </span>
                        <Link
                          href={`/platforms/${entry.platformSlug}`}
                          className="text-xl font-bold text-foreground hover:text-primary transition-colors"
                        >
                          {displayName}
                        </Link>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground ml-11">
                        Library: <span className="font-medium text-foreground">{entry.librarySize}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 ml-11 grid gap-4 sm:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Strengths</h4>
                      <ul className="space-y-1">
                        {entry.strengths.map((strength) => (
                          <li
                            key={strength}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <svg
                              className="h-4 w-4 text-success shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">
                        Exclusive Highlights
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.exclusiveHighlights.map((title) => (
                          <span
                            key={title}
                            className="rounded-full bg-primary/5 px-2.5 py-0.5 text-xs text-primary"
                          >
                            {title}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Unavailable platforms notice */}
      {unavailablePlatforms.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Not Available in {country.name}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            The following top {genre.displayName.toLowerCase()} platforms are not currently
            available in {country.name}:
          </p>
          <div className="flex flex-wrap gap-3">
            {unavailablePlatforms.map((entry) => {
              const platform = platforms.find((p) => p.slug === entry.platformSlug);
              const displayName =
                platform?.name ??
                entry.platformSlug
                  .replace(/-/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <span
                  key={entry.platformSlug}
                  className="rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-muted-foreground/60 line-through"
                >
                  {displayName}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* Trending titles */}
      {genre.trendingTitles.length > 0 && (
        <section className="mt-10" id="trending">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Trending {genre.displayName} Titles
          </h2>
          <div className="flex flex-wrap gap-2">
            {genre.trendingTitles.map((title) => (
              <span
                key={title}
                className="rounded-full bg-primary/5 px-3 py-1 text-sm text-primary"
              >
                {title}
              </span>
            ))}
          </div>
        </section>
      )}

      <ContentCTA pageType="genre" context={{ name: genre.displayName }} />

      {/* FAQ */}
      <div className="mt-10" id="faq">
        <FaqSection
          faqs={countryFaqs}
          title={`${genre.displayName} in ${country.name} FAQ`}
        />
      </div>

      {/* Related links */}
      {relatedSections.length > 0 && (
        <div className="mt-12">
          <RelatedLinks sections={relatedSections} />
        </div>
      )}

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
