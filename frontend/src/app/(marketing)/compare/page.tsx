import { Metadata } from 'next';
import Link from 'next/link';
import { comparisons } from '@/data/comparisons';
import { platforms } from '@/data/platforms';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { generateCollectionPageSchema } from '@/lib/seo/schema-markup';
import { generateComparisonUrl } from '@/lib/seo/url-generation';
import { SITE_URL } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { FaqSection } from '@/components/seo/FaqSection';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { buildCompareIndexSections } from '@/lib/seo/related-links';

const MAJOR_PLATFORMS = [
  'netflix', 'disney-plus', 'hbo-max', 'amazon-prime-video',
  'apple-tv-plus', 'hulu', 'paramount-plus', 'peacock',
  'espn-plus', 'crunchyroll', 'tubi', 'discovery-plus',
] as const;

const HUB_FAQS = [
  {
    question: 'What is the best streaming service in 2026?',
    answer: 'The best streaming service depends on what you watch. Netflix has the largest library. Disney+ is best for families. HBO Max leads in prestige drama. ESPN+ and Peacock are top picks for sports. Use our side-by-side comparisons to find the right fit.',
  },
  {
    question: 'Which streaming service has the most content?',
    answer: 'Tubi leads in total titles (50,000+) but most are older catalog content. Among paid services, Netflix (6,000+ titles) and Amazon Prime Video (7,000+) have the largest libraries of current content.',
  },
  {
    question: 'Can I use streaming services in other countries?',
    answer: 'Most streaming services are geo-restricted. Availability, pricing, and content libraries vary by country. Our comparison pages show availability for each service across 57 countries so you can check before subscribing.',
  },
  {
    question: 'What is the cheapest streaming service?',
    answer: 'Tubi and Pluto TV are completely free. Among paid services, Paramount+ ($5.99/mo) and Peacock ($7.99/mo) are the most affordable. Netflix, Disney+, and Hulu all start around $7-8/mo with ads.',
  },
];

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Streaming Services Comparison: Side-by-Side Guide (2026)',
    description:
      `${comparisons.length}+ streaming comparisons side-by-side: Netflix, Disney+, HBO Max, Hulu, and more. Pricing, content, availability across 57 countries.`,
    path: '/compare',
  });
}

export default function ComparePage() {
  const collectionSchema = generateCollectionPageSchema({
    title: 'Streaming Service Comparisons',
    description: 'Side-by-side comparisons of all major streaming platforms.',
    url: `${SITE_URL}/compare`,
    items: comparisons.map(c => ({
      name: c.headline,
      url: generateComparisonUrl(c.slug),
    })),
  });

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Compare', href: '/compare' },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={collectionSchema} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">Streaming Services Comparison</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          {comparisons.length}+ side-by-side streaming comparisons across pricing, content, and availability in 57 countries.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-foreground mb-4">Quick Comparison: Major Platforms</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Service</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Starting Price</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Countries</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Free Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MAJOR_PLATFORMS.map(slug => {
                const p = platforms.find(pl => pl.slug === slug);
                if (!p) return null;
                return (
                  <tr key={slug} className="hover:bg-muted">
                    <td className="px-4 py-3">
                      <Link href={`/platforms/${slug}`} className="font-medium text-primary hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.pricing.hasFreeTier ? 'Free' : `${p.pricing.currency}${p.pricing.startsAt}/mo`}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.availableCountries.length}+</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.pricing.hasFreeTier ? 'Yes' : 'No'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground mb-4">All Comparisons</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {comparisons.map(comparison => {
            const [platformASlug, platformBSlug] = comparison.platformSlugs;
            const platformA = platforms.find(p => p.slug === platformASlug);
            const platformB = platforms.find(p => p.slug === platformBSlug);

            return (
              <Link
                key={comparison.slug}
                href={`/compare/${comparison.slug}`}
                className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-semibold text-foreground">{platformA?.name ?? platformASlug}</span>
                  <span className="text-muted-foreground/60">vs</span>
                  <span className="font-semibold text-foreground">{platformB?.name ?? platformBSlug}</span>
                </div>
                <h2 className="text-sm text-muted-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {comparison.headline}
                </h2>
                <p className="mt-3 text-xs text-primary font-medium">
                  {comparison.comparisonPoints.length} comparison points →
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <FaqSection faqs={HUB_FAQS} />

      <RelatedLinks sections={buildCompareIndexSections()} />
    </main>
  );
}
