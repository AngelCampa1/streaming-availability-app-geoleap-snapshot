import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { countries, getCountryBySlug } from '@/data/countries';
import { platforms } from '@/data/platforms';
import { buildPageMetadata, enhanceDescription } from '@/lib/seo/marketing-metadata';
import { buildCountryRelatedSections } from '@/lib/seo/related-links';
import { SITE_URL, PROGRAMMATIC_PAGES_LAST_UPDATED, CURRENT_YEAR } from '@/lib/seo/site-config';
import { generateSpeakableSchema } from '@/lib/seo/schema-markup';
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
  return countries.map(c => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const country = getCountryBySlug(slug);
  if (!country) {
    return buildPageMetadata({
      title: 'Country Not Found',
      description: 'This country page could not be found.',
      path: `/countries/${slug}`,
    });
  }

  return buildPageMetadata({
    title: `Streaming in ${country.name}: Services, Prices & What's Available (${CURRENT_YEAR})`,
    description: enhanceDescription(
      `Which streaming services work in ${country.name}? Full list of available platforms, local prices, and what expats can access. Updated ${CURRENT_YEAR}.`,
      'country',
    ),
    path: `/countries/${slug}`,
  });
}

export default async function CountryPage({ params }: Props) {
  const { slug } = await params;
  const country = getCountryBySlug(slug);
  if (!country) notFound();
  const adSenseClient = getAdSenseClient();

  const countrySchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Streaming Services in ${country.name}`,
    description: `Guide to streaming services available in ${country.name}.`,
    url: `${SITE_URL}/countries/${country.slug}`,
    dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
    about: {
      '@type': 'Country',
      name: country.name,
      identifier: country.iso,
    },
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Countries', href: '/countries' },
    { label: country.name, href: `/countries/${country.slug}` },
  ];

  const availablePlatformData = country.availablePlatforms
    .map(s => platforms.find(p => p.slug === s))
    .filter(Boolean) as typeof platforms;

  const topPlatformData = country.topPlatforms
    .map(s => platforms.find(p => p.slug === s))
    .filter(Boolean) as typeof platforms;

  const relatedSections = buildCountryRelatedSections(country);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <MonetizedPageView pageType="country" canonicalPath={`/countries/${country.slug}`} />
      <JsonLd data={[countrySchema, generateSpeakableSchema(`${SITE_URL}/countries/${country.slug}`)]} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold text-foreground">
            Streaming Services in {country.name}
          </h1>
          <span className="text-2xl font-mono text-muted-foreground/60">{country.iso}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{country.region}</p>

        <div className="bluf-summary mt-4 rounded-lg bg-muted border border-border p-4 text-sm text-foreground leading-relaxed">
          <p>
            {country.name} has {country.availablePlatforms.length} streaming services available, including{' '}
            {country.topPlatforms
              .slice(0, 4)
              .map(s => {
                const p = platforms.find(pl => pl.slug === s);
                return p?.name ?? s;
              })
              .join(', ')}
            . The {country.name} streaming market uses {country.currency} pricing.
            {country.availablePlatforms.some(s => {
              const p = platforms.find(pl => pl.slug === s);
              return p?.pricing.hasFreeTier;
            })
              ? ` Free streaming options are available in ${country.name} through ad-supported services.`
              : ''}
          </p>
        </div>
        <AdSlot placement="top" pageType="country" minHeight={250} adSenseClient={adSenseClient} />
      </div>

      <section id="landscape" className="mt-10">
        <h2 id="landscape-heading" className="text-2xl font-bold text-foreground">Streaming Landscape</h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">{country.streamingLandscape}</p>
      </section>

      {topPlatformData.length > 0 && (
        <section id="platforms" className="mt-10">
          <h2 id="platforms-heading" className="text-2xl font-bold text-foreground">Top Platforms in {country.name}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topPlatformData.map(platform => (
              <Link
                key={platform.slug}
                href={`/platforms/${platform.slug}`}
                className="group rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {platform.name}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{platform.shortDescription}</p>
                <p className="mt-3 text-sm font-medium text-primary">
                  {platform.pricing.hasFreeTier
                    ? 'Free available'
                    : `From ${platform.pricing.currency} ${platform.pricing.startsAt}/mo`}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section id="all-platforms" className="mt-10">
        <h2 id="all-platforms-heading" className="text-2xl font-bold text-foreground">All Available Platforms ({availablePlatformData.length})</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {availablePlatformData.map(platform => (
            <Link
              key={platform.slug}
              href={`/platforms/${platform.slug}`}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:border-primary/40 hover:text-primary transition-colors"
            >
              <span className="font-medium text-foreground">{platform.name}</span>
              <span className="text-xs text-muted-foreground/60">
                {platform.pricing.hasFreeTier ? 'Free' : `${platform.pricing.currency}${platform.pricing.startsAt}`}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <ContentCTA pageType="country" context={{ name: country.name }} />

      {country.faqs.length > 0 && (
        <div id="faq">
          <FaqSection faqs={country.faqs} title={`Streaming in ${country.name}  -  FAQ`} />
        </div>
      )}

      <RelatedLinks sections={relatedSections} />

      <SocialShareLinks
        title={`Streaming Services in ${country.name}  -  Complete Guide`}
        url={`${SITE_URL}/countries/${country.slug}`}
      />

      <p className="mt-10 text-xs text-muted-foreground/60">
        Last updated: {new Date(PROGRAMMATIC_PAGES_LAST_UPDATED).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>
    </main>
  );
}
