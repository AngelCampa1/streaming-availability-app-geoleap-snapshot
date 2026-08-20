import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Complete Your Purchase',
  description:
    'Secure checkout for your GeoLeap subscription. Get instant access to global streaming search across 57 countries.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/payment',
  },
};

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
