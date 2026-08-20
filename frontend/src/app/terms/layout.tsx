import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - User Agreement',
  description:
    'Read the GeoLeap Terms of Service. Understand your rights and responsibilities when using our global streaming search platform.',
  keywords: ['terms of service', 'user agreement', 'geoleap terms', 'legal terms'],
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    title: 'Terms of Service | GeoLeap',
    description: 'Read the GeoLeap Terms of Service and user agreement.',
    url: 'https://geoleap.app/terms',
  },
  twitter: {
    card: 'summary',
    title: 'Terms of Service | GeoLeap',
    description: 'Read the GeoLeap Terms of Service and user agreement.',
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
