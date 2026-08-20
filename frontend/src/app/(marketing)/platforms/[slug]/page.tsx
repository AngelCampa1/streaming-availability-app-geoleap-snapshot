import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { platforms, getPlatformBySlug } from '@/data/platforms';
import { getCountryByIso } from '@/data/countries';
import { buildPageMetadata, enhanceDescription } from '@/lib/seo/marketing-metadata';
import { buildPlatformRelatedSections } from '@/lib/seo/related-links';
import { generateStreamingServiceSchema, generatePlatformProductSchema, generateSpeakableSchema } from '@/lib/seo/schema-markup';
import { PROGRAMMATIC_PAGES_LAST_UPDATED, SITE_URL, CURRENT_YEAR } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { FaqSection } from '@/components/seo/FaqSection';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { SocialShareLinks } from '@/components/seo/SocialShareLinks';
import { ContentCTA } from '@/components/cro/ContentCTA';
import { AdSlot } from '@/components/ads/AdSlot';
import { MonetizedPageView } from '@/components/ads/MonetizedPageView';
import { getAdSenseClient } from '@/lib/ads/config';

export const revalidate = 86400;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return platforms.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const platform = getPlatformBySlug(slug);
  if (!platform) {
    return buildPageMetadata({
      title: 'Platform Not Found',
      description: 'This streaming platform page could not be found.',
      path: `/platforms/${slug}`,
    });
  }

  return buildPageMetadata({
    title: `${platform.name}: Available Countries, Prices & Library Size (${CURRENT_YEAR})`,
    description: enhanceDescription(
      `Where does ${platform.name} work? Check availability across ${platform.availableCountries.length} countries, compare regional prices, and see what's in the library. Updated ${CURRENT_YEAR}.`,
      'platform',
    ),
    path: `/platforms/${slug}`,
  });
}

export default async function PlatformPage({ params }: Props) {
  const { slug } = await params;
  const platform = getPlatformBySlug(slug);
  if (!platform) notFound();
  const adSenseClient = getAdSenseClient();

  const serviceSchema = generateStreamingServiceSchema({
    name: platform.name,
    slug: platform.slug,
    description: platform.longDescription,
    url: platform.websiteUrl,
    wikipediaUrl: platform.wikipediaUrl,
    wikidataId: platform.wikidataId,
  });

  const productSchema = generatePlatformProductSchema({
    name: platform.name,
    slug: platform.slug,
    description: platform.longDescription,
    pricing: platform.pricing,
    availableCountries: platform.availableCountries,
    wikipediaUrl: platform.wikipediaUrl,
    wikidataId: platform.wikidataId,
  });

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Platforms', href: '/platforms' },
    { label: platform.name, href: `/platforms/${platform.slug}` },
  ];

  const relatedSections = buildPlatformRelatedSections(platform);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <MonetizedPageView pageType="platform" canonicalPath={`/platforms/${platform.slug}`} />
      <JsonLd data={[serviceSchema, productSchema, generateSpeakableSchema(`${SITE_URL}/platforms/${platform.slug}`)]} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">{platform.name}</h1>
        <p className="mt-4 text-xl text-muted-foreground">{platform.shortDescription}</p>

        <div className="bluf-summary mt-6 rounded-lg bg-muted border border-border p-4 text-sm text-foreground leading-relaxed">
          <p>
            {platform.name} is a {platform.pricing.hasFreeTier ? 'free' : 'subscription'} streaming service
            {platform.pricing.hasFreeTier
              ? ' with optional paid plans'
              : ` starting at ${platform.pricing.currency} ${platform.pricing.startsAt}/month`}, available in {platform.availableCountries.length}+ countries.{' '}
            {platform.name} offers {platform.features.slice(0, 3).join(', ').toLowerCase()}.
            {platform.contentHighlights.length > 0
              ? ` Popular titles include ${platform.contentHighlights.slice(0, 3).join(', ')}.`
              : ''}
            {platform.founded ? ` Founded in ${platform.founded}${platform.headquarters ? `, headquartered in ${platform.headquarters}` : ''}.` : ''}
          </p>
        </div>
        <AdSlot placement="top" pageType="platform" minHeight={250} adSenseClient={adSenseClient} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <section id="about">
            <h2 id="about-heading" className="text-2xl font-bold text-foreground">About {platform.name}</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">{platform.longDescription}</p>
          </section>

          <section id="features">
            <h2 id="features-heading" className="text-2xl font-bold text-foreground">Key Features</h2>
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

          {platform.contentHighlights.length > 0 && (
            <section id="content">
              <h2 id="content-heading" className="text-2xl font-bold text-foreground">Popular Content</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {platform.contentHighlights.map(title => (
                  <span key={title} className="rounded-full bg-primary/5 px-3 py-1 text-sm text-primary">
                    {title}
                  </span>
                ))}
              </div>
            </section>
          )}

          <ContentCTA pageType="platform" context={{ name: platform.name }} />

          <div id="faq">
            <FaqSection faqs={platform.faqs} title={`${platform.name} FAQ`} />
          </div>
        </div>

        <aside className="space-y-6">
          <AdSlot placement="sidebar" pageType="platform" minHeight={300} className="hidden lg:block" adSenseClient={adSenseClient} />

          <div id="pricing" className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold text-foreground">Pricing</h2>
            <div className="mt-4 space-y-3">
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Free trial</span>
                <span className={platform.pricing.hasTrial ? 'text-success font-medium' : 'text-muted-foreground/60'}>
                  {platform.pricing.hasTrial ? 'Available' : 'No'}
                </span>
              </div>
            </div>
            <a
              href={platform.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 block w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              Visit {platform.name}
            </a>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Available In</h3>
            <p className="mt-2 text-2xl font-bold text-foreground">{platform.availableCountries.length} countries</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {platform.availableCountries.slice(0, 10).map(iso => (
                <span key={iso} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {iso}
                </span>
              ))}
              {platform.availableCountries.length > 10 && (
                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  +{platform.availableCountries.length - 10} more
                </span>
              )}
            </div>
          </div>

          {platform.founded && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">About</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Founded</dt>
                  <dd className="font-medium text-foreground">{platform.founded}</dd>
                </div>
                {platform.headquarters && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Headquarters</dt>
                    <dd className="font-medium text-foreground text-right max-w-[60%]">{platform.headquarters}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </aside>
      </div>

      <div className="mt-12">
        <RelatedLinks sections={relatedSections} />
      </div>

      <div className="mt-8">
        <h2 id="countries" className="text-xl font-bold text-foreground mb-4">Available Countries</h2>
        <div className="flex flex-wrap gap-2">
          {platform.availableCountries
            .map(iso => getCountryByIso(iso))
            .filter((country): country is NonNullable<ReturnType<typeof getCountryByIso>> => Boolean(country))
            .map(country => (
              <Link
                key={country.iso}
                href={`/countries/${country.slug}`}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                {country.name}
              </Link>
            ))}
        </div>
      </div>

      <SocialShareLinks
        title={`${platform.name} Review  -  Pricing, Features & Countries`}
        url={`${SITE_URL}/platforms/${platform.slug}`}
      />

      <p className="mt-10 text-xs text-muted-foreground/60">
        Last updated: {new Date(PROGRAMMATIC_PAGES_LAST_UPDATED).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>
    </main>
  );
}
