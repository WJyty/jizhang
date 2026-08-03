// Service Worker for 记账本 PWA
const CACHE_NAME = 'accounting-v3';
const SHARE_CACHE = 'shared-images';

// Files to cache for offline use
const PRECACHE_URLS = [
  '/accounting.html',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
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

// Fetch: network-first for HTML, cache-first for CDN assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle Web Share Target - image shared from system
  if (event.request.method === 'POST' && url.pathname.endsWith('/accounting.html')) {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // Network-first for local HTML files, cache-first for CDN
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(networkFirst(event.request));
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

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
