# Configuration Guide

**Project**: GeoLeap Mobile App
**Last Updated**: 2025-12-16

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [OAuth Configuration](#oauth-configuration)
3. [API Configuration](#api-configuration)
4. [Development Setup](#development-setup)
5. [Production Setup](#production-setup)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Configuration](#advanced-configuration)

---

## Environment Variables

### Required Variables

Create a `.env` file in the `mobile/` directory:

```bash
# API Configuration (REQUIRED)
EXPO_PUBLIC_API_URL=https://api.geoleap.app/api

# OAuth Providers (REQUIRED for social login)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com

# Optional Configuration
EXPO_PUBLIC_ENVIRONMENT=production  # Options: development, staging, production
EXPO_PUBLIC_LOG_LEVEL=info          # Options: debug, info, warn, error
```

### Variable Validation

The app **automatically validates** environment variables on startup:

```typescript
// mobile/src/config/validateEnv.ts
export function validateEnv(): void {
  // Validates EXPO_PUBLIC_API_URL exists
  // Warns if localhost is used (production-only enforcement)
  // Throws error if required variables missing
}
```

**Validation Behavior:**

| Scenario | Behavior |
|----------|----------|
| `EXPO_PUBLIC_API_URL` missing | ❌ **Throws error** - app won't start |
| `EXPO_PUBLIC_API_URL` contains `localhost` | ⚠️ **Warning logged** - allowed in dev |
| OAuth variables missing | ⚠️ **Warning** - social login disabled |
| Other variables missing | ℹ️ **Default values** used |

---

## OAuth Configuration

### Google Sign-In

#### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "GeoLeap Mobile"
3. Enable **Google Sign-In API**

#### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. User type: **External**
3. App information:
   - App name: `GeoLeap`
   - User support email: `support@geoleap.app`
   - Developer contact: `dev@geoleap.app`
4. Scopes: Add `email`, `profile`, `openid`
5. Test users: Add your email for testing

#### 3. Create OAuth Credentials

**For Android:**

1. Go to **Credentials > Create Credentials > OAuth 2.0 Client ID**
2. Application type: **Android**
3. Package name: `com.geoleap.mobile`
4. SHA-1 certificate fingerprint:
   ```bash
   # Development (debug.keystore)
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

   # Production
   keytool -list -v -keystore /path/to/release.keystore -alias release
   ```
5. Copy **Client ID**

**For iOS:**

1. Go to **Credentials > Create Credentials > OAuth 2.0 Client ID**
2. Application type: **iOS**
3. Bundle ID: `com.geoleap.mobile`
4. App Store ID: (optional for testing)
5. Copy **Client ID**

**For Web (Expo Go testing):**

1. Application type: **Web application**
2. Authorized redirect URIs:
   ```
   https://auth.expo.io/@your-username/geoleap
   ```
3. Copy **Client ID**

#### 4. Update .env File

```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com  # Android/Web
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-ios.apps.googleusercontent.com  # iOS
```

#### 5. Configure in app.json

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json",
      "package": "com.geoleap.mobile"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist",
      "bundleIdentifier": "com.geoleap.mobile"
    },
    "plugins": [
      "@react-native-google-signin/google-signin"
    ]
  }
}
```

### Apple Sign-In

#### 1. Apple Developer Account Setup

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. **Certificates, Identifiers & Profiles**
3. Create **App ID**:
   - Bundle ID: `com.geoleap.mobile`
   - Enable **Sign in with Apple**

#### 2. Configure Service ID (for Web)

1. Create new **Services ID**
2. Identifier: `com.geoleap.mobile.service`
3. Configure **Sign in with Apple**:
   - Primary App ID: `com.geoleap.mobile`
   - Web Domain: `geoleap.app`
   - Return URLs: `https://geoleap.app/auth/callback`

#### 3. Create Key for Apple Sign-In

1. Go to **Keys**
2. Create new key
3. Enable **Sign in with Apple**
4. Download `.p8` key file
5. Note **Key ID** and **Team ID**

#### 4. Configure in app.json

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.geoleap.mobile",
      "usesAppleSignIn": true
    },
    "plugins": [
      "expo-apple-authentication"
    ]
  }
}
```

**No .env variables needed** - Apple Sign-In uses native APIs.

---

## API Configuration

### Base URL Configuration

**Location**: `mobile/src/config/api.ts`

```typescript
// Development configuration (for testing)
const developmentConfig: ApiConfig = {
  baseURL: 'https://api.geoleap.app',  // Always production
  timeout: 15000,
  retryAttempts: 3,
  retryDelay: 1000,
};

