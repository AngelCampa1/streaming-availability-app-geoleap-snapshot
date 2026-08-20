import { Metadata } from 'next';
import Link from 'next/link';
import { streamingGuides, GUIDE_CATEGORY_LABELS, GuideCategory } from '@/data/guides';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { generateCollectionPageSchema } from '@/lib/seo/schema-markup';
import { SITE_URL } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { buildGuideIndexSections } from '@/lib/seo/related-links';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Streaming Guides 2026  -  Expert How-To Guides',
    description:
      'Expert streaming guides covering money-saving strategies, setup tips, VPN legality, expat streaming, and international content. Save $1,200+/year with data-driven advice.',
    path: '/guides',
  });
}

export default function GuidesIndexPage() {
  const collectionSchema = generateCollectionPageSchema({
    title: 'GeoLeap Streaming Guides',
    description:
      'Expert how-to guides for streaming services, money saving, setup, and international content.',
    url: `${SITE_URL}/guides`,
    items: streamingGuides.map(g => ({
      name: g.title,
      url: `${SITE_URL}/guides/${g.slug}`,
    })),
  });

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Guides', href: '/guides' },
  ];

  const byCategory = streamingGuides.reduce<Record<GuideCategory, typeof streamingGuides>>(
    (acc, guide) => {
      if (!acc[guide.category]) acc[guide.category] = [];
      acc[guide.category].push(guide);
      return acc;
    },
    {} as Record<GuideCategory, typeof streamingGuides>,
  );

  const categoryOrder: GuideCategory[] = [
    'money-saving',
    'lifestyle',
    'setup',
    'technology',
    'legal',
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={collectionSchema} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">Streaming Guides</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Expert how-to guides for saving money, setting up 4K streaming, navigating
          international content, and understanding streaming legality.
        </p>
      </div>

      <div className="mt-12 space-y-12">
        {categoryOrder
          .filter(cat => byCategory[cat]?.length > 0)
          .map(category => (
            <section key={category}>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                {GUIDE_CATEGORY_LABELS[category]}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {byCategory[category].map(guide => (
                  <Link
                    key={guide.slug}
                    href={`/guides/${guide.slug}`}
                    className="group rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/60 mb-2">
                      <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-accent-cyan font-medium">
                        {GUIDE_CATEGORY_LABELS[guide.category]}
                      </span>
                      <span>{guide.readingTime} min read</span>
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {guide.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {guide.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
      </div>

      <RelatedLinks sections={buildGuideIndexSections()} />
    </main>
  );
}
