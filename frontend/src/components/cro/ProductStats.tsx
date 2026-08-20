import { Globe, Tv, BookOpen } from 'lucide-react';
import { COUNTRY_COUNT, PLATFORM_COUNT } from '@/lib/seo/site-config';

const STATS = [
  { icon: Tv, label: `${PLATFORM_COUNT} Streaming Services`, key: 'services' },
  { icon: Globe, label: `${COUNTRY_COUNT} Countries`, key: 'countries' },
  { icon: BookOpen, label: `${PLATFORM_COUNT} Platform Guides`, key: 'guides' },
] as const;

export function ProductStats() {
  return (
    <div className="mx-auto max-w-3xl py-4">
      <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
        {STATS.map(({ icon: Icon, label, key }) => (
          <span key={key} className="flex items-center gap-1.5">
            <Icon className="h-4 w-4 text-primary" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default ProductStats;