// Production configuration
const productionConfig: ApiConfig = {
  baseURL: 'https://api.geoleap.app',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
};

// Staging configuration
const stagingConfig: ApiConfig = {
  baseURL: 'https://staging-api.geoleap.app',
  timeout: 12000,
  retryAttempts: 3,
  retryDelay: 1000,
};
```

### Switching Environments

**Method 1: Environment Variable**

```bash
# .env
EXPO_PUBLIC_ENVIRONMENT=staging

# app will use stagingConfig
```

**Method 2: Manual Override**

```typescript
// In api.ts
export const apiConfig: ApiConfig =
  process.env.NODE_ENV === 'production'
    ? productionConfig
    : developmentConfig;

// Override for testing:
export const apiConfig: ApiConfig = stagingConfig;
```

### Timeout Configuration

**Default Timeouts:**

| Environment | Timeout | Reason |
|-------------|---------|--------|
| Development | 15s | Debugging, slower networks |
| Staging | 12s | Testing, moderate strictness |
| Production | 10s | Performance, user experience |

**Per-Request Override:**

```typescript
const response = await ApiService.get('/api/slow-endpoint', {
  timeout: 30000, // 30 seconds for this specific request
});
```

### Retry Configuration

**Default Retry Settings:**

```typescript
retryAttempts: 3        // Max retry attempts
retryDelay: 1000        // Initial delay (1 second)
// Exponential backoff: 1s → 2s → 4s (max 10s)
```

**Per-Request Override:**

```typescript
const response = await ApiService.get('/api/critical-endpoint', {
  retryAttempts: 5,       // More retries
  timeout: 20000,         // Longer timeout
});
```

---

## Development Setup

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Minimal .env for Development:**

```bash
EXPO_PUBLIC_API_URL=https://api.geoleap.app/api
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id
```

### 3. Install Native Dependencies (if needed)

```bash
# For iOS
cd ios && pod install && cd ..

# For Android
# Dependencies auto-installed on build
```

### 4. Start Development Server

```bash
# Expo Go (recommended for quick testing)
npm start

# Development build (for native features)
npm run start:dev-client
```

### 5. Run on Device/Emulator

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Expo Go (scan QR code with Expo Go app)
npm start
```

---

## Production Setup

### 1. Environment Configuration

```bash
# .env.production
EXPO_PUBLIC_API_URL=https://api.geoleap.app/api
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_LOG_LEVEL=error
EXPO_PUBLIC_GOOGLE_CLIENT_ID=prod-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=prod-ios-client-id
```

### 2. Build Configuration

**Android (app.json):**

```json
{
  "expo": {
    "android": {
      "package": "com.geoleap.mobile",
      "versionCode": 1,
      "permissions": [
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ],
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#7c3aed"
      }
    }
  }
}
```

**iOS (app.json):**

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.geoleap.mobile",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSFaceIDUsageDescription": "We use Face ID to secure your account",
        "NSCameraUsageDescription": "We need camera access for QR code scanning"
      }
    }
  }
}
```

### 3. Build Production App

```bash
# Android APK
npm run build:android:prod

# iOS IPA
npm run build:ios:prod

# Both platforms
npm run build:all:prod
```

### 4. Submit to Stores

```bash
# Submit to Google Play
npm run submit:android

# Submit to App Store
npm run submit:ios

