import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { sports, getSportBySlug } from '@/data/sports';
import { getCountryByIso } from '@/data/countries';
import { platforms } from '@/data/platforms';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { buildSportRelatedSections } from '@/lib/seo/related-links';
import { SITE_URL, PROGRAMMATIC_PAGES_LAST_UPDATED } from '@/lib/seo/site-config';
import { generateSpeakableSchema } from '@/lib/seo/schema-markup';
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
  return sports.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sport = getSportBySlug(slug);
  if (!sport) {
    return buildPageMetadata({
      title: 'Sport Not Found',
      description: 'This sport page could not be found.',
      path: `/sports/${slug}`,
    });
  }

  const cheapest = sport.cheapestOption;
  const cheapestLabel = cheapest
    ? cheapest.price === 0
      ? 'Free'
      : `${cheapest.currency} ${cheapest.price}/mo`
    : '';

  return buildPageMetadata({
    title: `Watch ${sport.name} Online 2026  -  From ${cheapestLabel}`,
    description: `Stream ${sport.name} live in 2026. Compare prices across ${sport.regionalPricing.length}+ streaming options starting from ${cheapestLabel}. Find the cheapest way to watch in your country.`,
    path: `/sports/${slug}`,
    keywords: [
      `watch ${sport.name.toLowerCase()} online`,
      `${sport.name.toLowerCase()} streaming`,
      `${sport.name.toLowerCase()} live stream`,
      `cheapest ${sport.name.toLowerCase()} streaming`,
    ],
  });
}

