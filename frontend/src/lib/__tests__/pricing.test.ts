import pricingData from '@/config/pricing.json';
import { getPremiumTrialDays } from '../pricing';

describe('getPremiumTrialDays', () => {
  it('returns the premium trialDays sourced from pricing config', () => {
    expect(getPremiumTrialDays()).toBe(pricingData.plans.premium.trialDays);
  });
  it('currently resolves to 30 days', () => {
    expect(getPremiumTrialDays()).toBe(30);
  });
});
