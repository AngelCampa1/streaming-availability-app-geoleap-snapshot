export type SeoIndexing = 'index' | 'noindex' | 'canonical-parent';

export type SeoContentTier = 'pillar' | 'supporting' | 'utility';

export type SeoRewritePriority = 'low' | 'medium' | 'high' | 'critical';

export type SeoSearchIntent =
  | 'comparison'
  | 'regional-availability'
  | 'platform-review'
  | 'country-guide'
  | 'genre-guide'
  | 'editorial-analysis'
  | 'how-to';

export interface SeoGovernance {
  indexing?: SeoIndexing;
  canonicalTarget?: string;
  contentTier?: SeoContentTier;
  rewritePriority?: SeoRewritePriority;
  searchIntent?: SeoSearchIntent;
  includeInSitemap?: boolean;
  promoteInRelatedLinks?: boolean;
}
