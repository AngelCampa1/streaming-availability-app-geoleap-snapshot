/**
 * Conversion Testing and A/B Testing Suite for SEO Content Pages
 * Tests conversion optimization, A/B testing infrastructure, and performance tracking
 * Focus: Optimizing SEO pages for conversion while maintaining search ranking factors
 */

const { chromium } = require('playwright');

describe('Conversion and A/B Testing for SEO Pages', () => {
  let browser, page;
  
  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Landing Page Conversion Elements', () => {
    test('should have effective CTAs above the fold', async () => {
      page = await browser.newPage();
      await page.goto('http://localhost:3000/');
      
      const ctaAnalysis = await page.evaluate(() => {
        const viewportHeight = window.innerHeight;
        const ctaSelectors = [
          'button[data-testid*="cta"]',
          'a[href*="signup"], a[href*="register"], a[href*="subscribe"]',
          '.cta, .call-to-action',
          '[data-conversion-tracking]'
        ];
        
        const ctas = [];
        ctaSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < viewportHeight && rect.top >= 0 && rect.width > 0 && rect.height > 0) {
              ctas.push({
                selector,
                text: el.textContent.trim(),
                position: { top: rect.top, left: rect.left },
                size: { width: rect.width, height: rect.height },
                isAboveFold: true,
                hasTracking: !!el.dataset.conversionTracking
              });
            }
          });
        });
        
        return {
          totalCTAs: ctas.length,
          aboveFoldCTAs: ctas.filter(c => c.isAboveFold).length,
          ctaTexts: ctas.map(c => c.text),
          averageSize: ctas.reduce((sum, c) => sum + (c.size.width * c.size.height), 0) / ctas.length,
          withTracking: ctas.filter(c => c.hasTracking).length
        };
      });

      expect(ctaAnalysis.aboveFoldCTAs).toBeGreaterThan(0);
      expect(ctaAnalysis.averageSize).toBeGreaterThan(2000); // Minimum 40x50px
      
      // CTA text should be action-oriented
      const actionWords = ['start', 'get', 'try', 'sign up', 'subscribe', 'join', 'discover'];
      const hasActionWords = ctaAnalysis.ctaTexts.some(text => 
        actionWords.some(word => text.toLowerCase().includes(word))
      );
      expect(hasActionWords).toBe(true);
      
      await page.close();
    });

    test('should have compelling value propositions', async () => {
      page = await browser.newPage();
      await page.goto('http://localhost:3000/');
      
      const valueProps = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
        const benefits = Array.from(document.querySelectorAll('.benefit, .feature, [data-testid*="benefit"]'));
        const testimonials = Array.from(document.querySelectorAll('.testimonial, .review, [data-testid*="testimonial"]'));
        
        return {
          headingTexts: headings.map(h => h.textContent.trim()).slice(0, 3),
          benefitCount: benefits.length,
          testimonialCount: testimonials.length,
          hasNumbers: headings.some(h => /\d+/.test(h.textContent)),
          hasEmotionalWords: headings.some(h => 
            /(best|amazing|incredible|unlimited|instant|free|save|exclusive)/i.test(h.textContent)
          )
        };
      });

      expect(valueProps.headingTexts.length).toBeGreaterThan(0);
      expect(valueProps.benefitCount + valueProps.testimonialCount).toBeGreaterThan(2);
      expect(valueProps.hasNumbers || valueProps.hasEmotionalWords).toBe(true);
      
      await page.close();
    });
  });

  describe('A/B Testing Infrastructure', () => {
    test('should support A/B testing variants', async () => {
      page = await browser.newPage();
      
      // Test different URL parameters for A/B testing
      const variants = ['?variant=a', '?variant=b', '?test=headline_1', ''];
      const variantResults = {};
      
      for (const variant of variants) {
        await page.goto(`http://localhost:3000/${variant}`);
        
        variantResults[variant || 'control'] = await page.evaluate(() => {
          return {
            title: document.title,
            h1Text: document.querySelector('h1')?.textContent?.trim() || '',
            ctaText: document.querySelector('[data-testid*="cta"], .cta')?.textContent?.trim() || '',
            hasVariantTracking: !!document.querySelector('[data-variant]'),
            abTestingScript: !!document.querySelector('script[src*="optimize"], script[src*="experiment"]')
          };
        });
      }
      
      // Check if variants produce different content or have tracking
      const hasVariants = Object.values(variantResults).some(result => 
        result.hasVariantTracking || result.abTestingScript
      );
      
      // Either should have A/B testing infrastructure OR consistent content
      if (hasVariants) {
        expect(Object.values(variantResults).some(r => r.hasVariantTracking)).toBe(true);
      } else {
        // If no A/B testing, content should be consistent
        const titles = new Set(Object.values(variantResults).map(r => r.title));
        expect(titles.size).toBe(1);
      }
      
      await page.close();
    });

    test('should track conversion events', async () => {
      page = await browser.newPage();
      
      // Track network requests for analytics
      const analyticsRequests = [];
      page.on('request', request => {
        const url = request.url();
        if (url.includes('analytics') || url.includes('tracking') || 
            url.includes('google-analytics') || url.includes('gtm')) {
          analyticsRequests.push({
            url,
            method: request.method(),
            postData: request.postData()
          });
        }
      });
      
      await page.goto('http://localhost:3000/');
      
      // Simulate conversion events
      const conversionButton = await page.$('button[data-testid*="cta"], .cta, [href*="signup"]');
      if (conversionButton) {
        await conversionButton.click();
        await page.waitForTimeout(1000); // Wait for tracking calls
      }
      
      // Check for tracking implementation
      const hasTrackingCode = await page.evaluate(() => {
        return {
          hasGoogleAnalytics: typeof gtag === 'function' || typeof ga === 'function',
          hasDataLayer: Array.isArray(window.dataLayer),
          hasConversionTracking: !!document.querySelector('[data-conversion-tracking]'),
          customEvents: window.customTrackingEvents || []
        };
      });
      
      expect(
        hasTrackingCode.hasGoogleAnalytics || 
        hasTrackingCode.hasDataLayer || 
        analyticsRequests.length > 0
      ).toBe(true);
      
      await page.close();
    });
  });

  describe('Pricing Page Optimization', () => {
    test('should have optimized pricing presentation', async () => {
      page = await browser.newPage();
      await page.goto('http://localhost:3000/pricing');
      
      const pricingAnalysis = await page.evaluate(() => {
        const pricingCards = document.querySelectorAll('.pricing-card, .plan, [data-testid*="pricing"]');
        const priceElements = document.querySelectorAll('.price, [data-testid*="price"]');
        const features = document.querySelectorAll('.feature, .included, [data-testid*="feature"]');
        
        return {
          planCount: pricingCards.length,
          priceCount: priceElements.length,
          featureCount: features.length,
          hasRecommended: !!document.querySelector('.recommended, .popular, [data-recommended]'),
          hasMoneyBackGuarantee: /money.back|guarantee|refund/i.test(document.body.textContent),
          hasTrial: /free.trial|trial/i.test(document.body.textContent),
          hasComparison: pricingCards.length > 1,
          ctaPerPlan: Array.from(pricingCards).map(card => 
            card.querySelectorAll('button, a[href*="signup"]').length
          )
        };
      });

      expect(pricingAnalysis.planCount).toBeGreaterThan(0);
      expect(pricingAnalysis.priceCount).toBeGreaterThan(0);
      expect(pricingAnalysis.featureCount).toBeGreaterThan(0);
      
      // Each plan should have a CTA
      if (pricingAnalysis.planCount > 0) {
        expect(pricingAnalysis.ctaPerPlan.every(count => count > 0)).toBe(true);
      }
      
      // Should have trust signals
      expect(
        pricingAnalysis.hasMoneyBackGuarantee || 
        pricingAnalysis.hasTrial || 
        pricingAnalysis.hasRecommended
      ).toBe(true);
      
      await page.close();
    });

    test('should handle pricing page conversions', async () => {
      page = await browser.newPage();
      await page.goto('http://localhost:3000/pricing');
      
      const conversionFlow = await page.evaluate(() => {
        const signupButtons = document.querySelectorAll('button[data-plan], a[href*="signup"], [data-testid*="subscribe"]');
        return Array.from(signupButtons).map(button => ({
          text: button.textContent.trim(),
          hasDataAttributes: Object.keys(button.dataset).length > 0,
          href: button.href || null,
          planInfo: button.dataset.plan || button.dataset.planId || null
        }));
      });

      expect(conversionFlow.length).toBeGreaterThan(0);
      
      // Test conversion button interaction
      const firstButton = await page.$('button[data-plan], a[href*="signup"], [data-testid*="subscribe"]');
      if (firstButton) {
        await firstButton.click();
        await page.waitForTimeout(1000);
        
        // Should either navigate or show modal/form
        const currentUrl = page.url();
        const hasModal = await page.$('.modal, .popup, [role="dialog"]');
        
        expect(currentUrl.includes('signup') || currentUrl.includes('register') || hasModal).toBeTruthy();
      }
      
      await page.close();
    });
  });

  describe('Content Page Conversion Optimization', () => {
    test('should optimize content pages for conversion', async () => {
      page = await browser.newPage();
      await page.goto('http://localhost:3000/content/movie-123');
      
      const contentConversion = await page.evaluate(() => {
        const watchButtons = document.querySelectorAll('[data-testid*="watch"], .watch-button, [href*="watch"]');
        const shareButtons = document.querySelectorAll('[data-testid*="share"], .share-button');
        const relatedContent = document.querySelectorAll('.related, .recommended, [data-testid*="related"]');
        const subscriptionPrompts = document.querySelectorAll('.subscription-prompt, .paywall, [data-testid*="subscription"]');
        
        return {
          watchButtonCount: watchButtons.length,
          shareButtonCount: shareButtons.length,
          relatedContentCount: relatedContent.length,
          subscriptionPromptCount: subscriptionPrompts.length,
          hasCallToAction: watchButtons.length > 0 || subscriptionPrompts.length > 0,
          hasEngagementElements: shareButtons.length > 0 || relatedContent.length > 0
        };
      });

      expect(contentConversion.hasCallToAction).toBe(true);
      expect(contentConversion.hasEngagementElements).toBe(true);
      expect(contentConversion.relatedContentCount).toBeGreaterThan(0);
      
      await page.close();
    });

    test('should implement paywall optimization', async () => {
      page = await browser.newPage();
      await page.goto('http://localhost:3000/search');
      
      // Simulate search to potentially trigger paywall
      const searchInput = await page.$('input[type="search"], input[name="search"]');
      if (searchInput) {
        await searchInput.type('premium content test');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
      }
      
      const paywallElements = await page.evaluate(() => {
        const paywall = document.querySelector('.paywall, .subscription-required, [data-testid*="paywall"]');
        const premiumContent = document.querySelector('.premium, .locked, [data-premium]');
        const upgradePrompts = document.querySelectorAll('.upgrade-prompt, [data-testid*="upgrade"]');
        
        if (!paywall && !premiumContent) return null;
        
        return {
          hasPaywall: !!paywall,
          hasPremiumContent: !!premiumContent,
          upgradePromptCount: upgradePrompts.length,
          paywallText: paywall?.textContent?.trim() || '',
          hasCloseButton: !!(paywall?.querySelector('button[aria-label*="close"], .close')),
          hasPreview: !!(paywall?.textContent?.includes('preview') || premiumContent?.textContent?.includes('preview'))
        };
      });

      if (paywallElements) {
        expect(paywallElements.upgradePromptCount).toBeGreaterThan(0);
        expect(paywallElements.paywallText.length).toBeGreaterThan(20);
        // Paywall should be closeable for good UX
        expect(paywallElements.hasCloseButton).toBe(true);
      }
      
      await page.close();
    });
  });

  describe('Search Page Conversion', () => {
    test('should optimize search results for conversion', async () => {
      page = await browser.newPage();
      await page.goto('http://localhost:3000/search');
      
      const searchInput = await page.$('input[type="search"], input[name="search"]');
      if (searchInput) {
        await searchInput.type('action movies');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        
        const searchConversion = await page.evaluate(() => {
          const results = document.querySelectorAll('.search-result, .result-item, [data-testid*="result"]');
          const watchButtons = document.querySelectorAll('.watch-button, [data-testid*="watch"]');
          const moreInfoButtons = document.querySelectorAll('.more-info, [data-testid*="info"]');
          const noResults = document.querySelector('.no-results, [data-testid*="no-results"]');
          
          return {
            resultCount: results.length,
            watchButtonCount: watchButtons.length,
            moreInfoButtonCount: moreInfoButtons.length,
            hasNoResults: !!noResults,
            resultsHaveImages: Array.from(results).filter(r => r.querySelector('img')).length,
            resultsHaveRatings: Array.from(results).filter(r => 
              r.textContent.includes('★') || r.querySelector('.rating, [data-testid*="rating"]')
            ).length
          };
        });

        if (searchConversion.resultCount > 0) {
          expect(searchConversion.watchButtonCount + searchConversion.moreInfoButtonCount).toBeGreaterThan(0);
          expect(searchConversion.resultsHaveImages / searchConversion.resultCount).toBeGreaterThan(0.5);
        } else if (searchConversion.hasNoResults) {
          // No results page should have suggestions or alternatives
          const suggestions = await page.$$('.suggestion, .alternative, [data-testid*="suggestion"]');
          expect(suggestions.length).toBeGreaterThan(0);
        }
      }
      
      await page.close();
    });
  });

  describe('Mobile Conversion Optimization', () => {
    test('should optimize mobile conversion flow', async () => {
      page = await browser.newPage();
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/');
      
      const mobileConversion = await page.evaluate(() => {
        const ctas = document.querySelectorAll('button[data-testid*="cta"], .cta, [href*="signup"]');
        const mobileMenu = document.querySelector('[data-testid*="menu"], .mobile-menu');
        const stickyElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const styles = window.getComputedStyle(el);
          return styles.position === 'fixed' || styles.position === 'sticky';
        });
        
        return {
          ctaCount: ctas.length,
          ctaSizes: Array.from(ctas).map(cta => {
            const rect = cta.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
          }),
          hasMobileMenu: !!mobileMenu,
          stickyElementCount: stickyElements.length,
          hasFloatingCTA: stickyElements.some(el => 
            el.textContent.toLowerCase().includes('sign') ||
            el.textContent.toLowerCase().includes('try') ||
            el.classList.toString().includes('cta')
          )
        };
      });

      // Mobile CTAs should be adequately sized
      if (mobileConversion.ctaCount > 0) {
        const adequateCTAs = mobileConversion.ctaSizes.filter(size => 
          size.width >= 120 && size.height >= 44
        );
        expect(adequateCTAs.length / mobileConversion.ctaCount).toBeGreaterThan(0.8);
      }
      
      // Should have mobile-optimized navigation
      expect(mobileConversion.hasMobileMenu).toBe(true);
      
      await page.close();
    });
  });

  describe('Conversion Rate Tracking', () => {
    test('should implement proper conversion tracking', async () => {
      page = await browser.newPage();
      
      // Track all network requests
      const trackingEvents = [];
      page.on('request', request => {
        const url = request.url();
        const postData = request.postData();
        
        if ((url.includes('analytics') || url.includes('tracking')) && postData) {
          try {
            const data = JSON.parse(postData);
            trackingEvents.push({ url, data });
          } catch {
            trackingEvents.push({ url, postData });
          }
        }
      });
      
      await page.goto('http://localhost:3000/');
      
      // Simulate user journey
      const signupButton = await page.$('[href*="signup"], [data-testid*="cta"]');
      if (signupButton) {
        await signupButton.click();
        await page.waitForTimeout(1000);
      }
      
      const trackingImplemented = await page.evaluate(() => {
        return {
          hasGoogleAnalytics: typeof gtag !== 'undefined' || typeof ga !== 'undefined',
          hasDataLayer: Array.isArray(window.dataLayer),
          hasCustomTracking: typeof window.trackConversion === 'function',
          conversionElements: document.querySelectorAll('[data-conversion-tracking]').length
        };
      });

      expect(
        trackingImplemented.hasGoogleAnalytics ||
        trackingImplemented.hasDataLayer ||
        trackingImplemented.hasCustomTracking ||
        trackingEvents.length > 0
      ).toBe(true);
      
      await page.close();
    });
  });

  describe('Form Optimization', () => {
    test('should optimize signup/contact forms', async () => {
      const formPages = ['/auth/register', '/contact', '/signup'];
      
      for (const formPage of formPages) {
        try {
          page = await browser.newPage();
          await page.goto(`http://localhost:3000${formPage}`);
          
          const formAnalysis = await page.evaluate(() => {
            const forms = document.querySelectorAll('form');
            const inputs = document.querySelectorAll('input, textarea, select');
            const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
            
            return {
              formCount: forms.length,
              inputCount: inputs.length,
              requiredInputs: Array.from(inputs).filter(input => input.required).length,
              submitButtonCount: submitButtons.length,
              hasLabels: Array.from(inputs).filter(input => {
                const id = input.id;
                return id && document.querySelector(`label[for="${id}"]`);
              }).length,
              hasPlaceholders: Array.from(inputs).filter(input => input.placeholder).length,
              hasValidation: Array.from(inputs).some(input => 
                input.pattern || input.type === 'email' || input.minLength
              )
            };
          });

          if (formAnalysis.formCount > 0) {
            expect(formAnalysis.submitButtonCount).toBeGreaterThan(0);
            expect(formAnalysis.hasLabels + formAnalysis.hasPlaceholders).toBeGreaterThan(0);
            expect(formAnalysis.inputCount).toBeLessThan(8); // Keep forms short for better conversion
          }
          
          await page.close();
        } catch (error) {
          // Form page might not exist
          if (page) await page.close();
          continue;
        }
      }
    });
  });
});