export default async function SportPage({ params }: Props) {
  const { slug } = await params;
  const sport = getSportBySlug(slug);
  if (!sport) notFound();

  const sortedPricing = [...sport.regionalPricing].sort(
    (a, b) => a.price - b.price,
  );
  const cheapest = sport.cheapestOption;
  const mostExpensive = sport.mostExpensiveOption;

  const savingsPercent =
    cheapest && mostExpensive && mostExpensive.price > 0
      ? Math.round(
          ((mostExpensive.price - cheapest.price) /
            mostExpensive.price) *
            100,
        )
      : 0;

  // Build unique country list from pricing data
  const pricingCountryIsos = [
    ...new Set(sport.regionalPricing.map((p) => p.countryIso)),
  ];

  // Build unique platform list from pricing data
  const pricingPlatforms = [
    ...new Set(sport.regionalPricing.map((p) => p.platform)),
  ];

  const relatedSections = buildSportRelatedSections(sport);

  // Inline how-to steps (howToWatch does not exist on the interface)
  const howToSteps = [
    { name: 'Choose a streaming platform', text: `Compare platforms that carry ${sport.name}.` },
    { name: 'Sign up for the service', text: 'Create an account and select a plan.' },
    { name: 'Install the app', text: 'Download on your device or visit the website.' },
    { name: 'Watch live', text: `Find ${sport.name} in the sports section.` },
  ];

  // Schema: WebPage + HowTo + FAQPage
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Watch ${sport.name} Online 2026`,
    description: sport.longDescription,
    url: `${SITE_URL}/sports/${sport.slug}`,
    dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
    about: {
      '@type': 'SportsEvent',
      name: sport.name,
      description: sport.shortDescription,
      sport: sport.name,
    },
  };

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to Watch ${sport.name} Online`,
    description: `Step-by-step guide to streaming ${sport.name} live.`,
    step: howToSteps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Sports', href: '/sports' },
    { label: sport.name, href: `/sports/${sport.slug}` },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={[webPageSchema, howToSchema, generateSpeakableSchema(`${SITE_URL}/sports/${sport.slug}`)]} />
      <Breadcrumbs items={breadcrumbs} />

      {/* Hero */}
      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">
          Watch {sport.name} Online
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">{sport.season}</p>
        {savingsPercent > 0 && (
          <p className="mt-2 text-sm font-semibold text-success">
            Save up to {savingsPercent}% vs most expensive market
          </p>
        )}
      </div>

      {/* BLUF summary */}
      <div className="bluf-summary mt-6 rounded-lg bg-muted border border-border p-4 text-sm text-foreground leading-relaxed">
        <p>
          {sport.name} can be streamed live in {pricingCountryIsos.length}+
          countries.{' '}
          {cheapest &&
            (cheapest.price === 0
              ? `Free streaming is available via ${cheapest.platform} in select regions.`
              : `The cheapest option starts at ${cheapest.currency} ${cheapest.price}/mo via ${cheapest.platform}.`)}{' '}
          {sport.shortDescription}
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {/* About */}
          <section id="about">
            <h2 className="text-2xl font-bold text-foreground">
              About {sport.name}
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {sport.longDescription}
            </p>
          </section>

          {/* Price comparison table */}
          <section id="pricing">
            <h2 className="text-2xl font-bold text-foreground">
              Streaming Prices by Country
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">
                      Country
                    </th>
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
                  {sortedPricing.map((pricing, i) => {
                    const country = getCountryByIso(pricing.countryIso);
                    return (
                      <tr
                        key={`${pricing.countryIso}-${pricing.platform}-${i}`}
                        className={i === 0 ? 'bg-success/5' : ''}
                      >
                        <td className="px-4 py-3 text-foreground">
                          {country ? (
                            <Link
                              href={`/sports/${sport.slug}/${country.slug}`}
                              className="hover:text-primary transition-colors"
                            >
                              {country.name}
                            </Link>
                          ) : (
                            pricing.countryIso
                          )}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {pricing.platform}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">
                          {pricing.price === 0 ? (
                            <span className="text-success">Free</span>
                          ) : (
                            `${pricing.currency} ${pricing.price}`
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

          {/* How to Watch */}
          <section id="how-to-watch">
            <h2 className="text-2xl font-bold text-foreground">
              How to Watch {sport.name}
            </h2>
            <ol className="mt-4 space-y-3">
              {howToSteps.map((step, i) => (
                <li key={i} className="flex gap-3 text-muted-foreground">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">
                    <strong>{step.name}:</strong> {step.text}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {/* Key Events */}
          {sport.keyEvents.length > 0 && (
            <section id="key-events">
              <h2 className="text-2xl font-bold text-foreground">
                Key Events 2026
              </h2>
              <ul className="mt-4 space-y-2">
                {sport.keyEvents.map((event) => (
                  <li
                    key={event}
                    className="rounded-lg border border-border bg-card px-4 py-3 text-foreground shadow-sm"
                  >
                    {event}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ContentCTA pageType="sport" context={{ name: sport.name }} />

          {/* FAQ */}
          <div id="faq">
            <FaqSection faqs={sport.faqs} title={`${sport.name} FAQ`} />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Quick pricing card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold text-foreground">Best Price</h2>
            {cheapest ? (
              <div className="mt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cheapest</span>
                  <span className="font-semibold">
                    {cheapest.price === 0
                      ? 'Free'
                      : `${cheapest.currency} ${cheapest.price}/mo`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform</span>
                  <span className="font-medium text-foreground">
                    {cheapest.platform}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Country</span>
                  <span className="font-medium text-foreground">
                    {getCountryByIso(cheapest.countryIso)?.name ??
                      cheapest.countryIso}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Pricing information not yet available.
              </p>
            )}
          </div>

          {/* Platform availability */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Streaming Platforms
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {pricingPlatforms.map((name) => {
                const matchedPlatform = platforms.find(
                  (p) =>
                    p.name.toLowerCase() === name.toLowerCase() ||
                    p.slug === name.toLowerCase().replace(/\s+/g, '-'),
                );
                return matchedPlatform ? (
                  <Link
                    key={name}
                    href={`/platforms/${matchedPlatform.slug}`}
                    className="rounded-full bg-primary/5 px-3 py-1 text-sm text-primary hover:bg-primary/10 transition-colors"
                  >
                    {name}
                  </Link>
                ) : (
                  <span
                    key={name}
                    className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
                  >
                    {name}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Season info */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Season
            </h3>
            <p className="mt-2 text-lg font-bold text-foreground">
              {sport.season}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {sport.regionalPricing.length} streaming options across{' '}
              {pricingCountryIsos.length} countries
            </p>
          </div>
        </aside>
      </div>

      {/* Countries grid */}
      <div className="mt-12">
        <h2 id="countries" className="text-xl font-bold text-foreground mb-4">
          Available Countries
        </h2>
        <div className="flex flex-wrap gap-2">
          {pricingCountryIsos.map((iso) => {
            const country = getCountryByIso(iso);
            return (
              <Link
                key={iso}
                href={`/sports/${sport.slug}/${country?.slug ?? iso.toLowerCase()}`}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                {country?.name ?? iso}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-12">
        <RelatedLinks sections={relatedSections} />
      </div>

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
