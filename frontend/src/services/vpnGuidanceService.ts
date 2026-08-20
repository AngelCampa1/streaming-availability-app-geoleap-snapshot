import { apiCall } from '@/lib/api';

// Types
export interface VpnRecommendationDto {
  vpnName: string;
  countries: CountryRecommendationDto[];
  overallScore: number;
  warnings: string[];
}

export interface CountryRecommendationDto {
  countryCode: string;
  countryName: string;
  audioLanguages: string[];
  subtitleLanguages: string[];
  matchQuality: 'Perfect' | 'Good' | 'Partial' | 'None';
  streamingServices: string[];
  availabilityScore: number;
}

export interface ContentVpnRecommendationRequest {
  contentId: string;
  audioLanguages?: string[];
  subtitleLanguages?: string[];
  preferredStreamingServices?: string[];
}

export interface GeneralVpnRecommendationRequest {
  audioLanguages?: string[];
  subtitleLanguages?: string[];
  preferredStreamingServices?: string[];
  countryCode?: string;
}

// API Functions
export async function getContentVpnRecommendations(
  contentId: string,
  audioLanguages?: string[],
  subtitleLanguages?: string[]
): Promise<VpnRecommendationDto[]> {
  const params = new URLSearchParams({ contentId });

  if (audioLanguages && audioLanguages.length > 0) {
    audioLanguages.forEach(lang => params.append('audioLanguages', lang));
  }

  if (subtitleLanguages && subtitleLanguages.length > 0) {
    subtitleLanguages.forEach(lang => params.append('subtitleLanguages', lang));
  }

  return apiCall<VpnRecommendationDto[]>(
    `/api/vpn-guidance/content-recommendations?${params.toString()}`
  );
}

export async function getGeneralVpnRecommendations(
  request: GeneralVpnRecommendationRequest
): Promise<VpnRecommendationDto[]> {
  const params = new URLSearchParams();

  if (request.audioLanguages && request.audioLanguages.length > 0) {
    request.audioLanguages.forEach(lang => params.append('audioLanguages', lang));
  }

  if (request.subtitleLanguages && request.subtitleLanguages.length > 0) {
    request.subtitleLanguages.forEach(lang => params.append('subtitleLanguages', lang));
  }

  if (request.preferredStreamingServices && request.preferredStreamingServices.length > 0) {
    request.preferredStreamingServices.forEach(service =>
      params.append('preferredStreamingServices', service)
    );
  }

  if (request.countryCode) {
    params.append('countryCode', request.countryCode);
  }

  return apiCall<VpnRecommendationDto[]>(
    `/api/vpn-guidance/recommendations?${params.toString()}`
  );
}

export async function getVpnCountryAvailability(
  vpnName: string,
  audioLanguages?: string[],
  subtitleLanguages?: string[]
): Promise<CountryRecommendationDto[]> {
  const params = new URLSearchParams({ vpnName });

  if (audioLanguages && audioLanguages.length > 0) {
    audioLanguages.forEach(lang => params.append('audioLanguages', lang));
  }

  if (subtitleLanguages && subtitleLanguages.length > 0) {
    subtitleLanguages.forEach(lang => params.append('subtitleLanguages', lang));
  }

  return apiCall<CountryRecommendationDto[]>(
    `/api/vpn-guidance/country-availability?${params.toString()}`
  );
}

export async function getBestVpnForLanguages(
  audioLanguages: string[],
  subtitleLanguages: string[]
): Promise<VpnRecommendationDto | null> {
  const params = new URLSearchParams();

  audioLanguages.forEach(lang => params.append('audioLanguages', lang));
  subtitleLanguages.forEach(lang => params.append('subtitleLanguages', lang));

  const recommendations = await apiCall<VpnRecommendationDto[]>(
    `/api/vpn-guidance/recommendations?${params.toString()}`
  );

  return recommendations.length > 0 ? recommendations[0] : null;
}
