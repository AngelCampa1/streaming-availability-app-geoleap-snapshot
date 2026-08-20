import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Fragment } from 'react';
import { blogPosts, getBlogPostBySlug } from '@/data/blog-posts';
import { BLOG_CATEGORY_LABELS } from '@/data/blog-posts';
import { buildPageMetadata, enhanceDescription } from '@/lib/seo/marketing-metadata';
import { buildBlogRelatedSections } from '@/lib/seo/related-links';
import { generateArticleSchema } from '@/lib/seo/schema-markup';
import { SITE_URL } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { FaqSection } from '@/components/seo/FaqSection';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { platforms } from '@/data/platforms';
import { countries } from '@/data/countries';
import { blogContent } from '@/data/blog-content';
import { getAuthorBySlug } from '@/data/authors';
import { AdSlot } from '@/components/ads/AdSlot';
import { MonetizedPageView } from '@/components/ads/MonetizedPageView';
import { getAdSenseClient } from '@/lib/ads/config';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogPosts.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) {
    return buildPageMetadata({
      title: 'Article Not Found',
      description: 'This article could not be found.',
      path: `/blog/${slug}`,
    });
  }

  return buildPageMetadata({
    title: post.seoTitle ?? post.title,
    description: enhanceDescription(post.description, 'blog'),
    path: `/blog/${slug}`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    ...(post.noIndex ? { noIndex: true } : {}),
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) notFound();

  const content = blogContent[slug];
  const adSenseClient = getAdSenseClient();

  const relatedPlatformData = post.relatedPlatforms
    .map(s => platforms.find(p => p.slug === s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const relatedCountryData = post.relatedCountries
    .map(s => countries.find(c => c.slug === s))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const mentions = [
    ...relatedPlatformData.map(p => ({
      name: p.name,
      url: `${SITE_URL}/platforms/${p.slug}`,
      type: 'Organization',
      ...(p.wikipediaUrl ? { sameAs: p.wikipediaUrl } : {}),
    })),
    ...relatedCountryData.map(c => ({
      name: c.name,
      url: `${SITE_URL}/countries/${c.slug}`,
      type: 'Country',
      ...(c.wikipediaUrl ? { sameAs: c.wikipediaUrl } : {}),
    })),
  ];

  const author = getAuthorBySlug(post.authorSlug);

  const articleSchema = generateArticleSchema({
    title: post.title,
    description: post.description,
    url: `${SITE_URL}/blog/${post.slug}`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    ...(author ? { author } : {}),
    ...(mentions.length > 0 ? { mentions } : {}),
  });

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Blog', href: '/blog' },
    { label: post.title, href: `/blog/${post.slug}` },
  ];

  const relatedSections = buildBlogRelatedSections(post, blogPosts);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <MonetizedPageView pageType="blog" canonicalPath={`/blog/${post.slug}`} />
      <JsonLd data={articleSchema} />
      <Breadcrumbs items={breadcrumbs} />

      <article className="mt-8">
        <div className="flex items-center gap-3 text-sm text-muted-foreground/60 mb-4">
          <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary capitalize">
            {BLOG_CATEGORY_LABELS[post.category]}
          </span>
          <span>{post.readingTime} min read</span>
          <time dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </div>

        <h1 className="text-4xl font-bold text-foreground leading-tight">
          {post.title}
        </h1>

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

        <p className="mt-4 text-xl text-muted-foreground">{post.description}</p>

        {post.tldr && (
          <div className="bluf-summary mt-6 rounded-lg bg-muted border border-border p-4 text-sm">
            <p className="font-medium text-foreground">{post.tldr}</p>
          </div>
        )}

        <AdSlot placement="top" pageType="blog" minHeight={250} adSenseClient={adSenseClient} />

        {content && (
          <div className="mt-10 space-y-8">
            {content.sections.map((section, i) => (
              <Fragment key={section.heading || section.body?.slice(0, 20) || i}>
                <section>
                  {section.heading && (
                    <h2 className="text-2xl font-bold text-foreground mb-4">
                      {section.heading}
                    </h2>
                  )}
                  <div
                    className="text-muted-foreground leading-relaxed prose prose-violet max-w-none"
                    dangerouslySetInnerHTML={{ __html: section.body }}
                  />
                </section>
                {i === Math.floor(content.sections.length / 2) - 1 && (
                  <AdSlot placement="in-article" pageType="blog" minHeight={280} adSenseClient={adSenseClient} />
                )}
              </Fragment>
            ))}
          </div>
        )}

        {post.faqs && post.faqs.length > 0 && (
          <FaqSection faqs={post.faqs} title="Frequently Asked Questions" />
        )}
      </article>

      {relatedSections.length > 0 && <RelatedLinks sections={relatedSections} />}

      {post.updatedAt && post.updatedAt !== post.publishedAt && (
        <p className="mt-10 text-xs text-muted-foreground/60">
          Last updated:{' '}
          <time dateTime={post.updatedAt}>
            {new Date(post.updatedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </p>
      )}

      <div className="mt-10 rounded-xl bg-primary/5 p-6">
        <p className="text-sm text-primary">
          <Link href="/blog" className="font-semibold hover:underline">
            Browse all {blogPosts.length} articles →
          </Link>
        </p>
      </div>
    </main>
  );
}

