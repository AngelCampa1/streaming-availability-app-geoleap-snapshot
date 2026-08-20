import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Modal from 'react-native-modal';
import { useVoiceSearch } from '../../hooks/useVoiceSearch';
import { useTheme } from '../../theme/ThemeProvider';

interface VoiceSearchComponentProps {
  onSearchResult: (query: string) => void;
  onError?: (error: string) => void;
  style?: any;
}

const { width: _width } = Dimensions.get('window');

const VoiceSearchComponent: React.FC<VoiceSearchComponentProps> = ({
  onSearchResult,
  onError,
  style,
}) => {
  const { theme } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pulseAnimation] = useState(new Animated.Value(1));

  const {
    isListening,
    isRecognitionAvailable,
    voiceResult,
    error,
    startListening,
    stopListening,
    cancelListening,
    clearResult,
  } = useVoiceSearch();

  // Pulse animation for listening state
  React.useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [isListening, pulseAnimation]);

  // Handle voice search result
  React.useEffect(() => {
    if (voiceResult?.text) {
      onSearchResult(voiceResult.text);
      setIsModalVisible(false);
      clearResult();
    }
  }, [voiceResult, onSearchResult, clearResult]);

  // Handle voice search error
  React.useEffect(() => {
    if (error) {
      onError?.(error);
      setTimeout(() => {
        setIsModalVisible(false);
      }, 2000);
    }
  }, [error, onError]);

  const handleVoiceSearch = () => {
    if (!isRecognitionAvailable) {
      onError?.('Voice recognition is not available on this device');
      return;
    }

    setIsModalVisible(true);
    startListening();
  };

  const handleCancel = () => {
    cancelListening();
    setIsModalVisible(false);
    clearResult();
  };

  const handleStopListening = () => {
    stopListening();
  };

  const styles = useMemo(() => StyleSheet.create({
    voiceButton: {
      padding: 12,
      borderRadius: 20,
      backgroundColor: theme.semantic.background.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modal: {
      justifyContent: 'center',
      alignItems: 'center',
      margin: 0,
    },
    modalContent: {
      backgroundColor: theme.semantic.background.primary,
      borderRadius: 20,
      padding: 32,
      alignItems: 'center',
      width: Dimensions.get('window').width * 0.85,
      maxWidth: 400,
    },
    microphoneContainer: {
      marginBottom: 24,
    },
    microphoneCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.semantic.background.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: theme.colors.primary[500],
    },
    microphoneActive: {
      backgroundColor: theme.colors.primary[500],
      borderColor: theme.colors.primary[600],
    },
    statusContainer: {
      alignItems: 'center',
      marginBottom: 24,
      minHeight: 60,
    },
    statusTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.semantic.text.primary,
      marginBottom: 8,
    },
    statusSubtitle: {
      fontSize: 16,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.error[500],
      marginBottom: 8,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.error[500],
      textAlign: 'center',
    },
    resultTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.success[500],
      marginBottom: 8,
    },
    resultText: {
      fontSize: 18,
      color: theme.semantic.text.primary,
      textAlign: 'center',
      fontWeight: '500',
      marginBottom: 8,
    },
    alternativesText: {
      fontSize: 12,
      color: theme.semantic.text.secondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 16,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 25,
      gap: 8,
      minWidth: 100,
      justifyContent: 'center',
    },
    startButton: {
      backgroundColor: theme.colors.success[500],
    },
    stopButton: {
      backgroundColor: theme.colors.warning[500],
    },
    cancelButton: {
      backgroundColor: theme.semantic.text.secondary,
    },
    buttonText: {
      color: theme.semantic.background.primary,
      fontSize: 16,
      fontWeight: '600',
    },
  }), [theme]);

  return (
    <>
      {/* Voice Search Button */}
      <TouchableOpacity
        style={[styles.voiceButton, style]}
        onPress={handleVoiceSearch}
        disabled={!isRecognitionAvailable}
      >
        <Icon
          name="mic"
          size={24}
          color={isRecognitionAvailable ? theme.colors.primary[500] : theme.semantic.text.tertiary}
        />
      </TouchableOpacity>

      {/* Voice Search Modal */}
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={handleCancel}
        onBackButtonPress={handleCancel}
        animationIn="fadeIn"
        animationOut="fadeOut"
        backdropOpacity={0.7}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          {/* Listening Animation */}
          <Animated.View
            style={[
              styles.microphoneContainer,
              {
                transform: [{ scale: pulseAnimation }],
              },
            ]}
          >
            <View style={[
              styles.microphoneCircle,
              isListening && styles.microphoneActive,
            ]}>
              <Icon
                name="mic"
                size={48}
                color={isListening ? theme.semantic.background.primary : theme.colors.primary[500]}
              />
            </View>
          </Animated.View>

          {/* Status Text */}
          <View style={styles.statusContainer}>
            {isListening && (
              <>
                <Text style={styles.statusTitle}>Listening...</Text>
                <Text style={styles.statusSubtitle}>Speak now</Text>
              </>
            )}

            {!isListening && !error && !voiceResult && (
              <>
                <Text style={styles.statusTitle}>Ready to listen</Text>
                <Text style={styles.statusSubtitle}>Tap microphone to start</Text>
              </>
            )}

            {error && (
              <>
                <Text style={styles.errorTitle}>Error</Text>
                <Text style={styles.errorText}>{error}</Text>
              </>
            )}

            {voiceResult && (
              <>
                <Text style={styles.resultTitle}>Recognized:</Text>
                <Text style={styles.resultText}>{voiceResult.text}</Text>
                {voiceResult.alternatives && voiceResult.alternatives.length > 0 && (
                  <Text style={styles.alternativesText}>
                    Alternatives: {voiceResult.alternatives.slice(0, 2).join(', ')}
                  </Text>
                )}
              </>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {isListening ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.stopButton]}
                  onPress={handleStopListening}
                >
                  <Icon name="stop" size={24} color={theme.semantic.background.primary} />
                  <Text style={styles.buttonText}>Stop</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <Icon name="close" size={24} color={theme.semantic.background.primary} />
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {!error && !voiceResult && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.startButton]}
                    onPress={startListening}
                  >
                    <Icon name="mic" size={24} color={theme.semantic.background.primary} />
                    <Text style={styles.buttonText}>Start</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <Icon name="close" size={24} color={theme.semantic.background.primary} />
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

export default VoiceSearchComponent;
