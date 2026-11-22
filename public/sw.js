// Service Worker 版本号：变更策略时请递增，以便激活时清掉旧缓存
// v12: activate 仍全量预缓存，抢首次带宽
// v13: 首次优先——activate 只删旧缓存；全量预缓存去掉；壳仍在 install 缓存（供 PWA）
const CACHE_VERSION = "v13";
const CACHE_NAME = `pomotention-cache-${CACHE_VERSION}`;

const SOUND_CACHE_VERSION = "v1";
const SOUND_CACHE_NAME = `pomotention-sounds-${SOUND_CACHE_VERSION}`;

const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-128.png", "/icon-192.png", "/icon-512.png", "/favicon.ico"];

const FILE_TIMEOUT_MS = 15000;
const NAVIGATE_NETWORK_MS = 8000;

function addWithTimeout(cache, url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`[SW] precache timeout: ${url}`)), timeoutMs);
    cache
      .add(url)
      .then(() => {
        clearTimeout(timer);
        resolve();
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...", CACHE_VERSION);
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 只缓存壳，失败跳过；不在此拉取 /assets 清单
      await Promise.all(
        APP_SHELL.map((url) =>
          addWithTimeout(cache, url, FILE_TIMEOUT_MS).catch((err) => {
            console.warn("[Service Worker] shell precache skipped:", url, err);
          }),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== SOUND_CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
      await self.clients.claim();
    })(),
  );
});

function putInCache(request, response) {
  if (!response || response.status !== 200 || response.type !== "basic") {
    return;
  }
  const clone = response.clone();
  return caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
}

function assetsStaleWhileRevalidate(request) {
  return caches.match(request).then((cached) => {
    const fetchPromise = fetch(request)
      .then((response) => {
        if (response.ok) putInCache(request, response);
        return response;
      })
      .catch(() => null);

    if (cached) {
      fetchPromise.catch(() => {});
      return cached;
    }
    return fetchPromise.then((response) => response || new Response("", { status: 503, statusText: "Offline" }));
  });
}

async function navigateNetworkFirst(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NAVIGATE_NETWORK_MS);
  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response && response.ok) return response;
  } catch {
    clearTimeout(timer);
  }
  const cached = (await caches.match(request)) || (await caches.match("/index.html"));
  if (cached) return cached;
  return new Response("", { status: 503, statusText: "Offline" });
}

function soundCacheFirst(request) {
  return caches.open(SOUND_CACHE_NAME).then((cache) => {
    return cache.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch((err) => {
          console.error(`[SW] Fetch failed for ${request.url}:`, err);
          return new Response("", { status: 503, statusText: "Offline" });
        });
    });
  });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.headers.has("range")) {
    event.respondWith(fetch(request).catch(() => new Response("", { status: 503, statusText: "Offline" })));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigateNetworkFirst(request));
    return;
  }

  const path = url.pathname;
  if (path.startsWith("/assets/")) {
    event.respondWith(assetsStaleWhileRevalidate(request));
    return;
  }
  if (path.startsWith("/sounds/")) {
    event.respondWith(soundCacheFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            putInCache(request, response);
          }
          return response;
        })
        .catch(() => caches.match(request).then((c) => c || new Response("", { status: 503, statusText: "Offline" })));
    }),
  );
});
