/**
 * Streaming service types and interfaces
 */

export interface StreamingService {
  id: string;
  name: string;
  displayName: string;
  logoUrl: string;
  color: string;
  description: string;
  regions: string[];
  vpnRequired: boolean;
}

export interface StreamingAvailability {
  serviceId: string;
  serviceName: string;
  region: string;
  availableNow: boolean;
  vpnLocationRequired?: string;
  streamingUrl?: string;
  quality?: 'SD' | 'HD' | '4K';
  subscriptionRequired: boolean;
}

export interface ContentAvailability {
  contentId: string;
  contentTitle: string;
  availableOn: StreamingAvailability[];
  notAvailableOn: string[];
}

export interface UserStreamingPreferences {
  userId: string;
  selectedServices: string[];
  preferredRegion: string;
  notifications: {
    availabilityAlerts: boolean;
    newContentAlerts: boolean;
    priceChanges: boolean;
  };
}

export const STREAMING_SERVICES: StreamingService[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    displayName: 'Netflix',
    logoUrl: 'https://images.justwatch.com/icon/190848813/s100/netflix.png',
    color: '#E50914',
    description: 'Stream movies and TV shows',
    regions: ['US', 'UK', 'CA', 'DE', 'FR', 'IT', 'ES', 'JP', 'AU', 'BR'],
    vpnRequired: false,
  },
  {
    id: 'hulu',
    name: 'Hulu',
    displayName: 'Hulu',
    logoUrl: 'https://images.justwatch.com/icon/2074187/s100/hulu.png',
    color: '#1CE783',
    description: 'Watch current TV shows and movies',
    regions: ['US', 'JP'],
    vpnRequired: true,
  },
  {
    id: 'disney',
    name: 'Disney Plus',
    displayName: 'Disney+',
    logoUrl: 'https://images.justwatch.com/icon/147638351/s100/disney-plus.png',
    color: '#113CCF',
    description: 'Stream Disney, Pixar, Marvel, Star Wars',
    regions: ['US', 'UK', 'CA', 'AU', 'NZ', 'DE', 'FR', 'ES', 'IT'],
    vpnRequired: false,
  },
  {
    id: 'prime',
    name: 'Amazon Prime Video',
    displayName: 'Prime Video',
    logoUrl: 'https://images.justwatch.com/icon/52449539/s100/amazon-prime-video.png',
    color: '#00A8E1',
    description: 'Stream movies and TV with Prime',
    regions: ['US', 'UK', 'CA', 'DE', 'FR', 'IT', 'ES', 'JP', 'AU', 'IN'],
    vpnRequired: false,
  },
  {
    id: 'hbomax',
    name: 'HBO Max',
    displayName: 'Max',
    logoUrl: 'https://images.justwatch.com/icon/305308846/s100/max.png',
    color: '#002BFF',
    description: 'Stream HBO, Warner Bros, and more',
    regions: ['US', 'LATAM', 'EU'],
    vpnRequired: true,
  },
  {
    id: 'apple',
    name: 'Apple TV Plus',
    displayName: 'Apple TV+',
    logoUrl: 'https://images.justwatch.com/icon/152862153/s100/apple-tv-plus.png',
    color: '#000000',
    description: 'Apple Original shows and movies',
    regions: ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'JP'],
    vpnRequired: false,
  },
  {
    id: 'paramount',
    name: 'Paramount Plus',
    displayName: 'Paramount+',
    logoUrl: 'https://images.justwatch.com/icon/242571167/s100/paramount-plus.png',
    color: '#0064FF',
    description: 'Stream Paramount, CBS, MTV shows',
    regions: ['US', 'UK', 'CA', 'AU', 'LATAM'],
    vpnRequired: true,
  },
  {
    id: 'peacock',
    name: 'Peacock',
    displayName: 'Peacock',
    logoUrl: 'https://images.justwatch.com/icon/190862536/s100/peacock.png',
    color: '#000000',
    description: 'Stream NBC shows and movies',
    regions: ['US'],
    vpnRequired: true,
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    displayName: 'Crunchyroll',
    logoUrl: 'https://images.justwatch.com/icon/304770539/s100/crunchyroll.png',
    color: '#F47521',
    description: 'Stream anime',
    regions: ['US', 'UK', 'CA', 'AU', 'EU', 'LATAM'],
    vpnRequired: false,
  },
  {
    id: 'espn',
    name: 'ESPN Plus',
    displayName: 'ESPN+',
    logoUrl: 'https://images.justwatch.com/icon/152862209/s100/espn-plus.png',
    color: '#ED0F1F',
    description: 'Live sports and originals',
    regions: ['US'],
    vpnRequired: true,
  },
];

export const getServiceById = (serviceId: string): StreamingService | undefined => {
  return STREAMING_SERVICES.find(s => s.id === serviceId);
};

export const getServicesByIds = (serviceIds: string[]): StreamingService[] => {
  return STREAMING_SERVICES.filter(s => serviceIds.includes(s.id));
};

// Aliases for backward compatibility with smoke tests
export const getStreamingServiceById = getServiceById;
export const getStreamingServicesByIds = getServicesByIds;
