/**
 * Feed generation utilities for Atom XML and JSON Feed formats.
 * Aggregates content from blog posts and guides into feed items
 * for AI crawlers and Google Discover.
 */
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from './site-config';
import { blogPosts } from '@/data/blog-posts';
import { streamingGuides } from '@/data/guides';

export interface FeedItem {
  id: string;
  title: string;
  url: string;
  contentText: string;
  datePublished: string;
  dateModified: string;
  tags: string[];
  author: string;
}

interface JsonFeedAuthor {
  name: string;
}

interface JsonFeedItem {
  id: string;
  title: string;
  url: string;
  content_text: string;
  date_published: string;
  date_modified: string;
  tags: string[];
  authors: JsonFeedAuthor[];
}

interface JsonFeed {
  version: string;
  title: string;
  home_page_url: string;
  feed_url: string;
  description: string;
  language: string;
  items: JsonFeedItem[];
}

const DEFAULT_AUTHOR = 'GeoLeap Team';
const DEFAULT_LIMIT = 50;

/**
 * Aggregates content from blog posts and guides, sorts by date descending,
 * and returns the latest N items.
 */
export function getFeedItems(limit: number = DEFAULT_LIMIT): FeedItem[] {
  const items: FeedItem[] = [];

  // Add blog posts (exclude noindexed posts)
  for (const post of blogPosts.filter(p => !p.noIndex)) {
    items.push({
      id: `blog-${post.slug}`,
      title: post.title,
      url: `${SITE_URL}/blog/${post.slug}`,
      contentText: post.description,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      tags: post.tags,
      author: DEFAULT_AUTHOR,
    });
  }

  // Add streaming guides
  for (const guide of streamingGuides) {
    items.push({
      id: `guide-${guide.slug}`,
      title: guide.title,
      url: `${SITE_URL}/guides/${guide.slug}`,
      contentText: guide.description,
      datePublished: guide.publishedAt,
      dateModified: guide.updatedAt,
      tags: guide.relatedPlatforms,
      author: DEFAULT_AUTHOR,
    });
  }

  // Sort by datePublished descending
  items.sort((a, b) => {
    const dateA = new Date(a.datePublished).getTime();
    const dateB = new Date(b.datePublished).getTime();
    return dateB - dateA;
  });

  return items.slice(0, limit);
}

/**
 * Escapes special XML characters in a string.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converts a date string (YYYY-MM-DD) to ISO 8601 format.
 */
function toIsoDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

/**
 * Generates a valid Atom XML feed string from feed items.
 */
export function generateAtomFeed(items: FeedItem[]): string {
  const updatedDate = items.length > 0 ? toIsoDate(items[0].dateModified) : new Date().toISOString();

  const entries = items
    .map(
      item => `  <entry>
    <title>${escapeXml(item.title)}</title>
    <id>tag:geoleap.app,2026:${escapeXml(item.id)}</id>
    <link href="${escapeXml(item.url)}" rel="alternate" type="text/html"/>
    <updated>${toIsoDate(item.dateModified)}</updated>
    <published>${toIsoDate(item.datePublished)}</published>
    <author>
      <name>${escapeXml(item.author)}</name>
    </author>
    <content type="text">${escapeXml(item.contentText)}</content>
    ${item.tags.map(tag => `<category term="${escapeXml(tag)}"/>`).join('\n    ')}
  </entry>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(SITE_NAME)}</title>
  <link href="${escapeXml(SITE_URL)}" rel="alternate" type="text/html"/>
  <link rel="self" href="${escapeXml(SITE_URL)}/feed.xml" type="application/atom+xml"/>
  <id>${escapeXml(SITE_URL)}/</id>
  <updated>${updatedDate}</updated>
  <subtitle>${escapeXml(SITE_DESCRIPTION)}</subtitle>
${entries}
</feed>`;
}

/**
 * Generates a JSON Feed (v1.1) object from feed items.
 */
export function generateJsonFeed(items: FeedItem[]): JsonFeed {
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: SITE_NAME,
    home_page_url: SITE_URL,
    feed_url: `${SITE_URL}/feed.json`,
    description: SITE_DESCRIPTION,
    language: 'en',
    items: items.map(item => ({
      id: item.url,
      title: item.title,
      url: item.url,
      content_text: item.contentText,
      date_published: toIsoDate(item.datePublished),
      date_modified: toIsoDate(item.dateModified),
      tags: item.tags,
      authors: [{ name: item.author }],
    })),
  };
}
