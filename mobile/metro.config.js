const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for additional asset extensions
config.resolver.assetExts.push('png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ttf', 'otf');

// Watch the assets folder
config.watchFolders = [
  path.resolve(__dirname, 'assets'),
];

module.exports = config;
