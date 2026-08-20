import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { SearchItem } from '../types/search';

import { useTheme } from '../theme/ThemeProvider';
import { logger } from '../utils/logger';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
// SearchInput import removed - not currently used
import { HeroSection } from '../components/common/HeroSection';
import { FeatureCard, SimpleFeatureCard } from '../components/common/FeatureCard';
import { StatsSection } from '../components/common/StatsSection';
import { HowItWorks } from '../components/common/HowItWorks';

type LandingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const { width: _width } = Dimensions.get('window');

// Note: CATEGORIES colors will be mapped to theme in component
const CATEGORIES = [
  { id: '1', name: 'Action', icon: '🎬', colorKey: 'error' },
  { id: '2', name: 'Comedy', icon: '😄', colorKey: 'success' },
  { id: '3', name: 'Drama', icon: '🎭', colorKey: 'info' },
  { id: '4', name: 'Horror', icon: '👻', colorKey: 'success' },
  { id: '5', name: 'Romance', icon: '💕', colorKey: 'warning' },
  { id: '6', name: 'Sci-Fi', icon: '🚀', colorKey: 'primary' },
];

const TRENDING_CONTENT = [
  { id: '1', title: 'Stranger Things', type: 'TV Series', rating: 4.8, availableOn: 'Netflix', image: '👽' },
  { id: '2', title: 'The Batman', type: 'Movie', rating: 4.6, availableOn: 'HBO Max', image: '🦇' },
  { id: '3', title: 'Wednesday', type: 'TV Series', rating: 4.7, availableOn: 'Netflix', image: '🕷️' },
  { id: '4', title: 'House of the Dragon', type: 'TV Series', rating: 4.5, availableOn: 'HBO Max', image: '🐉' },
];

// Note: POPULAR_SERVICES colors will be mapped to theme in component
const POPULAR_SERVICES = [
  { id: '1', name: 'Netflix', logo: '📺', colorKey: 'error', description: '2,000+ titles' },
  { id: '2', name: 'Disney+', logo: '🏰', colorKey: 'info', description: '1,500+ titles' },
  { id: '3', name: 'HBO Max', logo: '🎬', colorKey: 'primary', description: '1,200+ titles' },
  { id: '4', name: 'Amazon Prime', logo: '📦', colorKey: 'info', description: '1,800+ titles' },
];

// Note: FEATURES gradients will be mapped to theme in component
const FEATURES = [
  {
    icon: '🔍',
    title: 'Smart Search',
    description: 'Find any movie or show instantly across all streaming platforms',
    gradientKey: 'primary',
  },
  {
    icon: '🌍',
    title: 'Global Coverage',
    description: 'Access content from 150+ countries and 500+ streaming services',
    gradientKey: 'error',
  },
  {
    icon: '💰',
    title: 'Price Comparison',
    description: 'Compare prices and find the best deals across platforms',
    gradientKey: 'info',
  },
  {
    icon: '⚡',
    title: 'Real-time Updates',
    description: 'Get instant notifications when your favorite shows become available',
    gradientKey: 'success',
  },
];

// Note: STATS colors will be mapped to theme in component
const STATS = [
  {
    number: '150+',
    label: 'Countries',
    description: 'Global availability',
    colorKey: 'error',
    icon: '🌍',
  },
  {
    number: '500+',
    label: 'Services',
    description: 'Streaming platforms',
    colorKey: 'success',
    icon: '📺',
  },
  {
    number: '50K+',
    label: 'Titles',
    description: 'Movies & shows',
    colorKey: 'info',
    icon: '🎬',
  },
  {
    number: '1M+',
    label: 'Users',
    description: 'Happy streamers',
    colorKey: 'success',
    icon: '👥',
  },
];

// Note: PRICING_PLANS gradients will be mapped to theme in component
const PRICING_PLANS = [
  {
    id: 'premium',
    name: 'GeoLeap Premium',
    price: '$2.99',
    period: 'month',
    description: 'Complete streaming discovery',
    features: [
      'Unlimited searches',
      'Direct streaming links',
      'Advanced filtering',
      'Priority support',
      'Ad-free experience',
    ],
    badge: 'POPULAR',
    gradientKey: 'primary',
    buttonText: 'Start Free Trial',
  },
  {
    id: 'lifetime',
    name: 'Lifetime License',
    price: '$89.99',
    period: 'one-time',
    description: 'Pay once, use forever',
    features: [
      'Everything in Premium',
      'No recurring payments',
      'All future features',
      'Priority lifetime support',
      'Escape subscription fatigue',
    ],
    badge: 'BEST VALUE',
    gradientKey: 'error',
    buttonText: 'Get Lifetime Access',
  },
];

