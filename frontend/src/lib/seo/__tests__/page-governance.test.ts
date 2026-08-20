import { getComparisonBySlug } from '@/data/comparisons';
import { getCountryBySlug } from '@/data/countries';
import { getGenreBySlug } from '@/data/genres';
import { getPlatformBySlug } from '@/data/platforms';
import {
  getComparisonCountryGovernance,
  getComparisonGovernance,
  getCountryGovernance,
  getGenreCountryGovernance,
  getPlatformCountryGovernance,
  getPlatformGovernance,
  isIndexable,
} from '../page-governance';

describe('page-governance', () => {
  it('defaults comparison pages to indexable so generated pages are not de-listed', () => {
    const comparison = getComparisonBySlug('pluto-tv-vs-peacock');
    expect(comparison).toBeDefined();

    const decision = getComparisonGovernance(comparison!);

    expect(decision.indexing).toBe('index');
    expect(decision.includeInSitemap).toBe(true);
    expect(decision.promoteInRelatedLinks).toBe(true);
    expect(isIndexable(decision)).toBe(true);
  });

  it('allows promoted comparison pages to be indexed and surfaced', () => {
    const comparison = getComparisonBySlug('amazon-prime-video-vs-espn-plus');
    expect(comparison).toBeDefined();

    const decision = getComparisonGovernance(comparison!);

    expect(decision.indexing).toBe('index');
    expect(decision.includeInSitemap).toBe(true);
    expect(decision.promoteInRelatedLinks).toBe(true);
    expect(decision.contentTier).toBe('pillar');
  });

  it('keeps comparison-country pages self-indexable', () => {
    const comparison = getComparisonBySlug('amazon-prime-video-vs-espn-plus');
    expect(comparison).toBeDefined();

    const decision = getComparisonCountryGovernance(comparison!);

    expect(decision.indexing).toBe('index');
    expect(decision.canonicalPath).toBeUndefined();
    expect(decision.includeInSitemap).toBe(true);
  });

  it('keeps platform and country hubs indexed', () => {
    const platform = getPlatformBySlug('netflix');
    const country = getCountryBySlug('portugal');

    expect(platform).toBeDefined();
    expect(country).toBeDefined();

    expect(getPlatformGovernance(platform!).indexing).toBe('index');
    expect(getCountryGovernance(country!).indexing).toBe('index');
  });

  it('keeps platform-country and genre-country pages self-indexable', () => {
    const platform = getPlatformBySlug('netflix');
    const genre = getGenreBySlug('anime');

    expect(platform).toBeDefined();
    expect(genre).toBeDefined();

    expect(getPlatformCountryGovernance(platform!).canonicalPath).toBeUndefined();
    expect(getPlatformCountryGovernance(platform!).indexing).toBe('index');
    expect(getGenreCountryGovernance(genre!).canonicalPath).toBeUndefined();
    expect(getGenreCountryGovernance(genre!).indexing).toBe('index');
  });
});
