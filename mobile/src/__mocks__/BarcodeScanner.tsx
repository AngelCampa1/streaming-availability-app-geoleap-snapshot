import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

// Mock BarcodeScanner component for testing
interface BarcodeScannerProps {
  testID?: string;
  onScanResult?: (result: string, type: string) => void;
  onError?: (_error: Error) => void;
  onStart?: () => void;
  onStop?: () => void;
  showFlashButton?: boolean;
  instruction?: string;
  scanTypes?: string[];
}

const MockBarcodeScanner: React.FC<BarcodeScannerProps> = ({
  testID = 'barcode-scanner',
  onScanResult,
  _onError,
  onStart,
  onStop,
  showFlashButton = true,
  instruction = 'Tap to scan barcodes and QR codes',
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [lastResult, setLastResult] = useState<{ data: string; type: string } | null>(null);

  const handleStart = () => {
    setLastResult(null); // Clear previous result when starting new scan
    setIsScanning(true);
    setFlashOn(true); // Turn flash on by default when scanning starts
    onStart?.();

    // Simulate scan completion after 2 seconds
    setTimeout(() => {
      const mockResult = {
        data: 'https://example.com/qr-code-data',
        type: 'QR_CODE',
      };
      setLastResult(mockResult);
      onScanResult?.(mockResult.data, mockResult.type);
      setIsScanning(false);
      setFlashOn(false); // Turn flash off when scanning stops
      onStop?.();
    }, 2000);
  };

  const handleStop = () => {
    setIsScanning(false);
    onStop?.();
  };

  const handleFlash = () => {
    setFlashOn(!flashOn);
  };

  return (
    <View testID={testID}>
      {!isScanning && !lastResult && (
        // Initial state - not scanning, no result
        <>
          <Text testID="barcode-scanner-placeholder">Barcode Scanner Component</Text>
          <Text testID={`${testID}-instruction`}>{instruction}</Text>
          <TouchableOpacity
            testID={`${testID}-start-button`}
            onPress={handleStart}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Start barcode scanning"
          >
            <Text>Start Scanning</Text>
          </TouchableOpacity>
          {showFlashButton && (
            <TouchableOpacity
              testID={`${testID}-flash-button`}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Toggle flash"
            >
              <Text>Flash</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {isScanning && (
        // Scanning state
        <>
          <View testID={`${testID}-camera-view`}>
            <Text testID={`${testID}-instruction`}>Point camera at barcode or QR code</Text>
            <Text>Scanning...</Text>
          </View>
          {showFlashButton && (
            <TouchableOpacity
              testID={`${testID}-flash-button`}
              onPress={handleFlash}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={flashOn ? 'Turn off flash' : 'Turn on flash'}
            >
              <Text>{flashOn ? 'Flash Off' : 'Flash On'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            testID={`${testID}-stop-button`}
            onPress={handleStop}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Stop scanning"
          >
            <Text>Stop Scanning</Text>
          </TouchableOpacity>
        </>
      )}

      {lastResult && !isScanning && (
        // Result state
        <>
          <Text testID="barcode-scanner-placeholder">Barcode Scanner Component</Text>
          <View testID={`${testID}-last-result`}>
            <Text testID={`${testID}-instruction`}>{instruction}</Text>
            <Text>{lastResult.type}</Text>
            <Text>{lastResult.data}</Text>
          </View>
          <TouchableOpacity
            testID={`${testID}-start-button`}
            onPress={handleStart}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Start barcode scanning"
          >
            <Text>Start Scanning</Text>
          </TouchableOpacity>
          {showFlashButton && (
            <TouchableOpacity
              testID={`${testID}-flash-button`}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Toggle flash"
            >
              <Text>Flash</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

export default MockBarcodeScanner;
