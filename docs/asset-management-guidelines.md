# Asset Management Guidelines - GeoLeap Project

## 📋 Overview

This document outlines the asset management strategy for the GeoLeap project, covering shared assets between frontend and mobile applications, organization standards, and best practices.

## 🗂️ Project Structure

```
GeoLeap/
├── assets/                     # Root-level shared assets
│   ├── images/                 # Original source images
│   ├── icons/                  # Original icon files
│   └── logos/                  # Brand assets
├── frontend/
│   └── public/
│       ├── favicon/            # Frontend favicon assets
│       │   ├── favicon.ico
│       │   ├── favicon-16x16.png
│       │   ├── favicon-32x32.png
│       │   ├── favicon-48x48.png
│       │   ├── favicon-96x96.png
│       │   ├── favicon-192x192.png
│       │   ├── favicon-512x512.png
│       │   ├── favicon-152x152.png
│       │   ├── favicon.svg
│       │   └── site.webmanifest
│       └── icons/              # PWA icons
├── mobile/
│   └── assets/
│       ├── images/
│       │   ├── icons/          # Mobile app icons
│       │   │   └── app-icon.svg
│       │   └── logos/          # Mobile logos
│       │       └── geoleap-logo.svg
│       └── (platform-specific assets)
└── docs/                       # Documentation
```

## 🎨 Asset Categories

### 1. Favicon Assets (Frontend)
- **Location**: `frontend/public/favicon/`
- **Formats**: ICO, PNG (multiple sizes), SVG
- **Sizes**: 16x16, 32x32, 48x48, 96x96, 192x192, 512x512, 152x152
- **Usage**: Browser tabs, bookmarks, PWA icons

### 2. App Icons (Mobile)
- **Location**: `mobile/assets/images/icons/`
- **Format**: SVG (vector format for scalability)
- **Usage**: React Native app icons, platform-specific builds

### 3. Logo Assets
- **Frontend**: Referenced via `/favicon/` directory
- **Mobile**: SVG files in `mobile/assets/images/logos/`
- **Usage**: Brand consistency across platforms

## 🔧 Configuration Files

### Frontend (Next.js)
- **Layout Configuration**: `frontend/src/app/layout.tsx`
- **Metadata**: Properly configured favicon paths
- **Manifest**: `frontend/public/favicon/site.webmanifest`

### Mobile (React Native)
- **App Configuration**: `mobile/app.json`
- **Android Manifest**: `mobile/android/app/src/main/AndroidManifest.xml`
- **iOS Info.plist**: `mobile/ios/StreamVPN/Info.plist`

## 📏 Asset Standards

### File Naming Conventions
- **Favicons**: `favicon-[size].png` (e.g., `favicon-32x32.png`)
- **App Icons**: `app-icon.svg` (vector format preferred)
- **Logos**: `[brand]-logo.svg` (e.g., `geoleap-logo.svg`)

### Format Specifications
- **Favicons**: ICO for legacy browsers, PNG for modern browsers
- **Mobile Icons**: SVG for scalability
- **PWA Icons**: PNG in required sizes
- **Logos**: SVG for crisp rendering at any size

### Size Requirements
- **Favicon ICO**: 16x16, 32x32, 48x48
- **Favicon PNG**: 16x16, 32x32, 48x48, 96x96, 192x192, 512x512
- **Apple Touch**: 152x152, 192x192, 512x512
- **Mobile App Icons**: Platform-specific (handled by build process)

## 🔄 Asset Sharing Strategy

### Shared Source Assets
- **Original Files**: Stored in root `assets/` directory
- **Derivative Assets**: Generated for specific platforms
- **Version Control**: Track all asset changes in Git

### Platform-Specific Assets
- **Frontend**: Optimized for web browsers and PWA
- **Mobile**: Optimized for iOS and Android native apps
- **No Duplication**: Avoid duplicate files across platforms

## 🚀 Build Process

### Frontend Build
1. Favicon assets are served from `/favicon/` directory
2. PWA manifest references correct icon paths
3. No build-time asset processing required

### Mobile Build
1. React Native handles platform-specific icon generation
2. SVG assets are converted to required formats
3. Platform-specific configurations applied automatically

## 🛠️ Maintenance Guidelines

### Adding New Assets
1. **Store Original**: Place source files in `assets/` directory
2. **Generate Derivatives**: Create platform-specific versions
3. **Update Configuration**: Modify relevant config files
4. **Test All Platforms**: Verify assets appear correctly

### Updating Existing Assets
1. **Check Dependencies**: Identify all platforms using the asset
2. **Update All Versions**: Maintain consistency across platforms
3. **Update Configurations**: Modify metadata if needed
4. **Test Changes**: Verify all platforms display correctly

### Asset Cleanup
- **Remove Unused**: Delete assets no longer referenced
- **Consolidate Duplicates**: Merge similar assets
- **Update References**: Remove broken links or references

## 📱 Platform-Specific Notes

### Next.js Frontend
- **Static Serving**: All assets served from `/public/` directory
- **Metadata API**: Use Next.js metadata for SEO and social sharing
- **PWA Support**: Progressive Web App functionality via manifest

### React Native Mobile
- **Vector Icons**: SVG format preferred for scalability
- **Platform Build**: Icons generated during build process
- **Native Integration**: Platform-specific configurations applied

## ✅ Best Practices

1. **Use Vector Formats**: SVG for logos and icons when possible
2. **Optimize File Sizes**: Compress images without losing quality
3. **Maintain Consistency**: Keep branding consistent across platforms
4. **Test Thoroughly**: Verify assets work on all target platforms
5. **Document Changes**: Update this documentation when making changes
6. **Version Control**: Commit all asset changes with clear messages

## 🔍 Troubleshooting

### Common Issues
- **Favicon Not Loading**: Check file paths and server configuration
- **Icon Not Displaying**: Verify format and size requirements
- **Asset Conflicts**: Ensure no duplicate files in same directory

### Resolution Steps
1. **Verify Paths**: Check all file references are correct
2. **Clear Cache**: Clear browser/build caches
3. **Check Formats**: Ensure files are in correct formats
4. **Review Configuration**: Check metadata and manifest files
5. **Test Locally**: Verify changes work before deployment

## 📞 Contact

For questions about asset management or to report issues, contact the development team or create an issue in the project repository.