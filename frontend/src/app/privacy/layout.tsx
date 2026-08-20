import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Your Data, Your Rights',
  description:
    'Learn how GeoLeap collects, uses, and protects your personal information. Read our comprehensive privacy policy.',
  keywords: ['privacy policy', 'data protection', 'geoleap privacy', 'user data'],
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | GeoLeap',
    description: 'Learn how GeoLeap protects your personal information and data.',
    url: 'https://geoleap.app/privacy',
  },
  twitter: {
    card: 'summary',
    title: 'Privacy Policy | GeoLeap',
    description: 'Learn how GeoLeap protects your personal information and data.',
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
