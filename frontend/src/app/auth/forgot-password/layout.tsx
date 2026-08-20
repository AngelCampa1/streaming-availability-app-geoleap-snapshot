import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/seo/site-config';

export const metadata: Metadata = {
  title: 'Forgot Password - Reset Your Password',
  description: 'Reset your GeoLeap account password. Enter your email to receive a password reset link.',
  alternates: {
    canonical: '/auth/forgot-password',
  },
  openGraph: {
    title: 'Forgot Password | GeoLeap',
    description: 'Reset your GeoLeap account password.',
    url: `${SITE_URL}/auth/forgot-password`,
  },
  twitter: {
    card: 'summary',
    title: 'Forgot Password | GeoLeap',
    description: 'Reset your GeoLeap account password.',
  },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
