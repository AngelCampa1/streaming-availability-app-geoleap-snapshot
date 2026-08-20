import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/seo/site-config';

export const metadata: Metadata = {
  title: 'Create Free Account | 30-Day Trial, 42 Streaming Services',
  description:
    'Create your free GeoLeap account. Search 42 streaming services across 57 countries with a 30-day free trial. Find where your favorite shows are streaming globally.',
  keywords: [
    'geoleap signup',
    'create account',
    'free trial',
    'streaming search account',
    'register geoleap',
  ],
  alternates: {
    canonical: '/auth/register',
  },
  openGraph: {
    title: 'Create Free Account | 30-Day Trial, 42 Streaming Services',
    description:
      'Create your free account and search 42 streaming services across 57 countries with a 30-day free trial.',
    url: `${SITE_URL}/auth/register`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Create Free Account | 30-Day Trial, 42 Streaming Services',
    description:
      'Create your free account and search 42 streaming services across 57 countries with a 30-day free trial.',
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