# Both
npm run submit:all
```

---

## Troubleshooting

### Problem: "API URL not configured"

**Error:**
```
Error: API URL not configured. Check EXPO_PUBLIC_API_URL in .env
```

**Solution:**

1. Check `.env` file exists:
   ```bash
   ls -la .env
   ```

2. Verify variable name is correct:
   ```bash
   cat .env | grep EXPO_PUBLIC_API_URL
   ```

3. Restart Metro bundler:
   ```bash
   # Stop current server (Ctrl+C)
   npm start
   ```

4. Clear cache:
   ```bash
   npx expo start --clear
   ```

### Problem: Google Sign-In Not Working

**Symptoms:**
- "Developer Error" message
- "Sign-in failed" errors

**Solutions:**

1. **Verify Client IDs:**
   ```bash
   cat .env | grep GOOGLE_CLIENT
   ```

2. **Check package name/bundle ID matches:**
   ```json
   // app.json
   "android": { "package": "com.geoleap.mobile" }
   "ios": { "bundleIdentifier": "com.geoleap.mobile" }
   ```

3. **Verify SHA-1 certificate:**
   ```bash
   # Check current SHA-1
   keytool -list -v -keystore ~/.android/debug.keystore \
     -alias androiddebugkey -storepass android -keypass android

   # Must match SHA-1 in Google Console
   ```

4. **Enable Google Sign-In API:**
   - Go to Google Cloud Console
   - Enable "Google Sign-In API"

5. **Check OAuth consent screen:**
   - Verify app is published (or in testing mode)
   - Add your email as test user

### Problem: Apple Sign-In Not Available

**Symptoms:**
- "Apple Sign-In not available on this device"

**Solutions:**

1. **Only works on iOS devices** (not Android/Web)
   ```typescript
   import AppleAuthentication from 'expo-apple-authentication';

   const isAvailable = await AppleAuthentication.isAvailableAsync();
   console.log('Apple Sign-In available:', isAvailable);
   ```

2. **Requires iOS 13+**
   ```json
   // app.json
   "ios": {
     "deploymentTarget": "13.0"
   }
   ```

3. **Requires native build** (won't work in Expo Go)
   ```bash
   npm run ios:native
   ```

### Problem: Network Requests Failing

**Symptoms:**
- All requests return `NETWORK_ERROR`
- 401/403 errors

**Solutions:**

1. **Run smoke tests:**
   ```bash
   npm run smoke-test
   ```

2. **Check API is reachable:**
   ```bash
   curl https://api.geoleap.app/health
   ```

3. **Verify network permissions (Android):**
   ```xml
   <!-- android/app/src/main/AndroidManifest.xml -->
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
   ```

4. **Check cleartext traffic (Android):**
   ```xml
   <!-- android/app/src/main/AndroidManifest.xml -->
   <application
     android:usesCleartextTraffic="false">
   ```

5. **Verify App Transport Security (iOS):**
   ```xml
   <!-- ios/geoleap/Info.plist -->
   <!-- Should NOT have NSAllowsArbitraryLoads for production -->
   ```

### Problem: OAuth Redirect Not Working

**Symptoms:**
- "Redirect URI mismatch" error
- Stuck on OAuth consent screen

**Solutions:**

1. **Check redirect URIs in Google Console:**
   ```
   https://auth.expo.io/@your-username/geoleap
   ```

2. **Verify app slug in app.json:**
   ```json
   {
     "expo": {
       "slug": "geoleap",
       "owner": "your-username"
     }
   }
   ```

3. **Use correct scheme for native builds:**
   ```json
   {
     "expo": {
       "scheme": "geoleap"
     }
   }
   ```

### Problem: Environment Variables Not Loading

**Symptoms:**
- `process.env.EXPO_PUBLIC_API_URL` is `undefined`

**Solutions:**

1. **Verify variable prefix:**
   ```bash
   # ❌ WRONG
   API_URL=https://api.geoleap.app

   # ✅ CORRECT
   EXPO_PUBLIC_API_URL=https://api.geoleap.app
   ```

2. **Restart bundler:**
   ```bash
   # Stop server (Ctrl+C)
   npx expo start --clear
   ```

3. **Check .env file location:**
   ```bash
   # Must be in mobile/ directory
   ls -la mobile/.env
   ```

4. **Install dotenv package:**
   ```bash
   npm install react-native-dotenv --save-dev
   ```

---

## Advanced Configuration

### Custom API Interceptors

Add custom request/response interceptors:

```typescript
import ApiService from '../services/api/ApiService';

