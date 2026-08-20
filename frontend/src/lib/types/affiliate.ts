export interface AffiliatePartner {
  id: string;
  name: string;
  logoUrl?: string;
  affiliateUrlTemplate: string;
  priority: number;
  isActive: boolean;
  commissionRate?: number;
  commissionType: 'percentage' | 'flat' | 'cpa';
  flatCommission?: number;
  targetCountries?: string[];
  targetStreamingServices?: string[];
  vpnProviderId?: string;
  createdAt: string;
  totalClicks?: number;
  totalConversions?: number;
  totalRevenue?: number;
}

export interface AffiliateClickPayload {
  partnerId: string;
  contentId?: string;
  contentTitle?: string;
  countryCode?: string;
  streamingService?: string;
  platform: 'web' | 'ios' | 'android';
  anonymousId?: string;
}

export interface AffiliateRecommendationResponse {
  partners: AffiliatePartner[];
  countryCode?: string;
  streamingService?: string;
  contentId?: string;
}
