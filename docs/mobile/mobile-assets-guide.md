# Mobile App Asset Management Guide

## Overview

The GeoLeap mobile app is configured to use assets from the **root `/assets` directory** of the project. This ensures consistency across all platforms (mobile, web, backend) and simplifies asset management.

## Asset Configuration

### Metro Bundler Configuration

The Metro bundler (`mobile/metro.config.js`) is configured to:

1. **Watch the root assets directory**: Monitors `/assets` for changes
2. **Resolve asset paths**: Supports `@assets` alias for clean imports
3. **Support multiple asset types**: PNG, JPG, JPEG, SVG, GIF, WEBP

```javascript
// metro.config.js configuration
watchFolders: [
  path.resolve(__dirname, '..', 'assets'),
  path.resolve(__dirname),
],

alias: {
  '@assets': path.resolve(__dirname, '..', 'assets'),
}
```

### TypeScript Configuration

TypeScript (`mobile/tsconfig.json`) includes path mapping for type safety:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@assets/*": ["../assets/*"]
    }
  }
}
```

### Babel Configuration

Babel (`mobile/babel.config.js`) uses `babel-plugin-module-resolver` for runtime resolution:

```javascript
alias: {
  '@assets': '../assets',
}
```

## Asset Usage

### Method 1: Using Asset Constants (Recommended)

Import predefined asset constants from `@/assets`:

```typescript
import { LOGOS, SVG_LOGOS } from '@/assets';

// Use in components
<Image source={LOGOS.geoleapTransparent} style={styles.logo} />
<SvgImage source={SVG_LOGOS.simplified} />
```

**Available Constants:**

```typescript
LOGOS = {
  geoleapOriginal,      // GeaLeap original logo.png
  geoleapTransparent,   // logo transparent.png
  simplified,           // simplified logo.png
  simplifiedTransparent // simplified transparent.png
}

SVG_LOGOS = {
  geoleapOriginal,      // GeoLeap original svg.svg
  simplified,           // simplified svg.svg
  simplifiedTransparent,// simplified svg transparent.svg
  svgTransparent        // svg transparent.svg
}
```

### Method 2: Direct Import with @assets Alias

Import assets directly using the `@assets` alias:

```typescript
import logo from '@assets/logo transparent.png';
import simplifiedSvg from '@assets/simplified svg.svg';

<Image source={logo} />
```

### Method 3: Require Statement (Legacy)

Use `require()` for dynamic asset loading:

```typescript
const logo = require('@assets/GeaLeap original logo.png');
<Image source={logo} />
```

## Asset Organization

### Root Assets Directory Structure

```
/assets/
  ├── GeaLeap original logo.png
  ├── GeoLeap original svg.svg
  ├── logo transparent.png
  ├── simplified logo.png
  ├── simplified transparent.png
  ├── simplified svg.svg
  ├── simplified svg transparent.svg
  └── svg transparent.svg
```

### Adding New Assets

1. **Add to root `/assets` directory**: Place new assets in the project root `/assets` folder
2. **Update asset constants**: Edit `mobile/src/assets/index.ts` to export new assets
3. **Restart Metro bundler**: Run `npm start -- --reset-cache` to clear cache

```typescript
// mobile/src/assets/index.ts
export const LOGOS = {
  // Existing assets...
  newLogo: require('@assets/new-logo.png'),
} as const;
```

## Platform-Specific Considerations

### React Native Image Component

```typescript
import { Image } from 'react-native';
import { LOGOS } from '@/assets';

<Image
  source={LOGOS.geoleapTransparent}
  style={{ width: 200, height: 200 }}
  resizeMode="contain"
/>
```

### SVG Support

For SVG files, use `react-native-svg`:

```typescript
import { SvgUri } from 'react-native-svg';
import { SVG_LOGOS } from '@/assets';

<SvgUri
  uri={SVG_LOGOS.simplified}
  width={200}
  height={200}
/>
```

### FastImage (Optimized Image Loading)

```typescript
import FastImage from 'react-native-fast-image';
import { LOGOS } from '@/assets';

<FastImage
  source={LOGOS.geoleapTransparent}
  style={{ width: 200, height: 200 }}
  resizeMode={FastImage.resizeMode.contain}
/>
```

## Troubleshooting

### Metro Bundler Not Finding Assets

1. **Clear Metro cache**:
   ```bash
   npm start -- --reset-cache
   ```

2. **Verify watchFolders**: Ensure `metro.config.js` includes root assets directory

3. **Check file paths**: Verify asset files exist in `/assets` directory

### TypeScript Errors

1. **Install module resolver**:
   ```bash
   npm install --save-dev babel-plugin-module-resolver
   ```

2. **Clear TypeScript cache**:
   ```bash
   npm run type-check
   ```

### Build Issues

1. **Clean build cache**:
   ```bash
   cd android && ./gradlew clean
   # or
   cd ios && rm -rf build/
   ```

2. **Reinstall dependencies**:
   ```bash
   npm run clean
   npm install
   ```

## Best Practices

1. **Use asset constants**: Prefer importing from `@/assets` for type safety
2. **Optimize images**: Compress PNG/JPG files before adding to assets
3. **SVG for logos**: Use SVG format for scalable logos and icons
4. **Consistent naming**: Use kebab-case for asset filenames
5. **Document changes**: Update `mobile/src/assets/index.ts` when adding new assets

## Performance Optimization

### Image Optimization

```typescript
import FastImage from 'react-native-fast-image';
import { LOGOS } from '@/assets';

<FastImage
  source={{
    uri: LOGOS.geoleapTransparent,
    priority: FastImage.priority.high,
  }}
  style={styles.logo}
  resizeMode={FastImage.resizeMode.contain}
/>
```

### Lazy Loading

```typescript
import { Image } from 'react-native';
import { LOGOS } from '@/assets';

const LazyLogo = () => {
  const [loaded, setLoaded] = useState(false);

  return (
    <Image
      source={LOGOS.geoleapTransparent}
      onLoad={() => setLoaded(true)}
      style={[styles.logo, { opacity: loaded ? 1 : 0 }]}
    />
  );
};
```

## Integration with Other Platforms

### Web (Next.js)

Assets in `/assets` are also accessible to the Next.js frontend:

```typescript
// frontend/components/Logo.tsx
import Image from 'next/image';
import logo from '../../assets/logo transparent.png';

<Image src={logo} alt="GeoLeap" />
```

### Backend (.NET)

Backend can serve assets from `/assets` for API responses:

```csharp
// backend/Controllers/AssetsController.cs
var assetPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "assets", "logo transparent.png");
return PhysicalFile(assetPath, "image/png");
```

## Summary

- ✅ Assets stored in **root `/assets` directory**
- ✅ Accessible via **`@assets` alias**
- ✅ Type-safe imports with **asset constants**
- ✅ Supports **PNG, JPG, JPEG, SVG, GIF, WEBP**
- ✅ **Metro bundler** watches and resolves assets
- ✅ **Cross-platform compatibility** (mobile, web, backend)

For questions or issues, refer to the [Metro Configuration Guide](https://metrobundler.dev/docs/configuration) or open an issue.
