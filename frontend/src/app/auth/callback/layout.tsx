import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authenticating...',
  description: 'Processing your authentication request.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CallbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
