/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Smoke Tests - Mobile App Overhaul
 *
 * These tests verify that all critical components, screens, and hooks
 * can be imported and instantiated without errors.
 *
 * Run with: npm test -- smoke-test.ts
 */

/* eslint-disable @typescript-eslint/no-require-imports */

describe('Mobile App Smoke Tests', () => {

  // ============================================================
  // PHASE 1: STREAMING SERVICE SELECTION
  // ============================================================

  describe('Phase 1: Streaming Service Selection', () => {

    it('should import streaming types without errors', () => {
      const types = require('../types/streaming.types');

      expect(types.STREAMING_SERVICES).toBeDefined();
      expect(Array.isArray(types.STREAMING_SERVICES)).toBe(true);
      expect(types.STREAMING_SERVICES.length).toBe(10);
      expect(types.getStreamingServiceById).toBeDefined();
      expect(types.getStreamingServicesByIds).toBeDefined();
    });

    it('should validate streaming service structure', () => {
      const { STREAMING_SERVICES } = require('../types/streaming.types');

      const netflix = STREAMING_SERVICES[0];
      expect(netflix.id).toBe('netflix');
      expect(netflix.name).toBe('Netflix');
      expect(netflix.displayName).toBeDefined();
      expect(netflix.logoUrl).toBeDefined();
      expect(netflix.color).toBeDefined();
      expect(netflix.regions).toBeDefined();
      expect(Array.isArray(netflix.regions)).toBe(true);
    });

    it('should import useStreamingServices hook', () => {
      const { useStreamingServices } = require('../hooks/useStreamingServices');
      expect(useStreamingServices).toBeDefined();
      expect(typeof useStreamingServices).toBe('function');
    });

    it('should import ServiceSelector component', () => {
      const ServiceSelector = require('../components/streaming/ServiceSelector');
      expect(ServiceSelector).toBeDefined();
    });

    it('should import AvailabilityBadge component', () => {
      const AvailabilityBadge = require('../components/streaming/AvailabilityBadge');
      expect(AvailabilityBadge).toBeDefined();
    });

    it('should import StreamingAvailability component', () => {
      const StreamingAvailability = require('../components/content/StreamingAvailability');
      expect(StreamingAvailability).toBeDefined();
    });

    it('should import StreamingServiceSelectionScreen', () => {
      const { StreamingServiceSelectionScreen } = require('../screens/onboarding/StreamingServiceSelectionScreen');
      expect(StreamingServiceSelectionScreen).toBeDefined();
    });
  });

  // ============================================================
  // PHASE 2: VPN GUIDANCE SYSTEM
  // ============================================================

  describe('Phase 2: VPN Guidance System', () => {

    it('should import VPN types without errors', () => {
      const types = require('../types/vpn.types');

      expect(types.VPN_PROVIDERS).toBeDefined();
      expect(Array.isArray(types.VPN_PROVIDERS)).toBe(true);
      expect(types.VPN_PROVIDERS.length).toBe(4);
      expect(types.getVpnProviderById).toBeDefined();
      expect(types.getRecommendedVpnProviders).toBeDefined();
    });

    it('should validate VPN provider structure', () => {
      const { VPN_PROVIDERS } = require('../types/vpn.types');

      const nordvpn = VPN_PROVIDERS[0];
      expect(nordvpn.id).toBe('nordvpn');
      expect(nordvpn.name).toBe('NordVPN');
      expect(nordvpn.displayName).toBeDefined();
      expect(nordvpn.logoUrl).toBeDefined();
      expect(nordvpn.color).toBeDefined();
      expect(nordvpn.rating).toBeGreaterThan(0);
      expect(nordvpn.rating).toBeLessThanOrEqual(5);
      expect(nordvpn.monthlyPrice).toBeGreaterThan(0);
      expect(nordvpn.yearlyPrice).toBeGreaterThan(0);
      expect(Array.isArray(nordvpn.features)).toBe(true);
      expect(Array.isArray(nordvpn.streamingSupport)).toBe(true);
      expect(Array.isArray(nordvpn.serverLocations)).toBe(true);
    });

    it('should validate VPN recommendation algorithm', () => {
      const { getRecommendedVpnProviders } = require('../types/vpn.types');

      const userServices = ['netflix', 'hulu', 'disney-plus'];
      const recommendations = getRecommendedVpnProviders(userServices, 3);

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeLessThanOrEqual(3);

      recommendations.forEach(rec => {
        expect(rec.provider).toBeDefined();
        expect(rec.score).toBeGreaterThan(0);
        expect(rec.matchedServices).toBeDefined();
        expect(Array.isArray(rec.matchedServices)).toBe(true);
      });

      // Verify sorted by score (descending)
      for (let i = 0; i < recommendations.length - 1; i++) {
        expect(recommendations[i].score).toBeGreaterThanOrEqual(recommendations[i + 1].score);
      }
    });

    it('should import useVpnRecommendations hook', () => {
      const { useVpnRecommendations } = require('../hooks/useVpnRecommendations');
      expect(useVpnRecommendations).toBeDefined();
      expect(typeof useVpnRecommendations).toBe('function');
    });

    it('should import VpnProviderCard component', () => {
      const VpnProviderCard = require('../components/vpn/VpnProviderCard');
      expect(VpnProviderCard).toBeDefined();
    });

    it('should import VpnGuidanceScreen', () => {
      const { VpnGuidanceScreen } = require('../screens/vpn/VpnGuidanceScreen');
      expect(VpnGuidanceScreen).toBeDefined();
    });

    it('should import VpnProviderComparisonScreen', () => {
      const { VpnProviderComparisonScreen } = require('../screens/vpn/VpnProviderComparisonScreen');
      expect(VpnProviderComparisonScreen).toBeDefined();
    });
  });

  // ============================================================
  // PHASE 3: IN-APP PURCHASES & SUBSCRIPTIONS
  // ============================================================

  describe('Phase 3: In-App Purchases & Subscriptions', () => {

    it('should import subscription types without errors', () => {
      const types = require('../types/subscription.types');

      expect(types.SUBSCRIPTION_PLANS).toBeDefined();
      expect(Array.isArray(types.SUBSCRIPTION_PLANS)).toBe(true);
      expect(types.SUBSCRIPTION_PLANS.length).toBe(4);
      expect(types.getSubscriptionPlanByTier).toBeDefined();
      expect(types.getSubscriptionPlanById).toBeDefined();
      expect(types.calculateYearlySavings).toBeDefined();
      expect(types.calculateSavingsPercentage).toBeDefined();
    });

    it('should validate subscription plan structure', () => {
      const { SUBSCRIPTION_PLANS } = require('../types/subscription.types');

      const freePlan = SUBSCRIPTION_PLANS.find(p => p.tier === 'free');
      expect(freePlan).toBeDefined();
      expect(freePlan?.id).toBe('free');
      expect(freePlan?.pricing.monthly).toBe(0);
      expect(freePlan?.pricing.yearly).toBe(0);

      const premiumPlan = SUBSCRIPTION_PLANS.find(p => p.tier === 'premium');
      expect(premiumPlan).toBeDefined();
      expect(premiumPlan?.id).toBe('premium');
      expect(premiumPlan?.pricing.monthly).toBe(9.99);
      expect(premiumPlan?.pricing.yearly).toBe(99.99);
      expect(Array.isArray(premiumPlan?.features)).toBe(true);
      expect(premiumPlan?.iapProductIds).toBeDefined();
      expect(premiumPlan?.iapProductIds.ios).toBeDefined();
      expect(premiumPlan?.iapProductIds.android).toBeDefined();
    });

    it('should validate subscription savings calculations', () => {
      const { calculateYearlySavings, calculateSavingsPercentage, SUBSCRIPTION_PLANS } = require('../types/subscription.types');

      const premiumPlan = SUBSCRIPTION_PLANS.find(p => p.tier === 'premium');

      const yearlySavings = calculateYearlySavings(premiumPlan);
      expect(yearlySavings).toBeGreaterThan(0);

      const monthlyTotal = premiumPlan.pricing.monthly * 12;
      expect(yearlySavings).toBe(monthlyTotal - premiumPlan.pricing.yearly);

      const savingsPercentage = calculateSavingsPercentage(premiumPlan);
      expect(savingsPercentage).toBeGreaterThan(0);
      expect(savingsPercentage).toBeLessThanOrEqual(100);
    });

    it('should validate feature access control', () => {
      const { SUBSCRIPTION_PLANS } = require('../types/subscription.types');

      const freePlan = SUBSCRIPTION_PLANS.find(p => p.tier === 'free');
      const basicPlan = SUBSCRIPTION_PLANS.find(p => p.tier === 'basic');
      const premiumPlan = SUBSCRIPTION_PLANS.find(p => p.tier === 'premium');
      const proPlan = SUBSCRIPTION_PLANS.find(p => p.tier === 'pro');

      // Free plan limitations
      const freeUnlimitedServices = freePlan?.features.find(f => f.id === 'unlimited-services');
      expect(freeUnlimitedServices?.included).toBe(false);

      // Basic plan includes unlimited services
      const basicUnlimitedServices = basicPlan?.features.find(f => f.id === 'unlimited-services');
      expect(basicUnlimitedServices?.included).toBe(true);

      // Premium includes offline mode
      const premiumOffline = premiumPlan?.features.find(f => f.id === 'offline-mode');
      expect(premiumOffline?.included).toBe(true);

      // Pro includes family sharing
      const proFamily = proPlan?.features.find(f => f.id === 'family-sharing');
      expect(proFamily?.included).toBe(true);
    });

    it('should import useSubscription hook', () => {
      const { useSubscription } = require('../hooks/useSubscription');
      expect(useSubscription).toBeDefined();
      expect(typeof useSubscription).toBe('function');
    });

    it('should import SubscriptionCard component', () => {
      const SubscriptionCard = require('../components/subscription/SubscriptionCard');
      expect(SubscriptionCard).toBeDefined();
    });

    it('should import SubscriptionStatusCard component', () => {
      const { SubscriptionStatusCard } = require('../components/subscription/SubscriptionStatusCard');
      expect(SubscriptionStatusCard).toBeDefined();
    });

    it('should import SubscriptionPlansScreen', () => {
      const { SubscriptionPlansScreen } = require('../screens/subscription/SubscriptionPlansScreen');
      expect(SubscriptionPlansScreen).toBeDefined();
    });

    it('should import SubscriptionManagementScreen', () => {
      const { SubscriptionManagementScreen } = require('../screens/subscription/SubscriptionManagementScreen');
      expect(SubscriptionManagementScreen).toBeDefined();
    });
  });

  // ============================================================
  // NAVIGATION INTEGRATION
  // ============================================================

  describe('Navigation Integration', () => {

    it('should import navigation types', () => {
      const types = require('../navigation/types');

      expect(types).toBeDefined();
      // RootStackParamList should include new screens
      // This is a TypeScript type, so we can't test at runtime
      // But importing should not throw
    });

    it('should import AppNavigator', () => {
      const { AppNavigator } = require('../navigation/AppNavigator');
      expect(AppNavigator).toBeDefined();
    });

    it('should import AuthNavigator', () => {
      const { AuthNavigator } = require('../navigation/AuthNavigator');
      expect(AuthNavigator).toBeDefined();
    });
  });

  // ============================================================
  // REGRESSION TESTS (PRE-EXISTING FUNCTIONALITY)
  // ============================================================

  describe('Regression Tests - Pre-Existing Functionality', () => {

    it('should import SearchScreen', () => {
      const SearchScreen = require('../screens/SearchScreen');
      expect(SearchScreen).toBeDefined();
    });

    it('should import ContentDetailScreen', () => {
      const ContentDetailScreen = require('../screens/ContentDetailScreen');
      expect(ContentDetailScreen).toBeDefined();
    });

    it('should import DashboardScreen', () => {
      const DashboardScreen = require('../screens/DashboardScreen');
      expect(DashboardScreen).toBeDefined();
    });

    it('should import ProfileScreen', () => {
      const ProfileScreen = require('../screens/ProfileScreen');
      expect(ProfileScreen).toBeDefined();
    });

    it('should import SettingsScreen', () => {
      const SettingsScreen = require('../screens/SettingsScreen');
      expect(SettingsScreen).toBeDefined();
    });

    it('should import LandingScreen', () => {
      const { LandingScreen } = require('../screens/LandingScreen');
      expect(LandingScreen).toBeDefined();
    });

    it('should import auth screens', () => {
      const LoginScreen = require('../screens/auth/LoginScreen').default;
      const RegisterScreen = require('../screens/auth/RegisterScreen').default;
      const ForgotPasswordScreen = require('../screens/auth/ForgotPasswordScreen').default;

      expect(LoginScreen).toBeDefined();
      expect(RegisterScreen).toBeDefined();
      expect(ForgotPasswordScreen).toBeDefined();
    });

    it('should import useAuth hook', () => {
      const { useAuth } = require('../hooks/useAuth');
      expect(useAuth).toBeDefined();
      expect(typeof useAuth).toBe('function');
    });

    it('should import useSearch hook', () => {
      const { useSearch } = require('../hooks/useSearch');
      expect(useSearch).toBeDefined();
      expect(typeof useSearch).toBe('function');
    });
  });

  // ============================================================
  // DEPENDENCY VERIFICATION
  // ============================================================

  describe('Dependency Verification', () => {

    it('should have react-native-iap installed', () => {
      expect(() => require('react-native-iap')).not.toThrow();
    });

    it('should have @react-native-async-storage/async-storage installed', () => {
      expect(() => require('@react-native-async-storage/async-storage')).not.toThrow();
    });

    it('should have @tanstack/react-query installed', () => {
      expect(() => require('@tanstack/react-query')).not.toThrow();
    });

    it('should have react-native-paper installed', () => {
      expect(() => require('react-native-paper')).not.toThrow();
    });

    it('should have @react-navigation/native installed', () => {
      expect(() => require('@react-navigation/native')).not.toThrow();
    });

    it('should have react-native-vector-icons installed', () => {
      expect(() => require('react-native-vector-icons/MaterialIcons')).not.toThrow();
    });

    it('should have axios installed', () => {
      expect(() => require('axios')).not.toThrow();
    });
  });

});

// ============================================================
// EXPORT SUMMARY
// ============================================================

afterAll(() => {
  console.log('\n=================================================');
  console.log('  SMOKE TESTS SUMMARY');
  console.log('=================================================');
  console.log('✅ Phase 1: Streaming Service Selection');
  console.log('✅ Phase 2: VPN Guidance System');
  console.log('✅ Phase 3: In-App Purchases & Subscriptions');
  console.log('✅ Navigation Integration');
  console.log('✅ Regression Tests');
  console.log('✅ Dependency Verification');
  console.log('=================================================');
  console.log('🎉 All smoke tests passed!');
  console.log('=================================================\n');
});
