// Service Worker 版本号：变更策略时请递增，以便激活时清掉旧缓存
// v11: install 只缓存壳即 skipWaiting；资源后台补；单文件超时
// v12: navigate 网络等待加长；清 SW 重试；activate 不再强制刷客户端（避免主屏幕首次开「正在更新」）
const CACHE_VERSION = "v12";
const CACHE_NAME = `pomotention-cache-${CACHE_VERSION}`;

const SOUND_CACHE_VERSION = "v1";
const SOUND_CACHE_NAME = `pomotention-sounds-${SOUND_CACHE_VERSION}`;

const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-128.png", "/icon-192.png", "/icon-512.png", "/favicon.ico"];

// 构建期由 vite 插件替换为真实资产列表；开发源文件保持空数组
self.__PRECACHE_MANIFEST = [];

const PRECACHE_CONCURRENCY = 3;
const FILE_TIMEOUT_MS = 15000;
const NAVIGATE_NETWORK_MS = 8000;
/** activate 里后台预缓存最多等多久，避免一直占住 waitUntil */
const ACTIVATE_PRECACHE_BUDGET_MS = 45000;

function notifyProgress(loaded, total) {
  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({ type: "SW_PRECACHE_PROGRESS", loaded, total });
    }
  });
}

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

async function mapPool(urls, concurrency, worker) {
  let nextIndex = 0;
  async function run() {
    while (nextIndex < urls.length) {
      const index = nextIndex;
      nextIndex += 1;
      await worker(urls[index], index);
    }
  }
  const n = Math.min(concurrency, Math.max(urls.length, 1));
  await Promise.all(Array.from({ length: n }, () => run()));
}

async function precacheUrls(cache, urls, progress, deadline) {
  await mapPool(urls, PRECACHE_CONCURRENCY, async (url) => {
    if (deadline && Date.now() > deadline) {
      progress.loaded += 1;
      notifyProgress(progress.loaded, progress.total);
      return;
    }
    try {
      await addWithTimeout(cache, url, FILE_TIMEOUT_MS);
    } catch (err) {
      console.warn("[Service Worker] precache skipped:", url, err);
    }
    progress.loaded += 1;
    notifyProgress(progress.loaded, progress.total);
  });
}

self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...", CACHE_VERSION);
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 只缓存壳：尽快接管。JS 走网络 / 随后后台补，避免 iPhone 卡在更新中
      await mapPool(APP_SHELL, PRECACHE_CONCURRENCY, async (url) => {
        try {
          await addWithTimeout(cache, url, FILE_TIMEOUT_MS);
        } catch (err) {
          console.warn("[Service Worker] shell precache skipped:", url, err);
        }
      });
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
      // 不在此处强制 client.navigate / SW_ACTIVATED_RELOAD：
      // 主屏幕第一次打开常会首次 activate，强制刷新会误显示「正在更新…」。
      // 真正的版本升级由页面侧 controllerchange（且加载时已有旧 controller）处理。

      const manifest = Array.isArray(self.__PRECACHE_MANIFEST) ? self.__PRECACHE_MANIFEST : [];
      if (manifest.length === 0) return;

      const cache = await caches.open(CACHE_NAME);
      const progress = { loaded: 0, total: manifest.length };
      notifyProgress(0, progress.total);
      const deadline = Date.now() + ACTIVATE_PRECACHE_BUDGET_MS;
      await precacheUrls(cache, manifest, progress, deadline);
      notifyProgress(progress.total, progress.total);
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