// Add request interceptor
ApiService.addRequestInterceptor({
  onRequest: async (config) => {
    console.log('Request:', config);
    // Add custom headers
    config.headers = {
      ...config.headers,
      'X-Custom-Header': 'value',
    };
    return config;
  },
});

// Add response interceptor
ApiService.addResponseInterceptor({
  onResponse: async (response) => {
    console.log('Response:', response);
    return response;
  },
  onResponseError: async (error) => {
    console.error('Error:', error);
    // Custom error handling
    return Promise.reject(error);
  },
});
```

### Custom Error Handling

Override default error handling:

```typescript
import { apiConfig, API_ERROR_CODES } from '../config/api';

// Custom error handler
function handleApiError(error: any) {
  if (error.code === API_ERROR_CODES.AUTHENTICATION_ERROR) {
    // Redirect to login
    navigation.navigate('Login');
  } else if (error.code === API_ERROR_CODES.NETWORK_ERROR) {
    // Show offline banner
    showOfflineBanner();
  } else {
    // Show generic error
    showErrorToast(error.message);
  }
}
```

### Custom Cache Configuration

Configure cache behavior:

```typescript
import { CacheService } from '../services/api/CacheService';

const cacheService = new CacheService();

// Set custom TTL for specific endpoints
const CACHE_CONFIG = {
  '/api/user/profile': 600000,    // 10 minutes
  '/api/movies': 300000,           // 5 minutes
  '/api/trending': 60000,          // 1 minute
};

// Use in API calls
const response = await ApiService.get('/api/movies', {
  cacheTTL: CACHE_CONFIG['/api/movies'],
});
```

### Network Quality Monitoring

Monitor network quality:

```typescript
import { NetworkService } from '../services/api/NetworkService';

const networkService = new NetworkService();

// Get connection quality
const quality = await networkService.getConnectionQuality();
console.log('Network quality:', quality); // 'poor', 'moderate', 'good'

// Adjust behavior based on quality
if (quality === 'poor') {
  // Reduce image quality
  // Skip non-essential requests
  // Increase cache usage
}
```

---

## Validation Checklist

Before deploying, verify:

- [x] `.env` file configured with production values
- [x] `EXPO_PUBLIC_API_URL` points to production backend
- [x] Google OAuth client IDs configured
- [x] Apple Sign-In enabled (iOS only)
- [x] Package name/bundle ID matches OAuth configuration
- [x] SHA-1 certificate matches Google Console
- [x] OAuth redirect URIs configured correctly
- [x] Network permissions added (Android)
- [x] App Transport Security configured (iOS)
- [x] Smoke tests pass (`npm run smoke-test`)
- [x] Build succeeds (`npm run build:all:prod`)

---

## Additional Resources

- **API Integration Guide**: [`API_INTEGRATION_GUIDE.md`](./API_INTEGRATION_GUIDE.md)
- **API Endpoints**: [`API_ENDPOINTS.md`](./API_ENDPOINTS.md)
- **Authentication Flow**: [`AUTH_FLOW_VERIFICATION.md`](./AUTH_FLOW_VERIFICATION.md)
- **Error Handling**: [`ERROR_HANDLING_VERIFICATION.md`](./ERROR_HANDLING_VERIFICATION.md)
- **Expo Documentation**: https://docs.expo.dev
- **Google Sign-In Docs**: https://developers.google.com/identity
- **Apple Sign-In Docs**: https://developer.apple.com/sign-in-with-apple

---

**Last Updated**: 2025-12-16
