import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/seo/site-config';

export const metadata: Metadata = {
  title: 'Sign In - Access Your Account',
  description:
    'Sign in to your GeoLeap account to access your watchlist, personalized recommendations, and global streaming search.',
  keywords: ['geoleap login', 'sign in', 'streaming account', 'watchlist access'],
  alternates: {
    canonical: '/auth/login',
  },
  openGraph: {
    title: 'Sign In | GeoLeap',
    description: 'Sign in to access your personalized streaming dashboard and watchlist.',
    url: `${SITE_URL}/auth/login`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign In | GeoLeap',
    description: 'Sign in to access your personalized streaming dashboard and watchlist.',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
