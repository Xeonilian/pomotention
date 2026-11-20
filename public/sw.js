// Service Worker 版本号：变更策略时请递增，以便激活时清掉旧缓存
// v4: /assets/ stale-while-revalidate 弱网先出缓存
// v6: navigate 曾改回 network-first（防旧 html 配新 JS）
// v7: 重复打开 navigate 也 SWR——有网等 html 会在开机图淡出后露出白屏
// v8: install 全量预缓存（构建期清单）；navigate 只读本版本缓存不回写
const CACHE_VERSION = "v8";
const CACHE_NAME = `pomotention-cache-${CACHE_VERSION}`;

// 声音文件独立缓存版本：仅在声音文件本身有更新时才递增，避免每次 SW 更新都重新下载
const SOUND_CACHE_VERSION = "v1";
const SOUND_CACHE_NAME = `pomotention-sounds-${SOUND_CACHE_VERSION}`;

// 壳资源（图标等可容错）；构建插件会把 JS/CSS 注入下方清单
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-128.png", "/icon-192.png", "/icon-512.png", "/favicon.ico"];

// 构建期由 vite 插件替换为真实资产列表；开发源文件保持空数组
self.__PRECACHE_MANIFEST = [];

function notifyProgress(loaded, total) {
  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({ type: "SW_PRECACHE_PROGRESS", loaded, total });
    }
  });
}

/** 图标等壳资源：单个失败不阻断 install */
function precacheShell(cache) {
  return Promise.all(
    APP_SHELL.map((url) =>
      cache.add(url).catch((err) => {
        console.warn("[Service Worker] shell precache skipped:", url, err);
      }),
    ),
  );
}

/** JS/CSS 严格模式：任一失败则整个 install 失败 */
async function precacheManifest(cache) {
  const manifest = Array.isArray(self.__PRECACHE_MANIFEST) ? self.__PRECACHE_MANIFEST : [];
  const total = manifest.length;
  let loaded = 0;
  if (total === 0) {
    notifyProgress(0, 0);
    return;
  }
  notifyProgress(0, total);
  await Promise.all(
    manifest.map(async (url) => {
      await cache.add(url);
      loaded += 1;
      notifyProgress(loaded, total);
    }),
  );
}

self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...", CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await precacheShell(cache);
      await precacheManifest(cache);
    }),
  );
  // 不在此处 skipWaiting：有旧页面在跑时新 SW 进入 waiting，由前端发 SKIP_WAITING 后再激活
});

// 用户确认刷新后跳过等待，立即接管
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== SOUND_CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  return self.clients.claim();
});

/**
 * 仅缓存「完整」同源成功响应，避免把 206 等写入 cache 引发后续异常
 */
function putInCache(request, response) {
  if (!response || response.status !== 200 || response.type !== "basic") {
    return;
  }
  const clone = response.clone();
  return caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
}

/** /assets/：先缓存后后台更新 */
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

/** navigate：只读本版本缓存，不后台回写（避免旧 SW 缓存被灌进新 HTML） */
function navigateCacheOnly(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return caches.match("/index.html").then((fallback) => {
      if (fallback) return fallback;
      return fetch(request).catch(() => new Response("", { status: 503, statusText: "Offline" }));
    });
  });
}

/** /sounds/：缓存优先，不后台更新；仅在 SOUND_CACHE_VERSION 递增时由 activate 清缓存后重新下载 */
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

  // 音频/视频常见 Range 请求，与 Cache 里存的完整响应容易不兼容，直接走网络并兜底错误
  if (request.headers.has("range")) {
    event.respondWith(fetch(request).catch(() => new Response("", { status: 503, statusText: "Offline" })));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigateCacheOnly(request));
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

  // 其余同源静态资源：缓存优先，但 fetch 失败时必须 resolve，避免 respondWith 收到 rejected
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
