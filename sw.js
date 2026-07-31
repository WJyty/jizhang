// Service Worker for 记账本 PWA
const CACHE_NAME = 'accounting-v2';
const SHARE_CACHE = 'shared-images';

// Files to cache for offline use
const PRECACHE_URLS = [
  '/accounting.html',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

// Install: pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((n) => n !== CACHE_NAME && n !== SHARE_CACHE)
          .map((n) => caches.delete(n))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: serve cached or network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle Web Share Target - image shared from system
  if (event.request.method === 'POST' && url.pathname.endsWith('/accounting.html')) {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // Normal fetch: cache-first for static, network-first for CDN
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Handle Web Share Target POST
async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');

    if (image && image instanceof Blob) {
      // Store in dedicated cache
      const cache = await caches.open(SHARE_CACHE);
      // Convert blob to a Response and store
      const response = new Response(image, {
        headers: { 'Content-Type': image.type || 'image/png' }
      });
      await cache.put('/__shared_image', response);

      // Notify all clients about the shared image
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        client.postMessage({ type: 'SHARE_IMAGE_READY' });
      });
    }

    // Redirect to app with share flag
    return Response.redirect('/accounting.html?share=1', 303);
  } catch (err) {
    console.error('Share target error:', err);
    return Response.redirect('/accounting.html', 303);
  }
}
