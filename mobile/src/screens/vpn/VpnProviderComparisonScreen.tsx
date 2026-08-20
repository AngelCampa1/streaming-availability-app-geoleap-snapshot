/**
 * VPN Provider Comparison Screen
 * Side-by-side comparison of VPN providers
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Appbar, DataTable, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { VPN_PROVIDERS } from '../../types/vpn.types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'VpnProviderComparison'>;

export const VpnProviderComparisonScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { providerId } = route.params || {};

  // If specific provider ID passed, compare it with top 2 others
  // BUG-VPN-001 FIX: Add null check for find() result
  const selectedProvider = providerId ? VPN_PROVIDERS.find(p => p.id === providerId) : null;
  const providers = selectedProvider
    ? [
        selectedProvider,
        ...VPN_PROVIDERS.filter(p => p.id !== providerId).slice(0, 2),
      ]
    : VPN_PROVIDERS.slice(0, 3); // Fallback to top 3 if providerId invalid or not provided

  const renderRatingStars = (rating: number) => {
    return `${'★'.repeat(Math.floor(rating))}${'☆'.repeat(5 - Math.floor(rating))} ${rating.toFixed(1)}`;
  };

  const renderCheckmark = (value: boolean | number) => {
    if (typeof value === 'boolean') {
      return value ? '✓' : '✗';
    }
    return `${value}/5`;
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
    },
    horizontalScroll: {
      flex: 1,
    },
    verticalScroll: {
      flex: 1,
    },
    table: {
      minWidth: 800,
    },
    labelColumn: {
      minWidth: 200,
      paddingHorizontal: 16,
    },
    providerColumn: {
      minWidth: 200,
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    providerHeader: {
      alignItems: 'center',
    },
    providerName: {
      fontWeight: 'bold',
      textAlign: 'center',
    },
    sectionLabel: {
      fontWeight: 'bold',
      fontSize: 12,
      letterSpacing: 1,
      color: theme.semantic.text.secondary,
    },
    actionButton: {
      marginVertical: 8,
    },
  }), [theme]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.semantic.background.primary }]} edges={['top']}>
      {/* Header */}
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Compare VPN Providers" />
      </Appbar.Header>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={styles.horizontalScroll}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.verticalScroll}
        >
          <DataTable style={styles.table}>
            {/* Header Row - Provider Names */}
            <DataTable.Header>
              <DataTable.Title style={styles.labelColumn}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                  Feature
                </Text>
              </DataTable.Title>
              {providers.map(provider => (
                <DataTable.Title key={provider.id} style={styles.providerColumn}>
                  <View style={styles.providerHeader}>
                    <Text
                      variant="titleMedium"
                      style={[styles.providerName, { color: provider.color }]}
                    >
                      {provider.displayName}
                    </Text>
                  </View>
                </DataTable.Title>
              ))}
            </DataTable.Header>

            {/* Pricing Section */}
            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>
                <Text style={styles.sectionLabel}>PRICING</Text>
              </DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}><Text> </Text></DataTable.Cell>
              ))}
            </DataTable.Row>

            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>Monthly Price</DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}>
                  <Text style={{ fontWeight: '600' }}>${provider.monthlyPrice}/mo</Text>
                </DataTable.Cell>
              ))}
            </DataTable.Row>

            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>Yearly Price</DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}>
                  <Text style={{ fontWeight: '600' }}>
                    ${(provider.yearlyPrice / 12).toFixed(2)}/mo
                  </Text>
                </DataTable.Cell>
              ))}
            </DataTable.Row>

            {/* Ratings Section */}
            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>
                <Text style={styles.sectionLabel}>RATINGS</Text>
              </DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}><Text> </Text></DataTable.Cell>
              ))}
            </DataTable.Row>

            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>Overall Rating</DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}>
                  <Text>{renderRatingStars(provider.rating)}</Text>
                </DataTable.Cell>
              ))}
            </DataTable.Row>

            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>Speed</DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}>
                  <Text>{renderCheckmark(provider.speedRating)}</Text>
                </DataTable.Cell>
              ))}
            </DataTable.Row>

            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>Security</DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}>
                  <Text>{renderCheckmark(provider.securityRating)}</Text>
                </DataTable.Cell>
              ))}
            </DataTable.Row>

            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>Ease of Use</DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}>
                  <Text>{renderCheckmark(provider.easeOfUseRating)}</Text>
                </DataTable.Cell>
              ))}
            </DataTable.Row>

            {/* Network Section */}
            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>
                <Text style={styles.sectionLabel}>NETWORK</Text>
              </DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}><Text> </Text></DataTable.Cell>
              ))}
            </DataTable.Row>

            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>Server Count</DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}>
                  <Text style={{ fontWeight: '600' }}>{provider.serverCount}+</Text>
                </DataTable.Cell>
              ))}
            </DataTable.Row>

            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>Countries</DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}>
                  <Text style={{ fontWeight: '600' }}>{provider.serverLocations.length}+</Text>
                </DataTable.Cell>
              ))}
            </DataTable.Row>

            {/* Features Section */}
            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>
                <Text style={styles.sectionLabel}>FEATURES</Text>
              </DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}><Text> </Text></DataTable.Cell>
              ))}
            </DataTable.Row>

            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>Kill Switch</DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}>
                  <Text style={{ color: theme.colors.primary[500] }}>
                    {renderCheckmark(provider.features.some(f => f.id.includes('kill-switch')))}
                  </Text>
                </DataTable.Cell>
              ))}
            </DataTable.Row>

            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>No-Logs Policy</DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}>
                  <Text style={{ color: theme.colors.primary[500] }}>
                    {renderCheckmark(provider.features.some(f => f.id === 'no-logs'))}
                  </Text>
                </DataTable.Cell>
              ))}
            </DataTable.Row>

            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>Split Tunneling</DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}>
                  <Text style={{ color: theme.colors.primary[500] }}>
                    {renderCheckmark(provider.features.some(f => f.id === 'split-tunneling'))}
                  </Text>
                </DataTable.Cell>
              ))}
            </DataTable.Row>

            {/* Trial & Refund */}
            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>
                <Text style={styles.sectionLabel}>GUARANTEE</Text>
              </DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}><Text> </Text></DataTable.Cell>
              ))}
            </DataTable.Row>

            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>Free Trial</DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}>
                  <Text>
                    {provider.trialAvailable ? `${provider.trialDays} days` : 'No'}
                  </Text>
                </DataTable.Cell>
              ))}
            </DataTable.Row>

            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>Money-Back Guarantee</DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}>
                  <Text style={{ fontWeight: '600' }}>{provider.refundDays} days</Text>
                </DataTable.Cell>
              ))}
            </DataTable.Row>

            {/* Action Buttons Row */}
            <DataTable.Row>
              <DataTable.Cell style={styles.labelColumn}>
                <Text style={styles.sectionLabel}>ACTIONS</Text>
              </DataTable.Cell>
              {providers.map(provider => (
                <DataTable.Cell key={provider.id} style={styles.providerColumn}>
                  <Button
                    mode="contained"
                    style={[styles.actionButton, { backgroundColor: provider.color }]}
                    onPress={() => navigation.navigate('VpnGuidance')}
                  >
                    Choose
                  </Button>
                </DataTable.Cell>
              ))}
            </DataTable.Row>
          </DataTable>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
};
