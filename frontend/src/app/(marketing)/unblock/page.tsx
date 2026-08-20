import { Metadata } from 'next';
import Link from 'next/link';
import { platforms } from '@/data/platforms';
import { countries } from '@/data/countries';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { CURRENT_YEAR, SITE_URL } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { FaqSection } from '@/components/seo/FaqSection';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { ContentCTA } from '@/components/cro/ContentCTA';
import { buildUnblockIndexSections } from '@/lib/seo/related-links';

export const revalidate = 86400;

export function generateMetadata(): Metadata {
  return buildPageMetadata({
    title: `Streaming Availability and Smart DNS Guidance (${CURRENT_YEAR}) | GeoLeap`,
    description:
      'Check where streaming services are available and learn how Smart DNS can help with regional access, subject to each platform, account, and local rules.',
    path: '/unblock',
    keywords: [
      'unblock streaming sites',
      'unblock streaming',
      'unblock streaming website',
      'streaming unblock',
      'streaming regional access guidance',
    ],
  });
}

const faqs = [
  {
    question: 'How do I unblock streaming sites?',
    answer:
      'GeoLeap is a Smart DNS service that can route some location-check requests for supported services. Point your device\'s DNS settings to GeoLeap, then open the streaming app as normal. Results can vary by account, device, platform checks, and local rules.',
  },
  {
    question: 'Is GeoLeap better than a VPN for streaming?',
    answer:
      'For some streaming setups, Smart DNS can be simpler than a VPN because it does not tunnel all traffic. That can help preserve normal connection speeds, but availability still depends on the streaming service, your account, and device checks.',
  },
  {
    question: 'Which streaming services can GeoLeap unblock?',
    answer: `GeoLeap tracks ${platforms.length}+ streaming services including Netflix, Hulu, Disney+, HBO Max, Peacock, BBC iPlayer, DAZN, and more. Select a service above to see official availability and regional access guidance.`,
  },
  {
    question: 'Does unblocking streaming services slow down my internet?',
    answer:
      'Smart DNS usually has less speed impact than a VPN because it does not route every packet through an encrypted tunnel. Real-world playback still depends on your ISP, device, streaming service, and the platform checks in place.',
  },
  {
    question: 'Can I unblock streaming on my smart TV?',
    answer:
      'GeoLeap works at the DNS level, so it can be configured on many internet-connected devices, including smart TVs, game consoles, Apple TV, Roku, Fire TV Stick, and routers. Device support depends on whether DNS settings can be changed.',
  },
];

export default function UnblockIndexPage() {
  const platformsWithStats = platforms
    .map((p) => ({
      ...p,
      blockedCount: countries.filter(
        (c) => !p.availableCountries.includes(c.iso),
      ).length,
      availableCount: p.availableCountries.length,
    }))
    .sort((a, b) => b.blockedCount - a.blockedCount);

  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Unblock Streaming Services',
    description:
      'Streaming availability and Smart DNS guidance from GeoLeap.',
    url: `${SITE_URL}/unblock`,
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Unblock Streaming', href: '/unblock' },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={pageSchema} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">
          Unblock Streaming Services
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Streaming platforms use geo-restrictions to limit access by country.
          GeoLeap&apos;s Smart DNS guidance helps you compare official availability
          and understand regional access options, subject to platform and local rules.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-foreground">
          Choose a Streaming Service to Unblock
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platformsWithStats.map((p) => (
            <Link
              key={p.slug}
              href={`/unblock/${p.slug}`}
              className="group flex flex-col rounded-xl border border-border p-5 transition-colors hover:border-primary/40"
            >
              <span className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
                {p.name}
              </span>
              <span className="mt-1 text-sm text-muted-foreground">
                Available in {p.availableCount} countries
              </span>
              <span className="mt-auto pt-3 text-sm font-medium text-destructive">
                Blocked in {p.blockedCount} countries
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground">
          How GeoLeap Unblocks Streaming Sites
        </h2>
        <p className="mt-2 text-muted-foreground">
          GeoLeap is a Smart DNS service. Unlike a VPN, it can route selected
          location-check traffic while your normal streaming connection stays direct.
          That can reduce speed impact compared with a VPN, but access still depends
          on your account, device, service checks, and local rules.
        </p>
        <ol className="mt-6 space-y-4">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              1
            </span>
            <p className="text-foreground">
              <strong>Connect</strong>  -  Point your device&apos;s DNS to
              GeoLeap. Takes under a minute.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              2
            </span>
            <p className="text-foreground">
              <strong>Open the app</strong>  -  Launch your streaming service as
              normal. No changes needed.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              3
            </span>
            <p className="text-foreground">
              <strong>Check access</strong>  -  Open the service and confirm what
              is available for your account and device.
            </p>
          </li>
        </ol>
      </section>

      <ContentCTA pageType="unblock" />

      <div className="mt-12">
        <FaqSection faqs={faqs} />
      </div>

      <RelatedLinks sections={buildUnblockIndexSections()} />
    </main>
  );
}
