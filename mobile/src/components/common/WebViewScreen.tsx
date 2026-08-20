/**
 * WebView Screen Component
 * Reusable component for displaying web content within the app
 */

import React, { useState, useMemo, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';

interface WebViewScreenProps {
  url: string;
  title?: string;
  onClose?: () => void;
  showNavigation?: boolean;
  allowExternalLinks?: boolean;
}

export const WebViewScreen: React.FC<WebViewScreenProps> = ({
  url,
  title = 'Loading...',
  onClose,
  showNavigation = true,
  allowExternalLinks = false,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState(title);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    if (navState.title && !title) {
      setPageTitle(navState.title);
    }
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleGoBack = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    }
  };

  const handleGoForward = () => {
    if (canGoForward && webViewRef.current) {
      webViewRef.current.goForward();
    }
  };

  const handleRefresh = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={onClose} />
        <Appbar.Content title={title || pageTitle} titleStyle={styles.headerTitle} />
        {showNavigation && (
          <>
            <Appbar.Action
              icon="arrow-back"
              onPress={handleGoBack}
              disabled={!canGoBack}
            />
            <Appbar.Action
              icon="arrow-forward"
              onPress={handleGoForward}
              disabled={!canGoForward}
            />
            <Appbar.Action icon="refresh" onPress={handleRefresh} />
          </>
        )}
      </Appbar.Header>

      {/* Content */}
      <View style={styles.webViewContainer}>
        {hasError ? (
          <View style={styles.errorContainer}>
            <Icon name="error-outline" size={64} color={theme.colors.error[500]} />
            <Text style={styles.errorTitle}>Failed to load page</Text>
            <Text style={styles.errorMessage}>
              Please check your internet connection and try again.
            </Text>
            <Appbar.Action icon="refresh" onPress={handleRefresh} />
          </View>
        ) : (
          <>
            <WebView
              ref={webViewRef}
              source={{ uri: url }}
              style={styles.webView}
              onNavigationStateChange={handleNavigationStateChange}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onError={handleError}
              startInLoadingState={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              sharedCookiesEnabled={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              originWhitelist={allowExternalLinks ? ['*'] : ['https://*', 'http://*']}
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary[500]} />
                </View>
              )}
            />
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={theme.colors.primary[500]} />
              </View>
            )}
          </>
        )}
      </View>
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
    elevation: 2,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.base,
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.semantic.background.primary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.overlay.lightBright,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[6],
  },
  errorTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.semantic.text.primary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  errorMessage: {
    fontSize: theme.typography.fontSize.base,
    color: theme.semantic.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing[4],
  },
});

export default WebViewScreen;
