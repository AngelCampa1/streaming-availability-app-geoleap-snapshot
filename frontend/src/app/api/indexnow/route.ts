import { NextRequest, NextResponse } from 'next/server';
import { submitToIndexNow } from '@/lib/seo/indexnow';

const ADMIN_SECRET = process.env.INDEXNOW_ADMIN_SECRET;

export async function POST(request: NextRequest) {
  // Require admin secret to prevent abuse
  const authHeader = request.headers.get('authorization');
  if (!ADMIN_SECRET || authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { urls } = await request.json();

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'urls array is required' }, { status: 400 });
    }

    if (urls.length > 10000) {
      return NextResponse.json({ error: 'Maximum 10000 URLs per request' }, { status: 400 });
    }

    const result = await submitToIndexNow(urls);
    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
