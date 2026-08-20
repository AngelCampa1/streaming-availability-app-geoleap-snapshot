import { registerRootComponent } from 'expo';
import * as Sentry from '@sentry/react-native';
import App from './src/App';

// Initialize Sentry before registering the root component
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 10000,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    debug: __DEV__,
  });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(sentryDsn ? Sentry.wrap(App) : App);
