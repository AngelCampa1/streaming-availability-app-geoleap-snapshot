import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Globe2, Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { JsonLd } from '@/components/seo/JsonLd';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { productFeatures } from '@/data/features';
import { generateFeatureCollectionSchema, generateFeatureIndexFaqSchema } from '@/lib/seo/schema-markup';
import { SITE_URL } from '@/lib/seo/site-config';

export const metadata: Metadata = {
  title: 'GeoLeap Features | Streaming Search, VPN Country Finder, Watchlist Alerts',
  description:
    'Explore GeoLeap features for streaming availability search, VPN country planning, subscription savings, subtitles, mobile search, watchlists, and platform guides.',
  alternates: {
    canonical: '/features',
  },
  openGraph: {
    title: 'GeoLeap Features',
    description:
      'See how GeoLeap helps you find where movies and TV shows stream across services and countries.',
    url: `${SITE_URL}/features`,
    type: 'website',
  },
};

const featureLinks = productFeatures.map(feature => ({
  label: feature.name,
  href: `/features/${feature.slug}`,
}));

const featureIndexFaqs = [
  {
    question: 'Which GeoLeap feature should I start with?',
    answer:
      'Start with streaming availability search when you already know the movie or show. Use the VPN country finder when you need the best country to check, and use subscription savings when you are deciding whether another service is worth paying for.',
  },
  {
    question: 'Do the feature pages explain the problem before the workflow?',
    answer:
      'Yes. Each feature page opens with the viewer problem, then shows how GeoLeap turns that messy streaming decision into a practical search, country check, alert, or guide.',
  },
  {
    question: 'Are these features built for mobile streaming decisions?',
    answer:
      'Yes. The pages and workflows are designed for quick checks on a phone, including title search, country comparison, subtitle checks, watchlist alerts, and related guide links.',
  },
];

export default function FeaturesPage() {
  return (
    <>
      <JsonLd data={[generateFeatureCollectionSchema(productFeatures), generateFeatureIndexFaqSchema(featureIndexFaqs)]} />
      <main>
        <section className="bg-background">
          <div className="container-mobile py-12 sm:py-16 lg:py-20">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-5 rounded-full px-3 py-1">
                Product features
              </Badge>
              <h1 className="text-mobile-3xl sm:text-4xl lg:text-6xl font-bold tracking-tight text-foreground">
                Streaming decisions break when every app gives you only part of the answer
              </h1>
              <p className="bluf-summary mt-5 text-mobile-base sm:text-lg text-foreground-muted">
                GeoLeap starts with the problem: a title is missing, a VPN country is unclear, or another
                subscription looks tempting. Each feature gives you a practical next step before you spend more
                time or money.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/search"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover"
                >
                  Search a title
                  <Search className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background-muted"
                >
                  View pricing
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/70 bg-background-muted/40">
          <div className="container-mobile grid gap-5 py-8 sm:grid-cols-3">
            {[
              { icon: Globe2, label: '57 countries checked' },
              { icon: BadgeCheck, label: '42 streaming services tracked' },
              { icon: Sparkles, label: 'Built for search, guides, and alerts' },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-lg bg-background p-4 shadow-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-background">
          <div className="container-mobile py-12 sm:py-16">
            <div className="max-w-2xl">
              <h2 className="text-mobile-2xl sm:text-3xl font-bold text-foreground">
                Start with the problem, then pick the feature that fixes it
              </h2>
              <p className="mt-3 text-mobile-base text-foreground-muted">
                Every feature page goes deeper into the problem, the workflow, and the related pages to use next.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {productFeatures.map(feature => (
                <Link
                  key={feature.slug}
                  href={`/features/${feature.slug}`}
                  className="group flex min-h-[240px] flex-col justify-between rounded-lg border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">{feature.eyebrow}</p>
                    <h3 className="mt-3 text-xl font-bold text-foreground group-hover:text-primary">
                      {feature.name}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-foreground-muted">{feature.summary}</p>
                  </div>
                  <span className="mt-5 inline-flex min-h-[44px] items-center text-sm font-semibold text-primary">
                    Read the feature page
                    <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="container-mobile">
          <section className="border-t border-border py-12 sm:py-16">
            <div className="max-w-2xl">
              <h2 className="text-mobile-2xl sm:text-3xl font-bold text-foreground">
                Feature questions before you choose a workflow
              </h2>
              <p className="mt-3 text-mobile-base text-foreground-muted">
                Use these answers to move from a broad product question to the feature page that matches your search.
              </p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {featureIndexFaqs.map(item => (
                <article key={item.question} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-foreground">{item.question}</h3>
                  <p className="mt-3 text-sm leading-6 text-foreground-muted">{item.answer}</p>
                </article>
              ))}
            </div>
          </section>

          <RelatedLinks
          sections={[
            {
              title: 'Feature Pages',
              links: featureLinks,
            },
            {
              title: 'Use GeoLeap',
              links: [
                { label: 'Search Content', href: '/search' },
                { label: 'View Pricing', href: '/pricing' },
                { label: 'VPN Guidance', href: '/vpn-guidance' },
              ],
            },
            {
              title: 'Research More',
              links: [
                { label: 'Streaming Platforms', href: '/platforms' },
                { label: 'Browse by Country', href: '/countries' },
                { label: 'Compare Services', href: '/compare' },
              ],
            },
          ]}
          />
        </div>
      </main>
    </>
  );
}
