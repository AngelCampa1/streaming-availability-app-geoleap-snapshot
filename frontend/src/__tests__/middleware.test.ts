import { readFileSync } from 'fs';
import { join } from 'path';
import { NextRequest } from 'next/server';

import { config, middleware } from '../middleware';

describe('middleware', () => {
  it('keeps protected dashboard routes behind the login redirect', () => {
    const request = new NextRequest('https://geoleap.app/dashboard/watchlist');

    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://geoleap.app/auth/login?returnUrl=%2Fdashboard%2Fwatchlist',
    );
  });

  it('sends an anonymous request for /settings to the login page', () => {
    const request = new NextRequest('https://geoleap.app/settings/profile');

    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://geoleap.app/auth/login?returnUrl=%2Fsettings%2Fprofile',
    );
  });

  // /support and /upgrade are gated too, but they do not agree on the query
  // parameter: support sends `redirect`, everything else sends `returnUrl`.
  // Pinning both means a later cleanup has to change the test on purpose.
  it('sends an anonymous request for /support to the login page', () => {
    const request = new NextRequest('https://geoleap.app/support');

    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://geoleap.app/auth/login?redirect=/support',
    );
  });

  it('sends an anonymous request for /upgrade to the login page', () => {
    const request = new NextRequest('https://geoleap.app/upgrade');

    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://geoleap.app/auth/login?returnUrl=/upgrade',
    );
  });

  it.each([
    '/dashboard/watchlist',
    '/settings/profile',
    '/support',
    '/upgrade',
  ])('lets a request through to %s when the session cookie is present', (pathname) => {
    // AuthController writes `access_token`. Reading any other name here would
    // redirect signed-in users back to the login page on every protected route.
    const request = new NextRequest(`https://geoleap.app${pathname}`);
    request.cookies.set('access_token', 'a-signed-jwt');

    const response = middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('only runs middleware for protected app routes', () => {
    expect(config.matcher).toEqual(['/dashboard/:path*', '/settings/:path*', '/support/:path*', '/upgrade/:path*']);
  });

  it('configures Cloudflare assets to invoke the Worker for protected app routes', () => {
    const wranglerConfig = readFileSync(join(__dirname, '..', '..', 'wrangler.jsonc'), 'utf-8');

    expect(wranglerConfig).toContain(
      '"run_worker_first": ["/dashboard", "/dashboard/*", "/settings", "/settings/*", "/support", "/support/*", "/upgrade", "/upgrade/*"]',
    );
  });

  it('does not use the OpenNext-incompatible host redirect pattern', () => {
    const nextConfig = readFileSync(join(__dirname, '..', '..', 'next.config.ts'), 'utf-8');

    expect(nextConfig).not.toContain('https://geoleap.app/:path*');
  });

  it('keeps middleware under src so Next includes it in the build manifest', () => {
    expect(() => readFileSync(join(__dirname, '..', 'middleware.ts'), 'utf-8')).not.toThrow();
  });
});
