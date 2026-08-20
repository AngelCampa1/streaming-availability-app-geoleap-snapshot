'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ConsentManager } from '@/lib/analytics/consent-manager';
import {
  AdPlacement,
  PageType,
  getAdSenseClient,
  getAdSlotId,
  isAdsAllowedPageType,
  isAdsEnabledForClient,
  shouldGateAdSenseOnLocalConsent,
} from '@/lib/ads/config';
import { trackAdSlotEmpty, trackAdSlotRendered } from '@/lib/ads/events';
import type { ConsentState } from '@/types/analytics';

type AdsWindow = Window & {
  adsbygoogle?: unknown[];
};

interface AdSlotProps {
  placement: AdPlacement;
  pageType: PageType;
  className?: string;
  minHeight?: number;
  format?: 'auto' | 'fluid' | 'rectangle';
  adSenseClient?: string | null;
}

export function AdSlot({
  placement,
  pageType,
  className = '',
  minHeight = 250,
  format = 'auto',
  adSenseClient: configuredAdSenseClient,
}: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slotId = getAdSlotId(placement);
  const client = configuredAdSenseClient ?? getAdSenseClient();
  const canRenderAds = isAdsEnabledForClient(client) && slotId && client && isAdsAllowedPageType(pageType);
  const gateOnLocalConsent = shouldGateAdSenseOnLocalConsent();
  const consentManager = useMemo(() => ConsentManager.getInstance(), []);
  const [hasAdConsent, setHasAdConsent] = useState(() => {
    if (!canRenderAds) return false;
    if (!gateOnLocalConsent) return true;
    return consentManager.hasMarketingConsent();
  });
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    if (!canRenderAds) return;
    if (!gateOnLocalConsent) {
      setHasAdConsent(true);
      return;
    }

    setHasAdConsent(consentManager.hasMarketingConsent());

    const onConsentChange = (consent: ConsentState) => {
      setHasAdConsent(consent.marketing);
    };

    consentManager.subscribe(onConsentChange);
    return () => consentManager.unsubscribe(onConsentChange);
  }, [canRenderAds, consentManager, gateOnLocalConsent]);

  useEffect(() => {
    if (!canRenderAds || !hasAdConsent || !slotId || !isAdsAllowedPageType(pageType)) return;

    try {
      ((window as AdsWindow).adsbygoogle = (window as AdsWindow).adsbygoogle || []).push({});
      trackAdSlotRendered(slotId, placement, pageType);
    } catch {
      setIsEmpty(true);
      trackAdSlotEmpty(slotId, placement, pageType);
    }

    const emptyTimer = window.setTimeout(() => {
      const adElement = containerRef.current?.querySelector('ins.adsbygoogle');
      if (adElement && adElement.getAttribute('data-ad-status') === 'unfilled') {
        setIsEmpty(true);
        trackAdSlotEmpty(slotId, placement, pageType);
      }
    }, 8000);

    return () => window.clearTimeout(emptyTimer);
  }, [canRenderAds, hasAdConsent, pageType, placement, slotId]);

  if (!canRenderAds || !slotId || !client || !isAdsAllowedPageType(pageType)) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      data-testid={`ad-slot-${placement}`}
      data-placement={placement}
      data-page-type={pageType}
      className={`my-8 w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30 ${className}`}
      style={{ minHeight }}
      aria-label="Advertisement"
    >
      {hasAdConsent && !isEmpty ? (
        <ins
          className="adsbygoogle block h-full w-full"
          style={{ display: 'block', minHeight }}
          data-ad-client={client}
          data-ad-slot={slotId}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      ) : (
        <div className="h-full min-h-[inherit]" aria-hidden="true" />
      )}
    </div>
  );
}
