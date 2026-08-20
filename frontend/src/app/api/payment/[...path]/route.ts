import { NextRequest, NextResponse } from 'next/server';

/**
 * Payment API Proxy Route Handler
 *
 * This route handler proxies payment requests to the backend and properly
 * forwards cookies (including httpOnly auth tokens) with the request.
 *
 * Next.js rewrites DO NOT forward cookies properly in all cases,
 * which breaks authenticated API calls. This handler solves that.
 */

const BACKEND_URL = process.env.INTERNAL_API_URL
  || process.env.NEXT_PUBLIC_API_URL
  || 'http://localhost:8020';

async function proxyRequest(request: NextRequest, path: string[]) {
  const targetPath = `/api/payment/${path.join('/')}`;
  const targetUrl = `${BACKEND_URL}${targetPath}`;

  // Build headers to forward (including cookies from the request)
  const headers = new Headers();

  // Forward essential headers
  const forwardHeaders = [
    'content-type',
    'accept',
    'user-agent',
    'x-forwarded-for',
    'x-real-ip',
    'x-auth-mode',
    'authorization',
    'x-csrf-token',
  ];

  forwardHeaders.forEach(header => {
    const value = request.headers.get(header);
    if (value) {
      headers.set(header, value);
    }
  });

  // CRITICAL: Forward the original host for correct cookie domain
  // The backend uses Host header to determine cookie domain
  const originalHost = request.headers.get('host');
  if (originalHost) {
    headers.set('X-Forwarded-Host', originalHost);
  }

  // Forward cookies from the incoming request (critical for auth)
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
    // Don't follow redirects - let the client handle them
    redirect: 'manual',
  });

  // Build the response with proper headers
  const responseHeaders = new Headers();

  // Forward response headers (except Set-Cookie which needs special handling)
  response.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();

    // Skip hop-by-hop headers, encoding headers, and Set-Cookie (handled separately)
    // CRITICAL: Must skip content-encoding and content-length because fetch() auto-decompresses
    // the response body, so forwarding these headers causes ERR_CONTENT_DECODING_FAILED
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

  // CRITICAL: Handle Set-Cookie headers properly
  // The Headers API combines multiple Set-Cookie into one, breaking cookies
  // We need to use getSetCookie() to get each cookie separately
  const setCookieHeaders = response.headers.getSetCookie();
  if (setCookieHeaders && setCookieHeaders.length > 0) {
    setCookieHeaders.forEach(cookie => {
      nextResponse.headers.append('Set-Cookie', cookie);
    });
  }

  return nextResponse;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}
