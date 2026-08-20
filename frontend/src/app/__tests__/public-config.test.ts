import { GET } from '../api/public-config/route';

const originalEnv = process.env;

describe('public config route', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns the public Turnstile site key without caching', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key';

    const response = await GET();
    const body = await response.json();

    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toEqual({ turnstileSiteKey: 'site-key' });
  });

  it('returns an empty key when Turnstile is not configured', async () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ turnstileSiteKey: '' });
  });
});
