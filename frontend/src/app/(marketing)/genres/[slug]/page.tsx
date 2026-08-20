import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { genreGuides, getGenreBySlug } from '@/data/genres';
import { platforms } from '@/data/platforms';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { buildGenreRelatedSections } from '@/lib/seo/related-links';
import { SITE_URL, PROGRAMMATIC_PAGES_LAST_UPDATED } from '@/lib/seo/site-config';
import { generateSpeakableSchema } from '@/lib/seo/schema-markup';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { FaqSection } from '@/components/seo/FaqSection';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { ContentCTA } from '@/components/cro/ContentCTA';

export const revalidate = 86400;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return genreGuides.map(g => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const genre = getGenreBySlug(slug);
  if (!genre) {
    return buildPageMetadata({
      title: 'Genre Not Found',
      description: 'This streaming genre page could not be found.',
      path: `/genres/${slug}`,
    });
  }

  const topPlatformName = genre.bestPlatforms[0]
    ? platforms.find(p => p.slug === genre.bestPlatforms[0].platformSlug)?.name ?? genre.bestPlatforms[0].platformSlug
    : '';

  return buildPageMetadata({
    title: `Best ${genre.displayName} Streaming Services 2026  -  Ranked`,
    description: `${genre.viewingStats}. ${topPlatformName ? `${topPlatformName} leads with ${genre.bestPlatforms[0].librarySize}.` : ''} Compare the best platforms for ${genre.displayName.toLowerCase()} streaming.`,
    path: `/genres/${slug}`,
  });
}

export default async function GenrePage({ params }: Props) {
  const { slug } = await params;
  const genre = getGenreBySlug(slug);
  if (!genre) notFound();

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Best ${genre.displayName} Streaming Services 2026`,
    description: genre.longDescription,
    url: `${SITE_URL}/genres/${genre.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: genre.bestPlatforms.map((entry, index) => {
        const platform = platforms.find(p => p.slug === entry.platformSlug);
        return {
          '@type': 'ListItem',
          position: index + 1,
          name: platform?.name ?? entry.platformSlug,
          url: `${SITE_URL}/platforms/${entry.platformSlug}`,
        };
      }),
    },
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Genres', href: '/genres' },
    { label: genre.displayName, href: `/genres/${genre.slug}` },
  ];

  const relatedSections = buildGenreRelatedSections(genre);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={[collectionSchema, generateSpeakableSchema(`${SITE_URL}/genres/${genre.slug}`)]} />
      <Breadcrumbs items={breadcrumbs} />

      {/* Hero */}
      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">
          Best {genre.displayName} Streaming Services 2026
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">{genre.shortDescription}</p>

        {/* BLUF Summary */}
        <div className="bluf-summary mt-6 rounded-lg bg-muted border border-border p-4 text-sm text-foreground leading-relaxed">
          <p>
            <strong>Key stat:</strong> {genre.viewingStats}.{' '}
            {genre.bestPlatforms[0] && (
              <>
                The top platform is{' '}
                {platforms.find(p => p.slug === genre.bestPlatforms[0].platformSlug)?.name ?? genre.bestPlatforms[0].platformSlug}{' '}
                with {genre.bestPlatforms[0].librarySize}.{' '}
              </>
            )}
            {genre.trendingTitles.length > 0 && (
              <>Trending titles include {genre.trendingTitles.slice(0, 3).join(', ')}.</>
            )}
          </p>
        </div>
      </div>

      {/* Best Platforms */}
      <section className="mt-10" id="platforms">
        <h2 className="text-2xl font-bold text-foreground mb-6">
          Best Platforms for {genre.displayName}
        </h2>
        <div className="space-y-6">
          {genre.bestPlatforms.map((entry, index) => {
            const platform = platforms.find(p => p.slug === entry.platformSlug);
            const displayName = platform?.name ?? entry.platformSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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
                      {entry.strengths.map(strength => (
                        <li key={strength} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <svg className="h-4 w-4 text-success shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Exclusive Highlights</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.exclusiveHighlights.map(title => (
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

      {/* Trending Titles */}
      {genre.trendingTitles.length > 0 && (
        <section className="mt-10" id="trending">
          <h2 className="text-2xl font-bold text-foreground mb-4">Trending Titles</h2>
          <div className="flex flex-wrap gap-2">
            {genre.trendingTitles.map(title => (
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

      {/* Best Countries */}
      {genre.bestCountriesFor.length > 0 && (
        <section className="mt-10" id="countries">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Best Countries for {genre.displayName} Streaming
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {genre.bestCountriesFor.map(({ countrySlug, reason }) => (
              <Link
                key={countrySlug}
                href={`/genres/${genre.slug}/${countrySlug}`}
                className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                  {countrySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{reason}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ContentCTA pageType="genre" context={{ name: genre.displayName }} />

      {/* FAQ */}
      <div className="mt-10" id="faq">
        <FaqSection faqs={genre.faqs} title={`${genre.displayName} Streaming FAQ`} />
      </div>

      {/* Related Links */}
      <div className="mt-10">
        <RelatedLinks sections={relatedSections} />
      </div>

      {/* Last Updated */}
      <p className="mt-10 text-xs text-muted-foreground/60">
        Last updated: {new Date(PROGRAMMATIC_PAGES_LAST_UPDATED).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>
    </main>
  );
}
