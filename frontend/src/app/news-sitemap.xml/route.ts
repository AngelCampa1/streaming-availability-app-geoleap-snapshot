import { NextResponse } from 'next/server';
import { blogPosts } from '@/data/blog-posts';
import { SITE_URL } from '@/lib/seo/site-config';

export const dynamic = 'force-static';

const BASE_URL = SITE_URL;

function toIso8601(dateStr: string): string {
  return `${dateStr}T00:00:00+00:00`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function GET() {
  const urlEntries = blogPosts
    .filter((post) => !post.noIndex)
    .map((post) => {
      const pageUrl = escapeXml(`${BASE_URL}/blog/${post.slug}`);
      const pubDate = toIso8601(post.publishedAt);
      const title = escapeXml(post.title);

      return `  <url>
    <loc>${pageUrl}</loc>
    <news:news>
      <news:publication>
        <news:name>GeoLeap</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${title}</news:title>
    </news:news>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urlEntries}
</urlset>`;

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
