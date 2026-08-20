import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Upgrade Your Plan',
  description: 'Upgrade to GeoLeap Premium for unlimited searches, advanced filters, and real-time notifications.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
