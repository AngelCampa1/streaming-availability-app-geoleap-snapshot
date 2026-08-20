export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  App: undefined; // Main app after onboarding
  Onboarding: undefined;
  StreamingServiceSelection: { isOnboarding?: boolean; userId?: string };
  Landing: undefined;
  Home: undefined;
  Profile: undefined;
  Settings: undefined;
  Search: undefined;
  Dashboard: undefined;
  ContentDetail: { item: any };
  Favorites: undefined;
  NotificationPreferences: undefined;
  SecurityAlerts: { alertId?: string };
  SpeedTest: undefined;
  SpeedTestResults: { results?: any };
  Promotions: { promoCode?: string };
  NewFeatures: undefined;
  Feedback: undefined;
  SupportChat: { ticketNumber?: string };
  Subscription: undefined;
  SubscriptionPlans: undefined;
  SubscriptionManagement: undefined;
  VpnGuidance: undefined;
  VpnProviderComparison: { providerId?: string };
  VpnSetupGuide: { platform?: string; providerId?: string };
  // Payment screens
  PaymentHistory: undefined;
  // Notification screens
  NotificationCenter: undefined;
  // Settings screens
  TwoFactorSetup: undefined;
  PreferencesManagement: undefined;
  AdvancedSecurity: undefined;
  // VPN screens
  VpnEffectivenessTest: undefined;
  // Payment screens (Sprint 5)
  PaymentRecovery: { token?: string };
  // Content screens (Sprint 5)
  Trending: undefined;
  // Onboarding screens
  ContentPreferences: undefined;
  RegionPreferences: undefined;
  GenrePreferences: undefined;
  OnboardingComplete: undefined;
  // Info screens
  About: undefined;
  Help: undefined;
  Support: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  // WebView screens
  WebView: { url: string; title?: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  // EmailVerification: { email: string }; // DEPRECATED 2025-11-06: Auto-verify on registration
  Welcome: undefined;
};

export type OnboardingStackParamList = {
  Welcome: undefined;
  StreamingServiceSelection: { isOnboarding: boolean };
  ContentPreferences: undefined;
  RegionPreferences: undefined;
  GenrePreferences: undefined;
  BiometricSetup: undefined;
  OnboardingComplete: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Dashboard: undefined;
  Profile: undefined;
  Settings: undefined;
  ContentDetail: { item: any };
  Favorites: undefined;
};

export type SearchStackParamList = {
  SearchHome: undefined;
  SearchResults: { query: string; filters?: any };
  SearchHistory: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  AuthenticationSettings: undefined;
  PrivacySettings: undefined;
  NotificationSettings: undefined;
  ChangePassword: undefined;
  Analytics: undefined;
  SubscriptionManagement: undefined;
};

export type NavigationProps = {
  navigate: (screen: keyof RootStackParamList) => void;
  goBack: () => void;
};
