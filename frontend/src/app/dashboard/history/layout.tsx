import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Watch History',
  description: 'View your streaming watch history and recently viewed content.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
