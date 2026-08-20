'use client';

import { useEffect, useMemo, useState } from 'react';
import Script from 'next/script';
import { ConsentManager } from '@/lib/analytics/consent-manager';
import { getAdSenseClient, isAdsEnabledForClient, shouldGateAdSenseOnLocalConsent } from '@/lib/ads/config';
import type { ConsentState } from '@/types/analytics';

interface AdSenseScriptLoaderProps {
  adSenseClient?: string | null;
}

export function AdSenseScriptLoader({ adSenseClient: configuredAdSenseClient }: AdSenseScriptLoaderProps = {}) {
  const consentManager = useMemo(() => ConsentManager.getInstance(), []);
  const gateOnLocalConsent = shouldGateAdSenseOnLocalConsent();
  const [hasMarketingConsent, setHasMarketingConsent] = useState(() => {
    if (!gateOnLocalConsent) return true;
    return consentManager.hasMarketingConsent();
  });
  const adSenseClient = configuredAdSenseClient ?? getAdSenseClient();

  useEffect(() => {
    if (!gateOnLocalConsent) {
      setHasMarketingConsent(true);
      return;
    }

    const onConsentChange = (consent: ConsentState) => {
      setHasMarketingConsent(consent.marketing);
    };

    consentManager.subscribe(onConsentChange);
    return () => consentManager.unsubscribe(onConsentChange);
  }, [consentManager, gateOnLocalConsent]);

  if (!isAdsEnabledForClient(adSenseClient) || !hasMarketingConsent) {
    return null;
  }

  return (
    <Script
      id="google-adsense"
      strategy="afterInteractive"
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adSenseClient}`}
    />
  );
}

