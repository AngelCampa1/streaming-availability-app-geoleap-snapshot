import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { platforms, getPlatformBySlug } from '@/data/platforms';
import { genreGuides, getGenreBySlug } from '@/data/genres';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { generateSpeakableSchema } from '@/lib/seo/schema-markup';
import { SITE_URL, PROGRAMMATIC_PAGES_LAST_UPDATED, CURRENT_YEAR } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { FaqSection } from '@/components/seo/FaqSection';
import { ContentCTA } from '@/components/cro/ContentCTA';

interface Props {
  params: Promise<{ slug: string; genre: string }>;
}

export async function generateStaticParams() {
  return platforms.flatMap(platform =>
    genreGuides.map(genre => ({ slug: platform.slug, genre: genre.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, genre: genreParam } = await params;
  const platform = getPlatformBySlug(slug);
  const genre = getGenreBySlug(genreParam);

  if (!platform || !genre) {
    return buildPageMetadata({
      title: 'Page Not Found',
      description: 'This page could not be found.',
      path: `/platforms/${slug}/genres/${genreParam}`,
    });
  }

  return buildPageMetadata({
    title: `Best ${genre.displayName} on ${platform.name}: Top Shows & Movies to Watch (${CURRENT_YEAR})`,
    description: `${platform.name} ${genre.displayName.toLowerCase()} library ranked and compared across countries. Find the best ${genre.displayName.toLowerCase()} shows and movies on ${platform.name}  -  updated ${CURRENT_YEAR}.`,
    path: `/platforms/${slug}/genres/${genreParam}`,
    keywords: [
      `${genre.displayName.toLowerCase()} on ${platform.name}`,
      `best ${genre.displayName.toLowerCase()} ${platform.name}`,
      `${platform.name} ${genre.displayName.toLowerCase()} shows`,
      `${platform.name} ${genre.displayName.toLowerCase()} movies`,
    ],
    dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
  });
}

export default async function PlatformGenrePage({ params }: Props) {
  const { slug, genre: genreParam } = await params;
  const platform = getPlatformBySlug(slug);
  const genre = getGenreBySlug(genreParam);

  if (!platform || !genre) notFound();

  // Determine whether this platform is a top pick for this genre
  const topPickEntry = genre.bestPlatforms.find(
    bp => bp.platformSlug === platform.slug,
  );
  const isTopPick = topPickEntry !== undefined;
  const rankIndex = genre.bestPlatforms.findIndex(
    bp => bp.platformSlug === platform.slug,
  );

  // Other platforms listed as top picks for this genre (excluding the current one)
  const otherGenrePlatforms = genre.bestPlatforms
    .filter(bp => bp.platformSlug !== platform.slug)
    .slice(0, 5)
    .map(bp => {
      const p = platforms.find(pl => pl.slug === bp.platformSlug);
      return { slug: bp.platformSlug, name: p?.name ?? bp.platformSlug };
    });

  // Pick up to 4 country links from genre.bestCountriesFor
  const countryLinks = genre.bestCountriesFor.slice(0, 4);

  // Build FAQs
  const faqs = [
    {
      question: `Does ${platform.name} have ${genre.displayName.toLowerCase()} content?`,
      answer: isTopPick
        ? `Yes. ${platform.name} is one of the top platforms for ${genre.displayName.toLowerCase()}, with ${topPickEntry.librarySize}. Strengths include: ${topPickEntry.strengths.join(', ')}.`
        : `${platform.name} carries some ${genre.displayName.toLowerCase()} content as part of its broader library, though dedicated platforms like ${genre.bestPlatforms[0] ? (platforms.find(p => p.slug === genre.bestPlatforms[0].platformSlug)?.name ?? genre.bestPlatforms[0].platformSlug) : 'others'} offer larger catalogs.`,
    },
    {
      question: `What is the best platform for ${genre.displayName.toLowerCase()} streaming?`,
      answer: genre.bestPlatforms.length > 0
        ? `${platforms.find(p => p.slug === genre.bestPlatforms[0].platformSlug)?.name ?? genre.bestPlatforms[0].platformSlug} leads for ${genre.displayName.toLowerCase()} with ${genre.bestPlatforms[0].librarySize}. ${platform.name} is ${isTopPick ? `ranked #${rankIndex + 1} among the top choices` : 'also a strong option for general streaming'}.`
        : `${platform.name} is a solid choice for ${genre.displayName.toLowerCase()} content.`,
    },
    {
      question: `How much does ${platform.name} cost for ${genre.displayName.toLowerCase()} content?`,
      answer: platform.pricing.hasFreeTier
        ? `${platform.name} offers a free tier with optional paid plans. All ${genre.displayName.toLowerCase()} content included in the library is accessible based on your subscription tier.`
        : `${platform.name} starts at ${platform.pricing.currency} ${platform.pricing.startsAt}/month. All ${genre.displayName.toLowerCase()} content in the catalog is included with any plan.`,
    },
  ];

  // JSON-LD schemas
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best ${genre.displayName} on ${platform.name}`,
    description: `Top ${genre.displayName.toLowerCase()} content available on ${platform.name}`,
    url: `${SITE_URL}/platforms/${platform.slug}/genres/${genre.slug}`,
    ...(isTopPick && topPickEntry.exclusiveHighlights.length > 0
      ? {
          itemListElement: topPickEntry.exclusiveHighlights.map((title, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: title,
          })),
        }
      : genre.trendingTitles.length > 0
        ? {
            itemListElement: genre.trendingTitles.slice(0, 5).map((title, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: title,
            })),
          }
        : {}),
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Platforms', href: '/platforms' },
    { label: platform.name, href: `/platforms/${platform.slug}` },
    {
      label: genre.displayName,
      href: `/platforms/${platform.slug}/genres/${genre.slug}`,
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd
        data={[
          itemListSchema,
          faqSchema,
          generateSpeakableSchema(
            `${SITE_URL}/platforms/${platform.slug}/genres/${genre.slug}`,
          ),
        ]}
      />
      <Breadcrumbs items={breadcrumbs} />

      {/* Hero */}
      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">
          Best {genre.displayName} on {platform.name}
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">
          {genre.shortDescription}
        </p>

        {/* BLUF summary */}
        <div className="bluf-summary mt-6 rounded-lg bg-muted border border-border p-4 text-sm text-foreground leading-relaxed">
          <p>
            {isTopPick ? (
              <>
                <strong>{platform.name}</strong> is ranked{' '}
                <strong>#{rankIndex + 1}</strong> for{' '}
                {genre.displayName.toLowerCase()} streaming with{' '}
                {topPickEntry.librarySize}.{' '}
                {topPickEntry.strengths.length > 0 && (
                  <>Key strengths: {topPickEntry.strengths.join(', ')}.</>
                )}
              </>
            ) : (
              <>
                <strong>{platform.name}</strong> carries{' '}
                {genre.displayName.toLowerCase()} content as part of its
                broader library.{' '}
                {genre.bestPlatforms.length > 0 && (
                  <>
                    The top dedicated platform for this genre is{' '}
                    {platforms.find(
                      p => p.slug === genre.bestPlatforms[0].platformSlug,
                    )?.name ?? genre.bestPlatforms[0].platformSlug}{' '}
                    with {genre.bestPlatforms[0].librarySize}.
                  </>
                )}
              </>
            )}{' '}
            {genre.viewingStats}.
          </p>
        </div>
      </div>

      {/* Why [Platform] for [Genre] */}
      <section className="mt-10" id="why">
        <h2 className="text-2xl font-bold text-foreground">
          Why {platform.name} for {genre.displayName}?
        </h2>
        {isTopPick ? (
          <div className="mt-4 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              {platform.name} ranks #{rankIndex + 1} among the best platforms
              for {genre.displayName.toLowerCase()}. With {topPickEntry.librarySize}, it
              offers one of the strongest {genre.displayName.toLowerCase()} catalogs
              available.
            </p>
            {topPickEntry.strengths.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Strengths for {genre.displayName}
                </h3>
                <ul className="space-y-2">
                  {topPickEntry.strengths.map(strength => (
                    <li
                      key={strength}
                      className="flex items-center gap-2 text-muted-foreground"
                    >
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
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {topPickEntry.exclusiveHighlights.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Notable {genre.displayName} Titles on {platform.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {topPickEntry.exclusiveHighlights.map(title => (
                    <span
                      key={title}
                      className="rounded-full bg-primary/5 px-3 py-1 text-sm text-primary"
                    >
                      {title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              {platform.name} is a general streaming service with a wide
              content library that includes {genre.displayName.toLowerCase()}{' '}
              titles. While not a specialist platform for this genre, its broad
              catalog makes it worth checking for{' '}
              {genre.displayName.toLowerCase()} content alongside other
              services.
            </p>
            {platform.contentHighlights.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Popular Content on {platform.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {platform.contentHighlights.slice(0, 6).map(title => (
                    <span
                      key={title}
                      className="rounded-full bg-primary/5 px-3 py-1 text-sm text-primary"
                    >
                      {title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Also available on */}
      {otherGenrePlatforms.length > 0 && (
        <section className="mt-10" id="also-available">
          <h2 className="text-2xl font-bold text-foreground">
            Also Available On
          </h2>
          <p className="mt-2 text-muted-foreground">
            Other top platforms for {genre.displayName.toLowerCase()} streaming:
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {otherGenrePlatforms.map(p => (
              <Link
                key={p.slug}
                href={`/platforms/${p.slug}/genres/${genre.slug}`}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Trending titles for this genre */}
      {genre.trendingTitles.length > 0 && (
        <section className="mt-10" id="trending">
          <h2 className="text-2xl font-bold text-foreground">
            Trending {genre.displayName} Titles
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
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

      <ContentCTA pageType="genre" context={{ name: genre.displayName }} />

      {/* FAQ */}
      <div className="mt-10" id="faq">
        <FaqSection
          faqs={faqs}
          title={`${genre.displayName} on ${platform.name} FAQ`}
        />
      </div>

      {/* Internal links */}
      <section className="mt-10" id="explore-more">
        <h2 className="text-xl font-bold text-foreground mb-4">Explore More</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/genres/${genre.slug}`}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            All {genre.displayName} streaming
          </Link>
          <Link
            href={`/platforms/${platform.slug}`}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            About {platform.name}
          </Link>
          {countryLinks.map(({ countrySlug }) => (
            <Link
              key={countrySlug}
              href={`/genres/${genre.slug}/${countrySlug}`}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              {genre.displayName} in{' '}
              {countrySlug
                .replace(/-/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase())}
            </Link>
          ))}
        </div>
      </section>

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
