import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payment Successful',
  description: 'Your GeoLeap subscription is now active. Start discovering content across 57 countries.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PaymentSuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
