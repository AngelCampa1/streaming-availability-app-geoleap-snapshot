import { generateStaticParams, generateMetadata } from '../page';
import { platforms } from '@/data/platforms';

describe('Platform slug page', () => {
  describe('generateStaticParams', () => {
    it('returns all platform slugs', async () => {
      const params = await generateStaticParams();
      expect(params.length).toBe(platforms.length);
    });

    it('returns objects with slug property', async () => {
      const params = await generateStaticParams();
      params.forEach(p => {
        expect(p.slug).toBeTruthy();
      });
    });

    it('includes netflix slug', async () => {
      const params = await generateStaticParams();
      const slugs = params.map(p => p.slug);
      expect(slugs).toContain('netflix');
    });
  });

  describe('generateMetadata', () => {
    it('uses platform name in title', async () => {
      const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'netflix' }) });
      const title = metadata.title;
      const titleStr =
        typeof title === 'string'
          ? title
          : (title as { default?: string } | null)?.default || JSON.stringify(title);
      expect(titleStr).toContain('Netflix');
    });

    it('returns description', async () => {
      const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'netflix' }) });
      expect(metadata.description).toBeTruthy();
    });

    it('returns canonical with platform slug', async () => {
      const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'netflix' }) });
      const alternates = metadata.alternates as { canonical?: string } | undefined;
      expect(alternates?.canonical).toContain('netflix');
    });
  });
});
