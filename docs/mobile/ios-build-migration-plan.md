# iOS Build Migration Plan: EAS to Azure DevOps

## Executive Summary

This document outlines the migration plan from Expo Application Services (EAS) to Azure DevOps for iOS builds. The goal is to reduce costs while maintaining build capabilities for development, testing, and production releases.

---

## Current State Analysis

### EAS Configuration (Current)
- **Profiles**: development, simulator, preview, production
- **iOS Resource Class**: m-medium (paid tier)
- **Build Types**: Development client, internal distribution, App Store
- **Cost Driver**: Per-build pricing on EAS cloud infrastructure

### Azure DevOps Pipeline (Existing)
- **Pipeline**: "GeoLeap iOS build" (Definition ID: 12)
- **Project**: GeoLeap
- **Repository**: AngelCampa1/geoleap (GitHub)
- **Agent Pool**: Azure Pipelines (macOS-latest hosted)
- **Status**: Builds failing due to react-native-screens linking issue

---

## Current Build Failure Analysis

### Root Cause
The iOS builds are failing at the linker stage with undefined symbols:
```
Undefined symbols for architecture arm64:
  "_RNSBottomTabsCls", referenced from:
  "_RNSBottomTabsScreenCls", referenced from:
  "_RNSSafeAreaViewCls", referenced from:
  "_RNSScreenStackHostCls", referenced from:
  "_RNSSplitViewHostCls", referenced from:
  "_RNSSplitViewScreenCls", referenced from:
  "_RNSStackScreenCls", referenced from:
```

### Issue
`react-native-screens` Fabric components are not properly linked. This is a New Architecture (Fabric) issue where the native component classes aren't being registered correctly during the build.

### Fix Required
Update the Podfile or add a patch to ensure react-native-screens Fabric components are properly exported.

---

## Migration Plan

### Phase 1: Fix Current Build Issues (Priority: HIGH)

#### Task 1.1: Fix react-native-screens Linking
**Problem**: Fabric component symbols not found during linking
**Solution Options**:

1. **Option A - Podfile Fix** (Recommended):
   ```ruby
   # In Podfile, ensure modular headers for RNScreens
   pod 'RNScreens', :path => '../node_modules/react-native-screens', :modular_headers => true
   ```

2. **Option B - Patch Package**:
   Create a patch for `react-native-screens` to export the missing symbols.

3. **Option C - Version Update**:
   Check if a newer version of `react-native-screens` fixes this issue.

#### Task 1.2: Verify Simulator Build
- Ensure the simulator build passes before moving to device builds
- Current pipeline builds for `iphonesimulator` SDK which doesn't require signing

### Phase 2: Configure Code Signing (Priority: HIGH)

#### Task 2.1: Apple Developer Account Setup
Required artifacts from Apple Developer Portal:
- [ ] Distribution Certificate (.p12 file)
- [ ] Development Certificate (.p12 file)
- [ ] App Store Provisioning Profile
- [ ] Ad Hoc Provisioning Profile (for internal testing)
- [ ] Development Provisioning Profile

#### Task 2.2: Azure DevOps Secure Files
Upload to Azure DevOps Library > Secure Files:
1. `ios-distribution.p12` - Distribution certificate
2. `ios-development.p12` - Development certificate
3. `appstore.mobileprovision` - App Store profile
4. `adhoc.mobileprovision` - Ad Hoc profile

#### Task 2.3: Pipeline Variables (Secret)
Configure in Azure DevOps Pipeline Variables:
- `APPLE_CERTIFICATE_PASSWORD` - P12 certificate password
- `APPLE_ID` - Apple ID for App Store Connect
- `APPLE_APP_SPECIFIC_PASSWORD` - For automated uploads
- `TEAM_ID` - Apple Developer Team ID

### Phase 3: Update Pipeline for Device Builds

#### Task 3.1: Add Certificate Installation Steps
```yaml
- task: InstallAppleCertificate@2
  displayName: 'Install Distribution Certificate'
  inputs:
    certSecureFile: 'ios-distribution.p12'
    certPwd: '$(APPLE_CERTIFICATE_PASSWORD)'
    keychain: 'temp'
    deleteCert: true

- task: InstallAppleProvisioningProfile@1
  displayName: 'Install Provisioning Profile'
  inputs:
    provisioningProfileLocation: 'secureFiles'
    provProfileSecureFile: 'appstore.mobileprovision'
```

