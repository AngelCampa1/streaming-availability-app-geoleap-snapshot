import type { Metadata } from 'next';
import { formatPlanPrice, getPremiumTrialCopy, premiumPlan } from '@/lib/pricing';
import { SITE_URL } from '@/lib/seo/site-config';

const premiumPrice = formatPlanPrice(premiumPlan);

export const metadata: Metadata = {
  title: `Pricing: Free Forever or ${premiumPrice} Premium`,
  description:
    `Choose the right GeoLeap plan for global streaming search. Free forever with ads, or Premium at ${premiumPrice} with a ${getPremiumTrialCopy()}. Search 42 streaming services across 57 countries.`,
  keywords: [
    'geoleap pricing',
    'streaming search subscription',
    'premium streaming plan',
    'annual streaming subscription',
    'streaming service comparison tool',
    'global streaming access',
    'vpn recommendation service',
  ],
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: `Pricing: Free Forever or ${premiumPrice} Premium`,
    description:
      `Free forever with ads, or Premium at ${premiumPrice} with a ${getPremiumTrialCopy()}. Search 42 streaming services across 57 countries.`,
    url: `${SITE_URL}/pricing`,
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'GeoLeap Pricing - Global Streaming Search Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Pricing: Free Forever or ${premiumPrice} Premium`,
    description:
      `Free forever with ads, or Premium at ${premiumPrice} with a ${getPremiumTrialCopy()}. Search 42 streaming services across 57 countries.`,
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
