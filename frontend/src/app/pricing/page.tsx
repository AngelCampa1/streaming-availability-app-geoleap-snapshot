import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { FaqSection } from '@/components/seo/FaqSection';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { buildPricingSections } from '@/lib/seo/related-links';
import { formatPlanPrice, formatPremiumMonthlyEquivalent, formatUsd, freePlan, getPremiumTrialCopy, premiumPlan } from '@/lib/pricing';
import { FreePlanCTA, PremiumPlanCTA } from './PricingCTALinks';

export const metadata: Metadata = {
  title: 'Pricing | Free and Premium Plans',
  description:
    `GeoLeap is free forever. Upgrade to Premium for ${formatPlanPrice(premiumPlan)} with unlimited searches, an ad-free experience, and an unlimited watchlist. ${getPremiumTrialCopy()}.`,
  alternates: {
    canonical: '/pricing',
  },
};

export default function PricingPage() {
  // 2-column comparison: Free vs Premium
  const comparisonFeatures = [
    { feature: 'Content searches', free: freePlan.searches, premium: 'Unlimited' },
    { feature: 'View all results', free: 'Top 5 shown', premium: true },
    { feature: 'Ad-free experience', free: false, premium: true },
    { feature: 'Watchlist', free: 'Up to 10 items', premium: 'Unlimited' },
    { feature: 'Content availability alerts', free: false, premium: true },
    { feature: 'Priority support', free: false, premium: true },
  ];

  return (
    <AppLayout showBreadcrumbs={false}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">Start free. Upgrade when the search limit gets in your way.</h1>
            <p className="mt-4 text-xl text-primary-foreground/80">
              Use GeoLeap for streaming searches at no cost. Premium is for people who search often, keep a watchlist, and want alerts without ads.
            </p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Free Plan */}
            <div className="relative flex flex-col rounded-2xl border border-border shadow-lg bg-card p-8">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-card-foreground">Free</h3>
                <p className="mt-4 flex items-baseline text-card-foreground">
                  <span className="text-5xl font-extrabold tracking-tight">$0</span>
                  <span className="ml-1 text-xl font-semibold text-muted-foreground">/forever</span>
                </p>
                <p className="mt-6 text-muted-foreground">
                  Search 42 streaming services across 57 countries when you only need a few lookups.
                </p>

                <ul role="list" className="mt-6 space-y-4">
                  {[
                    ...freePlan.features,
                  ].map(feature => (
                    <li key={feature} className="flex">
                      <svg
                        className="h-6 w-6 flex-shrink-0 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className="ml-3 text-sm text-card-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <FreePlanCTA />
            </div>

            {/* Premium Plan */}
            <div className="relative flex flex-col rounded-2xl border border-primary shadow-2xl md:scale-105 bg-card p-8 pt-12 sm:pt-8">
              <div className="absolute top-0 -translate-y-1/2 left-1/2 flex w-[min(92%,28rem)] -translate-x-1/2 flex-wrap justify-center gap-2">
                <span className="inline-flex rounded-full bg-primary px-4 py-1 text-sm font-semibold text-primary-foreground">
                  Launch Price
                </span>
                <span className="inline-flex rounded-full bg-warning px-4 py-1 text-sm font-semibold text-warning-foreground">
                  Support an Indie Dev
                </span>
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-semibold text-card-foreground">Premium</h3>
                <p className="mt-4 flex items-baseline text-card-foreground">
                  <span className="text-5xl font-extrabold tracking-tight">{formatUsd(premiumPlan.priceUsd)}</span>
                  <span className="ml-1 text-xl font-semibold text-muted-foreground">/year</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground font-medium">That&apos;s about {formatPremiumMonthlyEquivalent()}</p>
                <p className="mt-1 text-xs text-muted-foreground">Less than a single month of Netflix. For an entire year.</p>
                <p className="mt-2 text-sm text-primary font-medium">{getPremiumTrialCopy()}. Cancel anytime.</p>
                <p className="mt-4 text-muted-foreground">
                  Unlimited searches, no ads, no affiliate placements, and alerts for the shows you are waiting on.
                </p>

                <ul role="list" className="mt-6 space-y-4">
                  {[
                    ...premiumPlan.features,
                  ].map(feature => (
                    <li key={feature} className="flex">
                      <svg
                        className="h-6 w-6 flex-shrink-0 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className="ml-3 text-sm text-card-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <PremiumPlanCTA />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {getPremiumTrialCopy()} plus {premiumPlan.refundDays}-day money-back guarantee.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-background">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">Compare Plans</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                See what&apos;s included in each plan
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 text-foreground font-semibold">Feature</th>
                    <th className="text-center py-4 px-4 text-muted-foreground font-medium">Free</th>
                    <th className="text-center py-4 px-4 text-primary font-semibold">
                      <span className="inline-flex items-center gap-2">
                        Premium
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{formatPlanPrice(premiumPlan)}</span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-4 text-card-foreground">{row.feature}</td>
                      <td className="text-center py-4 px-4">
                        {typeof row.free === 'boolean' ? (
                          row.free ? (
                            <Check className="h-5 w-5 text-success mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">{row.free}</span>
                        )}
                      </td>
                      <td className="text-center py-4 px-4 bg-primary/5">
                        {typeof row.premium === 'boolean' ? (
                          row.premium ? (
                            <Check className="h-5 w-5 text-success mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          <span className="text-sm text-primary font-medium">{row.premium}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Price summary row */}
            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              <div></div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-muted-foreground">$0</p>
                <p className="text-xs text-muted-foreground">Forever free</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary">
                <p className="text-2xl font-bold text-primary">{formatUsd(premiumPlan.priceUsd)}</p>
                <p className="text-xs text-primary">/year launch price</p>
                <p className="text-xs text-muted-foreground mt-1">about {formatPremiumMonthlyEquivalent()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section with JSON-LD schema */}
        <div className="bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <FaqSection
              title="Frequently Asked Questions"
              faqs={[
                {
                  question: 'Is there a free trial?',
                  answer:
                    `Yes. Premium includes a ${getPremiumTrialCopy()}. A credit card is required upfront, and you will not be charged until the trial ends.`,
                },
                {
                  question: 'Do you offer refunds?',
                  answer:
                    `We offer a ${premiumPlan.refundDays}-day money-back guarantee. If you're not satisfied, contact us for a full refund.`,
                },
                {
                  question: 'How does the Free plan make money?',
                  answer:
                    'The Free plan is supported by VPN affiliate recommendations shown when geo-restricted content is detected. We only recommend VPNs when they\'re actually useful to you.',
                },
                {
                  question: 'Can I cancel anytime?',
                  answer:
                    'Absolutely! You can cancel your Premium subscription at any time. Your access continues until the end of your billing period.',
                },
                {
                  question: 'What payment methods do you accept?',
                  answer:
                    'We accept all major credit cards, PayPal, and Apple Pay for your convenience.',
                },
                {
                  question: `Why is Premium ${formatPlanPrice(premiumPlan)}?`,
                  answer:
                    'GeoLeap is built by a solo indie developer. Premium is priced to be fair and sustainable: you get a cleaner experience, and you help keep the project alive.',
                },
              ]}
            />
            <div className="text-center mt-4">
              <Link href="/faq" className="text-sm text-primary hover:underline">
                See all frequently asked questions
              </Link>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-primary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary-foreground">Want unlimited searches before movie night?</h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Start your {premiumPlan.trialDays}-day free trial today. Premium is {formatPlanPrice(premiumPlan)} after trial.
            </p>
            <div className="mt-8">
              <PremiumPlanCTA variant="banner" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RelatedLinks sections={buildPricingSections()} />
      </div>
    </AppLayout>
  );
}
