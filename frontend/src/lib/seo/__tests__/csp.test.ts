import { readFileSync } from 'fs';
import { join } from 'path';

describe('Content Security Policy', () => {
  let nextConfigContent: string;

  beforeAll(() => {
    nextConfigContent = readFileSync(
      join(__dirname, '..', '..', '..', '..', 'next.config.ts'),
      'utf-8'
    );
  });

  it('includes Cloudflare Insights in script-src', () => {
    expect(nextConfigContent).toContain('https://static.cloudflareinsights.com');
  });

  it('includes Cloudflare Insights beacon in connect-src', () => {
    expect(nextConfigContent).toContain('https://cloudflareinsights.com');
  });

  it('includes Stripe in script-src', () => {
    expect(nextConfigContent).toContain('https://js.stripe.com');
  });

  it('includes Google in script-src', () => {
    expect(nextConfigContent).toContain("https://*.google.com");
  });

  it('defines a script-src directive', () => {
    expect(nextConfigContent).toContain('script-src');
  });

  it('blocks object-src', () => {
    expect(nextConfigContent).toContain("object-src 'none'");
  });

  it('prevents embedding via frame-ancestors', () => {
    expect(nextConfigContent).toContain("frame-ancestors 'none'");
  });
});
