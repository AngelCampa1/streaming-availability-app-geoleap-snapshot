import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Started - Welcome to GeoLeap',
  description: 'Complete your GeoLeap setup and start discovering content across streaming services worldwide.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
