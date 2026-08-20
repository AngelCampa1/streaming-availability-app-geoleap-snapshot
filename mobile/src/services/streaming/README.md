# Streaming Service Integration

This directory contains the integration with the official streaming-availability API for the GeoLeap mobile app.

## Overview

The streaming service has been updated to use the official `streaming-availability` npm package instead of relying solely on the backend API. This provides direct access to streaming content availability data with improved performance and reliability.

## Files

- `StreamingService.ts` - Main service file with official API integration
- `__tests__/StreamingService.test.ts` - Unit tests for the streaming service
- `README.md` - This documentation file

## Configuration

### API Key Setup

The streaming service requires an API key from RapidAPI for the streaming-availability service. Set up your environment variables:

#### For React Native CLI:
```bash
export STREAMING_AVAILABILITY_API_KEY=your_api_key_here
```

#### For Expo:
```bash
export EXPO_PUBLIC_STREAMING_API_KEY=your_api_key_here
```

#### For development (.env file):
```bash
STREAMING_AVAILABILITY_API_KEY=your_api_key_here
# or for Expo
EXPO_PUBLIC_STREAMING_API_KEY=your_api_key_here
```

### Configuration Manager

The `StreamingConfigManager` in `config/streaming.ts` handles:

- API key management
- Platform-specific settings
- Default country and language settings
- Timeout and retry configurations
- React Native compatibility

## Usage

### Basic Search

```typescript
import StreamingService from '../services/streaming/StreamingService';

// Search for content
const results = await StreamingService.searchContent('Stranger Things', {
  type: ['tv'],
  genres: ['Drama', 'Horror'],
  yearRange: { min: 2016, max: 2023 }
});

console.log(results.results); // Array of SearchResult
console.log(results.pagination); // Pagination info
```

### Content Details

```typescript
// Get detailed information about specific content
const details = await StreamingService.getContentDetails('tt0944947');
console.log(details.content.title); // "Game of Thrones"
console.log(details.availability); // Streaming options by country
```

### Recommendations

```typescript
// Get recommendations based on content
const recommendations = await StreamingService.getRecommendations('tt0944947');
console.log(recommendations); // Array of similar content
```

### Popular Content

```typescript
// Get popular content
const popular = await StreamingService.getPopularContent('movie', 'us', 20);
console.log(popular); // Array of popular movies
```

### Search Suggestions

```typescript
// Get autocomplete suggestions
const suggestions = await StreamingService.getSearchSuggestions('Stranger', 10);
console.log(suggestions); // Array of search suggestions
```

## Data Models

### SearchResult

```typescript
interface SearchResult {
  content: StreamingContent;      // Basic content information
  availability: StreamingAvailability[]; // Where it's available
  relevanceScore: number;         // Search relevance score
  popularity?: number;           // Popularity score
  userRating?: number;           // User rating
  watchlistAdded?: boolean;      // If in user's watchlist
}
```

### StreamingContent

```typescript
interface StreamingContent {
  id: string;                   // Content ID (IMDb/TMDB)
  title: string;                // Title
  description?: string;         // Description
  type: 'movie' | 'tv' | 'documentary' | 'anime' | 'series';
  poster?: string;              // Poster URL
  backdrop?: string;            // Backdrop URL
  releaseYear?: number;         // Release year
  rating?: number;              // Rating
  genres?: string[];            // Genres
  duration?: number;            // Duration in minutes
  seasons?: number;             // Number of seasons (TV)
  episodeCount?: number;        // Episode count (TV)
  director?: string;            // Director
  cast?: string[];              // Cast
  language?: string;            // Language
  imdbId?: string;              // IMDb ID
  tmdbId?: number;              // TMDB ID
}
```

### StreamingAvailability

```typescript
interface StreamingAvailability {
  contentId: string;            // Content ID
  service: StreamingService;    // Streaming service info
  country: Country;             // Country availability
  available: boolean;           // If available
  quality?: 'SD' | 'HD' | '4K'; // Video quality
  subtitles?: string[];         // Available subtitles
  audioLanguages?: string[];    // Audio languages
  price?: number;               // Price
  currency?: string;            // Currency
  purchaseType?: 'subscription' | 'rental' | 'purchase' | 'free';
  addedDate?: Date;             // When added
  leavingDate?: Date;           // When leaving
}
```

