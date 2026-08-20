import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { comparisons, getComparisonBySlug } from '@/data/comparisons';
import { countries, getCountryBySlug } from '@/data/countries';
import { getPlatformBySlug } from '@/data/platforms';
import { buildPageMetadata, enhanceDescription } from '@/lib/seo/marketing-metadata';
import { getComparisonCountryGovernance } from '@/lib/seo/page-governance';
import { buildCompareInCountryRelatedSections } from '@/lib/seo/related-links';
import { generateComparisonPageSchema, generateSpeakableSchema } from '@/lib/seo/schema-markup';
import { SITE_URL, PROGRAMMATIC_PAGES_LAST_UPDATED, CURRENT_YEAR } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { FaqSection } from '@/components/seo/FaqSection';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { ContentCTA } from '@/components/cro/ContentCTA';

interface Props {
  params: Promise<{ slug: string; country: string }>;
}

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Array<{ slug: string; country: string }>> {
  return comparisons.flatMap(c =>
    countries.map(country => ({ slug: c.slug, country: country.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, country: countrySlug } = await params;
  const comparison = getComparisonBySlug(slug);
  const country = getCountryBySlug(countrySlug);

  if (!comparison || !country) {
    return buildPageMetadata({
      title: 'Comparison Not Found',
      description: 'This comparison page could not be found.',
      path: `/compare/${slug}/in/${countrySlug}`,
    });
  }

  const [platformASlug, platformBSlug] = comparison.platformSlugs;
  const governance = getComparisonCountryGovernance(comparison);
  const platformAData = getPlatformBySlug(platformASlug);
  const platformBData = getPlatformBySlug(platformBSlug);
  const platformAName = platformAData?.name ?? platformASlug;
  const platformBName = platformBData?.name ?? platformBSlug;

  const title = `${platformAName} vs ${platformBName} in ${country.name}: Which to Get (${CURRENT_YEAR})`;
  const description = `Comparing ${platformAName} and ${platformBName} in ${country.name}: prices, content library, and availability. See which one is better in your region.`;

  return buildPageMetadata({
    title,
    description: enhanceDescription(description, 'compare'),
    path: `/compare/${slug}/in/${countrySlug}`,
    canonicalPath: governance.canonicalPath,
    noIndex: governance.indexing !== 'index',
  });
}

export default async function CountryComparisonPage({ params }: Props) {
  const { slug, country: countrySlug } = await params;
  const comparison = getComparisonBySlug(slug);
  const country = getCountryBySlug(countrySlug);

  if (!comparison || !country) notFound();

  const [platformASlug, platformBSlug] = comparison.platformSlugs;
  const platformA = getPlatformBySlug(platformASlug);
  const platformB = getPlatformBySlug(platformBSlug);

  const platformAName = platformA?.name ?? platformASlug;
  const platformBName = platformB?.name ?? platformBSlug;

  const platformAAvailable = platformA?.availableCountries.includes(country.iso) ?? false;
  const platformBAvailable = platformB?.availableCountries.includes(country.iso) ?? false;

  const countryFaqAnswer = (() => {
    if (platformAAvailable && platformBAvailable) {
      return comparison.verdict;
    }
    if (platformAAvailable) {
      return `Only ${platformAName} is available in ${country.name}.`;
    }
    if (platformBAvailable) {
      return `Only ${platformBName} is available in ${country.name}.`;
    }
    return `Neither ${platformAName} nor ${platformBName} is officially available in ${country.name}.`;
  })();

  const countryFaq = {
    question: `Which is better, ${platformAName} or ${platformBName} in ${country.name}?`,
    answer: countryFaqAnswer,
  };

  const allFaqs = [...comparison.faqs, countryFaq];

  const comparisonSchema = generateComparisonPageSchema({
    title: `${comparison.headline}: Best Choice in ${country.name}?`,
    description: comparison.introduction,
    url: `${SITE_URL}/compare/${comparison.slug}/in/${country.slug}`,
    platforms: [platformAName, platformBName],
    comparisonPoints: comparison.comparisonPoints,
  });

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Compare', href: '/compare' },
    { label: `${platformAName} vs ${platformBName}`, href: `/compare/${comparison.slug}` },
    { label: country.name, href: `/compare/${comparison.slug}/in/${country.slug}` },
  ];

  const relatedSections = buildCompareInCountryRelatedSections(comparison, country);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={[comparisonSchema, generateSpeakableSchema(`${SITE_URL}/compare/${comparison.slug}/in/${country.slug}`)]} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">
          {comparison.headline}: Best Choice in {country.name}?
        </h1>
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
                  {platformAName}
                </th>
                <th className="px-6 py-4 text-left font-semibold text-accent-cyan">
                  {platformBName}
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
                      <span className="text-primary font-medium">{platformAName}</span>
                    )}
                    {point.winner === 'b' && (
                      <span className="text-accent-cyan font-medium">{platformBName}</span>
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

      <section id="availability" className="mt-10">
        <h2 id="availability-heading" className="text-2xl font-bold text-foreground mb-4">
          Availability in {country.name}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={`rounded-lg border p-5 ${platformAAvailable ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
            <p className="font-semibold text-foreground">{platformAName}</p>
            <p className={`mt-1 text-sm font-medium ${platformAAvailable ? 'text-success' : 'text-destructive'}`}>
              {platformAAvailable ? `Available in ${country.name}` : `Not available in ${country.name}`}
            </p>
            {!platformAAvailable && (
              <p className="mt-2 text-xs text-muted-foreground">
                {platformAName} is not officially offered in {country.name}. Check official availability, local alternatives, and the platform's current travel and account rules.
              </p>
            )}
          </div>
          <div className={`rounded-lg border p-5 ${platformBAvailable ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
            <p className="font-semibold text-foreground">{platformBName}</p>
            <p className={`mt-1 text-sm font-medium ${platformBAvailable ? 'text-success' : 'text-destructive'}`}>
              {platformBAvailable ? `Available in ${country.name}` : `Not available in ${country.name}`}
            </p>
            {!platformBAvailable && (
              <p className="mt-2 text-xs text-muted-foreground">
                {platformBName} is not officially offered in {country.name}. Check official availability, local alternatives, and the platform's current travel and account rules.
              </p>
            )}
          </div>
        </div>
      </section>

      <section id="our-verdict" className="mt-10">
        <h2 id="our-verdict-heading" className="text-2xl font-bold text-foreground">Our Verdict</h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">{comparison.verdict}</p>
      </section>

      <ContentCTA pageType="compare" />

      {allFaqs.length > 0 && (
        <div id="faq">
          <FaqSection faqs={allFaqs} />
        </div>
      )}

      <RelatedLinks sections={relatedSections} />

      <p className="mt-10 text-xs text-muted-foreground/60">
        Last updated: {new Date(PROGRAMMATIC_PAGES_LAST_UPDATED).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>
    </main>
  );
}
