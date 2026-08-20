/**
 * VPN provider types and interfaces
 */

export interface VpnProvider {
  id: string;
  name: string;
  displayName: string;
  logoUrl: string;
  color: string;
  rating: number; // 1-5 stars
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: VpnFeature[];
  streamingSupport: StreamingServiceSupport[];
  serverLocations: string[];
  serverCount: number;
  speedRating: number; // 1-5
  securityRating: number; // 1-5
  easeOfUseRating: number; // 1-5
  supportedPlatforms: ('iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux')[];
  trialAvailable: boolean;
  trialDays?: number;
  refundDays: number;
  websiteUrl: string;
  deepLinkIos?: string;
  deepLinkAndroid?: string;
  affiliateLink?: string;
}

export interface VpnFeature {
  id: string;
  name: string;
  description: string;
  available: boolean;
  icon?: string;
}

export interface StreamingServiceSupport {
  serviceId: string; // matches streaming.types.ts service IDs
  serviceName: string;
  supported: boolean;
  regions: string[];
  reliability: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
}

export interface VpnRecommendation {
  provider: VpnProvider;
  score: number; // 0-100
  reason: string;
  matchedServices: string[];
  pricePerMonth: number;
}

export interface VpnSetupStep {
  stepNumber: number;
  title: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  estimatedTime?: string;
}

export interface VpnSetupGuide {
  providerId: string;
  providerName: string;
  platform: 'iOS' | 'Android';
  steps: VpnSetupStep[];
  totalEstimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prerequisites?: string[];
}

