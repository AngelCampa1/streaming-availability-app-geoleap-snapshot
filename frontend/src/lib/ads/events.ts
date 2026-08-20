import type { AdPlacement, MonetizablePageType } from './config';

type GtagWindow = Window & {
  gtag?: (...args: unknown[]) => void;
};

export function trackAdSlotRendered(
  slotId: string,
  placement: AdPlacement,
  pageType: MonetizablePageType,
) {
  trackGtagEvent('ad_slot_rendered', {
    slot_id: slotId,
    placement,
    page_type: pageType,
  });
}

export function trackAdSlotEmpty(
  slotId: string,
  placement: AdPlacement,
  pageType: MonetizablePageType,
) {
  trackGtagEvent('ad_slot_empty', {
    slot_id: slotId,
    placement,
    page_type: pageType,
  });
}

export function trackMonetizedPageView(pageType: MonetizablePageType, canonicalPath: string) {
  trackGtagEvent('monetized_page_view', {
    page_type: pageType,
    canonical_path: canonicalPath,
  });
}

function trackGtagEvent(eventName: string, params: Record<string, string>) {
  if (typeof window === 'undefined') return;

  const gtag = (window as GtagWindow).gtag;
  if (typeof gtag !== 'function') return;

  gtag('event', eventName, params);
}

