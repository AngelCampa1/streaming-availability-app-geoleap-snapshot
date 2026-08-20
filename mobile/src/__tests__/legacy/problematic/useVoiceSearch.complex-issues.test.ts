import { renderHook, act } from '@testing-library/react-native';
import { PermissionsAndroid } from 'react-native';
import { useVoiceSearch } from '../../hooks/useVoiceSearch';

// Create a comprehensive Voice mock with proper callback handling
jest.mock('@react-native-voice/voice', () => {
  const mockCallbacks: { [key: string]: Function | null } = {
    onSpeechStart: null,
    onSpeechEnd: null,
    onSpeechResults: null,
    onSpeechError: null,
    onSpeechPartialResults: null,
  };

  const voiceMock = {
    isAvailable: jest.fn().mockResolvedValue(1),
    start: jest.fn().mockResolvedValue(''),
    stop: jest.fn().mockResolvedValue(''),
    cancel: jest.fn().mockResolvedValue(''),
    destroy: jest.fn().mockResolvedValue(''),
    removeAllListeners: jest.fn().mockResolvedValue(''),

    // Mock callback setters and getters
    get onSpeechStart() { return mockCallbacks.onSpeechStart; },
    set onSpeechStart(fn) { mockCallbacks.onSpeechStart = fn; },
    get onSpeechEnd() { return mockCallbacks.onSpeechEnd; },
    set onSpeechEnd(fn) { mockCallbacks.onSpeechEnd = fn; },
    get onSpeechResults() { return mockCallbacks.onSpeechResults; },
    set onSpeechResults(fn) { mockCallbacks.onSpeechResults = fn; },
    get onSpeechError() { return mockCallbacks.onSpeechError; },
    set onSpeechError(fn) { mockCallbacks.onSpeechError = fn; },
    get onSpeechPartialResults() { return mockCallbacks.onSpeechPartialResults; },
    set onSpeechPartialResults(fn) { mockCallbacks.onSpeechPartialResults = fn; },

    // Helper methods for testing
    _triggerSpeechStart: () => mockCallbacks.onSpeechStart?.(),
    _triggerSpeechEnd: () => mockCallbacks.onSpeechEnd?.(),
    _triggerSpeechResults: (value: string | string[]) => {
      const values = Array.isArray(value) ? value : [value];
      mockCallbacks.onSpeechResults?.({ value: values });
    },
    _triggerSpeechError: (error: { code: string; message?: string }) => mockCallbacks.onSpeechError?.({ error }),
    _triggerSpeechPartialResults: (value: string | string[]) => {
      const values = Array.isArray(value) ? value : [value];
      mockCallbacks.onSpeechPartialResults?.({ value: values });
    },
    _resetCallbacks: () => {
      Object.keys(mockCallbacks).forEach(key => {
        mockCallbacks[key] = null;
      });
    },
  };

  return voiceMock;
});

// Mock PermissionsAndroid with proper implementation
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: jest.fn((obj) => obj.android),
  },
  PermissionsAndroid: {
    request: jest.fn().mockResolvedValue('granted'),
    PERMISSIONS: {
      RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
  },
  Alert: {
    alert: jest.fn(),
  },
}));

// Import the mocked Voice module
import Voice from '@react-native-voice/voice';

describe('useVoiceSearch Hook - Final Fixed Version', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Voice.isAvailable as jest.Mock).mockResolvedValue(1);
    (PermissionsAndroid.request as jest.Mock).mockResolvedValue('granted');

    // Reset callbacks using helper method
    (Voice as any)._resetCallbacks();
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

    expect((Voice as any).start).toHaveBeenCalled();
  });

  it('should handle start listening error', async () => {
    (Voice as any).start.mockRejectedValue(new Error('Failed to start'));

    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    await act(async () => {
      result.current.startListening();
    });

    // Error should be handled gracefully
    expect(result.current.isListening).toBe(false);
    expect(result.current.error).toBe('Failed to start voice recognition');
  });

  it('should stop listening', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // First start listening and simulate speech start
    await act(async () => {
      result.current.startListening();
      (Voice as any)._triggerSpeechStart();
    });

    // Then stop listening and simulate speech end
    await act(async () => {
      result.current.stopListening();
      (Voice as any)._triggerSpeechEnd();
    });

    expect((Voice as any).stop).toHaveBeenCalled();
    expect(result.current.isListening).toBe(false);
  });

  it('should cancel listening', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // First start listening
    await act(async () => {
      result.current.startListening();
      (Voice as any)._triggerSpeechStart();
    });

    // Then cancel listening
    await act(async () => {
      result.current.cancelListening();
    });

    expect((Voice as any).cancel).toHaveBeenCalled();
    expect(result.current.isListening).toBe(false);
  });

  it('should handle speech recognition results', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Start listening
    await act(async () => {
      result.current.startListening();
      (Voice as any)._triggerSpeechStart();
    });

    // Simulate speech recognition results
    await act(async () => {
      (Voice as any)._triggerSpeechResults('hello world');
    });

    expect(result.current.voiceResult).toEqual({
      text: 'hello world',
      confidence: 1.0,
      alternatives: [],
    });
    expect(result.current.isListening).toBe(false);
  });

  it('should handle speech recognition errors', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Start listening
    await act(async () => {
      result.current.startListening();
      (Voice as any)._triggerSpeechStart();
    });

    // Simulate speech recognition error
    await act(async () => {
      (Voice as any)._triggerSpeechError({ code: '7', message: 'No speech was recognized' });
    });

    expect(result.current.error).toBe('No speech was recognized');
    expect(result.current.isListening).toBe(false);
  });

  it('should handle microphone permission denied', async () => {
    (PermissionsAndroid.request as jest.Mock).mockResolvedValue('denied');

    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.error).toBe('Microphone permission is required for voice search');
    expect(result.current.isRecognitionAvailable).toBe(true);
  });

  it('should handle partial speech results', async () => {
    const { result } = renderHook(() => useVoiceSearch());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Start listening
    await act(async () => {
      result.current.startListening();
      (Voice as any)._triggerSpeechStart();
    });

    // Simulate partial speech results
    await act(async () => {
      (Voice as any)._triggerSpeechPartialResults('hello');
    });

    // Partial results should not update the main result
    expect(result.current.voiceResult).toBeNull();
    expect(result.current.isListening).toBe(true);
  });
});