// VPN Provider Database
export const VPN_PROVIDERS: VpnProvider[] = [
  {
    id: 'nordvpn',
    name: 'NordVPN',
    displayName: 'NordVPN',
    logoUrl: 'https://nordvpn.com/wp-content/uploads/2021/03/NordVPN-logo.png',
    color: '#4687FF',
    rating: 4.8,
    monthlyPrice: 12.99,
    yearlyPrice: 59.88,
    currency: 'USD',
    features: [
      {
        id: 'kill-switch',
        name: 'Kill Switch',
        description: 'Automatically disconnects from internet if VPN drops',
        available: true,
        icon: 'shield-check',
      },
      {
        id: 'no-logs',
        name: 'No-Logs Policy',
        description: 'Independently audited no-logs policy',
        available: true,
        icon: 'eye-off',
      },
      {
        id: 'split-tunneling',
        name: 'Split Tunneling',
        description: 'Choose which apps use VPN',
        available: true,
        icon: 'call-split',
      },
      {
        id: 'double-vpn',
        name: 'Double VPN',
        description: 'Extra encryption through two servers',
        available: true,
        icon: 'lock',
      },
    ],
    streamingSupport: [
      {
        serviceId: 'netflix',
        serviceName: 'Netflix',
        supported: true,
        regions: ['US', 'UK', 'CA', 'AU', 'JP', 'DE', 'FR'],
        reliability: 'excellent',
      },
      {
        serviceId: 'hulu',
        serviceName: 'Hulu',
        supported: true,
        regions: ['US'],
        reliability: 'excellent',
      },
      {
        serviceId: 'disney',
        serviceName: 'Disney+',
        supported: true,
        regions: ['US', 'UK', 'CA', 'AU'],
        reliability: 'excellent',
      },
      {
        serviceId: 'hbomax',
        serviceName: 'Max',
        supported: true,
        regions: ['US'],
        reliability: 'good',
      },
      {
        serviceId: 'prime',
        serviceName: 'Prime Video',
        supported: true,
        regions: ['US', 'UK', 'CA', 'DE'],
        reliability: 'excellent',
      },
    ],
    serverLocations: ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'NL', 'JP', 'SG', 'IN'],
    serverCount: 5500,
    speedRating: 5,
    securityRating: 5,
    easeOfUseRating: 5,
    supportedPlatforms: ['iOS', 'Android', 'Windows', 'macOS', 'Linux'],
    trialAvailable: true,
    trialDays: 7,
    refundDays: 30,
    websiteUrl: 'https://nordvpn.com',
    deepLinkIos: 'nordvpn://',
    deepLinkAndroid: 'nordvpn://app',
  },
  {
    id: 'expressvpn',
    name: 'ExpressVPN',
    displayName: 'ExpressVPN',
    logoUrl: 'https://www.expressvpn.com/press/assets/logos/expressvpn-logo-red.png',
    color: '#DA3939',
    rating: 4.7,
    monthlyPrice: 12.95,
    yearlyPrice: 99.95,
    currency: 'USD',
    features: [
      {
        id: 'network-lock',
        name: 'Network Lock',
        description: 'ExpressVPN kill switch feature',
        available: true,
        icon: 'shield-check',
      },
      {
        id: 'no-logs',
        name: 'No-Logs Policy',
        description: 'TrustedServer technology with RAM-only servers',
        available: true,
        icon: 'eye-off',
      },
      {
        id: 'split-tunneling',
        name: 'Split Tunneling',
        description: 'Route specific apps through VPN',
        available: true,
        icon: 'call-split',
      },
      {
        id: 'threat-manager',
        name: 'Threat Manager',
        description: 'Blocks trackers and malicious sites',
        available: true,
        icon: 'security',
      },
    ],
    streamingSupport: [
      {
        serviceId: 'netflix',
        serviceName: 'Netflix',
        supported: true,
        regions: ['US', 'UK', 'CA', 'AU', 'JP', 'DE', 'FR', 'IT'],
        reliability: 'excellent',
      },
      {
        serviceId: 'hulu',
        serviceName: 'Hulu',
        supported: true,
        regions: ['US'],
        reliability: 'excellent',
      },
      {
        serviceId: 'disney',
        serviceName: 'Disney+',
        supported: true,
        regions: ['US', 'UK', 'CA', 'AU'],
        reliability: 'excellent',
      },
      {
        serviceId: 'hbomax',
        serviceName: 'Max',
        supported: true,
        regions: ['US'],
        reliability: 'excellent',
      },
      {
        serviceId: 'prime',
        serviceName: 'Prime Video',
        supported: true,
        regions: ['US', 'UK', 'CA', 'DE', 'JP'],
        reliability: 'excellent',
      },
    ],
    serverLocations: ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'NL', 'JP', 'SG', 'HK'],
    serverCount: 3000,
    speedRating: 5,
    securityRating: 5,
    easeOfUseRating: 5,
    supportedPlatforms: ['iOS', 'Android', 'Windows', 'macOS', 'Linux'],
    trialAvailable: true,
    trialDays: 7,
    refundDays: 30,
    websiteUrl: 'https://www.expressvpn.com',
    deepLinkIos: 'expressvpn://',
    deepLinkAndroid: 'expressvpn://app',
  },
  {
    id: 'surfshark',
    name: 'Surfshark',
    displayName: 'Surfshark',
    logoUrl: 'https://surfshark.com/wp-content/themes/surfshark/assets/img/logo.svg',
    color: '#00B8D4',
    rating: 4.5,
    monthlyPrice: 12.95,
    yearlyPrice: 47.88,
    currency: 'USD',
    features: [
      {
        id: 'kill-switch',
        name: 'Kill Switch',
        description: 'Automatic internet kill switch',
        available: true,
        icon: 'shield-check',
      },
      {
        id: 'no-logs',
        name: 'No-Logs Policy',
        description: 'Independently audited',
        available: true,
        icon: 'eye-off',
      },
      {
        id: 'unlimited-devices',
        name: 'Unlimited Devices',
        description: 'Connect unlimited devices simultaneously',
        available: true,
        icon: 'devices',
      },
      {
        id: 'cleanweb',
        name: 'CleanWeb',
        description: 'Ad and malware blocker',
        available: true,
        icon: 'block',
      },
    ],
    streamingSupport: [
      {
        serviceId: 'netflix',
        serviceName: 'Netflix',
        supported: true,
        regions: ['US', 'UK', 'CA', 'AU', 'JP'],
        reliability: 'good',
      },
      {
        serviceId: 'hulu',
        serviceName: 'Hulu',
        supported: true,
        regions: ['US'],
        reliability: 'good',
      },
      {
        serviceId: 'disney',
        serviceName: 'Disney+',
        supported: true,
        regions: ['US', 'UK', 'CA'],
        reliability: 'good',
      },
      {
        serviceId: 'hbomax',
        serviceName: 'Max',
        supported: true,
        regions: ['US'],
        reliability: 'fair',
      },
      {
        serviceId: 'prime',
        serviceName: 'Prime Video',
        supported: true,
        regions: ['US', 'UK', 'CA'],
        reliability: 'good',
      },
    ],
    serverLocations: ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'NL', 'JP', 'SG'],
    serverCount: 3200,
    speedRating: 4,
    securityRating: 4,
    easeOfUseRating: 5,
    supportedPlatforms: ['iOS', 'Android', 'Windows', 'macOS', 'Linux'],
    trialAvailable: true,
    trialDays: 7,
    refundDays: 30,
    websiteUrl: 'https://surfshark.com',
    deepLinkIos: 'surfshark://',
    deepLinkAndroid: 'surfshark://app',
  },
  {
    id: 'cyberghost',
    name: 'CyberGhost',
    displayName: 'CyberGhost VPN',
    logoUrl: 'https://www.cyberghostvpn.com/assets/logos/cyberghost-logo.svg',
    color: '#F6B429',
    rating: 4.3,
    monthlyPrice: 12.99,
    yearlyPrice: 47.88,
    currency: 'USD',
    features: [
      {
        id: 'kill-switch',
        name: 'Kill Switch',
        description: 'Automatic kill switch',
        available: true,
        icon: 'shield-check',
      },
      {
        id: 'no-logs',
        name: 'No-Logs Policy',
        description: 'Strict no-logs policy',
        available: true,
        icon: 'eye-off',
      },
      {
        id: 'streaming-servers',
        name: 'Streaming Servers',
        description: 'Dedicated servers optimized for streaming',
        available: true,
        icon: 'play-circle',
      },
      {
        id: 'ad-blocker',
        name: 'Ad Blocker',
        description: 'Built-in ad and tracker blocker',
        available: true,
        icon: 'block',
      },
    ],
    streamingSupport: [
      {
        serviceId: 'netflix',
        serviceName: 'Netflix',
        supported: true,
        regions: ['US', 'UK', 'CA', 'AU'],
        reliability: 'good',
        notes: 'Dedicated streaming servers available',
      },
      {
        serviceId: 'hulu',
        serviceName: 'Hulu',
        supported: true,
        regions: ['US'],
        reliability: 'good',
      },
      {
        serviceId: 'disney',
        serviceName: 'Disney+',
        supported: true,
        regions: ['US', 'UK'],
        reliability: 'fair',
      },
      {
        serviceId: 'prime',
        serviceName: 'Prime Video',
        supported: true,
        regions: ['US', 'UK', 'DE'],
        reliability: 'good',
      },
    ],
    serverLocations: ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'RO', 'JP'],
    serverCount: 9000,
    speedRating: 4,
    securityRating: 4,
    easeOfUseRating: 5,
    supportedPlatforms: ['iOS', 'Android', 'Windows', 'macOS', 'Linux'],
    trialAvailable: true,
    trialDays: 1,
    refundDays: 45,
    websiteUrl: 'https://www.cyberghostvpn.com',
  },
];

