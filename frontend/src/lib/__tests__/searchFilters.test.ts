/**
 * AVAILABLE_SEARCH_FILTERS constant tests
 *
 * Regression guard: ensures the shared filter constant is non-empty,
 * so mobile and desktop render paths always receive the same option data.
 */

import { AVAILABLE_SEARCH_FILTERS } from '../searchFilters';

describe('AVAILABLE_SEARCH_FILTERS', () => {
  it('has a non-empty genres list', () => {
    expect(AVAILABLE_SEARCH_FILTERS.genres.length).toBeGreaterThan(0);
  });

  it('includes "Action" in genres', () => {
    expect(AVAILABLE_SEARCH_FILTERS.genres).toContain('Action');
  });

  it('has a non-empty countries list', () => {
    expect(AVAILABLE_SEARCH_FILTERS.countries.length).toBeGreaterThan(0);
  });

  it('includes "United States" in countries', () => {
    expect(AVAILABLE_SEARCH_FILTERS.countries).toContain('United States');
  });

  it('has a non-empty services list', () => {
    expect(AVAILABLE_SEARCH_FILTERS.services.length).toBeGreaterThan(0);
  });

  it('includes "Netflix" in services', () => {
    expect(AVAILABLE_SEARCH_FILTERS.services).toContain('Netflix');
  });
});
