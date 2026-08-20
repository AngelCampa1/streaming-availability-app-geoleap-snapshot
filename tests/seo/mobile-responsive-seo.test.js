/**
 * Mobile Responsive SEO Testing Suite
 * Tests mobile responsiveness, viewport handling, and mobile-specific SEO features
 * Focus: Ensuring mobile-first indexing compliance and optimal mobile UX
 */

const { chromium } = require('playwright');

describe('Mobile Responsive SEO Tests', () => {
  let browser, page;
  
  const mobileDevices = [
    { name: 'iPhone 12', width: 390, height: 844, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1' },
    { name: 'Galaxy S21', width: 360, height: 800, userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.72 Mobile Safari/537.36' },
    { name: 'iPad', width: 768, height: 1024, userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1' },
    { name: 'iPhone SE', width: 375, height: 667, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1' }
  ];

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Viewport Configuration', () => {
    test('should have proper viewport meta tag', async () => {
      page = await browser.newPage();
      await page.goto('http://localhost:3000/');
      
      const viewportMeta = await page.$eval(
        'meta[name="viewport"]',
        el => el.getAttribute('content')
      );

      expect(viewportMeta).toBeTruthy();
      expect(viewportMeta).toContain('width=device-width');
      expect(viewportMeta).toContain('initial-scale=1');
      
      // Should not disable user scaling for accessibility
      expect(viewportMeta).not.toContain('user-scalable=no');
      expect(viewportMeta).not.toContain('maximum-scale=1');
      
      await page.close();
    });

    test('should adapt to different screen sizes', async () => {
      for (const device of mobileDevices) {
        page = await browser.newPage();
        await page.setUserAgent(device.userAgent);
        await page.setViewportSize({ width: device.width, height: device.height });
        
        await page.goto('http://localhost:3000/');
        
        const layoutMetrics = await page.evaluate(() => {
          return {
            viewportWidth: window.innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            bodyWidth: document.body.scrollWidth,
            hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
            contentOverflows: Array.from(document.querySelectorAll('*')).some(el => {
              const rect = el.getBoundingClientRect();
              return rect.right > window.innerWidth && rect.width > 10;
            })
          };
        });

        expect(layoutMetrics.viewportWidth).toBe(device.width);
        expect(layoutMetrics.hasHorizontalScroll).toBe(false);
        expect(layoutMetrics.contentOverflows).toBe(false);
        
        await page.close();
      }
    });
  });

  describe('Touch-Friendly Interface', () => {
    test('should have adequate touch target sizes', async () => {
      page = await browser.newPage();
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/');
      
      const touchTargets = await page.evaluate(() => {
        const interactiveElements = document.querySelectorAll(
          'button, a, input, textarea, select, [role="button"], [tabindex="0"]'
        );
        
        const targetSizes = Array.from(interactiveElements).map(el => {
          const rect = el.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && 
                           window.getComputedStyle(el).display !== 'none';
          
          return {
            element: el.tagName.toLowerCase(),
            width: rect.width,
            height: rect.height,
            area: rect.width * rect.height,
            adequate: Math.min(rect.width, rect.height) >= 44, // WCAG guideline
            isVisible
          };
        }).filter(target => target.isVisible);
        
        return {
          total: targetSizes.length,
          adequate: targetSizes.filter(t => t.adequate).length,
          tooSmall: targetSizes.filter(t => !t.adequate).length,
          averageSize: targetSizes.reduce((sum, t) => sum + Math.min(t.width, t.height), 0) / targetSizes.length
        };
      });

      if (touchTargets.total > 0) {
        const adequacyRate = touchTargets.adequate / touchTargets.total;
        expect(adequacyRate).toBeGreaterThan(0.7); // 70% should meet touch target guidelines
        expect(touchTargets.averageSize).toBeGreaterThan(40); // Average should be close to 44px
      }
      
      await page.close();
    });

    test('should have proper spacing between touch targets', async () => {
      page = await browser.newPage();
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/');
      
      const spacingIssues = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        let tooClose = 0;
        
        for (let i = 0; i < buttons.length; i++) {
          for (let j = i + 1; j < buttons.length; j++) {
            const rect1 = buttons[i].getBoundingClientRect();
            const rect2 = buttons[j].getBoundingClientRect();
            
            // Check if elements are close to each other
            const horizontalDistance = Math.abs(rect1.left - rect2.left);
            const verticalDistance = Math.abs(rect1.top - rect2.top);
            
            if (horizontalDistance < 48 && verticalDistance < 48 && 
                rect1.width > 0 && rect2.width > 0) { // 8px spacing minimum
              tooClose++;
            }
          }
        }
        
        return { totalComparisons: buttons.length * (buttons.length - 1) / 2, tooClose };
      });

      expect(spacingIssues.tooClose).toBeLessThan(3); // Allow some close elements
      
      await page.close();
    });
  });

  describe('Mobile Content Strategy', () => {
    test('should prioritize above-the-fold content on mobile', async () => {
      page = await browser.newPage();
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/');
      
      const aboveFoldContent = await page.evaluate(() => {
        const viewportHeight = window.innerHeight;
        const elements = document.querySelectorAll('h1, h2, p, img, button, a');
        
        let aboveFoldText = '';
        let aboveFoldImages = 0;
        let aboveFoldButtons = 0;
        
        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.top < viewportHeight && rect.top >= 0) {
            if (el.tagName.toLowerCase() === 'img') {
              aboveFoldImages++;
            } else if (el.tagName.toLowerCase() === 'button') {
              aboveFoldButtons++;
            } else if (el.textContent) {
              aboveFoldText += el.textContent.trim() + ' ';
            }
          }
        });
        
        return {
          textLength: aboveFoldText.length,
          imageCount: aboveFoldImages,
          buttonCount: aboveFoldButtons,
          hasH1: document.querySelector('h1') && 
                 document.querySelector('h1').getBoundingClientRect().top < viewportHeight
        };
      });

      expect(aboveFoldContent.textLength).toBeGreaterThan(100); // Meaningful content above fold
      expect(aboveFoldContent.hasH1).toBe(true); // H1 should be visible
      expect(aboveFoldContent.buttonCount).toBeGreaterThan(0); // Some interactive elements
      
      await page.close();
    });

    test('should load critical resources first on mobile', async () => {
      page = await browser.newPage();
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Track resource loading order
      const resources = [];
      page.on('response', response => {
        resources.push({
          url: response.url(),
          resourceType: response.request().resourceType(),
          status: response.status(),
          timing: Date.now()
        });
      });
      
      await page.goto('http://localhost:3000/');
      
      // Check that critical resources load first
      const criticalResources = resources.filter(r => 
        r.resourceType === 'document' || 
        r.resourceType === 'stylesheet' ||
        (r.resourceType === 'script' && r.url.includes('main')) ||
        r.url.includes('critical')
      );
      
      const nonCriticalResources = resources.filter(r => 
        r.resourceType === 'image' ||
        r.resourceType === 'font' ||
        r.url.includes('analytics')
      );
      
      if (criticalResources.length > 0 && nonCriticalResources.length > 0) {
        const avgCriticalTiming = criticalResources.reduce((sum, r) => sum + r.timing, 0) / criticalResources.length;
        const avgNonCriticalTiming = nonCriticalResources.reduce((sum, r) => sum + r.timing, 0) / nonCriticalResources.length;
        
        expect(avgCriticalTiming).toBeLessThan(avgNonCriticalTiming);
      }
      
      await page.close();
    });
  });

  describe('Mobile Search Experience', () => {
    test('should provide mobile-optimized search interface', async () => {
      page = await browser.newPage();
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/search');
      
      const searchInterface = await page.evaluate(() => {
        const searchInput = document.querySelector('input[type="search"], input[name="search"], #search');
        const searchButton = document.querySelector('button[type="submit"], button[aria-label*="search"]');
        
        if (!searchInput) return { exists: false };
        
        const inputRect = searchInput.getBoundingClientRect();
        const inputStyles = window.getComputedStyle(searchInput);
        
        return {
          exists: true,
          width: inputRect.width,
          height: inputRect.height,
          fontSize: parseFloat(inputStyles.fontSize),
          hasPlaceholder: !!searchInput.placeholder,
          hasLabel: !!document.querySelector(`label[for="${searchInput.id}"]`) || 
                   !!searchInput.getAttribute('aria-label'),
          buttonExists: !!searchButton,
          buttonSize: searchButton ? searchButton.getBoundingClientRect().height : 0
        };
      });

      if (searchInterface.exists) {
        expect(searchInterface.height).toBeGreaterThan(40); // Adequate touch size
        expect(searchInterface.fontSize).toBeGreaterThan(14); // Readable on mobile
        expect(searchInterface.hasPlaceholder || searchInterface.hasLabel).toBe(true);
        
        if (searchInterface.buttonExists) {
          expect(searchInterface.buttonSize).toBeGreaterThan(40);
        }
      }
      
      await page.close();
    });

    test('should handle mobile keyboard interactions', async () => {
      page = await browser.newPage();
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/search');
      
      const searchInput = await page.$('input[type="search"], input[name="search"], #search');
      if (searchInput) {
        // Test focus
        await searchInput.focus();
        
        const inputFocused = await page.evaluate(() => {
          const activeElement = document.activeElement;
          return {
            isFocused: activeElement && (
              activeElement.type === 'search' || 
              activeElement.name === 'search' ||
              activeElement.id === 'search'
            ),
            hasKeyboardSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0
          };
        });
        
        expect(inputFocused.isFocused).toBe(true);
        
        // Test typing
        await page.type('input[type="search"], input[name="search"], #search', 'test query');
        
        const inputValue = await page.inputValue('input[type="search"], input[name="search"], #search');
        expect(inputValue).toBe('test query');
      }
      
      await page.close();
    });
  });

  describe('Mobile Performance', () => {
    test('should meet mobile performance benchmarks', async () => {
      page = await browser.newPage();
      await page.setViewportSize({ width: 375, height: 667 });
      
      const startTime = Date.now();
      await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;
      
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          resourceCount: performance.getEntriesByType('resource').length,
          totalTransferSize: performance.getEntriesByType('resource')
            .reduce((sum, resource) => sum + (resource.transferSize || 0), 0)
        };
      });

      expect(loadTime).toBeLessThan(4000); // Mobile load time budget
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(2000); // Good FCP on mobile
      expect(performanceMetrics.totalTransferSize).toBeLessThan(2000000); // < 2MB for mobile
      
      await page.close();
    });

    test('should optimize images for mobile', async () => {
      page = await browser.newPage();
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/');
      
      const imageMetrics = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const metrics = {
          total: images.length,
          responsive: 0,
          lazyLoaded: 0,
          withSrcset: 0,
          oversized: 0
        };

        images.forEach(img => {
          const rect = img.getBoundingClientRect();
          const styles = window.getComputedStyle(img);
          
          // Check if responsive
          if (styles.maxWidth === '100%' || styles.width === '100%' || rect.width <= 375) {
            metrics.responsive++;
          }
          
          // Check lazy loading
          if (img.loading === 'lazy') {
            metrics.lazyLoaded++;
          }
          
          // Check srcset for different densities
          if (img.srcset) {
            metrics.withSrcset++;
          }
          
          // Check for oversized images
          if (img.naturalWidth > rect.width * 2 && rect.width > 0) {
            metrics.oversized++;
          }
        });

        return metrics;
      });

      if (imageMetrics.total > 0) {
        expect(imageMetrics.responsive / imageMetrics.total).toBeGreaterThan(0.8); // 80% responsive
        expect(imageMetrics.oversized).toBeLessThan(2); // Few oversized images
      }
      
      await page.close();
    });
  });

  describe('Mobile Navigation', () => {
    test('should provide mobile-friendly navigation', async () => {
      page = await browser.newPage();
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/');
      
      const navigationMetrics = await page.evaluate(() => {
        const nav = document.querySelector('nav, [role="navigation"]');
        const mobileMenu = document.querySelector('[aria-label*="menu"], .hamburger, .menu-toggle');
        const navLinks = document.querySelectorAll('nav a, [role="navigation"] a');
        
        return {
          hasNavigation: !!nav,
          hasMobileMenu: !!mobileMenu,
          linkCount: navLinks.length,
          linksAboveFold: Array.from(navLinks).filter(link => {
            const rect = link.getBoundingClientRect();
            return rect.top < window.innerHeight && rect.top >= 0;
          }).length
        };
      });

      expect(navigationMetrics.hasNavigation).toBe(true);
      
      // On mobile, either have a mobile menu or keep nav simple
      if (navigationMetrics.linkCount > 5) {
        expect(navigationMetrics.hasMobileMenu).toBe(true);
      }
      
      await page.close();
    });

    test('should handle navigation menu interactions', async () => {
      page = await browser.newPage();
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/');
      
      // Look for mobile menu toggle
      const menuToggle = await page.$('[aria-label*="menu"], .hamburger, .menu-toggle, [data-testid*="menu"]');
      
      if (menuToggle) {
        const isVisible = await menuToggle.isVisible();
        expect(isVisible).toBe(true);
        
        // Test menu toggle functionality
        await menuToggle.click();
        await page.waitForTimeout(500); // Allow for animation
        
        const menuExpanded = await page.evaluate(() => {
          const toggle = document.querySelector('[aria-expanded]');
          return toggle ? toggle.getAttribute('aria-expanded') === 'true' : false;
        });
        
        // Menu should expand or some navigation should become visible
        expect(menuExpanded).toBe(true);
      }
      
      await page.close();
    });
  });

  describe('Mobile SEO Features', () => {
    test('should provide mobile-specific meta tags', async () => {
      page = await browser.newPage();
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/');
      
      const mobileMeta = await page.evaluate(() => {
        const metaTags = {};
        document.querySelectorAll('meta').forEach(meta => {
          const name = meta.getAttribute('name') || meta.getAttribute('property');
          if (name) {
            metaTags[name] = meta.getAttribute('content');
          }
        });
        
        return {
          viewport: metaTags.viewport,
          themeColor: metaTags['theme-color'],
          appleMobileCapable: metaTags['apple-mobile-web-app-capable'],
          appleMobileTitle: metaTags['apple-mobile-web-app-title'],
          msApplicationTileColor: metaTags['msapplication-TileColor']
        };
      });

      expect(mobileMeta.viewport).toBeTruthy();
      expect(mobileMeta.viewport).toContain('width=device-width');
      
      // Optional but good for mobile experience
      if (mobileMeta.themeColor) {
        expect(mobileMeta.themeColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
      
      await page.close();
    });

    test('should support mobile app integration', async () => {
      page = await browser.newPage();
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/');
      
      const appIntegration = await page.evaluate(() => {
        // Check for app links and smart app banners
        const appLinks = document.querySelectorAll('meta[property^="al:"], link[rel="alternate"][href*="app"], link[rel="alternate"][href*="play.google.com"]');
        const manifest = document.querySelector('link[rel="manifest"]');
        
        return {
          hasAppLinks: appLinks.length > 0,
          hasManifest: !!manifest,
          manifestHref: manifest ? manifest.getAttribute('href') : null
        };
      });

      // Web app manifest for PWA capabilities
      if (appIntegration.hasManifest) {
        expect(appIntegration.manifestHref).toBeTruthy();
      }
      
      await page.close();
    });
  });
});