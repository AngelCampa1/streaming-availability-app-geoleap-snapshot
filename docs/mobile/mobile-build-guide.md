# Mobile Build Guide - React Native Android

## 🚀 Building the Android App

### Prerequisites
- Node.js and npm installed
- Android SDK installed
- Java JDK 17 or higher
- Android emulator or physical device connected

### Quick Start

#### Option 1: Using Helper Scripts (Recommended for Git Bash)

From the project root, run:

```bash
# Build the debug APK
bash scripts/build-android.sh

# Install to connected device/emulator
bash scripts/install-android.sh
```

#### Option 2: Using React Native CLI

**Note**: On Windows with Git Bash, you may encounter issues with `gradlew.bat` execution. Use PowerShell or CMD instead:

```powershell
# PowerShell or CMD
cd mobile
npx react-native run-android
```

#### Option 3: Direct Gradle Commands (Git Bash)

```bash
cd mobile/android

# Build debug APK
powershell.exe -Command ".\gradlew.bat assembleDebug"

# Install to device
powershell.exe -Command ".\gradlew.bat installDebug"

# Clean build
powershell.exe -Command ".\gradlew.bat clean"
```

### Build Output Locations

- **Debug APK**: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**: `mobile/android/app/build/outputs/apk/release/app-release.apk`
- **Bundle (AAB)**: `mobile/android/app/build/outputs/bundle/release/app-release.aab`

### Common Build Commands

```bash
# Build debug APK
cd mobile/android && powershell.exe -Command ".\gradlew.bat assembleDebug"

# Build release APK
cd mobile/android && powershell.exe -Command ".\gradlew.bat assembleRelease"

# Build release bundle (for Google Play)
cd mobile/android && powershell.exe -Command ".\gradlew.bat bundleRelease"

# Clean build artifacts
cd mobile/android && powershell.exe -Command ".\gradlew.bat clean"

# Install debug build to device
cd mobile/android && powershell.exe -Command ".\gradlew.bat installDebug"
```

### Troubleshooting

#### Issue: `gradlew.bat: command not found`

**Cause**: Git Bash on Windows doesn't execute `.bat` files directly.

**Solution**: Use one of these approaches:
1. Use the helper scripts: `bash scripts/build-android.sh`
2. Call via PowerShell: `powershell.exe -Command ".\gradlew.bat assembleDebug"`
3. Switch to PowerShell or CMD to run React Native commands

#### Issue: Build fails with "SDK not found"

**Solution**:
1. Set `ANDROID_HOME` environment variable to your Android SDK location
2. Add platform-tools to your PATH
3. Verify with: `echo $ANDROID_HOME` (bash) or `$env:ANDROID_HOME` (PowerShell)

#### Issue: Emulator not starting

**Solution**:
1. Check Android Studio AVD Manager
2. Ensure virtualization is enabled in BIOS
3. Try starting emulator manually: `emulator -avd <avd_name>`

### Development Workflow

1. **Start Metro bundler** (separate terminal):
   ```bash
   cd mobile
   npm start
   ```

2. **Build and install** (another terminal):
   ```bash
   bash scripts/install-android.sh
   ```

3. **Watch logs**:
   ```bash
   npx react-native log-android
   ```

### Performance Tips

- **Incremental builds**: Use `installDebug` instead of `assembleDebug` + manual install
- **Clean when needed**: Only run `clean` if you're having build issues
- **Parallel builds**: Gradle automatically uses parallel builds if configured
- **Build cache**: Keep `.gradle` directory to speed up subsequent builds

### Port Configuration

GeoLeap uses dedicated ports to avoid conflicts with other projects:
- **Metro bundler**: Port 5070
- **Backend API**: Port 8020
- **Frontend dev**: Port 3020

Configured in:
- `mobile/metro.config.js` - Metro bundler port
- `mobile/app.json` - App configuration
- Backend and frontend configs in their respective directories

## 🔧 Environment Setup Verification

Run this command to verify your React Native environment:

```bash
npx react-native doctor
```

This will check:
- Node.js version
- Android SDK installation
- Android Studio setup
- Java JDK version
- Environment variables

## 📱 Testing on Real Device

1. Enable USB debugging on your Android device
2. Connect device via USB
3. Verify connection: `adb devices`
4. Run: `bash scripts/install-android.sh`

## 🎯 Production Builds

For production releases:

```bash
cd mobile/android

# Generate release bundle for Google Play
powershell.exe -Command ".\gradlew.bat bundleRelease"

# Or generate release APK
powershell.exe -Command ".\gradlew.bat assembleRelease"
```

**Note**: Release builds require signing configuration in `android/app/build.gradle` and keystore files.

## 📚 Additional Resources

- [React Native Environment Setup](https://reactnative.dev/docs/environment-setup)
- [Android Developer Guide](https://developer.android.com/studio/build/building-cmdline)
- [Gradle Build Guide](https://docs.gradle.org/current/userguide/command_line_interface.html)
