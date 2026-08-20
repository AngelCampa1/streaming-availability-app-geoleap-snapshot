import { Metadata } from 'next';
import Link from 'next/link';
import { glossaryTerms } from '@/data/glossary';
import type { GlossaryTerm } from '@/data/glossary';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { generateCollectionPageSchema, generateGlossaryTermSetSchema } from '@/lib/seo/schema-markup';
import { generateGlossaryUrl } from '@/lib/seo/url-generation';
import { SITE_URL } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { buildGlossaryIndexSections } from '@/lib/seo/related-links';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Streaming Glossary  -  Industry Terms Explained',
    description:
      'Understand streaming industry terms. Definitions for SVOD, AVOD, TVOD, geo-blocking, OTT, cord-cutting, and 40+ other streaming terms.',
    path: '/glossary',
  });
}

const CATEGORY_LABELS: Record<GlossaryTerm['category'], string> = {
  streaming: 'Streaming Models',
  technology: 'Technology',
  content: 'Content',
  business: 'Business',
  rights: 'Rights & Licensing',
};

export default function GlossaryPage() {
  const collectionSchema = generateCollectionPageSchema({
    title: 'Streaming Glossary',
    description: 'Definitions of streaming industry terms.',
    url: `${SITE_URL}/glossary`,
    items: glossaryTerms.map(t => ({
      name: t.term,
      url: generateGlossaryUrl(t.slug),
    })),
  });

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Glossary', href: '/glossary' },
  ];

  const byCategory = glossaryTerms.reduce<Record<GlossaryTerm['category'], GlossaryTerm[]>>(
    (acc, t) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t);
      return acc;
    },
    {} as Record<GlossaryTerm['category'], GlossaryTerm[]>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd
        data={[
          collectionSchema,
          generateGlossaryTermSetSchema(glossaryTerms.map(t => ({
            term: t.term,
            definition: t.shortDefinition,
            slug: t.slug,
          }))),
        ]}
        graph
      />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">Streaming Glossary</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Definitions for {glossaryTerms.length}+ streaming industry terms and concepts.
        </p>
      </div>

      <div className="mt-12 space-y-12">
        {(Object.entries(byCategory) as [GlossaryTerm['category'], GlossaryTerm[]][]).map(([category, terms]) => (
          <section key={category}>
            <h2 className="text-2xl font-bold text-foreground mb-6">{CATEGORY_LABELS[category]}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {terms.map(term => (
                <Link
                  key={term.slug}
                  href={`/glossary/${term.slug}`}
                  className="group rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {term.term}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{term.shortDefinition}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <RelatedLinks sections={buildGlossaryIndexSections()} />
    </main>
  );
}
