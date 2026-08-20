'use client';

import { useState, useEffect, useCallback } from 'react';
import { AffiliatePartner, AffiliateClickPayload, AffiliateRecommendationResponse } from '@/lib/types/affiliate';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020';

interface UseAffiliateRecommendationOptions {
  countryCode?: string;
  streamingService?: string;
  contentId?: string;
  enabled?: boolean;
}

interface UseAffiliateRecommendationResult {
  partners: AffiliatePartner[];
  loading: boolean;
  error: string | null;
  trackClick: (partnerId: string, additionalData?: Partial<AffiliateClickPayload>) => Promise<string | null>;
}

async function fetchRecommendations(
  countryCode?: string,
  streamingService?: string,
  contentId?: string
): Promise<AffiliateRecommendationResponse> {
  const params = new URLSearchParams();
  if (countryCode) params.set('countryCode', countryCode);
  if (streamingService) params.set('streamingService', streamingService);
  if (contentId) params.set('contentId', contentId);

  const res = await fetch(`${API_BASE}/api/affiliate/recommend?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch affiliate recommendations');
  return res.json();
}

async function postClick(payload: AffiliateClickPayload): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/affiliate/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url ?? null;
  } catch {
    return null;
  }
}

export function useAffiliateRecommendation({
  countryCode,
  streamingService,
  contentId,
  enabled = true,
}: UseAffiliateRecommendationOptions = {}): UseAffiliateRecommendationResult {
  const [partners, setPartners] = useState<AffiliatePartner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);

    fetchRecommendations(countryCode, streamingService, contentId)
      .then(data => {
        if (!cancelled) {
          setPartners(data.partners);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load recommendations');
          setPartners([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [countryCode, streamingService, contentId, enabled]);

  const trackClick = useCallback(async (
    partnerId: string,
    additionalData?: Partial<AffiliateClickPayload>
  ): Promise<string | null> => {
    const payload: AffiliateClickPayload = {
      partnerId,
      countryCode,
      streamingService,
      contentId,
      platform: 'web',
      ...additionalData,
    };
    return postClick(payload);
  }, [countryCode, streamingService, contentId]);

  return { partners, loading, error, trackClick };
}

export default useAffiliateRecommendation;
