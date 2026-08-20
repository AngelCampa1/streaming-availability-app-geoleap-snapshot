import { getAdsTxtContent } from '@/lib/ads/config';

export const dynamic = 'force-dynamic';

export function GET() {
  const content = getAdsTxtContent();

  if (!content) {
    return new Response('AdSense publisher ID not configured\n', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  return new Response(content, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}