export const getVpnProviderById = (providerId: string): VpnProvider | undefined => {
  return VPN_PROVIDERS.find(p => p.id === providerId);
};

export const getRecommendedVpnProviders = (
  userServices: string[],
  maxResults: number = 3,
): VpnRecommendation[] => {
  // BUG-VPN-009 FIX: Add null/undefined check before forEach
  const services = userServices || [];

  const recommendations: VpnRecommendation[] = VPN_PROVIDERS.map(provider => {
    let score = 0;
    const matchedServices: string[] = [];

    // Calculate score based on streaming service support
    services.forEach(serviceId => {
      const support = provider.streamingSupport.find(s => s.serviceId === serviceId);
      if (support && support.supported) {
        matchedServices.push(serviceId);
        // Higher score for better reliability
        if (support.reliability === 'excellent') {
          score += 25;
        } else if (support.reliability === 'good') {
          score += 20;
        } else if (support.reliability === 'fair') {
          score += 10;
        }
      }
    });

    // Bonus for overall ratings
    score += provider.rating * 5; // max 25 points
    score += provider.speedRating * 3; // max 15 points
    score += provider.securityRating * 2; // max 10 points

    // Calculate price per month (yearly plan)
    const pricePerMonth = provider.yearlyPrice / 12;

    // Generate reason
    let reason = '';
    if (matchedServices.length === services.length && services.length > 0) {
      reason = `Perfect match! Supports all ${services.length} of your streaming services.`;
    } else if (matchedServices.length > 0) {
      reason = `Supports ${matchedServices.length} of your ${services.length} streaming services.`;
    } else {
      reason = 'Highly rated VPN with excellent features.';
    }

    return {
      provider,
      score,
      reason,
      matchedServices,
      pricePerMonth: Math.round(pricePerMonth * 100) / 100,
    };
  });

  // Sort by score (descending) and return top results
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
};
