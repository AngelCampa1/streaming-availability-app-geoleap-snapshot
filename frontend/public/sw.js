const CACHE_NAME = 'geoleap-v1.0.0';
const STATIC_CACHE_NAME = 'geoleap-static-v1.0.0';
const API_CACHE_NAME = 'geoleap-api-v1.0.0';

// Static assets to cache on install (excluding missing icons)
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/search',
  '/pricing',
  '/auth/login',
  '/auth/register'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/search',
  '/api/autocomplete',
  '/api/trending'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  // Installing service worker
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        // Caching static assets
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(API_CACHE_NAME) // Just open the cache, don't pre-populate
    ])
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  // Activating service worker
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && 
              cacheName !== API_CACHE_NAME && 
              cacheName !== CACHE_NAME) {
            // Deleting old cache: cacheName
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests and non-GET requests
  if (url.origin !== self.location.origin || event.request.method !== 'GET') {
    return;
  }

  // Handle different request types
  if (url.pathname.startsWith('/api/')) {
    // API requests - cache first with network fallback
    event.respondWith(handleApiRequest(event.request));
  } else if (url.pathname.includes('.')) {
    // Static assets - cache first with network fallback
    event.respondWith(handleStaticAsset(event.request));
  } else {
    // Navigation requests - network first with cache fallback
    event.respondWith(handleNavigation(event.request));
  }
});

// Handle API requests with caching strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try cache first for certain endpoints
    if (shouldCacheApiEndpoint(url.pathname)) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        // Return cached response and update in background
        updateCacheInBackground(request);
        return cachedResponse;
      }
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200 && shouldCacheApiEndpoint(url.pathname)) {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(API_CACHE_NAME);
      await cache.put(request, responseToCache);
    }
    
    return networkResponse;
    
  } catch (error) {
    // Network error, trying cache
    console.warn('Network error:', error);
    
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for search endpoints
    if (url.pathname.includes('/search')) {
      return new Response(JSON.stringify({
        error: 'You appear to be offline',
        offline: true,
        cached: false
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 503
      });
    }
    
    throw error;
  }
}

// Handle static assets
async function handleStaticAsset(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network and cache
    const networkResponse = await fetch(request);
    
    if (networkResponse.status === 200) {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(STATIC_CACHE_NAME);
      await cache.put(request, responseToCache);
    }
    
    return networkResponse;
    
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Handle navigation requests
async function handleNavigation(request) {
  try {
    // Network first for HTML pages
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(STATIC_CACHE_NAME);
      await cache.put(request, responseToCache);
    }
    
    return networkResponse;
    
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // Network error for navigation, trying cache
    
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    const offlineResponse = await caches.match('/');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Last resort - return basic offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>GeoLeap - Offline</title>
          <style>
            body { 
              font-family: system-ui, sans-serif; 
              text-align: center; 
              padding: 2rem;
              color: #374151;
            }
            .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
            .offline-title { font-size: 2rem; margin-bottom: 1rem; }
            .offline-message { font-size: 1.1rem; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="offline-icon">📡</div>
          <h1 class="offline-title">You're Offline</h1>
          <p class="offline-message">
            Please check your internet connection and try again.<br>
            Some content may be available from cache.
          </p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
      status: 503
    });
  }
}

// Update cache in background
async function updateCacheInBackground(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(API_CACHE_NAME);
      await cache.put(request, responseToCache);
    }
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // Ignore background update errors
    // Background update failed
  }
}

// Determine which API endpoints should be cached
function shouldCacheApiEndpoint(pathname) {
  const cacheableEndpoints = [
    '/api/autocomplete',
    '/api/trending',
    '/api/popular',
    '/api/genres'
  ];
  
  return cacheableEndpoints.some(endpoint => pathname.includes(endpoint));
}

// Message handling for cache updates and PWA install prompts
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_SEARCH':
      // Cache a search result for offline access
      if (payload && payload.url && payload.data) {
        cacheSearchResult(payload.url, payload.data);
      }
      break;
      
    case 'CLEAR_CACHE':
      // Clear all caches
      clearAllCaches();
      break;
      
    case 'GET_CACHE_SIZE':
      // Return cache size information
      getCacheSize().then(size => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
      });
      break;
  }
});

// Cache search results
async function cacheSearchResult(url, data) {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(url, response);
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // Failed to cache search result
  }
}

// Clear all caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    // All caches cleared
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // Failed to clear caches
  }
}

// Get cache size information
async function getCacheSize() {
  try {
    let totalSize = 0;
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const size = (await response.blob()).size;
          totalSize += size;
        }
      }
    }
    
    return {
      totalSize,
      cacheCount: cacheNames.length,
      formattedSize: formatBytes(totalSize)
    };
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // Failed to get cache size
    return { totalSize: 0, cacheCount: 0, formattedSize: '0 bytes' };
  }
}

// Format bytes to human readable string
function formatBytes(bytes) {
  if (bytes === 0) return '0 bytes';
  const k = 1024;
  const sizes = ['bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Service worker loaded