/**
 * Centralized internal linking utility.
 *
 * All page types call a builder here so section titles stay consistent and
 * every page links ACROSS (same funnel stage) and DOWN (toward conversion).
 * Builders are pure, synchronous, and safe to call at build time.
 */

import { platforms } from '@/data/platforms';
import type { StreamingPlatform } from '@/data/platforms';
import { countries } from '@/data/countries';
import type { StreamingCountry } from '@/data/countries';
import { comparisons } from '@/data/comparisons';
import type { PlatformComparison } from '@/data/comparisons';
import { genreGuides } from '@/data/genres';
import type { GenreGuide } from '@/data/genres';
import { glossaryTerms } from '@/data/glossary';
import type { GlossaryTerm } from '@/data/glossary';
import { streamingGuides } from '@/data/guides';
import type { StreamingGuide } from '@/data/guides';
import { blogPosts } from '@/data/blog-posts';
import type { BlogPost } from '@/data/blog-posts';
import { sports } from '@/data/sports';
import type { SportStreaming } from '@/data/sports';
import { getCountryByIso } from '@/data/countries';
import { getComparisonGovernance } from './page-governance';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RelatedSection {
  title: string;
  links: Array<{ label: string; href: string }>;
}

// ---------------------------------------------------------------------------
// Standardized section title constants
// ---------------------------------------------------------------------------

export const SECTION_TITLES = {
  COMPARE_ALTERNATIVES: 'Compare Alternatives',
  RELATED_COMPARISONS: 'Related Comparisons',
  UNBLOCK_CONTENT: 'Unblock Content',
  EXPLORE_MORE: 'Explore More',
  EXPLORE_STREAMING_SERVICES: 'Explore Streaming Services',
  TAKE_THE_NEXT_STEP: 'Take the Next Step',
  LEARN_MORE: 'Learn More',
} as const;

// ---------------------------------------------------------------------------
// Funnel taxonomy
// ---------------------------------------------------------------------------

export const FUNNEL_STAGE = {
  TOFU: 'TOFU',
  MOFU: 'MOFU',
  BOFU: 'BOFU',
} as const;

export type FunnelStage = typeof FUNNEL_STAGE[keyof typeof FUNNEL_STAGE];

