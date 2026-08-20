import type { ConsentState } from '@/types/analytics';

type ConsentValue = 'granted' | 'denied';

type GoogleConsentPayload = {
  analytics_storage: ConsentValue;
  ad_storage: ConsentValue;
  ad_user_data: ConsentValue;
  ad_personalization: ConsentValue;
};

type GoogleConsentWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

export function applyGoogleConsentMode(consent: Pick<ConsentState, 'analytics' | 'marketing'>) {
  if (typeof window === 'undefined') return;

  const payload: GoogleConsentPayload = {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.marketing ? 'granted' : 'denied',
    ad_user_data: consent.marketing ? 'granted' : 'denied',
    ad_personalization: consent.marketing ? 'granted' : 'denied',
  };

  const googleWindow = window as GoogleConsentWindow;

  if (typeof googleWindow.gtag === 'function') {
    googleWindow.gtag('consent', 'update', payload);
    return;
  }

  googleWindow.dataLayer = googleWindow.dataLayer || [];
  googleWindow.dataLayer.push(['consent', 'update', payload]);
}

