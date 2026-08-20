import Link from 'next/link';

interface RelatedSection {
  title: string;
  links: Array<{ label: string; href: string }>;
}

interface RelatedLinksProps {
  sections: RelatedSection[];
}

export function RelatedLinks({ sections }: RelatedLinksProps) {
  if (sections.length === 0) return null;

  return (
    <aside className="py-8" aria-label="Related content">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(section => (
          <div
            key={section.title}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
              {section.title}
            </h3>
            <ul className="space-y-2">
              {section.links.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
