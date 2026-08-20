import { generateMetadata } from '../page';

describe('Platforms index page', () => {
  describe('generateMetadata', () => {
    it('returns the correct title', async () => {
      const metadata = await generateMetadata();
      const title = metadata.title;
      const titleStr =
        typeof title === 'string'
          ? title
          : (title as { default?: string } | null)?.default || JSON.stringify(title);
      expect(titleStr).toContain('Streaming Platforms');
    });

    it('returns a description', async () => {
      const metadata = await generateMetadata();
      expect(metadata.description).toBeTruthy();
    });

    it('returns canonical URL with /platforms path', async () => {
      const metadata = await generateMetadata();
      const alternates = metadata.alternates as { canonical?: string } | undefined;
      expect(alternates?.canonical).toContain('/platforms');
    });
  });
});