// This function will be moved inside component to access theme

export const LandingScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<LandingScreenNavigationProp>();
  const [_searchQuery, _setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      logger.log('[LandingScreen] Searching for', { query });
      navigation.navigate('Search');
    }
  };

  const handleGetStarted = () => {
    navigation.navigate('Auth' as any);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleCategoryPress = (category: string) => {
    logger.log('[LandingScreen] Category selected', { category });
    navigation.navigate('Search');
  };

  const handleContentPress = (content: typeof TRENDING_CONTENT[0]) => {
    logger.log('[LandingScreen] Content selected', { contentId: content.id });
    // Build a typed SearchItem so ContentDetailScreen can render its header
    // immediately; the screen fetches full details by id on mount.
    const item: SearchItem = {
      id: content.id,
      title: content.title,
      type: 'content',
      createdAt: new Date(),
    };
    navigation.navigate('ContentDetail', { item });
  };

  const handleServicePress = (serviceId: string) => {
    logger.log('[LandingScreen] Service selected', { serviceId });
    navigation.navigate('Search');
  };

  // Helper function to map colorKey to theme color
  const getThemeColor = (colorKey: string): string => {
    switch (colorKey) {
      case 'error': return theme.colors.error[500];
      case 'success': return theme.colors.success[500];
      case 'info': return theme.colors.info[500];
      case 'warning': return theme.colors.warning[500];
      case 'primary': return theme.colors.primary[500];
      default: return theme.colors.primary[500];
    }
  };

  // Helper function to map gradientKey to theme gradient
  const getThemeGradient = (gradientKey: string): [string, string] => {
    switch (gradientKey) {
      case 'primary': return [theme.colors.primary[400], theme.colors.primary[600]];
      case 'error': return [theme.colors.error[400], theme.colors.error[600]];
      case 'success': return [theme.colors.success[400], theme.colors.success[600]];
      case 'info': return [theme.colors.info[400], theme.colors.info[600]];
      case 'warning': return [theme.colors.warning[400], theme.colors.warning[600]];
      default: return [theme.colors.primary[400], theme.colors.primary[600]];
    }
  };

  const renderCategoryItem = ({ item }: { item: typeof CATEGORIES[0] }) => {
    return (
      <SimpleFeatureCard
        title={item.name}
        subtitle={`${Math.floor(Math.random() * 500 + 100)} titles`}
        icon={item.icon}
        color={getThemeColor(item.colorKey)}
        onPress={() => handleCategoryPress(item.name)}
      />
    );
  };

  const renderTrendingItem = ({ item }: { item: typeof TRENDING_CONTENT[0] }) => (
    <TouchableOpacity
      style={styles.trendingItem}
      onPress={() => handleContentPress(item)}
      activeOpacity={0.8}
    >
      <Card variant="elevated" style={styles.trendingCard}>
        <View style={styles.trendingImage}>
          <Text style={styles.trendingEmoji}>{item.image}</Text>
        </View>
        <View style={styles.trendingContent}>
          <View style={styles.trendingInfo}>
            <Text style={styles.trendingTitle}>{item.title}</Text>
            <Text style={styles.trendingType}>{item.type}</Text>
            <Text style={styles.trendingService}>🎬 {item.availableOn}</Text>
          </View>
          <View style={styles.trendingRating}>
            <Text style={styles.ratingText}>⭐ {item.rating}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderServiceItem = ({ item }: { item: typeof POPULAR_SERVICES[0] }) => {
    const serviceColor = getThemeColor(item.colorKey);

    return (
      <TouchableOpacity
        style={[styles.serviceItem, { backgroundColor: serviceColor + '15' }]}
        onPress={() => handleServicePress(item.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.serviceLogoContainer, { backgroundColor: serviceColor + '20' }]}>
          <Text style={styles.serviceLogo}>{item.logo}</Text>
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{item.name}</Text>
          <Text style={styles.serviceDescription}>{item.description}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPricingPlan = (plan: any) => {
    const handlePlanPress = () => {
      Alert.alert(
        plan.name,
        `Get ${plan.name} - ${plan.description}\n\n${plan.price}/${plan.period}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: plan.buttonText,
            onPress: () => {
              logger.log('[LandingScreen] Plan selected', { planId: plan.id });
              navigation.navigate('SubscriptionPlans');
            },
          },
        ],
      );
    };

    const gradient = getThemeGradient(plan.gradientKey);

    return (
      <TouchableOpacity
        key={plan.id}
        style={styles.pricingPlanCard}
        onPress={handlePlanPress}
        activeOpacity={0.9}
      >
        <View style={[styles.pricingPlanHeader, { backgroundColor: gradient[0] }]}>
          {plan.badge && (
            <View style={styles.pricingBadge}>
              <Text style={styles.pricingBadgeText}>{plan.badge}</Text>
            </View>
          )}
          <Text style={styles.pricingPlanName}>{plan.name}</Text>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingPrice}>{plan.price}</Text>
            <Text style={styles.pricingPeriod}>/{plan.period}</Text>
          </View>
          <Text style={styles.pricingDescription}>{plan.description}</Text>
        </View>

        <View style={styles.pricingFeatures}>
          {plan.features.map((feature: string, index: number) => (
            <View key={index} style={styles.pricingFeature}>
              <Text style={styles.pricingFeatureIcon}>✓</Text>
              <Text style={styles.pricingFeatureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.pricingButton, { backgroundColor: gradient[1] }]}
          onPress={handlePlanPress}
        >
          <Text style={styles.pricingButtonText}>{plan.buttonText}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.semantic.background.primary,
    },
    section: {
      padding: theme.spacing[6],
    },
    featuresList: {
      paddingRight: theme.spacing[6],
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[4],
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.semantic.text.primary,
      marginBottom: theme.spacing[4],
    },
    seeAllText: {
      fontSize: 14,
      color: theme.colors.primary[500],
      fontWeight: '600',
    },
    categoriesList: {
      paddingRight: theme.spacing[4],
    },
    trendingList: {
      paddingRight: theme.spacing[4],
    },
    trendingItem: {
      marginRight: theme.spacing[4],
      width: 220,
    },
    trendingCard: {
      padding: theme.spacing[4],
      elevation: 6,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    trendingImage: {
      width: '100%',
      height: 120,
      backgroundColor: theme.colors.primary[50],
      borderRadius: theme.borderRadius[3],
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing[4],
    },
    trendingEmoji: {
      fontSize: 48,
    },
    trendingContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    trendingInfo: {
      flex: 1,
    },
    trendingTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.semantic.text.primary,
      marginBottom: theme.spacing[1],
    },
    trendingType: {
      fontSize: 12,
      color: theme.semantic.text.secondary,
      marginBottom: theme.spacing[1],
      fontWeight: '500',
    },
    trendingService: {
      fontSize: 12,
      color: theme.colors.primary[500],
      fontWeight: '600',
    },
    trendingRating: {
      marginLeft: theme.spacing[2],
      backgroundColor: theme.colors.primary[50],
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius[2],
    },
    ratingText: {
      fontSize: 12,
      color: theme.colors.primary[500],
      fontWeight: '700',
    },
    servicesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    serviceGridItem: {
      width: '48%',
      marginBottom: theme.spacing[4],
    },
    serviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing[4],
      borderRadius: theme.borderRadius[4],
      elevation: 3,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      borderWidth: 1,
      borderColor: theme.semantic.border.primary,
    },
    serviceLogoContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing[2],
    },
    serviceLogo: {
      fontSize: 20,
    },
    serviceInfo: {
      flex: 1,
    },
    serviceName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.semantic.text.primary,
      marginBottom: 2,
    },
    serviceDescription: {
      fontSize: 11,
      color: theme.semantic.text.secondary,
    },
    ctaSection: {
      padding: theme.spacing[6],
      paddingTop: theme.spacing[8],
    },
    ctaCard: {
      padding: theme.spacing[8],
      alignItems: 'center',
      elevation: 8,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    ctaContent: {
      alignItems: 'center',
    },
    ctaTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.semantic.text.inverse,
      textAlign: 'center',
      marginBottom: theme.spacing[2],
    },
    ctaSubtitle: {
      fontSize: 14,
      color: theme.semantic.text.inverse,
      textAlign: 'center',
      opacity: 0.9,
      marginBottom: theme.spacing[6],
      lineHeight: 20,
    },
    ctaButton: {
      backgroundColor: theme.semantic.background.primary,
      elevation: 4,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
    footer: {
      padding: theme.spacing[6],
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.semantic.border.primary,
      backgroundColor: theme.semantic.background.secondary,
    },
    footerText: {
      fontSize: 12,
      color: theme.semantic.text.secondary,
      fontWeight: '500',
    },
    sectionSubtitle: {
      fontSize: 16,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
      marginBottom: theme.spacing[6],
      paddingHorizontal: theme.spacing[4],
    },
    pricingList: {
      paddingRight: theme.spacing[6],
    },
    pricingPlanCard: {
      width: 280,
      marginRight: theme.spacing[4],
      borderRadius: 16,
      backgroundColor: theme.semantic.background.secondary,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    pricingPlanHeader: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: theme.spacing[6],
      alignItems: 'center',
      position: 'relative',
    },
    pricingBadge: {
      position: 'absolute',
      top: -8,
      paddingHorizontal: theme.spacing[2],
      paddingVertical: 4,
      backgroundColor: theme.colors.warning[500],
      borderRadius: 12,
    },
    pricingBadgeText: {
      color: theme.semantic.text.inverse,
      fontSize: 10,
      fontWeight: '700',
    },
    pricingPlanName: {
      color: theme.semantic.text.inverse,
      fontWeight: '700',
      marginBottom: theme.spacing[2],
      fontSize: 18,
    },
    pricingRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: theme.spacing[2],
    },
    pricingPrice: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.semantic.text.inverse,
    },
    pricingPeriod: {
      fontSize: 14,
      color: theme.semantic.text.inverse,
      opacity: 0.8,
    },
    pricingDescription: {
      fontSize: 14,
      color: theme.semantic.text.inverse,
      opacity: 0.9,
      textAlign: 'center',
    },
    pricingFeatures: {
      padding: theme.spacing[6],
    },
    pricingFeature: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[2],
    },
    pricingFeatureIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.primary[500],
      color: theme.semantic.text.inverse,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 20,
      marginRight: theme.spacing[2],
    },
    pricingFeatureText: {
      fontSize: 14,
      color: theme.semantic.text.primary,
      flex: 1,
    },
    pricingButton: {
      margin: theme.spacing[6],
      paddingVertical: theme.spacing[4],
      borderRadius: 12,
      alignItems: 'center',
    },
    pricingButtonText: {
      color: theme.semantic.text.inverse,
      fontWeight: '700',
      fontSize: 16,
    },
  }), [theme]);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Enhanced Hero Section */}
      <HeroSection
        onSearch={handleSearch}
        onGetStarted={handleGetStarted}
      />

      {/* Features Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Powerful Features</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuresList}
        >
          {FEATURES.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              gradient={getThemeGradient(feature.gradientKey)}
              onPress={() => logger.log('[LandingScreen] Feature pressed', { featureTitle: feature.title })}
              delay={index * 100}
            />
          ))}
        </ScrollView>
      </View>

      {/* Stats Section */}
      <StatsSection
        stats={STATS.map(stat => ({
          ...stat,
          color: getThemeColor(stat.colorKey),
        }))}
        title="Why GeoLeap?"
        subtitle="Join millions of users discovering content worldwide"
      />

      {/* Pricing Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Simple, Transparent Pricing</Text>
        <Text style={styles.sectionSubtitle}>
          Choose the plan that works best for you
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pricingList}
        >
          {PRICING_PLANS.map(renderPricingPlan)}
        </ScrollView>
      </View>

      {/* How It Works Section */}
      <HowItWorks
        title="How It Works"
        subtitle="Find your favorite content in 4 simple steps"
      />

      {/* Categories Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browse by Category</Text>
        <FlatList
          data={CATEGORIES}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Trending Now Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Now 🔥</Text>
          <TouchableOpacity onPress={() => logger.log('[LandingScreen] See all trending')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={TRENDING_CONTENT}
          renderItem={renderTrendingItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendingList}
        />
      </View>

      {/* Popular Services Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Streaming Services</Text>
        <View style={styles.servicesGrid}>
          {POPULAR_SERVICES.map((service) => (
            <View key={service.id} style={styles.serviceGridItem}>
              {renderServiceItem({ item: service })}
            </View>
          ))}
        </View>
      </View>

      {/* Enhanced CTA Section */}
      <View style={styles.ctaSection}>
        <Card variant="gradient" style={styles.ctaCard}>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>🚀 Ready to discover more?</Text>
            <Text style={styles.ctaSubtitle}>
              Join thousands of users finding their favorite content across the globe
            </Text>
            <Button
              title="Get Started Now"
              onPress={handleGetStarted}
              variant="primary"
              size="large"
              fullWidth
              style={styles.ctaButton}
            />
          </View>
        </Card>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© {new Date().getFullYear()} GeoLeap. Find Your Shows Anywhere 🌍</Text>
      </View>
    </ScrollView>
  );
};
