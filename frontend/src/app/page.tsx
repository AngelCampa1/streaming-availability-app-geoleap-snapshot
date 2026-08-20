import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Find Where to Watch Any Show | 42 Streaming Services, 57 Countries',
  description:
    'Search 42 streaming services across 57 countries for free. Find where to watch any movie or TV show on Netflix, Disney+, and more. No signup needed.',
  alternates: {
    canonical: '/',
  },
};
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StreamingServiceLogo } from '@/components/common/StreamingServiceLogo';
import { POPULAR_SERVICES } from '@/types/streaming';
import { JsonLd } from '@/components/seo/JsonLd';
import { generateHomepageHowToSchema } from '@/lib/seo/schema-markup';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { buildHomepageSections } from '@/lib/seo/related-links';
import { HomeSearchInput } from '@/components/home/HomeSearchInput';
import { HomeCTAButtons } from '@/components/home/HomeCTAButtons';
import { BottomCTAButtons } from '@/components/home/BottomCTAButtons';
import { productFeatures } from '@/data/features';
import { getPremiumTrialDays } from '@/lib/pricing';

// Hero Section Component: server-rendered static content, client components for interactive parts
const HeroSection = () => (
  <section className="relative overflow-hidden bg-gradient-to-br from-background via-background-muted to-primary/5">
    <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
    <div className="relative container-mobile py-16 sm:py-24 lg:py-32">
      <div className="text-center">
        <Badge variant="outline" className="mb-6 sm:mb-8 text-xs sm:text-sm">
          Search 57 countries before you switch servers
        </Badge>
        <h1 className="text-mobile-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-foreground leading-tight">
          Find the country where your show is streaming
          <span className="block bg-gradient-to-r from-primary via-primary to-primary-hover bg-clip-text text-transparent">
            before you open your VPN
          </span>
        </h1>
        <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-mobile-base sm:text-lg lg:text-xl text-foreground-muted leading-relaxed">
          Search Netflix, Disney+, Prime Video, and more across 42 services. GeoLeap shows the countries where your existing subscriptions have the title, then gives you a practical VPN location to try.
        </p>

        {/* Interactive search: client component */}
        <HomeSearchInput />

        {/* Auth-aware CTA buttons: client component */}
        <Suspense fallback={<div className="mt-6 sm:mt-8 h-12 w-48 mx-auto rounded-xl animate-pulse bg-primary/10" />}>
          <HomeCTAButtons />
        </Suspense>
      </div>
    </div>
  </section>
);

