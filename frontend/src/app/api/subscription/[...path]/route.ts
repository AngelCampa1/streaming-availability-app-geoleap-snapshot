import { NextRequest, NextResponse } from 'next/server';

/**
 * Subscription API Proxy Route Handler
 *
 * This route handler proxies subscription requests to the backend and properly
 * forwards cookies for authentication.
 *
 * Next.js rewrites DO NOT forward cookies properly for authenticated endpoints.
 * This handler ensures auth cookies are forwarded to the backend.
 */

const BACKEND_URL = process.env.INTERNAL_API_URL
  || process.env.NEXT_PUBLIC_API_URL
  || 'http://localhost:8020';

async function proxyRequest(request: NextRequest, path: string[]) {
  const targetPath = `/api/subscription/${path.join('/')}`;
  const url = new URL(request.url);
  const queryString = url.search;
  const targetUrl = `${BACKEND_URL}${targetPath}${queryString}`;

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
