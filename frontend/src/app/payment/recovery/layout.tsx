import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payment Recovery',
  description: 'Update your payment method and continue your GeoLeap subscription.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PaymentRecoveryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
