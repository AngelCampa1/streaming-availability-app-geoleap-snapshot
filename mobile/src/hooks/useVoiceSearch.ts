import { useState, useEffect, useCallback, useRef } from 'react';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { PermissionsAndroid, Platform } from 'react-native';
import { VoiceSearchResult } from '../types/search';
import { logger } from '../utils/logger';

export const useVoiceSearch = () => {
  const [isListening, setIsListening] = useState(false);
  const [isRecognitionAvailable, setIsRecognitionAvailable] = useState(false);
  const [voiceResult, setVoiceResult] = useState<VoiceSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Voice event handlers
  const onSpeechStart = useCallback(() => {
    setIsListening(true);
    setError(null);
    setVoiceResult(null);
  }, []);

  const onSpeechEnd = useCallback(() => {
    setIsListening(false);
  }, []);

  const onSpeechResults = useCallback((event: SpeechResultsEvent) => {
    const results = event.value || [];
    if (results.length > 0) {
      const result: VoiceSearchResult = {
        text: results[0],
        confidence: 1.0, // Voice doesn't provide confidence scores
        alternatives: results.slice(1, 5), // Include up to 4 alternatives
      };
      setVoiceResult(result);
    }
    setIsListening(false);
  }, []);

  const onSpeechError = useCallback((event: SpeechErrorEvent) => {
    logger.error('[useVoiceSearch] Voice recognition error', event.error);
    setIsListening(false);

    let errorMessage = 'Voice recognition failed';
    if (event.error) {
      switch (event.error.code) {
        case '7': // ERROR_NO_MATCH
          errorMessage = 'No speech was recognized';
          break;
        case '6': // ERROR_SPEECH_TIMEOUT
          errorMessage = 'Speech timeout - please try again';
          break;
        case '5': // ERROR_CLIENT
          errorMessage = 'Voice recognition client error';
          break;
        case '8': // ERROR_INSUFFICIENT_PERMISSIONS
          errorMessage = 'Microphone permission is required';
          break;
        default:
          errorMessage = `Voice recognition error: ${event.error.message || 'Unknown error'}`;
      }
    }
    setError(errorMessage);
  }, [setError]);

  const onSpeechPartialResults = useCallback((event: SpeechResultsEvent) => {
    // Optional: Handle partial results for real-time feedback
    const partialResults = event.value || [];
    if (partialResults.length > 0) {
      // You could show partial results in UI here
      logger.log('[useVoiceSearch] Partial results', partialResults[0]);
    }
  }, []);

  // Create stable refs for callbacks
  const onSpeechStartRef = useRef(onSpeechStart);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const onSpeechResultsRef = useRef(onSpeechResults);
  const onSpeechErrorRef = useRef(onSpeechError);
  const onSpeechPartialResultsRef = useRef(onSpeechPartialResults);

  // Update refs when callbacks change
  useEffect(() => {
    onSpeechStartRef.current = onSpeechStart;
    onSpeechEndRef.current = onSpeechEnd;
    onSpeechResultsRef.current = onSpeechResults;
    onSpeechErrorRef.current = onSpeechError;
    onSpeechPartialResultsRef.current = onSpeechPartialResults;
  }, [onSpeechStart, onSpeechEnd, onSpeechResults, onSpeechError, onSpeechPartialResults]);


  // Initialize voice recognition - register listeners only once with ref-based callbacks
  useEffect(() => {
    const initializeVoice = async () => {
      try {
        // Check if speech recognition is available
        const available = await Voice.isAvailable();
        setIsRecognitionAvailable(!!available);

        // Request permissions on Android
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'GeoLeap needs access to your microphone for voice search',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setError('Microphone permission is required for voice search');
            return;
          }
        }

        // Set up event listeners with ref-based callbacks to prevent re-registration
        Voice.onSpeechStart = () => onSpeechStartRef.current();
        Voice.onSpeechEnd = () => onSpeechEndRef.current();
        Voice.onSpeechResults = (e) => onSpeechResultsRef.current(e);
        Voice.onSpeechError = (e) => onSpeechErrorRef.current(e);
        Voice.onSpeechPartialResults = (e) => onSpeechPartialResultsRef.current(e);

      } catch (err) {
        logger.error('[useVoiceSearch] Voice initialization error', err);
        setError('Voice recognition is not available on this device');
      }
    };

    initializeVoice();

    // Cleanup - remove event listeners
    return () => {
      Voice.onSpeechStart = null;
      Voice.onSpeechEnd = null;
      Voice.onSpeechResults = null;
      Voice.onSpeechError = null;
      Voice.onSpeechPartialResults = null;
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []); // Empty dependencies - register once

  // Start voice recognition
  const startListening = useCallback(async () => {
    if (!isRecognitionAvailable) {
      setError('Voice recognition is not available');
      return;
    }

    if (isListening) {
      return; // Already listening
    }

    try {
      setError(null);
      setVoiceResult(null);

      await Voice.start('en-US'); // You can make language configurable
    } catch (err) {
      logger.error('[useVoiceSearch] Failed to start voice recognition', err);
      setError('Failed to start voice recognition');
    }
  }, [isRecognitionAvailable, isListening, setError, setVoiceResult]);

  // Stop voice recognition
  const stopListening = useCallback(async () => {
    if (!isListening) {
      return;
    }

    try {
      await Voice.stop();
    } catch (err) {
      logger.error('[useVoiceSearch] Failed to stop voice recognition', err);
    }
  }, [isListening]);

  // Cancel voice recognition
  const cancelListening = useCallback(async () => {
    if (!isListening) {
      return;
    }

    try {
      await Voice.cancel();
      setIsListening(false);
      setVoiceResult(null);
    } catch (err) {
      logger.error('[useVoiceSearch] Failed to cancel voice recognition', err);
    }
  }, [isListening]);

  // Clear results
  const clearResult = useCallback(() => {
    setVoiceResult(null);
    setError(null);
  }, []);

  return {
    // State
    isListening,
    isRecognitionAvailable,
    voiceResult,
    error,

    // Actions
    startListening,
    stopListening,
    cancelListening,
    clearResult,
  };
};

export default useVoiceSearch;
