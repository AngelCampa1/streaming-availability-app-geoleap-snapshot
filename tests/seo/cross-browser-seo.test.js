/**
 * Cross-Browser SEO Testing Suite
 * Tests compatibility across different browsers for SEO features
 * Focus: Ensuring SEO elements work consistently across all major browsers
 */

const { chromium, firefox, webkit } = require('playwright');

describe('Cross-Browser SEO Tests', () => {
  const browsers = [
    { name: 'Chromium', launcher: chromium },
    { name: 'Firefox', launcher: firefox },
    { name: 'WebKit', launcher: webkit }
  ];

  const testPages = [
    { path: '/', name: 'Homepage' },
    { path: '/search', name: 'Search Page' },
    { path: '/content/movie-123', name: 'Content Page' },
    { path: '/pricing', name: 'Pricing Page' }
  ];

  describe('Meta Tags Consistency', () => {
    test.each(browsers)('should have consistent meta tags in $name', async ({ name, launcher }) => {
      const browser = await launcher.launch();
      const page = await browser.newPage();
      
      try {
        for (const testPage of testPages) {
          await page.goto(`http://localhost:3000${testPage.path}`);
          
          const metaTags = await page.evaluate(() => {
            const metas = document.querySelectorAll('meta');
            return Array.from(metas).map(meta => ({
              name: meta.getAttribute('name'),
              property: meta.getAttribute('property'),
              content: meta.getAttribute('content'),
              charset: meta.getAttribute('charset')
            })).filter(meta => 
              meta.name || meta.property || meta.charset
            );
          });

          // Essential meta tags should exist
          const titleTag = await page.$eval('title', el => el.textContent);
          expect(titleTag).toBeTruthy();
          
          const descriptionMeta = metaTags.find(meta => meta.name === 'description');
          expect(descriptionMeta?.content).toBeTruthy();
          
          const viewportMeta = metaTags.find(meta => meta.name === 'viewport');
          expect(viewportMeta?.content).toBeTruthy();
        }
      } finally {
        await browser.close();
      }
    });
  });

  describe('JavaScript SEO Features', () => {
    test.each(browsers)('should execute JavaScript SEO features in $name', async ({ name, launcher }) => {
      const browser = await launcher.launch();
      const page = await browser.newPage();
      
      try {
        await page.goto('http://localhost:3000/search');
        
        // Test dynamic content loading
        const hasJavaScript = await page.evaluate(() => {
          return typeof window.fetch === 'function' && 
                 typeof window.history.pushState === 'function';
        });
        expect(hasJavaScript).toBe(true);

        // Test structured data injection
        await page.waitForSelector('script[type="application/ld+json"]', { timeout: 3000 });
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
        
        // Test dynamic title updates
        const originalTitle = await page.$eval('title', el => el.textContent);
        
        // Simulate navigation
        const searchInput = await page.$('input[type="search"], input[name="search"]');
        if (searchInput) {
          await searchInput.type('test query');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1000);
          
          const newTitle = await page.$eval('title', el => el.textContent);
          // Title might change with search results
          expect(newTitle).toBeTruthy();
        }
      } finally {
        await browser.close();
      }
    });
  });

  describe('CSS and Layout Consistency', () => {
    test.each(browsers)('should render consistently in $name', async ({ name, launcher }) => {
      const browser = await launcher.launch();
      const page = await browser.newPage();
      
      try {
        await page.goto('http://localhost:3000/');
        
        // Check for critical rendering issues
        const layoutMetrics = await page.evaluate(() => {
          const body = document.body;
          const main = document.querySelector('main, [role="main"]');
          
          return {
            bodyHeight: body.scrollHeight,
            bodyWidth: body.scrollWidth,
            mainExists: !!main,
            hasVisibleContent: body.scrollHeight > 100,
            fontsLoaded: document.fonts ? document.fonts.status === 'loaded' : true
          };
        });

        expect(layoutMetrics.hasVisibleContent).toBe(true);
        expect(layoutMetrics.bodyHeight).toBeGreaterThan(100);
        expect(layoutMetrics.bodyWidth).toBeGreaterThan(100);
        
        // Check for invisible text (FOIT/FOUT issues)
        const invisibleText = await page.evaluate(() => {
          const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, span');
          let invisibleCount = 0;
          
          textElements.forEach(el => {
            const styles = window.getComputedStyle(el);
            if (el.textContent.trim() && 
                (styles.opacity === '0' || 
                 styles.visibility === 'hidden' ||
                 styles.fontSize === '0px')) {
              invisibleCount++;
            }
          });
          
          return invisibleCount;
        });
        
        expect(invisibleText).toBeLessThan(5); // Allow some intentionally hidden text
      } finally {
        await browser.close();
      }
    });
  });

  describe('Mobile Viewport Consistency', () => {
    test.each(browsers)('should handle mobile viewport in $name', async ({ name, launcher }) => {
      const browser = await launcher.launch();
      const page = await browser.newPage();
      
      try {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('http://localhost:3000/');
        
        const mobileMetrics = await page.evaluate(() => {
          return {
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
            hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
            touchSupport: 'ontouchstart' in window
          };
        });

        expect(mobileMetrics.viewportWidth).toBe(375);
        expect(mobileMetrics.hasHorizontalScroll).toBe(false);
        
        // Check responsive images
        const images = await page.$$eval('img', imgs => 
          imgs.map(img => ({
            naturalWidth: img.naturalWidth,
            displayWidth: img.getBoundingClientRect().width,
            responsive: img.style.maxWidth === '100%' || 
                       img.style.width === '100%' ||
                       img.getBoundingClientRect().width <= 375
          }))
        );
        
        const responsiveImages = images.filter(img => img.responsive);
        if (images.length > 0) {
          expect(responsiveImages.length / images.length).toBeGreaterThan(0.8);
        }
      } finally {
        await browser.close();
      }
    });
  });

  describe('Search Engine Bot Simulation', () => {
    test.each(browsers)('should be crawlable by search bots in $name', async ({ name, launcher }) => {
      const browser = await launcher.launch();
      const page = await browser.newPage();
      
      try {
        // Simulate Googlebot user agent
        await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
        await page.goto('http://localhost:3000/');
        
        const botVisibleContent = await page.evaluate(() => {
          return {
            title: document.title,
            headings: Array.from(document.querySelectorAll('h1, h2, h3'))
              .map(h => h.textContent.trim()),
            paragraphs: Array.from(document.querySelectorAll('p'))
              .map(p => p.textContent.trim())
              .filter(text => text.length > 20)
              .slice(0, 3),
            links: Array.from(document.querySelectorAll('a[href]'))
              .map(a => ({
                href: a.getAttribute('href'),
                text: a.textContent.trim()
              }))
              .filter(link => link.text && !link.href.startsWith('javascript:'))
              .slice(0, 10)
          };
        });

        expect(botVisibleContent.title).toBeTruthy();
        expect(botVisibleContent.headings.length).toBeGreaterThan(0);
        expect(botVisibleContent.paragraphs.length).toBeGreaterThan(0);
        expect(botVisibleContent.links.length).toBeGreaterThan(0);

        // Check for content that requires JavaScript
        const noScriptContent = await page.$eval('noscript', el => el?.textContent || '').catch(() => '');
        const hasNoScriptFallback = noScriptContent.length > 0;
        
        // Either content should be available without JS, or there should be noscript fallback
        expect(botVisibleContent.paragraphs.length > 0 || hasNoScriptFallback).toBe(true);
      } finally {
        await browser.close();
      }
    });
  });

  describe('Social Media Crawlers', () => {
    test.each(browsers)('should provide rich previews for social crawlers in $name', async ({ name, launcher }) => {
      const browser = await launcher.launch();
      const page = await browser.newPage();
      
      try {
        // Simulate Facebook crawler
        await page.setUserAgent('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)');
        await page.goto('http://localhost:3000/content/movie-123');
        
        const socialMeta = await page.evaluate(() => {
          const ogTags = {};
          const twitterTags = {};
          
          document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
            ogTags[meta.getAttribute('property')] = meta.getAttribute('content');
          });
          
          document.querySelectorAll('meta[name^="twitter:"]').forEach(meta => {
            twitterTags[meta.getAttribute('name')] = meta.getAttribute('content');
          });
          
          return { ogTags, twitterTags };
        });

        // Check essential Open Graph tags
        expect(socialMeta.ogTags['og:title']).toBeTruthy();
        expect(socialMeta.ogTags['og:description']).toBeTruthy();
        expect(socialMeta.ogTags['og:image']).toBeTruthy();
        expect(socialMeta.ogTags['og:url']).toBeTruthy();

        // Check Twitter Card tags
        expect(socialMeta.twitterTags['twitter:card']).toBeTruthy();
        expect(socialMeta.twitterTags['twitter:title'] || socialMeta.ogTags['og:title']).toBeTruthy();
        expect(socialMeta.twitterTags['twitter:description'] || socialMeta.ogTags['og:description']).toBeTruthy();
      } finally {
        await browser.close();
      }
    });
  });

  describe('Performance Across Browsers', () => {
    test.each(browsers)('should meet performance requirements in $name', async ({ name, launcher }) => {
      const browser = await launcher.launch();
      const page = await browser.newPage();
      
      try {
        const startTime = Date.now();
        await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
        const loadTime = Date.now() - startTime;
        
        expect(loadTime).toBeLessThan(5000); // Allow more time for different browsers

        // Check for JavaScript errors that might affect SEO
        const jsErrors = [];
        page.on('pageerror', error => jsErrors.push(error.message));
        
        await page.reload({ waitUntil: 'networkidle' });
        
        // Critical JavaScript errors should not occur
        const criticalErrors = jsErrors.filter(error => 
          error.includes('ReferenceError') || 
          error.includes('TypeError') ||
          error.includes('SyntaxError')
        );
        
        expect(criticalErrors.length).toBe(0);
      } finally {
        await browser.close();
      }
    });
  });

  describe('Local Storage and Cookies', () => {
    test.each(browsers)('should handle storage consistently in $name', async ({ name, launcher }) => {
      const browser = await launcher.launch();
      const page = await browser.newPage();
      
      try {
        await page.goto('http://localhost:3000/');
        
        const storageSupport = await page.evaluate(() => {
          return {
            localStorage: typeof localStorage !== 'undefined',
            sessionStorage: typeof sessionStorage !== 'undefined',
            cookies: navigator.cookieEnabled,
            indexedDB: typeof indexedDB !== 'undefined'
          };
        });

        expect(storageSupport.localStorage).toBe(true);
        expect(storageSupport.sessionStorage).toBe(true);
        
        // Test that user preferences don't break SEO
        await page.evaluate(() => {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('theme', 'light');
            localStorage.setItem('preferences', JSON.stringify({ region: 'US' }));
          }
        });

        await page.reload();
        
        // Page should still render properly after setting preferences
        const title = await page.$eval('title', el => el.textContent);
        expect(title).toBeTruthy();
      } finally {
        await browser.close();
      }
    });
  });

  describe('URL Handling', () => {
    test.each(browsers)('should handle URLs consistently in $name', async ({ name, launcher }) => {
      const browser = await launcher.launch();
      const page = await browser.newPage();
      
      try {
        const testUrls = [
          '/search?q=action%20movies',
          '/content/the-matrix-1999',
          '/category/sci-fi',
          '/#section'
        ];

        for (const url of testUrls) {
          await page.goto(`http://localhost:3000${url}`);
          
          const currentUrl = page.url();
          const response = await page.goto(currentUrl);
          
          expect(response.status()).toBe(200);
          
          // Check that canonical URL is properly set
          const canonical = await page.$eval(
            'link[rel="canonical"]',
            el => el.getAttribute('href')
          ).catch(() => null);
          
          if (canonical) {
            expect(canonical).toContain('geoleap.app');
          }
        }
      } finally {
        await browser.close();
      }
    });
  });
});