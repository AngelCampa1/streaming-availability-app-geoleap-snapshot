import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Dimensions,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeProvider';

const { width: _width, height: _height } = Dimensions.get('window');

export interface BarcodeScannerProps {
  onScanResult?: (data: string, type: string) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onStop?: () => void;
  style?: ViewStyle;
  testID?: string;
  showFlashButton?: boolean;
  scanTypes?: string[];
}

export interface ScanResult {
  data: string;
  type: string;
  timestamp: number;
}

export interface BarcodeScannerState {
  isScanning: boolean;
  isFlashOn: boolean;
  lastScanResult: ScanResult | null;
  error: string | null;
  permissionGranted: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScanResult,
  onError,
  onStart,
  onStop,
  style,
  testID = 'barcode-scanner',
  showFlashButton = true,
  scanTypes: _scanTypes = ['QR_CODE', 'CODE_128', 'CODE_39', 'EAN_13'],
}) => {
  const { theme } = useTheme();
  const [state, setState] = useState<BarcodeScannerState>({
    isScanning: false,
    isFlashOn: false,
    lastScanResult: null,
    error: null,
    permissionGranted: true, // Mock permission as granted for testing
  });

  const styles = useMemo(() => createStyles(theme), [theme]);

  const requestCameraPermission = useCallback(async () => {
    try {
      // Mock permission request - in real app would use PermissionsAndroid
      setState(prev => ({ ...prev, permissionGranted: true }));
      return true;
    } catch (error) {
      const errorMessage = 'Camera permission denied';
      setState(prev => ({ ...prev, error: errorMessage, permissionGranted: false }));
      onError?.(errorMessage);
      return false;
    }
  }, [onError]);

  const startScanning = useCallback(async () => {
    try {
      if (!state.permissionGranted) {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {return;}
      }

      setState(prev => ({
        ...prev,
        isScanning: true,
        error: null,
        lastScanResult: null,
      }));

      onStart?.();

      // Simulate scanning with a mock result after 2 seconds
      setTimeout(() => {
        if (state.isScanning) {
          const mockScanResult: ScanResult = {
            data: 'https://example.com/qr-code-data',
            type: 'QR_CODE',
            timestamp: Date.now(),
          };

          setState(prev => ({
            ...prev,
            lastScanResult: mockScanResult,
            isScanning: false,
          }));

          onScanResult?.(mockScanResult.data, mockScanResult.type);
          onStop?.();
        }
      }, 2000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Scanner initialization failed';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isScanning: false,
      }));
      onError?.(errorMessage);
    }
  }, [state.permissionGranted, state.isScanning, onStart, onScanResult, onStop, onError, requestCameraPermission]);

  const stopScanning = useCallback(() => {
    setState(prev => ({
      ...prev,
      isScanning: false,
    }));
    onStop?.();
  }, [onStop]);

  const toggleFlash = useCallback(() => {
    setState(prev => ({
      ...prev,
      isFlashOn: !prev.isFlashOn,
    }));
  }, []);

  const _toggleScanning = useCallback(() => {
    if (state.isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  }, [state.isScanning, startScanning, stopScanning]);

  const handlePermissionDenied = useCallback(() => {
    Alert.alert(
      'Camera Permission Required',
      'This app needs camera access to scan barcodes and QR codes.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => {/* Navigate to settings */} },
      ],
    );
  }, []);

  useEffect(() => {
    if (!state.permissionGranted) {
      handlePermissionDenied();
    }
  }, [state.permissionGranted, handlePermissionDenied]);

  if (!state.permissionGranted) {
    return (
      <View style={[styles.container, style]} testID={testID}>
        <View style={styles.permissionContainer}>
          <Icon name="camera-alt" size={48} color={theme.semantic.text.tertiary} />
          <Text style={styles.permissionText}>Camera permission required</Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestCameraPermission}
            testID={`${testID}-permission-button`}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      {state.isScanning ? (
        <View style={styles.scannerContainer} testID={`${testID}-camera-view`}>
          {/* Mock camera view */}
          <View style={styles.mockCameraView}>
            <View style={styles.scanningFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.scanningText}>Point camera at barcode or QR code</Text>
          </View>

          <View style={styles.controlsContainer}>
            {showFlashButton && (
              <TouchableOpacity
                style={[styles.controlButton, state.isFlashOn && styles.flashActiveButton]}
                onPress={toggleFlash}
                testID={`${testID}-flash-button`}
                accessibilityLabel={state.isFlashOn ? 'Turn off flash' : 'Turn on flash'}
                accessibilityRole="button"
              >
                <Icon
                  name={state.isFlashOn ? 'flash-on' : 'flash-off'}
                  size={24}
                  color={state.isFlashOn ? theme.colors.primary[500] : theme.semantic.background.primary}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopScanning}
              testID={`${testID}-stop-button`}
              accessibilityLabel="Stop scanning"
              accessibilityRole="button"
            >
              <Icon name="stop" size={32} color={theme.semantic.background.primary} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <Icon name="qr-code-scanner" size={64} color={theme.colors.primary[500]} />
          <Text style={styles.instructionText}>
            Tap to scan barcodes and QR codes
          </Text>

          <TouchableOpacity
            style={styles.startButton}
            onPress={startScanning}
            testID={`${testID}-start-button`}
            accessibilityLabel="Start barcode scanning"
            accessibilityRole="button"
          >
            <Text style={styles.startButtonText}>Start Scanning</Text>
          </TouchableOpacity>

          {state.lastScanResult && (
            <View style={styles.resultContainer} testID={`${testID}-last-result`}>
              <Text style={styles.resultLabel}>Last scan:</Text>
              <Text style={styles.resultType}>{state.lastScanResult.type}</Text>
              <Text style={styles.resultData} numberOfLines={2}>
                {state.lastScanResult.data}
              </Text>
            </View>
          )}
        </View>
      )}

      {state.error && (
        <View style={styles.errorContainer} testID={`${testID}-error`}>
          <Text style={styles.errorText}>{state.error}</Text>
        </View>
      )}
    </View>
  );
};

