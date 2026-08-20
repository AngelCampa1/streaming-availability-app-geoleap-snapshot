import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/seo/site-config';

export const metadata: Metadata = {
  title: 'Watchlist - Track Your Favorites',
  description:
    'Manage your streaming watchlist. Track movies and TV shows across multiple streaming services and get notified when they become available.',
  keywords: [
    'streaming watchlist',
    'watchlist manager',
    'track movies',
    'track tv shows',
    'streaming availability alerts',
    'movie tracker',
  ],
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/watchlist',
  },
  openGraph: {
    title: 'Watchlist | GeoLeap',
    description:
      'Track movies and TV shows across streaming services and get availability alerts.',
    url: `${SITE_URL}/watchlist`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Watchlist | GeoLeap',
    description:
      'Track movies and TV shows across streaming services and get availability alerts.',
  },
};

export default function WatchlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
