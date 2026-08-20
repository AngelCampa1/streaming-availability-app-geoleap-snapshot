import { generateStaticParams, generateMetadata } from '../page';
import { blogPosts } from '@/data/blog-posts';

describe('Blog slug page', () => {
  describe('generateStaticParams', () => {
    it('returns all blog post slugs', async () => {
      const params = await generateStaticParams();
      expect(params.length).toBe(blogPosts.length);
    });

    it('returns objects with slug property', async () => {
      const params = await generateStaticParams();
      params.forEach(p => {
        expect(p.slug).toBeTruthy();
      });
    });
  });

  describe('generateMetadata', () => {
    it('uses post title when no seoTitle is set', async () => {
      const postWithoutSeoTitle = blogPosts.find(p => !p.seoTitle);
      if (!postWithoutSeoTitle) return;
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: postWithoutSeoTitle.slug }),
      });
      const title =
        typeof metadata.title === 'string'
          ? metadata.title
          : (metadata.title as { default?: string } | null)?.default ?? '';
      expect(title).toContain(postWithoutSeoTitle.title);
    });

    it('prefers seoTitle over title when seoTitle is set', async () => {
      const postWithSeoTitle = blogPosts.find(p => p.seoTitle);
      if (!postWithSeoTitle) return;
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: postWithSeoTitle.slug }),
      });
      const title =
        typeof metadata.title === 'string'
          ? metadata.title
          : (metadata.title as { default?: string } | null)?.default ?? '';
      expect(title).toContain(postWithSeoTitle.seoTitle!);
      expect(title).not.toContain(postWithSeoTitle.title);
    });

    it('applies blog CTA suffix to description via enhanceDescription', async () => {
      const post = blogPosts[0];
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: post.slug }),
      });
      expect(metadata.description).toContain('Streaming data, tradeoffs, and recommendations.');
    });

    it('sets canonical URL with blog slug', async () => {
      const post = blogPosts[0];
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: post.slug }),
      });
      const alternates = metadata.alternates as { canonical?: string } | undefined;
      expect(alternates?.canonical).toContain(`/blog/${post.slug}`);
    });

    it('sets OG metadata', async () => {
      const post = blogPosts[0];
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: post.slug }),
      });
      expect(metadata.openGraph).toBeTruthy();
    });

    it('returns not-found metadata for unknown slug', async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'non-existent-slug' }),
      });
      const title =
        typeof metadata.title === 'string'
          ? metadata.title
          : (metadata.title as { default?: string } | null)?.default ?? '';
      expect(title).toContain('Not Found');
    });
  });
});
