import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { platforms, getPlatformBySlug } from '@/data/platforms';
import { countries, getCountryByIso } from '@/data/countries';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { CURRENT_YEAR, PROGRAMMATIC_PAGES_LAST_UPDATED, SITE_URL } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { FaqSection } from '@/components/seo/FaqSection';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { ContentCTA } from '@/components/cro/ContentCTA';
import { buildUnblockHubRelatedSections } from '@/lib/seo/related-links';

export const revalidate = 86400;

interface Props {
  params: Promise<{ platform: string }>;
}

export async function generateStaticParams(): Promise<Array<{ platform: string }>> {
  return platforms.map(p => ({ platform: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { platform: platformSlug } = await params;
  const platform = getPlatformBySlug(platformSlug);

  if (!platform) {
    return buildPageMetadata({
      title: 'Page Not Found',
      description: 'This page could not be found.',
      path: `/unblock/${platformSlug}`,
    });
  }

  return buildPageMetadata({
    title: `${platform.name} Availability and Smart DNS Guidance (${CURRENT_YEAR}) | GeoLeap`,
    description: `${platform.name} availability varies by country. Check official availability and Smart DNS access guidance with GeoLeap.`,
    path: `/unblock/${platform.slug}`,
    keywords: [
      `unblock ${platform.name}`,
      `${platform.name} not available`,
      `watch ${platform.name} abroad`,
      `${platform.name} geo restriction`,
      `${platform.name} availability by country`,
    ],
  });
}

export default async function UnblockPlatformHubPage({ params }: Props) {
  const { platform: platformSlug } = await params;
  const platform = getPlatformBySlug(platformSlug);

  if (!platform) notFound();

  const blockedCountries = countries.filter(
    c => !platform.availableCountries.includes(c.iso),
  );

  const availableCountryObjects = platform.availableCountries
    .map(iso => getCountryByIso(iso))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `How to Unblock ${platform.name}`,
    description: `Guide to accessing ${platform.name} from countries where it is geo-restricted.`,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Unblock', item: `${SITE_URL}/unblock` },
        { '@type': 'ListItem', position: 3, name: platform.name, item: `${SITE_URL}/unblock/${platform.slug}` },
      ],
    },
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Unblock Streaming', href: '/unblock' },
    { label: platform.name, href: `/unblock/${platform.slug}` },
  ];

  const faqs = [
    {
      question: `Is ${platform.name} available worldwide?`,
      answer: `No. ${platform.name} is officially available in ${platform.availableCountries.length} countries but geo-restricted in ${blockedCountries.length} others. Availability depends on content licensing agreements that vary by region.`,
    },
    {
    question: `How do I unblock ${platform.name}?`,
      answer: `GeoLeap is a Smart DNS service that can route selected location-check requests for supported services. Connect through GeoLeap, then open ${platform.name} as normal. Access can vary by account, device, service checks, and local rules.`,
    },
    {
    question: `Is GeoLeap better than a VPN for ${platform.name}?`,
      answer: `For some streaming setups, Smart DNS can be simpler than a VPN because it does not tunnel all traffic. That can help preserve normal connection speeds, but ${platform.name} access still depends on platform checks and your account.`,
    },
    {
    question: `Can I watch ${platform.name} abroad while traveling?`,
      answer: `If you subscribe to ${platform.name} at home and travel, GeoLeap can help you check regional access options. Availability depends on ${platform.name}'s rules, account region, payment method, device, and local regulations.`,
    },
    {
    question: `Does ${platform.name} detect Smart DNS services?`,
      answer: `Streaming services may update detection methods or restrict Smart DNS traffic. If you experience issues, check GeoLeap's current guidance and your ${platform.name} account settings before assuming access is supported.`,
    },
  ];

  const displayedAvailableCountries = availableCountryObjects.slice(0, 12);
  const remainingAvailableCount = Math.max(0, availableCountryObjects.length - 12);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={pageSchema} />
      <Breadcrumbs items={breadcrumbs} />

      {/* Header */}
      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">
          Unblock {platform.name}: Watch From Any Country
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          {platform.name} is available in {platform.availableCountries.length} countries
          but geo-restricted in {blockedCountries.length} others. GeoLeap helps you
          compare official availability and regional access options.
        </p>
      </div>

      {/* Availability stats */}
      <section id="availability" className="mt-10">
        <h2 className="text-2xl font-bold text-foreground">
          {platform.name} Availability
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
            <span className="flex-shrink-0 text-lg text-green-600" aria-hidden="true">
              &#10003;
            </span>
            <p className="text-sm font-medium text-foreground">
              {availableCountryObjects.length} Countries Available
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <span className="flex-shrink-0 text-lg text-destructive" aria-hidden="true">
              &#10007;
            </span>
            <p className="text-sm font-medium text-foreground">
              {blockedCountries.length} Countries Blocked
            </p>
          </div>
        </div>
      </section>

      {/* How to Unblock */}
      <section id="how-it-works" className="mt-12">
        <h2 className="text-2xl font-bold text-foreground">
          How to Unblock {platform.name} With GeoLeap
        </h2>
        <p className="mt-2 text-muted-foreground">
          GeoLeap is a Smart DNS service that can help with supported streaming access while preserving normal connection routing.
        </p>

        <ol className="mt-6 space-y-6">
          <li className="flex gap-4">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              1
            </span>
            <div>
              <p className="font-semibold text-foreground">Connect with GeoLeap</p>
              <p className="mt-1 text-muted-foreground">
                Configure GeoLeap for a supported region where {platform.name} is
                available. No software installation is required on many devices.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              2
            </span>
            <div>
              <p className="font-semibold text-foreground">
                Access {platform.name} normally
              </p>
              <p className="mt-1 text-muted-foreground">
                Open the {platform.name} app or website as usual, then confirm what
                your account and device can access.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              3
            </span>
            <div>
              <p className="font-semibold text-foreground">Start watching</p>
              <p className="mt-1 text-muted-foreground">
                Check the available {platform.name} catalog. GeoLeap routes selected
                DNS traffic, so speed impact is usually lower than a full VPN tunnel.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* CTA */}
      <ContentCTA pageType="unblock" context={{ name: platform.name }} />

      {/* Blocked Countries Grid */}
      {blockedCountries.length > 0 && (
        <section id="blocked-countries" className="mt-12">
          <h2 className="text-2xl font-bold text-foreground">
            Countries Where {platform.name} is Blocked
          </h2>
          <p className="mt-2 text-muted-foreground">
            Select a country below to see a detailed guide for accessing{' '}
            {platform.name} from that location.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {blockedCountries.map(c => (
              <li key={c.slug}>
                <Link
                  href={`/unblock/${platform.slug}/${c.slug}`}
                  className="block rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Available Countries */}
      {availableCountryObjects.length > 0 && (
        <section id="available" className="mt-12">
          <h2 className="text-2xl font-bold text-foreground">
            Where {platform.name} is Officially Available
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {displayedAvailableCountries.map(c => (
              <li key={c.slug}>
                <Link
                  href={`/countries/${c.slug}`}
                  className="block rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
          {remainingAvailableCount > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              And {remainingAvailableCount} more countries.
            </p>
          )}
        </section>
      )}

      {/* FAQ */}
      <div id="faq" className="mt-12">
        <FaqSection faqs={faqs} />
      </div>

      <RelatedLinks sections={buildUnblockHubRelatedSections(platform)} />

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
