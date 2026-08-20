import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import { Camera, useCameraDevices, useCodeScanner } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Modal from 'react-native-modal';
import { QRCodeResult } from '../../types/search';
import { useTheme } from '../../theme/ThemeProvider';
import { logger } from '../../utils/logger';

interface BarcodeScannerComponentProps {
  onScanResult: (result: QRCodeResult) => void;
  onError?: (error: string) => void;
  style?: any;
}

const { width, height } = Dimensions.get('window');

const BarcodeScannerComponent: React.FC<BarcodeScannerComponentProps> = ({
  onScanResult,
  onError,
  style,
}) => {
  const { theme } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);

  const devices = useCameraDevices();
  const device = (devices as any)?.back;

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Request camera permission
  useEffect(() => {
    const requestCameraPermission = async () => {
      try {
        const permission = await Camera.requestCameraPermission();
        setHasPermission(['granted', 'authorized'].includes(permission as string));

        if (permission === 'denied') {
          onError?.('Camera permission is required for barcode scanning');
        }
      } catch (error) {
        logger.error('[BarcodeScannerComponent] Camera permission error', error);
        onError?.('Failed to request camera permission');
      }
    };

    requestCameraPermission();
  }, [onError]);

  // Code scanner configuration
  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39', 'code-93', 'codabar', 'upc-a', 'upc-e'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && isActive) {
        const code = codes[0];
        handleScanResult(code.value || '', code.type || 'unknown');
      }
    },
  });

  const handleScanResult = (data: string, format: string) => {
    setIsActive(false);
    setIsModalVisible(false);

    // Determine the type of scanned data
    let type: QRCodeResult['type'] = 'text';

    if (data.startsWith('http://') || data.startsWith('https://')) {
      type = 'url';
    } else if (data.startsWith('geo:')) {
      type = 'location';
    } else if (data.includes('MECARD:') || data.includes('VCARD:')) {
      type = 'contact';
    }

    const result: QRCodeResult = {
      type,
      data,
      format,
    };

    onScanResult(result);

    // Show result options
    showResultOptions(result);
  };

  const showResultOptions = (result: QRCodeResult) => {
    let title = 'Scan Result';
    const message = result.data;
    const actions: Array<{ text: string; onPress: () => void; style?: 'default' | 'cancel' | 'destructive' }> = [];

    switch (result.type) {
      case 'url':
        title = 'Website Found';
        actions.push(
          {
            text: 'Open URL',
            onPress: () => Linking.openURL(result.data),
          },
          {
            text: 'Search for this URL',
            onPress: () => {
              // Trigger search with the URL
              onScanResult(result);
            },
          },
        );
        break;

      case 'location':
        title = 'Location Found';
        actions.push(
          {
            text: 'Open in Maps',
            onPress: () => {
              const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(result.data)}`;
              Linking.openURL(mapsUrl);
            },
          },
          {
            text: 'Search for this location',
            onPress: () => {
              onScanResult(result);
            },
          },
        );
        break;

      case 'contact':
        title = 'Contact Information';
        actions.push(
          {
            text: 'Search for this contact',
            onPress: () => {
              onScanResult(result);
            },
          },
        );
        break;

      default:
        title = 'Text Found';
        actions.push(
          {
            text: 'Search for this text',
            onPress: () => {
              onScanResult(result);
            },
          },
        );
    }

    actions.push({
      text: 'Cancel',
      style: 'cancel',
      onPress: () => {},
    });

    Alert.alert(title, message, actions);
  };

  const openScanner = () => {
    if (!hasPermission) {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera permission to use the barcode scanner.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }

    if (!device) {
      onError?.('Camera not available');
      return;
    }

    setIsModalVisible(true);
    setIsActive(true);
  };

  const closeScanner = () => {
    setIsActive(false);
    setIsModalVisible(false);
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
  };

  if (!hasPermission) {
    return (
      <TouchableOpacity
        style={[styles.scanButton, styles.disabledButton, style]}
        onPress={() => {
          Alert.alert(
            'Camera Permission Required',
            'Please grant camera permission to use the barcode scanner.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
        }}
      >
        <Icon name="qr-code-scanner" size={24} color={theme.semantic.text.tertiary} />
      </TouchableOpacity>
    );
  }

  return (
    <>
      {/* Scanner Button */}
      <TouchableOpacity
        style={[styles.scanButton, style]}
        onPress={openScanner}
      >
        <Icon name="qr-code-scanner" size={24} color={theme.colors.primary[500]} />
      </TouchableOpacity>

      {/* Scanner Modal */}
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={closeScanner}
        onBackButtonPress={closeScanner}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.9}
        style={styles.modal}
      >
        <View style={styles.scannerContainer}>
          {device && (
            <Camera
              style={styles.camera}
              device={device}
              isActive={isActive}
              codeScanner={codeScanner}
              torch={flashEnabled ? 'on' : 'off'}
            />
          )}

          {/* Scanner Overlay */}
          <View style={styles.overlay}>
            {/* Top overlay */}
            <View style={styles.overlayTop}>
              <Text style={styles.instructionText}>
                Point your camera at a QR code or barcode
              </Text>
            </View>

            {/* Scanner frame */}
            <View style={styles.scannerFrame}>
              <View style={styles.scannerWindow}>
                {/* Corner indicators */}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>

            {/* Bottom overlay with controls */}
            <View style={styles.overlayBottom}>
              <View style={styles.controlsContainer}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={toggleFlash}
                >
                  <Icon
                    name={flashEnabled ? 'flash-on' : 'flash-off'}
                    size={32}
                    color={theme.semantic.background.primary}
                  />
                  <Text style={styles.controlText}>Flash</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={closeScanner}
                >
                  <Icon name="close" size={32} color={theme.semantic.background.primary} />
                  <Text style={styles.controlText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  scanButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: theme.semantic.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: theme.semantic.background.secondary,
    opacity: 0.5,
  },
  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerContainer: {
    width: width,
    height: height,
    position: 'relative',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: theme.colors.overlay.lightStrong,
    justifyContent: 'flex-end',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  instructionText: {
    color: theme.semantic.background.primary,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '500',
  },
  scannerFrame: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  scannerWindow: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: theme.semantic.background.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: theme.colors.overlay.lightStrong,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
    alignItems: 'center',
    padding: 20,
  },
  controlText: {
    color: theme.semantic.background.primary,
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
});

export default BarcodeScannerComponent;
