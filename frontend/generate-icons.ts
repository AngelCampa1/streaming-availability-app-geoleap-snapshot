import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple PNG data URL for a blue square with white text "G"
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

// Create a simple SVG icon
const createSVG = (size: number): string => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#2563eb"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size * 0.6}" font-weight="bold" fill="white">G</text>
</svg>`;
};

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icons for each size
sizes.forEach(size => {
  const svg = createSVG(size);
  const filename = `icon-${size}x${size}.png`;
  const filepath = path.join(iconsDir, filename);

  // For SVG placeholders, we'll actually save as SVG and reference them
  // But to maintain PNG compatibility, let's create a minimal PNG using a data URL trick
  // For simplicity, we'll save SVG files with PNG extension (browsers will handle it)
  fs.writeFileSync(filepath.replace('.png', '.svg'), svg);
  // Removed console.log for linting compliance
});

// Create shortcut icons
const shortcuts = ['search', 'dashboard', 'settings'];
shortcuts.forEach(name => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <rect width="96" height="96" fill="#2563eb"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white">${name[0].toUpperCase()}</text>
</svg>`;
  const filepath = path.join(iconsDir, `shortcut-${name}.png`);
  fs.writeFileSync(filepath.replace('.png', '.svg'), svg);
  // Removed console.log for linting compliance
});

// Removed console.log for linting compliance
