import { render, screen } from '@testing-library/react';
import { AdSenseScriptLoader } from '../AdSenseScriptLoader';

const originalEnv = process.env;
let marketingConsent = false;
const observers: Array<(consent: { marketing: boolean }) => void> = [];

jest.mock('next/script', () => ({
  __esModule: true,
  default: ({ id, src }: { id: string; src: string }) => <div data-src={src} data-testid={id} />,
}));

jest.mock('@/lib/analytics/consent-manager', () => ({
  ConsentManager: {
    getInstance: () => ({
      hasMarketingConsent: () => marketingConsent,
      subscribe: (observer: (consent: { marketing: boolean }) => void) => observers.push(observer),
      unsubscribe: jest.fn(),
    }),
  },
}));

describe('AdSenseScriptLoader', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_ADS_ENABLED = 'true';
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT = 'ca-pub-1234567890';
    marketingConsent = false;
    observers.length = 0;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('loads AdSense before local marketing consent when using Google Privacy & messaging', () => {
    render(<AdSenseScriptLoader />);

    expect(screen.getByTestId('google-adsense')).toHaveAttribute(
      'data-src',
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890',
    );
  });

  it('can require local marketing consent in legacy CMP mode', () => {
    process.env.NEXT_PUBLIC_ADSENSE_CMP_MODE = 'local';

    render(<AdSenseScriptLoader />);

    expect(screen.queryByTestId('google-adsense')).not.toBeInTheDocument();
  });

  it('loads AdSense after marketing consent is granted', () => {
    marketingConsent = true;

    render(<AdSenseScriptLoader />);

    expect(screen.getByTestId('google-adsense')).toHaveAttribute(
      'data-src',
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890',
    );
  });

  it('loads AdSense in local CMP mode with a server-provided client after consent is granted', () => {
    process.env.NEXT_PUBLIC_ADSENSE_CMP_MODE = 'local';
    delete process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;
    marketingConsent = true;

    render(<AdSenseScriptLoader adSenseClient="ca-pub-0000000000000000" />);

    expect(screen.getByTestId('google-adsense')).toHaveAttribute(
      'data-src',
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0000000000000000',
    );
  });
});
