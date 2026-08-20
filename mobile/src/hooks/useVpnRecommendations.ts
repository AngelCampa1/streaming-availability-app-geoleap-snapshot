/**
 * Custom hook for VPN provider recommendations
 */

import { useMemo } from 'react';
import { getRecommendedVpnProviders, VpnRecommendation } from '../types/vpn.types';
import { useStreamingServices } from './useStreamingServices';

interface UseVpnRecommendationsReturn {
  recommendations: VpnRecommendation[];
  isLoading: boolean;
  topProvider: VpnRecommendation | null;
  hasRecommendations: boolean;
}

export const useVpnRecommendations = (maxResults: number = 3): UseVpnRecommendationsReturn => {
  const { selectedServices, isLoading } = useStreamingServices();

  const recommendations = useMemo(() => {
    if (selectedServices.length === 0) {
      return [];
    }
    return getRecommendedVpnProviders(selectedServices, maxResults);
  }, [selectedServices, maxResults]);

  const topProvider = recommendations.length > 0 ? recommendations[0] : null;

  return {
    recommendations,
    isLoading,
    topProvider,
    hasRecommendations: recommendations.length > 0,
  };
};
