import type { PlatformComparison } from '@/data/comparisons';
import type { StreamingCountry } from '@/data/countries';
import type { GenreGuide } from '@/data/genres';
import type { StreamingPlatform } from '@/data/platforms';
import type { SeoContentTier, SeoGovernance, SeoIndexing, SeoRewritePriority, SeoSearchIntent } from '@/data/seo';

export interface RouteGovernanceDecision {
  indexing: SeoIndexing;
  canonicalPath?: string;
  includeInSitemap: boolean;
  promoteInRelatedLinks: boolean;
  contentTier: SeoContentTier;
  rewritePriority: SeoRewritePriority;
  searchIntent: SeoSearchIntent;
}

function resolveGovernance(
  defaults: Omit<RouteGovernanceDecision, 'canonicalPath'> & { canonicalPath?: string },
  overrides?: SeoGovernance,
): RouteGovernanceDecision {
  return {
    indexing: overrides?.indexing ?? defaults.indexing,
    canonicalPath: overrides?.canonicalTarget ?? defaults.canonicalPath,
    includeInSitemap: overrides?.includeInSitemap ?? defaults.includeInSitemap,
    promoteInRelatedLinks: overrides?.promoteInRelatedLinks ?? defaults.promoteInRelatedLinks,
    contentTier: overrides?.contentTier ?? defaults.contentTier,
    rewritePriority: overrides?.rewritePriority ?? defaults.rewritePriority,
    searchIntent: overrides?.searchIntent ?? defaults.searchIntent,
  };
}

function resolveChildGovernance(
  defaults: Omit<RouteGovernanceDecision, 'canonicalPath'> & { canonicalPath?: string },
  overrides?: SeoGovernance,
): RouteGovernanceDecision {
  return {
    indexing: defaults.indexing,
    canonicalPath: defaults.canonicalPath,
    includeInSitemap: defaults.includeInSitemap,
    promoteInRelatedLinks: defaults.promoteInRelatedLinks,
    contentTier: overrides?.contentTier ?? defaults.contentTier,
    rewritePriority: overrides?.rewritePriority ?? defaults.rewritePriority,
    searchIntent: defaults.searchIntent,
  };
}

export function getComparisonGovernance(comparison: PlatformComparison): RouteGovernanceDecision {
  return resolveGovernance(
    {
      indexing: 'index',
      includeInSitemap: true,
      promoteInRelatedLinks: true,
      contentTier: 'supporting',
      rewritePriority: 'medium',
      searchIntent: 'comparison',
    },
    comparison.seo,
  );
}

export function getComparisonCountryGovernance(
  comparison: PlatformComparison,
): RouteGovernanceDecision {
  return resolveChildGovernance(
    {
      indexing: 'index',
      includeInSitemap: true,
      promoteInRelatedLinks: true,
      contentTier: 'utility',
      rewritePriority: 'low',
      searchIntent: 'regional-availability',
    },
    comparison.seo,
  );
}

export function getPlatformGovernance(platform: StreamingPlatform): RouteGovernanceDecision {
  return resolveGovernance(
    {
      indexing: 'index',
      includeInSitemap: true,
      promoteInRelatedLinks: true,
      contentTier: 'pillar',
      rewritePriority: 'high',
      searchIntent: 'platform-review',
    },
    platform.seo,
  );
}

export function getPlatformCountryGovernance(
  platform: StreamingPlatform,
): RouteGovernanceDecision {
  return resolveChildGovernance(
    {
      indexing: 'index',
      includeInSitemap: true,
      promoteInRelatedLinks: true,
      contentTier: 'utility',
      rewritePriority: 'low',
      searchIntent: 'regional-availability',
    },
    platform.seo,
  );
}

export function getCountryGovernance(country: StreamingCountry): RouteGovernanceDecision {
  return resolveGovernance(
    {
      indexing: 'index',
      includeInSitemap: true,
      promoteInRelatedLinks: true,
      contentTier: 'pillar',
      rewritePriority: 'high',
      searchIntent: 'country-guide',
    },
    country.seo,
  );
}

export function getGenreCountryGovernance(genre: GenreGuide): RouteGovernanceDecision {
  return resolveChildGovernance(
    {
      indexing: 'index',
      includeInSitemap: true,
      promoteInRelatedLinks: true,
      contentTier: 'utility',
      rewritePriority: 'low',
      searchIntent: 'regional-availability',
    },
    genre.seo,
  );
}

export function isIndexable(decision: RouteGovernanceDecision): boolean {
  return decision.indexing === 'index';
}
