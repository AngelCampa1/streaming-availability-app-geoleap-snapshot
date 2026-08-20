import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { platforms, getPlatformBySlug } from '@/data/platforms';
import { countries, getCountryBySlug, getCountryByIso } from '@/data/countries';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { buildUnblockRelatedSections } from '@/lib/seo/related-links';
import { CURRENT_YEAR, PROGRAMMATIC_PAGES_LAST_UPDATED } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { FaqSection } from '@/components/seo/FaqSection';
import { RelatedLinks } from '@/components/seo/RelatedLinks';

export const revalidate = 86400;

interface Props {
  params: Promise<{ platform: string; country: string }>;
}

const PRIORITY_PLATFORMS = [
  'netflix',
  'hulu',
  'disney-plus',
  'hbo-max',
  'espn-plus',
  'peacock',
];

export async function generateStaticParams(): Promise<Array<{ platform: string; country: string }>> {
  const pairs: Array<{ platform: string; country: string }> = [];

  const sorted = [
    ...platforms.filter(p => PRIORITY_PLATFORMS.includes(p.slug)),
    ...platforms.filter(p => !PRIORITY_PLATFORMS.includes(p.slug)),
  ];

  for (const platform of sorted) {
    if (pairs.length >= 2000) break;
    for (const country of countries) {
      if (pairs.length >= 2000) break;
      if (!platform.availableCountries.includes(country.iso)) {
        pairs.push({ platform: platform.slug, country: country.slug });
      }
    }
  }

  return pairs;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { platform: platformSlug, country: countrySlug } = await params;
  const platform = getPlatformBySlug(platformSlug);
  const country = getCountryBySlug(countrySlug);

  if (!platform || !country) {
    return buildPageMetadata({
      title: 'Page Not Found',
      description: 'This page could not be found.',
      path: `/unblock/${platformSlug}/${countrySlug}`,
    });
  }

  const title = `How to Unblock ${platform.name} in ${country.name} (${CURRENT_YEAR})`;
  const description = `${platform.name} is not available in ${country.name}. Check regional availability and Smart DNS access guidance for ${platform.name} with GeoLeap.`;

  return buildPageMetadata({
    title,
    description,
    path: `/unblock/${platformSlug}/${countrySlug}`,
    keywords: [
      `unblock ${platform.name} in ${country.name}`,
      `${platform.name} not available in ${country.name}`,
      `access ${platform.name} from ${country.name}`,
      `${platform.name} ${country.name} vpn alternative`,
    ],
  });
}

