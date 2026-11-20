// Service Worker 版本号：变更策略时请递增，以便激活时清掉旧缓存
// v8/v9: 全量预缓存才 skipWaiting —— 手机易卡在 1%（大文件 cache.add 无超时）
// v10: install 只缓存壳+入口；其余 activate 后台补；单文件超时，失败不卡死
const CACHE_VERSION = "v10";
const CACHE_NAME = `pomotention-cache-${CACHE_VERSION}`;

const SOUND_CACHE_VERSION = "v1";
const SOUND_CACHE_NAME = `pomotention-sounds-${SOUND_CACHE_VERSION}`;

const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-128.png", "/icon-192.png", "/icon-512.png", "/favicon.ico"];

// 构建期由 vite 插件替换为真实资产列表；开发源文件保持空数组
self.__PRECACHE_MANIFEST = [];

const PRECACHE_CONCURRENCY = 4;
const FILE_TIMEOUT_MS = 20000;
const NAVIGATE_NETWORK_MS = 2500;

/** 入口/首页相关：装完这些就可以 skipWaiting，让手机先能进 */
function isCriticalAsset(url) {
  return /\/assets\/(index|MainLayout|HomeView)-[^/]+\.(js|css)$/i.test(url);
}

function notifyProgress(loaded, total) {
  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({ type: "SW_PRECACHE_PROGRESS", loaded, total });
    }
  });
}

function addWithTimeout(cache, url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`[SW] precache timeout: ${url}`));
    }, timeoutMs);
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

async function precacheUrls(cache, urls, progress) {
  await mapPool(urls, PRECACHE_CONCURRENCY, async (url) => {
    try {
      await addWithTimeout(cache, url, FILE_TIMEOUT_MS);
    } catch (err) {
      console.warn("[Service Worker] precache skipped:", url, err);
    }
    progress.loaded += 1;
    notifyProgress(progress.loaded, progress.total);
  });
}

function splitManifest() {
  const manifest = Array.isArray(self.__PRECACHE_MANIFEST) ? self.__PRECACHE_MANIFEST : [];
  const critical = [];
  const rest = [];
  for (const url of manifest) {
    if (isCriticalAsset(url)) critical.push(url);
    else rest.push(url);
  }
  return { critical, rest, total: manifest.length };
}

self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...", CACHE_VERSION);
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const { critical, total } = splitManifest();
      const progress = { loaded: 0, total: Math.max(total, 1) };
      notifyProgress(0, progress.total);

      // 壳：容错
      await mapPool(APP_SHELL, PRECACHE_CONCURRENCY, async (url) => {
        try {
          await addWithTimeout(cache, url, FILE_TIMEOUT_MS);
        } catch (err) {
          console.warn("[Service Worker] shell precache skipped:", url, err);
        }
      });

      // 入口关键包：也容错，尽量装，不因单个失败卡死整个 install
      await precacheUrls(cache, critical, progress);

      // 不等待其余 100+ 文件：先接管，避免手机卡在 1%
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

      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      await Promise.all(
        clients.map((client) => {
          client.postMessage({ type: "SW_ACTIVATED_RELOAD" });
          if ("navigate" in client && typeof client.navigate === "function" && client.url) {
            return client.navigate(client.url).catch(() => undefined);
          }
          return undefined;
        }),
      );

      // 后台补齐其余资产（失败跳过，运行时 SWR/网络仍可拉）
      try {
        const cache = await caches.open(CACHE_NAME);
        const { critical, rest, total } = splitManifest();
        const progress = { loaded: critical.length, total: Math.max(total, 1) };
        notifyProgress(progress.loaded, progress.total);
        await precacheUrls(cache, rest, progress);
        notifyProgress(progress.total, progress.total);
      } catch (err) {
        console.warn("[Service Worker] background precache ended:", err);
      }
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

/** navigate：网络优先（短超时），失败再读缓存；成功响应不回写 */
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
