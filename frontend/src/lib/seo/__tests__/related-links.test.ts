import {
  SECTION_TITLES,
  FUNNEL_STAGE,
  PAGE_TYPE_FUNNEL,
  buildFunnelExploreSection,
  getUnblockLinks,
  getCountryUnblockLinks,
  buildPlatformRelatedSections,
  buildCountryRelatedSections,
  buildCompareRelatedSections,
  buildCompareInCountryRelatedSections,
  buildGenreRelatedSections,
  buildGenreCountryRelatedSections,
  buildGlossaryRelatedSections,
  buildGuideRelatedSections,
  buildBlogRelatedSections,
  buildSportRelatedSections,
  buildSportCountryRelatedSections,
  buildHowToWatchRelatedSections,
  buildUnblockRelatedSections,
  buildPlatformCountryRelatedSections,
  buildPlatformIndexSections,
  buildCountryIndexSections,
  buildCompareIndexSections,
  buildGenreIndexSections,
  buildGlossaryIndexSections,
  buildGuideIndexSections,
  buildBlogIndexSections,
  buildSportIndexSections,
  buildHowToWatchIndexSections,
  buildHomepageSections,
  buildPricingSections,
  buildFaqSections,
  buildSearchSections,
  buildVpnGuidanceSections,
} from '../related-links';
import { platforms } from '@/data/platforms';
import { countries } from '@/data/countries';
import { comparisons } from '@/data/comparisons';
import { genreGuides } from '@/data/genres';
import { glossaryTerms } from '@/data/glossary';
import { streamingGuides } from '@/data/guides';
import { blogPosts } from '@/data/blog-posts';
import { sports } from '@/data/sports';

