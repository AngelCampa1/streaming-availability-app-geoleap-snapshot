module.exports = ({ config }) => {
  const IS_DEV = process.env.APP_VARIANT === 'development';
  const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

  const getUniqueIdentifier = () => {
    if (IS_DEV) {
      return 'com.geoleap.mobile.dev';
    }
    if (IS_PREVIEW) {
      return 'com.geoleap.mobile.preview';
    }
    return 'com.geoleap.mobile';
  };

  const getAppName = () => {
    if (IS_DEV) {
      return 'GeoLeap (Dev)';
    }
    if (IS_PREVIEW) {
      return 'GeoLeap (Preview)';
    }
    return 'GeoLeap';
  };

  return {
    ...config,
    name: getAppName(),
    slug: 'geoleap',
    version: process.env.APP_VERSION || '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    scheme: 'geoleap',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#3b82f6', // Primary Blue 500 - unified with web frontend
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: getUniqueIdentifier(),
      buildNumber: process.env.BUILD_NUMBER || '1',
      usesAppleSignIn: true,
      infoPlist: {
        NSCameraUsageDescription: 'This app uses the camera for scanning QR codes.',
        NSPhotoLibraryUsageDescription: 'This app accesses your photos to let you share content.',
        NSMicrophoneUsageDescription: 'This app uses the microphone for voice search.',
        ITSAppUsesNonExemptEncryption: false,
      },
      config: {
        usesNonExemptEncryption: false,
      },
    },
    android: {
      package: getUniqueIdentifier(),
      versionCode: parseInt(process.env.VERSION_CODE || '1', 10),
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#3b82f6', // Primary Blue 500 - unified with web frontend
      },
      permissions: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-font',
      'expo-asset',
      'expo-secure-store',
      'expo-apple-authentication',
      [
        'expo-notifications',
        {
          color: '#3b82f6',
        },
      ],
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: 'com.googleusercontent.apps.000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        },
      ],
      [
        '@sentry/react-native/expo',
        {
          organization: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '00000000-0000-0000-0000-000000000000',
      },
      apiUrl: process.env.API_URL || 'https://api.geoleap.app',
    },
    runtimeVersion: '1.0.0',
    updates: {
      url: 'https://u.expo.dev/00000000-0000-0000-0000-000000000000',
    },
  };
};
