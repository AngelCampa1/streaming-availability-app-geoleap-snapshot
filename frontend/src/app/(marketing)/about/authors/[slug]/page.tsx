import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { authors, getAuthorBySlug } from '@/data/authors';
import { blogPosts } from '@/data/blog-posts';
import { streamingGuides } from '@/data/guides';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { SITE_URL } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return authors.map(a => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) {
    return buildPageMetadata({
      title: 'Author Not Found',
      description: 'This author profile could not be found.',
      path: `/about/authors/${slug}`,
    });
  }

  return buildPageMetadata({
    title: `${author.name}  -  ${author.title}`,
    description: author.bio.length <= 155 ? author.bio : author.bio.slice(0, author.bio.lastIndexOf(' ', 155)),
    path: `/about/authors/${author.slug}`,
  });
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) notFound();

  const authorPosts = blogPosts.filter(p => p.authorSlug === author.slug);
  const authorGuides = streamingGuides.filter(g => g.authorSlug === author.slug);

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    jobTitle: author.title,
    description: author.bio,
    url: `${SITE_URL}/about/authors/${author.slug}`,
    affiliation: {
      '@type': 'Organization',
      name: 'GeoLeap',
      url: SITE_URL,
    },
    knowsAbout: author.expertise,
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
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Authors', href: '/about/authors' },
    { label: author.name, href: `/about/authors/${author.slug}` },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={personSchema} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <h1 className="text-3xl font-bold text-foreground">{author.name}</h1>
        <p className="mt-1 text-lg text-primary font-medium">{author.title}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {author.expertise.map(topic => (
            <span
              key={topic}
              className="rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary capitalize"
            >
              {topic}
            </span>
          ))}
        </div>

        <p className="mt-6 text-muted-foreground leading-relaxed">{author.bio}</p>

        <div className="mt-4 flex items-center gap-4">
          {author.twitterHandle && (
            <a
              href={`https://twitter.com/${author.twitterHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              @{author.twitterHandle}
            </a>
          )}
          {author.linkedInUrl && (
            <a
              href={author.linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              LinkedIn
            </a>
          )}
        </div>
      </div>

      {authorPosts.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Articles by {author.name}</h2>
          <ul className="space-y-4">
            {authorPosts.map(post => (
              <li key={post.slug} className="rounded-xl border border-border p-4 hover:border-primary/40 transition-colors">
                <Link href={`/blog/${post.slug}`} className="block group">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{post.description}</p>
                  <span className="mt-2 text-xs text-muted-foreground/60">
                    {new Date(post.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    {' · '}{post.readingTime} min read
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {authorGuides.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Guides by {author.name}</h2>
          <ul className="space-y-4">
            {authorGuides.map(guide => (
              <li key={guide.slug} className="rounded-xl border border-border p-4 hover:border-primary/40 transition-colors">
                <Link href={`/guides/${guide.slug}`} className="block group">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {guide.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{guide.description}</p>
                  <span className="mt-2 text-xs text-muted-foreground/60">
                    {guide.readingTime} min read
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
