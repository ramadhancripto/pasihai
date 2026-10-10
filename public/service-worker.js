// ══════════════════════════════════════════════════════════════
// PASIHAI — SERVICE WORKER
//
// Madhumuni:
//   - Cache static assets (JS, CSS, images) kwa offline access
//   - Cache API responses kwa muda mfupi
//   - Kutoa offline fallback page
//
// Mkakati:
//   - Static assets: Cache First (haraka, offline-friendly)
//   - API calls: Network First (up-to-date, fallback to cache)
//   - Navigation: Network First with offline fallback
//
// Kumbuka:
//   - Service Worker inafanya kazi kwenye HTTPS tu (isipokuwa localhost)
//   - Haifanyi kazi kwenye incognito/private mode
//   - Inahitaji user interaction kabla ya kuonyesha notifications
// ══════════════════════════════════════════════════════════════

const CACHE_NAME = 'pasihai-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
]

// ============================================================================
// INSTALL EVENT - Cache static assets
// ============================================================================
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install')
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching static assets')
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        // Kama asset moja inashindwa, endelea na zilizobaki
        console.warn('[ServiceWorker] Some assets failed to cache:', err)
      })
    })
  )
  
  // Activate immediately (don't wait for old SW to be released)
  self.skipWaiting()
})

// ============================================================================
// ACTIVATE EVENT - Clean up old caches
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  
  // Take control of all open pages immediately
  self.clients.claim()
})

// ============================================================================
// FETCH EVENT - Intercept network requests
// ============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests (POST, PUT, DELETE, etc.)
  if (request.method !== 'GET') {
    return
  }
  
  // Skip cross-origin requests (Supabase, external APIs)
  if (url.origin !== location.origin) {
    return
  }
  
  // Static assets: Cache First
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request))
    return
  }
  
  // HTML navigation: Network First with fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, '/index.html'))
    return
  }
  
  // Other requests: Network First
  event.respondWith(networkFirst(request))
})

// ============================================================================
// CACHING STRATEGIES
// ============================================================================

/**
 * Cache First: Try cache, fallback to network
 * Best for: Static assets (JS, CSS, images, fonts)
 */
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }
  
  try {
    const response = await fetch(request)
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (err) {
    // Network failed, no cache available
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    })
  }
}

/**
 * Network First: Try network, fallback to cache (or fallback page)
 * Best for: HTML pages, API calls
 */
async function networkFirst(request, fallbackUrl = null) {
  try {
    const response = await fetch(request)
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (err) {
    // Network failed, try cache
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }
    
    // No cache, try fallback URL
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl)
      if (fallback) {
        return fallback
      }
    }
    
    // Nothing available
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    })
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if path is a static asset
 */
function isStaticAsset(pathname) {
  return (
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.ttf')
  )
}

// ============================================================================
// MESSAGE HANDLER - Allow page to communicate with SW
// ============================================================================
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting()
  }
  
  if (event.data === 'clearCache') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log('[ServiceWorker] Cache cleared')
      })
    )
  }
})
