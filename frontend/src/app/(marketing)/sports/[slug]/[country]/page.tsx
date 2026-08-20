import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { sports, getSportBySlug } from '@/data/sports';
import { getCountryBySlug, getCountryByIso } from '@/data/countries';
import { platforms } from '@/data/platforms';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { buildSportCountryRelatedSections } from '@/lib/seo/related-links';
import { SITE_URL, PROGRAMMATIC_PAGES_LAST_UPDATED } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { FaqSection } from '@/components/seo/FaqSection';
import { RelatedLinks } from '@/components/seo/RelatedLinks';

interface Props {
  params: Promise<{ slug: string; country: string }>;
}

export async function generateStaticParams() {
  const params: Array<{ slug: string; country: string }> = [];

  for (const sport of sports) {
    // Collect unique country ISOs from regional pricing, then resolve to slugs
    const countryIsos = [
      ...new Set(sport.regionalPricing.map((p) => p.countryIso)),
    ];
    for (const iso of countryIsos) {
      const country = getCountryByIso(iso);
      if (country) {
        params.push({ slug: sport.slug, country: country.slug });
      }
    }
  }

  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, country: countryParam } = await params;
  const sport = getSportBySlug(slug);
  const country = getCountryBySlug(countryParam);

  if (!sport || !country) {
    return buildPageMetadata({
      title: 'Page Not Found',
      description: 'This page could not be found.',
      path: `/sports/${slug}/${countryParam}`,
    });
  }

  const countryPricing = sport.regionalPricing.filter(
    (p) => p.countryIso.toLowerCase() === country.iso.toLowerCase(),
  );
  const cheapest = countryPricing.length > 0
    ? countryPricing.reduce((min, p) =>
        p.price < min.price ? p : min,
      )
    : null;
  const priceLabel = cheapest
    ? cheapest.price === 0
      ? 'Free'
      : `from ${cheapest.currency} ${cheapest.price}/mo`
    : '';

  return buildPageMetadata({
    title: `How to Watch ${sport.name} in ${country.name} 2026`,
    description: `Watch ${sport.name} live in ${country.name}. ${countryPricing.length} streaming options available${priceLabel ? ` ${priceLabel}` : ''}. Compare platforms, prices, and coverage.`,
    path: `/sports/${slug}/${countryParam}`,
    keywords: [
      `watch ${sport.name.toLowerCase()} in ${country.name.toLowerCase()}`,
      `${sport.name.toLowerCase()} ${country.name.toLowerCase()} streaming`,
      `${sport.name.toLowerCase()} live stream ${country.name.toLowerCase()}`,
    ],
  });
}

