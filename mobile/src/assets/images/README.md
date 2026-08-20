# Assets Directory

This directory contains placeholder images and assets used by the enhanced search interface.

## Required Images

The following placeholder images are referenced in the search components:

### Poster Placeholders
- `placeholder-poster.png` - Default poster image for movies and TV shows (80x120px for list, 150x225px for grid)
- `placeholder-backdrop.png` - Default backdrop image (larger size)

### Service Icons
- `placeholder-service.png` - Default streaming service icon (16x16px)

### Icons
The components use React Native Vector Icons (Material Icons) for most UI elements.

## Implementation Notes

In a production app, these placeholder images should be replaced with:
1. Real poster images from the API (TMDB, etc.)
2. Actual streaming service icons
3. Properly sized image assets for different screen densities

## Image Optimization

For optimal performance:
- Use WebP format when possible
- Provide multiple resolutions for different screen densities
- Implement lazy loading for poster images
- Use caching strategies for frequently accessed images