/**
 * Help Screen
 * FAQ accordion and help topics
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Appbar, Surface, List, Searchbar, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'Help'>;

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: '1',
    question: 'How does GeoLeap work?',
    answer: 'GeoLeap searches multiple streaming platforms to find where your favorite movies and TV shows are available. We show you which services have the content in your region and suggest VPN options for accessing geo-restricted content.',
    category: 'General',
  },
  {
    id: '2',
    question: 'What is a VPN and why do I need one?',
    answer: 'A VPN (Virtual Private Network) allows you to access content that may be restricted in your region by connecting through servers in other countries. This can help you watch shows available in other regions.',
    category: 'VPN',
  },
  {
    id: '3',
    question: 'Is using a VPN legal?',
    answer: 'VPNs are legal in most countries. However, using them to access content may violate the terms of service of some streaming platforms. We recommend checking local laws and platform terms before using a VPN.',
    category: 'VPN',
  },
  {
    id: '4',
    question: 'How do I add streaming services to my profile?',
    answer: 'Go to Settings > Streaming Services and select the platforms you subscribe to. This helps us show you where content is available on your existing services.',
    category: 'Account',
  },
  {
    id: '5',
    question: 'Why isn\'t a show available in my region?',
    answer: 'Content availability varies by region due to licensing agreements between studios and streaming platforms. A show might be on Netflix in the US but on a different service in Europe.',
    category: 'Content',
  },
  {
    id: '6',
    question: 'How do I cancel my subscription?',
    answer: 'To cancel your subscription, go to Settings > Subscription > Manage Subscription. You can also manage subscriptions through your device\'s app store settings.',
    category: 'Account',
  },
  {
    id: '7',
    question: 'How often is the content database updated?',
    answer: 'We update our content database multiple times per day to ensure you have the latest information about where movies and shows are streaming.',
    category: 'Content',
  },
  {
    id: '8',
    question: 'Can I use GeoLeap on multiple devices?',
    answer: 'Yes! Your GeoLeap account works across all your devices. Simply log in with your account credentials on each device.',
    category: 'Account',
  },
  {
    id: '9',
    question: 'Which VPN providers do you recommend?',
    answer: 'We provide recommendations based on speed, reliability, and ability to access streaming content. Go to any content detail page and tap "Find VPN" to see our recommendations.',
    category: 'VPN',
  },
  {
    id: '10',
    question: 'How do I contact support?',
    answer: 'You can reach our support team through the Support screen in the app, or by emailing hello@example.com.',
    category: 'General',
  },
];

const CATEGORIES = ['All', 'General', 'VPN', 'Account', 'Content'];

export const HelpScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredFAQs = useMemo(() => {
    return FAQ_ITEMS.filter(item => {
      const matchesSearch = searchQuery === '' ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const handleToggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Help & FAQ" />
      </Appbar.Header>

      <View style={styles.searchSection}>
        <Searchbar
          placeholder="Search for help..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
        />

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map(category => (
            <Chip
              key={category}
              mode={selectedCategory === category ? 'flat' : 'outlined'}
              selected={selectedCategory === category}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipSelected,
              ]}
              textStyle={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextSelected,
              ]}
            >
              {category}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Quick Links */}
        <Surface style={styles.quickLinksCard} elevation={1}>
          <Text style={styles.sectionTitle}>Quick Help</Text>
          <View style={styles.quickLinks}>
            <TouchableQuickLink
              icon="email"
              label="Contact Support"
              onPress={() => navigation.navigate('Support')}
              theme={theme}
            />
            <TouchableQuickLink
              icon="description"
              label="Terms of Service"
              onPress={() => navigation.navigate('TermsOfService')}
              theme={theme}
            />
            <TouchableQuickLink
              icon="shield"
              label="Privacy Policy"
              onPress={() => navigation.navigate('PrivacyPolicy')}
              theme={theme}
            />
          </View>
        </Surface>

        {/* FAQ Section */}
        <Surface style={styles.faqCard} elevation={1}>
          <Text style={styles.sectionTitle}>
            Frequently Asked Questions ({filteredFAQs.length})
          </Text>

          {filteredFAQs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="search-off" size={48} color={theme.semantic.text.tertiary} />
              <Text style={styles.emptyText}>No results found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search or filter</Text>
            </View>
          ) : (
            filteredFAQs.map(item => (
              <List.Accordion
                key={item.id}
                title={item.question}
                expanded={expandedId === item.id}
                onPress={() => handleToggleExpand(item.id)}
                style={styles.accordion}
                titleStyle={styles.accordionTitle}
                titleNumberOfLines={3}
                left={props => (
                  <List.Icon {...props} icon="help-circle-outline" />
                )}
              >
                <View style={styles.answerContainer}>
                  <Text style={styles.answerText}>{item.answer}</Text>
                  <Chip mode="outlined" compact style={styles.categoryTag}>
                    {item.category}
                  </Chip>
                </View>
              </List.Accordion>
            ))
          )}
        </Surface>

        {/* Still Need Help */}
        <Surface style={styles.helpCard} elevation={1}>
          <Icon name="support-agent" size={40} color={theme.colors.primary[500]} />
          <Text style={styles.helpTitle}>Still need help?</Text>
          <Text style={styles.helpText}>
            Our support team is here to assist you with any questions.
          </Text>
          <List.Item
            title="Contact Support"
            left={() => <List.Icon icon="email" />}
            right={() => <Icon name="chevron-right" size={24} color={theme.semantic.text.tertiary} />}
            onPress={() => navigation.navigate('Support')}
            style={styles.contactButton}
          />
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
};

