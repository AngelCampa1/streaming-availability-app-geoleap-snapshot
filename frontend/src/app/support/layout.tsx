import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_URL } from '@/lib/seo/site-config';

export const metadata: Metadata = {
  title: 'Support | GeoLeap',
  description:
    'Get help with GeoLeap search, account access, watchlists, billing, and streaming availability questions.',
  alternates: {
    canonical: '/support',
  },
  openGraph: {
    title: 'Support | GeoLeap',
    description:
      'Get help with GeoLeap search, account access, watchlists, billing, and streaming availability questions.',
    url: `${SITE_URL}/support`,
  },
};

export default function SupportLayout({ children }: { children: ReactNode }) {
  return children;
}
