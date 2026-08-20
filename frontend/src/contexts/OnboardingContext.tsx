'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { apiCall } from '@/lib/api';
import {
  OnboardingContextType,
  OnboardingState,
  OnboardingStatus,
  OnboardingProgress,
  PopularServices,
  PersonalizationPreferences,
  StartOnboardingRequest,
  AddStreamingServicesRequest,
  RemoveStreamingServiceRequest,
  AddRegionPreferencesRequest,
  AddContentPreferencesRequest,
  CompleteOnboardingRequest,
  SkipOnboardingRequest,
  OnboardingAnalyticsRequest,
  RegionPreference,
  ContentPreference,
} from '@/lib/onboarding';

// Action types
type OnboardingAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_STATUS'; payload: OnboardingStatus }
  | { type: 'SET_PROGRESS'; payload: OnboardingProgress }
  | { type: 'SET_POPULAR_SERVICES'; payload: string[] }
  | { type: 'SET_PERSONALIZATION_PREFERENCES'; payload: PersonalizationPreferences }
  | { type: 'RESET_ONBOARDING' };

// Initial state
const initialState: OnboardingState = {
  status: null,
  progress: null,
  popularServices: [],
  personalizationPreferences: null,
  isLoading: false,
  error: null,
};

// Reducer
function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_STATUS':
      return { ...state, status: action.payload, error: null, isLoading: false };
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload, error: null, isLoading: false };
    case 'SET_POPULAR_SERVICES':
      return { ...state, popularServices: action.payload, error: null, isLoading: false };
    case 'SET_PERSONALIZATION_PREFERENCES':
      return { ...state, personalizationPreferences: action.payload, error: null, isLoading: false };
    case 'RESET_ONBOARDING':
      return { ...initialState };
    default:
      return state;
  }
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);

  const getStatus = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await apiCall<OnboardingStatus>('/api/onboarding/status', {
        method: 'GET',
      });
      dispatch({ type: 'SET_STATUS', payload: response });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to get onboarding status',
      });
    }
  }, []);

  const startOnboarding = useCallback(async (request: StartOnboardingRequest) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await apiCall<OnboardingStatus>('/api/onboarding/start', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      dispatch({ type: 'SET_STATUS', payload: response });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to start onboarding' });
    }
  }, []);

  const updateStep = useCallback(async (step: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await apiCall<OnboardingStatus>('/api/onboarding/step', {
        method: 'PUT',
        body: JSON.stringify({ step }),
      });
      dispatch({ type: 'SET_STATUS', payload: response });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update step' });
    }
  }, []);

  const addStreamingServices = useCallback(async (serviceNames: string[]) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const request: AddStreamingServicesRequest = { serviceNames };
      const response = await apiCall<OnboardingStatus>('/api/onboarding/streaming-services', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      dispatch({ type: 'SET_STATUS', payload: response });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to add streaming services',
      });
    }
  }, []);

  const removeStreamingService = useCallback(
    async (serviceName: string): Promise<boolean> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const request: RemoveStreamingServiceRequest = { serviceName };
        const response = await apiCall<boolean>('/api/onboarding/streaming-services', {
          method: 'DELETE',
          body: JSON.stringify(request),
        });
        // Refresh status after successful removal
        await getStatus();
        return response;
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'Failed to remove streaming service',
        });
        return false;
      }
    },
    [getStatus]
  );

  const addRegionPreferences = useCallback(async (regions: RegionPreference[]) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const request: AddRegionPreferencesRequest = { regions };
      const response = await apiCall<OnboardingStatus>('/api/onboarding/region-preferences', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      dispatch({ type: 'SET_STATUS', payload: response });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to add region preferences',
      });
    }
  }, []);

  const addContentPreferences = useCallback(async (contentTypes: ContentPreference[]) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const request: AddContentPreferencesRequest = { contentTypes };
      const response = await apiCall<OnboardingStatus>('/api/onboarding/content-preferences', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      dispatch({ type: 'SET_STATUS', payload: response });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to add content preferences',
      });
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const request: CompleteOnboardingRequest = { isCompleted: true };
      const response = await apiCall<OnboardingStatus>('/api/onboarding/complete', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      dispatch({ type: 'SET_STATUS', payload: response });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to complete onboarding',
      });
    }
  }, []);

  const skipOnboarding = useCallback(async (reason = '') => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const request: SkipOnboardingRequest = { reason };
      const response = await apiCall<OnboardingStatus>('/api/onboarding/skip', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      dispatch({ type: 'SET_STATUS', payload: response });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to skip onboarding' });
    }
  }, []);

  const getProgress = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await apiCall<OnboardingProgress>('/api/onboarding/progress', {
        method: 'GET',
      });
      dispatch({ type: 'SET_PROGRESS', payload: response });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to get progress' });
    }
  }, []);

  const getPopularServices = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await apiCall<PopularServices>('/api/onboarding/popular-services', {
        method: 'GET',
      });
      dispatch({ type: 'SET_POPULAR_SERVICES', payload: response.popularServices });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to get popular services',
      });
    }
  }, []);

  const getPersonalizationPreferences = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await apiCall<PersonalizationPreferences>('/api/onboarding/personalization', {
        method: 'GET',
      });
      dispatch({ type: 'SET_PERSONALIZATION_PREFERENCES', payload: response });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to get personalization preferences',
      });
    }
  }, []);

  const trackAnalyticsEvent = useCallback(async (eventType: string, step: number, properties = {}) => {
    try {
      const request: OnboardingAnalyticsRequest = { eventType, step, properties };
      await apiCall<boolean>('/api/onboarding/analytics', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    } catch (error) {
      // Don't show analytics errors to users, just log them
      console.error('Failed to track analytics event:', error);
    }
  }, []);

  const resetOnboarding = useCallback(async (): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await apiCall<boolean>('/api/onboarding/reset', {
        method: 'POST',
      });
      if (response) {
        dispatch({ type: 'RESET_ONBOARDING' });
        await getStatus(); // Refresh status
      }
      return response;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to reset onboarding' });
      return false;
    }
  }, [getStatus]);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const value: OnboardingContextType = {
    ...state,
    getStatus,
    startOnboarding,
    updateStep,
    addStreamingServices,
    removeStreamingService,
    addRegionPreferences,
    addContentPreferences,
    completeOnboarding,
    skipOnboarding,
    getProgress,
    getPopularServices,
    getPersonalizationPreferences,
    trackAnalyticsEvent,
    resetOnboarding,
    clearError,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextType {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
