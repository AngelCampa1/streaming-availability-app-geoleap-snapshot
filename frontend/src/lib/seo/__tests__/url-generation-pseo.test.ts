import {
  generatePlatformUrl,
  generateCountryUrl,
  generatePlatformCountryUrl,
  generateComparisonUrl,
  generateGuideUrl,
  generateBlogUrl,
  generateGlossaryUrl,
} from '../url-generation';
import { SITE_URL } from '../site-config';

describe('url-generation pSEO extensions', () => {
  describe('generatePlatformUrl', () => {
    it('generates correct platform URL', () => {
      expect(generatePlatformUrl('netflix')).toBe(`${SITE_URL}/platforms/netflix`);
    });

    it('handles slugs with hyphens', () => {
      expect(generatePlatformUrl('disney-plus')).toBe(`${SITE_URL}/platforms/disney-plus`);
    });
  });

  describe('generateCountryUrl', () => {
    it('generates correct country URL', () => {
      expect(generateCountryUrl('us')).toBe(`${SITE_URL}/countries/us`);
    });

    it('handles slugs with hyphens', () => {
      expect(generateCountryUrl('united-states')).toBe(`${SITE_URL}/countries/united-states`);
    });
  });

  describe('generatePlatformCountryUrl', () => {
    it('generates correct platform x country URL', () => {
      expect(generatePlatformCountryUrl('netflix', 'us')).toBe(
        `${SITE_URL}/platforms/netflix/countries/us`
      );
    });

    it('handles slugs with hyphens', () => {
      expect(generatePlatformCountryUrl('disney-plus', 'united-kingdom')).toBe(
        `${SITE_URL}/platforms/disney-plus/countries/united-kingdom`
      );
    });
  });

  describe('generateComparisonUrl', () => {
    it('generates correct comparison URL', () => {
      expect(generateComparisonUrl('netflix-vs-hulu')).toBe(
        `${SITE_URL}/compare/netflix-vs-hulu`
      );
    });
  });

  describe('generateGuideUrl', () => {
    it('generates correct guide URL', () => {
      expect(generateGuideUrl('best-streaming-services')).toBe(
        `${SITE_URL}/guides/best-streaming-services`
      );
    });
  });

  describe('generateBlogUrl', () => {
    it('generates correct blog URL', () => {
      expect(generateBlogUrl('streaming-tips')).toBe(
        `${SITE_URL}/blog/streaming-tips`
      );
    });
  });

  describe('generateGlossaryUrl', () => {
    it('generates correct glossary URL', () => {
      expect(generateGlossaryUrl('svod')).toBe(`${SITE_URL}/glossary/svod`);
    });

    it('handles slugs with hyphens', () => {
      expect(generateGlossaryUrl('geo-blocking')).toBe(`${SITE_URL}/glossary/geo-blocking`);
    });
  });
});
