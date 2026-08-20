import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, HelpCircle, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { JsonLd } from '@/components/seo/JsonLd';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import {
  getProductFeature,
  getRelatedProductFeatures,
  productFeatures,
  type ProductFeature,
} from '@/data/features';
import { generateFeaturePageSchema } from '@/lib/seo/schema-markup';
import { SITE_URL } from '@/lib/seo/site-config';

interface FeaturePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return productFeatures.map(feature => ({ slug: feature.slug }));
}

export async function generateMetadata({ params }: FeaturePageProps): Promise<Metadata> {
  const { slug } = await params;
  const feature = getProductFeature(slug);

  if (!feature) {
    return {};
  }

  return {
    title: feature.seoTitle,
    description: feature.seoDescription,
    alternates: {
      canonical: `/features/${feature.slug}`,
    },
    openGraph: {
      title: feature.seoTitle,
      description: feature.seoDescription,
      url: `${SITE_URL}/features/${feature.slug}`,
      type: 'website',
    },
  };
}

function featureRelatedSections(feature: ProductFeature) {
  const relatedFeatures = getRelatedProductFeatures(feature);

  return [
    {
      title: 'Related Features',
      links: relatedFeatures.map(item => ({
        label: item.name,
        href: `/features/${item.slug}`,
      })),
    },
    {
      title: 'Use This Feature',
      links: [
        { label: 'Search Content', href: '/search' },
        { label: 'View Pricing', href: '/pricing' },
        { label: 'VPN Guidance', href: '/vpn-guidance' },
      ],
    },
    {
      title: 'Research Next',
      links: [
        { label: 'All Features', href: '/features' },
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Browse by Country', href: '/countries' },
        { label: 'Compare Services', href: '/compare' },
      ],
    },
  ];
}

export default async function FeatureDetailPage({ params }: FeaturePageProps) {
  const { slug } = await params;
  const feature = getProductFeature(slug);

  if (!feature) {
    notFound();
  }

  const relatedFeatures = getRelatedProductFeatures(feature);

  return (
    <>
      <JsonLd data={generateFeaturePageSchema(feature)} />
      <main>
        <section className="bg-background">
          <div className="container-mobile py-10 sm:py-14 lg:py-18">
            <Link
              href="/features"
              className="inline-flex min-h-[44px] items-center rounded-full text-sm font-semibold text-primary hover:text-primary-hover"
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              All features
            </Link>

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
              <div>
                <Badge variant="outline" className="mb-5 rounded-full px-3 py-1">
                  {feature.eyebrow}
                </Badge>
                <h1 className="text-mobile-3xl sm:text-4xl lg:text-6xl font-bold tracking-tight text-foreground">
                  {feature.problem}
                </h1>
                <p className="bluf-summary mt-5 max-w-3xl text-mobile-base sm:text-lg text-foreground-muted">
                  Solution: {feature.solution}
                </p>
                <p className="mt-4 text-sm font-semibold text-primary">{feature.name}</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/search"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover"
                  >
                    {feature.primaryCta}
                    <Search className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background-muted"
                  >
                    See plans
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <aside className="rounded-lg border border-border bg-background-muted/50 p-5">
                <h2 className="text-lg font-bold text-foreground">Best used when</h2>
                <ul className="mt-4 space-y-3">
                  {feature.useCases.map(item => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-foreground-muted">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </div>
        </section>

        <section className="border-y border-border/70 bg-background-muted/40">
          <div className="container-mobile grid gap-5 py-10 lg:grid-cols-2">
            <article className="rounded-lg bg-background p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-error">Problem</p>
              <h2 className="mt-3 text-2xl font-bold text-foreground">The old way wastes time</h2>
              <p className="mt-4 text-mobile-base leading-7 text-foreground-muted">{feature.problem}</p>
            </article>
            <article className="rounded-lg bg-background p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-success">Solution</p>
              <h2 className="mt-3 text-2xl font-bold text-foreground">GeoLeap makes the next step clearer</h2>
              <p className="mt-4 text-mobile-base leading-7 text-foreground-muted">{feature.solution}</p>
            </article>
          </div>
        </section>

        <section className="bg-background">
          <div className="container-mobile py-12 sm:py-16">
            <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div>
                <h2 className="text-mobile-2xl sm:text-3xl font-bold text-foreground">
                  What this feature gives you
                </h2>
                <p className="mt-3 text-mobile-base text-foreground-muted">
                  The page is written for quick mobile scanning and deeper research. Start here, then follow the
                  linked pages that match your next decision.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {feature.proofPoints.map(point => (
                  <div key={point} className="rounded-lg border border-border bg-card p-5">
                    <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold leading-6 text-foreground">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-background-muted/35">
          <div className="container-mobile py-12 sm:py-16">
            <h2 className="text-mobile-2xl sm:text-3xl font-bold text-foreground">Questions people ask</h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {feature.faq.map(item => (
                <article key={item.question} className="rounded-lg border border-border bg-background p-5">
                  <div className="flex gap-3">
                    <HelpCircle className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <h3 className="text-base font-bold text-foreground">{item.question}</h3>
                      <p className="faq-answer mt-2 text-sm leading-6 text-foreground-muted">{item.answer}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-background">
          <div className="container-mobile py-12 sm:py-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-mobile-2xl sm:text-3xl font-bold text-foreground">
                  Connect this with other GeoLeap features
                </h2>
                <p className="mt-3 text-mobile-base text-foreground-muted">
                  Streaming decisions usually involve more than one page. These links keep the path short.
                </p>
              </div>
              <Link
                href="/features"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-background-muted"
              >
                Browse all features
              </Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {relatedFeatures.map(item => (
                <Link
                  key={item.slug}
                  href={`/features/${item.slug}`}
                  className="group rounded-lg border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{item.eyebrow}</p>
                  <h3 className="mt-3 text-lg font-bold text-foreground group-hover:text-primary">{item.shortName}</h3>
                  <p className="mt-2 text-sm leading-6 text-foreground-muted">{item.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="container-mobile">
          <RelatedLinks sections={featureRelatedSections(feature)} />
        </div>
      </main>
    </>
  );
}