## React Native Compatibility

The service is specifically designed for React Native compatibility:

- **Platform Detection**: Automatically detects iOS/Android
- **Network Handling**: Proper timeout and retry logic for mobile networks
- **Offline Support**: Falls back to cached data when offline
- **Error Handling**: Mobile-friendly error messages and fallbacks
- **Performance**: Optimized for mobile memory and processing constraints

## Features

### ✅ Implemented

- [x] Official streaming-availability API integration
- [x] Content search with advanced filters
- [x] Content details and metadata
- [x] Recommendations system
- [x] Popular content discovery
- [x] Search suggestions/autocomplete
- [x] Multi-country support
- [x] Multiple streaming services
- [x] React Native compatibility
- [x] Offline/fallback support
- [x] TypeScript types
- [x] Error handling and logging

### 🔄 Features with Mock Data

When the API key is not available or API calls fail, the service falls back to mock data for:

- Search results
- Popular content
- Recommendations
- Search suggestions

### ⚙️ Configuration Options

```typescript
interface StreamingConfig {
  apiKey: string;           // API key (required)
  baseURL: string;          // API base URL
  defaultCountry: string;   // Default country (US)
  defaultLanguage: string;  // Default language (en)
  timeout: number;          // Request timeout (15s)
  retryAttempts: number;    // Retry attempts (3)
  enableCache: boolean;     // Enable caching (true)
  cacheExpiry: number;      // Cache expiry (5 min)
}
```

## Error Handling

The service provides comprehensive error handling:

- **API Key Missing**: Falls back to mock data with warning
- **Network Errors**: Retry logic with exponential backoff
- **Invalid Responses**: Graceful degradation with mock data
- **Rate Limiting**: Automatic retry with delay
- **Timeouts**: Configurable timeout handling

## Testing

Run the streaming service tests:

```bash
npm test -- --testPathPatterns=StreamingService.test.ts
```

The test suite includes:
- Mock API responses
- Error scenarios
- Filter and pagination testing
- Configuration validation

## Migration from Backend API

### Before (Backend API)

```typescript
// Old approach using backend
const response = await ApiService.get('/streaming/search', {
  params: { q: 'Stranger Things' }
});
```

### After (Official API)

```typescript
// New approach using official API
const response = await StreamingService.searchContent('Stranger Things');
```

## Performance Considerations

- **Caching**: Results are cached for 5 minutes to reduce API calls
- **Pagination**: Implements proper pagination for large result sets
- **Debouncing**: Search suggestions are debounced to reduce API calls
- **Memory Management**: Automatic cleanup of old cache entries

## Security

- **API Key Protection**: API keys are managed through environment variables
- **HTTPS**: All API calls use HTTPS encryption
- **Input Validation**: All user inputs are validated before API calls
- **Error Sanitization**: Sensitive information is not exposed in error messages

## Troubleshooting

### Common Issues

1. **API Key Not Found**
   - Ensure environment variables are set correctly
   - Check React Native CLI vs Expo environment variable patterns

2. **Network Timeouts**
   - Increase timeout in configuration
   - Check network connectivity
   - Verify API key is valid

3. **TypeScript Errors**
   - Ensure all dependencies are installed
   - Run `npm run type-check` to verify compilation

4. **Mock Data Fallbacks**
   - This is normal when API key is missing
   - Check logs for API key warnings

### Debug Mode

Enable debug logging:

```typescript
import { logger } from '../utils/logger';
logger.setLevel(LogLevel.DEBUG);
```

## Contributing

When modifying the streaming service:

1. Update TypeScript types if changing data models
2. Add appropriate tests for new functionality
3. Update documentation for new features
4. Test with both real API and mock data
5. Verify React Native compatibility

## Support

For issues related to:
- **streaming-availability API**: Check their official documentation
- **React Native integration**: Refer to React Native docs
- **Mobile-specific issues**: Check platform compatibility
- **API key issues**: Verify RapidAPI setup