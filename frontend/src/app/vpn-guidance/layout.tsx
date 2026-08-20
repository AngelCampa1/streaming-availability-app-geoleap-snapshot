import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_URL } from '@/lib/seo/site-config';

export const metadata: Metadata = {
  title: 'VPN Guidance - Find the Best VPN for Streaming',
  description:
    'Get personalized VPN recommendations for streaming. Compare 50+ VPN providers with real-time compatibility testing for Netflix, Disney+, and 25+ streaming services.',
  keywords: [
    'vpn for streaming',
    'best vpn for netflix',
    'vpn server location finder',
    'streaming vpn comparison',
    'vpn recommendations',
    'unblock streaming services',
    'vpn compatibility',
    'vpn speed test',
    'secure streaming vpn',
  ],
  alternates: {
    canonical: '/vpn-guidance',
  },
  openGraph: {
    title: 'VPN Guidance - Find the Best VPN for Streaming | GeoLeap',
    description:
      'Get personalized VPN recommendations for streaming. Compare 50+ providers with real-time compatibility testing.',
    url: `${SITE_URL}/vpn-guidance`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VPN Guidance | GeoLeap',
    description:
      'Get personalized VPN recommendations for streaming. Compare 50+ providers with real-time compatibility testing.',
  },
};

export default function VpnGuidanceLayout({ children }: { children: ReactNode }) {
  return children;
}
