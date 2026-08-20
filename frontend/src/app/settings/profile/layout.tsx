import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile Settings',
  description: 'Manage your GeoLeap profile information and preferences.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfileSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
