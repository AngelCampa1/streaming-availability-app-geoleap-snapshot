import { Metadata } from 'next';
import Link from 'next/link';
import { authors } from '@/data/authors';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { SITE_URL } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Authors  -  GeoLeap Streaming Analysts',
    description:
      'Meet the streaming industry analysts, technology researchers, and international media rights specialists who write for GeoLeap.',
    path: '/about/authors',
  });
}

export default function AuthorsIndexPage() {
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'GeoLeap Authors',
    url: `${SITE_URL}/about/authors`,
    itemListElement: authors.map((author, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Person',
        name: author.name,
        jobTitle: author.title,
        url: `${SITE_URL}/about/authors/${author.slug}`,
      },
    })),
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Authors', href: '/about/authors' },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={itemListSchema} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <h1 className="text-3xl font-bold text-foreground">Authors</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Streaming analysts, technology researchers, and international media rights specialists.
        </p>
      </div>

      <ul className="mt-10 space-y-6">
        {authors.map(author => (
          <li key={author.slug}>
            <Link
              href={`/about/authors/${author.slug}`}
              className="block rounded-xl border border-border p-6 hover:border-primary/40 transition-colors group"
            >
              <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                {author.name}
              </h2>
              <p className="mt-1 text-sm font-medium text-primary">{author.title}</p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {author.bio}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {author.expertise.slice(0, 4).map(topic => (
                  <span
                    key={topic}
                    className="rounded-full bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary capitalize"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
