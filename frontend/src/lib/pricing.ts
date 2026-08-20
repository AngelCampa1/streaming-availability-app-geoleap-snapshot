import pricingData from '@/config/pricing.json';

export const pricing = pricingData;

export const freePlan = pricing.plans.free;
export const premiumPlan = pricing.plans.premium;

export function formatUsd(amount: number): string {
  return `$${Math.ceil(amount).toLocaleString('en-US')}`;
}

export function formatPlanPrice(plan: typeof freePlan | typeof premiumPlan): string {
  if (plan.priceUsd === 0) {
    return '$0';
  }

  return `${formatUsd(plan.priceUsd)}/${plan.billingPeriod}`;
}

export function formatPremiumMonthlyEquivalent(): string {
  return `${formatUsd(premiumPlan.monthlyEquivalentUsd)}/month`;
}

export function getPremiumTrialCopy(): string {
  return `${premiumPlan.trialDays}-day free trial`;
}

export function getPremiumTrialDays(): number {
  return premiumPlan.trialDays;
}
