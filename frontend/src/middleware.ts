import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Must match the cookie name AuthController writes on login, refresh and social
// sign-in. Reading a different name here silently signs everybody out.
const SESSION_COOKIE = 'access_token';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (token) {
    return NextResponse.next();
  }

  if (pathname === '/support' || pathname.startsWith('/support/')) {
    return NextResponse.redirect(new URL('/auth/login?redirect=/support', request.url));
  }

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/settings')) {
    const returnUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/auth/login?returnUrl=${returnUrl}`, request.url));
  }

  if (pathname === '/upgrade' || pathname.startsWith('/upgrade')) {
    return NextResponse.redirect(new URL('/auth/login?returnUrl=/upgrade', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/support/:path*', '/upgrade/:path*'],
};
