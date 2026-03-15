const CACHE_VERSION = "v1";
const SHELL_CACHE   = `ps-shell-${CACHE_VERSION}`;
const API_CACHE     = `ps-api-${CACHE_VERSION}`;
const MEDIA_CACHE   = `ps-media-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  "/",
  "/index.html",
];

const API_PREFIXES = [
  "/api/clients",
  "/api/gallery",
  "/api/staff",
  "/api/payments",
  "/api/dashboard",
];

// ── Install ──────────────────────────────────────────────────────────────────
// Pre-cache the app shell so the UI is available immediately when offline.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch(() => {})
    ).then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
// Remove any caches from previous versions.
self.addEventListener("activate", (event) => {
  const allowed = new Set([SHELL_CACHE, API_CACHE, MEDIA_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !allowed.has(k)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests; skip cross-origin (e.g. analytics, fonts)
  if (url.origin !== self.location.origin) return;

  // ── Auth endpoints: always go to network ──
  if (url.pathname.startsWith("/api/auth")) return;

  // ── API write operations (POST / PATCH / PUT / DELETE): always network ──
  if (url.pathname.startsWith("/api/") && request.method !== "GET") return;

  // ── API GET requests: StaleWhileRevalidate ──────────────────────────────
  // Return cached data instantly (so the UI shows while offline), then
  // refresh the cache in the background when online.
  if (
    request.method === "GET" &&
    API_PREFIXES.some((p) => url.pathname.startsWith(p))
  ) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  // ── Uploaded photos / media: CacheFirst ─────────────────────────────────
  if (url.pathname.startsWith("/uploads/")) {
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
    return;
  }

  // ── Everything else (JS, CSS, HTML, images): NetworkFirst ───────────────
  // Serve from network so dev hot-reload works; fall back to cache offline.
  event.respondWith(networkFirst(request, SHELL_CACHE));
});

// ─── Strategies ──────────────────────────────────────────────────────────────

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok || networkResponse.status === 0) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // For navigation requests that have no cache, return the shell
    if (request.mode === "navigate") {
      const shell = await cache.match("/index.html") ||
                    await cache.match("/");
      if (shell) return shell;
    }
    return new Response("Offline – no cached version available.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok || networkResponse.status === 0) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  return cached || (await fetchPromise) ||
    new Response(JSON.stringify({ offline: true, data: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok || networkResponse.status === 0) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response("Offline – resource not cached.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
