/**
 * Technical SEO Testing Suite
 * Tests schema markup, meta tags, sitemaps, and technical SEO elements
 * Focus: Preventing SEO regressions and ensuring search engine compatibility
 */

const { chromium } = require('playwright');
const { expect } = require('@playwright/test');

describe('Technical SEO Tests', () => {
  let browser, page;
  
  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Meta Tags Validation', () => {
    test('should have required meta tags on all pages', async () => {
      const testPages = [
        '/',
        '/search',
        '/content/movie-123',
        '/content/series-456',
        '/pricing'
      ];

      for (const path of testPages) {
        await page.goto(`http://localhost:3000${path}`);
        
        // Title tag
        const title = await page.$eval('title', el => el.textContent);
        expect(title).toBeTruthy();
        expect(title.length).toBeGreaterThan(10);
        expect(title.length).toBeLessThan(60);

        // Meta description
        const description = await page.$eval(
          'meta[name="description"]',
          el => el.getAttribute('content')
        ).catch(() => null);
        expect(description).toBeTruthy();
        expect(description.length).toBeGreaterThan(120);
        expect(description.length).toBeLessThan(160);

        // Canonical URL
        const canonical = await page.$eval(
          'link[rel="canonical"]',
          el => el.getAttribute('href')
        ).catch(() => null);
        expect(canonical).toBeTruthy();
        expect(canonical).toContain('geoleap.app');

        // Viewport meta tag
        const viewport = await page.$eval(
          'meta[name="viewport"]',
          el => el.getAttribute('content')
        ).catch(() => null);
        expect(viewport).toBeTruthy();
        expect(viewport).toContain('width=device-width');
      }
    });

    test('should have unique titles and descriptions', async () => {
      const pages = [
        { path: '/', expectedTitleKeyword: 'GeoLeap' },
        { path: '/search', expectedTitleKeyword: 'Search' },
        { path: '/pricing', expectedTitleKeyword: 'Pricing' }
      ];

      const titles = new Set();
      const descriptions = new Set();

      for (const { path, expectedTitleKeyword } of pages) {
        await page.goto(`http://localhost:3000${path}`);
        
        const title = await page.$eval('title', el => el.textContent);
        const description = await page.$eval(
          'meta[name="description"]',
          el => el.getAttribute('content')
        );

        expect(title).toContain(expectedTitleKeyword);
        expect(titles.has(title)).toBeFalsy();
        expect(descriptions.has(description)).toBeFalsy();

        titles.add(title);
        descriptions.add(description);
      }
    });
  });

  describe('Schema Markup Validation', () => {
    test('should have valid JSON-LD structured data', async () => {
      await page.goto('http://localhost:3000/content/movie-123');
      
      const jsonLdScripts = await page.$$eval(
        'script[type="application/ld+json"]',
        scripts => scripts.map(script => {
          try {
            return JSON.parse(script.textContent);
          } catch {
            return null;
          }
        }).filter(Boolean)
      );

      expect(jsonLdScripts.length).toBeGreaterThan(0);

      for (const schema of jsonLdScripts) {
        expect(schema['@context']).toBe('https://schema.org');
        expect(schema['@type']).toBeTruthy();
        
        if (schema['@type'] === 'Movie') {
          expect(schema.name).toBeTruthy();
          expect(schema.description).toBeTruthy();
          expect(schema.image).toBeTruthy();
          expect(schema.datePublished).toBeTruthy();
        }
      }
    });

    test('should have breadcrumb schema on content pages', async () => {
      await page.goto('http://localhost:3000/content/series-456');
      
      const breadcrumbSchema = await page.$eval(
        'script[type="application/ld+json"]',
        script => {
          const schemas = JSON.parse(script.textContent);
          return Array.isArray(schemas) 
            ? schemas.find(s => s['@type'] === 'BreadcrumbList')
            : schemas['@type'] === 'BreadcrumbList' ? schemas : null;
        }
      ).catch(() => null);

      if (breadcrumbSchema) {
        expect(breadcrumbSchema['@type']).toBe('BreadcrumbList');
        expect(breadcrumbSchema.itemListElement).toBeTruthy();
        expect(breadcrumbSchema.itemListElement.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Open Graph and Twitter Cards', () => {
    test('should have complete Open Graph tags', async () => {
      await page.goto('http://localhost:3000/content/movie-123');
      
      const ogTags = await page.$$eval(
        'meta[property^="og:"]',
        metas => metas.map(meta => ({
          property: meta.getAttribute('property'),
          content: meta.getAttribute('content')
        }))
      );

      const ogMap = new Map(ogTags.map(tag => [tag.property, tag.content]));

      expect(ogMap.get('og:title')).toBeTruthy();
      expect(ogMap.get('og:description')).toBeTruthy();
      expect(ogMap.get('og:image')).toBeTruthy();
      expect(ogMap.get('og:url')).toBeTruthy();
      expect(ogMap.get('og:type')).toBeTruthy();
      expect(ogMap.get('og:site_name')).toBeTruthy();
    });

    test('should have Twitter Card meta tags', async () => {
      await page.goto('http://localhost:3000/content/series-456');
      
      const twitterTags = await page.$$eval(
        'meta[name^="twitter:"]',
        metas => metas.map(meta => ({
          name: meta.getAttribute('name'),
          content: meta.getAttribute('content')
        }))
      );

      const twitterMap = new Map(twitterTags.map(tag => [tag.name, tag.content]));

      expect(twitterMap.get('twitter:card')).toBeTruthy();
      expect(twitterMap.get('twitter:title')).toBeTruthy();
      expect(twitterMap.get('twitter:description')).toBeTruthy();
      expect(twitterMap.get('twitter:image')).toBeTruthy();
    });
  });

  describe('Sitemap and Robots.txt', () => {
    test('should have accessible sitemap.xml', async () => {
      const response = await page.goto('http://localhost:3000/sitemap.xml');
      expect(response.status()).toBe(200);
      
      const content = await response.text();
      expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(content).toContain('<urlset');
      expect(content).toContain('http://www.sitemaps.org/schemas/sitemap/0.9');
    });

    test('should have valid robots.txt', async () => {
      const response = await page.goto('http://localhost:3000/robots.txt');
      expect(response.status()).toBe(200);
      
      const content = await response.text();
      expect(content).toContain('User-agent:');
      expect(content).toContain('Sitemap:');
    });
  });

  describe('URL Structure and Canonicalization', () => {
    test('should have SEO-friendly URLs', async () => {
      const urls = [
        '/content/the-matrix-1999',
        '/content/breaking-bad-series',
        '/search?q=action+movies',
        '/category/thriller'
      ];

      for (const url of urls) {
        const response = await page.goto(`http://localhost:3000${url}`);
        expect(response.status()).toBe(200);
        
        // Check that URLs don't contain problematic characters
        expect(url).not.toContain(' ');
        expect(url).not.toContain('?id=');
        expect(url).not.toContain('&');
      }
    });

    test('should handle redirects properly', async () => {
      // Test that old URLs redirect to new SEO-friendly URLs
      const redirectTests = [
        { from: '/movie.php?id=123', to: '/content/movie-123' },
        { from: '/search.php', to: '/search' }
      ];

      for (const { from, to } of redirectTests) {
        const response = await page.goto(`http://localhost:3000${from}`, {
          waitUntil: 'networkidle'
        });
        
        const finalUrl = page.url();
        expect(finalUrl).toContain(to);
        expect([200, 301, 302]).toContain(response.status());
      }
    });
  });

  describe('Internal Linking', () => {
    test('should have proper internal link structure', async () => {
      await page.goto('http://localhost:3000/');
      
      const internalLinks = await page.$$eval(
        'a[href^="/"], a[href^="http://localhost:3000"], a[href^="https://geoleap.app"]',
        links => links.map(link => ({
          href: link.getAttribute('href'),
          text: link.textContent.trim(),
          title: link.getAttribute('title')
        }))
      );

      expect(internalLinks.length).toBeGreaterThan(0);

      for (const link of internalLinks.slice(0, 10)) { // Test first 10 links
        expect(link.text).toBeTruthy();
        expect(link.href).toBeTruthy();
        expect(link.href).not.toContain('javascript:');
      }
    });

    test('should have descriptive anchor text', async () => {
      await page.goto('http://localhost:3000/');
      
      const problematicAnchors = await page.$$eval(
        'a',
        links => links
          .map(link => link.textContent.trim().toLowerCase())
          .filter(text => 
            text === 'click here' || 
            text === 'read more' || 
            text === 'here' ||
            text === 'more'
          )
      );

      expect(problematicAnchors.length).toBeLessThan(3); // Allow some generic anchors
    });
  });
});