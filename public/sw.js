// Service Worker 版本号：变更策略时请递增，以便激活时清掉旧缓存
// v3: 为解决 iPhone 生产环境声音缓存问题 (stale white noise after PR)
const CACHE_VERSION = "v3";
const CACHE_NAME = `pomotention-cache-${CACHE_VERSION}`;

// 需要缓存的静态资源（应用壳）
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon-128.png",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...", CACHE_VERSION);
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[Service Worker] Caching app shell v3");
        return cache.addAll(APP_SHELL);
      })
      .catch((error) => {
        console.error("[Service Worker] Cache failed:", error);
      })
  );
  // 不在此处 skipWaiting：有旧页面在跑时新 SW 进入 waiting，由前端发 SKIP_WAITING 后再激活，便于提示用户刷新
});

// 用户确认刷新后跳过等待，立即接管
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating v3...", CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
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

/**
 * 网络优先：适合带 hash 的 /assets/ 与音频，避免发版后仍命中旧缓存导致 CSS/JS 不匹配
 */
function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        putInCache(request, response);
      }
      return response;
    })
    .catch(() =>
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return new Response("", { status: 503, statusText: "Offline" });
      })
    );
}

/**
 * 音频优先读缓存：有缓存立即返回，避免每次上线后首播被网络阻塞；
 * 同时后台轻量更新缓存，下一次播放可获得新版本。
 * v3: 增加详细日志，帮助 debug iPhone 声音问题 (stale cache after deploy).
 */
function soundStaleWhileRevalidate(request) {
  const url = new URL(request.url);
  console.log(`[SW] soundStaleWhileRevalidate called for ${url.pathname} (v3)`);

  return caches.match(request).then((cached) => {
    console.log(`[SW] soundStaleWhileRevalidate ${url.pathname}: cached=${!!cached}, cacheVersion=${CACHE_VERSION}`);

    const fetchPromise = fetch(request)
      .then((response) => {
        if (response.ok) {
          putInCache(request, response);
          console.log(`[SW] Updated cache for sound ${url.pathname}`);
        }
        return response;
      })
      .catch((err) => {
        console.error(`[SW] Fetch failed for ${url.pathname}:`, err);
        return null;
      });

    if (cached) {
      // 命中缓存时后台更新即可，不阻塞本次播放
      fetchPromise.catch(() => {});
      console.log(`[SW] Serving cached sound ${url.pathname} (stale-while-revalidate)`);
      return cached;
    }

    console.log(`[SW] No cache for ${url.pathname}, fetching from network`);
    return fetchPromise.then((response) => {
      if (response) return response;
      return new Response("", { status: 503, statusText: "Offline" });
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
    event.respondWith(
      fetch(request).catch(() => new Response("", { status: 503, statusText: "Offline" }))
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/index.html"))
        )
    );
    return;
  }

  const path = url.pathname;
  if (path.startsWith("/assets/")) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (path.startsWith("/sounds/")) {
    event.respondWith(soundStaleWhileRevalidate(request));
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
        .catch(() =>
          caches.match(request).then(
            (c) => c || new Response("", { status: 503, statusText: "Offline" })
          )
        );
    })
  );
});