// Features Section Component: fully server-rendered
const FeaturesSection = () => {
  const homeFeaturePresentation = [
    {
      slug: 'streaming-availability-search',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
          />
        </svg>
      ),
    },
    {
      slug: 'vpn-country-finder',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      slug: 'platform-country-guides',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
    {
      slug: 'language-and-subtitle-checker',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      ),
    },
    {
      slug: 'mobile-streaming-search',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      slug: 'watchlist-alerts',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011 1v8a1 1 0 01-1 1M7 4H6a2 2 0 00-2 2v11a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1m-6 0V2"
          />
        </svg>
      ),
    },
  ];

  const features = homeFeaturePresentation.flatMap(item => {
    const feature = productFeatures.find(productFeature => productFeature.slug === item.slug);
    if (!feature) return [];
    return [{
      href: `/features/${feature.slug}`,
      icon: item.icon,
      title: feature.shortName,
      description: feature.summary,
    }];
  });

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-background-muted/30">
      <div className="container-mobile">
        <div className="text-center">
          <h2 className="text-mobile-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Get more out of the subscriptions you already have
          </h2>
          <p className="mt-3 sm:mt-4 text-mobile-base sm:text-lg text-foreground-muted">
            GeoLeap turns one search into a country list, service match, and next step.
          </p>
        </div>

        <div className="mt-12 sm:mt-16 mobile-grid">
          {features.map((feature, index) => (
            <Link key={index} href={feature.href} className="group">
              <Card className="h-full hover:shadow-lg transition-all duration-300 touch-area mobile-optimized">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <div className="text-primary group-hover:scale-110 transition-transform">{feature.icon}</div>
                  </div>
                  <CardTitle className="text-mobile-lg sm:text-xl mt-3 sm:mt-4 group-hover:text-primary">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-mobile-sm sm:text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                  <span className="inline-flex min-h-[44px] items-center text-sm font-semibold text-primary">
                    Learn more
                  </span>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/features"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground hover:bg-background-muted"
          >
            View all GeoLeap features
          </Link>
        </div>
      </div>
    </section>
  );
};

// Streaming Services Section: fully server-rendered
const StreamingServicesSection = () => (
  <section className="py-12 sm:py-16 bg-background border-y border-border/50">
    <div className="container-mobile">
      <div className="text-center mb-8">
        <p className="text-sm font-medium text-foreground-muted uppercase tracking-wider">
          Search across 42 streaming services including
        </p>
      </div>
      <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
        {POPULAR_SERVICES.map((service) => (
          <div
            key={service.id}
            className="group flex flex-col items-center transition-transform hover:scale-110"
          >
            <StreamingServiceLogo
              serviceId={service.id}
              size="lg"
              showName={true}
              fallbackToIcon={true}
            />
          </div>
        ))}
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            +21
          </div>
          <span className="mt-1 text-xs text-foreground-muted">more</span>
        </div>
      </div>
    </div>
  </section>
);

// Social Proof Section: fully server-rendered
const SocialProofSection = () => {
  const useCases = [
    {
      quote: 'Search once and see where a title is available across major streaming libraries before you change VPN locations.',
      title: 'Less guessing',
    },
    {
      quote: 'Use the result to pick a country in your VPN app instead of jumping through servers blindly.',
      title: 'Clearer VPN steps',
    },
    {
      quote: 'See whether a show is already inside a subscription you pay for somewhere else before buying another service.',
      title: 'Better subscription decisions',
    },
  ];

  // Product capability metrics: truthful, no fabricated usage data
  const stats = [
    { value: '57', label: 'Countries Covered' },
    { value: '42', label: 'Streaming Services Tracked' },
    { value: '42', label: 'Platform Guides' },
    { value: '40+', label: 'Country Guides' },
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="container-mobile">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center mobile-optimized">
              <div className="text-mobile-2xl sm:text-3xl lg:text-4xl font-bold text-primary">{stat.value}</div>
              <div className="text-mobile-sm sm:text-sm text-foreground-muted mt-1 sm:mt-2">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Use Cases */}
        <div className="mt-20 sm:mt-24">
          <h2 className="text-center text-mobile-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Why streamers use GeoLeap before searching inside every app
          </h2>
          <div className="mt-12 sm:mt-16 grid gap-6 sm:gap-8 lg:grid-cols-3">
            {useCases.map((useCase, index) => (
              <Card key={index} className="bg-surface mobile-optimized touch-area">
                <CardContent className="p-4 sm:p-6">
                  <div className="font-semibold text-primary text-mobile-base sm:text-lg mb-3">
                    {useCase.title}
                  </div>
                  <p className="text-mobile-sm sm:text-base text-foreground-muted leading-relaxed">
                    {useCase.quote}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// Explore Section: fully server-rendered internal links to SEO hub pages
const ExploreSection = () => {
  const guides = [
    {
      title: 'Streaming Platforms',
      description: 'Compare pricing, features, and availability across services.',
      href: '/platforms',
      count: '20+',
      countLabel: 'platforms',
      popular: true,
    },
    {
      title: 'Product Features',
      description: 'See how search, VPN country guidance, watchlists, and alerts work together.',
      href: '/features',
      count: String(productFeatures.length),
      countLabel: 'features',
      popular: true,
    },
    {
      title: 'Browse by Country',
      description: 'Find which services are available where you live or travel.',
      href: '/countries',
      count: '57',
      countLabel: 'countries',
      popular: true,
    },
    {
      title: 'Compare Services',
      description: 'Side-by-side breakdowns to pick the right platform.',
      href: '/compare',
      count: '15+',
      countLabel: 'comparisons',
      popular: false,
    },
    {
      title: 'Streaming Glossary',
      description: 'SVOD, AVOD, geo-blocking, and other industry terms explained.',
      href: '/glossary',
      count: '40+',
      countLabel: 'terms',
      popular: false,
    },
    {
      title: 'Streaming Guides',
      description: 'Money-saving strategies, setup tips, and expert how-to guides.',
      href: '/guides',
      count: '15+',
      countLabel: 'guides',
      popular: false,
    },
    {
      title: 'Sports Streaming',
      description: 'Find the cheapest way to watch live sports in your country.',
      href: '/sports',
      count: '10+',
      countLabel: 'sports',
      popular: false,
    },
    {
      title: 'Genre Guides',
      description: 'Best platforms for anime, K-drama, true crime, sci-fi, and more.',
      href: '/genres',
      count: '18+',
      countLabel: 'genres',
      popular: false,
    },
    {
      title: 'How to Watch',
      description: 'Find where to stream specific titles in your country.',
      href: '/how-to-watch',
      count: '57',
      countLabel: 'countries',
      popular: false,
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-background-muted/30">
      <div className="container-mobile">
        <div className="text-center">
          <h2 className="text-mobile-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Explore Streaming Guides
          </h2>
          <p className="mt-3 sm:mt-4 text-mobile-base sm:text-lg text-foreground-muted max-w-2xl mx-auto">
            Use the guides when you are comparing platforms, checking a country, or trying to understand streaming rules.
          </p>
        </div>

        <div className="mt-12 sm:mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {guides.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="group"
            >
              <Card className="h-full hover:shadow-lg transition-all duration-300 touch-area mobile-optimized">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {guide.count} {guide.countLabel}
                    </Badge>
                    {guide.popular && (
                      <Badge variant="default" className="text-xs">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-mobile-lg sm:text-xl group-hover:text-primary transition-colors">
                    {guide.title}
                  </CardTitle>
                  <CardDescription className="text-mobile-sm sm:text-base leading-relaxed">
                    {guide.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

// CTA Section: server-rendered static content, client component for auth-aware buttons
const CTASection = () => (
  <section className="bg-primary/5 py-16 sm:py-20 lg:py-24">
    <div className="container-mobile max-w-4xl text-center">
      <h2 className="text-mobile-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
        Search the title before you change VPN countries
      </h2>
      <p className="mt-3 sm:mt-4 text-mobile-base sm:text-lg text-foreground-muted">
        Start free, see the country matches, and upgrade only when you need unlimited searches and alerts.
      </p>

      {/* Auth-aware CTA buttons: client component */}
      <Suspense fallback={<div className="mt-6 sm:mt-8 h-12 w-48 mx-auto rounded-xl animate-pulse bg-primary/10" />}>
        <BottomCTAButtons />
      </Suspense>

      <p className="mt-3 sm:mt-4 text-mobile-sm sm:text-sm text-foreground-muted">
        Free plan available &bull; {getPremiumTrialDays()}-day Premium trial &bull; Secured by Stripe
      </p>
    </div>
  </section>
);

// Main Page Component: server component, all sections server-rendered
export default function LandingPage() {
  return (
    <>
      <JsonLd data={generateHomepageHowToSchema()} />
      <AppLayout showBreadcrumbs={false} maxWidth="full">
        <HeroSection />
        <FeaturesSection />
        <StreamingServicesSection />
        <SocialProofSection />
        <ExploreSection />
        <div className="text-center text-xs text-muted-foreground mt-8 mb-2">
          Last updated: March 2026
        </div>
        <RelatedLinks sections={buildHomepageSections()} />
        <CTASection />
      </AppLayout>
    </>
  );
}
