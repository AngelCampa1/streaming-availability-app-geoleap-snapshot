// TypeScript types for VPN streaming availability feature

export interface UserStreamingSubscription {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  isActive: boolean;
  addedAt: string;
  removedAt?: string;
  subscriptionTier?: string;
  notes?: string;
}

export interface ServiceAvailability {
  serviceId: string;
  serviceName: string;
  type: 'subscription' | 'rental' | 'purchase' | 'free' | 'ads';
  url: string;
  quality: string;
  audioLanguages: string[];
  subtitleLanguages: string[];
  isUserSubscription: boolean;
}

export interface CountryStreamingInfo {
  countryCode: string;
  countryName: string;
  services: ServiceAvailability[];
  hasUserSubscriptions: boolean;
  userServicesCount: number;
}

export interface ShowStreamingDetails {
  id: string;
  title: string;
  availabilityByCountry: Record<string, CountryStreamingInfo>;
  totalCountries: number;
  countriesWithUserSubscriptions: number;
  userServicesWithContent: string[];
}

export interface UserLocationResponse {
  countryCode: string;
  countryName: string;
  autoDetected: boolean;
  detectionMethod?: string;
}

export interface AddSubscriptionRequest {
  serviceId: string;
  serviceName: string;
  subscriptionTier?: string;
  notes?: string;
}

export interface UpdateSubscriptionRequest {
  subscriptionTier?: string;
  notes?: string;
}

// Popular streaming services for quick selection
// Brand colors are used for the service icons
export const POPULAR_SERVICES = [
  { id: 'netflix', name: 'Netflix', icon: 'N', logoPath: '/logos/streaming/netflix.svg', brandColor: '#E50914', textColor: '#FFFFFF' },
  { id: 'hbo', name: 'HBO Max', icon: 'HBO', logoPath: '/logos/streaming/hbo.svg', brandColor: '#5822B4', textColor: '#FFFFFF' },
  { id: 'disney', name: 'Disney+', icon: 'D+', logoPath: '/logos/streaming/disney-plus.svg', brandColor: '#113CCF', textColor: '#FFFFFF' },
  { id: 'amazon', name: 'Amazon Prime Video', icon: 'P', logoPath: '/logos/streaming/amazon-prime.svg', brandColor: '#00A8E1', textColor: '#FFFFFF' },
  { id: 'hulu', name: 'Hulu', icon: 'h', logoPath: '/logos/streaming/hulu.svg', brandColor: '#1CE783', textColor: '#0B0C0F' },
  { id: 'paramount', name: 'Paramount+', icon: 'P+', logoPath: '/logos/streaming/paramount-plus.svg', brandColor: '#0064FF', textColor: '#FFFFFF' },
  { id: 'peacock', name: 'Peacock', icon: 'P', logoPath: '/logos/streaming/peacock.svg', brandColor: '#000000', textColor: '#FFFFFF' },
  { id: 'apple', name: 'Apple TV+', icon: 'tv+', logoPath: '/logos/streaming/apple-tv.svg', brandColor: '#000000', textColor: '#FFFFFF' },
  { id: 'youtube', name: 'YouTube Premium', icon: 'YT', logoPath: '/logos/streaming/youtube-premium.svg', brandColor: '#FF0000', textColor: '#FFFFFF' },
] as const;
