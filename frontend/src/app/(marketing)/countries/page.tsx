import { Metadata } from 'next';
import Link from 'next/link';
import { countries } from '@/data/countries';
import { buildPageMetadata } from '@/lib/seo/marketing-metadata';
import { generateCollectionPageSchema } from '@/lib/seo/schema-markup';
import { generateCountryUrl } from '@/lib/seo/url-generation';
import { SITE_URL } from '@/lib/seo/site-config';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { buildCountryIndexSections } from '@/lib/seo/related-links';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Streaming by Country  -  Global Availability Guide',
    description:
      'Find which streaming services are available in your country. Compare Netflix, Disney+, Amazon Prime Video, and 20+ platforms across 30+ countries.',
    path: '/countries',
  });
}

export default function CountriesPage() {
  const collectionSchema = generateCollectionPageSchema({
    title: 'Streaming Services by Country',
    description: 'Find which streaming services are available in your country.',
    url: `${SITE_URL}/countries`,
    items: countries.map(c => ({
      name: c.name,
      url: generateCountryUrl(c.slug),
    })),
  });

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Countries', href: '/countries' },
  ];

  // Group by region
  const byRegion = countries.reduce<Record<string, typeof countries>>((acc, c) => {
    if (!acc[c.region]) acc[c.region] = [];
    acc[c.region].push(c);
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={collectionSchema} />
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-8">
        <h1 className="text-4xl font-bold text-foreground">Streaming by Country</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Find which streaming services are available in your country and explore local streaming landscapes.
        </p>
      </div>

      <div className="mt-12 space-y-12">
        {Object.entries(byRegion).map(([region, regionCountries]) => (
          <section key={region}>
            <h2 className="text-2xl font-bold text-foreground mb-6">{region}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {regionCountries.map(country => (
                <Link
                  key={country.slug}
                  href={`/countries/${country.slug}`}
                  className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {country.name}
                    </h3>
                    <span className="text-xs font-mono text-muted-foreground/60">{country.iso}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {country.availablePlatforms.length} platforms available
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <RelatedLinks sections={buildCountryIndexSections()} />
    </main>
  );
}
