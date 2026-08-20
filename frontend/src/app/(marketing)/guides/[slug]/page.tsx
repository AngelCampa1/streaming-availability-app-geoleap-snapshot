import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Fragment } from 'react';
import { streamingGuides, getGuideBySlug, GUIDE_CATEGORY_LABELS } from '@/data/guides';
import { guideContent } from '@/data/guide-content';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { buildGuideRelatedSections } from '@/lib/seo/related-links';
import { SITE_URL } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { FaqSection } from '@/components/seo/FaqSection';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { ContentCTA } from '@/components/cro/ContentCTA';
import { getAuthorBySlug } from '@/data/authors';
import { AdSlot } from '@/components/ads/AdSlot';
import { MonetizedPageView } from '@/components/ads/MonetizedPageView';
import { getAdSenseClient } from '@/lib/ads/config';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return streamingGuides.map(g => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) {
    return buildPageMetadata({
      title: 'Guide Not Found',
      description: 'This guide could not be found.',
      path: `/guides/${slug}`,
    });
  }

  return buildPageMetadata({
    title: guide.title,
    description: guide.description,
    path: `/guides/${slug}`,
  });
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const content = guideContent[slug];
  const adSenseClient = getAdSenseClient();

  const author = getAuthorBySlug(guide.authorSlug);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    url: `${SITE_URL}/guides/${guide.slug}`,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    author: author
      ? {
          '@type': 'Person',
          '@id': `${SITE_URL}/about/authors/${author.slug}`,
          name: author.name,
          jobTitle: author.title,
          url: `${SITE_URL}/about/authors/${author.slug}`,
          ...(author.twitterHandle
            ? {
                sameAs: [
                  `https://x.com/${author.twitterHandle}`,
                  ...(author.linkedInUrl ? [author.linkedInUrl] : []),
                ],
              }
            : author.linkedInUrl
              ? { sameAs: [author.linkedInUrl] }
              : {}),
        }
      : {
          '@type': 'Organization',
          '@id': `${SITE_URL}/#organization`,
          name: 'GeoLeap',
          url: SITE_URL,
        },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'GeoLeap',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
  };

  const howToSchema = content
    ? {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: guide.title,
        description: guide.description,
        step: content.sections.map((section, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: section.title,
          text: section.content.replace(/<[^>]*>/g, '').slice(0, 300),
        })),
      }
    : null;

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Guides', href: '/guides' },
    { label: guide.title, href: `/guides/${guide.slug}` },
  ];

  const relatedSections = buildGuideRelatedSections(guide);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <MonetizedPageView pageType="guide" canonicalPath={`/guides/${guide.slug}`} />
      <JsonLd data={articleSchema} />
      {howToSchema && <JsonLd data={howToSchema} />}
      <Breadcrumbs items={breadcrumbs} />

      <article className="mt-8">
        {/* Category badge + reading time + date */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground/60 mb-4">
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-accent-cyan">
            {GUIDE_CATEGORY_LABELS[guide.category]}
          </span>
          <span>{guide.readingTime} min read</span>
          <time dateTime={guide.publishedAt}>
            {new Date(guide.publishedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </div>

        {/* H1 title */}
        <h1 className="text-4xl font-bold text-foreground leading-tight">{guide.title}</h1>

        {author && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span>By</span>
            <Link
              href={`/about/authors/${author.slug}`}
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              {author.name}
            </Link>
            <span>·</span>
            <span>{author.title}</span>
          </div>
        )}

        <p className="mt-4 text-xl text-muted-foreground">{guide.description}</p>

        {/* TLDR box */}
        <div className="mt-8 rounded-xl bg-cyan-50 border border-cyan-100 p-6">
          <p className="text-sm font-semibold text-accent-cyan mb-2">TL;DR</p>
          <p className="text-accent-cyan text-sm leading-relaxed">{guide.tldr}</p>
        </div>

        <AdSlot placement="top" pageType="guide" minHeight={250} adSenseClient={adSenseClient} />

        {/* Table of Contents */}
        {guide.tableOfContents.length > 0 && (
          <nav className="mt-8 rounded-xl border border-border bg-muted p-6">
            <p className="text-sm font-semibold text-foreground mb-3">Table of Contents</p>
            <ol className="list-decimal list-inside space-y-1.5">
              {guide.tableOfContents.map(item => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="text-sm text-primary hover:text-primary hover:underline"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Content sections */}
        {content && (
          <div className="mt-10 space-y-10">
            {content.sections.map((section, i) => (
              <Fragment key={section.id}>
                <section id={section.id}>
                  <h2 className="text-2xl font-bold text-foreground mb-4">{section.title}</h2>
                  <div
                    className="text-muted-foreground leading-relaxed prose prose-violet max-w-none"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                </section>
                {i === Math.floor(content.sections.length / 2) - 1 && (
                  <AdSlot placement="in-article" pageType="guide" minHeight={280} adSenseClient={adSenseClient} />
                )}
              </Fragment>
            ))}
          </div>
        )}

        <ContentCTA pageType="guide" />

        {/* FAQ */}
        {guide.faqs.length > 0 && (
          <FaqSection faqs={guide.faqs} title="Frequently Asked Questions" />
        )}
      </article>

      {/* Related links */}
      {relatedSections.length > 0 && <RelatedLinks sections={relatedSections} />}

      {/* Last updated + back link */}
      <div className="mt-10 flex items-center justify-between rounded-xl bg-primary/5 p-6">
        <p className="text-sm text-primary">
          Last updated:{' '}
          {new Date(guide.updatedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <Link href="/guides" className="text-sm font-semibold text-primary hover:underline">
          Browse all {streamingGuides.length} guides &rarr;
        </Link>
      </div>
    </main>
  );
}

