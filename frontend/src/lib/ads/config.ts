export type AdPlacement = 'top' | 'in-article' | 'sidebar' | 'footer';

export type MonetizablePageType =
  | 'blog'
  | 'guide'
  | 'platform'
  | 'country'
  | 'comparison'
  | 'sports';

export type PageType =
  | MonetizablePageType
  | 'auth'
  | 'payment'
  | 'admin'
  | 'dashboard'
  | 'onboarding'
  | 'api'
  | 'search'
  | 'app';

const MONETIZABLE_PAGE_TYPES: PageType[] = [
  'blog',
  'guide',
  'platform',
  'country',
  'comparison',
  'sports',
];

export function getAdSenseClient(): string | null {
  const client = (
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT ||
    process.env.GOOGLE_ADSENSE_CLIENT
  )?.trim();

  if (!client || !client.startsWith('ca-pub-')) {
    return null;
  }

  return client;
}

export function isAdsEnabled(): boolean {
  return isAdsEnabledForClient(getAdSenseClient());
}

export function isAdsEnabledForClient(client: string | null): boolean {
  return process.env.NEXT_PUBLIC_ADS_ENABLED === 'true' && Boolean(client?.trim().startsWith('ca-pub-'));
}

export function shouldLoadAdSense(): boolean {
  return isAdsEnabled();
}

export function shouldGateAdSenseOnLocalConsent(): boolean {
  return process.env.NEXT_PUBLIC_ADSENSE_CMP_MODE === 'local';
}

export function getAdSlotId(placement: AdPlacement): string | null {
  const slotId = getSlotEnvByPlacement(placement)?.trim();
  return slotId || null;
}

export function isAdsAllowedPageType(pageType: PageType): pageType is MonetizablePageType {
  return MONETIZABLE_PAGE_TYPES.includes(pageType);
}

export function getAdsTxtContent(): string | null {
  const client = getAdSenseClient();
  if (!client) return null;

  return `google.com, ${client.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`;
}

function getSlotEnvByPlacement(placement: AdPlacement): string | undefined {
  const slots: Record<AdPlacement, string | undefined> = {
    top: process.env.NEXT_PUBLIC_ADSENSE_TOP_SLOT,
    'in-article': process.env.NEXT_PUBLIC_ADSENSE_IN_ARTICLE_SLOT,
    sidebar: process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT,
    footer: process.env.NEXT_PUBLIC_ADSENSE_IN_ARTICLE_SLOT,
  };

  return slots[placement];
}
