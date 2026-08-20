import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/seo/site-config';

export const metadata: Metadata = {
  title: 'Dashboard - Your Streaming Hub',
  description:
    'Your personalized streaming dashboard. Track watchlist, manage subscriptions, get recommendations, and discover trending content across 57 countries.',
  keywords: [
    'streaming dashboard',
    'watchlist manager',
    'streaming recommendations',
    'personalized content',
    'subscription tracker',
  ],
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/dashboard',
  },
  openGraph: {
    title: 'Dashboard | GeoLeap',
    description: 'Your personalized streaming dashboard with watchlist, recommendations, and trending content.',
    url: `${SITE_URL}/dashboard`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dashboard | GeoLeap',
    description: 'Your personalized streaming dashboard with watchlist, recommendations, and trending content.',
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