export default async function SportCountryPage({ params }: Props) {
  const { slug, country: countryParam } = await params;
  const sport = getSportBySlug(slug);
  const country = getCountryBySlug(countryParam);

  if (!sport || !country) notFound();

  const countryPricing = sport.regionalPricing
    .filter((p) => p.countryIso.toLowerCase() === country.iso.toLowerCase())
    .sort((a, b) => a.price - b.price);

  const hasPricing = countryPricing.length > 0;
  const cheapest = hasPricing ? countryPricing[0] : null;

  const relatedSections = buildSportCountryRelatedSections(sport, country);

  // Generate country-specific FAQs
  const countryFaqs = [
    {
      question: `Where can I watch ${sport.name} in ${country.name}?`,
      answer: hasPricing
        ? `In ${country.name}, ${sport.name} is available on ${countryPricing.map((p) => p.platform).join(', ')}. ${cheapest && cheapest.price === 0 ? `Free streaming is available via ${cheapest.platform}.` : cheapest ? `The cheapest option is ${cheapest.platform} at ${cheapest.currency} ${cheapest.price}/mo.` : ''}`
        : `Streaming options for ${sport.name} in ${country.name} are currently being updated. Check back soon for the latest pricing information.`,
    },
    {
      question: `How much does it cost to watch ${sport.name} in ${country.name}?`,
      answer: hasPricing
        ? `Prices range from ${cheapest!.price === 0 ? 'free' : `${cheapest!.currency} ${cheapest!.price}/mo`} to ${countryPricing[countryPricing.length - 1].currency} ${countryPricing[countryPricing.length - 1].price}/mo. There ${countryPricing.length === 1 ? 'is 1 streaming option' : `are ${countryPricing.length} streaming options`} available.`
        : `Pricing information for ${sport.name} in ${country.name} is not yet available.`,
    },
    ...sport.faqs.slice(0, 2),
  ];

  // Schema
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `How to Watch ${sport.name} in ${country.name} 2026`,
    description: `Streaming guide for ${sport.name} in ${country.name}.`,
    url: `${SITE_URL}/sports/${sport.slug}/${country.slug}`,
    dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
    about: {
      '@type': 'SportsEvent',
      name: sport.name,
      location: {
        '@type': 'Country',
        name: country.name,
      },
    },
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Sports', href: '/sports' },
    { label: sport.name, href: `/sports/${sport.slug}` },
    {
      label: country.name,
      href: `/sports/${sport.slug}/${country.slug}`,
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={webPageSchema} />
      <Breadcrumbs items={breadcrumbs} />

      {/* Hero */}
      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">
          How to Watch {sport.name} in {country.name}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">{sport.season}</p>
      </div>

      {/* Availability status */}
      {hasPricing ? (
        <div className="mt-6 rounded-lg border border-success/30 bg-success/5 p-4">
          <div className="flex items-center gap-2">
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
            <span className="font-semibold text-success">
              {sport.name} is available to stream in {country.name}
            </span>
          </div>
          <p className="mt-1 ml-7 text-sm text-success">
            {countryPricing.length} streaming{' '}
            {countryPricing.length === 1 ? 'option' : 'options'} available
            {cheapest &&
              (cheapest.price === 0
                ? ', including free options'
                : ` from ${cheapest.currency} ${cheapest.price}/mo`)}
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-destructive shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-semibold text-destructive">
              Pricing information not yet available for {country.name}
            </span>
          </div>
          <p className="mt-1 ml-7 text-sm text-destructive">
            We are currently gathering streaming data for {sport.name} in{' '}
            {country.name}. Check back soon or explore other countries below.
          </p>
        </div>
      )}

      {/* Pricing table */}
      {hasPricing && (
        <section id="pricing" className="mt-10">
          <h2 className="text-2xl font-bold text-foreground">
            Streaming Options in {country.name}
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Platform
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Period
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {countryPricing.map((pricing, i) => {
                  const matchedPlatform = platforms.find(
                    (p) =>
                      p.name.toLowerCase() ===
                        pricing.platform.toLowerCase() ||
                      p.slug ===
                        pricing.platform.toLowerCase().replace(/\s+/g, '-'),
                  );
                  return (
                    <tr
                      key={`${pricing.platform}-${i}`}
                      className={i === 0 ? 'bg-success/5' : ''}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {matchedPlatform ? (
                          <Link
                            href={`/platforms/${matchedPlatform.slug}`}
                            className="hover:text-primary transition-colors"
                          >
                            {pricing.platform}
                          </Link>
                        ) : (
                          pricing.platform
                        )}
                        {i === 0 && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                            Best value
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {pricing.price === 0 ? (
                          <span className="text-success">Free</span>
                        ) : (
                          `${pricing.currency} ${pricing.price}/mo`
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {pricing.period}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {pricing.notes ?? ' - '}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Platform links */}
      {hasPricing && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold text-foreground">
            Available Platforms
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {countryPricing.map((pricing) => {
              const matchedPlatform = platforms.find(
                (p) =>
                  p.name.toLowerCase() === pricing.platform.toLowerCase() ||
                  p.slug ===
                    pricing.platform.toLowerCase().replace(/\s+/g, '-'),
              );
              return matchedPlatform ? (
                <Link
                  key={pricing.platform}
                  href={`/platforms/${matchedPlatform.slug}`}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:border-primary/40 hover:text-primary transition-colors"
                >
                  {pricing.platform}
                </Link>
              ) : (
                <span
                  key={pricing.platform}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm"
                >
                  {pricing.platform}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* FAQ */}
      <div className="mt-10" id="faq">
        <FaqSection
          faqs={countryFaqs}
          title={`${sport.name} in ${country.name} FAQ`}
        />
      </div>

      {/* Related links */}
      {relatedSections.length > 0 && (
        <div className="mt-12">
          <RelatedLinks sections={relatedSections} />
        </div>
      )}

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