export default async function UnblockPlatformCountryPage({ params }: Props) {
  const { platform: platformSlug, country: countrySlug } = await params;
  const platform = getPlatformBySlug(platformSlug);
  const country = getCountryBySlug(countrySlug);

  if (!platform || !country) notFound();

  if (platform.availableCountries.includes(country.iso)) notFound();

  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to Unblock ${platform.name} in ${country.name}`,
    description: `Step-by-step guide to accessing ${platform.name} from ${country.name} using GeoLeap.`,
    step: [
      {
        '@type': 'HowToStep',
        name: 'Connect with GeoLeap',
        text: `Configure GeoLeap for a supported country where ${platform.name} is available. GeoLeap can route selected DNS checks, subject to platform, account, and device rules.`,
      },
      {
        '@type': 'HowToStep',
        name: `Access ${platform.name}`,
        text: `Open the ${platform.name} app or website as usual. Your connection may show a different regional catalog, subject to account, payment, device, and platform checks.`,
      },
      {
        '@type': 'HowToStep',
        name: 'Confirm availability',
        text: `Confirm what ${platform.name} offers for your account and device. Access is not guaranteed and may change when the platform updates its checks.`,
      },
    ],
  };

  const availableCountryObjects = platform.availableCountries
    .map(iso => getCountryByIso(iso))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)
    .slice(0, 10);

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Platforms', href: '/platforms' },
    { label: platform.name, href: `/platforms/${platform.slug}` },
    { label: `Unblock in ${country.name}`, href: `/unblock/${platform.slug}/${country.slug}` },
  ];

  const relatedSections = buildUnblockRelatedSections(platform, country);

  const faqs = [
    {
      question: `Is ${platform.name} available in ${country.name}?`,
      answer: `No, ${platform.name} is not currently available in ${country.name}. The service is geo-restricted and can only be accessed from supported regions. GeoLeap can help you review supported regions and Smart DNS options, but platform access is not guaranteed.`,
    },
    {
      question: `Why is ${platform.name} not available in ${country.name}?`,
      answer: `Streaming services like ${platform.name} use geo-restrictions to enforce content licensing agreements. Rights to movies and TV shows are often sold on a country-by-country basis, which means a platform may only be licensed to operate in certain regions. ${country.name} either lacks a licensing deal or the service has chosen not to launch there yet.`,
    },
    {
      question: `What is the best way to check ${platform.name} access in ${country.name}?`,
      answer: `GeoLeap is a Smart DNS service that can route selected location-check traffic for supported services, unlike a VPN that tunnels all your data. This can reduce speed impact, but ${platform.name} access depends on account, payment, device, platform checks, and local rules.`,
    },
    {
      question: `Is it legal to use GeoLeap with ${platform.name} in ${country.name}?`,
      answer: `Smart DNS services are generally legal in many countries, but local rules vary and some countries restrict location-changing tools. Accessing ${platform.name} from outside its licensed territory may also conflict with the platform's Terms of Service. Review ${platform.name}'s current terms and local regulations before using Smart DNS or VPN tools.`,
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={pageSchema} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">
          How to Unblock {platform.name} in {country.name}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          {platform.name} is geo-restricted in {country.name}. This guide explains official availability and Smart DNS access considerations for {platform.name}.
        </p>

        {/* Availability banner */}
        <div className="mt-6 flex items-start gap-3 rounded-lg border p-4 border-destructive/30 bg-destructive/5">
          <span className="mt-0.5 flex-shrink-0 text-lg text-destructive" aria-hidden="true">!</span>
          <p className="text-sm font-medium text-destructive">
            {platform.name} is geo-restricted in {country.name}
          </p>
        </div>
      </div>

      {/* How GeoLeap Works */}
      <section id="how-it-works" className="mt-12">
        <h2 className="text-2xl font-bold text-foreground">How GeoLeap Works</h2>
        <p className="mt-2 text-muted-foreground">
          GeoLeap is a Smart DNS service that can be simpler than a VPN for supported streaming access because it does not tunnel all traffic.
        </p>

        <ol className="mt-6 space-y-6">
          <li className="flex gap-4">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              1
            </span>
            <div>
              <p className="font-semibold text-foreground">Connect with GeoLeap</p>
              <p className="mt-1 text-muted-foreground">
                Configure GeoLeap for a country where {platform.name} is available. No software installation is required on many devices.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              2
            </span>
            <div>
              <p className="font-semibold text-foreground">Access {platform.name} normally</p>
              <p className="mt-1 text-muted-foreground">
                Open the {platform.name} app or website as usual, then confirm what your account and device can access.
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
                Check the available {platform.name} catalog. GeoLeap only routes selected DNS traffic, so speed impact is usually lower than a full VPN tunnel.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* CTA box */}
      <aside className="mt-10 rounded-xl bg-gradient-to-r from-primary-700 to-primary-900 p-8 text-white">
        <h2 className="text-2xl font-bold">Check {platform.name} Access Today</h2>
        <p className="mt-2 text-primary-foreground">
          Compare official availability and Smart DNS guidance across supported streaming services.
        </p>
        <Link
          href="/search"
          className="mt-6 inline-flex items-center rounded-full bg-card px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
        >
          Search with GeoLeap - Free
        </Link>
      </aside>

      {/* Where is platform available */}
      {availableCountryObjects.length > 0 && (
        <section id="availability" className="mt-12">
          <h2 className="text-2xl font-bold text-foreground">
            Where is {platform.name} available?
          </h2>
          <p className="mt-2 text-muted-foreground">
            {platform.name} is officially available in the following countries:
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {availableCountryObjects.map(c => (
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
          {platform.availableCountries.length > 10 && (
            <p className="mt-3 text-sm text-muted-foreground">
              And {platform.availableCountries.length - 10} more countries.
            </p>
          )}
        </section>
      )}

      {/* FAQ */}
      <div id="faq" className="mt-12">
        <FaqSection faqs={faqs} />
      </div>

      <RelatedLinks sections={relatedSections} />

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
