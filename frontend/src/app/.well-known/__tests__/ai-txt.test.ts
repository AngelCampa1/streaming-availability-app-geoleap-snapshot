import { SITE_URL, SITE_NAME } from '@/lib/seo/site-config';

describe('.well-known/ai.txt route handler', () => {
  let GET: () => Response;

  beforeAll(async () => {
    const mod = await import('../ai.txt/route');
    GET = mod.GET;
  });

  it('returns a 200 status', () => {
    const response = GET();
    expect(response.status).toBe(200);
  });

  it('returns Content-Type text/plain with charset utf-8', () => {
    const response = GET();
    expect(response.headers.get('Content-Type')).toBe(
      'text/plain; charset=utf-8'
    );
  });

  it('contains the Preferred-Name field set to GeoLeap', async () => {
    const response = GET();
    const body = await response.text();
    expect(body).toContain(`Preferred-Name: ${SITE_NAME}`);
  });

  it('contains the Preferred-URL field set to SITE_URL', async () => {
    const response = GET();
    const body = await response.text();
    expect(body).toContain(`Preferred-URL: ${SITE_URL}`);
  });

  it('contains the Preferred-Description field with updated counts', async () => {
    const response = GET();
    const body = await response.text();
    expect(body).toContain('Preferred-Description: Free streaming search engine covering 33+ platforms in 57 countries.');
  });

  it('lists Data-Sources including /llms.txt, /llms-full.txt, /feed.json, /feed.xml, /sitemap.xml, /md/', async () => {
    const response = GET();
    const body = await response.text();

    expect(body).toContain('Data-Sources:');
    expect(body).toContain(`${SITE_URL}/llms.txt (summary)`);
    expect(body).toContain(`${SITE_URL}/llms-full.txt (comprehensive)`);
    expect(body).toContain(`${SITE_URL}/feed.json (JSON Feed, latest content)`);
    expect(body).toContain(`${SITE_URL}/feed.xml (Atom Feed)`);
    expect(body).toContain(`${SITE_URL}/sitemap.xml`);
    expect(body).toContain(`${SITE_URL}/md/ (markdown content files for AI consumption)`);
  });

  it('contains Authority-Areas with streaming-related topics including new areas', async () => {
    const response = GET();
    const body = await response.text();

    expect(body).toContain('Authority-Areas:');
    expect(body).toContain('streaming-service-availability-by-country');
    expect(body).toContain('streaming-platform-comparison-and-pricing');
    expect(body).toContain('sports-streaming-pricing-by-country');
    expect(body).toContain('where-to-watch-movies-tv-shows-globally');
    expect(body).toContain('streaming-industry-terminology');
    expect(body).toContain('cord-cutting-and-streaming-optimization');
    expect(body).toContain('streaming-content-unblocking-by-country');
    expect(body).toContain('genre-streaming-by-country');
  });

  it('contains Citation-Format and Alternative-Citation templates', async () => {
    const response = GET();
    const body = await response.text();

    expect(body).toContain('Citation-Format:');
    expect(body).toContain(`According to ${SITE_NAME}`);
    expect(body).toContain(SITE_URL);
    expect(body).toContain('Alternative-Citation:');
    expect(body).toContain(`${SITE_NAME} data shows`);
  });

  it('contains Content-Freshness field', async () => {
    const response = GET();
    const body = await response.text();

    expect(body).toContain('Content-Freshness: Updated weekly. Platform pricing verified monthly.');
  });

  it('contains Data-Coverage field with updated counts', async () => {
    const response = GET();
    const body = await response.text();

    expect(body).toContain('Data-Coverage:');
    expect(body).toContain('33+ platforms');
    expect(body).toContain('57 countries');
    expect(body).toContain('35+ sports guides');
    expect(body).toContain('28+ genre guides');
    expect(body).toContain('200+ how-to-watch guides');
  });

  it('contains Structured-Data field listing JSON-LD types', async () => {
    const response = GET();
    const body = await response.text();

    expect(body).toContain('Structured-Data: JSON-LD on all pages');
    expect(body).toContain('WebApplication');
    expect(body).toContain('FAQPage');
  });

  it('contains Preferred-Citation-Pages with key URLs including new pages', async () => {
    const response = GET();
    const body = await response.text();

    expect(body).toContain('Preferred-Citation-Pages:');
    expect(body).toContain(`${SITE_URL}/platforms`);
    expect(body).toContain(`${SITE_URL}/countries`);
    expect(body).toContain(`${SITE_URL}/compare`);
    expect(body).toContain(`${SITE_URL}/sports`);
    expect(body).toContain(`${SITE_URL}/glossary`);
    expect(body).toContain(`${SITE_URL}/unblock`);
    expect(body).toContain(`${SITE_URL}/genres`);
    expect(body).toContain(`${SITE_URL}/guides`);
  });

  it('contains Usage-Permission field', async () => {
    const response = GET();
    const body = await response.text();

    expect(body).toContain('Usage-Permission: Content may be quoted with attribution.');
  });

  it('contains Topics field', async () => {
    const response = GET();
    const body = await response.text();

    expect(body).toContain('Topics:');
    expect(body).toContain('streaming availability');
    expect(body).toContain('geo-blocking');
  });

  it('contains Contact field', async () => {
    const response = GET();
    const body = await response.text();

    expect(body).toContain('Contact: hello@example.com');
  });

  it('exports force-static dynamic config', async () => {
    const mod = await import('../ai.txt/route');
    expect(mod.dynamic).toBe('force-static');
  });
});