export const PAGE_TYPE_FUNNEL: Record<string, FunnelStage> = {
  blog: 'TOFU',
  guides: 'TOFU',
  genres: 'TOFU',
  glossary: 'TOFU',
  sports: 'TOFU',
  platforms: 'MOFU',
  countries: 'MOFU',
  comparisons: 'MOFU',
  'genre-country': 'MOFU',
  'sport-country': 'MOFU',
  'compare-country': 'MOFU',
  'platform-country': 'MOFU',
  unblock: 'BOFU',
  'how-to-watch': 'BOFU',
  search: 'BOFU',
  pricing: 'BOFU',
  'vpn-guidance': 'BOFU',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns unblock links for countries where a platform is NOT available.
 * Generates `/unblock/{platformSlug}/{countrySlug}` links.
 */
export function getUnblockLinks(
  platform: StreamingPlatform,
  allCountries: StreamingCountry[],
  limit = 5,
): Array<{ label: string; href: string }> {
  return allCountries
    .filter(c => !platform.availableCountries.includes(c.iso))
    .slice(0, limit)
    .map(c => ({
      label: `Unblock ${platform.name} in ${c.name}`,
      href: `/unblock/${platform.slug}/${c.slug}`,
    }));
}

/**
 * Returns unblock links for platforms NOT available in a country.
 * Generates `/unblock/{platformSlug}/{countrySlug}` links.
 */
export function getCountryUnblockLinks(
  country: StreamingCountry,
  allPlatforms: StreamingPlatform[],
  limit = 5,
): Array<{ label: string; href: string }> {
  return allPlatforms
    .filter(p => !p.availableCountries.includes(country.iso))
    .slice(0, limit)
    .map(p => ({
      label: `Unblock ${p.name} in ${country.name}`,
      href: `/unblock/${p.slug}/${country.slug}`,
    }));
}

/** Filter out sections with no links. */
function nonEmpty(sections: RelatedSection[]): RelatedSection[] {
  return sections.filter(s => s.links.length > 0);
}

/**
 * Returns a stage-appropriate "Explore" section that links DOWN the funnel.
 * - TOFU → "Explore Streaming Services" (platforms, countries, compare, how-to-watch, search)
 * - MOFU → "Take the Next Step" (search, how-to-watch, pricing, vpn-guidance)
 * - BOFU → "Learn More" (platforms, compare, countries, guides, blog)
 */
export function buildFunnelExploreSection(stage: FunnelStage): RelatedSection {
  if (stage === FUNNEL_STAGE.TOFU) {
    return {
      title: SECTION_TITLES.EXPLORE_STREAMING_SERVICES,
      links: [
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Browse by Country', href: '/countries' },
        { label: 'Compare Services', href: '/compare' },
        { label: 'How to Watch', href: '/how-to-watch' },
        { label: 'Search Content', href: '/search' },
      ],
    };
  }
  if (stage === FUNNEL_STAGE.MOFU) {
    return {
      title: SECTION_TITLES.TAKE_THE_NEXT_STEP,
      links: [
        { label: 'Search Content', href: '/search' },
        { label: 'How to Watch', href: '/how-to-watch' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'VPN Guidance', href: '/vpn-guidance' },
      ],
    };
  }
  // BOFU
  return {
    title: 'Get Started',
    links: [
      { label: 'View Pricing', href: '/pricing' },
      { label: 'Search Content', href: '/search' },
      { label: 'How to Watch', href: '/how-to-watch' },
      { label: 'VPN Guidance', href: '/vpn-guidance' },
    ],
  };
}

// ---------------------------------------------------------------------------
// Platform detail page builder  (MOFU)
// ---------------------------------------------------------------------------

export function buildPlatformRelatedSections(platform: StreamingPlatform): RelatedSection[] {
  const competitorPlatforms = platform.competitors
    .map(s => platforms.find(p => p.slug === s))
    .filter((p): p is StreamingPlatform => Boolean(p))
    .slice(0, 5);

  const comparisonLinks = platform.competitors.slice(0, 3)
    .map(competitorSlug => {
      const match = comparisons.find(
        c => c.platformSlugs.includes(platform.slug) && c.platformSlugs.includes(competitorSlug),
      );
      if (!match) return null;
      const competitor = platforms.find(p => p.slug === competitorSlug);
      return {
        label: `${platform.name} vs ${competitor?.name ?? competitorSlug}`,
        href: `/compare/${match.slug}`,
      };
    })
    .filter((l): l is { label: string; href: string } => l !== null);

  const unblockLinks = getUnblockLinks(platform, countries, 3);

  const genreLinks = genreGuides
    .filter(g => g.bestPlatforms.some(bp => bp.platformSlug === platform.slug))
    .slice(0, 3)
    .map(g => ({ label: g.displayName, href: `/genres/${g.slug}` }));

  return nonEmpty([
    {
      title: SECTION_TITLES.COMPARE_ALTERNATIVES,
      links: competitorPlatforms.map(p => ({ label: p.name, href: `/platforms/${p.slug}` })),
    },
    {
      title: 'Comparisons',
      links: comparisonLinks,
    },
    {
      title: SECTION_TITLES.UNBLOCK_CONTENT,
      links: unblockLinks,
    },
    {
      title: 'Genre Guides',
      links: genreLinks,
    },
    {
      title: 'Available In',
      links: platform.availableCountries
        .slice(0, 5)
        .map(iso => getCountryByIso(iso))
        .filter((c): c is NonNullable<ReturnType<typeof getCountryByIso>> => Boolean(c))
        .map(c => ({ label: `${platform.name} in ${c.name}`, href: `/countries/${c.slug}` })),
    },
    buildFunnelExploreSection(FUNNEL_STAGE.MOFU),
  ]);
}

// ---------------------------------------------------------------------------
// Country detail page builder  (MOFU)
// ---------------------------------------------------------------------------

export function buildCountryRelatedSections(country: StreamingCountry): RelatedSection[] {
  const topPlatformData = country.topPlatforms
    .map(s => platforms.find(p => p.slug === s))
    .filter((p): p is StreamingPlatform => Boolean(p));

  const unblockLinks = getCountryUnblockLinks(country, platforms, 3);

  const sportsLinks = sports
    .filter(s => s.regionalPricing.some(p => p.countryIso.toUpperCase() === country.iso.toUpperCase()))
    .slice(0, 3)
    .map(s => ({ label: s.name, href: `/sports/${s.slug}/${country.slug}` }));

  const genreLinks = genreGuides
    .filter(g => g.bestPlatforms.some(bp => country.availablePlatforms.includes(bp.platformSlug)))
    .slice(0, 3)
    .map(g => ({ label: g.displayName, href: `/genres/${g.slug}/${country.slug}` }));

  const contextualComparisons = comparisons
    .filter(c => {
      const governance = getComparisonGovernance(c);
      const [a, b] = c.platformSlugs;
      return governance.promoteInRelatedLinks
        && country.availablePlatforms.includes(a)
        && country.availablePlatforms.includes(b);
    })
    .slice(0, 3);

  return nonEmpty([
    {
      title: 'Top Platforms',
      links: topPlatformData.map(p => ({
        label: `${p.name} Review`,
        href: `/platforms/${p.slug}`,
      })),
    },
    {
      title: 'Compare Platforms',
      links: topPlatformData.slice(0, 3).map(p => ({
        label: `${p.name} Review`,
        href: `/platforms/${p.slug}`,
      })),
    },
    {
      title: 'Compare in This Country',
      links: contextualComparisons.map(c => ({
        label: c.headline.split(':')[0] ?? c.slug,
        href: `/compare/${c.slug}`,
      })),
    },
    {
      title: SECTION_TITLES.UNBLOCK_CONTENT,
      links: unblockLinks,
    },
    {
      title: 'Sports Streaming',
      links: sportsLinks,
    },
    {
      title: 'Genre Guides',
      links: genreLinks,
    },
    buildFunnelExploreSection(FUNNEL_STAGE.MOFU),
  ]);
}

// ---------------------------------------------------------------------------
// Compare detail page builder  (MOFU)
// ---------------------------------------------------------------------------

export function buildCompareRelatedSections(comparison: PlatformComparison): RelatedSection[] {
  const [platformASlug, platformBSlug] = comparison.platformSlugs;
  const platformA = platforms.find(p => p.slug === platformASlug);
  const platformB = platforms.find(p => p.slug === platformBSlug);

  const relatedComparisons = comparisons
    .filter(
      c =>
        getComparisonGovernance(c).promoteInRelatedLinks &&
        c.slug !== comparison.slug &&
        (c.platformSlugs.includes(platformASlug) || c.platformSlugs.includes(platformBSlug)),
    )
    .slice(0, 5);

  const unblockLinks = [
    ...(platformA ? getUnblockLinks(platformA, countries, 1) : []),
    ...(platformB ? getUnblockLinks(platformB, countries, 1) : []),
  ];

  return nonEmpty([
    {
      title: SECTION_TITLES.RELATED_COMPARISONS,
      links: relatedComparisons.map(c => ({
        label: c.headline.split(':')[0] ?? c.slug,
        href: `/compare/${c.slug}`,
      })),
    },
    {
      title: 'Explore Platforms',
      links: [
        platformA ? { label: `${platformA.name} Review`, href: `/platforms/${platformA.slug}` } : null,
        platformB ? { label: `${platformB.name} Review`, href: `/platforms/${platformB.slug}` } : null,
      ].filter((l): l is { label: string; href: string } => l !== null),
    },
    {
      title: 'Unblock Alternatives',
      links: unblockLinks,
    },
    {
      title: SECTION_TITLES.EXPLORE_MORE,
      links: [
        { label: 'Product Features', href: '/features' },
        { label: 'Streaming Guides', href: '/guides' },
        { label: 'Blog', href: '/blog' },
        { label: 'How to Watch', href: '/how-to-watch' },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.MOFU),
  ]);
}

// ---------------------------------------------------------------------------
// Compare-in-country sub-page builder  (MOFU)
// ---------------------------------------------------------------------------

export function buildCompareInCountryRelatedSections(
  comparison: PlatformComparison,
  country: StreamingCountry,
): RelatedSection[] {
  const [platformASlug, platformBSlug] = comparison.platformSlugs;
  const platformA = platforms.find(p => p.slug === platformASlug);
  const platformB = platforms.find(p => p.slug === platformBSlug);

  const otherCountryLinks = countries
    .filter(c => c.slug !== country.slug)
    .slice(0, 8)
    .map(c => ({
      label: c.name,
      href: `/compare/${comparison.slug}/in/${c.slug}`,
    }));

  const unblockInCountryLinks = [
    platformA && !platformA.availableCountries.includes(country.iso)
      ? { label: `Unblock ${platformA.name} in ${country.name}`, href: `/unblock/${platformASlug}/${country.slug}` }
      : null,
    platformB && !platformB.availableCountries.includes(country.iso)
      ? { label: `Unblock ${platformB.name} in ${country.name}`, href: `/unblock/${platformBSlug}/${country.slug}` }
      : null,
  ].filter((l): l is { label: string; href: string } => l !== null);

  return nonEmpty([
    {
      title: `${comparison.headline.split(':')[0]} in Other Countries`,
      links: otherCountryLinks,
    },
    {
      title: 'Full Comparison',
      links: [
        { label: `${comparison.headline.split(':')[0]} (Global)`, href: `/compare/${comparison.slug}` },
      ],
    },
    {
      title: `Explore ${country.name}`,
      links: [
        { label: `Streaming in ${country.name}`, href: `/countries/${country.slug}` },
      ],
    },
    {
      title: 'Unblock in This Country',
      links: unblockInCountryLinks,
    },
    {
      title: SECTION_TITLES.EXPLORE_MORE,
      links: [
        { label: 'Compare Services', href: '/compare' },
        { label: 'Streaming Guides', href: '/guides' },
        { label: 'How to Watch', href: '/how-to-watch' },
      ],
    },
  ]);
}

// ---------------------------------------------------------------------------
// Genre detail page builder  (TOFU)
// ---------------------------------------------------------------------------

export function buildGenreRelatedSections(genre: GenreGuide): RelatedSection[] {
  const relatedGenreGuides = genre.relatedGenres
    .map(s => genreGuides.find(g => g.slug === s))
    .filter((g): g is GenreGuide => Boolean(g));

  const glossaryLinks = genre.relatedGlossary.map(term => ({
    label: term.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    href: `/glossary/${term}`,
  }));

  const topPlatformLinks = genre.bestPlatforms.slice(0, 3).map(entry => {
    const platform = platforms.find(p => p.slug === entry.platformSlug);
    return {
      label: platform?.name ?? entry.platformSlug,
      href: `/platforms/${entry.platformSlug}`,
    };
  });

  const genrePlatformSlugs = genre.bestPlatforms.map(bp => bp.platformSlug);
  const relatedSportLinks = sports
    .filter(s => s.globalPlatforms.some(ps => genrePlatformSlugs.includes(ps)))
    .slice(0, 3)
    .map(s => ({ label: s.name, href: `/sports/${s.slug}` }));

  return nonEmpty([
    {
      title: 'Related Genres',
      links: relatedGenreGuides.map(g => ({ label: g.displayName, href: `/genres/${g.slug}` })),
    },
    {
      title: 'Glossary',
      links: glossaryLinks,
    },
    {
      title: 'Top Platforms',
      links: topPlatformLinks,
    },
    {
      title: 'Sports Streaming',
      links: relatedSportLinks,
    },
    buildFunnelExploreSection(FUNNEL_STAGE.TOFU),
  ]);
}

// ---------------------------------------------------------------------------
// Genre-country sub-page builder  (MOFU)
// ---------------------------------------------------------------------------

export function buildGenreCountryRelatedSections(
  genre: GenreGuide,
  country: StreamingCountry,
): RelatedSection[] {
  const otherCountries = countries.filter(c => c.slug !== country.slug).slice(0, 5);

  const otherGenresInCountry = genreGuides
    .filter(
      g =>
        g.slug !== genre.slug &&
        g.bestPlatforms.some(bp => country.availablePlatforms.includes(bp.platformSlug)),
    )
    .slice(0, 5);

  return nonEmpty([
    {
      title: `${genre.displayName} in Other Countries`,
      links: otherCountries.map(c => ({
        label: c.name,
        href: `/genres/${genre.slug}/${c.slug}`,
      })),
    },
    {
      title: `Other Genres in ${country.name}`,
      links: otherGenresInCountry.map(g => ({
        label: g.displayName,
        href: `/genres/${g.slug}/${country.slug}`,
      })),
    },
    {
      title: SECTION_TITLES.EXPLORE_MORE,
      links: [
        { label: `${genre.displayName} Overview`, href: `/genres/${genre.slug}` },
        { label: `Streaming in ${country.name}`, href: `/countries/${country.slug}` },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.MOFU),
  ]);
}

// ---------------------------------------------------------------------------
// Glossary term page builder  (TOFU)
// ---------------------------------------------------------------------------

export function buildGlossaryRelatedSections(term: GlossaryTerm): RelatedSection[] {
  const relatedTermData = term.relatedTerms
    .map(s => glossaryTerms.find(t => t.slug === s))
    .filter((t): t is GlossaryTerm => Boolean(t));

  const relatedGuideData = streamingGuides
    .filter(g => g.relatedGlossary.includes(term.slug))
    .slice(0, 3);

  const relatedArticles = blogPosts
    .filter(p => p.relatedGlossary.includes(term.slug))
    .slice(0, 3);

  return nonEmpty([
    {
      title: 'Browse More',
      links: [
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Browse by Country', href: '/countries' },
        { label: 'Compare Services', href: '/compare' },
        { label: 'Genre Guides', href: '/genres' },
      ],
    },
    {
      title: 'Related Terms',
      links: relatedTermData.map(t => ({ label: t.term, href: `/glossary/${t.slug}` })),
    },
    {
      title: 'Related Guides',
      links: relatedGuideData.map(g => ({ label: g.title, href: `/guides/${g.slug}` })),
    },
    {
      title: 'Related Articles',
      links: relatedArticles.map(p => ({ label: p.title, href: `/blog/${p.slug}` })),
    },
    buildFunnelExploreSection(FUNNEL_STAGE.TOFU),
  ]);
}

// ---------------------------------------------------------------------------
// Guide detail page builder  (TOFU)
// ---------------------------------------------------------------------------

export function buildGuideRelatedSections(guide: StreamingGuide): RelatedSection[] {
  const relatedPlatformData = guide.relatedPlatforms
    .map(s => platforms.find(p => p.slug === s))
    .filter((p): p is StreamingPlatform => Boolean(p));

  const relatedCountryData = guide.relatedCountries
    .map(s => countries.find(c => c.slug === s))
    .filter((c): c is StreamingCountry => Boolean(c));

  const relatedGlossaryData = guide.relatedGlossary
    .map(s => glossaryTerms.find(t => t.slug === s))
    .filter((t): t is GlossaryTerm => Boolean(t));

  const relatedGuideData = guide.relatedGuides
    .map(s => streamingGuides.find(g => g.slug === s))
    .filter((g): g is StreamingGuide => Boolean(g));

  const comparisonLinks = guide.relatedPlatforms.slice(0, 3).flatMap(platformSlug =>
    comparisons
      .filter(c => c.platformSlugs.includes(platformSlug))
      .slice(0, 1)
      .map(c => ({
        label: c.headline.split(':')[0] ?? c.slug,
        href: `/compare/${c.slug}`,
      })),
  ).slice(0, 3);

  const genreLinks = genreGuides
    .filter(g => g.bestPlatforms.some(bp => guide.relatedPlatforms.includes(bp.platformSlug)))
    .slice(0, 3)
    .map(g => ({ label: g.displayName, href: `/genres/${g.slug}` }));

  return nonEmpty([
    {
      title: 'Related Platforms',
      links: relatedPlatformData.map(p => ({ label: p.name, href: `/platforms/${p.slug}` })),
    },
    {
      title: 'Related Countries',
      links: relatedCountryData.map(c => ({ label: c.name, href: `/countries/${c.slug}` })),
    },
    {
      title: 'Related Terms',
      links: relatedGlossaryData.map(t => ({ label: t.term, href: `/glossary/${t.slug}` })),
    },
    {
      title: 'Related Guides',
      links: relatedGuideData.map(g => ({ label: g.title, href: `/guides/${g.slug}` })),
    },
    {
      title: 'Related Comparisons',
      links: comparisonLinks,
    },
    {
      title: 'Genre Guides',
      links: genreLinks,
    },
    {
      title: SECTION_TITLES.EXPLORE_MORE,
      links: [
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Browse by Country', href: '/countries' },
        { label: 'Compare Services', href: '/compare' },
        { label: 'Blog', href: '/blog' },
        { label: 'Sports Streaming', href: '/sports' },
        { label: 'How to Watch', href: '/how-to-watch' },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.TOFU),
  ]);
}

// ---------------------------------------------------------------------------
// Blog post page builder  (TOFU)
// ---------------------------------------------------------------------------

export function buildBlogRelatedSections(
  post: BlogPost,
  allPosts: BlogPost[],
): RelatedSection[] {
  const relatedPlatformData = post.relatedPlatforms
    .map(s => platforms.find(p => p.slug === s))
    .filter((p): p is StreamingPlatform => Boolean(p));

  const relatedCountryData = post.relatedCountries
    .map(s => countries.find(c => c.slug === s))
    .filter((c): c is StreamingCountry => Boolean(c));

  const relatedGlossaryData = post.relatedGlossary
    .map(s => glossaryTerms.find(t => t.slug === s))
    .filter((t): t is GlossaryTerm => Boolean(t));

  const relatedArticles = allPosts
    .filter(p => p.slug !== post.slug && p.tags.some(t => post.tags.includes(t)))
    .slice(0, 4);

  const comparisonLinks = post.relatedPlatforms.slice(0, 3).flatMap(platformSlug =>
    comparisons
      .filter(c => c.platformSlugs.includes(platformSlug))
      .slice(0, 1)
      .map(c => ({
        label: c.headline.split(':')[0] ?? c.slug,
        href: `/compare/${c.slug}`,
      })),
  ).slice(0, 3);

  const genreLinks = genreGuides
    .filter(g => g.bestPlatforms.some(bp => post.relatedPlatforms.includes(bp.platformSlug)))
    .slice(0, 3)
    .map(g => ({ label: g.displayName, href: `/genres/${g.slug}` }));

  return nonEmpty([
    {
      title: 'Related Platforms',
      links: relatedPlatformData.map(p => ({ label: p.name, href: `/platforms/${p.slug}` })),
    },
    {
      title: 'Related Countries',
      links: relatedCountryData.map(c => ({ label: c.name, href: `/countries/${c.slug}` })),
    },
    {
      title: 'Related Terms',
      links: relatedGlossaryData.map(t => ({ label: t.term, href: `/glossary/${t.slug}` })),
    },
    {
      title: 'Related Articles',
      links: relatedArticles.map(p => ({ label: p.title, href: `/blog/${p.slug}` })),
    },
    {
      title: 'Related Comparisons',
      links: comparisonLinks,
    },
    {
      title: 'Genre Guides',
      links: genreLinks,
    },
    {
      title: SECTION_TITLES.EXPLORE_MORE,
      links: [
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Browse by Country', href: '/countries' },
        { label: 'Compare Services', href: '/compare' },
        { label: 'Streaming Guides', href: '/guides' },
        { label: 'Sports Streaming', href: '/sports' },
        { label: 'How to Watch', href: '/how-to-watch' },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.TOFU),
  ]);
}

// ---------------------------------------------------------------------------
// Sport detail page builder  (TOFU)
// ---------------------------------------------------------------------------

export function buildSportRelatedSections(sport: SportStreaming): RelatedSection[] {
  const relatedSportData = sport.relatedSports
    .map(s => sports.find(sp => sp.slug === s))
    .filter((s): s is SportStreaming => Boolean(s));

  const pricingCountryIsos = [...new Set(sport.regionalPricing.map(p => p.countryIso))];
  const pricingCountries = pricingCountryIsos.slice(0, 5).map(iso => {
    const c = getCountryByIso(iso);
    return c ? { name: c.name, slug: c.slug } : null;
  }).filter((c): c is { name: string; slug: string } => c !== null);

  const platformLinks = sport.globalPlatforms.slice(0, 4).map(platformSlug => {
    const platform = platforms.find(p => p.slug === platformSlug);
    return platform
      ? { label: platform.name, href: `/platforms/${platform.slug}` }
      : { label: platformSlug, href: `/platforms/${platformSlug}` };
  });

  const relatedGenreLinks = genreGuides
    .filter(g => g.bestPlatforms.some(bp => sport.globalPlatforms.includes(bp.platformSlug)))
    .slice(0, 3)
    .map(g => ({ label: g.displayName, href: `/genres/${g.slug}` }));

  return nonEmpty([
    {
      title: 'Related Sports',
      links: relatedSportData.map(s => ({ label: s.name, href: `/sports/${s.slug}` })),
    },
    {
      title: 'Browse by Country',
      links: pricingCountries.map(c => ({
        label: c.name,
        href: `/sports/${sport.slug}/${c.slug}`,
      })),
    },
    {
      title: 'Streaming Platforms',
      links: platformLinks,
    },
    {
      title: 'Genre Guides',
      links: relatedGenreLinks,
    },
    {
      title: SECTION_TITLES.EXPLORE_MORE,
      links: [
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Streaming Guides', href: '/guides' },
        { label: 'Blog', href: '/blog' },
        { label: 'Compare Services', href: '/compare' },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.TOFU),
  ]);
}

// ---------------------------------------------------------------------------
// Sport-country sub-page builder  (MOFU)
// ---------------------------------------------------------------------------

export function buildSportCountryRelatedSections(
  sport: SportStreaming,
  country: StreamingCountry,
): RelatedSection[] {
  const otherSportsInCountry = sports
    .filter(
      s =>
        s.slug !== sport.slug &&
        s.regionalPricing.some(p => p.countryIso.toLowerCase() === country.iso.toLowerCase()),
    )
    .slice(0, 5);

  const otherCountries = [...new Set(sport.regionalPricing.map(p => p.countryIso))]
    .filter(iso => iso.toLowerCase() !== country.iso.toLowerCase())
    .slice(0, 5)
    .map(iso => {
      const c = getCountryByIso(iso.toUpperCase());
      return c ? { name: c.name, slug: c.slug } : null;
    })
    .filter((c): c is { name: string; slug: string } => c !== null);

  return nonEmpty([
    {
      title: `Other Sports in ${country.name}`,
      links: otherSportsInCountry.map(s => ({
        label: s.name,
        href: `/sports/${s.slug}/${country.slug}`,
      })),
    },
    {
      title: `${sport.name} in Other Countries`,
      links: otherCountries.map(c => ({
        label: c.name,
        href: `/sports/${sport.slug}/${c.slug}`,
      })),
    },
    {
      title: SECTION_TITLES.EXPLORE_MORE,
      links: [
        { label: `${sport.name} Overview`, href: `/sports/${sport.slug}` },
        { label: `Streaming in ${country.name}`, href: `/countries/${country.slug}` },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.MOFU),
  ]);
}

// ---------------------------------------------------------------------------
// How-to-watch detail page builder  (BOFU)
// ---------------------------------------------------------------------------

export function buildHowToWatchRelatedSections(
  type: string,
  slug: string,
  country: StreamingCountry,
): RelatedSection[] {
  const otherCountries = countries.filter(c => c.slug !== country.slug).slice(0, 5);

  const topPlatformLinks = country.topPlatforms.slice(0, 3).map(s => {
    const p = platforms.find(pl => pl.slug === s);
    return p ? { label: `${p.name} in ${country.name}`, href: `/platforms/${p.slug}/countries/${country.slug}` } : null;
  }).filter((l): l is { label: string; href: string } => l !== null);

  const unblockLinks = platforms
    .filter(p => !p.availableCountries.includes(country.iso))
    .slice(0, 3)
    .map(p => ({
      label: `Unblock ${p.name} in ${country.name}`,
      href: `/unblock/${p.slug}/${country.slug}`,
    }));

  return nonEmpty([
    {
      title: `Watch in Other Countries`,
      links: otherCountries.map(c => ({
        label: c.name,
        href: `/how-to-watch/${type}/${slug}/in/${c.slug}`,
      })),
    },
    {
      title: `Streaming in ${country.name}`,
      links: [
        { label: `All platforms in ${country.name}`, href: `/countries/${country.slug}` },
        ...topPlatformLinks,
      ],
    },
    {
      title: SECTION_TITLES.UNBLOCK_CONTENT,
      links: unblockLinks,
    },
    buildFunnelExploreSection(FUNNEL_STAGE.BOFU),
  ]);
}

// ---------------------------------------------------------------------------
// Unblock detail page builder  (BOFU)
// ---------------------------------------------------------------------------

export function buildUnblockRelatedSections(
  platform: StreamingPlatform,
  country: StreamingCountry,
): RelatedSection[] {
  const otherPlatformsInCountry = platforms
    .filter(p => p.slug !== platform.slug && !p.availableCountries.includes(country.iso))
    .slice(0, 5);

  const otherCountriesForPlatform = countries
    .filter(c => c.slug !== country.slug && !platform.availableCountries.includes(c.iso))
    .slice(0, 5);

  const compareInCountryLinks = comparisons
    .filter(c => c.platformSlugs.includes(platform.slug))
    .slice(0, 3)
    .map(c => ({
      label: c.headline.split(':')[0] ?? c.slug,
      href: `/compare/${c.slug}/in/${country.slug}`,
    }));

  return nonEmpty([
    {
      title: `More platforms to unblock in ${country.name}`,
      links: otherPlatformsInCountry.map(p => ({
        label: `Unblock ${p.name} in ${country.name}`,
        href: `/unblock/${p.slug}/${country.slug}`,
      })),
    },
    {
      title: `Unblock ${platform.name} in other countries`,
      links: otherCountriesForPlatform.map(c => ({
        label: `${platform.name} in ${c.name}`,
        href: `/unblock/${platform.slug}/${c.slug}`,
      })),
    },
    {
      title: 'Compare Alternatives',
      links: compareInCountryLinks,
    },
    {
      title: 'Platform & Country Info',
      links: [
        { label: `${platform.name} Overview`, href: `/platforms/${platform.slug}` },
        { label: `Streaming in ${country.name}`, href: `/countries/${country.slug}` },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.BOFU),
  ]);
}

// ---------------------------------------------------------------------------
// Platform-country sub-page builder  (MOFU)
// ---------------------------------------------------------------------------

export function buildPlatformCountryRelatedSections(
  platform: StreamingPlatform,
  country: StreamingCountry,
): RelatedSection[] {
  const otherPlatformLinks = country.topPlatforms
    .filter(s => s !== platform.slug)
    .slice(0, 5)
    .map(s => {
      const p = platforms.find(pl => pl.slug === s);
      return { label: p?.name ?? s, href: `/platforms/${s}` };
    });

  const otherCountryLinks = platform.availableCountries
    .slice(0, 5)
    .map(iso => {
      const c = getCountryByIso(iso);
      return c ? { label: c.name, href: `/countries/${c.slug}` } : null;
    })
    .filter((l): l is { label: string; href: string } => l !== null);

  const genreLinks = genreGuides
    .filter(g => g.bestPlatforms.some(bp => bp.platformSlug === platform.slug))
    .slice(0, 4)
    .map(g => ({ label: g.displayName, href: `/genres/${g.slug}` }));

  const nearbyUnblockLinks = getUnblockLinks(
    platform,
    countries.filter(c => c.slug !== country.slug),
    3,
  );

  return nonEmpty([
    {
      title: `Other Platforms in ${country.name}`,
      links: otherPlatformLinks,
    },
    {
      title: `${platform.name} in Other Countries`,
      links: otherCountryLinks,
    },
    {
      title: 'Genres on This Platform',
      links: genreLinks,
    },
    {
      title: 'Unblock in Other Countries',
      links: nearbyUnblockLinks,
    },
    buildFunnelExploreSection(FUNNEL_STAGE.MOFU),
  ]);
}

// ---------------------------------------------------------------------------
// Index page builders
// ---------------------------------------------------------------------------

/** Platforms index page  (MOFU) */
export function buildPlatformIndexSections(): RelatedSection[] {
  return nonEmpty([
    {
      title: 'Explore by Region',
      links: [
        { label: 'Streaming by Country', href: '/countries' },
        { label: 'Compare Services', href: '/compare' },
        { label: 'Streaming Glossary', href: '/glossary' },
      ],
    },
    {
      title: 'Learn & Discover',
      links: [
        { label: 'Streaming Guides', href: '/guides' },
        { label: 'Blog', href: '/blog' },
        { label: 'Genre Guides', href: '/genres' },
        { label: 'Sports Streaming', href: '/sports' },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.MOFU),
  ]);
}

/** Countries index page  (MOFU) */
export function buildCountryIndexSections(): RelatedSection[] {
  return nonEmpty([
    {
      title: 'Explore Services',
      links: [
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Compare Services', href: '/compare' },
        { label: 'Streaming Glossary', href: '/glossary' },
      ],
    },
    {
      title: 'Learn & Discover',
      links: [
        { label: 'Streaming Guides', href: '/guides' },
        { label: 'Blog', href: '/blog' },
        { label: 'Genre Guides', href: '/genres' },
        { label: 'Sports Streaming', href: '/sports' },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.MOFU),
  ]);
}

/** Compare index page  (MOFU) */
export function buildCompareIndexSections(): RelatedSection[] {
  return nonEmpty([
    {
      title: 'Browse Platforms',
      links: [
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Streaming by Country', href: '/countries' },
      ],
    },
    {
      title: 'Learn & Discover',
      links: [
        { label: 'Streaming Guides', href: '/guides' },
        { label: 'Blog', href: '/blog' },
        { label: 'Streaming Glossary', href: '/glossary' },
        { label: 'Genre Guides', href: '/genres' },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.MOFU),
  ]);
}

/** Genre index page  (TOFU) */
export function buildGenreIndexSections(): RelatedSection[] {
  return nonEmpty([
    {
      title: 'Explore More',
      links: [
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Streaming by Country', href: '/countries' },
        { label: 'Streaming Glossary', href: '/glossary' },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.TOFU),
  ]);
}

/** Glossary index page  (TOFU) */
export function buildGlossaryIndexSections(): RelatedSection[] {
  return nonEmpty([
    {
      title: 'Explore',
      links: [
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Streaming by Country', href: '/countries' },
        { label: 'Compare Services', href: '/compare' },
        { label: 'Genre Guides', href: '/genres' },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.TOFU),
  ]);
}

/** Guides index page  (TOFU) */
export function buildGuideIndexSections(): RelatedSection[] {
  return nonEmpty([
    {
      title: 'Browse Services',
      links: [
        { label: 'Compare Services', href: '/compare' },
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Streaming by Country', href: '/countries' },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.TOFU),
  ]);
}

/** Blog index page  (TOFU) */
export function buildBlogIndexSections(): RelatedSection[] {
  return nonEmpty([
    {
      title: 'Browse Services',
      links: [
        { label: 'Compare Services', href: '/compare' },
        { label: 'Streaming Guides', href: '/guides' },
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Streaming by Country', href: '/countries' },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.TOFU),
  ]);
}

/** Sports index page  (TOFU) */
export function buildSportIndexSections(): RelatedSection[] {
  return nonEmpty([
    {
      title: 'Explore Services',
      links: [
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Streaming by Country', href: '/countries' },
        { label: 'Compare Services', href: '/compare' },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.TOFU),
  ]);
}

/** Unblock index page  (BOFU) */
export function buildUnblockIndexSections(): RelatedSection[] {
  return nonEmpty([
    {
      title: 'Browse Services',
      links: [
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Streaming by Country', href: '/countries' },
        { label: 'Compare Services', href: '/compare' },
        { label: 'How to Watch', href: '/how-to-watch' },
      ],
    },
    {
      title: 'Learn More',
      links: [
        { label: 'Streaming Guides', href: '/guides' },
        { label: 'Blog', href: '/blog' },
        { label: 'Streaming Glossary', href: '/glossary' },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.BOFU),
  ]);
}

/** How-to-watch index page  (BOFU) */
export function buildHowToWatchIndexSections(): RelatedSection[] {
  return nonEmpty([
    {
      title: 'Browse',
      links: [
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Streaming by Country', href: '/countries' },
        { label: 'Search Content', href: '/search' },
        { label: 'Pricing', href: '/pricing' },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.BOFU),
  ]);
}

// ---------------------------------------------------------------------------
// Standalone page builders
// ---------------------------------------------------------------------------

/** Homepage  -  full funnel */
export function buildHomepageSections(): RelatedSection[] {
  return [
    {
      title: 'Learn About Streaming',
      links: [
        { label: 'Streaming Guides', href: '/guides' },
        { label: 'Blog', href: '/blog' },
        { label: 'Genre Guides', href: '/genres' },
        { label: 'Sports Streaming', href: '/sports' },
        { label: 'Streaming Glossary', href: '/glossary' },
      ],
    },
    {
      title: 'Explore Services',
      links: [
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Streaming by Country', href: '/countries' },
        { label: 'Compare Services', href: '/compare' },
      ],
    },
    {
      title: 'Start Watching',
      links: [
        { label: 'Product Features', href: '/features' },
        { label: 'Search Content', href: '/search' },
        { label: 'How to Watch', href: '/how-to-watch' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'VPN Guidance', href: '/vpn-guidance' },
      ],
    },
  ];
}

/** Pricing page  (BOFU) */
export function buildPricingSections(): RelatedSection[] {
  return nonEmpty([
    {
      title: 'Explore Before You Buy',
      links: [
        { label: 'Search Content', href: '/search' },
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Compare Services', href: '/compare' },
        { label: 'Streaming by Country', href: '/countries' },
      ],
    },
    {
      title: 'Content Discovery',
      links: [
        { label: 'How to Watch', href: '/how-to-watch' },
        { label: 'Sports Streaming', href: '/sports' },
        { label: 'Genre Guides', href: '/genres' },
      ],
    },
    {
      title: 'Learn More',
      links: [
        { label: 'FAQ', href: '/faq' },
        { label: 'Streaming Guides', href: '/guides' },
        { label: 'Blog', href: '/blog' },
        { label: 'Streaming Glossary', href: '/glossary' },
      ],
    },
  ]);
}

/** FAQ page  (Support) */
export function buildFaqSections(): RelatedSection[] {
  return nonEmpty([
    {
      title: 'Learn More',
      links: [
        { label: 'Streaming Guides', href: '/guides' },
        { label: 'Blog', href: '/blog' },
        { label: 'Streaming Glossary', href: '/glossary' },
        { label: 'VPN Guidance', href: '/vpn-guidance' },
      ],
    },
    {
      title: 'Explore',
      links: [
        { label: 'Search Content', href: '/search' },
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Streaming by Country', href: '/countries' },
        { label: 'Compare Services', href: '/compare' },
        { label: 'How to Watch', href: '/how-to-watch' },
      ],
    },
    {
      title: 'Pricing',
      links: [
        { label: 'View Pricing', href: '/pricing' },
      ],
    },
  ]);
}

/** Search page  (BOFU) */
export function buildSearchSections(): RelatedSection[] {
  return nonEmpty([
    {
      title: 'Browse',
      links: [
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Streaming by Country', href: '/countries' },
        { label: 'Compare Services', href: '/compare' },
        { label: 'How to Watch', href: '/how-to-watch' },
      ],
    },
    {
      title: 'Learn',
      links: [
        { label: 'Streaming Guides', href: '/guides' },
        { label: 'Blog', href: '/blog' },
        { label: 'Genre Guides', href: '/genres' },
        { label: 'Sports Streaming', href: '/sports' },
        { label: 'Streaming Glossary', href: '/glossary' },
      ],
    },
    {
      title: 'Get Started',
      links: [
        { label: 'Pricing', href: '/pricing' },
        { label: 'VPN Guidance', href: '/vpn-guidance' },
      ],
    },
  ]);
}

/** VPN Guidance page  (BOFU) */
export function buildVpnGuidanceSections(): RelatedSection[] {
  return nonEmpty([
    {
      title: 'Browse',
      links: [
        { label: 'Streaming Platforms', href: '/platforms' },
        { label: 'Streaming by Country', href: '/countries' },
        { label: 'Search Content', href: '/search' },
        { label: 'How to Watch', href: '/how-to-watch' },
      ],
    },
    {
      title: 'Learn',
      links: [
        { label: 'Streaming Guides', href: '/guides' },
        { label: 'Blog', href: '/blog' },
        { label: 'Streaming Glossary', href: '/glossary' },
        { label: 'Sports Streaming', href: '/sports' },
        { label: 'Genre Guides', href: '/genres' },
      ],
    },
    {
      title: 'Pricing',
      links: [
        { label: 'View Pricing', href: '/pricing' },
      ],
    },
  ]);
}

// ---------------------------------------------------------------------------
// Unblock hub page builder  (BOFU)
// ---------------------------------------------------------------------------

export function buildUnblockHubRelatedSections(
  platform: StreamingPlatform,
): RelatedSection[] {
  const blockedCountries = countries
    .filter(c => !platform.availableCountries.includes(c.iso))
    .slice(0, 5);

  const otherPlatforms = platforms
    .filter(p => p.slug !== platform.slug)
    .slice(0, 5);

  return nonEmpty([
    {
      title: `Unblock ${platform.name} by Country`,
      links: blockedCountries.map(c => ({
        label: `${platform.name} in ${c.name}`,
        href: `/unblock/${platform.slug}/${c.slug}`,
      })),
    },
    {
      title: 'Unblock Other Platforms',
      links: otherPlatforms.map(p => ({
        label: `Unblock ${p.name}`,
        href: `/unblock/${p.slug}`,
      })),
    },
    {
      title: 'Platform Info',
      links: [
        { label: `${platform.name} Overview`, href: `/platforms/${platform.slug}` },
        { label: 'All Platforms', href: '/platforms' },
        { label: 'All Countries', href: '/countries' },
      ],
    },
    buildFunnelExploreSection(FUNNEL_STAGE.BOFU),
  ]);
}
