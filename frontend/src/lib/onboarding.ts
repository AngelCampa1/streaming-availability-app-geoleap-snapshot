/* eslint-disable @typescript-eslint/no-explicit-any */
// Onboarding types and interfaces

export interface StreamingService {
  id: string;
  serviceName: string;
  isActive: boolean;
  addedAt: string;
}

export interface RegionPreference {
  countryCode: string;
  isPrimary: boolean;
  priority: number;
}

export interface ContentPreference {
  contentType: string;
  isEnabled: boolean;
  priority: number;
}

export interface OnboardingStatus {
  id: string;
  userId: string;
  isCompleted: boolean;
  currentStep: number;
  completedAt?: string;
  skippedAt?: string;
  createdAt: string;
  streamingServices: StreamingService[];
  regionPreferences: RegionPreference[];
  contentPreferences: ContentPreference[];
}

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  progress: number;
  timeEstimate: string;
  canSkip: boolean;
  canGoBack: boolean;
}

export interface PopularServices {
  popularServices: string[];
}

export interface PersonalizationPreferences {
  userServices: string[];
  preferredRegions: string[];
  contentTypes: string[];
  hidePaywalledResults: boolean;
}

// Request types
export interface StartOnboardingRequest {
  currentStep: number;
}

export interface UpdateOnboardingStepRequest {
  step: number;
}

export interface AddStreamingServicesRequest {
  serviceNames: string[];
}

export interface RemoveStreamingServiceRequest {
  serviceName: string;
}

export interface AddRegionPreferencesRequest {
  regions: RegionPreference[];
}

export interface AddContentPreferencesRequest {
  contentTypes: ContentPreference[];
}

export interface CompleteOnboardingRequest {
  isCompleted: boolean;
}

export interface SkipOnboardingRequest {
  reason: string;
}

export interface OnboardingAnalyticsRequest {
  eventType: string;
  step: number;
  properties: Record<string, any>;
}

// Context types
export interface OnboardingState {
  status: OnboardingStatus | null;
  progress: OnboardingProgress | null;
  popularServices: string[];
  personalizationPreferences: PersonalizationPreferences | null;
  isLoading: boolean;
  error: string | null;
}

export interface OnboardingActions {
  getStatus: () => Promise<void>;
  startOnboarding: (request: StartOnboardingRequest) => Promise<void>;
  updateStep: (step: number) => Promise<void>;
  addStreamingServices: (serviceNames: string[]) => Promise<void>;
  removeStreamingService: (serviceName: string) => Promise<boolean>;
  addRegionPreferences: (regions: RegionPreference[]) => Promise<void>;
  addContentPreferences: (contentTypes: ContentPreference[]) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: (reason?: string) => Promise<void>;
  getProgress: () => Promise<void>;
  getPopularServices: () => Promise<void>;
  getPersonalizationPreferences: () => Promise<void>;
  trackAnalyticsEvent: (eventType: string, step: number, properties?: Record<string, any>) => Promise<void>;
  resetOnboarding: () => Promise<boolean>;
  clearError: () => void;
}

export interface OnboardingContextType extends OnboardingState, OnboardingActions {}
