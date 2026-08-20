import { generatePlatformCountryFaqs } from '../faq-generators';

describe('generatePlatformCountryFaqs', () => {
  describe('when platform is available', () => {
    it('returns FAQs for an available platform with pricing', () => {
      const faqs = generatePlatformCountryFaqs({
        platformName: 'Netflix',
        countryName: 'United Kingdom',
        isAvailable: true,
        startingPrice: 4.99,
        currency: 'GBP',
        hasFreeTier: false,
      });

      expect(faqs.length).toBeGreaterThanOrEqual(3);
      expect(faqs[0].question).toContain('Is Netflix available in United Kingdom');
      expect(faqs[0].answer).toContain('Yes');
    });

    it('includes pricing info when startingPrice and currency are provided', () => {
      const faqs = generatePlatformCountryFaqs({
        platformName: 'Netflix',
        countryName: 'Japan',
        isAvailable: true,
        startingPrice: 790,
        currency: 'JPY',
        hasFreeTier: false,
      });

      const pricingFaq = faqs.find(f => f.question.includes('How much'));
      expect(pricingFaq).toBeDefined();
      expect(pricingFaq!.answer).toContain('JPY');
      expect(pricingFaq!.answer).toContain('790');
    });

    it('mentions free tier when hasFreeTier is true', () => {
      const faqs = generatePlatformCountryFaqs({
        platformName: 'Tubi',
        countryName: 'United States',
        isAvailable: true,
        hasFreeTier: true,
      });

      const pricingFaq = faqs.find(f => f.question.includes('How much'));
      expect(pricingFaq).toBeDefined();
      expect(pricingFaq!.answer).toContain('free tier');
    });

    it('includes content library FAQ', () => {
      const faqs = generatePlatformCountryFaqs({
        platformName: 'Disney+',
        countryName: 'Australia',
        isAvailable: true,
        startingPrice: 13.99,
        currency: 'AUD',
        hasFreeTier: false,
      });

      const contentFaq = faqs.find(f => f.question.includes('content'));
      expect(contentFaq).toBeDefined();
      expect(contentFaq!.answer).toContain('licensing');
    });

    it('includes travel FAQ', () => {
      const faqs = generatePlatformCountryFaqs({
        platformName: 'HBO Max',
        countryName: 'Germany',
        isAvailable: true,
        startingPrice: 9.99,
        currency: 'EUR',
        hasFreeTier: false,
      });

      const travelFaq = faqs.find(f => f.question.includes('traveling'));
      expect(travelFaq).toBeDefined();
      expect(travelFaq!.answer).toContain('geo-licensing');
    });
  });

  describe('when platform is not available', () => {
    it('returns FAQs for an unavailable platform', () => {
      const faqs = generatePlatformCountryFaqs({
        platformName: 'Hulu',
        countryName: 'France',
        isAvailable: false,
      });

      expect(faqs.length).toBeGreaterThanOrEqual(3);
      expect(faqs[0].question).toContain('Is Hulu available in France');
      expect(faqs[0].answer).toContain('not currently available');
    });

    it('includes launch date FAQ', () => {
      const faqs = generatePlatformCountryFaqs({
        platformName: 'Hulu',
        countryName: 'Brazil',
        isAvailable: false,
      });

      const launchFaq = faqs.find(f => f.question.includes('launch'));
      expect(launchFaq).toBeDefined();
      expect(launchFaq!.answer).toContain('no confirmed launch date');
    });

    it('includes alternatives FAQ', () => {
      const faqs = generatePlatformCountryFaqs({
        platformName: 'Peacock',
        countryName: 'India',
        isAvailable: false,
      });

      const altFaq = faqs.find(f => f.question.includes('alternatives'));
      expect(altFaq).toBeDefined();
      expect(altFaq!.answer).toContain('India');
    });
  });

  describe('edge cases', () => {
    it('skips pricing FAQ when available but no price and no free tier', () => {
      const faqs = generatePlatformCountryFaqs({
        platformName: 'SomeService',
        countryName: 'Spain',
        isAvailable: true,
      });

      const pricingFaq = faqs.find(f => f.question.includes('How much'));
      expect(pricingFaq).toBeUndefined();
      expect(faqs.length).toBe(3);
    });
  });

  describe('FaqItem structure', () => {
    it('every FAQ has question and answer strings', () => {
      const faqs = generatePlatformCountryFaqs({
        platformName: 'Netflix',
        countryName: 'Canada',
        isAvailable: true,
        startingPrice: 5.99,
        currency: 'CAD',
        hasFreeTier: false,
      });

      for (const faq of faqs) {
        expect(typeof faq.question).toBe('string');
        expect(typeof faq.answer).toBe('string');
        expect(faq.question.length).toBeGreaterThan(10);
        expect(faq.answer.length).toBeGreaterThan(10);
      }
    });
  });
});
