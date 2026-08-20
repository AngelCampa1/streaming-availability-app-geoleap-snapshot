import {
  getAdSenseClient,
  getAdsTxtContent,
  getAdSlotId,
  shouldGateAdSenseOnLocalConsent,
  isAdsAllowedPageType,
  isAdsEnabled,
  shouldLoadAdSense,
} from '../config';

const originalEnv = process.env;

describe('ads config', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_ADS_ENABLED;
    delete process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;
    delete process.env.GOOGLE_ADSENSE_CLIENT;
    delete process.env.NEXT_PUBLIC_ADSENSE_CMP_MODE;
    delete process.env.NEXT_PUBLIC_ADSENSE_TOP_SLOT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('keeps ads disabled unless explicitly enabled with a publisher client', () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = 'true';

    expect(isAdsEnabled()).toBe(false);
    expect(shouldLoadAdSense()).toBe(false);
  });

  it('loads AdSense only with the enabled flag and ca-pub client', () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = 'true';
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT = 'ca-pub-1234567890';

    expect(getAdSenseClient()).toBe('ca-pub-1234567890');
    expect(isAdsEnabled()).toBe(true);
    expect(shouldLoadAdSense()).toBe(true);
  });

  it('uses Google AdSense Privacy & messaging as the CMP by default', () => {
    expect(shouldGateAdSenseOnLocalConsent()).toBe(false);
  });

  it('can opt into legacy local consent gating for AdSense', () => {
    process.env.NEXT_PUBLIC_ADSENSE_CMP_MODE = 'local';

    expect(shouldGateAdSenseOnLocalConsent()).toBe(true);
  });

  it('resolves configured slot ids by placement', () => {
    process.env.NEXT_PUBLIC_ADSENSE_TOP_SLOT = '1112223334';

    expect(getAdSlotId('top')).toBe('1112223334');
  });

  it('blocks ads on app workflow and account page types', () => {
    expect(isAdsAllowedPageType('blog')).toBe(true);
    expect(isAdsAllowedPageType('dashboard')).toBe(false);
    expect(isAdsAllowedPageType('payment')).toBe(false);
    expect(isAdsAllowedPageType('search')).toBe(false);
  });

  it('returns ads.txt content only when a publisher client is configured', () => {
    expect(getAdsTxtContent()).toBeNull();

    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT = 'ca-pub-1234567890';

    expect(getAdsTxtContent()).toBe('google.com, pub-1234567890, DIRECT, f08c47fec0942fa0\n');
  });

  it('uses the server-side publisher client fallback when the public client is absent', () => {
    process.env.GOOGLE_ADSENSE_CLIENT = 'ca-pub-0000000000000000';

    expect(getAdSenseClient()).toBe('ca-pub-0000000000000000');
    expect(getAdsTxtContent()).toBe('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n');
  });
});
