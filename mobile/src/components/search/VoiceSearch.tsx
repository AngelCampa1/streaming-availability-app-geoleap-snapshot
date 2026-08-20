import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  Alert,
  PermissionsAndroid,
  Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice from 'react-native-voice';
import { VoiceSearchResult } from '../../types/streaming';
import { useTheme } from '../../theme/ThemeProvider';
import { logger } from '../../utils/logger';

interface VoiceSearchProps {
  onResult: (result: VoiceSearchResult) => void;
  onError: (error: string) => void;
  onClose?: () => void;
  placeholder?: string;
  maxDuration?: number;
  language?: string;
  style?: ViewStyle;
  testID?: string;
}

const VoiceSearch: React.FC<VoiceSearchProps> = ({
  onResult,
  onError,
  onClose,
  placeholder = 'Listening... Tap to stop',
  maxDuration = 30000, // 30 seconds
  language = 'en-US',
  style,
  testID = 'voice-search',
}) => {
  const { theme } = useTheme();
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [partialResults, setPartialResults] = useState<string[]>([]);
  const [error, setLocalError] = useState<string | null>(null);
  const [_volumeLevel, setVolumeLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);

  // Animation values
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const volumeAnimation = useRef(new Animated.Value(0)).current;

  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationCancelRef = useRef(false); // ✅ Cancellation flag for animation cleanup

  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    // Configure Voice
    Voice.onSpeechStart = handleSpeechStart;
    Voice.onSpeechEnd = handleSpeechEnd;
    Voice.onSpeechResults = handleSpeechResults;
    Voice.onSpeechPartialResults = handleSpeechPartialResults;
    Voice.onSpeechError = handleSpeechError;
    Voice.onSpeechVolumeChanged = handleVolumeChanged;

    return () => {
      // Cleanup
      animationCancelRef.current = true; // ✅ Cancel any running animations
      Voice.destroy().then(Voice.removeAllListeners);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      // Stop animations
      pulseAnimation.stopAnimation();
      scaleAnimation.stopAnimation();
    };
  }, []);

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        if (!granted) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'GeoLeap needs access to your microphone for voice search',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          return result === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
      } catch (err) {
        logger.error('[VoiceSearch] Permission error', err);
        return false;
      }
    }
    return true; // iOS handles permissions automatically
  }, []);

  const startListening = useCallback(async () => {
    try {
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Microphone permission is required for voice search. Please enable it in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {/* Open app settings */} },
          ],
        );
        return;
      }

      setLocalError(null);
      setRecognizedText('');
      setPartialResults([]);
      setRecordingTime(0);

      const _options = {
        EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
        EXTRA_PARTIAL_RESULTS: true,
        EXTRA_MAX_RESULTS: 5,
        EXTRA_LANGUAGE: language,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2000,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 5000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
      };

      await Voice.start(language);
      setIsListening(true);

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration / 1000) {
            stopListening();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Start pulse animation
      startPulseAnimation();

    } catch (err) {
      logger.error('[VoiceSearch] Voice start error', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start voice recognition';
      setLocalError(errorMessage);
      onError(errorMessage);
    }
  }, [checkPermissions, language, maxDuration, onError]);

  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
      await Voice.destroy();
    } catch (err) {
      logger.error('[VoiceSearch] Voice stop error', err);
    }

    setIsListening(false);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    stopPulseAnimation(); // Now properly stops animation with cancellation flag
  }, []); // Empty dependencies - stopPulseAnimation is stable and will be in scope

  const handleSpeechStart = useCallback(() => {
    logger.log('[VoiceSearch] Speech started');
    setRecordingTime(0);
  }, []);

  const handleSpeechEnd = useCallback(() => {
    logger.log('[VoiceSearch] Speech ended');
    setIsListening(false);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    stopPulseAnimation();

    if (recognizedText.trim()) {
      const result: VoiceSearchResult = {
        text: recognizedText.trim(),
        confidence: 0.8, // Default confidence since we don't get it from the basic API
        alternatives: partialResults.slice(0, 3).filter(text => text !== recognizedText).map(text => ({ text, confidence: 0.7 })),
      };
      onResult(result);
    }
  }, [recognizedText, partialResults, onResult]);

  const handleSpeechResults = useCallback((e: { value?: string[] }) => {
    if (e.value && e.value.length > 0) {
      setRecognizedText(e.value[0]);
    }
  }, []);

  const handleSpeechPartialResults = useCallback((e: any) => {
    if (e.value && e.value.length > 0) {
      setPartialResults(e.value);
    }
  }, []);

  const handleSpeechError = useCallback((e: any) => {
    logger.error('[VoiceSearch] Speech error', e);
    const errorMessage = e.error || 'Voice recognition error';
    setLocalError(errorMessage);
    onError(errorMessage);
    setIsListening(false);
    stopPulseAnimation();
  }, [onError]);

  const handleVolumeChanged = useCallback((e: any) => {
    if (e.value !== undefined) {
      const volume = e.value / 5; // Normalize to 0-1 range
      setVolumeLevel(volume);

      // Animate volume indicator
      Animated.spring(volumeAnimation, {
        toValue: volume,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }).start();
    }
  }, []);

  const startPulseAnimation = useCallback(() => {
    animationCancelRef.current = false; // Reset cancellation flag

    const pulse = () => {
      if (animationCancelRef.current) return; // Check cancellation

      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && !animationCancelRef.current && isListening) {
          pulse();
        }
      });
    };

    pulse();

    // Scale animation for listening state
    Animated.timing(scaleAnimation, {
      toValue: 1.05,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isListening, pulseAnimation, scaleAnimation]);

  const stopPulseAnimation = useCallback(() => {
    animationCancelRef.current = true; // Cancel animation
    pulseAnimation.stopAnimation(); // Force stop
    scaleAnimation.stopAnimation(); // Force stop

    // Reset animations to default values
    Animated.timing(pulseAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    Animated.timing(scaleAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [pulseAnimation, scaleAnimation]);

  const handleMicrophonePress = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const formatRecordingTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleRetry = useCallback(() => {
    setLocalError(null);
    setRecognizedText('');
    setPartialResults([]);
    startListening();
  }, [startListening]);

  const renderVoiceVisualization = useCallback(() => {
    if (!isListening) {return null;}

    return (
      <View style={styles.visualizationContainer}>
        {/* Volume bars */}
        <View style={styles.volumeBars}>
          {[1, 2, 3, 4, 5].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.volumeBar,
                {
                  height: volumeAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 8 + (index * 4)],
                    extrapolate: 'clamp',
                  }),
                  opacity: volumeAnimation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 0.7, 1],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />
          ))}
        </View>

        {/* Recording time */}
        <Text style={styles.recordingTime}>
          {formatRecordingTime(recordingTime)}
        </Text>
      </View>
    );
  }, [isListening, volumeAnimation, recordingTime, formatRecordingTime, styles]);

  const renderRecognizedText = useCallback(() => {
    if (!recognizedText && partialResults.length === 0) {return null;}

    const displayText = recognizedText || (partialResults[partialResults.length - 1] || '');

    return (
      <View style={styles.recognizedTextContainer}>
        <Text style={styles.recognizedText}>{displayText}</Text>
        {!recognizedText && partialResults.length > 0 && (
          <Text style={styles.listeningIndicator}>●</Text>
        )}
      </View>
    );
  }, [recognizedText, partialResults, styles]);

  const renderErrorState = useCallback(() => {
    if (!error) {return null;}

    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={48} color={theme.colors.error[500]} />
        <Text style={styles.errorTitle}>Voice Search Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }, [error, handleRetry, styles, theme]);

  if (error) {
    return (
      <View style={[styles.container, style]} testID={testID}>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" size={24} color={theme.semantic.text.secondary} />
          </TouchableOpacity>
        )}
        {renderErrorState()}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Close button */}
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Icon name="close" size={24} color={theme.semantic.text.secondary} />
        </TouchableOpacity>
      )}

      {/* Main content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>Voice Search</Text>
        <Text style={styles.subtitle}>
          {isListening ? placeholder : 'Tap the microphone to start searching'}
        </Text>

        {/* Microphone button */}
        <Animated.View style={[{ transform: [{ scale: scaleAnimation }] }]}>
          <TouchableOpacity
            style={[
              styles.microphoneButton,
              isListening && styles.microphoneButtonActive,
            ]}
            onPress={handleMicrophonePress}
            testID={`${testID}-microphone-button`}
          >
            <Animated.View style={[{ transform: [{ scale: pulseAnimation }] }]}>
              <Icon
                name={isListening ? 'mic' : 'mic-none'}
                size={48}
                color={isListening ? theme.semantic.text.inverse : theme.semantic.text.secondary}
              />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        {/* Voice visualization */}
        {renderVoiceVisualization()}

        {/* Recognized text */}
        {renderRecognizedText()}

        {/* Alternatives */}
        {recognizedText && partialResults.length > 1 && (
          <View style={styles.alternativesContainer}>
            <Text style={styles.alternativesTitle}>Did you mean:</Text>
            {partialResults
              .filter(text => text !== recognizedText)
              .slice(0, 3)
              .map((text, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.alternativeItem}
                  onPress={() => onResult({ text, confidence: 0.7 })}
                >
                  <Text style={styles.alternativeText}>{text}</Text>
                </TouchableOpacity>
              ))}
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  } as ViewStyle,
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.semantic.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  } as ViewStyle,
  content: {
    alignItems: 'center',
    width: '100%',
  } as ViewStyle,
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.semantic.text.primary,
    marginBottom: 8,
  } as TextStyle,
  subtitle: {
    fontSize: 16,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  } as TextStyle,
  microphoneButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.semantic.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.semantic.border.primary,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  } as ViewStyle,
  microphoneButtonActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
    shadowColor: theme.colors.primary[500],
    shadowOpacity: 0.3,
  } as ViewStyle,
  visualizationContainer: {
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 60,
  } as ViewStyle,
  volumeBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 30,
    marginBottom: 8,
    gap: 4,
  } as ViewStyle,
  volumeBar: {
    width: 6,
    backgroundColor: theme.colors.primary[500],
    borderRadius: 3,
    minWidth: 4,
  } as ViewStyle,
  recordingTime: {
    fontSize: 14,
    color: theme.semantic.text.secondary,
    fontWeight: '500',
  } as TextStyle,
  recognizedTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.semantic.background.secondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  } as ViewStyle,
  recognizedText: {
    flex: 1,
    fontSize: 16,
    color: theme.semantic.text.primary,
    textAlign: 'center',
  } as TextStyle,
  listeningIndicator: {
    color: theme.colors.primary[500],
    fontSize: 8,
    marginLeft: 8,
  } as TextStyle,
  alternativesContainer: {
    width: '100%',
    marginTop: 16,
  } as ViewStyle,
  alternativesTitle: {
    fontSize: 14,
    color: theme.semantic.text.secondary,
    marginBottom: 8,
    fontWeight: '500',
  } as TextStyle,
  alternativeItem: {
    backgroundColor: theme.semantic.background.secondary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 6,
  } as ViewStyle,
  alternativeText: {
    fontSize: 14,
    color: theme.semantic.text.primary,
  } as TextStyle,
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  } as ViewStyle,
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.semantic.text.primary,
    marginTop: 16,
    marginBottom: 8,
  } as TextStyle,
  errorMessage: {
    fontSize: 14,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  } as TextStyle,
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary[500],
    borderRadius: 8,
  } as ViewStyle,
  retryButtonText: {
    fontSize: 16,
    color: theme.semantic.text.inverse,
    fontWeight: '600',
  } as TextStyle,
});

export default VoiceSearch;
