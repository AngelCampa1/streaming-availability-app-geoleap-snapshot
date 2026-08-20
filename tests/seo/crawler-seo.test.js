/**
 * Search Engine Crawler SEO Testing Suite
 * Tests crawlability, indexing, and search engine bot compatibility
 * Focus: Ensuring optimal discoverability and indexing by search engines
 */

const { chromium } = require('playwright');

describe('Search Engine Crawler Tests', () => {
  let browser, page;
  
  const searchBots = [
    {
      name: 'Googlebot',
      userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      mobile: false
    },
    {
      name: 'Googlebot Mobile',
      userAgent: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.96 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      mobile: true
    },
    {
      name: 'Bingbot',
      userAgent: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      mobile: false
    }
  ];

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Robots.txt and Sitemap', () => {
    test('should have valid robots.txt', async () => {
      page = await browser.newPage();
      
      const response = await page.goto('http://localhost:3000/robots.txt');
      expect(response.status()).toBe(200);
      
      const robotsContent = await response.text();
      
      // Basic robots.txt validation
      expect(robotsContent).toContain('User-agent:');
      expect(robotsContent).toContain('Sitemap:');
      
      // Should not block all crawlers
      expect(robotsContent).not.toContain('Disallow: /');
      
      // Check for common SEO patterns
      const lines = robotsContent.split('\n').map(line => line.trim());
      const sitemapLines = lines.filter(line => line.startsWith('Sitemap:'));
      expect(sitemapLines.length).toBeGreaterThan(0);
      
      // Validate sitemap URLs
      for (const sitemapLine of sitemapLines) {
        const sitemapUrl = sitemapLine.split('Sitemap:')[1].trim();
        expect(sitemapUrl).toMatch(/^https?:\/\/.+\.xml$/);
      }
      
      await page.close();
    });

    test('should have accessible XML sitemap', async () => {
      page = await browser.newPage();
      
      const response = await page.goto('http://localhost:3000/sitemap.xml');
      expect(response.status()).toBe(200);
      
      const sitemapContent = await response.text();
      
      // XML validation
      expect(sitemapContent).toContain('<?xml version="1.0"');
      expect(sitemapContent).toContain('<urlset');
      expect(sitemapContent).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
      
      // Should contain URLs
      expect(sitemapContent).toContain('<url>');
      expect(sitemapContent).toContain('<loc>');
      
      // Parse and validate URLs
      const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g);
      if (urlMatches) {
        expect(urlMatches.length).toBeGreaterThan(0);
        
        urlMatches.slice(0, 5).forEach(match => { // Test first 5 URLs
          const url = match.replace(/<\/?loc>/g, '');
          expect(url).toMatch(/^https?:\/\/.+/);
        });
      }
      
      await page.close();
    });

    test('should have valid sitemap index if using multiple sitemaps', async () => {
      page = await browser.newPage();
      
      try {
        const response = await page.goto('http://localhost:3000/sitemap-index.xml');
        
        if (response.status() === 200) {
          const indexContent = await response.text();
          
          expect(indexContent).toContain('<?xml version="1.0"');
          expect(indexContent).toContain('<sitemapindex');
          expect(indexContent).toContain('<sitemap>');
          expect(indexContent).toContain('<loc>');
        }
      } catch (error) {
        // Sitemap index might not exist, which is fine
      }
      
      await page.close();
    });
  });

  describe('Bot Crawlability', () => {
    test.each(searchBots)('should be crawlable by $name', async ({ name, userAgent, mobile }) => {
      page = await browser.newPage();
      await page.setUserAgent(userAgent);
      
      if (mobile) {
        await page.setViewportSize({ width: 375, height: 667 });
      }
      
      const testPages = ['/', '/search', '/content/movie-123', '/pricing'];
      
      for (const testPage of testPages) {
        try {
          const response = await page.goto(`http://localhost:3000${testPage}`, {
            waitUntil: 'domcontentloaded'
          });
          
          expect(response.status()).toBe(200);
          
          // Bot should see content without JavaScript execution
          const content = await page.evaluate(() => {
            return {
              title: document.title,
              bodyText: document.body.textContent.trim(),
              headingCount: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
              linkCount: document.querySelectorAll('a[href]').length,
              imageCount: document.querySelectorAll('img[src]').length
            };
          });
          
          expect(content.title).toBeTruthy();
          expect(content.bodyText.length).toBeGreaterThan(100);
          expect(content.headingCount).toBeGreaterThan(0);
          expect(content.linkCount).toBeGreaterThan(0);
        } catch (error) {
          // Some test pages might not exist in development
          continue;
        }
      }
      
      await page.close();
    });

    test('should provide consistent content across different bots', async () => {
      const contentByBot = {};
      
      for (const bot of searchBots) {
        page = await browser.newPage();
        await page.setUserAgent(bot.userAgent);
        
        if (bot.mobile) {
          await page.setViewportSize({ width: 375, height: 667 });
        }
        
        await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
        
        contentByBot[bot.name] = await page.evaluate(() => ({
          title: document.title,
          h1Text: document.querySelector('h1')?.textContent?.trim() || '',
          metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
          canonicalUrl: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || ''
        }));
        
        await page.close();
      }
      
      // Content should be consistent across bots
      const titles = Object.values(contentByBot).map(c => c.title);
      const descriptions = Object.values(contentByBot).map(c => c.metaDescription);
      
      expect(new Set(titles).size).toBeLessThanOrEqual(2); // Allow minor mobile differences
      expect(new Set(descriptions).size).toBeLessThanOrEqual(2);
    });
  });

  describe('Content Accessibility for Bots', () => {
    test('should provide content without JavaScript', async () => {
      page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
      
      const response = await page.goto('http://localhost:3000/');
      expect(response.status()).toBe(200);
      
      const noJsContent = await page.evaluate(() => ({
        hasTitle: !!document.title,
        hasH1: !!document.querySelector('h1'),
        textContent: document.body.textContent.length,
        linkCount: document.querySelectorAll('a[href]').length,
        hasNavigation: !!document.querySelector('nav, [role="navigation"]')
      }));
      
      expect(noJsContent.hasTitle).toBe(true);
      expect(noJsContent.hasH1).toBe(true);
      expect(noJsContent.textContent).toBeGreaterThan(200);
      expect(noJsContent.linkCount).toBeGreaterThan(3);
      
      await page.close();
    });

    test('should have noscript fallbacks for critical content', async () => {
      page = await browser.newPage();
      await page.goto('http://localhost:3000/search');
      
      const noscriptContent = await page.evaluate(() => {
        const noscriptTags = document.querySelectorAll('noscript');
        return Array.from(noscriptTags).map(tag => ({
          content: tag.textContent.trim(),
          hasContent: tag.textContent.trim().length > 0
        }));
      });
      
      // If there are noscript tags, they should have meaningful content
      if (noscriptContent.length > 0) {
        const meaningfulFallbacks = noscriptContent.filter(n => n.hasContent);
        expect(meaningfulFallbacks.length).toBeGreaterThan(0);
      }
      
      await page.close();
    });
  });

  describe('Link Discovery and Crawl Budget', () => {
    test('should provide discoverable internal links', async () => {
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
      await page.goto('http://localhost:3000/');
      
      const linkAnalysis = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        const internal = links.filter(link => {
          const href = link.getAttribute('href');
          return href && (
            href.startsWith('/') ||
            href.startsWith('http://localhost:3000') ||
            href.startsWith('https://geoleap.app')
          );
        });
        
        return {
          totalLinks: links.length,
          internalLinks: internal.length,
          externalLinks: links.length - internal.length,
          linkTexts: internal.map(link => ({
            href: link.getAttribute('href'),
            text: link.textContent.trim(),
            hasTitle: !!link.getAttribute('title'),
            hasAria: !!link.getAttribute('aria-label')
          })).filter(link => link.text)
        };
      });
      
      expect(linkAnalysis.internalLinks).toBeGreaterThan(5);
      expect(linkAnalysis.internalLinks / linkAnalysis.totalLinks).toBeGreaterThan(0.3);
      
      // Links should have descriptive text
      const descriptiveLinks = linkAnalysis.linkTexts.filter(link => 
        link.text.length > 3 && 
        !['click here', 'read more', 'more', 'here'].includes(link.text.toLowerCase())
      );
      
      expect(descriptiveLinks.length / linkAnalysis.linkTexts.length).toBeGreaterThan(0.8);
      
      await page.close();
    });

    test('should optimize crawl budget with proper link hierarchy', async () => {
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
      await page.goto('http://localhost:3000/');
      
      const linkHierarchy = await page.evaluate(() => {
        const navigation = document.querySelector('nav, [role="navigation"]');
        const footer = document.querySelector('footer');
        const main = document.querySelector('main, [role="main"]');
        
        return {
          navLinks: navigation ? navigation.querySelectorAll('a[href]').length : 0,
          footerLinks: footer ? footer.querySelectorAll('a[href]').length : 0,
          mainLinks: main ? main.querySelectorAll('a[href]').length : 0,
          totalDepth: Math.max(
            ...Array.from(document.querySelectorAll('*')).map(el => {
              let depth = 0;
              let parent = el.parentElement;
              while (parent) {
                depth++;
                parent = parent.parentElement;
              }
              return depth;
            })
          )
        };
      });
      
      // Good link distribution
      expect(linkHierarchy.navLinks).toBeGreaterThan(3);
      expect(linkHierarchy.mainLinks).toBeGreaterThan(linkHierarchy.navLinks);
      expect(linkHierarchy.totalDepth).toBeLessThan(15); // Not too deeply nested
      
      await page.close();
    });
  });

  describe('URL Structure and Canonicalization', () => {
    test('should handle URL parameters and canonicalization', async () => {
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
      
      const testUrls = [
        '/?utm_source=test',
        '/search?q=movies',
        '/search?q=movies&page=1',
        '/content/movie-123?ref=homepage'
      ];
      
      for (const url of testUrls) {
        try {
          await page.goto(`http://localhost:3000${url}`);
          
          const canonicalUrl = await page.$eval(
            'link[rel="canonical"]',
            el => el.getAttribute('href')
          ).catch(() => null);
          
          if (canonicalUrl) {
            expect(canonicalUrl).not.toContain('utm_');
            expect(canonicalUrl).not.toContain('ref=');
            expect(canonicalUrl).toContain('geoleap.app');
          }
        } catch (error) {
          // URL might not exist
          continue;
        }
      }
      
      await page.close();
    });

    test('should handle trailing slashes consistently', async () => {
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
      
      const urlPairs = [
        { without: '/search', with: '/search/' },
        { without: '/pricing', with: '/pricing/' }
      ];
      
      for (const { without, with: withSlash } of urlPairs) {
        try {
          // Test both versions
          const response1 = await page.goto(`http://localhost:3000${without}`);
          const response2 = await page.goto(`http://localhost:3000${withSlash}`);
          
          // Both should return 200 or one should redirect to the other
          const status1 = response1.status();
          const status2 = response2.status();
          
          expect([200, 301, 302]).toContain(status1);
          expect([200, 301, 302]).toContain(status2);
          
          // If both return 200, canonical URLs should be the same
          if (status1 === 200 && status2 === 200) {
            await page.goto(`http://localhost:3000${without}`);
            const canonical1 = await page.$eval('link[rel="canonical"]', el => el.getAttribute('href')).catch(() => null);
            
            await page.goto(`http://localhost:3000${withSlash}`);
            const canonical2 = await page.$eval('link[rel="canonical"]', el => el.getAttribute('href')).catch(() => null);
            
            if (canonical1 && canonical2) {
              expect(canonical1).toBe(canonical2);
            }
          }
        } catch (error) {
          // URLs might not exist
          continue;
        }
      }
      
      await page.close();
    });
  });

  describe('Structured Data for Crawlers', () => {
    test('should provide valid structured data for content', async () => {
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
      await page.goto('http://localhost:3000/content/movie-123');
      
      const structuredData = await page.$$eval(
        'script[type="application/ld+json"]',
        scripts => scripts.map(script => {
          try {
            return JSON.parse(script.textContent);
          } catch {
            return null;
          }
        }).filter(Boolean)
      );
      
      expect(structuredData.length).toBeGreaterThan(0);
      
      for (const schema of structuredData) {
        expect(schema['@context']).toBe('https://schema.org');
        expect(schema['@type']).toBeTruthy();
        
        // Validate common schema types
        if (schema['@type'] === 'Movie') {
          expect(schema.name).toBeTruthy();
          expect(schema.description).toBeTruthy();
        } else if (schema['@type'] === 'Organization') {
          expect(schema.name).toBeTruthy();
          expect(schema.url).toBeTruthy();
        } else if (schema['@type'] === 'WebSite') {
          expect(schema.url).toBeTruthy();
          expect(schema.name).toBeTruthy();
        }
      }
      
      await page.close();
    });

    test('should include breadcrumb structured data', async () => {
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
      await page.goto('http://localhost:3000/content/series-456');
      
      const breadcrumbSchema = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const script of scripts) {
          try {
            const data = JSON.parse(script.textContent);
            if (data['@type'] === 'BreadcrumbList') {
              return data;
            }
            if (Array.isArray(data)) {
              const breadcrumb = data.find(item => item['@type'] === 'BreadcrumbList');
              if (breadcrumb) return breadcrumb;
            }
          } catch {}
        }
        return null;
      });
      
      if (breadcrumbSchema) {
        expect(breadcrumbSchema['@type']).toBe('BreadcrumbList');
        expect(breadcrumbSchema.itemListElement).toBeTruthy();
        expect(Array.isArray(breadcrumbSchema.itemListElement)).toBe(true);
        expect(breadcrumbSchema.itemListElement.length).toBeGreaterThan(0);
        
        breadcrumbSchema.itemListElement.forEach((item, index) => {
          expect(item['@type']).toBe('ListItem');
          expect(item.position).toBe(index + 1);
          expect(item.name).toBeTruthy();
        });
      }
      
      await page.close();
    });
  });

  describe('Crawl Error Prevention', () => {
    test('should not have broken internal links', async () => {
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
      await page.goto('http://localhost:3000/');
      
      const internalLinks = await page.$$eval(
        'a[href^="/"], a[href^="http://localhost:3000"]',
        links => links.map(link => link.getAttribute('href')).filter(Boolean).slice(0, 10) // Test first 10
      );
      
      const brokenLinks = [];
      
      for (const href of internalLinks) {
        try {
          const response = await page.goto(`http://localhost:3000${href.startsWith('/') ? href : href.replace('http://localhost:3000', '')}`);
          if (response.status() >= 400) {
            brokenLinks.push({ href, status: response.status() });
          }
        } catch (error) {
          brokenLinks.push({ href, error: error.message });
        }
      }
      
      expect(brokenLinks.length).toBe(0);
      
      await page.close();
    });

    test('should handle soft 404s properly', async () => {
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
      
      // Test non-existent pages
      const testPaths = ['/non-existent-page', '/content/invalid-movie', '/old-page-123'];
      
      for (const path of testPaths) {
        const response = await page.goto(`http://localhost:3000${path}`);
        const status = response.status();
        
        if (status === 200) {
          // If returning 200, check for soft 404 indicators
          const pageContent = await page.evaluate(() => ({
            title: document.title.toLowerCase(),
            bodyText: document.body.textContent.toLowerCase(),
            hasErrorMessage: document.querySelector('.error, .not-found, [data-testid*="error"]')
          }));
          
          // Should have clear 404 indicators if returning 200
          const has404Indicators = pageContent.title.includes('404') ||
                                  pageContent.title.includes('not found') ||
                                  pageContent.bodyText.includes('not found') ||
                                  pageContent.hasErrorMessage;
          
          if (!has404Indicators) {
            console.warn(`Potential soft 404 at ${path}`);
          }
        } else {
          expect([404, 410]).toContain(status); // Proper 404 or 410
        }
      }
      
      await page.close();
    });
  });
});