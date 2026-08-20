import { NextRequest, NextResponse } from 'next/server';

/**
 * Watchlist API Base Route Handler
 *
 * This handles the base /api/watchlist endpoint (GET to list watchlists, POST to create).
 * The [...path] catch-all route only handles paths WITH segments like /api/watchlist/{id}/items.
 * This handler is needed because Next.js rewrites DON'T forward cookies properly.
 */

const BACKEND_URL = process.env.INTERNAL_API_URL
  || process.env.NEXT_PUBLIC_API_URL
  || 'http://localhost:8020';

async function proxyRequest(request: NextRequest) {
  const url = new URL(request.url);
  const queryString = url.search;
  const targetUrl = `${BACKEND_URL}/api/watchlist${queryString}`;

  // Build headers to forward (including cookies from the request)
  const headers = new Headers();

  // Forward essential headers
  const forwardHeaders = [
    'content-type',
    'accept',
    'user-agent',
    'x-forwarded-for',
    'x-real-ip',
    'authorization',
  ];

  forwardHeaders.forEach(header => {
    const value = request.headers.get(header);
    if (value) {
      headers.set(header, value);
    }
  });

  // Forward the original host for correct cookie domain
  const originalHost = request.headers.get('host');
  if (originalHost) {
    headers.set('X-Forwarded-Host', originalHost);
  }

  // CRITICAL: Forward cookies from the incoming request for authentication
  const cookie = request.headers.get('cookie');
  if (cookie) {
    headers.set('cookie', cookie);
  }

  // Get request body for non-GET methods
  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.text();
    } catch {
      // No body
    }
  }

  // Make the proxied request
  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    redirect: 'manual',
  });

  // Build the response with proper headers
  const responseHeaders = new Headers();

  // Forward response headers
  response.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();

    // Skip hop-by-hop headers and encoding headers
    if ([
      'transfer-encoding',
      'connection',
      'keep-alive',
      'set-cookie',
      'content-encoding',
      'content-length'
    ].includes(lowerKey)) {
      return;
    }

    responseHeaders.set(key, value);
  });

  // Get response body
  const responseBody = await response.text();

  // Create the NextResponse
  const nextResponse = new NextResponse(responseBody, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });

  // Disable caching to ensure fresh data
  nextResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  nextResponse.headers.set('Pragma', 'no-cache');

  // Handle Set-Cookie headers properly
  const setCookieHeaders = response.headers.getSetCookie();
  if (setCookieHeaders && setCookieHeaders.length > 0) {
    setCookieHeaders.forEach(cookie => {
      nextResponse.headers.append('Set-Cookie', cookie);
    });
  }

  return nextResponse;
}

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyRequest(request);
}
