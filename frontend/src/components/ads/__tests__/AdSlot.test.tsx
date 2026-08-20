import { render, screen, waitFor } from '@testing-library/react';
import { AdSlot } from '../AdSlot';

const originalEnv = process.env;
let marketingConsent = true;

type TestAdsWindow = Window & {
  adsbygoogle?: unknown[] | { push: () => never };
};

jest.mock('@/lib/analytics/consent-manager', () => ({
  ConsentManager: {
    getInstance: () => ({
      hasMarketingConsent: () => marketingConsent,
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    }),
  },
}));

describe('AdSlot', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_ADS_ENABLED;
    delete process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;
    delete process.env.NEXT_PUBLIC_ADSENSE_TOP_SLOT;
    marketingConsent = true;
    (window as TestAdsWindow).adsbygoogle = [];
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('renders nothing when ads are disabled', () => {
    const { container } = render(<AdSlot placement="top" pageType="blog" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('reserves stable space when ads are enabled', () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = 'true';
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT = 'ca-pub-1234567890';
    process.env.NEXT_PUBLIC_ADSENSE_TOP_SLOT = '1112223334';

    render(<AdSlot placement="top" pageType="blog" minHeight={280} />);

    const slot = screen.getByTestId('ad-slot-top');
    expect(slot).toHaveStyle({ minHeight: '280px' });
    expect(slot.querySelector('ins.adsbygoogle')).toBeInTheDocument();
  });

  it('renders the ad slot with Google AdSense Privacy & messaging even before local marketing consent', () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = 'true';
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT = 'ca-pub-1234567890';
    process.env.NEXT_PUBLIC_ADSENSE_TOP_SLOT = '1112223334';
    marketingConsent = false;

    render(<AdSlot placement="top" pageType="blog" minHeight={280} />);

    const slot = screen.getByTestId('ad-slot-top');
    expect(slot).toHaveStyle({ minHeight: '280px' });
    expect(slot.querySelector('ins.adsbygoogle')).toBeInTheDocument();
  });

  it('can keep ad markup hidden before local marketing consent in legacy CMP mode', () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = 'true';
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT = 'ca-pub-1234567890';
    process.env.NEXT_PUBLIC_ADSENSE_TOP_SLOT = '1112223334';
    process.env.NEXT_PUBLIC_ADSENSE_CMP_MODE = 'local';
    marketingConsent = false;

    render(<AdSlot placement="top" pageType="blog" minHeight={280} />);

    const slot = screen.getByTestId('ad-slot-top');
    expect(slot).toHaveStyle({ minHeight: '280px' });
    expect(slot.querySelector('ins.adsbygoogle')).not.toBeInTheDocument();
  });

  it('does not render on excluded page types', () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = 'true';
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT = 'ca-pub-1234567890';
    process.env.NEXT_PUBLIC_ADSENSE_TOP_SLOT = '1112223334';

    const { container } = render(<AdSlot placement="top" pageType="dashboard" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('keeps reserved space when an ad slot reports empty', async () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = 'true';
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT = 'ca-pub-1234567890';
    process.env.NEXT_PUBLIC_ADSENSE_TOP_SLOT = '1112223334';
    (window as TestAdsWindow).adsbygoogle = { push: () => { throw new Error('unfilled'); } };

    render(<AdSlot placement="top" pageType="blog" minHeight={280} />);

    await waitFor(() => {
      expect(screen.getByTestId('ad-slot-top')).toHaveStyle({ minHeight: '280px' });
    });
    expect(screen.queryByText(/advertisement hidden/i)).not.toBeInTheDocument();
  });

  it('renders with a server-provided client when the public client env is absent', () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = 'true';
    process.env.NEXT_PUBLIC_ADSENSE_TOP_SLOT = '1112223334';
    delete process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;

    render(
      <AdSlot
        placement="top"
        pageType="blog"
        minHeight={280}
        adSenseClient="ca-pub-0000000000000000"
      />,
    );

    expect(screen.getByTestId('ad-slot-top').querySelector('ins.adsbygoogle')).toHaveAttribute(
      'data-ad-client',
      'ca-pub-0000000000000000',
    );
  });
});
