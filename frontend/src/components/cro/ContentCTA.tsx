import Link from 'next/link';
import type { EnhanceDescriptionPageType } from '@/lib/seo/marketing-metadata';

interface ContentCTAConfig {
  headline: string;
  body: string;
  ctaText: string;
}

const CTA_CONFIG: Record<EnhanceDescriptionPageType, ContentCTAConfig> = {
  country: {
    headline: 'Search streaming availability in {name}',
    body: 'Find where to watch any movie or TV show across 42 streaming services in 57 countries.',
    ctaText: 'Search Now',
  },
  platform: {
    headline: 'Find {name} content across countries',
    body: 'Search 42 streaming services to find where your favorite shows are available worldwide.',
    ctaText: 'Search Now',
  },
  compare: {
    headline: 'Not sure which service to pick?',
    body: 'Search 42 streaming services to find which platform has the content you want in your country.',
    ctaText: 'Search Content',
  },
  glossary: {
    headline: 'See streaming availability in action',
    body: 'Search 42 streaming services across 57 countries to find where to watch any title.',
    ctaText: 'Try Free Search',
  },
  sport: {
    headline: 'Find the cheapest way to watch {name}',
    body: 'Search 42 streaming services across 57 countries to compare live sports pricing.',
    ctaText: 'Search Now',
  },
  genre: {
    headline: 'Find {name} titles to stream',
    body: 'Search 42 streaming services across 57 countries to find where your favorites are available.',
    ctaText: 'Search Now',
  },
  guide: {
    headline: 'Ready to start streaming?',
    body: 'Search 42 streaming services across 57 countries to find where to watch any movie or show.',
    ctaText: 'Try Free Search',
  },
  blog: {
    headline: 'Find where to stream any title',
    body: 'Search 42 streaming services across 57 countries  -  free, no signup required.',
    ctaText: 'Search Now',
  },
  'how-to-watch': {
    headline: 'Check availability in your country',
    body: 'Search 42 streaming services across 57 countries to find the best way to watch.',
    ctaText: 'Search Now',
  },
  unblock: {
    headline: 'Ready to unblock your favorite streaming service?',
    body: 'GeoLeap works on any device  -  smart TVs, consoles, streaming sticks, and more. No VPN app needed.',
    ctaText: 'Get Started',
  },
};

function interpolate(template: string, name?: string): string {
  if (!name) return template.replace(/\s*\{name\}/g, '');
  return template.replace('{name}', name);
}

interface ContentCTAProps {
  pageType: EnhanceDescriptionPageType;
  context?: { name?: string };
}

export function ContentCTA({ pageType, context }: ContentCTAProps) {
  const config = CTA_CONFIG[pageType] ?? CTA_CONFIG.guide;
  const headline = interpolate(config.headline, context?.name);
  const body = config.body;

  return (
    <aside className="my-10 rounded-xl border-l-4 border-primary bg-primary/5 p-6">
      <p className="text-lg font-bold text-foreground">{headline}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <div className="mt-4 flex items-center gap-4">
        <Link
          href="/search"
          className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
        >
          {config.ctaText}  -  Free Search
        </Link>
        <Link
          href="/pricing"
          className="text-sm font-medium text-primary hover:text-primary-hover hover:underline transition-colors"
        >
          View pricing
        </Link>
      </div>
    </aside>
  );
}

export default ContentCTA;
