import { Metadata } from 'next';
import Link from 'next/link';
import { genreGuides, GenreCategory } from '@/data/genres';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { generateCollectionPageSchema } from '@/lib/seo/schema-markup';
import { SITE_URL } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { buildGenreIndexSections } from '@/lib/seo/related-links';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Streaming Genre Guides 2026  -  Find the Best Platform for Any Genre',
    description:
      'Explore 18 streaming genre guides  -  from anime and K-drama to true crime and sci-fi. Find the best platform, trending titles, and viewing stats for every genre.',
    path: '/genres',
  });
}

const categoryLabels: Record<GenreCategory, string> = {
  international: 'International & Regional',
  niche: 'Niche & Specialty',
  mainstream: 'Mainstream & Popular',
  documentary: 'Documentary & Factual',
  family: 'Family & Kids',
};

const categoryOrder: GenreCategory[] = ['mainstream', 'international', 'niche', 'documentary', 'family'];

export default function GenresPage() {
  const collectionSchema = generateCollectionPageSchema({
    title: 'Streaming Genre Guides 2026',
    description: 'Find the best streaming platform for any genre  -  18 in-depth guides with viewing stats and trending titles.',
    url: `${SITE_URL}/genres`,
    items: genreGuides.map(g => ({
      name: g.displayName,
      url: `${SITE_URL}/genres/${g.slug}`,
    })),
  });

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Genres', href: '/genres' },
  ];

  const groupedGenres = categoryOrder.map(category => ({
    category,
    label: categoryLabels[category],
    genres: genreGuides.filter(g => g.category === category),
  }));

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={collectionSchema} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">
          Streaming Genre Guides 2026
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Find the best streaming platform for any genre. Explore viewing stats, trending titles, and platform rankings across 18 genres.
        </p>
      </div>

      {groupedGenres.map(({ category, label, genres }) => (
        <section key={category} className="mt-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">{label}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {genres.map(genre => {
              const topPlatform = genre.bestPlatforms[0];
              return (
                <Link
                  key={genre.slug}
                  href={`/genres/${genre.slug}`}
                  className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {genre.displayName}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {genre.shortDescription}
                  </p>
                  <div className="mt-4 space-y-1">
                    <p className="text-xs text-primary font-medium line-clamp-1">
                      {genre.viewingStats}
                    </p>
                    {topPlatform && (
                      <p className="text-xs text-muted-foreground/60">
                        Top platform: {topPlatform.platformSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} ({topPlatform.librarySize})
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <RelatedLinks sections={buildGenreIndexSections()} />
    </main>
  );
}
