import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_URL } from '@/lib/seo/site-config';

export const metadata: Metadata = {
  title: 'Search - Find Where to Watch Movies & TV Shows',
  description:
    'Search millions of movies and TV shows across 57 countries and 42 streaming services. Find where to watch with filters for genre, year, rating, and streaming platform.',
  keywords: [
    'streaming search',
    'where to watch',
    'find movies online',
    'tv show streaming',
    'streaming availability',
    'netflix search',
    'disney plus search',
    'global streaming search',
    'movie finder',
    'what countries have my shows',
  ],
  alternates: {
    canonical: '/search',
  },
  openGraph: {
    title: 'Search Movies & TV Shows | GeoLeap',
    description:
      'Search millions of movies and TV shows across 57 countries and 42 streaming services. Find where to watch instantly.',
    url: `${SITE_URL}/search`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Search Movies & TV Shows | GeoLeap',
    description:
      'Search millions of movies and TV shows across 57 countries and 42 streaming services.',
  },
};

export default function SearchLayout({ children }: { children: ReactNode }) {
  return children;
}