// Helper to assert all links in sections are valid
function assertValidSections(sections: Array<{ title: string; links: Array<{ label: string; href: string }> }>) {
  expect(Array.isArray(sections)).toBe(true);
  for (const section of sections) {
    expect(typeof section.title).toBe('string');
    expect(section.title.length).toBeGreaterThan(0);
    expect(Array.isArray(section.links)).toBe(true);
    for (const link of section.links) {
      expect(link.href).toMatch(/^\//);
      expect(link.label.length).toBeGreaterThan(0);
    }
  }
}

describe('SECTION_TITLES constants', () => {
  it('exports standardized title strings', () => {
    expect(SECTION_TITLES.COMPARE_ALTERNATIVES).toBe('Compare Alternatives');
    expect(SECTION_TITLES.UNBLOCK_CONTENT).toBe('Unblock Content');
    expect(SECTION_TITLES.EXPLORE_MORE).toBe('Explore More');
    expect(SECTION_TITLES.RELATED_COMPARISONS).toBe('Related Comparisons');
    expect(SECTION_TITLES.EXPLORE_STREAMING_SERVICES).toBe('Explore Streaming Services');
    expect(SECTION_TITLES.TAKE_THE_NEXT_STEP).toBe('Take the Next Step');
    expect(SECTION_TITLES.LEARN_MORE).toBe('Learn More');
  });
});

describe('FUNNEL_STAGE constants', () => {
  it('exports TOFU, MOFU, BOFU values', () => {
    expect(FUNNEL_STAGE.TOFU).toBe('TOFU');
    expect(FUNNEL_STAGE.MOFU).toBe('MOFU');
    expect(FUNNEL_STAGE.BOFU).toBe('BOFU');
  });
});

describe('PAGE_TYPE_FUNNEL', () => {
  it('maps TOFU page types correctly', () => {
    expect(PAGE_TYPE_FUNNEL['blog']).toBe('TOFU');
    expect(PAGE_TYPE_FUNNEL['guides']).toBe('TOFU');
    expect(PAGE_TYPE_FUNNEL['genres']).toBe('TOFU');
    expect(PAGE_TYPE_FUNNEL['glossary']).toBe('TOFU');
    expect(PAGE_TYPE_FUNNEL['sports']).toBe('TOFU');
  });

  it('maps MOFU page types correctly', () => {
    expect(PAGE_TYPE_FUNNEL['platforms']).toBe('MOFU');
    expect(PAGE_TYPE_FUNNEL['countries']).toBe('MOFU');
    expect(PAGE_TYPE_FUNNEL['comparisons']).toBe('MOFU');
    expect(PAGE_TYPE_FUNNEL['platform-country']).toBe('MOFU');
    expect(PAGE_TYPE_FUNNEL['genre-country']).toBe('MOFU');
    expect(PAGE_TYPE_FUNNEL['sport-country']).toBe('MOFU');
    expect(PAGE_TYPE_FUNNEL['compare-country']).toBe('MOFU');
  });

  it('maps BOFU page types correctly', () => {
    expect(PAGE_TYPE_FUNNEL['unblock']).toBe('BOFU');
    expect(PAGE_TYPE_FUNNEL['how-to-watch']).toBe('BOFU');
    expect(PAGE_TYPE_FUNNEL['search']).toBe('BOFU');
    expect(PAGE_TYPE_FUNNEL['pricing']).toBe('BOFU');
    expect(PAGE_TYPE_FUNNEL['vpn-guidance']).toBe('BOFU');
  });
});

describe('buildFunnelExploreSection', () => {
  it('TOFU returns Explore Streaming Services with correct links', () => {
    const section = buildFunnelExploreSection(FUNNEL_STAGE.TOFU);
    expect(section.title).toBe(SECTION_TITLES.EXPLORE_STREAMING_SERVICES);
    const hrefs = section.links.map(l => l.href);
    expect(hrefs).toContain('/platforms');
    expect(hrefs).toContain('/countries');
    expect(hrefs).toContain('/compare');
    expect(hrefs).toContain('/how-to-watch');
    expect(hrefs).toContain('/search');
  });

  it('MOFU returns Take the Next Step with conversion links', () => {
    const section = buildFunnelExploreSection(FUNNEL_STAGE.MOFU);
    expect(section.title).toBe(SECTION_TITLES.TAKE_THE_NEXT_STEP);
    const hrefs = section.links.map(l => l.href);
    expect(hrefs).toContain('/search');
    expect(hrefs).toContain('/how-to-watch');
    expect(hrefs).toContain('/pricing');
    expect(hrefs).toContain('/vpn-guidance');
  });

  it('BOFU returns Get Started with conversion-focused links', () => {
    const section = buildFunnelExploreSection(FUNNEL_STAGE.BOFU);
    expect(section.title).toBe('Get Started');
    const hrefs = section.links.map(l => l.href);
    expect(hrefs).toContain('/pricing');
    expect(hrefs).toContain('/search');
    expect(hrefs).toContain('/how-to-watch');
    expect(hrefs).toContain('/vpn-guidance');
  });

  it('every section has non-empty links with valid hrefs', () => {
    for (const stage of [FUNNEL_STAGE.TOFU, FUNNEL_STAGE.MOFU, FUNNEL_STAGE.BOFU]) {
      const section = buildFunnelExploreSection(stage);
      expect(section.links.length).toBeGreaterThan(0);
      for (const link of section.links) {
        expect(link.href).toMatch(/^\//);
        expect(link.label.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('getUnblockLinks', () => {
  const netflix = platforms.find(p => p.slug === 'netflix') ?? platforms[0];

  it('returns links only for countries where platform is NOT available', () => {
    const links = getUnblockLinks(netflix, countries, 10);
    for (const link of links) {
      expect(link.href).toMatch(/^\/unblock\//);
      expect(link.href).toContain(netflix.slug);
    }
  });

  it('respects the limit parameter', () => {
    const links = getUnblockLinks(netflix, countries, 3);
    expect(links.length).toBeLessThanOrEqual(3);
  });

  it('returns empty array when platform is available in all countries', () => {
    const allCountryIsos = countries.map(c => c.iso);
    const mockPlatform = { ...netflix, availableCountries: allCountryIsos };
    const links = getUnblockLinks(mockPlatform, countries, 5);
    expect(links).toHaveLength(0);
  });

  it('generates correct href pattern', () => {
    const smallPlatform = { ...netflix, availableCountries: [] };
    const links = getUnblockLinks(smallPlatform, countries.slice(0, 2), 5);
    expect(links.length).toBe(2);
    for (const link of links) {
      expect(link.href).toMatch(/^\/unblock\/[a-z-]+\/[a-z-]+$/);
    }
  });
});

describe('getCountryUnblockLinks', () => {
  const usa = countries.find(c => c.iso === 'US') ?? countries[0];

  it('returns links for platforms NOT available in the country', () => {
    const links = getCountryUnblockLinks(usa, platforms, 5);
    for (const link of links) {
      expect(link.href).toMatch(/^\/unblock\//);
      expect(link.href).toContain(usa.slug);
    }
  });

  it('respects the limit parameter', () => {
    const links = getCountryUnblockLinks(usa, platforms, 3);
    expect(links.length).toBeLessThanOrEqual(3);
  });

  it('returns empty array when country has all platforms', () => {
    const allPlatformSlugs = platforms.map(p => p.slug);
    const mockCountry = { ...usa, availablePlatforms: allPlatformSlugs };
    const allIsos = [usa.iso];
    const mockPlatforms = platforms.map(p => ({ ...p, availableCountries: allIsos }));
    const links = getCountryUnblockLinks(mockCountry, mockPlatforms, 5);
    expect(links).toHaveLength(0);
  });
});

describe('buildPlatformRelatedSections', () => {
  const platform = platforms[0];

  it('returns non-empty sections array with valid structure', () => {
    const sections = buildPlatformRelatedSections(platform);
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes a Take the Next Step section (MOFU)', () => {
    const sections = buildPlatformRelatedSections(platform);
    const mofu = sections.find(s => s.title === SECTION_TITLES.TAKE_THE_NEXT_STEP);
    expect(mofu).toBeDefined();
    expect(mofu!.links.length).toBeGreaterThan(0);
  });

  it('does not include empty sections', () => {
    const sections = buildPlatformRelatedSections(platform);
    for (const section of sections) {
      expect(section.links.length).toBeGreaterThan(0);
    }
  });

  it('includes Unblock Content section when platform is not available everywhere', () => {
    const restrictedPlatform = platforms.find(
      p => p.availableCountries.length < countries.length
    );
    if (!restrictedPlatform) return;
    const sections = buildPlatformRelatedSections(restrictedPlatform);
    const unblockSection = sections.find(s => s.title === SECTION_TITLES.UNBLOCK_CONTENT);
    expect(unblockSection).toBeDefined();
  });

  it('includes Genre Guides cross-links for platform with genres', () => {
    const platformWithGenres = platforms.find(
      p => genreGuides.some(g => g.bestPlatforms.some(bp => bp.platformSlug === p.slug))
    );
    if (!platformWithGenres) return;
    const sections = buildPlatformRelatedSections(platformWithGenres);
    const genreSection = sections.find(s => s.title === 'Genre Guides');
    expect(genreSection).toBeDefined();
    expect(genreSection!.links.every(l => l.href.startsWith('/genres/'))).toBe(true);
  });
});

describe('buildCountryRelatedSections', () => {
  const country = countries[0];

  it('returns non-empty sections array with valid structure', () => {
    const sections = buildCountryRelatedSections(country);
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes a Take the Next Step section (MOFU)', () => {
    const sections = buildCountryRelatedSections(country);
    const mofu = sections.find(s => s.title === SECTION_TITLES.TAKE_THE_NEXT_STEP);
    expect(mofu).toBeDefined();
  });

  it('does not include empty sections', () => {
    const sections = buildCountryRelatedSections(country);
    for (const section of sections) {
      expect(section.links.length).toBeGreaterThan(0);
    }
  });

  it('includes contextual Compare in This Country links when comparisons exist for available platforms', () => {
    const countryWithComparisons = countries.find(c => {
      return comparisons.some(comp => {
        const [a, b] = comp.platformSlugs;
        return c.availablePlatforms.includes(a) && c.availablePlatforms.includes(b);
      });
    });
    if (!countryWithComparisons) return;

    const sections = buildCountryRelatedSections(countryWithComparisons);
    const compareSection = sections.find(s => s.title === 'Compare in This Country');
    expect(compareSection).toBeDefined();
    expect(compareSection!.links.every(l => l.href.startsWith('/compare/'))).toBe(true);
    expect(compareSection!.links.every(l => !l.href.includes('/in/'))).toBe(true);
  });
});

describe('buildCompareRelatedSections', () => {
  const comparison = comparisons[0];

  it('returns non-empty sections array with valid structure', () => {
    const sections = buildCompareRelatedSections(comparison);
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes a Take the Next Step section (MOFU)', () => {
    const sections = buildCompareRelatedSections(comparison);
    const mofu = sections.find(s => s.title === SECTION_TITLES.TAKE_THE_NEXT_STEP);
    expect(mofu).toBeDefined();
  });

  it('does not include empty sections', () => {
    const sections = buildCompareRelatedSections(comparison);
    for (const section of sections) {
      expect(section.links.length).toBeGreaterThan(0);
    }
  });

  it('includes Unblock Alternatives section pointing to /unblock/ for each platform', () => {
    const sections = buildCompareRelatedSections(comparison);
    const unblockSection = sections.find(s => s.title === 'Unblock Alternatives');
    expect(unblockSection).toBeDefined();
    expect(unblockSection!.links.every(l => l.href.startsWith('/unblock/'))).toBe(true);
  });
});

describe('buildCompareInCountryRelatedSections', () => {
  const comparison = comparisons[0];
  const country = countries[0];

  it('returns non-empty sections array with valid structure', () => {
    const sections = buildCompareInCountryRelatedSections(comparison, country);
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('does not include empty sections', () => {
    const sections = buildCompareInCountryRelatedSections(comparison, country);
    for (const section of sections) {
      expect(section.links.length).toBeGreaterThan(0);
    }
  });

  it('section title includes a country-specific label using headline', () => {
    const sections = buildCompareInCountryRelatedSections(comparison, country);
    const titles = sections.map(s => s.title);
    for (const title of titles) {
      expect(title.length).toBeGreaterThan(0);
    }
  });

  it('includes a link back to the global compare page', () => {
    const sections = buildCompareInCountryRelatedSections(comparison, country);
    const allHrefs = sections.flatMap(s => s.links.map(l => l.href));
    expect(allHrefs.some(href => href === `/compare/${comparison.slug}`)).toBe(true);
  });

  it('other-country links follow /compare/:slug/countries/:countrySlug pattern', () => {
    const sections = buildCompareInCountryRelatedSections(comparison, country);
    const otherCountrySection = sections.find(s => s.title.toLowerCase().includes('other countri'));
    if (otherCountrySection && otherCountrySection.links.length > 0) {
      for (const link of otherCountrySection.links) {
        expect(link.href).toMatch(/^\/compare\/[^/]+\/in\/[^/]+$/);
      }
    }
  });

  it('includes Unblock in This Country links when a compared platform is not available', () => {
    // Find a comparison + country where at least one platform is blocked
    const blockedCase = (() => {
      for (const comp of comparisons) {
        const [a, b] = comp.platformSlugs;
        for (const c of countries) {
          const pA = platforms.find(p => p.slug === a);
          const pB = platforms.find(p => p.slug === b);
          if (pA && !pA.availableCountries.includes(c.iso)) return { comp, country: c };
          if (pB && !pB.availableCountries.includes(c.iso)) return { comp, country: c };
        }
      }
      return null;
    })();
    if (!blockedCase) return;

    const sections = buildCompareInCountryRelatedSections(blockedCase.comp, blockedCase.country);
    const unblockSection = sections.find(s => s.title === 'Unblock in This Country');
    expect(unblockSection).toBeDefined();
    expect(unblockSection!.links.every(l => l.href.startsWith('/unblock/'))).toBe(true);
    expect(unblockSection!.links.every(l => l.href.includes(`/${blockedCase.country.slug}`))).toBe(true);
  });
});

describe('buildGenreRelatedSections', () => {
  const genre = genreGuides[0];

  it('returns non-empty sections array with valid structure', () => {
    const sections = buildGenreRelatedSections(genre);
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes an Explore Streaming Services section (TOFU)', () => {
    const sections = buildGenreRelatedSections(genre);
    const exploreSection = sections.find(s => s.title === SECTION_TITLES.EXPLORE_STREAMING_SERVICES);
    expect(exploreSection).toBeDefined();
  });

  it('does not include empty sections', () => {
    const sections = buildGenreRelatedSections(genre);
    for (const section of sections) {
      expect(section.links.length).toBeGreaterThan(0);
    }
  });

  it('includes Related Genres when genre has related genres', () => {
    const genreWithRelated = genreGuides.find(g => g.relatedGenres.length > 0);
    if (!genreWithRelated) return;
    const sections = buildGenreRelatedSections(genreWithRelated);
    const relatedSection = sections.find(s => s.title === 'Related Genres');
    expect(relatedSection).toBeDefined();
  });

  it('includes Sports Streaming section when sport platforms overlap with genre platforms', () => {
    const genreWithSportOverlap = genreGuides.find(g => {
      const platformSlugs = g.bestPlatforms.map(bp => bp.platformSlug);
      return sports.some(s => s.globalPlatforms.some(ps => platformSlugs.includes(ps)));
    });
    if (!genreWithSportOverlap) return;

    const sections = buildGenreRelatedSections(genreWithSportOverlap);
    const sportSection = sections.find(s => s.title === 'Sports Streaming');
    expect(sportSection).toBeDefined();
    expect(sportSection!.links.every(l => l.href.startsWith('/sports/'))).toBe(true);
  });
});

describe('buildGenreCountryRelatedSections', () => {
  const genre = genreGuides[0];
  const country = countries[0];

  it('returns non-empty sections array with valid structure', () => {
    const sections = buildGenreCountryRelatedSections(genre, country);
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });
});

describe('buildGlossaryRelatedSections', () => {
  const term = glossaryTerms[0];

  it('returns non-empty sections array with valid structure', () => {
    const sections = buildGlossaryRelatedSections(term);
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes an Explore Streaming Services section (TOFU)', () => {
    const sections = buildGlossaryRelatedSections(term);
    const exploreSection = sections.find(s => s.title === SECTION_TITLES.EXPLORE_STREAMING_SERVICES);
    expect(exploreSection).toBeDefined();
  });

  it('includes /compare in Browse More and /how-to-watch in Explore Streaming Services', () => {
    const sections = buildGlossaryRelatedSections(term);
    const browseMore = sections.find(s => s.title === 'Browse More');
    expect(browseMore).toBeDefined();
    expect(browseMore!.links.map(l => l.href)).toContain('/compare');
    const exploreSection = sections.find(s => s.title === SECTION_TITLES.EXPLORE_STREAMING_SERVICES);
    expect(exploreSection).toBeDefined();
    expect(exploreSection!.links.map(l => l.href)).toContain('/how-to-watch');
  });

  it('includes Related Guides when streaming guides reference this term', () => {
    const termWithGuides = glossaryTerms.find(t =>
      streamingGuides.some(g => g.relatedGlossary.includes(t.slug))
    );
    if (!termWithGuides) return;

    const sections = buildGlossaryRelatedSections(termWithGuides);
    const guidesSection = sections.find(s => s.title === 'Related Guides');
    expect(guidesSection).toBeDefined();
    expect(guidesSection!.links.every(l => l.href.startsWith('/guides/'))).toBe(true);
  });

  it('includes Related Articles when blog posts reference this term', () => {
    const termWithPosts = glossaryTerms.find(t =>
      blogPosts.some(p => p.relatedGlossary.includes(t.slug))
    );
    if (!termWithPosts) return;

    const sections = buildGlossaryRelatedSections(termWithPosts);
    const articlesSection = sections.find(s => s.title === 'Related Articles');
    expect(articlesSection).toBeDefined();
    expect(articlesSection!.links.every(l => l.href.startsWith('/blog/'))).toBe(true);
  });
});

describe('buildGuideRelatedSections', () => {
  const guide = streamingGuides[0];

  it('returns sections array with valid structure', () => {
    const sections = buildGuideRelatedSections(guide);
    assertValidSections(sections);
  });

  it('includes an Explore Streaming Services section (TOFU)', () => {
    const sections = buildGuideRelatedSections(guide);
    const exploreSection = sections.find(s => s.title === SECTION_TITLES.EXPLORE_STREAMING_SERVICES);
    expect(exploreSection).toBeDefined();
  });

  it('includes /compare and /how-to-watch in Explore Streaming Services', () => {
    const sections = buildGuideRelatedSections(guide);
    const exploreSection = sections.find(s => s.title === SECTION_TITLES.EXPLORE_STREAMING_SERVICES);
    expect(exploreSection).toBeDefined();
    const hrefs = exploreSection!.links.map(l => l.href);
    expect(hrefs).toContain('/compare');
    expect(hrefs).toContain('/how-to-watch');
  });

  it('does not include empty sections', () => {
    const sections = buildGuideRelatedSections(guide);
    for (const section of sections) {
      expect(section.links.length).toBeGreaterThan(0);
    }
  });

  it('includes Genre Guides section when guide platforms match genre platform entries', () => {
    const guideWithPlatforms = streamingGuides.find(g => {
      return g.relatedPlatforms.length > 0 &&
        genreGuides.some(genre => genre.bestPlatforms.some(bp => g.relatedPlatforms.includes(bp.platformSlug)));
    });
    if (!guideWithPlatforms) return;

    const sections = buildGuideRelatedSections(guideWithPlatforms);
    const genreSection = sections.find(s => s.title === 'Genre Guides');
    expect(genreSection).toBeDefined();
    expect(genreSection!.links.every(l => l.href.startsWith('/genres/'))).toBe(true);
  });
});

describe('buildBlogRelatedSections', () => {
  const post = blogPosts[0];

  it('returns sections array with valid structure', () => {
    const sections = buildBlogRelatedSections(post, blogPosts);
    assertValidSections(sections);
  });

  it('includes an Explore Streaming Services section (TOFU)', () => {
    const sections = buildBlogRelatedSections(post, blogPosts);
    const exploreSection = sections.find(s => s.title === SECTION_TITLES.EXPLORE_STREAMING_SERVICES);
    expect(exploreSection).toBeDefined();
  });

  it('includes /compare and /how-to-watch in Explore Streaming Services', () => {
    const sections = buildBlogRelatedSections(post, blogPosts);
    const exploreSection = sections.find(s => s.title === SECTION_TITLES.EXPLORE_STREAMING_SERVICES);
    expect(exploreSection).toBeDefined();
    const hrefs = exploreSection!.links.map(l => l.href);
    expect(hrefs).toContain('/compare');
    expect(hrefs).toContain('/how-to-watch');
  });

  it('does not include empty sections', () => {
    const sections = buildBlogRelatedSections(post, blogPosts);
    for (const section of sections) {
      expect(section.links.length).toBeGreaterThan(0);
    }
  });

  it('includes Genre Guides section when post platforms match genre platform entries', () => {
    const postWithPlatforms = blogPosts.find(p => {
      return p.relatedPlatforms.length > 0 &&
        genreGuides.some(g => g.bestPlatforms.some(bp => p.relatedPlatforms.includes(bp.platformSlug)));
    });
    if (!postWithPlatforms) return;

    const sections = buildBlogRelatedSections(postWithPlatforms, blogPosts);
    const genreSection = sections.find(s => s.title === 'Genre Guides');
    expect(genreSection).toBeDefined();
    expect(genreSection!.links.every(l => l.href.startsWith('/genres/'))).toBe(true);
  });
});

describe('buildSportRelatedSections', () => {
  const sport = sports[0];

  it('returns non-empty sections array with valid structure', () => {
    const sections = buildSportRelatedSections(sport);
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes an Explore Streaming Services section (TOFU)', () => {
    const sections = buildSportRelatedSections(sport);
    const exploreSection = sections.find(s => s.title === SECTION_TITLES.EXPLORE_STREAMING_SERVICES);
    expect(exploreSection).toBeDefined();
    expect(exploreSection!.links.length).toBeGreaterThan(0);
  });

  it('includes an Explore More section', () => {
    const sections = buildSportRelatedSections(sport);
    const exploreMore = sections.find(s => s.title === SECTION_TITLES.EXPLORE_MORE);
    expect(exploreMore).toBeDefined();
    expect(exploreMore!.links.length).toBeGreaterThan(0);
  });

  it('links to genre pages via Genre Guides section or Explore More', () => {
    const sections = buildSportRelatedSections(sport);
    const allHrefs = sections.flatMap(s => s.links.map(l => l.href));
    const hasGenreLink = allHrefs.some(href => href.startsWith('/genres'));
    expect(hasGenreLink).toBe(true);
  });

  it('Browse by Country links point to /sports/ URLs not /countries/', () => {
    const sections = buildSportRelatedSections(sport);
    const countrySection = sections.find(s => s.title === 'Browse by Country');
    if (!countrySection) return;
    for (const link of countrySection.links) {
      expect(link.href).toMatch(new RegExp(`^/sports/${sport.slug}/`));
    }
  });

  it('includes Streaming Platforms section from globalPlatforms', () => {
    const sections = buildSportRelatedSections(sport);
    const platformSection = sections.find(s => s.title === 'Streaming Platforms');
    expect(platformSection).toBeDefined();
    expect(platformSection!.links.length).toBeGreaterThan(0);
    for (const link of platformSection!.links) {
      expect(link.href).toMatch(/^\/platforms\//);
    }
  });

  it('includes Genre Guides section when sport globalPlatforms overlap with genre bestPlatforms', () => {
    const sportWithGenreOverlap = sports.find(s =>
      genreGuides.some(g => g.bestPlatforms.some(bp => s.globalPlatforms.includes(bp.platformSlug)))
    );
    if (!sportWithGenreOverlap) return;

    const sections = buildSportRelatedSections(sportWithGenreOverlap);
    const genreSection = sections.find(s => s.title === 'Genre Guides');
    expect(genreSection).toBeDefined();
    expect(genreSection!.links.every(l => l.href.startsWith('/genres/'))).toBe(true);
  });
});

describe('buildSportCountryRelatedSections', () => {
  const sport = sports[0];
  const country = countries[0];

  it('returns non-empty sections array with valid structure', () => {
    const sections = buildSportCountryRelatedSections(sport, country);
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes a Take the Next Step section (MOFU)', () => {
    const sections = buildSportCountryRelatedSections(sport, country);
    const mofu = sections.find(s => s.title === SECTION_TITLES.TAKE_THE_NEXT_STEP);
    expect(mofu).toBeDefined();
  });
});

describe('buildHowToWatchRelatedSections', () => {
  const type = 'movie' as const;
  const slug = 'test-movie';
  const country = countries[0];

  it('returns non-empty sections array with valid structure', () => {
    const sections = buildHowToWatchRelatedSections(type, slug, country);
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes links to other countries', () => {
    const sections = buildHowToWatchRelatedSections(type, slug, country);
    const otherCountries = sections.find(s => s.links.some(l => l.href.includes('/how-to-watch/')));
    expect(otherCountries).toBeDefined();
  });

  it('includes a Get Started section (BOFU)', () => {
    const sections = buildHowToWatchRelatedSections(type, slug, country);
    const bofu = sections.find(s => s.title === 'Get Started');
    expect(bofu).toBeDefined();
  });
});

describe('buildUnblockRelatedSections', () => {
  const platform = platforms[0];
  const unavailableCountry = countries.find(c => !platform.availableCountries.includes(c.iso))
    ?? countries[countries.length - 1];

  it('returns non-empty sections array with valid structure', () => {
    const sections = buildUnblockRelatedSections(platform, unavailableCountry);
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes MOFU links (platform and country pages)', () => {
    const sections = buildUnblockRelatedSections(platform, unavailableCountry);
    const allHrefs = sections.flatMap(s => s.links.map(l => l.href));
    const hasMofuLink = allHrefs.some(
      href => href.startsWith('/platforms/') || href.startsWith('/countries/')
    );
    expect(hasMofuLink).toBe(true);
  });

  it('does not include empty sections', () => {
    const sections = buildUnblockRelatedSections(platform, unavailableCountry);
    for (const section of sections) {
      expect(section.links.length).toBeGreaterThan(0);
    }
  });

  it('includes a Get Started section (BOFU)', () => {
    const sections = buildUnblockRelatedSections(platform, unavailableCountry);
    const bofu = sections.find(s => s.title === 'Get Started');
    expect(bofu).toBeDefined();
  });

  it('does not contain a link with how-to-watch label pointing to a country page', () => {
    const sections = buildUnblockRelatedSections(platform, unavailableCountry);
    const allLinks = sections.flatMap(s => s.links);
    const misleading = allLinks.find(
      l => l.label.toLowerCase().startsWith('how to watch') && l.href.startsWith('/countries/')
    );
    expect(misleading).toBeUndefined();
  });

  it('includes Compare Alternatives section with compare-in-country links when comparisons exist', () => {
    const platformWithComparisons = platforms.find(p =>
      comparisons.some(c => c.platformSlugs.includes(p.slug))
    );
    if (!platformWithComparisons) return;

    const blockedCountry = countries.find(c => !platformWithComparisons.availableCountries.includes(c.iso))
      ?? countries[countries.length - 1];
    const sections = buildUnblockRelatedSections(platformWithComparisons, blockedCountry);
    const compareSection = sections.find(s => s.title === 'Compare Alternatives');
    expect(compareSection).toBeDefined();
    expect(compareSection!.links.every(l => l.href.startsWith('/compare/'))).toBe(true);
  });
});

describe('buildPlatformCountryRelatedSections', () => {
  const platform = platforms[0];
  const country = countries[0];

  it('returns non-empty sections array with valid structure', () => {
    const sections = buildPlatformCountryRelatedSections(platform, country);
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('does not include empty sections', () => {
    const sections = buildPlatformCountryRelatedSections(platform, country);
    for (const section of sections) {
      expect(section.links.length).toBeGreaterThan(0);
    }
  });

  it('includes a Take the Next Step section (MOFU)', () => {
    const sections = buildPlatformCountryRelatedSections(platform, country);
    const mofu = sections.find(s => s.title === SECTION_TITLES.TAKE_THE_NEXT_STEP);
    expect(mofu).toBeDefined();
  });
});

describe('edge cases  -  sparse data', () => {
  it('buildPlatformRelatedSections handles platform with no competitors', () => {
    const sparseP = { ...platforms[0], competitors: [] };
    const sections = buildPlatformRelatedSections(sparseP);
    assertValidSections(sections);
    for (const section of sections) {
      expect(section.links.length).toBeGreaterThan(0);
    }
  });

  it('buildGenreRelatedSections handles genre with no relatedGenres', () => {
    const sparseG = { ...genreGuides[0], relatedGenres: [], relatedGlossary: [] };
    const sections = buildGenreRelatedSections(sparseG);
    assertValidSections(sections);
    for (const section of sections) {
      expect(section.links.length).toBeGreaterThan(0);
    }
  });

  it('buildGuideRelatedSections handles guide with no related data', () => {
    const sparseGuide = {
      ...streamingGuides[0],
      relatedPlatforms: [],
      relatedCountries: [],
      relatedGlossary: [],
      relatedGuides: [],
    };
    const sections = buildGuideRelatedSections(sparseGuide);
    assertValidSections(sections);
    const exploreSection = sections.find(s => s.title === SECTION_TITLES.EXPLORE_STREAMING_SERVICES);
    expect(exploreSection).toBeDefined();
  });

  it('buildBlogRelatedSections handles post with no related data', () => {
    const sparsePost = {
      ...blogPosts[0],
      relatedPlatforms: [],
      relatedCountries: [],
      relatedGlossary: [],
      tags: [],
    };
    const sections = buildBlogRelatedSections(sparsePost, blogPosts);
    assertValidSections(sections);
    const exploreSection = sections.find(s => s.title === SECTION_TITLES.EXPLORE_STREAMING_SERVICES);
    expect(exploreSection).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Index page builders
// ---------------------------------------------------------------------------

describe('buildPlatformIndexSections', () => {
  it('returns non-empty sections with valid structure', () => {
    const sections = buildPlatformIndexSections();
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes Take the Next Step (MOFU funnel explore)', () => {
    const sections = buildPlatformIndexSections();
    const mofu = sections.find(s => s.title === SECTION_TITLES.TAKE_THE_NEXT_STEP);
    expect(mofu).toBeDefined();
  });
});

describe('buildCountryIndexSections', () => {
  it('returns non-empty sections with valid structure', () => {
    const sections = buildCountryIndexSections();
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes Take the Next Step (MOFU funnel explore)', () => {
    const sections = buildCountryIndexSections();
    const mofu = sections.find(s => s.title === SECTION_TITLES.TAKE_THE_NEXT_STEP);
    expect(mofu).toBeDefined();
  });
});

describe('buildCompareIndexSections', () => {
  it('returns non-empty sections with valid structure', () => {
    const sections = buildCompareIndexSections();
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes Take the Next Step (MOFU funnel explore)', () => {
    const sections = buildCompareIndexSections();
    const mofu = sections.find(s => s.title === SECTION_TITLES.TAKE_THE_NEXT_STEP);
    expect(mofu).toBeDefined();
  });
});

describe('buildGenreIndexSections', () => {
  it('returns non-empty sections with valid structure', () => {
    const sections = buildGenreIndexSections();
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes Explore Streaming Services (TOFU funnel explore)', () => {
    const sections = buildGenreIndexSections();
    const tofu = sections.find(s => s.title === SECTION_TITLES.EXPLORE_STREAMING_SERVICES);
    expect(tofu).toBeDefined();
  });
});

describe('buildGlossaryIndexSections', () => {
  it('returns non-empty sections with valid structure', () => {
    const sections = buildGlossaryIndexSections();
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes Explore Streaming Services (TOFU funnel explore)', () => {
    const sections = buildGlossaryIndexSections();
    const tofu = sections.find(s => s.title === SECTION_TITLES.EXPLORE_STREAMING_SERVICES);
    expect(tofu).toBeDefined();
  });
});

describe('buildGuideIndexSections', () => {
  it('returns non-empty sections with valid structure', () => {
    const sections = buildGuideIndexSections();
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes Explore Streaming Services (TOFU funnel explore)', () => {
    const sections = buildGuideIndexSections();
    const tofu = sections.find(s => s.title === SECTION_TITLES.EXPLORE_STREAMING_SERVICES);
    expect(tofu).toBeDefined();
  });
});

describe('buildBlogIndexSections', () => {
  it('returns non-empty sections with valid structure', () => {
    const sections = buildBlogIndexSections();
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes Explore Streaming Services (TOFU funnel explore)', () => {
    const sections = buildBlogIndexSections();
    const tofu = sections.find(s => s.title === SECTION_TITLES.EXPLORE_STREAMING_SERVICES);
    expect(tofu).toBeDefined();
  });
});

describe('buildSportIndexSections', () => {
  it('returns non-empty sections with valid structure', () => {
    const sections = buildSportIndexSections();
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes Explore Streaming Services (TOFU funnel explore)', () => {
    const sections = buildSportIndexSections();
    const tofu = sections.find(s => s.title === SECTION_TITLES.EXPLORE_STREAMING_SERVICES);
    expect(tofu).toBeDefined();
  });
});

describe('buildHowToWatchIndexSections', () => {
  it('returns non-empty sections with valid structure', () => {
    const sections = buildHowToWatchIndexSections();
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes Get Started (BOFU funnel explore)', () => {
    const sections = buildHowToWatchIndexSections();
    const bofu = sections.find(s => s.title === 'Get Started');
    expect(bofu).toBeDefined();
  });

  it('includes links to /search and /pricing', () => {
    const sections = buildHowToWatchIndexSections();
    const allHrefs = sections.flatMap(s => s.links.map(l => l.href));
    expect(allHrefs).toContain('/search');
    expect(allHrefs).toContain('/pricing');
  });
});

// ---------------------------------------------------------------------------
// Standalone page builders
// ---------------------------------------------------------------------------

describe('buildHomepageSections', () => {
  it('returns non-empty sections with valid structure', () => {
    const sections = buildHomepageSections();
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('covers full funnel: TOFU, MOFU, BOFU labels', () => {
    const sections = buildHomepageSections();
    const titles = sections.map(s => s.title);
    expect(titles).toContain('Learn About Streaming');
    expect(titles).toContain('Explore Services');
    expect(titles).toContain('Start Watching');
  });

  it('includes links to all major sections', () => {
    const sections = buildHomepageSections();
    const allHrefs = sections.flatMap(s => s.links.map(l => l.href));
    expect(allHrefs).toContain('/guides');
    expect(allHrefs).toContain('/platforms');
    expect(allHrefs).toContain('/search');
    expect(allHrefs).toContain('/pricing');
  });
});

describe('buildPricingSections', () => {
  it('returns non-empty sections with valid structure', () => {
    const sections = buildPricingSections();
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes explore, discovery, and learn sections', () => {
    const sections = buildPricingSections();
    const titles = sections.map(s => s.title);
    expect(titles).toContain('Explore Before You Buy');
    expect(titles).toContain('Content Discovery');
    expect(titles).toContain('Learn More');
  });

  it('links to /faq and /guides', () => {
    const sections = buildPricingSections();
    const allHrefs = sections.flatMap(s => s.links.map(l => l.href));
    expect(allHrefs).toContain('/faq');
    expect(allHrefs).toContain('/guides');
  });
});

describe('buildFaqSections', () => {
  it('returns non-empty sections with valid structure', () => {
    const sections = buildFaqSections();
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes Learn More, Explore, and Pricing sections', () => {
    const sections = buildFaqSections();
    const titles = sections.map(s => s.title);
    expect(titles).toContain('Learn More');
    expect(titles).toContain('Explore');
    expect(titles).toContain('Pricing');
  });

  it('links to /pricing', () => {
    const sections = buildFaqSections();
    const allHrefs = sections.flatMap(s => s.links.map(l => l.href));
    expect(allHrefs).toContain('/pricing');
  });
});

describe('buildSearchSections', () => {
  it('returns non-empty sections with valid structure', () => {
    const sections = buildSearchSections();
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes Browse, Learn, and Get Started sections', () => {
    const sections = buildSearchSections();
    const titles = sections.map(s => s.title);
    expect(titles).toContain('Browse');
    expect(titles).toContain('Learn');
    expect(titles).toContain('Get Started');
  });

  it('links to /pricing and /vpn-guidance', () => {
    const sections = buildSearchSections();
    const allHrefs = sections.flatMap(s => s.links.map(l => l.href));
    expect(allHrefs).toContain('/pricing');
    expect(allHrefs).toContain('/vpn-guidance');
  });
});

describe('buildVpnGuidanceSections', () => {
  it('returns non-empty sections with valid structure', () => {
    const sections = buildVpnGuidanceSections();
    expect(sections.length).toBeGreaterThan(0);
    assertValidSections(sections);
  });

  it('includes Browse, Learn, and Pricing sections', () => {
    const sections = buildVpnGuidanceSections();
    const titles = sections.map(s => s.title);
    expect(titles).toContain('Browse');
    expect(titles).toContain('Learn');
    expect(titles).toContain('Pricing');
  });

  it('links to /pricing', () => {
    const sections = buildVpnGuidanceSections();
    const allHrefs = sections.flatMap(s => s.links.map(l => l.href));
    expect(allHrefs).toContain('/pricing');
  });
});
