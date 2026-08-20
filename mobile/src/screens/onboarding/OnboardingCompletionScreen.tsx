/**
 * Onboarding Completion Screen
 * Final step showing summary and completion of onboarding
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Text, Button, ProgressBar, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { OnboardingStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingComplete'>;

interface SetupItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
}

export const OnboardingCompletionScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Animation values
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const itemsOpacity = useRef(new Animated.Value(0)).current;

  // Mock setup items - in production, these would come from state/API
  const setupItems: SetupItem[] = [
    {
      id: 'services',
      title: 'Streaming Services',
      description: 'Your subscriptions are configured',
      icon: 'subscriptions',
      completed: true,
    },
    {
      id: 'content',
      title: 'Content Preferences',
      description: 'Movies, TV Shows selected',
      icon: 'movie',
      completed: true,
    },
    {
      id: 'regions',
      title: 'Region Settings',
      description: 'Primary and secondary regions set',
      icon: 'public',
      completed: true,
    },
    {
      id: 'genres',
      title: 'Genre Preferences',
      description: 'Your favorite genres selected',
      icon: 'category',
      completed: true,
    },
  ];

  useEffect(() => {
    // Animate in sequence
    Animated.sequence([
      Animated.spring(checkmarkScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(itemsOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [checkmarkScale, contentOpacity, itemsOpacity]);

  const handleGetStarted = () => {
    // Navigate to main app
    navigation.reset({
      index: 0,
      routes: [{ name: 'App' as any }],
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={1}
          color={theme.colors.success[500]}
          style={styles.progressBar}
        />
        <Text style={styles.progressText}>Complete!</Text>
      </View>

      <View style={styles.content}>
        {/* Success Animation */}
        <Animated.View
          style={[
            styles.successContainer,
            { transform: [{ scale: checkmarkScale }] },
          ]}
        >
          <View style={styles.successCircle}>
            <Icon name="check" size={48} color={theme.semantic.text.inverse} />
          </View>
        </Animated.View>

        {/* Header */}
        <Animated.View style={[styles.header, { opacity: contentOpacity }]}>
          <Text style={styles.title}>
            You're all set!
          </Text>
          <Text style={styles.subtitle}>
            Your GeoLeap profile is ready. Start exploring content from around the world.
          </Text>
        </Animated.View>

        {/* Setup Summary */}
        <Animated.View style={[styles.summaryContainer, { opacity: itemsOpacity }]}>
          <Text style={styles.summaryTitle}>Your Setup</Text>
          <Surface style={styles.summaryCard} elevation={1}>
            {setupItems.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.summaryItem,
                  index < setupItems.length - 1 && styles.summaryItemBorder,
                ]}
              >
                <View style={styles.itemLeft}>
                  <View style={[
                    styles.itemIcon,
                    item.completed ? styles.itemIconCompleted : styles.itemIconPending,
                  ]}>
                    <Icon
                      name={item.completed ? 'check' : item.icon}
                      size={16}
                      color={item.completed ? theme.colors.success[500] : theme.semantic.text.tertiary}
                    />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  </View>
                </View>
                {item.completed && (
                  <Icon
                    name="check-circle"
                    size={20}
                    color={theme.colors.success[500]}
                  />
                )}
              </View>
            ))}
          </Surface>
        </Animated.View>

        {/* Tips */}
        <Animated.View style={[styles.tipsContainer, { opacity: itemsOpacity }]}>
          <View style={styles.tipItem}>
            <Icon name="search" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.tipText}>Search for any movie or show</Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="vpn-key" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.tipText}>Get VPN recommendations for geo-blocked content</Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="bookmark" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.tipText}>Save favorites to your watchlist</Text>
          </View>
        </Animated.View>
      </View>

      {/* Bottom Action */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={handleGetStarted}
          style={styles.getStartedButton}
          contentStyle={styles.getStartedButtonContent}
          labelStyle={styles.getStartedButtonLabel}
        >
          Get Started
        </Button>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  },
  progressContainer: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[3],
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.semantic.background.secondary,
  },
  progressText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.success[500],
    marginTop: theme.spacing[2],
    textAlign: 'center',
    fontWeight: theme.typography.fontWeight.semibold,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing[5],
  },
  successContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing[6],
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.success[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.success[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.base * 1.5,
    paddingHorizontal: theme.spacing[4],
  },
  summaryContainer: {
    marginBottom: theme.spacing[5],
  },
  summaryTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[3],
  },
  summaryCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    overflow: 'hidden',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing[4],
  },
  summaryItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.semantic.border.primary,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing[3],
  },
  itemIconCompleted: {
    backgroundColor: theme.colors.success[100],
  },
  itemIconPending: {
    backgroundColor: theme.semantic.background.tertiary,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.primary,
  },
  itemDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    marginTop: 2,
  },
  tipsContainer: {
    gap: theme.spacing[3],
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  tipText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  },
  actions: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.semantic.border.primary,
  },
  getStartedButton: {
    borderRadius: theme.borderRadius.lg,
  },
  getStartedButtonContent: {
    paddingVertical: theme.spacing[2],
  },
  getStartedButtonLabel: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

export default OnboardingCompletionScreen;
