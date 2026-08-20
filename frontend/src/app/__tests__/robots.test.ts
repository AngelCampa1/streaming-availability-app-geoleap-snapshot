import robots from '../robots';

describe('robots policy', () => {
  it('keeps useful search and discovery crawlers allowed', () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];

    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userAgent: 'Googlebot', allow: expect.arrayContaining(['/']) }),
        expect.objectContaining({ userAgent: 'Bingbot', allow: expect.arrayContaining(['/']) }),
        expect.objectContaining({ userAgent: 'ChatGPT-User', allow: expect.arrayContaining(['/']) }),
        expect.objectContaining({ userAgent: 'GPTBot', allow: expect.arrayContaining(['/']) }),
        expect.objectContaining({ userAgent: 'OAI-SearchBot', allow: expect.arrayContaining(['/']) }),
        expect.objectContaining({ userAgent: 'PerplexityBot', allow: expect.arrayContaining(['/']) }),
        expect.objectContaining({ userAgent: 'ClaudeBot', allow: expect.arrayContaining(['/']) }),
        expect.objectContaining({ userAgent: 'Applebot', allow: expect.arrayContaining(['/']) }),
      ]),
    );
  });

  it('blocks noisy crawlers that should be handled outside monetized traffic', () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];

    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userAgent: 'TikTokSpider', disallow: ['/'] }),
        expect.objectContaining({ userAgent: 'Bytespider', disallow: ['/'] }),
        expect.objectContaining({ userAgent: 'SemrushBot', disallow: ['/'] }),
        expect.objectContaining({ userAgent: 'AhrefsBot', disallow: ['/'] }),
        expect.objectContaining({ userAgent: 'SERankingBacklinksBot', disallow: ['/'] }),
      ]),
    );
  });

  it('blocks crawlable search-result query URLs for the default crawler group', () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const defaultRule = rules.find((rule) => rule.userAgent === '*');

    expect(defaultRule?.disallow).toEqual(
      expect.arrayContaining(['*/search?*', '/search?q=']),
    );
  });
});
