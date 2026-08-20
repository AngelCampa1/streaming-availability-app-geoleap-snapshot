import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/seo/site-config';

export const metadata: Metadata = {
  title: 'My Subscriptions - Manage Streaming Services',
  description:
    'Manage your streaming service subscriptions. Track costs, optimize subscriptions, and find content across all your services.',
  keywords: [
    'streaming subscriptions',
    'subscription manager',
    'streaming service tracker',
    'optimize subscriptions',
    'subscription costs',
  ],
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/dashboard/subscriptions',
  },
  openGraph: {
    title: 'My Subscriptions | GeoLeap',
    description: 'Manage your streaming service subscriptions and optimize your streaming costs.',
    url: `${SITE_URL}/dashboard/subscriptions`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Subscriptions | GeoLeap',
    description: 'Manage your streaming service subscriptions and optimize your streaming costs.',
  },
};

export default function SubscriptionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
