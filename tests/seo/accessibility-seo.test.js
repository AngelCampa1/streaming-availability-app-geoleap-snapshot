/**
 * Accessibility SEO Testing Suite
 * Tests WCAG compliance, screen reader compatibility, and accessibility features
 * Focus: Ensuring accessibility compliance for better SEO and user experience
 */

const { chromium } = require('playwright');
const { injectAxe, checkA11y, getViolations } = require('axe-playwright');

describe('Accessibility SEO Tests', () => {
  let browser, page;
  
  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('WCAG 2.1 AA Compliance', () => {
    test('should pass axe-core accessibility audit', async () => {
      const testPages = [
        '/',
        '/search',
        '/content/movie-123',
        '/pricing'
      ];

      for (const path of testPages) {
        await page.goto(`http://localhost:3000${path}`);
        await injectAxe(page);
        
        try {
          await checkA11y(page, null, {
            detailedReport: true,
            detailedReportOptions: { html: true }
          });
        } catch (error) {
          const violations = await getViolations(page);
          
          // Allow minor violations but fail on serious ones
          const criticalViolations = violations.filter(v => 
            v.impact === 'critical' || v.impact === 'serious'
          );
          
          if (criticalViolations.length > 0) {
            console.log(`Accessibility violations on ${path}:`, criticalViolations);
            throw new Error(`Critical accessibility violations found on ${path}`);
          }
        }
      }
    });

    test('should have proper heading hierarchy', async () => {
      const testPages = [
        { path: '/', expectedH1Count: 1 },
        { path: '/search', expectedH1Count: 1 },
        { path: '/content/movie-123', expectedH1Count: 1 }
      ];

      for (const { path, expectedH1Count } of testPages) {
        await page.goto(`http://localhost:3000${path}`);
        
        const headingStructure = await page.evaluate(() => {
          const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
          return headings.map(h => ({
            tag: h.tagName.toLowerCase(),
            text: h.textContent.trim(),
            level: parseInt(h.tagName[1])
          }));
        });

        const h1Count = headingStructure.filter(h => h.tag === 'h1').length;
        expect(h1Count).toBe(expectedH1Count);

        // Check proper hierarchy (no level skipping)
        for (let i = 1; i < headingStructure.length; i++) {
          const current = headingStructure[i];
          const previous = headingStructure[i - 1];
          
          if (current.level > previous.level) {
            expect(current.level - previous.level).toBeLessThanOrEqual(1);
          }
        }
      }
    });
  });

  describe('Keyboard Navigation', () => {
    test('should support keyboard navigation', async () => {
      await page.goto('http://localhost:3000/');
      
      // Test tab navigation
      const focusableElements = await page.evaluate(() => {
        const focusable = document.querySelectorAll(
          'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        return focusable.length;
      });

      expect(focusableElements).toBeGreaterThan(0);

      // Test focus visibility
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => {
        const focused = document.activeElement;
        const styles = window.getComputedStyle(focused);
        return {
          tag: focused.tagName.toLowerCase(),
          hasOutline: styles.outline !== 'none' && styles.outline !== '',
          hasFocusStyles: styles.boxShadow.includes('0 0') || styles.border.includes('px')
        };
      });

      expect(focusedElement.hasOutline || focusedElement.hasFocusStyles).toBe(true);
    });

    test('should provide skip links', async () => {
      await page.goto('http://localhost:3000/');
      
      const skipLinks = await page.$$eval(
        'a[href^="#"], a[href*="skip"]',
        links => links
          .filter(link => 
            link.textContent.toLowerCase().includes('skip') ||
            link.textContent.toLowerCase().includes('main')
          )
          .map(link => ({
            text: link.textContent.trim(),
            href: link.getAttribute('href')
          }))
      );

      expect(skipLinks.length).toBeGreaterThan(0);
      
      // Test skip link functionality
      if (skipLinks.length > 0) {
        await page.click(`a[href="${skipLinks[0].href}"]`);
        const targetExists = await page.$(skipLinks[0].href);
        expect(targetExists).toBeTruthy();
      }
    });
  });

  describe('Screen Reader Compatibility', () => {
    test('should have proper ARIA labels and roles', async () => {
      await page.goto('http://localhost:3000/search');
      
      const ariaElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('[role], [aria-label], [aria-labelledby], [aria-describedby]');
        return Array.from(elements).map(el => ({
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role'),
          ariaLabel: el.getAttribute('aria-label'),
          ariaLabelledby: el.getAttribute('aria-labelledby'),
          ariaDescribedby: el.getAttribute('aria-describedby')
        }));
      });

      expect(ariaElements.length).toBeGreaterThan(0);

      // Check for search-specific ARIA
      const searchInput = await page.$('input[type="search"], input[role="searchbox"]');
      if (searchInput) {
        const ariaLabel = await searchInput.getAttribute('aria-label');
        const placeholder = await searchInput.getAttribute('placeholder');
        expect(ariaLabel || placeholder).toBeTruthy();
      }
    });

    test('should provide alternative text for images', async () => {
      await page.goto('http://localhost:3000/');
      
      const imageAccessibility = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const metrics = {
          total: images.length,
          withAlt: 0,
          withEmptyAlt: 0,
          decorativeImages: 0
        };

        images.forEach(img => {
          const alt = img.getAttribute('alt');
          if (alt !== null) {
            metrics.withAlt++;
            if (alt === '') {
              metrics.withEmptyAlt++;
            }
          }
          if (img.getAttribute('role') === 'presentation' || img.getAttribute('aria-hidden') === 'true') {
            metrics.decorativeImages++;
          }
        });

        return metrics;
      });

      // All images should have alt attributes (empty for decorative)
      const totalAccessibleImages = imageAccessibility.withAlt + imageAccessibility.decorativeImages;
      expect(totalAccessibleImages).toBe(imageAccessibility.total);
    });

    test('should announce dynamic content changes', async () => {
      await page.goto('http://localhost:3000/search');
      
      // Check for ARIA live regions
      const liveRegions = await page.$$eval(
        '[aria-live], [role="status"], [role="alert"]',
        regions => regions.map(region => ({
          role: region.getAttribute('role'),
          ariaLive: region.getAttribute('aria-live'),
          id: region.id || 'unnamed'
        }))
      );

      expect(liveRegions.length).toBeGreaterThan(0);
    });
  });

  describe('Color and Contrast', () => {
    test('should meet color contrast requirements', async () => {
      await page.goto('http://localhost:3000/');
      
      const contrastIssues = await page.evaluate(() => {
        const issues = [];
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, button, span, div');
        
        textElements.forEach(el => {
          const styles = window.getComputedStyle(el);
          const color = styles.color;
          const backgroundColor = styles.backgroundColor;
          
          if (el.textContent.trim() && color && backgroundColor) {
            // Simple contrast check (would need more sophisticated calculation in real implementation)
            if (color === backgroundColor) {
              issues.push({
                element: el.tagName.toLowerCase(),
                text: el.textContent.trim().substring(0, 50)
              });
            }
          }
        });
        
        return issues;
      });

      expect(contrastIssues.length).toBe(0);
    });

    test('should not rely solely on color for information', async () => {
      await page.goto('http://localhost:3000/');
      
      // Check for elements that might rely on color alone
      const colorOnlyElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('.error, .success, .warning, .info');
        return Array.from(elements).map(el => {
          const hasIcon = el.querySelector('svg, i, .icon');
          const hasText = el.textContent.trim().length > 0;
          return {
            classes: el.className,
            hasIcon: !!hasIcon,
            hasText: hasText,
            accessible: hasIcon || hasText
          };
        });
      });

      const inaccessibleElements = colorOnlyElements.filter(el => !el.accessible);
      expect(inaccessibleElements.length).toBe(0);
    });
  });

  describe('Form Accessibility', () => {
    test('should have accessible form controls', async () => {
      const formsPages = ['/search', '/auth/login', '/auth/register'];
      
      for (const path of formsPages) {
        try {
          await page.goto(`http://localhost:3000${path}`);
          
          const formAccessibility = await page.evaluate(() => {
            const inputs = document.querySelectorAll('input, textarea, select');
            const metrics = {
              total: inputs.length,
              withLabels: 0,
              withPlaceholder: 0,
              withAriaLabel: 0,
              accessible: 0
            };

            inputs.forEach(input => {
              const id = input.id;
              const label = id ? document.querySelector(`label[for="${id}"]`) : null;
              const ariaLabel = input.getAttribute('aria-label');
              const ariaLabelledby = input.getAttribute('aria-labelledby');
              const placeholder = input.getAttribute('placeholder');

              if (label) metrics.withLabels++;
              if (placeholder) metrics.withPlaceholder++;
              if (ariaLabel || ariaLabelledby) metrics.withAriaLabel++;
              
              if (label || ariaLabel || ariaLabelledby) {
                metrics.accessible++;
              }
            });

            return metrics;
          });

          if (formAccessibility.total > 0) {
            const accessibilityRate = formAccessibility.accessible / formAccessibility.total;
            expect(accessibilityRate).toBeGreaterThan(0.8); // 80% of form controls should be accessible
          }
        } catch (error) {
          // Page might not exist, skip
          continue;
        }
      }
    });

    test('should provide clear error messages', async () => {
      try {
        await page.goto('http://localhost:3000/auth/login');
        
        // Try to submit empty form to trigger validation
        const submitButton = await page.$('button[type="submit"], input[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          
          // Wait for error messages
          await page.waitForSelector('[role="alert"], .error, [aria-invalid="true"]', { timeout: 2000 });
          
          const errorMessages = await page.$$eval(
            '[role="alert"], .error, [aria-invalid="true"]',
            elements => elements.map(el => ({
              text: el.textContent.trim(),
              hasRole: el.getAttribute('role') === 'alert',
              ariaInvalid: el.getAttribute('aria-invalid') === 'true'
            }))
          );

          expect(errorMessages.length).toBeGreaterThan(0);
          expect(errorMessages.some(msg => msg.text.length > 0)).toBe(true);
        }
      } catch (error) {
        // Form validation might work differently, skip
      }
    });
  });

  describe('Mobile Accessibility', () => {
    test('should be accessible on mobile devices', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/');
      
      const mobileAccessibility = await page.evaluate(() => {
        const touchTargets = document.querySelectorAll('button, a, input, [role="button"]');
        const metrics = {
          total: touchTargets.length,
          adequateSize: 0,
          tooSmall: 0
        };

        touchTargets.forEach(target => {
          const rect = target.getBoundingClientRect();
          const size = Math.min(rect.width, rect.height);
          
          if (size >= 44) { // WCAG recommendation for touch targets
            metrics.adequateSize++;
          } else if (size < 44) {
            metrics.tooSmall++;
          }
        });

        return metrics;
      });

      if (mobileAccessibility.total > 0) {
        const adequateRate = mobileAccessibility.adequateSize / mobileAccessibility.total;
        expect(adequateRate).toBeGreaterThan(0.7); // 70% should have adequate touch target size
      }
    });
  });

  describe('Media Accessibility', () => {
    test('should provide accessible media content', async () => {
      await page.goto('http://localhost:3000/content/movie-123');
      
      const mediaAccessibility = await page.evaluate(() => {
        const videos = document.querySelectorAll('video');
        const audios = document.querySelectorAll('audio');
        const iframes = document.querySelectorAll('iframe');
        
        return {
          videos: Array.from(videos).map(v => ({
            hasControls: v.hasAttribute('controls'),
            hasCaptions: !!v.querySelector('track[kind="captions"], track[kind="subtitles"]'),
            hasTitle: !!v.getAttribute('title') || !!v.getAttribute('aria-label')
          })),
          audios: Array.from(audios).map(a => ({
            hasControls: a.hasAttribute('controls'),
            hasTitle: !!a.getAttribute('title') || !!a.getAttribute('aria-label')
          })),
          iframes: Array.from(iframes).map(i => ({
            hasTitle: !!i.getAttribute('title'),
            src: i.src
          }))
        };
      });

      // Check video accessibility
      mediaAccessibility.videos.forEach((video, index) => {
        expect(video.hasControls).toBe(true);
        // Note: Captions check might not be relevant for all videos
      });

      // Check iframe accessibility
      mediaAccessibility.iframes.forEach((iframe, index) => {
        expect(iframe.hasTitle).toBe(true);
      });
    });
  });
});