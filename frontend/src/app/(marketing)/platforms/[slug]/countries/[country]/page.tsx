import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { platforms, getPlatformBySlug } from '@/data/platforms';
import { getCountryBySlug, getCountryByIso } from '@/data/countries';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { getPlatformCountryGovernance } from '@/lib/seo/page-governance';
import { buildPlatformCountryRelatedSections } from '@/lib/seo/related-links';
import { SITE_URL, CURRENT_YEAR } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { ContentCTA } from '@/components/cro/ContentCTA';
import { FaqSection } from '@/components/seo/FaqSection';
import { generatePlatformCountryFaqs } from '@/lib/seo/faq-generators';

interface Props {
  params: Promise<{ slug: string; country: string }>;
}

export const revalidate = 86400;

export async function generateStaticParams() {
  const params: Array<{ slug: string; country: string }> = [];
  platforms.forEach(platform => {
    platform.availableCountries.forEach(iso => {
      const country = getCountryByIso(iso);
      params.push({
        slug: platform.slug,
        country: country?.slug ?? iso.toLowerCase(),
      });
    });
  });
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: platformSlug, country: countrySlug } = await params;
  const platform = getPlatformBySlug(platformSlug);
  const country = getCountryBySlug(countrySlug);

  const governance = platform ? getPlatformCountryGovernance(platform) : null;

  if (!platform || !country) {
    return buildPageMetadata({
      title: 'Page Not Found',
      description: 'This page could not be found.',
      path: `/platforms/${platformSlug}/countries/${countrySlug}`,
    });
  }

  return buildPageMetadata({
    title: `${platform.name} in ${country.name}: Price, Library & How to Get It (${CURRENT_YEAR})`,
    description: `Everything about ${platform.name} in ${country.name}: subscription cost, available content, and how to sign up. Updated ${CURRENT_YEAR}.`,
    path: `/platforms/${platformSlug}/countries/${country.slug}`,
    canonicalPath: governance?.canonicalPath,
    noIndex: governance?.indexing !== 'index',
  });
}

export default async function PlatformCountryPage({ params }: Props) {
  const { slug: platformSlug, country: countrySlug } = await params;
  const platform = getPlatformBySlug(platformSlug);
  const country = getCountryBySlug(countrySlug);

  if (!platform || !country) notFound();

  const isAvailable = platform.availableCountries.includes(country.iso);

  const faqs = generatePlatformCountryFaqs({
    platformName: platform.name,
    countryName: country.name,
    isAvailable,
    startingPrice: platform.pricing.startsAt,
    currency: platform.pricing.currency,
    hasFreeTier: platform.pricing.hasFreeTier,
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${platform.name} in ${country.name}`,
    description: `${platform.name} availability and pricing in ${country.name}.`,
    url: `${SITE_URL}/platforms/${platform.slug}/countries/${country.slug}`,
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Platforms', href: '/platforms' },
    { label: platform.name, href: `/platforms/${platform.slug}` },
    { label: country.name, href: `/platforms/${platform.slug}/countries/${country.slug}` },
  ];

  const relatedSections = buildPlatformCountryRelatedSections(platform, country);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={pageSchema} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">
          {platform.name} in {country.name}
        </h1>
      </div>

      <div className="mt-6">
        {isAvailable ? (
          <div className="rounded-xl bg-success/5 border border-success/30 p-6">
            <div className="flex items-center gap-3">
              <svg className="h-6 w-6 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <h2 className="text-lg font-semibold text-success">
                {platform.name} is available in {country.name}
              </h2>
            </div>
            <p className="mt-3 text-success">
              {platform.name} offers its service in {country.name} ({country.iso}). Pricing may vary from other markets.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-destructive/5 border border-destructive/30 p-6">
            <h2 className="text-lg font-semibold text-destructive">
              {platform.name} is not available in {country.name}
            </h2>
            <p className="mt-3 text-destructive">
              {platform.name} does not currently offer its service in {country.name}. See alternatives below.
            </p>
          </div>
        )}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-foreground">About {platform.name}</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">{platform.longDescription}</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground">Key Features</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {platform.features.map(feature => (
                <li key={feature} className="flex items-center gap-2 text-muted-foreground">
                  <svg className="h-5 w-5 text-success shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground">Streaming in {country.name}</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">{country.streamingLandscape}</p>
          </section>
        </div>

        <aside>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold text-foreground">Pricing</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Starting at</span>
                <span className="font-semibold">
                  {platform.pricing.hasFreeTier
                    ? 'Free'
                    : `${platform.pricing.currency} ${platform.pricing.startsAt}/mo`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Free tier</span>
                <span className={platform.pricing.hasFreeTier ? 'text-success font-medium' : 'text-muted-foreground/60'}>
                  {platform.pricing.hasFreeTier ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            {isAvailable && (
              <a
                href={platform.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 block w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
              >
                Visit {platform.name}
              </a>
            )}
          </div>
        </aside>
      </div>

      <div className="mt-12">
        <FaqSection faqs={faqs} title={`${platform.name} in ${country.name} FAQ`} />
      </div>

      <ContentCTA pageType="platform" context={{ name: platform.name }} />

      <div className="mt-12">
        <RelatedLinks sections={relatedSections} />
      </div>
    </main>
  );
}
