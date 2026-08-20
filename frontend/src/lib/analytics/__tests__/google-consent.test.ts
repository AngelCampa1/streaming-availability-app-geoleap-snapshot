import { applyGoogleConsentMode } from '../google-consent';
import { CONSENT_VERSION, ConsentState } from '@/types/analytics';

describe('applyGoogleConsentMode', () => {
  const consent: ConsentState = {
    analytics: true,
    marketing: true,
    functional: true,
    timestamp: new Date(),
    version: CONSENT_VERSION,
  };

  afterEach(() => {
    (window as Window & { gtag?: Window['gtag']; dataLayer?: unknown[] }).gtag = undefined;
    delete (window as Window & { dataLayer?: unknown[] }).dataLayer;
  });

  it('updates gtag consent with stored analytics and marketing consent', () => {
    window.gtag = jest.fn();

    applyGoogleConsentMode(consent);

    expect(window.gtag).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
  });

  it('queues the consent update if gtag has not loaded yet', () => {
    applyGoogleConsentMode({ ...consent, analytics: false, marketing: false });

    expect((window as Window & { dataLayer?: unknown[] }).dataLayer).toEqual([
      [
        'consent',
        'update',
        {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        },
      ],
    ]);
  });
});
