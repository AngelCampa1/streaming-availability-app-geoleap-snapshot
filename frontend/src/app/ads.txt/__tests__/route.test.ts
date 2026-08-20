import { GET } from '../route';

const originalEnv = process.env;

describe('ads.txt route', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;
    delete process.env.GOOGLE_ADSENSE_CLIENT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns text/plain with a configured AdSense publisher id', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT = 'ca-pub-1234567890';

    const response = GET();

    expect(response.headers.get('content-type')).toContain('text/plain');
    await expect(response.text()).resolves.toBe('google.com, pub-1234567890, DIRECT, f08c47fec0942fa0\n');
  });

  it('returns a clear 404 until the publisher id is known', async () => {
    const response = GET();

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('text/plain');
    await expect(response.text()).resolves.toContain('AdSense publisher ID not configured');
  });

  it('uses the server-side publisher client fallback', async () => {
    process.env.GOOGLE_ADSENSE_CLIENT = 'ca-pub-0000000000000000';

    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(
      'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n',
    );
  });
});
