import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/seo/site-config';

export const metadata: Metadata = {
  title: 'Trending - Popular Movies & TV Shows',
  description:
    'Discover trending movies and TV shows across streaming platforms. See what is popular globally and find where to watch.',
  keywords: [
    'trending movies',
    'trending tv shows',
    'popular streaming content',
    'whats popular on netflix',
    'trending on streaming',
  ],
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/dashboard/trending',
  },
  openGraph: {
    title: 'Trending Content | GeoLeap',
    description: 'Discover trending movies and TV shows across streaming platforms worldwide.',
    url: `${SITE_URL}/dashboard/trending`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trending Content | GeoLeap',
    description: 'Discover trending movies and TV shows across streaming platforms worldwide.',
  },
};

export default function TrendingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
