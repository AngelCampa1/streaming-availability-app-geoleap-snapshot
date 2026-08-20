'use client';

import { useEffect } from 'react';
import type { MonetizablePageType } from '@/lib/ads/config';
import { isAdsEnabled } from '@/lib/ads/config';
import { trackMonetizedPageView } from '@/lib/ads/events';

interface MonetizedPageViewProps {
  pageType: MonetizablePageType;
  canonicalPath: string;
}

export function MonetizedPageView({ pageType, canonicalPath }: MonetizedPageViewProps) {
  useEffect(() => {
    if (!isAdsEnabled()) return;

    trackMonetizedPageView(pageType, canonicalPath);
  }, [canonicalPath, pageType]);

  return null;
}

