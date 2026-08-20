import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSrc = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8');

describe('homepage trial copy is sourced from config (no hardcoded duration)', () => {
  it('renders the trial duration via getPremiumTrialDays()', () => {
    expect(pageSrc).toMatch(/\{getPremiumTrialDays\(\)\}-day Premium trial/);
  });
  it('does not hardcode the literal "30-day Premium trial"', () => {
    expect(pageSrc).not.toMatch(/30-day Premium trial/);
  });
  it('imports getPremiumTrialDays from the pricing module', () => {
    expect(pageSrc).toMatch(/getPremiumTrialDays/);
    expect(pageSrc).toMatch(/@\/lib\/pricing/);
  });
});
