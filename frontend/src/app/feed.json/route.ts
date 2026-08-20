import { getFeedItems, generateJsonFeed } from '@/lib/seo/feed-generator';

export const dynamic = 'force-static';

export function GET() {
  const items = getFeedItems(50);
  const feed = generateJsonFeed(items);
  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
}
