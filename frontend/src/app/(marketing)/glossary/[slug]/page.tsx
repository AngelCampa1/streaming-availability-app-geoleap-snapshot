import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { glossaryTerms, getGlossaryTermBySlug } from '@/data/glossary';
import { buildPageMetadata, enhanceDescription } from '@/lib/seo/marketing-metadata';
import { buildGlossaryRelatedSections } from '@/lib/seo/related-links';
import { generateGlossaryTermSchema } from '@/lib/seo/schema-markup';
import { generateGlossaryUrl } from '@/lib/seo/url-generation';
import { SITE_URL, PROGRAMMATIC_PAGES_LAST_UPDATED } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { FaqSection } from '@/components/seo/FaqSection';
import { RelatedLinks } from '@/components/seo/RelatedLinks';

export const revalidate = 86400;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return glossaryTerms.map(t => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const term = getGlossaryTermBySlug(slug);
  if (!term) {
    return buildPageMetadata({
      title: 'Term Not Found',
      description: 'This glossary term could not be found.',
      path: `/glossary/${slug}`,
    });
  }

  return buildPageMetadata({
    title: `${term.term}  -  Streaming Glossary`,
    description: enhanceDescription(term.shortDefinition, 'glossary'),
    path: `/glossary/${slug}`,
  });
}

export default async function GlossaryTermPage({ params }: Props) {
  const { slug } = await params;
  const term = getGlossaryTermBySlug(slug);
  if (!term) notFound();

  const termSchema = generateGlossaryTermSchema({
    term: term.term,
    definition: term.shortDefinition,
    url: generateGlossaryUrl(term.slug),
    inDefinedTermSet: {
      name: 'GeoLeap Streaming Glossary',
      url: `${SITE_URL}/glossary`,
    },
  });

  const relatedTermData = term.relatedTerms
    .map(s => glossaryTerms.find(t => t.slug === s))
    .filter(Boolean) as typeof glossaryTerms;

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Glossary', href: '/glossary' },
    { label: term.term, href: `/glossary/${term.slug}` },
  ];


  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={termSchema} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <div className="flex items-baseline gap-3">
          <h1 className="text-4xl font-bold text-foreground">{term.term}</h1>
          <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary capitalize">
            {term.category}
          </span>
        </div>
        <div className="bluf-summary mt-4 rounded-lg bg-muted border border-border p-4 text-sm">
          <p className="font-medium text-foreground">{term.shortDefinition}</p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-foreground">Explanation</h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">{term.longExplanation}</p>
      </section>

      {term.faqs && term.faqs.length > 0 && (
        <FaqSection faqs={term.faqs} title={`${term.term} FAQ`} />
      )}

      {relatedTermData.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-foreground mb-4">Related Terms</h2>
          <div className="flex flex-wrap gap-3">
            {relatedTermData.map(relatedTerm => (
              <Link
                key={relatedTerm.slug}
                href={`/glossary/${relatedTerm.slug}`}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:border-primary/40 hover:text-primary transition-colors"
              >
                <span className="font-medium">{relatedTerm.term}</span>
                <span className="ml-2 text-xs text-muted-foreground/60">{relatedTerm.shortDefinition.split(' ').slice(0, 5).join(' ')}...</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 rounded-xl bg-primary/5 p-6">
        <p className="text-sm text-primary">
          <Link href="/glossary" className="font-semibold hover:underline">
            Browse all {glossaryTerms.length} streaming terms →
          </Link>
        </p>
      </div>

      <RelatedLinks sections={buildGlossaryRelatedSections(term)} />

      <p className="mt-10 text-xs text-muted-foreground/60">
        Last updated: {new Date(PROGRAMMATIC_PAGES_LAST_UPDATED).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>
    </main>
  );
}
