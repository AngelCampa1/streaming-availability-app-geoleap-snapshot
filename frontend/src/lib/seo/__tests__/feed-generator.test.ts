import {
  getFeedItems,
  generateAtomFeed,
  generateJsonFeed,
  type FeedItem,
} from '../feed-generator';
import { SITE_URL, SITE_NAME } from '../site-config';
import { blogPosts } from '@/data/blog-posts';
import { streamingGuides } from '@/data/guides';

describe('feed-generator', () => {
  describe('getFeedItems', () => {
    it('returns items sorted by date descending', () => {
      const items = getFeedItems();
      for (let i = 1; i < items.length; i++) {
        const prevDate = new Date(items[i - 1].datePublished).getTime();
        const currDate = new Date(items[i].datePublished).getTime();
        expect(prevDate).toBeGreaterThanOrEqual(currDate);
      }
    });

    it('returns a maximum of 50 items by default', () => {
      const items = getFeedItems();
      expect(items.length).toBeLessThanOrEqual(50);
    });

    it('respects a custom limit', () => {
      const items = getFeedItems(3);
      expect(items.length).toBeLessThanOrEqual(3);
    });

    it('returns at least one item when content exists', () => {
      const items = getFeedItems();
      expect(items.length).toBeGreaterThan(0);
    });

    it('includes items from blog posts (excluding noindexed)', () => {
      const items = getFeedItems(100);
      const blogUrls = items.filter(item => item.url.includes('/blog/'));
      const indexedPosts = blogPosts.filter(p => !p.noIndex);
      expect(blogUrls.length).toBe(indexedPosts.length);
    });

    it('includes items from guides', () => {
      const items = getFeedItems(100);
      const guideUrls = items.filter(item => item.url.includes('/guides/'));
      expect(guideUrls.length).toBe(streamingGuides.length);
    });

    it('each item has required properties', () => {
      const items = getFeedItems();
      for (const item of items) {
        expect(item.id).toBeDefined();
        expect(item.id).not.toBe('');
        expect(item.title).toBeDefined();
        expect(item.title).not.toBe('');
        expect(item.url).toBeDefined();
        expect(item.url).toMatch(/^https?:\/\//);
        expect(item.contentText).toBeDefined();
        expect(item.contentText).not.toBe('');
        expect(item.datePublished).toBeDefined();
        expect(item.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}/);
        expect(item.dateModified).toBeDefined();
        expect(item.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}/);
        expect(item.tags).toBeDefined();
        expect(Array.isArray(item.tags)).toBe(true);
        expect(item.author).toBeDefined();
        expect(item.author).not.toBe('');
      }
    });

    it('all URLs are absolute (prefixed with SITE_URL)', () => {
      const items = getFeedItems();
      for (const item of items) {
        expect(item.url).toMatch(new RegExp(`^${SITE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      }
    });

    it('returns items with unique IDs', () => {
      const items = getFeedItems(100);
      const ids = items.map(item => item.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('generateAtomFeed', () => {
    let items: FeedItem[];
    let xml: string;

    beforeAll(() => {
      items = getFeedItems(5);
      xml = generateAtomFeed(items);
    });

    it('returns valid XML with Atom namespace', () => {
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(xml).toContain('xmlns="http://www.w3.org/2005/Atom"');
    });

    it('contains feed title matching SITE_NAME', () => {
      expect(xml).toContain(`<title>${SITE_NAME}</title>`);
    });

    it('contains feed link', () => {
      expect(xml).toContain(`<link href="${SITE_URL}"`);
    });

    it('contains self link for the feed', () => {
      expect(xml).toContain(`<link rel="self" href="${SITE_URL}/feed.xml"`);
    });

    it('contains feed id', () => {
      expect(xml).toContain(`<id>${SITE_URL}/</id>`);
    });

    it('contains updated timestamp', () => {
      expect(xml).toMatch(/<updated>\d{4}-\d{2}-\d{2}T/);
    });

    it('contains entry elements for each item', () => {
      const entryCount = (xml.match(/<entry>/g) || []).length;
      expect(entryCount).toBe(items.length);
    });

    it('each entry has title, tag URI id, and link', () => {
      for (const item of items) {
        expect(xml).toContain(`<id>tag:geoleap.app,2026:${item.id}</id>`);
        expect(xml).toContain(`href="${item.url}"`);
      }
    });

    it('does not double-escape ampersands', () => {
      expect(xml).not.toContain('&amp;amp;');
    });

    it('includes author element', () => {
      expect(xml).toContain('<author>');
      expect(xml).toContain('<name>');
    });

    it('includes content element for entries', () => {
      expect(xml).toContain('<content type="text">');
    });

    it('includes published element for entries', () => {
      expect(xml).toContain('<published>');
    });

    it('includes subtitle element', () => {
      expect(xml).toContain('<subtitle>');
    });

    it('generates valid XML for an empty items list', () => {
      const emptyXml = generateAtomFeed([]);
      expect(emptyXml).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(emptyXml).toContain('xmlns="http://www.w3.org/2005/Atom"');
      expect(emptyXml).not.toContain('<entry>');
    });

    it('escapes XML special characters in titles and content', () => {
      const specialItem: FeedItem = {
        id: 'test-special',
        title: 'Rock & Roll <Special> "Edition"',
        url: `${SITE_URL}/blog/test-special`,
        contentText: "It's a <test> with & and \"quotes\"",
        datePublished: '2026-01-15',
        dateModified: '2026-03-01',
        tags: ['test'],
        author: 'GeoLeap Team',
      };
      const specialXml = generateAtomFeed([specialItem]);
      expect(specialXml).toContain('Rock &amp; Roll &lt;Special&gt; &quot;Edition&quot;');
      expect(specialXml).toContain('It&apos;s a &lt;test&gt; with &amp; and &quot;quotes&quot;');
      expect(specialXml).not.toContain('<Special>');
    });
  });

  describe('generateJsonFeed', () => {
    let items: FeedItem[];
    let feed: Record<string, unknown>;

    beforeAll(() => {
      items = getFeedItems(5);
      feed = generateJsonFeed(items) as unknown as Record<string, unknown>;
    });

    it('has correct JSON Feed version', () => {
      expect(feed.version).toBe('https://jsonfeed.org/version/1.1');
    });

    it('has correct title', () => {
      expect(feed.title).toBe(SITE_NAME);
    });

    it('has correct home_page_url', () => {
      expect(feed.home_page_url).toBe(SITE_URL);
    });

    it('has correct feed_url', () => {
      expect(feed.feed_url).toBe(`${SITE_URL}/feed.json`);
    });

    it('has language set to en', () => {
      expect(feed.language).toBe('en');
    });

    it('has items array matching input length', () => {
      const feedItems = feed.items as unknown[];
      expect(feedItems.length).toBe(items.length);
    });

    it('each item has required JSON Feed fields', () => {
      const feedItems = feed.items as Array<Record<string, unknown>>;
      for (const feedItem of feedItems) {
        expect(feedItem.id).toBeDefined();
        expect(feedItem.title).toBeDefined();
        expect(feedItem.url).toBeDefined();
        expect(feedItem.content_text).toBeDefined();
        expect(feedItem.date_published).toBeDefined();
        expect(feedItem.date_modified).toBeDefined();
        expect(feedItem.tags).toBeDefined();
        expect(feedItem.authors).toBeDefined();
        expect(Array.isArray(feedItem.authors)).toBe(true);
      }
    });

    it('item authors have name field', () => {
      const feedItems = feed.items as Array<Record<string, unknown>>;
      for (const feedItem of feedItems) {
        const authors = feedItem.authors as Array<Record<string, unknown>>;
        expect(authors.length).toBeGreaterThan(0);
        expect(authors[0].name).toBeDefined();
      }
    });

    it('item dates are in ISO 8601 format', () => {
      const feedItems = feed.items as Array<Record<string, unknown>>;
      for (const feedItem of feedItems) {
        expect(feedItem.date_published).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(feedItem.date_modified).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });

    it('has description field', () => {
      expect(feed.description).toBeDefined();
      expect(typeof feed.description).toBe('string');
    });

    it('generates valid feed for an empty items list', () => {
      const emptyFeed = generateJsonFeed([]) as unknown as Record<string, unknown>;
      expect(emptyFeed.version).toBe('https://jsonfeed.org/version/1.1');
      expect(emptyFeed.items).toEqual([]);
    });
  });
});
