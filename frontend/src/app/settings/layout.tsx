import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings - Account Preferences',
  description: 'Manage your GeoLeap account settings, notification preferences, and profile information.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/settings',
  },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
