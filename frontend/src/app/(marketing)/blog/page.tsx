import { Metadata } from 'next';
import Link from 'next/link';
import { blogPosts, BLOG_CATEGORY_LABELS } from '@/data/blog-posts';
import type { BlogPost, BlogCategory } from '@/data/blog-posts';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { generateCollectionPageSchema } from '@/lib/seo/schema-markup';
import { COUNTRY_COUNT, PLATFORM_COUNT, SITE_URL } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { buildBlogIndexSections } from '@/lib/seo/related-links';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Blog - Streaming Guides, Comparisons & Industry Analysis',
    description:
      `Expert guides on streaming services, geo-blocking, VPNs, subscription savings, and international content. Analysis covering ${PLATFORM_COUNT} streaming services across ${COUNTRY_COUNT} countries.`,
    path: '/blog',
  });
}

export default function BlogIndexPage() {
  const collectionSchema = generateCollectionPageSchema({
    title: 'GeoLeap Blog',
    description: 'Streaming guides, comparisons, and industry analysis.',
    url: `${SITE_URL}/blog`,
    items: blogPosts.map(p => ({
      name: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
    })),
  });

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Blog', href: '/blog' },
  ];

  const byCategory = blogPosts.reduce<Record<BlogCategory, BlogPost[]>>(
    (acc, post) => {
      if (!acc[post.category]) acc[post.category] = [];
      acc[post.category].push(post);
      return acc;
    },
    {} as Record<BlogCategory, BlogPost[]>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={collectionSchema} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">Blog</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Streaming guides, platform comparisons, and industry analysis backed by data.
        </p>
      </div>

      <div className="mt-12 space-y-12">
        {(Object.entries(byCategory) as [BlogCategory, BlogPost[]][]).map(
          ([category, posts]) => (
            <section key={category}>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                {BLOG_CATEGORY_LABELS[category]}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {posts.map(post => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/60 mb-2">
                      <span className="rounded-full bg-primary/5 px-2 py-0.5 text-primary font-medium capitalize">
                        {BLOG_CATEGORY_LABELS[post.category]}
                      </span>
                      <span>{post.readingTime} min read</span>
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {post.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )
        )}
      </div>

      <RelatedLinks sections={buildBlogIndexSections()} />
    </main>
  );
}
