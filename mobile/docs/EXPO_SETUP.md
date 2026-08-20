# GeoLeap - Expo & EAS Build Setup Guide

This document explains how to use Expo and EAS Build to publish your app to the App Store and Google Play.

## Prerequisites

1. **Node.js 18+** installed
2. **Expo Account** - Create one at [expo.dev](https://expo.dev)
3. **Apple Developer Account** (for iOS) - $99/year
4. **Google Play Developer Account** (for Android) - $25 one-time

## Initial Setup

### 1. Login to Expo

```bash
cd mobile
npx eas login
```

### 2. Initialize EAS Project

```bash
npx eas init
```

This will:
- Create a new project on Expo's servers
- Update `app.json` with your project ID
- Link your local project to the Expo project

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:
- `EAS_PROJECT_ID` - From Expo dashboard after `eas init`
- `EXPO_OWNER` - Your Expo username
- `APPLE_ID`, `APPLE_TEAM_ID` - From Apple Developer Portal
- `ASC_APP_ID` - App Store Connect App ID

## Build Commands

### Development Builds

Development builds include dev tools and are for internal testing:

```bash
# Android APK for development
npm run build:android:dev

# iOS development build
npm run build:ios:dev
```

### Preview Builds

Preview builds are for beta testing (TestFlight/Internal Testing):

```bash
# Android APK for preview
npm run build:android:preview

# iOS preview build
npm run build:ios:preview
```

### Production Builds

Production builds are for store submission:

```bash
# Android App Bundle for Play Store
npm run build:android:prod

# iOS build for App Store
npm run build:ios:prod

# Build both platforms
npm run build:all:prod
```

## Store Submission

### iOS (App Store)

1. First, configure your Apple credentials:
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Create your app
   - Get your ASC App ID
   - Update `eas.json` with your credentials

2. Submit to App Store:

```bash
npm run submit:ios
```

### Android (Google Play)

1. Create a service account in Google Cloud Console
2. Download the JSON key file as `google-service-account.json`
3. Enable the Google Play Developer API
4. Add the service account to your Google Play Console

```bash
npm run submit:android
```

### Submit Both Platforms

```bash
npm run submit:all
```

## Over-the-Air (OTA) Updates

Push JavaScript updates without rebuilding:

```bash
# Create an update
npm run update

# Update preview channel
npm run update:preview

# Update production channel
npm run update:production
```

## Local Development

### Start Development Server

```bash
npm start
```

### Run on Device/Emulator

```bash
# Android
npm run android

# iOS (Mac only)
npm run ios
```

### Run with Native Code (Original React Native Commands)

```bash
# Android
npm run android:native

# iOS
npm run ios:native
```

## Prebuild (Generate Native Code)

If you need to modify native code:

```bash
# Generate ios/ and android/ folders
npm run prebuild

# Clean prebuild (removes and regenerates)
npm run prebuild:clean
```

## Project Structure

```
mobile/
├── app.json           # Expo static configuration
├── app.config.js      # Expo dynamic configuration
├── eas.json           # EAS Build configuration
├── .env               # Environment variables (not in git)
├── .env.example       # Example environment file
├── assets/
│   ├── icon.png       # App icon (1024x1024)
│   ├── splash.png     # Splash screen
│   ├── adaptive-icon.png  # Android adaptive icon
│   └── favicon.png    # Web favicon
└── src/
    └── App.tsx        # Main app component
```

## Asset Requirements

| Asset | Size | Description |
|-------|------|-------------|
| `icon.png` | 1024x1024 | App icon for all platforms |
| `splash.png` | 1284x2778 | Splash screen image |
| `adaptive-icon.png` | 1024x1024 | Android adaptive icon foreground |
| `favicon.png` | 48x48 | Web favicon |

## Troubleshooting

### Clear Caches

```bash
# Clear Metro cache
npx expo start --clear

# Clear all caches
rm -rf node_modules/.cache
rm -rf .expo
npm start -- --reset-cache
```

### Check Configuration

```bash
npx expo-doctor
```

### Verify Dependencies

```bash
npx expo install --check
```

## CI/CD Integration

For GitHub Actions, add these secrets:
- `EXPO_TOKEN` - Expo access token
- `APPLE_ID` - Apple ID email
- `APPLE_TEAM_ID` - Apple Team ID
- `ASC_KEY_ID` - App Store Connect API Key ID
- `ASC_ISSUER_ID` - App Store Connect Issuer ID
- `ASC_KEY_BASE64` - Base64 encoded .p8 key
- `GOOGLE_SERVICE_ACCOUNT_BASE64` - Base64 encoded service account JSON

Example workflow:

```yaml
name: Build and Submit
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci
        working-directory: ./mobile

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build
        run: eas build --platform all --non-interactive
        working-directory: ./mobile
```

## Useful Links

- [Expo Documentation](https://docs.expo.dev)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Guidelines](https://play.google.com/about/developer-content-policy/)
