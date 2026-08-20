import { renderHook, act } from '@testing-library/react-native';
import { PermissionsAndroid } from 'react-native';
import { useVoiceSearch } from '../../hooks/useVoiceSearch';

// Simple, working Voice mock based on diagnostic test findings
jest.mock('@react-native-voice/voice', () => ({
  isAvailable: jest.fn().mockResolvedValue(1),
  start: jest.fn().mockResolvedValue(''),
  stop: jest.fn().mockResolvedValue(''),
  cancel: jest.fn().mockResolvedValue(''),
  destroy: jest.fn().mockResolvedValue(''),
  removeAllListeners: jest.fn().mockResolvedValue(''),
  onSpeechStart: null,
  onSpeechEnd: null,
  onSpeechResults: null,
  onSpeechError: null,
  onSpeechPartialResults: null,
}));

// Mock PermissionsAndroid
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
  PermissionsAndroid: {
    request: jest.fn().mockResolvedValue('granted'),
    PERMISSIONS: {
      RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
    },
  },
}));

// Import the mocked Voice module
import Voice from '@react-native-voice/voice';

describe('useVoiceSearch Hook - Final Fixed Version', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Voice.isAvailable as jest.Mock).mockResolvedValue(1);
    (PermissionsAndroid.request as jest.Mock).mockResolvedValue('granted');

    // Reset callback properties
    Voice.onSpeechStart = null;
    Voice.onSpeechEnd = null;
    Voice.onSpeechResults = null;
    Voice.onSpeechError = null;
    Voice.onSpeechPartialResults = null;
  });

  it('should initialize with default values', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.isListening).toBe(false);
    expect(result.current.isRecognitionAvailable).toBe(true);
    expect(result.current.voiceResult).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should check voice availability on mount', async () => {
    renderHook(() => useVoiceSearch());

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(Voice.isAvailable).toHaveBeenCalled();
  });

  it('should request microphone permission on Android', async () => {
    renderHook(() => useVoiceSearch());

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(PermissionsAndroid.request).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      expect.any(Object),
    );
  });

  it('should start listening when available', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    await act(async () => {
      result.current.startListening();
    });

    expect(Voice.start).toHaveBeenCalled();
  });

  it('should handle start listening error', async () => {
    (Voice.start as jest.Mock).mockRejectedValue(new Error('Failed to start'));

    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    await act(async () => {
      result.current.startListening();
    });

    // Error should be handled gracefully
    expect(result.current.isListening).toBe(false);
  });

  it('should stop listening', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // First start listening
    await act(async () => {
      if (Voice.onSpeechStart) {
        Voice.onSpeechStart();
      }
    });

    // Then stop listening
    await act(async () => {
      result.current.stopListening();
    });

    expect(Voice.stop).toHaveBeenCalled();
  });

  it('should cancel listening', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // First start listening
    await act(async () => {
      if (Voice.onSpeechStart) {
        Voice.onSpeechStart();
      }
    });

    // Then cancel listening
    await act(async () => {
      result.current.cancelListening();
    });

    expect(Voice.cancel).toHaveBeenCalled();
  });

  it('should handle speech results', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Trigger speech results
    const mockEvent = {
      value: ['hello world', 'hello world alternative'],
    };

    await act(async () => {
      if (Voice.onSpeechResults) {
        Voice.onSpeechResults(mockEvent);
      }
    });

    expect(result.current.voiceResult).toEqual({
      text: 'hello world',
      confidence: 1.0,
      alternatives: ['hello world alternative'],
    });
    expect(result.current.isListening).toBe(false);
  });

  it('should handle speech errors', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Trigger speech error
    const mockError = {
      error: {
        code: '7',
        message: 'No speech was recognized',
      },
    };

    await act(async () => {
      if (Voice.onSpeechError) {
        Voice.onSpeechError(mockError);
      }
    });

    expect(result.current.error).toBe('No speech was recognized');
    expect(result.current.isListening).toBe(false);
  });

  it('should clear results', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Set some results first
    const mockEvent = {
      value: ['test result'],
    };

    await act(async () => {
      if (Voice.onSpeechResults) {
        Voice.onSpeechResults(mockEvent);
      }
    });

    expect(result.current.voiceResult).toBeTruthy();

    // Clear results
    await act(async () => {
      result.current.clearResult();
    });

    expect(result.current.voiceResult).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should handle permission denied', async () => {
    (PermissionsAndroid.request as jest.Mock).mockResolvedValue('denied');

    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.error).toBe('Microphone permission is required for voice search');
    // isRecognitionAvailable will be true because Voice.isAvailable() returned true
    // before the permission check failed
    expect(result.current.isRecognitionAvailable).toBe(true);
  });

  it('should handle voice unavailable', async () => {
    (Voice.isAvailable as jest.Mock).mockResolvedValue(0);

    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.isRecognitionAvailable).toBe(false);
  });

  it('should cleanup on unmount', async () => {
    const { unmount } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    unmount();

    // Wait a bit for cleanup to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(Voice.destroy).toHaveBeenCalled();
    expect(Voice.removeAllListeners).toHaveBeenCalled();
  });

  it('should handle speech start and end events', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Simulate speech start
    await act(async () => {
      if (Voice.onSpeechStart) {
        Voice.onSpeechStart();
      }
    });

    expect(result.current.isListening).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.voiceResult).toBeNull();

    // Simulate speech end
    await act(async () => {
      if (Voice.onSpeechEnd) {
        Voice.onSpeechEnd();
      }
    });

    expect(result.current.isListening).toBe(false);
  });

  it('should handle different error codes', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    const errorCodes = [
      { code: '6', expected: 'Speech timeout - please try again' },
      { code: '5', expected: 'Voice recognition client error' },
      { code: '8', expected: 'Microphone permission is required' },
      { code: '999', expected: 'Voice recognition error: Unknown error' },
    ];

    for (const { code, expected } of errorCodes) {
      await act(async () => {
        if (Voice.onSpeechError) {
          Voice.onSpeechError({
            error: { code, message: code === '999' ? 'Unknown error' : undefined },
          });
        }
      });

      expect(result.current.error).toContain(expected);
    }
  });

  it('should handle empty speech results', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Trigger empty speech results
    const mockEvent = {
      value: [],
    };

    await act(async () => {
      if (Voice.onSpeechResults) {
        Voice.onSpeechResults(mockEvent);
      }
    });

    expect(result.current.voiceResult).toBeNull();
    expect(result.current.isListening).toBe(false);
  });

  it('should handle partial results', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Trigger partial results (hook should not update state for partial results)
    const mockEvent = {
      value: ['partial result'],
    };

    await act(async () => {
      if (Voice.onSpeechPartialResults) {
        Voice.onSpeechPartialResults(mockEvent);
      }
    });

    // Partial results shouldn't set the voiceResult
    expect(result.current.voiceResult).toBeNull();
  });

  it('should handle initialization failure gracefully', async () => {
    (Voice.isAvailable as jest.Mock).mockRejectedValue(new Error('Voice library not available'));

    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.error).toBe('Voice recognition is not available on this device');
    expect(result.current.isRecognitionAvailable).toBe(false);
  });
});
