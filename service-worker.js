const CACHE_NAME = 'paymesol-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/index.js',
  '/manifest.json',
  '/icons/paymesol-500x500.png',
  '/images/eurc-icon.png',
  '/images/solana2-logo.png',
  '/images/usdc-icon.png',
  '/images/paymesol.png',
  '/images/phantom.png',
  '/images/help.png',
  '/images/debros.png',
  '/images/history.png'
];

// Install Event: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Cache opened');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.error('Service Worker: Cache addAll failed', err);
      });
    })
  );
});

// Fetch Event: Handle API calls and static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API Endpoints
  const apiEndpoints = [
    'https://api.mainnet-beta.solana.com',
    'https://api.coingecko.com/api/v3/simple/price'
  ];

  if (apiEndpoints.some(endpoint => url.origin === endpoint || url.href.includes(endpoint))) {
    // Network-first for API calls
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          console.warn('Service Worker: Network fetch failed, falling back to cache', url.href);
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return new Response(JSON.stringify({ error: 'Offline and no cached data available' }), {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        })
    );
  } else {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          console.log('Service Worker: Serving from cache', url.href);
          return response;
        }
        return fetch(event.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => {
          console.error('Service Worker: Fetch failed for', url.href);
          return new Response('Offline and resource not cached', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
    );
  }
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});