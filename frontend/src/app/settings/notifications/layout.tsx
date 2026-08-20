import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notification Settings',
  description: 'Manage your GeoLeap notification preferences and alerts.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotificationSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
