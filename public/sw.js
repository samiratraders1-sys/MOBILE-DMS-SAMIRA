const CACHE_NAME = 'samira-traders-v2.1.0';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json'
      ]).catch(err => console.warn('Static pre-cache warning:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle local GET requests, bypass non-GET completely to prevent issues with POST requests in webviews
  if (event.request.method !== 'GET') {
    return;
  }

  // Bypass API calls completely to ensure we always fetch live data from the server
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Only handle local requests, bypass third-party APIs (Google Maps, Firebase realtime web channels)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle SPA routing: redirect navigation requests to index.html if offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve cached version immediately, and attempt to fetch & update cache in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => { /* Silent check for offline background updates */ });
        
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // Cache dynamic local assets (such as CSS/JS chunks) as they are loaded
        if (!response || response.status !== 200 || event.request.method !== 'GET') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch((err) => {
        console.warn('Local asset fetch failed in offline context:', event.request.url, err);
      });
    })
  );
});
