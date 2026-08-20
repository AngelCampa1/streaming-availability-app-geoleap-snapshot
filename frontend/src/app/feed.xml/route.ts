import { getFeedItems, generateAtomFeed } from '@/lib/seo/feed-generator';

export const dynamic = 'force-static';

export function GET() {
  const items = getFeedItems(50);
  const xml = generateAtomFeed(items);
  return new Response(xml, {
    headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
  });
}
