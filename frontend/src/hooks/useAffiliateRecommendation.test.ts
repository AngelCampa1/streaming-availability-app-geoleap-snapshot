import { renderHook, waitFor, act } from '@testing-library/react';
import { useAffiliateRecommendation } from './useAffiliateRecommendation';
import { AffiliatePartner } from '@/lib/types/affiliate';

const mockPartner: AffiliatePartner = {
  id: 'partner-1',
  name: 'ExpressVPN',
  affiliateUrlTemplate: 'https://expressvpn.com/?ref=geo',
  priority: 1,
  isActive: true,
  commissionType: 'flat',
  createdAt: '2025-01-01T00:00:00Z',
};

describe('useAffiliateRecommendation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns partners when API responds successfully', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ partners: [mockPartner] }),
    } as Response);

    const { result } = renderHook(() =>
      useAffiliateRecommendation({ countryCode: 'US', enabled: true })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.partners).toHaveLength(1);
    expect(result.current.partners[0].name).toBe('ExpressVPN');
    expect(result.current.error).toBeNull();
  });

  it('returns empty array on API error', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const { result } = renderHook(() =>
      useAffiliateRecommendation({ countryCode: 'US', enabled: true })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.partners).toHaveLength(0);
    expect(result.current.error).toBeTruthy();
  });

  it('trackClick calls POST /api/affiliate/click with correct payload', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ partners: [mockPartner] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://tracked.url' }),
      } as Response);

    const { result } = renderHook(() =>
      useAffiliateRecommendation({ countryCode: 'US', streamingService: 'netflix', contentId: 'c1' })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    let url: string | null = null;
    await act(async () => {
      url = await result.current.trackClick('partner-1');
    });

    expect(url).toBe('https://tracked.url');

    const calls = (global.fetch as jest.Mock).mock.calls;
    const postCall = calls.find(([, opts]: [string, RequestInit]) => opts?.method === 'POST');
    expect(postCall).toBeTruthy();

    const body = JSON.parse(postCall[1].body as string);
    expect(body.partnerId).toBe('partner-1');
    expect(body.countryCode).toBe('US');
    expect(body.streamingService).toBe('netflix');
    expect(body.contentId).toBe('c1');
    expect(body.platform).toBe('web');
  });

  it('skips fetch when enabled=false', async () => {
    global.fetch = jest.fn();

    const { result } = renderHook(() =>
      useAffiliateRecommendation({ enabled: false })
    );

    // Small wait to confirm no fetch is made
    await new Promise(res => setTimeout(res, 50));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.partners).toHaveLength(0);
    expect(result.current.loading).toBe(false);
  });
});
