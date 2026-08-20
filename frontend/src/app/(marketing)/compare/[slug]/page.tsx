import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { comparisons, getComparisonBySlug } from '@/data/comparisons';
import { getPlatformBySlug } from '@/data/platforms';
import { buildPageMetadata, enhanceDescription } from '@/lib/seo/marketing-metadata';
import { getComparisonGovernance } from '@/lib/seo/page-governance';
import { buildCompareRelatedSections } from '@/lib/seo/related-links';
import { generateComparisonPageSchema, generateSpeakableSchema } from '@/lib/seo/schema-markup';
import { SITE_URL, PROGRAMMATIC_PAGES_LAST_UPDATED } from '@/lib/seo/site-config';
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
  return comparisons.map(c => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const comparison = getComparisonBySlug(slug);
  if (!comparison) {
    return buildPageMetadata({
      title: 'Comparison Not Found',
      description: 'This comparison page could not be found.',
      path: `/compare/${slug}`,
    });
  }

  const [platformASlug, platformBSlug] = comparison.platformSlugs;
  const platformAData = getPlatformBySlug(platformASlug);
  const platformBData = getPlatformBySlug(platformBSlug);
  const governance = getComparisonGovernance(comparison);
  const platformAName = platformAData?.name ?? platformASlug;
  const platformBName = platformBData?.name ?? platformBSlug;
  const description = comparison.seoDescription
    ?? `Compare ${platformAName} vs ${platformBName}: pricing, content library, features, and availability across 57 countries. Find out which streaming service is right for you.`;

  const year = new Date().getFullYear();
  const baseTitle = comparison.seoTitle ?? comparison.headline;
  const title = baseTitle.includes(String(year)) ? baseTitle : `${baseTitle} [${year}]`;

  return buildPageMetadata({
    title,
    description: enhanceDescription(description, 'compare'),
    path: `/compare/${slug}`,
    noIndex: governance.indexing !== 'index',
    canonicalPath: governance.canonicalPath,
  });
}

export default async function ComparisonPage({ params }: Props) {
  const { slug } = await params;
  const comparison = getComparisonBySlug(slug);
  if (!comparison) notFound();

  const [platformASlug, platformBSlug] = comparison.platformSlugs;
  const platformA = getPlatformBySlug(platformASlug);
  const platformB = getPlatformBySlug(platformBSlug);
  const chooseAIf = comparison.comparisonPoints
    .filter(point => point.winner === 'a')
    .slice(0, 3);
  const chooseBIf = comparison.comparisonPoints
    .filter(point => point.winner === 'b')
    .slice(0, 3);

  const comparisonSchema = generateComparisonPageSchema({
    title: comparison.headline,
    description: comparison.introduction,
    url: `${SITE_URL}/compare/${comparison.slug}`,
    platforms: [platformA?.name ?? platformASlug, platformB?.name ?? platformBSlug],
    comparisonPoints: comparison.comparisonPoints,
  });

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Compare', href: '/compare' },
    { label: `${platformA?.name ?? platformASlug} vs ${platformB?.name ?? platformBSlug}`, href: `/compare/${comparison.slug}` },
  ];

  const relatedSections = buildCompareRelatedSections(comparison);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={[comparisonSchema, generateSpeakableSchema(`${SITE_URL}/compare/${comparison.slug}`)]} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">{comparison.headline}</h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">{comparison.introduction}</p>

        <div id="verdict" className="bluf-summary mt-6 rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground mb-1">Quick Verdict</p>
          <p>{comparison.verdict}</p>
        </div>
      </div>

      <section id="comparison" className="mt-10">
        <h2 id="comparison-heading" className="text-2xl font-bold text-foreground mb-6">Side-by-Side Comparison</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-foreground">Category</th>
                <th className="px-6 py-4 text-left font-semibold text-primary">
                  {platformA?.name ?? platformASlug}
                </th>
                <th className="px-6 py-4 text-left font-semibold text-accent-cyan">
                  {platformB?.name ?? platformBSlug}
                </th>
                <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Winner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {comparison.comparisonPoints.map((point, index) => (
                <tr key={index} className="hover:bg-muted">
                  <td className="px-6 py-4 font-medium text-foreground">{point.category}</td>
                  <td className="px-6 py-4 text-muted-foreground">{point.platformA}</td>
                  <td className="px-6 py-4 text-muted-foreground">{point.platformB}</td>
                  <td className="px-6 py-4">
                    {point.winner === 'a' && (
                      <span className="text-primary font-medium">{platformA?.name ?? platformASlug}</span>
                    )}
                    {point.winner === 'b' && (
                      <span className="text-accent-cyan font-medium">{platformB?.name ?? platformBSlug}</span>
                    )}
                    {point.winner === 'tie' && (
                      <span className="text-muted-foreground/60">Tie</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="our-verdict" className="mt-10">
        <h2 id="our-verdict-heading" className="text-2xl font-bold text-foreground">Our Verdict</h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">{comparison.verdict}</p>
      </section>

      <section id="fit" className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">Choose {platformA?.name ?? platformASlug} if…</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {chooseAIf.map(point => (
              <li key={point.category} className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <span>
                  <strong className="text-foreground">{point.category}:</strong> {point.platformA}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">Choose {platformB?.name ?? platformBSlug} if…</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {chooseBIf.map(point => (
              <li key={point.category} className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-cyan" />
                <span>
                  <strong className="text-foreground">{point.category}:</strong> {point.platformB}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ContentCTA pageType="compare" />

      {comparison.faqs.length > 0 && (
        <div id="faq">
          <FaqSection faqs={comparison.faqs} />
        </div>
      )}

      <RelatedLinks sections={relatedSections} />

      <p className="mt-10 text-xs text-muted-foreground/60">
        Last updated: {new Date(PROGRAMMATIC_PAGES_LAST_UPDATED).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>
    </main>
  );
}