interface ThemeType {
  colors: {
    primary: Record<number, string>;
    error: Record<number, string>;
    overlay: {
      darkStrong: string;
      lightMedium: string;
      lightStrong: string;
    };
  };
  semantic: {
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    background: {
      primary: string;
      secondary: string;
    };
    border: {
      primary: string;
    };
  };
  spacing: Record<number, number>;
}

const createStyles = (theme: ThemeType) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.text.primary,
  } as ViewStyle,
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[5],
  } as ViewStyle,
  permissionText: {
    fontSize: 16,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    marginVertical: 16,
  } as TextStyle,
  permissionButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  } as ViewStyle,
  permissionButtonText: {
    color: theme.semantic.background.primary,
    fontSize: 16,
    fontWeight: 'bold',
  } as TextStyle,
  scannerContainer: {
    flex: 1,
  } as ViewStyle,
  mockCameraView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.semantic.text.primary,
  } as ViewStyle,
  scanningFrame: {
    width: _width * 0.7,
    height: _width * 0.7,
    position: 'relative',
  } as ViewStyle,
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: theme.colors.primary[500],
    borderWidth: 3,
  } as ViewStyle,
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  } as ViewStyle,
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  } as ViewStyle,
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  } as ViewStyle,
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  } as ViewStyle,
  scanningText: {
    color: theme.semantic.background.primary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  } as TextStyle,
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  } as ViewStyle,
  controlButton: {
    backgroundColor: theme.colors.overlay.lightStrong,
    padding: theme.spacing[3],
    borderRadius: 30,
  } as ViewStyle,
  flashActiveButton: {
    backgroundColor: theme.colors.overlay.lightMedium,
  } as ViewStyle,
  stopButton: {
    backgroundColor: theme.colors.error[500],
    padding: theme.spacing[4],
    borderRadius: 40,
  } as ViewStyle,
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.semantic.background.secondary,
    padding: theme.spacing[5],
  } as ViewStyle,
  instructionText: {
    fontSize: 16,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    marginVertical: 20,
  } as TextStyle,
  startButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 20,
  } as ViewStyle,
  startButtonText: {
    color: theme.semantic.background.primary,
    fontSize: 18,
    fontWeight: 'bold',
  } as TextStyle,
  resultContainer: {
    backgroundColor: theme.semantic.background.primary,
    borderRadius: 8,
    padding: theme.spacing[4],
    marginTop: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.semantic.border.primary,
  } as ViewStyle,
  resultLabel: {
    fontSize: 12,
    color: theme.semantic.text.secondary,
    marginBottom: 4,
    fontWeight: 'bold',
  } as TextStyle,
  resultType: {
    fontSize: 14,
    color: theme.colors.primary[500],
    fontWeight: 'bold',
    marginBottom: 4,
  } as TextStyle,
  resultData: {
    fontSize: 14,
    color: theme.semantic.text.primary,
  } as TextStyle,
  errorContainer: {
    backgroundColor: theme.colors.error[50],
    padding: theme.spacing[3],
    margin: theme.spacing[4],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.error[200],
  } as ViewStyle,
  errorText: {
    color: theme.colors.error[700],
    fontSize: 14,
    textAlign: 'center',
  } as TextStyle,
});

export default BarcodeScanner;
