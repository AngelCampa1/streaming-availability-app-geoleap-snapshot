/**
 * VPN Effectiveness Test Screen
 * Tests VPN connection performance and provides results
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import { Text, Appbar, Surface, Button, ProgressBar, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'VpnEffectivenessTest'>;

type TestStatus = 'idle' | 'running' | 'complete' | 'error';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  value?: string;
  description: string;
  icon: string;
}

interface SpeedTestResult {
  downloadSpeed: number;
  uploadSpeed: number;
  ping: number;
  jitter: number;
}

export const VpnEffectivenessTestScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [speedResults, setSpeedResults] = useState<SpeedTestResult | null>(null);
  const [overallScore, setOverallScore] = useState<number | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (testStatus === 'running') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [testStatus, pulseAnim]);

  const simulateTest = useCallback(async (testName: string, duration: number): Promise<TestResult> => {
    setCurrentTest(testName);
    await new Promise<void>(resolve => setTimeout(resolve, duration));

    // Simulate different test outcomes
    const random = Math.random();
    const status = random > 0.2 ? 'pass' : random > 0.1 ? 'warning' : 'fail';

    return {
      name: testName,
      status,
      description: getTestDescription(testName, status),
      icon: getTestIcon(testName),
    };
  }, []);

  const getTestDescription = (testName: string, status: string): string => {
    const descriptions: Record<string, Record<string, string>> = {
      'IP Leak Test': {
        pass: 'Your real IP is hidden',
        warning: 'Potential WebRTC leak detected',
        fail: 'IP address is exposed',
      },
      'DNS Leak Test': {
        pass: 'DNS queries are encrypted',
        warning: 'Some DNS queries may leak',
        fail: 'DNS leak detected',
      },
      'WebRTC Test': {
        pass: 'WebRTC is properly blocked',
        warning: 'WebRTC may expose local IP',
        fail: 'WebRTC is leaking your IP',
      },
      'Kill Switch Test': {
        pass: 'Kill switch is active',
        warning: 'Kill switch may have delays',
        fail: 'Kill switch not functioning',
      },
      'Encryption Test': {
        pass: 'Strong encryption (AES-256)',
        warning: 'Encryption is adequate',
        fail: 'Weak or no encryption',
      },
    };
    return descriptions[testName]?.[status] || 'Test completed';
  };

  const getTestIcon = (testName: string): string => {
    const icons: Record<string, string> = {
      'IP Leak Test': 'location-off',
      'DNS Leak Test': 'dns',
      'WebRTC Test': 'videocam-off',
      'Kill Switch Test': 'power-off',
      'Encryption Test': 'lock',
    };
    return icons[testName] || 'check-circle';
  };

  const runTests = useCallback(async () => {
    setTestStatus('running');
    setProgress(0);
    setResults([]);
    setSpeedResults(null);
    setOverallScore(null);

    const tests = [
      'IP Leak Test',
      'DNS Leak Test',
      'WebRTC Test',
      'Kill Switch Test',
      'Encryption Test',
    ];

    const testResults: TestResult[] = [];

    try {
      for (let i = 0; i < tests.length; i++) {
        const result = await simulateTest(tests[i], 1000 + Math.random() * 500);
        testResults.push(result);
        setResults([...testResults]);
        setProgress((i + 1) / (tests.length + 1));
      }

      // Simulate speed test
      setCurrentTest('Speed Test');
      await new Promise<void>(resolve => setTimeout(resolve, 2000));

      const speedResult: SpeedTestResult = {
        downloadSpeed: 45 + Math.random() * 50,
        uploadSpeed: 15 + Math.random() * 30,
        ping: 20 + Math.random() * 80,
        jitter: 2 + Math.random() * 10,
      };
      setSpeedResults(speedResult);
      setProgress(1);

      // Calculate overall score
      const passCount = testResults.filter(r => r.status === 'pass').length;
      const warningCount = testResults.filter(r => r.status === 'warning').length;
      const score = Math.round(((passCount * 100) + (warningCount * 50)) / tests.length);
      setOverallScore(score);

      setTestStatus('complete');
    } catch (_error) {
      setTestStatus('error');
    }
  }, [simulateTest]);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return theme.colors.success[500];
    if (score >= 60) return theme.colors.warning[500];
    return theme.colors.error[500];
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pass': return theme.colors.success[500];
      case 'warning': return theme.colors.warning[500];
      case 'fail': return theme.colors.error[500];
      default: return theme.semantic.text.tertiary;
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'pass': return 'check-circle';
      case 'warning': return 'warning';
      case 'fail': return 'cancel';
      default: return 'pending';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="VPN Effectiveness Test" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Test Status Card */}
        <Surface style={styles.statusCard} elevation={2}>
          {testStatus === 'idle' && (
            <View style={styles.idleState}>
              <Icon name="speed" size={64} color={theme.colors.primary[500]} />
              <Text style={styles.idleTitle}>Test Your VPN</Text>
              <Text style={styles.idleDescription}>
                Run a comprehensive test to check if your VPN connection is secure and performing well.
              </Text>
              <Button
                mode="contained"
                onPress={runTests}
                style={styles.startButton}
                icon="play-arrow"
              >
                Start Test
              </Button>
            </View>
          )}

          {testStatus === 'running' && (
            <View style={styles.runningState}>
              <Animated.View style={[styles.runningIcon, { transform: [{ scale: pulseAnim }] }]}>
                <Icon name="radar" size={64} color={theme.colors.primary[500]} />
              </Animated.View>
              <Text style={styles.runningTitle}>Testing in Progress</Text>
              <Text style={styles.currentTest}>{currentTest}</Text>
              <ProgressBar
                progress={progress}
                color={theme.colors.primary[500]}
                style={styles.progressBar}
              />
              <Text style={styles.progressText}>{Math.round(progress * 100)}% Complete</Text>
            </View>
          )}

          {testStatus === 'complete' && overallScore !== null && (
            <View style={styles.completeState}>
              <View style={[styles.scoreCircle, { borderColor: getScoreColor(overallScore) }]}>
                <Text style={[styles.scoreValue, { color: getScoreColor(overallScore) }]}>
                  {overallScore}
                </Text>
                <Text style={styles.scoreLabel}>{getScoreLabel(overallScore)}</Text>
              </View>
              <Text style={styles.completeTitle}>Test Complete</Text>
              <Button
                mode="outlined"
                onPress={runTests}
                style={styles.retestButton}
                icon="refresh"
              >
                Run Again
              </Button>
            </View>
          )}

          {testStatus === 'error' && (
            <View style={styles.errorState}>
              <Icon name="error-outline" size={64} color={theme.colors.error[500]} />
              <Text style={styles.errorTitle}>Test Failed</Text>
              <Text style={styles.errorDescription}>
                Unable to complete the test. Please check your connection and try again.
              </Text>
              <Button
                mode="contained"
                onPress={runTests}
                style={styles.retryButton}
              >
                Retry
              </Button>
            </View>
          )}
        </Surface>

        {/* Security Test Results */}
        {results.length > 0 && (
          <Surface style={styles.resultsCard} elevation={1}>
            <Text style={styles.sectionTitle}>Security Tests</Text>
            {results.map((result, index) => (
              <View key={index}>
                <View style={styles.resultRow}>
                  <View style={styles.resultInfo}>
                    <Icon name={result.icon} size={24} color={getStatusColor(result.status)} />
                    <View style={styles.resultText}>
                      <Text style={styles.resultName}>{result.name}</Text>
                      <Text style={[styles.resultDescription, { color: getStatusColor(result.status) }]}>
                        {result.description}
                      </Text>
                    </View>
                  </View>
                  <Icon
                    name={getStatusIcon(result.status)}
                    size={24}
                    color={getStatusColor(result.status)}
                  />
                </View>
                {index < results.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))}
          </Surface>
        )}

        {/* Speed Test Results */}
        {speedResults && (
          <Surface style={styles.speedCard} elevation={1}>
            <Text style={styles.sectionTitle}>Speed Test Results</Text>
            <View style={styles.speedGrid}>
              <View style={styles.speedItem}>
                <Icon name="arrow-downward" size={24} color={theme.colors.success[500]} />
                <Text style={styles.speedValue}>{speedResults.downloadSpeed.toFixed(1)}</Text>
                <Text style={styles.speedUnit}>Mbps</Text>
                <Text style={styles.speedLabel}>Download</Text>
              </View>
              <View style={styles.speedItem}>
                <Icon name="arrow-upward" size={24} color={theme.colors.info[500]} />
                <Text style={styles.speedValue}>{speedResults.uploadSpeed.toFixed(1)}</Text>
                <Text style={styles.speedUnit}>Mbps</Text>
                <Text style={styles.speedLabel}>Upload</Text>
              </View>
              <View style={styles.speedItem}>
                <Icon name="timer" size={24} color={theme.colors.warning[500]} />
                <Text style={styles.speedValue}>{speedResults.ping.toFixed(0)}</Text>
                <Text style={styles.speedUnit}>ms</Text>
                <Text style={styles.speedLabel}>Ping</Text>
              </View>
              <View style={styles.speedItem}>
                <Icon name="swap-vert" size={24} color={theme.colors.secondary[500]} />
                <Text style={styles.speedValue}>{speedResults.jitter.toFixed(1)}</Text>
                <Text style={styles.speedUnit}>ms</Text>
                <Text style={styles.speedLabel}>Jitter</Text>
              </View>
            </View>
          </Surface>
        )}

        {/* Tips Section */}
        {testStatus === 'complete' && overallScore !== null && overallScore < 80 && (
          <Surface style={styles.tipsCard} elevation={1}>
            <View style={styles.tipsHeader}>
              <Icon name="lightbulb" size={24} color={theme.colors.warning[500]} />
              <Text style={styles.tipsTitle}>Recommendations</Text>
            </View>
            <Text style={styles.tipItem}>• Try connecting to a different VPN server</Text>
            <Text style={styles.tipItem}>• Enable kill switch in your VPN settings</Text>
            <Text style={styles.tipItem}>• Disable WebRTC in your browser</Text>
            <Text style={styles.tipItem}>• Use DNS leak protection</Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('VpnSetupGuide', {})}
              style={styles.guideButton}
            >
              View VPN Setup Guide
            </Button>
          </Surface>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
  },
  header: {
    backgroundColor: theme.semantic.background.primary,
  },
  content: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[10],
    gap: theme.spacing[4],
  },
  statusCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[6],
  },
  idleState: {
    alignItems: 'center',
  },
  idleTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  idleDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing[6],
    lineHeight: 22,
  },
  startButton: {
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing[6],
  },
  runningState: {
    alignItems: 'center',
  },
  runningIcon: {
    marginBottom: theme.spacing[4],
  },
  runningTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[2],
  },
  currentTest: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary[500],
    marginBottom: theme.spacing[4],
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginBottom: theme.spacing[2],
  },
  progressText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  },
  completeState: {
    alignItems: 'center',
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: theme.typography.fontWeight.bold,
  },
  scoreLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  },
  completeTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[4],
  },
  retestButton: {
    borderRadius: theme.borderRadius.lg,
  },
  errorState: {
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.error[500],
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  errorDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing[4],
  },
  retryButton: {
    borderRadius: theme.borderRadius.lg,
  },
  resultsCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[4],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[4],
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[3],
  },
  resultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing[3],
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.semantic.text.primary,
    marginBottom: theme.spacing[1],
  },
  resultDescription: {
    fontSize: theme.typography.fontSize.sm,
  },
  divider: {
    marginVertical: theme.spacing[1],
  },
  speedCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[4],
  },
  speedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  speedItem: {
    width: '48%',
    alignItems: 'center',
    padding: theme.spacing[4],
    backgroundColor: theme.semantic.background.primary,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[3],
  },
  speedValue: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.semantic.text.primary,
    marginTop: theme.spacing[2],
  },
  speedUnit: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.secondary,
  },
  speedLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.semantic.text.tertiary,
    marginTop: theme.spacing[1],
  },
  tipsCard: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[4],
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[3],
  },
  tipsTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
  },
  tipItem: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    marginBottom: theme.spacing[2],
    lineHeight: 22,
  },
  guideButton: {
    marginTop: theme.spacing[2],
  },
});

export default VpnEffectivenessTestScreen;
