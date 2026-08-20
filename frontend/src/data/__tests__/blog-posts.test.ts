import { blogPosts, getBlogPostBySlug, getBlogPostsByCategory, getBlogPostsByTag } from '../blog-posts';
import { blogContent } from '../blog-content';

describe('blog-posts data', () => {
  it('exports a non-empty array of blog posts', () => {
    expect(blogPosts.length).toBeGreaterThan(0);
  });

  it('every post has required fields', () => {
    for (const post of blogPosts) {
      expect(post.slug).toBeTruthy();
      expect(post.title).toBeTruthy();
      expect(post.description).toBeTruthy();
      expect(post.category).toBeTruthy();
      expect(post.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.readingTime).toBeGreaterThan(0);
    }
  });

  it('all slugs are unique', () => {
    const slugs = blogPosts.map(p => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('getBlogPostBySlug returns the correct post', () => {
    const post = getBlogPostBySlug('why-netflix-has-different-content-in-different-countries');
    expect(post).toBeDefined();
    expect(post!.title).toContain('Netflix');
  });

  it('getBlogPostBySlug returns undefined for unknown slug', () => {
    expect(getBlogPostBySlug('nonexistent-slug')).toBeUndefined();
  });

  it('getBlogPostsByCategory filters correctly', () => {
    const guides = getBlogPostsByCategory('guides');
    expect(guides.length).toBeGreaterThan(0);
    for (const post of guides) {
      expect(post.category).toBe('guides');
    }
  });

  it('getBlogPostsByTag filters correctly', () => {
    const vpnPosts = getBlogPostsByTag('vpn');
    expect(vpnPosts.length).toBeGreaterThan(0);
    for (const post of vpnPosts) {
      expect(post.tags).toContain('vpn');
    }
  });

  it('every blog post slug has a corresponding content entry', () => {
    for (const post of blogPosts) {
      expect(blogContent[post.slug]).toBeDefined();
    }
  });

  it('every content entry has at least one section with non-empty body', () => {
    for (const [slug, content] of Object.entries(blogContent)) {
      expect(content.sections.length).toBeGreaterThan(0);
      for (const section of content.sections) {
        expect(section.body).toBeTruthy();
      }
      // Verify slug exists in blogPosts
      expect(blogPosts.some(p => p.slug === slug)).toBe(true);
    }
  });
});
