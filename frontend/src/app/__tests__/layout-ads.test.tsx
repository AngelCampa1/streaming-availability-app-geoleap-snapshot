import { renderToStaticMarkup } from 'react-dom/server';
import RootLayout from '../layout';

const originalEnv = process.env;

jest.mock('next/script', () => ({
  __esModule: true,
  default: ({ id, src }: { id: string; src: string }) => <div data-testid={id} data-src={src} />,
}));

jest.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'geist-sans' }),
  Geist_Mono: () => ({ variable: 'geist-mono' }),
}));

jest.mock('@/contexts/AuthContext', () => ({ AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('@/contexts/ThemeContext', () => ({ ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('@/components/ErrorBoundary', () => ({ ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('@/components/LoggingProvider', () => ({ LoggingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('@/components/GlobalErrorInitializer', () => ({ GlobalErrorInitializer: () => null }));
jest.mock('@/components/SessionExpirationWarning', () => ({ SessionExpirationWarning: () => null }));
jest.mock('@/components/ServiceWorkerProvider', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('@/lib/react-query', () => ({ ReactQueryProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('@/components/performance/WebVitalsMonitor', () => ({ WebVitalsMonitor: () => null }));
jest.mock('@/components/providers/GoogleOAuthProvider', () => ({ GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('@/components/OfflineBanner', () => ({ OfflineBanner: () => null }));
jest.mock('@/components/consent/ConsentBanner', () => ({ ConsentBanner: () => null }));
jest.mock('@/components/seo/JsonLd', () => ({ JsonLd: () => null }));
jest.mock('@/components/ads/AdSenseScriptLoader', () => ({
  AdSenseScriptLoader: ({ adSenseClient }: { adSenseClient?: string | null }) => (
    <div data-testid="adsense-script-loader" data-client={adSenseClient ?? ''} />
  ),
}));
jest.mock('@/lib/seo/schema-markup', () => ({
  generateOrganizationSchema: () => ({}),
  generateWebSiteSchema: () => ({}),
  generateWebApplicationSchema: () => ({}),
  generateDataCatalogSchema: () => ({}),
}));

describe('RootLayout ads behavior', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_ADS_ENABLED;
    delete process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;
    delete process.env.GOOGLE_ADSENSE_CLIENT;
    delete process.env.NEXT_PUBLIC_ADSENSE_CMP_MODE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not render the AdSense script without an enabled publisher client', () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <main>content</main>
      </RootLayout>,
    );

    expect(html).not.toContain('pagead2.googlesyndication.com');
  });

  it('renders the AdSense verification script when ads are enabled', () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = 'true';
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT = 'ca-pub-1234567890';

    const html = renderToStaticMarkup(
      <RootLayout>
        <main>content</main>
      </RootLayout>,
    );

    expect(html).toContain(
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890',
    );
    expect(html).toContain('name="google-adsense-account"');
    expect(html).toContain('content="ca-pub-1234567890"');
  });

  it('uses the consent-gated AdSense loader instead of the head script in local CMP mode', () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = 'true';
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT = 'ca-pub-1234567890';
    process.env.NEXT_PUBLIC_ADSENSE_CMP_MODE = 'local';

    const html = renderToStaticMarkup(
      <RootLayout>
        <main>content</main>
      </RootLayout>,
    );

    expect(html).not.toContain('pagead2.googlesyndication.com');
    expect(html).toContain('data-testid="adsense-script-loader"');
  });

  it('passes the server-side client fallback into the local CMP AdSense loader', () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = 'true';
    process.env.GOOGLE_ADSENSE_CLIENT = 'ca-pub-0000000000000000';
    process.env.NEXT_PUBLIC_ADSENSE_CMP_MODE = 'local';

    const html = renderToStaticMarkup(
      <RootLayout>
        <main>content</main>
      </RootLayout>,
    );

    expect(html).not.toContain('pagead2.googlesyndication.com');
    expect(html).toContain('data-client="ca-pub-0000000000000000"');
  });

  it('renders the AdSense verification script from the server-side client fallback', () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = 'true';
    process.env.GOOGLE_ADSENSE_CLIENT = 'ca-pub-0000000000000000';

    const html = renderToStaticMarkup(
      <RootLayout>
        <main>content</main>
      </RootLayout>,
    );

    expect(html).toContain(
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0000000000000000',
    );
  });
});
