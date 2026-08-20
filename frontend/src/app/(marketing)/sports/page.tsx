import { Metadata } from 'next';
import Link from 'next/link';
import { sports, SportCategory } from '@/data/sports';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { SITE_URL } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { buildSportIndexSections } from '@/lib/seo/related-links';

const SPORT_CATEGORY_LABELS: Record<SportCategory, string> = {
  football: 'Football',
  basketball: 'Basketball',
  motorsport: 'Motorsport',
  combat: 'Combat Sports',
  cricket: 'Cricket',
  tennis: 'Tennis',
  'american-football': 'American Football',
  rugby: 'Rugby',
  other: 'Other Sports',
};

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Sports Streaming Guide 2026  -  Watch Live Sports Online',
    description:
      'Find the cheapest way to watch live sports online. Compare streaming prices for Premier League, NBA, F1, UFC, NFL, and more across 57 countries.',
    path: '/sports',
    keywords: [
      'sports streaming',
      'watch live sports online',
      'sports streaming prices',
      'cheapest sports streaming',
    ],
  });
}

export default function SportsPage() {
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Sports Streaming Guide 2026',
    description:
      'Compare streaming prices and availability for live sports across 57 countries.',
    url: `${SITE_URL}/sports`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: sports.map((sport, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: sport.name,
        url: `${SITE_URL}/sports/${sport.slug}`,
      })),
    },
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Sports', href: '/sports' },
  ];

  // Group sports by category
  const grouped = sports.reduce<Record<SportCategory, typeof sports>>(
    (acc, sport) => {
      if (!acc[sport.category]) {
        acc[sport.category] = [];
      }
      acc[sport.category].push(sport);
      return acc;
    },
    {} as Record<SportCategory, typeof sports>,
  );

  const activeCategories = (Object.keys(grouped) as SportCategory[]).sort(
    (a, b) => SPORT_CATEGORY_LABELS[a].localeCompare(SPORT_CATEGORY_LABELS[b]),
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={collectionSchema} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">
          Sports Streaming Guide 2026
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Find the cheapest way to watch live sports online. Compare streaming
          prices and availability across 57 countries.
        </p>
      </div>

      {activeCategories.map((category) => (
        <section key={category} className="mt-12">
          <h2 className="text-2xl font-bold text-foreground">
            {SPORT_CATEGORY_LABELS[category]}
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {grouped[category].map((sport) => {
              const cheapest = sport.regionalPricing.length > 0
                ? sport.regionalPricing.reduce((min, p) =>
                    p.price < min.price ? p : min,
                  )
                : null;

              return (
                <Link
                  key={sport.slug}
                  href={`/sports/${sport.slug}`}
                  className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {sport.name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {sport.shortDescription}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    {cheapest ? (
                      <span className="text-sm font-medium text-primary">
                        {cheapest.price === 0
                          ? 'Free available'
                          : `From ${cheapest.currency} ${cheapest.price}/mo`}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground/60">
                        Pricing varies
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground/60">
                      {sport.regionalPricing.length} options
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <RelatedLinks sections={buildSportIndexSections()} />
    </main>
  );
}
