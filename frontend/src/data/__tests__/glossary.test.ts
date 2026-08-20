import { glossaryTerms, getGlossaryTermBySlug, getGlossaryTermsByCategory } from '../glossary';

describe('glossary data', () => {
  it('has at least 40 terms', () => {
    expect(glossaryTerms.length).toBeGreaterThanOrEqual(40);
  });

  it('has no duplicate slugs', () => {
    const slugs = glossaryTerms.map(t => t.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it('all terms have required fields', () => {
    glossaryTerms.forEach(t => {
      expect(t.slug).toBeTruthy();
      expect(t.term).toBeTruthy();
      expect(t.shortDefinition).toBeTruthy();
      expect(t.longExplanation).toBeTruthy();
      expect(t.relatedTerms).toBeInstanceOf(Array);
      expect(['streaming', 'technology', 'content', 'business', 'rights']).toContain(t.category);
    });
  });

  it('all relatedTerms slugs exist in glossaryTerms', () => {
    const allSlugs = new Set(glossaryTerms.map(t => t.slug));
    glossaryTerms.forEach(term => {
      term.relatedTerms.forEach(relatedSlug => {
        expect(allSlugs.has(relatedSlug)).toBe(true);
      });
    });
  });

  it('getGlossaryTermBySlug returns the correct term', () => {
    const svod = getGlossaryTermBySlug('svod');
    expect(svod).toBeDefined();
    expect(svod?.term.toUpperCase()).toBe('SVOD');
  });

  it('getGlossaryTermBySlug returns undefined for unknown slug', () => {
    expect(getGlossaryTermBySlug('nonexistent-term')).toBeUndefined();
  });

  it('getGlossaryTermsByCategory returns terms of the specified category', () => {
    const streamingTerms = getGlossaryTermsByCategory('streaming');
    expect(streamingTerms.length).toBeGreaterThan(0);
    streamingTerms.forEach(t => {
      expect(t.category).toBe('streaming');
    });
  });

  it('includes key streaming terms', () => {
    const slugs = glossaryTerms.map(t => t.slug);
    const required = ['svod', 'avod', 'tvod', 'geo-blocking', 'ott'];
    required.forEach(slug => {
      expect(slugs).toContain(slug);
    });
  });
});