// Quick Link Component
const TouchableQuickLink: React.FC<{
  icon: string;
  label: string;
  onPress: () => void;
  theme: any;
}> = ({ icon, label, onPress, theme }) => (
  <Surface
    style={{
      flex: 1,
      alignItems: 'center',
      padding: theme.spacing[3],
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primary[50],
    }}
    elevation={0}
    onTouchEnd={onPress}
  >
    <Icon name={icon} size={24} color={theme.colors.primary[500]} />
    <Text style={{
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.primary[600],
      marginTop: theme.spacing[1],
      textAlign: 'center',
    }}>
      {label}
    </Text>
  </Surface>
);

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  },
  header: {
    backgroundColor: theme.semantic.background.primary,
  },
  searchSection: {
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[3],
    backgroundColor: theme.semantic.background.primary,
  },
  searchBar: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.semantic.background.secondary,
    elevation: 0,
  },
  searchInput: {
    fontSize: theme.typography.fontSize.base,
  },
  categoriesContainer: {
    paddingTop: theme.spacing[3],
    gap: theme.spacing[2],
  },
  categoryChip: {
    backgroundColor: 'transparent',
    borderColor: theme.semantic.border.primary,
  },
  categoryChipSelected: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  categoryChipText: {
    color: theme.semantic.text.secondary,
  },
  categoryChipTextSelected: {
    color: theme.semantic.text.inverse,
  },
  content: {
    padding: theme.spacing[5],
    paddingBottom: theme.spacing[10],
  },
  quickLinksCard: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[4],
    backgroundColor: theme.semantic.background.secondary,
    marginBottom: theme.spacing[4],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[3],
  },
  quickLinks: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  faqCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    marginBottom: theme.spacing[4],
    overflow: 'hidden',
  },
  accordion: {
    backgroundColor: 'transparent',
  },
  accordionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
  },
  answerContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[12],
  },
  answerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    lineHeight: theme.typography.fontSize.sm * 1.6,
    marginBottom: theme.spacing[2],
  },
  categoryTag: {
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: theme.spacing[6],
  },
  emptyText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.secondary,
    marginTop: theme.spacing[3],
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.tertiary,
    marginTop: theme.spacing[1],
  },
  helpCard: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[4],
    backgroundColor: theme.semantic.background.secondary,
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[1],
  },
  helpText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing[3],
  },
  contactButton: {
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.lg,
    width: '100%',
  },
});

export default HelpScreen;