#### Task 3.2: Archive Build Configuration
```yaml
- script: |
    xcodebuild \
      -workspace ios/$(WORKSPACE) \
      -scheme $(SCHEME) \
      -configuration Release \
      -sdk iphoneos \
      -archivePath ios/build/$(SCHEME).xcarchive \
      DEVELOPMENT_TEAM=$(TEAM_ID) \
      CODE_SIGN_IDENTITY="iPhone Distribution" \
      PROVISIONING_PROFILE_SPECIFIER="$(PROVISIONING_PROFILE_NAME)" \
      archive
  displayName: 'Archive iOS App'
```

#### Task 3.3: Export IPA
```yaml
- script: |
    xcodebuild \
      -exportArchive \
      -archivePath ios/build/$(SCHEME).xcarchive \
      -exportPath ios/build \
      -exportOptionsPlist ios/ExportOptions.plist
  displayName: 'Export IPA'
```

### Phase 4: App Store Submission (Optional)

#### Task 4.1: Create ExportOptions.plist
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadSymbols</key>
    <true/>
    <key>uploadBitcode</key>
    <false/>
</dict>
</plist>
```

#### Task 4.2: Automated Upload to App Store Connect
```yaml
- script: |
    xcrun altool --upload-app \
      --type ios \
      --file "ios/build/$(SCHEME).ipa" \
      --username "$(APPLE_ID)" \
      --password "$(APPLE_APP_SPECIFIC_PASSWORD)"
  displayName: 'Upload to App Store Connect'
```

Or using `xcrun notarytool` for newer Xcode versions.

---

## Pipeline Profiles Mapping

| EAS Profile | Azure DevOps Stage | Purpose |
|-------------|-------------------|---------|
| development | SimulatorBuild | Dev client for testing |
| simulator | SimulatorBuild | Simulator builds |
| preview | AdHocBuild | Internal testing (TestFlight alternative) |
| production | AppStoreBuild | App Store submission |

---

## Cost Comparison

### EAS Costs (Estimated)
- Build minutes on m-medium: ~$0.08/minute
- Average iOS build: 15-25 minutes
- **Cost per build**: ~$1.20 - $2.00
- **Monthly (20 builds)**: ~$24 - $40

### Azure DevOps Costs
- Microsoft-hosted macOS agents: Included in Azure DevOps subscription
- **Free tier**: 1,800 minutes/month for private projects
- **Additional**: $40/month for unlimited parallel jobs
- **Cost per build**: $0 (within free tier) or ~$0.02/minute

### Savings
- **Potential monthly savings**: $20-40+ depending on build frequency
- **Additional benefit**: Unified CI/CD in Azure DevOps

---

## Immediate Action Items

### 1. Fix Build Failure (Do First)
```bash
# Option 1: Update react-native-screens
cd mobile
npm install react-native-screens@latest

# Option 2: Clean rebuild
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
```

### 2. Test Locally Before Pipeline
```bash
# On a Mac, run:
cd mobile/ios
xcodebuild -workspace GeoLeap.xcworkspace \
  -scheme GeoLeapMobileFresh \
  -configuration Release \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO \
  build
```

### 3. Update Pipeline YAML
The existing `ios-build.yml` needs:
- Fix for react-native-screens issue
- Device build stage (commented out currently)
- Code signing configuration

---

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Fix Build | 1-2 days | Access to codebase |
| Phase 2: Code Signing | 1-2 days | Apple Developer certificates |
| Phase 3: Device Builds | 1 day | Phase 1 + Phase 2 |
| Phase 4: App Store | 1 day | Phase 3 + App Store Connect setup |

**Total estimated time**: 4-7 days

---

## Rollback Plan

If Azure DevOps builds become problematic:
1. EAS configuration is preserved in `eas.json`
2. Can revert to EAS builds immediately with: `eas build --platform ios`
3. No code changes required for rollback

---

## Next Steps

1. **Immediate**: Fix the react-native-screens linking issue
2. **This Week**: Get simulator build passing in Azure DevOps
3. **Next Week**: Set up code signing and device builds
4. **Future**: Add App Store Connect automation

---

## References

- [Azure DevOps iOS Signing](https://docs.microsoft.com/en-us/azure/devops/pipelines/apps/mobile/xcode-ios)
- [React Native Screens Issues](https://github.com/software-mansion/react-native-screens/issues)
- [Expo Prebuild Documentation](https://docs.expo.dev/workflow/prebuild/)
