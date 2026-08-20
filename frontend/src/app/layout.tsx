import type { Metadata } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoggingProvider } from '@/components/LoggingProvider';
import { GlobalErrorInitializer } from '@/components/GlobalErrorInitializer';
import { SessionExpirationWarning } from '@/components/SessionExpirationWarning';
import ServiceWorkerProvider from '@/components/ServiceWorkerProvider';
import { ReactQueryProvider } from '@/lib/react-query';
import { WebVitalsMonitor } from '@/components/performance/WebVitalsMonitor';
import { GoogleOAuthProvider } from '@/components/providers/GoogleOAuthProvider';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ConsentBanner } from '@/components/consent/ConsentBanner';
import { JsonLd } from '@/components/seo/JsonLd';
import { AdSenseScriptLoader } from '@/components/ads/AdSenseScriptLoader';
import { getAdSenseClient, isAdsEnabled, shouldGateAdSenseOnLocalConsent } from '@/lib/ads/config';
import { generateOrganizationSchema, generateWebSiteSchema, generateWebApplicationSchema, generateDataCatalogSchema } from '@/lib/seo/schema-markup';
import { SITE_URL } from '@/lib/seo/site-config';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Find Where to Watch  -  42 Services, 57 Countries | GeoLeap',
    template: '%s | GeoLeap',
  },
  alternates: {
    canonical: '/',
types: {
      'application/atom+xml': '/feed.xml',
      'application/feed+json': '/feed.json',
    },
  },
  description:
    'Search 42 streaming services across 57 countries for free. Find where to watch any movie or TV show on Netflix, Disney+, and more. No signup needed.',
  keywords: [
    'streaming search',
    'global streaming',
    'where to watch',
    'streaming availability',
    'international streaming',
    'content discovery',
    'streaming platforms',
    'movie search',
    'TV show search',
    'streaming subscriptions optimizer',
    'audio language streaming availability',
    'streaming watchlist manager',
    'VPN server location finder streaming',
    'subtitle availability by country',
    'maximize streaming subscription',
    'find shows on my subscriptions',
    'what countries have my shows',
    'Netflix different countries',
    'streaming service comparison',
  ],
  authors: [{ name: 'GeoLeap Team' }],
  creator: 'GeoLeap',
  publisher: 'GeoLeap',
  icons: {
    icon: [
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon/favicon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/favicon/favicon-152x152.png', sizes: '152x152', type: 'image/png' }],
  },
  manifest: '/favicon/site.webmanifest',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GeoLeap',
    startupImage: [
      {
        url: '/icons/apple-splash-2048-2732.jpg',
        media:
          '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/icons/apple-splash-1668-2224.jpg',
        media:
          '(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/icons/apple-splash-1536-2048.jpg',
        media:
          '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/icons/apple-splash-1125-2436.jpg',
        media:
          '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/icons/apple-splash-1242-2208.jpg',
        media:
          '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/icons/apple-splash-750-1334.jpg',
        media:
          '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/icons/apple-splash-640-1136.jpg',
        media:
          '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    title: 'Find Where to Watch Any Show  -  42 Services, 57 Countries | GeoLeap',
    description:
      'Search 42 streaming services across 57 countries for free. Find where to watch any movie or TV show on Netflix, Disney+, and more. No signup needed.',
    siteName: 'GeoLeap',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'GeoLeap  -  Search 42 streaming services across 57 countries' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Find Where to Watch Any Show  -  42 Services, 57 Countries | GeoLeap',
    description:
      'Search 42 streaming services across 57 countries for free. Find where to watch any movie or TV show on Netflix, Disney+, and more. No signup needed.',
    creator: '@GeoLeapApp',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
    ...(process.env.YANDEX_VERIFICATION ? { yandex: process.env.YANDEX_VERIFICATION } : {}),
  },
  category: 'entertainment',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgSchema = generateOrganizationSchema();
  const websiteSchema = generateWebSiteSchema();
  const webAppSchema = generateWebApplicationSchema();
  const dataCatalogSchema = generateDataCatalogSchema();
  const adSenseClient = getAdSenseClient();
  const gateAdSenseOnLocalConsent = shouldGateAdSenseOnLocalConsent();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {isAdsEnabled() && adSenseClient && (
          <>
            <meta name="google-adsense-account" content={adSenseClient} />
            {!gateAdSenseOnLocalConsent && (
              <script
                id="google-adsense"
                async
                crossOrigin="anonymous"
                src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adSenseClient}`}
              />
            )}
          </>
        )}
      </head>

      {/* Google Analytics 4 Scripts */}
      {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              // Initialize with consent mode (default: denied until user consents)
              gtag('consent', 'default', {
                'analytics_storage': 'denied',
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied'
              });

              gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
                page_path: window.location.pathname,
              });
            `}
          </Script>
        </>
      )}

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased mobile-tap-highlight mobile-scroll-smooth safe-area-insets`}
      >
        <JsonLd
          data={[orgSchema, websiteSchema, webAppSchema, dataCatalogSchema]}
          graph
        />
        <ErrorBoundary>
          <LoggingProvider>
            <GlobalErrorInitializer />
            <ServiceWorkerProvider>
              <ReactQueryProvider>
                <GoogleOAuthProvider>
                  <ThemeProvider>
                    <AuthProvider>
                      <WebVitalsMonitor />
                      {gateAdSenseOnLocalConsent && <AdSenseScriptLoader adSenseClient={adSenseClient} />}
                      <OfflineBanner />
                      <SessionExpirationWarning />
                      {children}
                      <ConsentBanner />
                    </AuthProvider>
                  </ThemeProvider>
                </GoogleOAuthProvider>
              </ReactQueryProvider>
            </ServiceWorkerProvider>
          </LoggingProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
