import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { platforms } from '@/data/platforms';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { generateCollectionPageSchema } from '@/lib/seo/schema-markup';
import { generatePlatformUrl } from '@/lib/seo/url-generation';
import { SITE_URL } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { buildPlatformIndexSections } from '@/lib/seo/related-links';

const PLATFORM_LOGO_MAP: Record<string, string> = {
  netflix: '/logos/streaming/netflix.svg',
  hulu: '/logos/streaming/hulu.svg',
  'disney-plus': '/logos/streaming/disney-plus.svg',
  'hbo-max': '/logos/streaming/hbo.svg',
  'amazon-prime-video': '/logos/streaming/amazon-prime.svg',
  'apple-tv-plus': '/logos/streaming/apple-tv.svg',
  'paramount-plus': '/logos/streaming/paramount-plus.svg',
  peacock: '/logos/streaming/peacock.svg',
  crunchyroll: '/logos/streaming/crunchyroll.svg',
  'youtube-premium': '/logos/streaming/youtube-premium.svg',
};

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Streaming Platforms Guide',
    description:
      'Compare all major streaming platforms  -  Netflix, Hulu, Disney+, HBO Max, and 20+ more. Find pricing, features, and content availability by country.',
    path: '/platforms',
  });
}

export default function PlatformsPage() {
  const collectionSchema = generateCollectionPageSchema({
    title: 'Streaming Platforms Guide',
    description: 'Compare all major streaming platforms and find the best service for you.',
    url: `${SITE_URL}/platforms`,
    items: platforms.map(p => ({
      name: p.name,
      url: generatePlatformUrl(p.slug),
    })),
  });

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Platforms', href: '/platforms' },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={collectionSchema} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">Streaming Platforms Guide</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Compare all major streaming platforms  -  pricing, features, and content availability by country.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {platforms.map(platform => (
          <Link
            key={platform.slug}
            href={`/platforms/${platform.slug}`}
            className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3 mb-2">
              {PLATFORM_LOGO_MAP[platform.slug] ? (
                <Image
                  src={PLATFORM_LOGO_MAP[platform.slug]}
                  alt={`${platform.name} logo`}
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{platform.name.charAt(0)}</span>
                </div>
              )}
              <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                {platform.name}
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{platform.shortDescription}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-primary">
                {platform.pricing.hasFreeTier
                  ? 'Free available'
                  : `From ${platform.pricing.currency} ${platform.pricing.startsAt}/mo`}
              </span>
              <span className="text-xs text-muted-foreground/60">
                {platform.availableCountries.length} {platform.availableCountries.length === 1 ? 'country' : 'countries'}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <RelatedLinks sections={buildPlatformIndexSections()} />
    </main>
  );
}
